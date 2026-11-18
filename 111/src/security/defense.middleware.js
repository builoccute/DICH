import { crypto } from '../config/runtime.js';
import { CSRF_SECRET } from '../config/env.js';

/**
 * HỆ THỐNG PHÒNG THỦ NHIỀU LỚP, CHỐNG LẠM DỤNG API & BẢO VỆ ZERO USER DATA STORAGE (PHẦN IX)
 * - Lớp ứng dụng (Code): Kiểm soát Rate Limiting tạm thời trong RAM (không lưu lịch sử IP xuống DB),
 *   lọc payload SQLi/XSS/SSRF/PathTraversal/CommandInjection, xác thực CSRF token,
 *   áp dụng Cache-Control: no-store cho toàn bộ API dịch thuật.
 * - Lớp hạ tầng (Cloudflare CDN/WAF): Cần cấu hình thêm trên bảng điều khiển Cloudflare cho DDoS L3/L4/L7 quy mô lớn.
 */

const rateBuckets = new Map();

const RATE_POLICIES = {
  auth: { windowMs: 60 * 1000, max: 30 },
  otp: { windowMs: 60 * 1000, max: 10 },
  chat: { windowMs: 60 * 1000, max: 120 },
  payment: { windowMs: 60 * 1000, max: 30 },
  exam: { windowMs: 60 * 1000, max: 180 },
  trans_text: { windowMs: 60 * 1000, max: 120 },
  trans_doc_ocr: { windowMs: 60 * 1000, max: 30 },
  default: { windowMs: 60 * 1000, max: 300 }
};

function classifyRateBucket(pathname) {
  if (pathname.includes('/otp')) return 'otp';
  if (pathname.startsWith('/api/auth')) return 'auth';
  if (pathname.startsWith('/api/chat') || pathname.startsWith('/api/messages')) return 'chat';
  if (pathname.startsWith('/api/payments')) return 'payment';
  if (pathname.startsWith('/api/exams')) return 'exam';
  if (pathname === '/api/trans/document' || pathname === '/api/trans/ocr') return 'trans_doc_ocr';
  if (pathname.startsWith('/api/trans')) return 'trans_text';
  return 'default';
}

function checkRateLimit(ip, pathname) {
  const bucketType = classifyRateBucket(pathname);
  const policy = RATE_POLICIES[bucketType];
  // Sử dụng mã băm một chiều ngắn hạn trong RAM để chống lạm dụng mà không lưu địa chỉ IP thô của người dùng
  const anonKey = crypto.createHmac('sha256', CSRF_SECRET).update(`${ip}:${bucketType}`).digest('hex').slice(0, 16);
  const now = Date.now();

  // Tự động dọn dẹp các bucket hết hạn trong RAM
  if (rateBuckets.size > 2000) {
    for (const [k, v] of rateBuckets.entries()) {
      if (now - v.start > 120000) rateBuckets.delete(k);
    }
  }

  let record = rateBuckets.get(anonKey);
  if (!record || now - record.start > policy.windowMs) {
    record = { start: now, count: 0 };
    rateBuckets.set(anonKey, record);
  }
  record.count += 1;
  if (record.count > policy.max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((record.start + policy.windowMs - now) / 1000),
      bucket: bucketType
    };
  }
  return { allowed: true, remaining: policy.max - record.count, bucket: bucketType };
}

// WAF Payload Inspection (SQLi, XSS, Path Traversal, SSRF, Command Injection)
const WAF_SIGNATURES = [
  { name: 'SQL_INJECTION', regex: /(\bUNION\s+ALL\s+SELECT\b|\bUNION\s+SELECT\b|\bDROP\s+TABLE\b|\bOR\s+1\s*=\s*1\b|--\s*$|;\s*DROP\s+)/i },
  { name: 'XSS_SCRIPT', regex: /(<script\b[^>]*>[\s\S]*?<\/script>|javascript\s*:|onerror\s*=|onload\s*=|<iframe\b)/i },
  { name: 'PATH_TRAVERSAL', regex: /(\.\.\/|\.\.\\|%2e%2e%2f|%252e%252e%252f)/i },
  { name: 'SSRF_INTERNAL', regex: /(https?:\/\/(127\.0\.0\.1|localhost|169\.254\.169\.254|0\.0\.0\.0|10\.\d+\.\d+\.\d+))/i },
  { name: 'COMMAND_INJECTION', regex: /(;\s*(rm\s+-rf|cat\s+\/etc\/passwd|wget\s+|curl\s+.*\|\s*sh)|\$\([^)]+\))/i }
];

function inspectPayloadWaf(obj, allowRichHtml = false) {
  const serialized = typeof obj === 'string' ? obj : JSON.stringify(obj || {});
  for (const sig of WAF_SIGNATURES) {
    if (allowRichHtml && sig.name === 'XSS_SCRIPT') continue;
    if (sig.regex.test(serialized)) {
      return { blocked: true, rule: sig.name };
    }
  }
  return { blocked: false };
}

function sanitizeHtmlForCms(rawHtml, allowAdvancedJs = false) {
  let clean = String(rawHtml || '');
  if (!allowAdvancedJs) {
    clean = clean
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
      .replace(/javascript\s*:/gi, '');
  }
  return clean;
}

function generateCsrfToken(sessionId = 'anonymous') {
  return crypto.createHmac('sha256', CSRF_SECRET).update(String(sessionId)).digest('hex').slice(0, 32);
}

function applySecurityHeaders(res, isTranslationEndpoint = false) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'self';"
  );
  if (isTranslationEndpoint) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Zero-User-Data-Storage', 'enforced');
  }
}

export { checkRateLimit, inspectPayloadWaf, sanitizeHtmlForCms, generateCsrfToken, applySecurityHeaders };
export default { checkRateLimit, inspectPayloadWaf, sanitizeHtmlForCms, generateCsrfToken, applySecurityHeaders };
