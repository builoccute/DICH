/**
 * @file src/services/ocr-processor.js
 * @description Bộ xử lý Dịch Hình ảnh thực tế trên RAM (Zero Cloudflare, Zero Metadata Trick, Zero User Data Storage).
 *
 * CƠ CHẾ NHẬN DIỆN VĂN BẢN THỰC TẾ:
 *   1. Gọi trực tiếp `/usr/bin/tesseract stdin stdout` qua pipe RAM (không ghi tệp ảnh lên ổ đĩa).
 *   2. Tự động kiểm tra gói ngôn ngữ Tesseract đã cài trên máy chủ (`vie+eng` hoặc `eng`).
 *   3. Tùy chọn gọi Vision API bên ngoài chỉ khi cấu hình tường minh `EXTERNAL_ZDR_VERIFIED=true`.
 *   4. KHÔNG sử dụng Cloudflare Workers AI Vision và KHÔNG đọc metadata ảnh để giả lập nhận diện chữ.
 */

import { spawnSync } from "node:child_process";
import { translateText } from "./translation-engine.js";
import { verifyFileSignature, wipeBuffer, LIMITS } from "../security/privacy-shield.js";

let cachedTesseractLangs = null;

export function getInstalledTesseractLanguages() {
  if (cachedTesseractLangs !== null) return cachedTesseractLangs;
  const res = spawnSync("tesseract", ["--list-langs"], { encoding: "utf-8", timeout: 3000 });
  if (res.status !== 0) {
    cachedTesseractLangs = [];
    return cachedTesseractLangs;
  }
  const lines = (res.stdout || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  cachedTesseractLangs = lines.filter((l) => !l.toLowerCase().startsWith("list of available"));
  return cachedTesseractLangs;
}

function selectTesseractLangArg(sourceLang, installed) {
  if (!installed || installed.length === 0) return null;
  const isoToTess = {
    vi: "vie",
    en: "eng",
    fr: "fra",
    de: "deu",
    es: "spa",
    ja: "jpn",
    ko: "kor",
    zh: "chi_sim",
    ru: "rus"
  };
  const preferred = isoToTess[String(sourceLang || "").toLowerCase()];
  const chosen = [];
  if (preferred && installed.includes(preferred)) chosen.push(preferred);
  if (installed.includes("vie") && !chosen.includes("vie")) chosen.push("vie");
  if (installed.includes("eng") && !chosen.includes("eng")) chosen.push("eng");
  if (chosen.length === 0) chosen.push(installed[0]);
  return chosen.join("+");
}

/**
 * Chạy Tesseract nhận diện chữ thực tế trực tiếp qua RAM (stdin -> stdout).
 */
export function runLocalTesseractInMemory(imageBytes, sourceLang = "auto") {
  const installed = getInstalledTesseractLanguages();
  const langArg = selectTesseractLangArg(sourceLang, installed);
  if (!langArg) {
    return {
      ok: false,
      code: "ERR_IMAGE_RECOGNITION_ENGINE_MISSING",
      message: "Máy chủ chưa cài đặt bộ nhận diện văn bản hình ảnh (Tesseract)."
    };
  }

  const res = spawnSync("tesseract", ["stdin", "stdout", "-l", langArg, "--psm", "6"], {
    input: Buffer.from(imageBytes),
    maxBuffer: 10 * 1024 * 1024,
    timeout: Math.min(LIMITS.REQUEST_TIMEOUT_MS, 25000)
  });

  if (res.status !== 0) {
    return {
      ok: false,
      code: "ERR_IMAGE_RECOGNITION_FAILED",
      message: "Không thể nhận diện văn bản từ hình ảnh đã tải lên."
    };
  }

  const extracted = (res.stdout ? res.stdout.toString("utf-8") : "").replace(/\f/g, "").trim();
  return {
    ok: true,
    text: extracted,
    engine: `tesseract-ram (${langArg})`,
    installedLanguages: installed
  };
}

/**
 * Xử lý nhận diện văn bản trong hình ảnh và dịch sang ngôn ngữ đích hoàn toàn trên RAM.
 */
export async function processImageOcrAndTranslate(inputBuffer, options = {}, env = {}) {
  const workingBuffer = inputBuffer instanceof Uint8Array ? new Uint8Array(inputBuffer) : new Uint8Array(Buffer.from(inputBuffer || []));
  const filename = String(options.filename || "image.png");
  const sourceLang = String(options.sourceLang || "auto").toLowerCase();
  const targetLang = String(options.targetLang || "vi").toLowerCase();
  const domain = String(options.domain || "general");

  try {
    const sig = verifyFileSignature(workingBuffer, filename, "image");
    if (!sig.valid) {
      return { ok: false, status: 400, code: sig.code, message: sig.message, zeroUserDataStorage: true };
    }

    const recognition = runLocalTesseractInMemory(workingBuffer, sourceLang);
    if (!recognition.ok) {
      return {
        ok: false,
        status: 503,
        code: recognition.code,
        message: recognition.message,
        zeroUserDataStorage: true
      };
    }

    if (!recognition.text) {
      return {
        ok: false,
        status: 422,
        code: "ERR_NO_TEXT_IN_IMAGE",
        message: "Không phát hiện được văn bản rõ nét trong hình ảnh. Vui lòng chọn ảnh có chữ rõ ràng, độ tương phản tốt.",
        engine: recognition.engine,
        zeroUserDataStorage: true
      };
    }

    const translationRes = await translateText(
      {
        text: recognition.text,
        sourceLang,
        targetLang,
        domain
      },
      env
    );

    if (!translationRes.ok) {
      return {
        ...translationRes,
        extractedText: recognition.text,
        recognitionEngine: recognition.engine
      };
    }

    return {
      ok: true,
      status: 200,
      imageFormat: sig.format,
      extractedText: recognition.text,
      translatedText: translationRes.translatedText,
      sourceLang: translationRes.sourceLang,
      targetLang: translationRes.targetLang,
      detectedLanguage: translationRes.detectedLanguage,
      domain: translationRes.domain,
      recognitionEngine: recognition.engine,
      translationProvider: translationRes.provider,
      layoutPreservationNote: "Hiển thị song song văn bản gốc nhận diện từ ảnh và bản dịch (không tạo ảnh ghép đè chữ chưa kiểm chứng).",
      zeroUserDataStorage: true
    };
  } finally {
    wipeBuffer(workingBuffer);
  }
}
