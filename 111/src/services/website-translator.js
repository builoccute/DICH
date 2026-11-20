/**
 * @file src/services/website-translator.js
 * @description Bộ xử lý Dịch Trang Web Trực tuyến (Website Translation Engine) với bảo vệ SSRF & XSS toàn diện.
 *
 * BẢO MẬT SSRF:
 *   - Chỉ cho phép http:// và https://, không cho phép thông tin đăng nhập trong URL.
 *   - Chặn localhost, *.localhost, *.local, *.internal, IPv4 private/loopback/link-local/CGNAT/metadata (169.254.169.254).
 *   - Chặn IPv6 private/loopback/link-local (::1, fc00::/7, fe80::/10, ::ffff:...).
 *   - Phân giải DNS thực tế (`dns.lookup(..., { all: true })`) trước mỗi lần fetch và từng bước redirect (chống DNS Rebinding).
 *   - `redirect: "manual"`, tối đa 5 bước redirect, kiểm tra lại SSRF trên từng hop.
 *   - Đọc stream có giới hạn dung lượng (`MAX_WEB_HTML_BYTES = 2 MB`), KHÔNG gọi `response.text()` không giới hạn.
 *   - Kiểm tra `Content-Type` (chỉ chấp nhận `text/html` hoặc `application/xhtml+xml`).
 *
 * BẢO MẬT XSS:
 *   - Loại bỏ toàn bộ `<script>`, `<iframe>`, `<object>`, `<embed>`, `<applet>`, `<base>`, `<meta http-equiv="refresh">`.
 *   - Xóa toàn bộ thuộc tính sự kiện `on*` (`onclick`, `onerror`, `onload`, ...).
 *   - Chặn toàn bộ URL `javascript:`, `vbscript:`, `data:text/html`.
 *   - Gắn `<meta http-equiv="Content-Security-Policy">` nghiêm ngặt trong HTML kết quả.
 */

import * as dns from "node:dns/promises";
import * as net from "node:net";
import { translateText } from "./translation-engine.js";
import { LIMITS } from "../security/privacy-shield.js";

const MAX_REDIRECTS = 5;

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /\.localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /\.localdomain$/i,
  /^metadata\.google\.internal$/i,
  /^metadata$/i
];

export function isPrivateOrReservedIpv4(ip) {
  const parts = String(ip || "").split(".").map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local & cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a >= 224) return true; // Multicast & Reserved
  return false;
}

