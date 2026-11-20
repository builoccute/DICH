/**
 * @file src/api/router.js
 * @description Bộ định tuyến Độc lập cho Word Bridge Translation (https://dichthuat.wordbridge.io.vn).
 *
 * API CHÍNH THỨC (v1):
 *   - GET  /api/v1/specs              Thông tin API & giới hạn hệ thống
 *   - GET  /api/v1/languages          Danh sách ngôn ngữ được hỗ trợ
 *   - GET  /api/v1/domains            Danh sách 20 lĩnh vực chuyên ngành
 *   - POST /api/v1/detect             Nhận diện ngôn ngữ
 *   - POST /api/v1/translate          Dịch văn bản
 *   - POST /api/v1/translate/document Dịch tài liệu (PDF, DOCX, DOC, PPTX, XLSX, CSV, TXT)
 *   - POST /api/v1/translate/website  Dịch trang web (chống SSRF & XSS)
 *   - POST /api/v1/translate/image    Dịch hình ảnh (Tesseract RAM-piped)
 *   - POST /api/v1/feedback           Gửi ý kiến phản hồi qua SMTP độc lập
 *   - GET  /api/health                Kiểm tra sức khỏe hệ thống & nhà cung cấp dịch thuật
 *
 * 08 GIAO DIỆN CÔNG KHAI:
 *   /, /dich-van-ban, /dich-tai-lieu, /dich-trang-web, /dich-hinh-anh,
 *   /gioi-thieu, /quyen-rieng-tu, /tro-giup, /phan-hoi
 */

import { GLOBAL_LANGUAGES, detectLanguage } from "../services/languages.js";
import { SPECIALIZED_DOMAINS } from "../services/domains.js";
import {
  translateText,
  getProvidersStatus,
  checkProviderHealth
} from "../services/translation-engine.js";
import { translateDocumentInMemory } from "../services/document-processor.js";
import { translateWebsiteUrl } from "../services/website-translator.js";
import { processImageOcrAndTranslate, getInstalledTesseractLanguages } from "../services/ocr-processor.js";
import {
  submitFeedbackAndSendEmail,
  FEEDBACK_TYPES,
  OFFICIAL_SUPPORT_EMAIL
} from "../services/feedback-mailer.js";
import {
  createMetricsStore,
  isEligiblePageVisitRequest
} from "../db/site-metrics.js";
import {
  NO_STORE_HEADERS,
  SECURITY_HEADERS,
  LIMITS,
  globalRateLimiter,
  sanitizedLog
} from "../security/privacy-shield.js";
import {
  getLogoAsset,
  getBrandSvgAsset,
  getFaviconIcoBytes,
  getAppIconPngBytes,
  getWebManifestJson,
  getRobotsTxt,
  getSitemapXml
} from "../ui/assets.js";
import { renderTranslationAppHtml } from "../ui/template.js";

const PUBLIC_ROUTE_TO_VIEW = Object.freeze({
  "/": "text",
  "/dich-van-ban": "text",
  "/dich-tai-lieu": "document",
  "/dich-trang-web": "website",
  "/dich-hinh-anh": "image",
  "/gioi-thieu": "about",
  "/quyen-rieng-tu": "privacy",
  "/tro-giup": "help",
  "/phan-hoi": "feedback"
});

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...NO_STORE_HEADERS,
      ...extraHeaders
    }
  });
}

function getClientSignal(request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return request.headers.get("x-client-signal") || "local-client";
}

function buildCorsHeaders(request, env = {}) {
  const origin = request.headers.get("origin");
  if (!origin) return {};
  const allowedOrigin = String(env.PUBLIC_DOMAIN || process.env.PUBLIC_DOMAIN || "https://dichthuat.wordbridge.io.vn").replace(/\/+$/, "");
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  if (origin === allowedOrigin || isLocal) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Vary": "Origin"
    };
  }
  return {};
}

async function parseJsonBody(request, maxBytes = LIMITS.MAX_DOCUMENT_BYTES * 1.45) {
  const rawText = await request.text();
  if (Buffer.byteLength(rawText, "utf-8") > maxBytes) {
    const err = new Error("Dữ liệu yêu cầu vượt quá dung lượng cho phép.");
    err.code = "ERR_PAYLOAD_TOO_LARGE";
    err.status = 413;
    throw err;
  }
  try {
    return rawText ? JSON.parse(rawText) : {};
  } catch (_) {
    const err = new Error("Dữ liệu JSON không hợp lệ.");
    err.code = "ERR_INVALID_JSON";
    err.status = 400;
    throw err;
  }
}

