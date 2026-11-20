/**
 * @file src/security/privacy-shield.js
 * @description Tầng Bảo mật & Chính sách ZERO USER DATA STORAGE cho Word Bridge Translation.
 *   - Chống lưu trữ nội dung người dùng (Zero User Data Storage, không dùng object storage).
 *   - Kiểm tra Magic Bytes thực tế cho tài liệu và hình ảnh, chặn tệp thực thi & giả mạo MIME.
 *   - Chống ZIP Bomb (giới hạn số tệp, dung lượng giải nén tối đa và tỷ lệ nén).
 *   - Rate Limiter cô lập trên RAM (không lưu IP lâu dài, chỉ dùng hash ngắn tạm thời).
 *   - Sanitized Logger: tuyệt đối không ghi nội dung dịch, email, URL hay buffer vào log.
 */

import * as crypto from "node:crypto";

export const NO_STORE_HEADERS = Object.freeze({
  "Cache-Control": "no-store, no-cache, must-revalidate, private, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
  "X-Zero-User-Data-Storage": "enforced",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer"
});

export const SECURITY_HEADERS = Object.freeze({
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self' blob: data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
});

export const LIMITS = Object.freeze({
  MAX_TEXT_LENGTH: Number(process.env.MAX_TEXT_LENGTH || 15000),
  MAX_DOCUMENT_BYTES: Number(process.env.MAX_DOCUMENT_BYTES || 50 * 1024 * 1024),
  MAX_IMAGE_BYTES: Number(process.env.MAX_IMAGE_BYTES || 10 * 1024 * 1024),
  MAX_DOCUMENT_PAGES: Number(process.env.MAX_DOCUMENT_PAGES || 50),
  MAX_ZIP_ENTRIES: 500,
  MAX_ZIP_UNCOMPRESSED_BYTES: 100 * 1024 * 1024,
  MAX_ZIP_COMPRESSION_RATIO: 100,
  MAX_WEB_HTML_BYTES: 2 * 1024 * 1024,
  REQUEST_TIMEOUT_MS: Number(process.env.REQUEST_TIMEOUT || 20000),
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS: 60
});

/**
 * Bộ giới hạn tốc độ (Rate Limiter) chỉ chạy trên RAM, sử dụng mã băm ngắn tạm thời.
 */
export class EphemeralRateLimiter {
  constructor(maxRequests = LIMITS.RATE_LIMIT_MAX_REQUESTS, windowMs = LIMITS.RATE_LIMIT_WINDOW_MS) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.buckets = new Map();
  }

  _anonymizeKey(rawKey) {
    return crypto.createHash("sha256").update(String(rawKey || "anon")).digest("hex").slice(0, 16);
  }

  check(rawKey, customLimit = null) {
    const key = this._anonymizeKey(rawKey);
    const now = Date.now();
    const limit = customLimit || this.maxRequests;

    if (this.buckets.size > 5000) {
      for (const [k, entry] of this.buckets.entries()) {
        if (now - entry.start > this.windowMs) this.buckets.delete(k);
      }
    }

    const current = this.buckets.get(key);
    if (!current || now - current.start > this.windowMs) {
      this.buckets.set(key, { count: 1, start: now });
      return { allowed: true, remaining: limit - 1, resetMs: this.windowMs };
    }

    if (current.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetMs: Math.max(0, this.windowMs - (now - current.start))
      };
    }

    current.count += 1;
    return {
      allowed: true,
      remaining: Math.max(0, limit - current.count),
      resetMs: Math.max(0, this.windowMs - (now - current.start))
    };
  }
}

export const globalRateLimiter = new EphemeralRateLimiter();

/**
 * Xóa trắng vùng nhớ tạm (Buffer/Uint8Array) ngay sau khi xử lý xong.
 */
export function wipeBuffer(bufferLike) {
  if (!bufferLike) return;
  try {
    if (bufferLike instanceof Uint8Array || Buffer.isBuffer(bufferLike)) {
      bufferLike.fill(0);
    } else if (bufferLike instanceof ArrayBuffer) {
      new Uint8Array(bufferLike).fill(0);
    }
  } catch (_) {}
}

/**
 * Chặn các tệp thực thi, script hoặc tệp nguy hiểm giả mạo.
 */
function isDangerousExecutableOrScript(bytes, ext) {
  const forbiddenExts = new Set([
    ".exe", ".dll", ".bat", ".cmd", ".sh", ".ps1", ".vbs", ".js", ".mjs",
    ".cjs", ".php", ".py", ".rb", ".jar", ".msi", ".apk", ".com", ".scr",
    ".html", ".htm", ".svg", ".xhtml"
  ]);
  if (forbiddenExts.has(ext)) return true;

  if (bytes.length >= 2 && bytes[0] === 0x4d && bytes[1] === 0x5a) return true; // PE/MZ Windows EXE
  if (bytes.length >= 4 && bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) return true; // ELF
  if (bytes.length >= 4 && ((bytes[0] === 0xcf && bytes[1] === 0xfa && bytes[2] === 0xed && bytes[3] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xed && bytes[2] === 0xfa && bytes[3] === 0xcf))) return true; // Mach-O
  if (bytes.length >= 2 && bytes[0] === 0x23 && bytes[1] === 0x21) return true; // Shebang #!
  return false;
}

/**
 * Kiểm tra định dạng thật (Magic Bytes) và dung lượng tệp.
 */
