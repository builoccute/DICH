/**
 * @file src/services/website-translator.js
 * @description Bộ xử lý Dịch Trang Web Trực tuyến (Website Translation Engine) kèm Chống SSRF.
 * Quy trình:
 *   1. Kiểm tra tính hợp lệ của URL (chỉ cho phép giao thức HTTP/HTTPS công khai).
 *   2. Chống SSRF nghiêm ngặt: Chặn localhost, 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12,
 *      192.168.0.0/16, 169.254.0.0/16 (Cloud Metadata), 0.0.0.0, IPv6 nội bộ ([::1], fc00::/7, fe80::/10),
 *      và các tên miền nội bộ (.local, .internal, .localhost).
 *   3. Truy xuất nội dung HTML trang web (hoặc xử lý HTML đầu vào), nhận diện ngôn ngữ trang.
 *   4. Dịch các thành phần văn bản hiển thị (<title>, <h1>-<h6>, <p>, <li>, <td>, <th>, <a>, <figcaption>, <button>)
 *      đồng thời giữ nguyên bố cục HTML, CSS, hình ảnh và chuẩn hóa liên kết tương đối qua thẻ <base>.
 *   5. Không lưu lịch sử URL hoặc nội dung trang web vào D1/R2.
 */

import { translateText } from "./translation-engine.js";
import { detectLanguage } from "./languages.js";
import { escapeHtml } from "../security/privacy-shield.js";

const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /\.localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /\.intranet$/i,
  /\.corp$/i,
  /\.home\.arpa$/i,
  /^metadata\.google\.internal$/i,
  /^instance-data$/i
];

function isPrivateOrReservedIpv4(host) {
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4Match) return false;
  const octets = ipv4Match.slice(1, 5).map(Number);
  if (octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) return true;

  const [a, b] = octets;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8 (RFC1918)
  if (a === 127) return true; // 127.0.0.0/8 (Loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (Link-local / Cloud Metadata 169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 (RFC1918)
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 (RFC1918)
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
  if (a >= 224) return true; // Multicast & Reserved
  return false;
}

function isPrivateOrReservedIpv6(host) {
  const clean = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (!clean.includes(":")) return false;
  if (clean === "::1" || clean === "::" || clean === "0:0:0:0:0:0:0:1") return true;
  if (clean.startsWith("fc") || clean.startsWith("fd")) return true; // Unique Local (fc00::/7)
  if (clean.startsWith("fe8") || clean.startsWith("fe9") || clean.startsWith("fea") || clean.startsWith("feb")) {
    return true; // Link-local (fe80::/10)
  }
  if (clean.startsWith("::ffff:")) {
    const mappedIpv4 = clean.slice(7);
    if (isPrivateOrReservedIpv4(mappedIpv4)) return true;
  }
  return false;
}

/**
 * Kiểm tra URL và chặn tấn công SSRF (Server-Side Request Forgery).
 */
