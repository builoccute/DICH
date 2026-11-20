# ============================================================================
# DOCKERFILE: WORD BRIDGE SELF-HOSTED NLLB-200 (CTRANSLATE2 INT8) MICROSERVICE
# Mô hình: facebook/nllb-200-distilled-600M (Lượng tử hóa INT8 ~650 MB RAM)
# Chính sách: ZERO USER DATA STORAGE (Chạy với --no-access-log, không lưu đĩa)
# ============================================================================
FROM python:3.11-slim

ARG DOWNLOAD_WEIGHTS=true

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NLLB_CT2_MODEL_DIR=/models/nllb-200-distilled-600M-int8 \
    NLLB_SP_MODEL_PATH=/models/nllb-200-distilled-600M-int8/sentencepiece.bpe.model

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt && \
    mkdir -p /models/nllb-200-distilled-600M-int8 && \
    if [ "$DOWNLOAD_WEIGHTS" = "true" ]; then \
      python3 -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='JustFrederik/nllb-200-distilled-600M-ct2-int8', local_dir='/models/nllb-200-distilled-600M-int8')"; \
    fi

COPY app.py /app/app.py

RUN useradd -m -u 10001 wbtrans && chown -R wbtrans:wbtrans /app /models
USER wbtrans

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python3 -c "import urllib.request, json; d=json.loads(urllib.request.urlopen('http://127.0.0.1:8080/health').read()); assert d.get('server_alive')"

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080", "--no-access-log"]