export function verifyFileSignature(uint8Array, filename = "", category = "document") {
  if (!(uint8Array instanceof Uint8Array) || uint8Array.length === 0) {
    return { valid: false, code: "ERR_EMPTY_FILE", message: "Tệp tải lên trống hoặc không hợp lệ." };
  }

  const maxBytes = category === "image" ? LIMITS.MAX_IMAGE_BYTES : LIMITS.MAX_DOCUMENT_BYTES;
  if (uint8Array.length > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return {
      valid: false,
      code: "ERR_FILE_TOO_LARGE",
      message: `Dung lượng tệp vượt quá giới hạn tối đa ${maxMb} MB cho phép xử lý trên bộ nhớ tạm.`
    };
  }

  const lowerName = String(filename || "").trim().toLowerCase();
  const extMatch = lowerName.match(/(\.[a-z0-9]+)$/);
  const ext = extMatch ? extMatch[1] : "";

  if (isDangerousExecutableOrScript(uint8Array, ext)) {
    return {
      valid: false,
      code: "ERR_DANGEROUS_FILE_BLOCKED",
      message: "Tệp thực thi hoặc mã kịch bản bị chặn vì lý do bảo mật."
    };
  }

  // Kiểm tra Magic Bytes cụ thể
  const b = uint8Array;
  const isPdf = b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d; // %PDF-
  const isZip = b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07);
  const isOle2 = b.length >= 8 && b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0 && b[4] === 0xa1 && b[5] === 0xb1 && b[6] === 0x1a && b[7] === 0xe1;
  const isPng = b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a;
  const isJpg = b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const isWebp = b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;

  if (category === "image") {
    if (isPng) return { valid: true, format: "png", mimeType: "image/png" };
    if (isJpg) return { valid: true, format: "jpg", mimeType: "image/jpeg" };
    if (isWebp) return { valid: true, format: "webp", mimeType: "image/webp" };
    return {
      valid: false,
      code: "ERR_UNSUPPORTED_IMAGE_FORMAT",
      message: "Định dạng ảnh không hợp lệ hoặc bị giả mạo. Chỉ chấp nhận JPG, JPEG, PNG, WEBP thật."
    };
  }

  // Category === "document"
  if (ext === ".pdf" || (!ext && isPdf)) {
    if (!isPdf) {
      return { valid: false, code: "ERR_MIME_SPOOFING", message: "Tệp có đuôi .pdf nhưng chữ ký nhị phân không phải PDF hợp lệ." };
    }
    return { valid: true, format: "pdf", mimeType: "application/pdf" };
  }

  if (ext === ".docx" || ext === ".xlsx" || ext === ".pptx") {
    if (!isZip) {
      return { valid: false, code: "ERR_MIME_SPOOFING", message: `Tệp ${ext} không có cấu trúc nén OOXML hợp lệ.` };
    }
    const mimeMap = {
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    };
    return { valid: true, format: ext.slice(1), mimeType: mimeMap[ext] };
  }

  if (ext === ".doc") {
    if (!isOle2 && !isZip) {
      return { valid: false, code: "ERR_MIME_SPOOFING", message: "Tệp .doc không có chữ ký tài liệu Word hợp lệ." };
    }
    return { valid: true, format: "doc", mimeType: "application/msword" };
  }

  if (ext === ".csv" || ext === ".txt") {
    // Kiểm tra tệp nhị phân giả mạo TXT/CSV (nhiều byte NULL)
    let nullCount = 0;
    const sampleLen = Math.min(b.length, 4096);
    for (let i = 0; i < sampleLen; i++) {
      if (b[i] === 0x00) nullCount++;
    }
    if (nullCount > 2) {
      return { valid: false, code: "ERR_BINARY_AS_TEXT", message: "Tệp chứa dữ liệu nhị phân không hợp lệ cho định dạng văn bản." };
    }
    return {
      valid: true,
      format: ext.slice(1),
      mimeType: ext === ".csv" ? "text/csv; charset=utf-8" : "text/plain; charset=utf-8"
    };
  }

  return {
    valid: false,
    code: "ERR_UNSUPPORTED_DOCUMENT_FORMAT",
    message: "Định dạng tài liệu chưa được hỗ trợ. Hỗ trợ: PDF, DOCX, DOC, PPTX, XLSX, CSV, TXT."
  };
}

export function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const REDACTED_LOG_KEYS = new Set([
  "text", "content", "source", "sourcetext", "translated", "translatedtext",
  "message", "body", "email", "contactemail", "url", "html", "buffer",
  "base64", "file", "filename", "image", "ip", "clientip", "authorization",
  "token", "password", "secret"
]);

/**
 * Ghi log kỹ thuật an toàn: lọc bỏ hoàn toàn nội dung người dùng và thông tin nhạy cảm.
 */
export function sanitizedLog(level, eventCode, technicalMeta = {}) {
  const safeMeta = {};
  for (const [k, v] of Object.entries(technicalMeta || {})) {
    if (REDACTED_LOG_KEYS.has(String(k).toLowerCase())) continue;
    if (typeof v === "string" && v.length > 120) {
      safeMeta[k] = `${v.slice(0, 60)}...[redacted_len_${v.length}]`;
    } else if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") {
      safeMeta[k] = v;
    }
  }
  const record = {
    ts: new Date().toISOString(),
    level: String(level || "INFO").toUpperCase(),
    event: String(eventCode || "SYSTEM_EVENT"),
    meta: safeMeta
  };
  if (process.env.NODE_ENV !== "test") {
    const line = JSON.stringify(record);
    if (record.level === "ERROR") console.error(line);
    else console.log(line);
  }
  return record;
}