export async function dispatchRequest(request, env = {}) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const method = String(request.method || "GET").toUpperCase();
  const corsHeaders = buildCorsHeaders(request, env);
  const metricsStore = createMetricsStore(env);

  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { ...NO_STORE_HEADERS, ...corsHeaders }
    });
  }

  // 1. Tài nguyên thương hiệu, Favicon, PWA, SEO
  if (method === "GET") {
    if (pathname === "/favicon.ico") {
      const ico = getFaviconIcoBytes();
      return new Response(ico, {
        status: 200,
        headers: {
          "Content-Type": "image/x-icon",
          "Cache-Control": "public, max-age=86400",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }

    if (pathname === "/assets/favicon.svg") {
      return new Response(getBrandSvgAsset("favicon"), {
        status: 200,
        headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=86400" }
      });
    }

    if (pathname === "/assets/logo.jpg") {
      const logo = getLogoAsset();
      if (logo && logo.bytes) {
        return new Response(logo.bytes, {
          status: 200,
          headers: { "Content-Type": logo.mimeType, "Cache-Control": "public, max-age=86400" }
        });
      }
      return new Response(getBrandSvgAsset("logo-horizontal"), {
        status: 200,
        headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=86400" }
      });
    }

    const svgAssetMap = {
      "/assets/logo-horizontal.svg": "logo-horizontal",
      "/assets/logo-vertical.svg": "logo-vertical",
      "/assets/logo-icon.svg": "logo-icon",
      "/assets/logo-light.svg": "logo-light",
      "/assets/logo-dark.svg": "logo-dark",
      "/assets/icon-192.svg": "app-icon",
      "/assets/icon-512.svg": "app-icon",
      "/assets/og-banner.svg": "og-banner"
    };
    if (svgAssetMap[pathname]) {
      return new Response(getBrandSvgAsset(svgAssetMap[pathname]), {
        status: 200,
        headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=86400" }
      });
    }

    if (pathname === "/assets/icon-192.png" || pathname === "/assets/icon-512.png") {
      const size = pathname.includes("512") ? 512 : 192;
      const pngBytes = getAppIconPngBytes(size);
      if (pngBytes) {
        return new Response(pngBytes, {
          status: 200,
          headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" }
        });
      }
      return new Response(getBrandSvgAsset("app-icon"), {
        status: 200,
        headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=86400" }
      });
    }

    if (pathname === "/manifest.webmanifest") {
      return new Response(getWebManifestJson(), {
        status: 200,
        headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=3600" }
      });
    }

    if (pathname === "/robots.txt") {
      return new Response(getRobotsTxt(), {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" }
      });
    }

    if (pathname === "/sitemap.xml") {
      return new Response(getSitemapXml(), {
        status: 200,
        headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" }
      });
    }

    // 2. Các trang giao diện công khai (8 giao diện)
    if (pathname in PUBLIC_ROUTE_TO_VIEW) {
      let totalAccesses = await metricsStore.getTotalAccesses();
      if (isEligiblePageVisitRequest(request)) {
        totalAccesses = await metricsStore.incrementAccesses();
      }
      const html = renderTranslationAppHtml({
        initialView: PUBLIC_ROUTE_TO_VIEW[pathname],
        pathname,
        totalAccesses,
        languages: GLOBAL_LANGUAGES,
        domains: SPECIALIZED_DOMAINS,
        feedbackTypes: FEEDBACK_TYPES
      });
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...NO_STORE_HEADERS,
          ...SECURITY_HEADERS
        }
      });
    }
  }

  // 3. Health Check độc lập (không tăng bộ đếm truy cập)
  if (pathname === "/api/health" && method === "GET") {
    const providerHealth = await checkProviderHealth(env);
    const providersSummary = getProvidersStatus(env);
    const totalAccesses = await metricsStore.getTotalAccesses();
    return jsonResponse(
      {
        ok: true,
        service: "Word Bridge Translation (TRANS)",
        domain: String(env.PUBLIC_DOMAIN || process.env.PUBLIC_DOMAIN || "https://dichthuat.wordbridge.io.vn"),
        architecture: "Independent Self-Hosted Node.js + FastAPI NMT Microservice",
        serverAlive: true,
        translationProvider: providerHealth,
        providersConfigured: providersSummary.configuredCount,
        imageRecognitionEngines: getInstalledTesseractLanguages(),
        metricsStore: metricsStore.getStatus(),
        totalAccesses,
        zeroUserDataStorage: true,
        timestamp: new Date().toISOString()
      },
      200,
      corsHeaders
    );
  }

  // 4. API v1 công khai
  if (pathname.startsWith("/api/v1/")) {
    // Kiểm tra rate limit cho các endpoint POST
    if (method === "POST") {
      const rl = globalRateLimiter.check(getClientSignal(request));
      if (!rl.allowed) {
        return jsonResponse(
          {
            ok: false,
            code: "ERR_RATE_LIMIT_EXCEEDED",
            message: "Bạn gửi quá nhiều yêu cầu trong một phút. Vui lòng thử lại sau giây lát."
          },
          429,
          corsHeaders
        );
      }
    }

    if (pathname === "/api/v1/specs" && method === "GET") {
      return jsonResponse(
        {
          ok: true,
          name: "Word Bridge Translation API",
          version: "1.0.0",
          serviceCode: "TRANS",
          publicDomain: "https://dichthuat.wordbridge.io.vn",
          supportEmail: OFFICIAL_SUPPORT_EMAIL,
          zeroUserDataStorage: true,
          limits: {
            maxTextLength: LIMITS.MAX_TEXT_LENGTH,
            maxDocumentBytes: LIMITS.MAX_DOCUMENT_BYTES,
            maxImageBytes: LIMITS.MAX_IMAGE_BYTES,
            maxDocumentPages: LIMITS.MAX_DOCUMENT_PAGES,
            requestTimeoutMs: LIMITS.REQUEST_TIMEOUT_MS
          },
          supportedDocumentFormats: ["pdf", "docx", "doc", "pptx", "xlsx", "csv", "txt"],
          supportedImageFormats: ["jpg", "jpeg", "png", "webp"],
          languagesCount: GLOBAL_LANGUAGES.length,
          specializedDomainsCount: SPECIALIZED_DOMAINS.length,
          endpoints: [
            "GET /api/v1/specs",
            "GET /api/v1/languages",
            "GET /api/v1/domains",
            "POST /api/v1/detect",
            "POST /api/v1/translate",
            "POST /api/v1/translate/document",
            "POST /api/v1/translate/website",
            "POST /api/v1/translate/image",
            "POST /api/v1/feedback",
            "GET /api/health"
          ]
        },
        200,
        corsHeaders
      );
    }

    if (pathname === "/api/v1/languages" && method === "GET") {
      return jsonResponse(
        {
          ok: true,
          total: GLOBAL_LANGUAGES.length,
          languages: GLOBAL_LANGUAGES
        },
        200,
        corsHeaders
      );
    }

    if (pathname === "/api/v1/domains" && method === "GET") {
      return jsonResponse(
        {
          ok: true,
          total: SPECIALIZED_DOMAINS.length,
          domains: SPECIALIZED_DOMAINS.map((d) => ({
            id: d.id,
            nameVi: d.nameVi,
            nameEn: d.nameEn,
            description: d.description
          }))
        },
        200,
        corsHeaders
      );
    }

    if (pathname === "/api/v1/detect" && method === "POST") {
      try {
        const body = await parseJsonBody(request, 256 * 1024);
        const text = String(body.text || "").trim();
        if (!text) {
          return jsonResponse({ ok: false, code: "ERR_EMPTY_TEXT", message: "Vui lòng cung cấp văn bản để nhận diện." }, 400, corsHeaders);
        }
        const detected = detectLanguage(text);
        return jsonResponse({ ok: true, detected, zeroUserDataStorage: true }, 200, corsHeaders);
      } catch (err) {
        return jsonResponse({ ok: false, code: err.code || "ERR_BAD_REQUEST", message: err.message }, err.status || 400, corsHeaders);
      }
    }

    if (pathname === "/api/v1/translate" && method === "POST") {
      try {
        const body = await parseJsonBody(request, 512 * 1024);
        const result = await translateText(body, env);
        return jsonResponse(result, result.status || (result.ok ? 200 : 400), corsHeaders);
      } catch (err) {
        sanitizedLog("ERROR", "API_TRANSLATE_ERROR", { code: err.code || "ERR_TRANSLATE" });
        return jsonResponse({ ok: false, code: err.code || "ERR_BAD_REQUEST", message: err.message }, err.status || 400, corsHeaders);
      }
    }

    if (pathname === "/api/v1/translate/document" && method === "POST") {
      try {
        const body = await parseJsonBody(request, Math.ceil(LIMITS.MAX_DOCUMENT_BYTES * 1.4));
        if (!body.fileBase64 || !body.filename) {
          return jsonResponse({ ok: false, code: "ERR_MISSING_FILE", message: "Vui lòng tải lên tệp tài liệu cần dịch." }, 400, corsHeaders);
        }
        const bytes = new Uint8Array(Buffer.from(String(body.fileBase64), "base64"));
        const result = await translateDocumentInMemory(
          bytes,
          {
            filename: body.filename,
            sourceLang: body.sourceLang || "auto",
            targetLang: body.targetLang || "vi",
            domain: body.domain || "general"
          },
          env
        );
        return jsonResponse(result, result.status || (result.ok ? 200 : 400), corsHeaders);
      } catch (err) {
        sanitizedLog("ERROR", "API_DOCUMENT_ERROR", { code: err.code || "ERR_DOCUMENT" });
        return jsonResponse({ ok: false, code: err.code || "ERR_BAD_REQUEST", message: err.message }, err.status || 400, corsHeaders);
      }
    }

    if (pathname === "/api/v1/translate/website" && method === "POST") {
      try {
        const body = await parseJsonBody(request, 64 * 1024);
        const result = await translateWebsiteUrl(body, env);
        return jsonResponse(result, result.status || (result.ok ? 200 : 400), corsHeaders);
      } catch (err) {
        sanitizedLog("ERROR", "API_WEBSITE_ERROR", { code: err.code || "ERR_WEBSITE" });
        return jsonResponse({ ok: false, code: err.code || "ERR_BAD_REQUEST", message: err.message }, err.status || 400, corsHeaders);
      }
    }

    if (pathname === "/api/v1/translate/image" && method === "POST") {
      try {
        const body = await parseJsonBody(request, Math.ceil(LIMITS.MAX_IMAGE_BYTES * 1.45));
        if (!body.imageBase64) {
          return jsonResponse({ ok: false, code: "ERR_MISSING_IMAGE", message: "Vui lòng tải lên tệp hình ảnh cần dịch." }, 400, corsHeaders);
        }
        const bytes = new Uint8Array(Buffer.from(String(body.imageBase64), "base64"));
        const result = await processImageOcrAndTranslate(
          bytes,
          {
            filename: body.filename || "image.png",
            sourceLang: body.sourceLang || "auto",
            targetLang: body.targetLang || "vi",
            domain: body.domain || "general"
          },
          env
        );
        return jsonResponse(result, result.status || (result.ok ? 200 : 400), corsHeaders);
      } catch (err) {
        sanitizedLog("ERROR", "API_IMAGE_ERROR", { code: err.code || "ERR_IMAGE" });
        return jsonResponse({ ok: false, code: err.code || "ERR_BAD_REQUEST", message: err.message }, err.status || 400, corsHeaders);
      }
    }

    if (pathname === "/api/v1/feedback" && method === "POST") {
      try {
        const body = await parseJsonBody(request, Math.ceil(12 * 1024 * 1024 * 1.4));
        const result = await submitFeedbackAndSendEmail(body, env, getClientSignal(request));
        return jsonResponse(result, result.status || (result.ok ? 200 : 400), corsHeaders);
      } catch (err) {
        sanitizedLog("ERROR", "API_FEEDBACK_ERROR", { code: err.code || "ERR_FEEDBACK" });
        return jsonResponse({ ok: false, code: err.code || "ERR_BAD_REQUEST", message: err.message }, err.status || 400, corsHeaders);
      }
    }
  }

  return jsonResponse(
    {
      ok: false,
      code: "ERR_NOT_FOUND",
      message: "Đường dẫn API hoặc trang không tồn tại trên Word Bridge Translation."
    },
    404,
    corsHeaders
  );
}