export function validateSafeExternalUrl(rawUrl) {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) {
    return {
      valid: false,
      code: "ERR_EMPTY_URL",
      message: "Vui lòng nhập địa chỉ URL trang web cần dịch (ví dụ: https://www.skyfirst.io.vn)."
    };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (_) {
    return {
      valid: false,
      code: "ERR_INVALID_URL_FORMAT",
      message: "Địa chỉ URL không hợp lệ. Vui lòng nhập đầy đủ giao thức http:// hoặc https://."
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      valid: false,
      code: "ERR_UNSUPPORTED_URL_SCHEME",
      message: "Chỉ hỗ trợ dịch các trang web sử dụng giao thức chuẩn HTTP hoặc HTTPS."
    };
  }

  if (parsed.username || parsed.password) {
    return {
      valid: false,
      code: "ERR_URL_CREDENTIALS_FORBIDDEN",
      message: "Không cho phép địa chỉ URL chứa thông tin xác thực nội bộ."
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  for (const pat of PRIVATE_HOSTNAME_PATTERNS) {
    if (pat.test(hostname)) {
      return {
        valid: false,
        code: "ERR_SSRF_BLOCKED",
        message: "Hệ thống bảo mật chống SSRF đã chặn truy cập vào địa chỉ máy chủ nội bộ hoặc localhost."
      };
    }
  }

  // Chặn biểu diễn IP dạng số nguyên thập phân, bát phân hoặc thập lục phân (ví dụ http://2130706433 hoặc http://0x7f000001)
  if (/^(0x[0-9a-f]+|\d+)$/i.test(hostname)) {
    return {
      valid: false,
      code: "ERR_SSRF_BLOCKED",
      message: "Hệ thống bảo mật chống SSRF không cho phép địa chỉ IP dạng số nguyên thô."
    };
  }

  if (isPrivateOrReservedIpv4(hostname) || isPrivateOrReservedIpv6(hostname)) {
    return {
      valid: false,
      code: "ERR_SSRF_BLOCKED",
      message: "Hệ thống bảo mật chống SSRF đã chặn truy cập vào dải địa chỉ IP nội bộ hoặc Metadata Endpoint."
    };
  }

  if (!hostname.includes(".")) {
    return {
      valid: false,
      code: "ERR_INVALID_PUBLIC_DOMAIN",
      message: "Tên miền trang web không hợp lệ hoặc thuộc mạng cục bộ."
    };
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    origin: parsed.origin,
    hostname
  };
}

/**
 * Biến đổi và dịch nội dung HTML của trang web, giữ nguyên bố cục, hình ảnh và liên kết.
 */
export async function translateHtmlDocument(rawHtml, pageOrigin, options = {}, env = {}) {
  const sourceLang = options.sourceLang || "auto";
  const targetLang = options.targetLang || "vi";
  const domain = options.domain || "general";

  // Tách riêng các khối <script>, <style>, <svg>, <noscript> để không làm hỏng mã nguồn trang
  const preservedBlocks = [];
  const maskedHtml = String(rawHtml || "").replace(
    /<(script|style|svg|code|pre)\b[^>]*>[\s\S]*?<\/\1>/gi,
    (match) => {
      const token = `__WB_HTML_BLOCK_${preservedBlocks.length}__`;
      preservedBlocks.push(match);
      return token;
    }
  );

  // Thu thập các đoạn văn bản nằm giữa các thẻ HTML
  const textNodes = [];
  const textRegex = />([^<>]+)</g;
  let match;
  while ((match = textRegex.exec(maskedHtml)) !== null) {
    const rawSegment = match[1];
    const cleaned = rawSegment.replace(/&nbsp;/gi, " ").trim();
    if (
      cleaned.length >= 2 &&
      !/^__WB_HTML_BLOCK_\d+__$/.test(cleaned) &&
      /[\p{L}]/u.test(cleaned)
    ) {
      textNodes.push({
        fullMatch: match[0],
        rawText: rawSegment,
        trimmedText: cleaned,
        index: match.index
      });
    }
  }

  const plainSample = textNodes
    .slice(0, 40)
    .map((n) => n.trimmedText)
    .join(". ");
  const detectedInfo = detectLanguage(plainSample || "Hello world");

  let translatedSegments = [];
  let transMeta = null;

  if (textNodes.length > 0) {
    const batchStrings = textNodes.slice(0, 120).map((n) => n.trimmedText);
    const joined = batchStrings.join("\n===WB_WEB_NODE===\n");
    transMeta = await translateText(
      {
        text: joined,
        sourceLang,
        targetLang,
        domain
      },
      env
    );
    if (transMeta.ok) {
      translatedSegments = transMeta.translatedText.split(/\n?===WB_WEB_NODE===\n?/);
    }
  }

  let rebuiltHtml = "";
  let lastCursor = 0;
  const maxNodes = Math.min(textNodes.length, 120);
  for (let i = 0; i < maxNodes; i++) {
    const node = textNodes[i];
    const translatedVal = translatedSegments[i] !== undefined ? translatedSegments[i] : node.trimmedText;
    const leadingSpace = node.rawText.match(/^\s*/)?.[0] || "";
    const trailingSpace = node.rawText.match(/\s*$/)?.[0] || "";

    rebuiltHtml += maskedHtml.slice(lastCursor, node.index);
    rebuiltHtml += `>${leadingSpace}${escapeHtml(translatedVal)}${trailingSpace}<`;
    lastCursor = node.index + node.fullMatch.length;
  }
  rebuiltHtml += maskedHtml.slice(lastCursor);

  // Khôi phục các khối <script>, <style>, <svg>
  preservedBlocks.forEach((block, idx) => {
    rebuiltHtml = rebuiltHtml.replaceAll(`__WB_HTML_BLOCK_${idx}__`, block);
  });

  // Chèn thẻ <base> và thanh thông báo Word Bridge Translation ở đầu trang đã dịch
  const bannerHtml = `<div style="position:sticky;top:0;z-index:999999;background:#084c59;color:#ffffff;padding:8px 16px;font-family:Inter,sans-serif;font-size:13px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
    <div><strong>Word Bridge Translation (Trans)</strong> · Đã dịch trang web từ <strong>${escapeHtml(transMeta?.sourceLanguage?.name || detectedInfo.name || sourceLang)}</strong> sang <strong>${escapeHtml(transMeta?.targetLanguage?.name || targetLang)}</strong></div>
    <div><a href="${escapeHtml(pageOrigin)}" target="_blank" rel="noopener noreferrer" style="color:#a5f3fc;text-decoration:underline;">Mở trang gốc (${escapeHtml(pageOrigin)})</a> · <span>Zero User Data Storage</span></div>
  </div>`;

  const baseTag = `<base href="${escapeHtml(pageOrigin)}/" />`;
  if (/<head\b[^>]*>/i.test(rebuiltHtml)) {
    rebuiltHtml = rebuiltHtml.replace(/<head\b[^>]*>/i, (m) => `${m}\n${baseTag}`);
  } else {
    rebuiltHtml = `${baseTag}\n${rebuiltHtml}`;
  }

  if (/<body\b[^>]*>/i.test(rebuiltHtml)) {
    rebuiltHtml = rebuiltHtml.replace(/<body\b[^>]*>/i, (m) => `${m}\n${bannerHtml}`);
  } else {
    rebuiltHtml = `${bannerHtml}\n${rebuiltHtml}`;
  }

  return {
    translatedHtml: rebuiltHtml,
    translatedNodeCount: maxNodes,
    sourceLanguage: transMeta?.sourceLanguage || {
      resolved: detectedInfo.code !== "und" ? detectedInfo.code : "en",
      name: detectedInfo.name
    },
    targetLanguage: transMeta?.targetLanguage || {
      code: targetLang,
      name: targetLang
    },
    sourcePreview: plainSample.slice(0, 600),
    translatedPreview: translatedSegments.slice(0, 20).join(" ").slice(0, 600)
  };
}

/**
 * Dịch trang web từ URL được người dùng cung cấp.
 */
export async function translateWebsiteUrl(payload = {}, env = {}) {
  const startTime = Date.now();
  const urlCheck = validateSafeExternalUrl(payload.url);
  if (!urlCheck.valid) {
    return {
      ok: false,
      code: urlCheck.code,
      message: urlCheck.message
    };
  }

  const sourceLang = String(payload.sourceLang || "auto").trim();
  const targetLang = String(payload.targetLang || "vi").trim();
  const domain = String(payload.domain || "general").trim();

  let rawHtml = "";

  // Hỗ trợ kiểm thử nội bộ hoặc custom fetcher
  if (typeof env?.WEBSITE_FETCH_HANDLER === "function") {
    const customRes = await env.WEBSITE_FETCH_HANDLER(urlCheck.normalizedUrl);
    if (!customRes.ok) {
      return {
        ok: false,
        code: customRes.code || "ERR_WEBSITE_UNREACHABLE",
        message: customRes.message || "Không thể truy cập trang web đích."
      };
    }
    rawHtml = customRes.html;
  } else {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch(urlCheck.normalizedUrl, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent": "WordBridgeTranslationBot/1.0 (+https://dichthuat.wordbridge.io.vn)",
          Accept: "text/html,application/xhtml+xml"
        },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          code: "ERR_WEBSITE_ACCESS_RESTRICTED",
          message:
            "Trang web đích yêu cầu đăng nhập, bật tường lửa chống bot (403/401) hoặc giới hạn quyền truy cập nên không thể dịch trực tiếp."
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          code: "ERR_WEBSITE_HTTP_ERROR",
          message: `Trang web đích trả về mã lỗi HTTP ${response.status}. Vui lòng kiểm tra lại đường dẫn.`
        };
      }

      // Kiểm tra chống SSRF qua redirect cuối cùng
      if (response.url) {
        const finalCheck = validateSafeExternalUrl(response.url);
        if (!finalCheck.valid) {
          return {
            ok: false,
            code: "ERR_SSRF_REDIRECT_BLOCKED",
            message: "Đã chặn chuyển hướng (Redirect) từ trang web sang địa chỉ mạng nội bộ."
          };
        }
      }

      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
        return {
          ok: false,
          code: "ERR_NOT_HTML_WEBPAGE",
          message: "Đường dẫn URL không phải là trang web HTML (ví dụ: tệp nhị phân hoặc JSON)."
        };
      }

      rawHtml = await response.text();
    } catch (_) {
      clearTimeout(timer);
      return {
        ok: false,
        code: "ERR_WEBSITE_UNREACHABLE",
        message:
          "Không thể kết nối tới trang web đích (quá thời gian chờ, tên miền không tồn tại hoặc máy chủ từ chối kết nối)."
      };
    }
  }

  if (!rawHtml || !rawHtml.trim()) {
    return {
      ok: false,
      code: "ERR_EMPTY_WEBPAGE",
      message: "Trang web đích không trả về nội dung HTML hoặc chỉ sử dụng mã nguồn động yêu cầu đăng nhập."
    };
  }

  const transformed = await translateHtmlDocument(
    rawHtml.slice(0, 250000),
    urlCheck.origin,
    { sourceLang, targetLang, domain },
    env
  );

  return {
    ok: true,
    url: urlCheck.normalizedUrl,
    hostname: urlCheck.hostname,
    sourceLanguage: transformed.sourceLanguage,
    targetLanguage: transformed.targetLanguage,
    translatedNodeCount: transformed.translatedNodeCount,
    sourcePreview: transformed.sourcePreview,
    translatedPreview: transformed.translatedPreview,
    translatedHtml: transformed.translatedHtml,
    durationMs: Date.now() - startTime,
    privacyGuarantee: {
      zeroUserDataStorage: true,
      ssrfProtected: true,
      storedInD1: false,
      storedInR2: false
    }
  };
}
