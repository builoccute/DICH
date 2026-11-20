#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
@file self-hosted-nmt/app.py
@description Microservice API Dịch thuật Tự vận hành Word Bridge Translation (FastAPI + CTranslate2 INT8).
Mô hình: facebook/nllb-200-distilled-600M (CC-BY-NC-4.0 / CTranslate2 INT8).
Chính sách ZERO USER DATA STORAGE:
  - Không ghi access log hoặc nội dung dịch ra tệp hay stdout.
  - Xử lý hoàn toàn trên RAM, thu hồi bộ nhớ ngay sau mỗi request.
  - Health check phân biệt rõ: máy chủ hoạt động, model đã tải, model chưa tải, model lỗi, API sẵn sàng.
  - Tuyệt đối không trả bản dịch giả khi model chưa tải (trả HTTP 503).
"""

import gc
import hmac
import os
import time
from collections import deque
from typing import Dict, List, Optional, Union
from fastapi import FastAPI, Header, HTTPException, Request, Response
from pydantic import BaseModel, Field

MODEL_DIR = os.environ.get("NLLB_CT2_MODEL_DIR", "/models/nllb-200-distilled-600M-int8")
SP_MODEL_PATH = os.environ.get(
    "NLLB_SP_MODEL_PATH",
    os.path.join(MODEL_DIR, "sentencepiece.bpe.model"),
)
API_TOKEN = os.environ.get("WORDBRIDGE_NLLB_TOKEN", "").strip()
INTER_THREADS = int(os.environ.get("CT2_INTER_THREADS", "2"))
INTRA_THREADS = int(os.environ.get("CT2_INTRA_THREADS", "4"))
MAX_BATCH_SIZE = int(os.environ.get("NLLB_MAX_BATCH_SIZE", "32"))
MAX_CHARS_PER_ITEM = int(os.environ.get("MAX_TEXT_LENGTH", "15000"))
RATE_LIMIT_PER_MIN = int(os.environ.get("NLLB_RATE_LIMIT_PER_MIN", "120"))

app = FastAPI(
    title="Word Bridge Self-Hosted NLLB-200 NMT Microservice",
    version="2.0.0",
    docs_url=None,
    redoc_url=None,
)

_translator = None
_tokenizer = None
_model_status = "not_loaded"  # loaded | not_loaded | error
_model_error: Optional[str] = None
_rate_buckets: Dict[str, deque] = {}


def get_engine():
    """Khởi tạo lười (Lazy-load) CTranslate2 Translator và SentencePiece trên RAM."""
    global _translator, _tokenizer, _model_status, _model_error
    if _translator is not None and _tokenizer is not None:
        return _translator, _tokenizer

    if not os.path.isdir(MODEL_DIR) or not os.path.isfile(SP_MODEL_PATH):
        _model_status = "not_loaded"
        _model_error = "Trọng số mô hình NLLB-200 CTranslate2 INT8 chưa được tải hoặc mount."
        return None, None

    try:
        import ctranslate2
        import sentencepiece as spm

        _translator = ctranslate2.Translator(
            MODEL_DIR,
            device=os.environ.get("CT2_DEVICE", "cpu"),
            compute_type=os.environ.get("CT2_COMPUTE_TYPE", "int8"),
            inter_threads=INTER_THREADS,
            intra_threads=INTRA_THREADS,
        )
        sp = spm.SentencePieceProcessor()
        sp.load(SP_MODEL_PATH)
        _tokenizer = sp
        _model_status = "loaded"
        _model_error = None
    except Exception as exc:
        _translator = None
        _tokenizer = None
        _model_status = "error"
        _model_error = f"Lỗi nạp mô hình CTranslate2/SentencePiece: {type(exc).__name__}"

    return _translator, _tokenizer


def apply_no_store_headers(response: Response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["X-Zero-User-Data-Storage"] = "enforced"


def enforce_rate_limit(client_key: str):
    now = time.monotonic()
    bucket = _rate_buckets.setdefault(client_key, deque())
    while bucket and now - bucket[0] > 60.0:
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT_PER_MIN:
        raise HTTPException(status_code=429, detail="ERR_NLLB_RATE_LIMIT_EXCEEDED")
    bucket.append(now)


class NllbTranslateRequest(BaseModel):
    text: Union[str, List[str]] = Field(..., description="Văn bản hoặc mảng văn bản cần dịch")
    source_lang: str = Field(default="vi")
    target_lang: str = Field(default="en")
    src_flores: str = Field(default="vie_Latn")
    tgt_flores: str = Field(default="eng_Latn")
    domain: str = Field(default="general")
    beam_size: int = Field(default=2, ge=1, le=5)
    zero_data_retention: bool = Field(default=True)


@app.get("/health")
def health_check(response: Response):
    apply_no_store_headers(response)
    translator, tokenizer = get_engine()
    ready = translator is not None and tokenizer is not None
    return {
        "ok": True,
        "server_alive": True,
        "model_status": _model_status,
        "model_weights_loaded": ready,
        "model_error": _model_error,
        "translation_ready": ready,
        "service": "Word Bridge Self-Hosted NLLB-200 CTranslate2 INT8 Engine",
        "model": "facebook/nllb-200-distilled-600M (CTranslate2 INT8)",
        "model_license": "CC-BY-NC-4.0 (Kiểm tra điều khoản thương mại trước khi vận hành thương mại)",
        "hardware_requirement": "Tối thiểu 2 vCPU, 2 GB RAM (khuyến nghị 4 vCPU, 4 GB RAM)",
        "zero_user_data_storage": True,
    }


@app.post("/v1/nllb/translate")
def translate_nllb(
    req: NllbTranslateRequest,
    request: Request,
    response: Response,
    authorization: Optional[str] = Header(default=None),
):
    apply_no_store_headers(response)
    start_ts = time.perf_counter()

    if API_TOKEN:
        expected = f"Bearer {API_TOKEN}"
        if not authorization or not hmac.compare_digest(authorization, expected):
            raise HTTPException(status_code=401, detail="ERR_UNAUTHORIZED_NLLB_TOKEN")

    enforce_rate_limit(str(hash(request.client.host if request.client else "local"))[:12])

    is_batch = isinstance(req.text, list)
    inputs = req.text if is_batch else [req.text]

    if not inputs or len(inputs) > MAX_BATCH_SIZE:
        raise HTTPException(status_code=400, detail="ERR_INVALID_BATCH_SIZE")
    if any(len(str(x)) > MAX_CHARS_PER_ITEM for x in inputs):
        raise HTTPException(status_code=400, detail="ERR_INVALID_TEXT_LENGTH")

    translator, tokenizer = get_engine()
    if translator is None or tokenizer is None:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "ERR_NLLB_NOT_READY",
                "model_status": _model_status,
                "message": _model_error or "Mô hình dịch thuật chưa sẵn sàng.",
            },
        )

    try:
        source_sents = []
        for item in inputs:
            pieces = tokenizer.encode_as_pieces(str(item))
            source_sents.append([req.src_flores] + pieces + ["</s>"])

        target_prefix = [[req.tgt_flores]] * len(source_sents)
        results = translator.translate_batch(
            source_sents,
            target_prefix=target_prefix,
            beam_size=req.beam_size,
            max_batch_size=min(16, MAX_BATCH_SIZE),
        )

        decoded_outputs = []
        for res in results:
            tokens = res.hypotheses[0]
            if tokens and tokens[0] == req.tgt_flores:
                tokens = tokens[1:]
            if tokens and tokens[-1] == "</s>":
                tokens = tokens[:-1]
            decoded_outputs.append(tokenizer.decode_pieces(tokens))

        duration_ms = round((time.perf_counter() - start_ts) * 1000, 2)
        return {
            "ok": True,
            "translated_text": decoded_outputs if is_batch else decoded_outputs[0],
            "src_flores": req.src_flores,
            "tgt_flores": req.tgt_flores,
            "engine": "ctranslate2-nllb-200-int8",
            "duration_ms": duration_ms,
            "zero_user_data_storage": True,
        }
    finally:
        del inputs
        gc.collect()