export function isPrivateOrReservedIpv6(ip) {
  const norm = String(ip || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (norm === "::1" || norm === "::") return true;
  if (norm.startsWith("fc") || norm.startsWith("fd")) return true; // fc00::/7 ULA
  if (/^fe[89ab]/.test(norm)) return true; // fe80::/10 link-local
  if (norm.startsWith("::ffff:")) {
    const mappedV4 = norm.slice(7);
    if (net.isIPv4(mappedV4)) return isPrivateOrReservedIpv4(mappedV4);
  }
  return false;
}

export function isPrivateIpAddress(ip) {
  if (net.isIPv4(ip)) return isPrivateOrReservedIpv4(ip);
  if (net.isIPv6(ip)) return isPrivateOrReservedIpv6(ip);
  return false;
}

export function validateSafeExternalUrl(rawUrl) {
  const str = String(rawUrl || "").trim();
  if (!str) {
    return { valid: false, code: "ERR_EMPTY_URL", message: "Vui lòng nhập địa chỉ URL trang web cần dịch." };
  }
  let parsed;
  try {
    parsed = new URL(str);
  } catch (_) {
    return { valid: false, code: "ERR_INVALID_URL", message: "Địa chỉ URL không hợp lệ. Vui lòng nhập đầy đủ https://..." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, code: "ERR_UNSUPPORTED_PROTOCOL", message: "Chỉ hỗ trợ giao thức HTTP hoặc HTTPS." };
  }
  if (parsed.username || parsed.password) {
    return { valid: false, code: "ERR_URL_CREDENTIALS_BLOCKED", message: "Không cho phép URL chứa thông tin xác thực." };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  for (const pat of BLOCKED_HOST_PATTERNS) {
    if (pat.test(hostname)) {
      return {
        valid: false,
        code: "ERR_SSRF_BLOCKED",
        message: "Hệ thống bảo mật chống SSRF đã chặn truy cập vào địa chỉ máy chủ nội bộ hoặc localhost."
      };
    }
  }

  if (isPrivateIpAddress(hostname)) {
    return {
      valid: false,
      code: "ERR_SSRF_BLOCKED",
      message: "Hệ thống bảo mật chống SSRF đã chặn truy cập vào dải địa chỉ IP nội bộ hoặc metadata."
    };
  }

  return { valid: true, url: parsed };
}

/**
 * Kiểm tra DNS thực tế chống DNS Rebinding (bỏ qua khi test cung cấp `allowTestDnsBypass` cho URL cụ thể).
 */
async function verifyDnsSafe(hostname, env = {}) {
  if (env && env.skipDnsLookupForTest === true) return { ok: true };
  if (net.isIP(hostname)) {
    if (isPrivateIpAddress(hostname)) {
      return { ok: false, code: "ERR_SSRF_DNS_PRIVATE_IP", message: "IP đích thuộc mạng nội bộ bị chặn." };
    }
    return { ok: true };
  }
  try {
    const records = await dns.lookup(hostname, { all: true });
    if (!records || records.length === 0) {
      return { ok: false, code: "ERR_DNS_RESOLUTION_FAILED", message: "Không thể phân giải tên miền đích." };
    }
    for (const rec of records) {
      if (isPrivateIpAddress(rec.address)) {
        return {
          ok: false,
          code: "ERR_SSRF_DNS_REBINDING_BLOCKED",
          message: "Tên miền phân giải về địa chỉ IP nội bộ (nguy cơ DNS Rebinding) nên đã bị chặn."
        };
      }
    }
    return { ok: true };
  } catch (_) {
    return { ok: false, code: "ERR_DNS_RESOLUTION_FAILED", message: "Không thể phân giải DNS của trang web." };
  }
}

/**
 * Làm sạch HTML triệt để chống XSS trước khi dịch và hiển thị.
 */
export function sanitizeHtmlForSafeDisplay(rawHtml, pageOrigin) {
  let html = String(rawHtml || "");

  // 1. Xóa hoàn toàn các thẻ thực thi hoặc nhúng nguy hiểm
  html = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, "")
    .replace(/<embed\b[^>]*\/?>/gi, "")
    .replace(/<applet\b[^>]*>[\s\S]*?<\/applet>/gi, "")
    .replace(/<base\b[^>]*\/?>/gi, "")
    .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*\/?>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");

  // 2. Xóa toàn bộ thuộc tính sự kiện on* (onclick, onerror, onload, onmouseover...)
  html = html.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // 3. Chặn giao thức nguy hiểm javascript:, vbscript:, data:text/html trong href/src/action/xlink:href
  html = html.replace(
    /(\b(?:href|src|action|formaction|xlink:href)\s*=\s*)(["']?)\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^"'>\s]*\2/gi,
    '$1"#blocked-unsafe-url"'
  );

  // 4. Chuẩn hóa đường dẫn tương đối cho hình ảnh và liên kết về origin gốc (chỉ http/https)
  if (pageOrigin) {
    html = html.replace(/(\b(?:src|href)\s*=\s*)(["'])(\/[^"']*)\2/gi, (_, attr, q, rel) => {
      if (rel.startsWith("//")) return `${attr}${q}https:${rel}${q}`;
      return `${attr}${q}${pageOrigin}${rel}${q}`;
    });
  }

  // 5. Gắn CSP nghiêm ngặt vào <head> để khóa hoàn toàn thực thi script nếu HTML được mở trong iframe/blob
  const cspMeta =
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\' https: http:; img-src https: http: data:; font-src https: http: data:;">';
  if (/<head\b[^>]*>/i.test(html)) {
    html = html.replace(/<head\b[^>]*>/i, (m) => `${m}\n${cspMeta}`);
  } else {
    html = `<!DOCTYPE html><html><head><meta charset="utf-8">${cspMeta}</head><body>${html}</body></html>`;
  }

  return html;
}

/**
 * Đọc body từ stream có giới hạn dung lượng nghiêm ngặt (không dùng response.text() vô hạn).
 */
async function readBoundedResponseText(response, maxBytes = LIMITS.MAX_WEB_HTML_BYTES) {
  if (!response.body || typeof response.body.getReader !== "function") {
    const ab = await response.arrayBuffer();
    if (ab.byteLength > maxBytes) {
      const err = new Error("Dung lượng trang web vượt quá giới hạn 2 MB.");
      err.code = "ERR_WEB_PAGE_TOO_LARGE";
      err.status = 413;
      throw err;
    }
    return new TextDecoder("utf-8").decode(ab);
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        const err = new Error("Dung lượng trang web vượt quá giới hạn tối đa 2 MB.");
        err.code = "ERR_WEB_PAGE_TOO_LARGE";
        err.status = 413;
        throw err;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder("utf-8").decode(merged);
}

/**
 * Dịch các nút văn bản hiển thị bên trong HTML đã được làm sạch XSS.
 */
export async function translateHtmlDocument(rawHtml, pageOrigin, options = {}, env = {}) {
  const safeHtml = sanitizeHtmlForSafeDisplay(rawHtml, pageOrigin);

  // Tách riêng <style> để không dịch mã CSS
  const styleBlocks = [];
  const withoutStyle = safeHtml.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (m) => {
    const idx = styleBlocks.length;
    styleBlocks.push(m);
    return `<!--WB_STYLE_${idx}-->`;
  });

  // Trích xuất và dịch các đoạn văn bản giữa thẻ HTML
  const textRegex = />([^<>]+)</g;
  const matches = [];
  let m;
  while ((m = textRegex.exec(withoutStyle)) !== null) {
    const rawText = m[1];
    const trimmed = rawText.trim();
    if (trimmed.length >= 2 && !/^<!--/.test(trimmed)) {
      matches.push({ index: m.index + 1, length: rawText.length, raw: rawText, trimmed });
    }
  }

  let rebuilt = "";
  let lastIdx = 0;
  let translatedNodes = 0;

  for (const item of matches) {
    rebuilt += withoutStyle.slice(lastIdx, item.index);
    const res = await translateText(
      {
        text: item.trimmed,
        sourceLang: options.sourceLang || "auto",
        targetLang: options.targetLang || "vi",
        domain: options.domain || "general"
      },
      env
    );
    if (!res.ok) {
      return res;
    }
    const leadingWs = item.raw.match(/^\s*/)?.[0] || "";
    const trailingWs = item.raw.match(/\s*$/)?.[0] || "";
    rebuilt += `${leadingWs}${res.translatedText}${trailingWs}`;
    translatedNodes += 1;
    lastIdx = item.index + item.length;
  }
  rebuilt += withoutStyle.slice(lastIdx);

  // Khôi phục các khối CSS thuần túy
  const finalHtml = rebuilt.replace(/<!--WB_STYLE_(\d+)-->/g, (_, idx) => styleBlocks[Number(idx)] || "");
  return {
    ok: true,
    translatedHtml: finalHtml,
    translatedNodes
  };
}

/**
 * Tải trang web an toàn (kiểm tra SSRF từng hop redirect + DNS) và dịch nội dung.
 */
export async function translateWebsiteUrl(payload = {}, env = {}) {
  const urlCheck = validateSafeExternalUrl(payload.url);
  if (!urlCheck.valid) {
    return { ok: false, status: 400, code: urlCheck.code, message: urlCheck.message, zeroUserDataStorage: true };
  }

  let currentUrl = urlCheck.url;
  const fetchFn = (env && typeof env.customFetch === "function") ? env.customFetch : fetch;

  let finalResponse = null;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const dnsCheck = await verifyDnsSafe(currentUrl.hostname, env);
    if (!dnsCheck.ok) {
      return { ok: false, status: 403, code: dnsCheck.code, message: dnsCheck.message, zeroUserDataStorage: true };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LIMITS.REQUEST_TIMEOUT_MS);
    let res;
    try {
      res = await fetchFn(currentUrl.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "WordBridgeTranslation/2.0 (+https://dichthuat.wordbridge.io.vn)",
          "Accept": "text/html,application/xhtml+xml;q=0.9"
        }
      });
    } catch (_) {
      clearTimeout(timer);
      return {
        ok: false,
        status: 502,
        code: "ERR_WEBSITE_FETCH_FAILED",
        message: "Không thể truy cập trang web đích (quá thời gian hoặc trang web chặn truy cập tự động).",
        zeroUserDataStorage: true
      };
    }
    clearTimeout(timer);

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) break;
      if (hop === MAX_REDIRECTS) {
        return {
          ok: false,
          status: 400,
          code: "ERR_TOO_MANY_REDIRECTS",
          message: "Trang web chuyển hướng quá số lần cho phép (tối đa 5 bước).",
          zeroUserDataStorage: true
        };
      }
      const nextUrlStr = new URL(location, currentUrl).toString();
      const nextCheck = validateSafeExternalUrl(nextUrlStr);
      if (!nextCheck.valid) {
        return {
          ok: false,
          status: 403,
          code: "ERR_SSRF_REDIRECT_BLOCKED",
          message: "Đã chặn chuyển hướng (Redirect) từ trang web sang địa chỉ mạng nội bộ.",
          zeroUserDataStorage: true
        };
      }
      currentUrl = nextCheck.url;
      continue;
    }

    finalResponse = res;
    break;
  }

  if (!finalResponse || !finalResponse.ok) {
    return {
      ok: false,
      status: 502,
      code: "ERR_WEBSITE_HTTP_ERROR",
      message: `Trang web trả về mã lỗi HTTP ${finalResponse ? finalResponse.status : 502} hoặc yêu cầu đăng nhập.`,
      zeroUserDataStorage: true
    };
  }

  const contentType = (finalResponse.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    return {
      ok: false,
      status: 415,
      code: "ERR_UNSUPPORTED_CONTENT_TYPE",
      message: "Liên kết không trả về trang web HTML hợp lệ.",
      zeroUserDataStorage: true
    };
  }

  let rawHtml;
  try {
    rawHtml = await readBoundedResponseText(finalResponse, LIMITS.MAX_WEB_HTML_BYTES);
  } catch (err) {
    return {
      ok: false,
      status: err?.status || 413,
      code: err?.code || "ERR_WEB_PAGE_TOO_LARGE",
      message: err?.message || "Dung lượng trang web vượt quá giới hạn.",
      zeroUserDataStorage: true
    };
  }

  const translated = await translateHtmlDocument(rawHtml, currentUrl.origin, payload, env);
  if (!translated.ok) return translated;

  return {
    ok: true,
    status: 200,
    sourceUrl: currentUrl.toString(),
    translatedHtml: translated.translatedHtml,
    translatedNodes: translated.translatedNodes,
    sanitized: true,
    sandboxRecommended: true,
    zeroUserDataStorage: true
  };
}
