/**
 * @file src/services/translation-engine.js
 * @description Bộ điều phối Dịch thuật Độc lập Word Bridge Translation (Zero Cloudflare, Zero Mock Fallback).
 *
 * KIẾN TRÚC PROVIDER ĐỘC LẬP:
 *   1. Self-Hosted Word Bridge NLLB-200 Microservice (`WORDBRIDGE_NLLB_API_URL`) — ưu tiên hàng đầu.
 *   2. Self-Hosted LibreTranslate (`LIBRETRANSLATE_API_URL`) — tùy chọn tự vận hành.
 *   3. Nhà cung cấp Zero-Data-Retention (DeepL / OpenAI-compatible khi `EXTERNAL_ZDR_VERIFIED=true`).
 *
 * NGUYÊN TẮC CHẤT LƯỢNG & TRUNG THỰC:
 *   - KHÔNG sử dụng Cloudflare Workers AI.
 *   - KHÔNG dùng bảng từ điển nhỏ thay thế bộ máy dịch hoàn chỉnh.
 *   - KHÔNG trả nguyên văn đầu vào kèm `ok: true` khi nhà cung cấp dịch thuật không khả dụng.
 *   - Trả mã lỗi HTTP 503 rõ ràng khi model chưa tải hoặc provider chưa sẵn sàng.
 *   - Áp dụng thực tế 20 lĩnh vực chuyên ngành (Pre/Post-pass thuật ngữ & ngữ cảnh chuyên ngành).
 */

import { detectLanguage, getLanguageInfo } from "./languages.js";

function getLanguageByCode(code) {
  return getLanguageInfo(code) || null;
}
function isValidLanguageCode(code) {
  return Boolean(getLanguageInfo(code));
}
import { getDomainById, SPECIALIZED_DOMAINS } from "./domains.js";
import {
  translateViaSelfHostedNllb,
  applyDomainGlossaryPrePass,
  restoreDomainGlossaryPostPass,
  toFlores200Code
} from "./nllb-connector.js";
import { LIMITS } from "../security/privacy-shield.js";

export function analyzeTextStats(text) {
  const s = String(text || "");
  const trimmed = s.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const sentences = trimmed ? trimmed.split(/[.!?。！？\n]+/).filter((x) => x.trim().length > 0).length : 0;
  const paragraphs = trimmed ? trimmed.split(/\n{2,}/).filter((x) => x.trim().length > 0).length : 0;
  return {
    characters: s.length,
    charactersNoSpaces: s.replace(/\s/g, "").length,
    words,
    sentences,
    paragraphs
  };
}

export function normalizeInputText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "");
}

export function splitTextIntoSegments(text, maxSegmentChars = 1500) {
  const normalized = normalizeInputText(text);
  if (normalized.length <= maxSegmentChars) {
    return [normalized];
  }
  const paragraphs = normalized.split("\n");
  const segments = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + (current ? "\n" : "") + para).length <= maxSegmentChars) {
      current = current ? `${current}\n${para}` : para;
    } else {
      if (current) {
        segments.push(current);
        current = "";
      }
      if (para.length <= maxSegmentChars) {
        current = para;
      } else {
        // Cắt theo ranh giới câu nếu đoạn văn quá dài
        const sentences = para.match(/[^.!?。！？]+[.!?。！？]*\s*/g) || [para];
        for (const sent of sentences) {
          if (sent.length > maxSegmentChars) {
            for (let i = 0; i < sent.length; i += maxSegmentChars) {
              segments.push(sent.slice(i, i + maxSegmentChars));
            }
          } else if ((current + sent).length <= maxSegmentChars) {
            current += sent;
          } else {
            if (current) segments.push(current);
            current = sent;
          }
        }
      }
    }
  }
  if (current) segments.push(current);
  return segments;
}

async function fetchWithTimeoutAndRetry(url, init, timeoutMs = LIMITS.REQUEST_TIMEOUT_MS, maxRetries = 1) {
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (res.status >= 502 && res.status <= 504 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error("ERR_PROVIDER_TIMEOUT");
}

function resolveEnv(env, key) {
  return String((env && env[key]) || process.env[key] || "").trim();
}

export function getProvidersStatus(env = {}) {
  const nllbUrl = resolveEnv(env, "WORDBRIDGE_NLLB_API_URL");
  const libreUrl = resolveEnv(env, "LIBRETRANSLATE_API_URL");
  const deeplKey = resolveEnv(env, "DEEPL_API_KEY");
  const openaiKey = resolveEnv(env, "OPENAI_API_KEY");
  const externalZdrVerified = resolveEnv(env, "EXTERNAL_ZDR_VERIFIED").toLowerCase() === "true";

  const providers = [
    {
      id: "self_hosted_nllb",
      name: "Word Bridge Self-Hosted NLLB-200 (CTranslate2 INT8)",
      selfHosted: true,
      configured: Boolean(nllbUrl),
      zeroUserDataStorage: true
    },
    {
      id: "self_hosted_libretranslate",
      name: "Self-Hosted LibreTranslate",
      selfHosted: true,
      configured: Boolean(libreUrl),
      zeroUserDataStorage: true
    },
    {
      id: "deepl_zdr",
      name: "DeepL Pro API (Zero Data Retention)",
      selfHosted: false,
      configured: Boolean(deeplKey && externalZdrVerified),
      zeroUserDataStorage: externalZdrVerified
    },
    {
      id: "openai_zdr",
      name: "OpenAI-Compatible Zero-Retention API",
      selfHosted: false,
      configured: Boolean(openaiKey && externalZdrVerified),
      zeroUserDataStorage: externalZdrVerified
    }
  ];

  const activeProvider = providers.find((p) => p.configured) || null;
  return {
    activeProvider: activeProvider ? activeProvider.id : "unconfigured",
    activeProviderName: activeProvider ? activeProvider.name : "Chưa kết nối máy chủ dịch thuật",
    configuredCount: providers.filter((p) => p.configured).length,
    providers,
    specializedDomainsCount: SPECIALIZED_DOMAINS.length
  };
}

/**
 * Kiểm tra trạng thái sức khỏe thực tế của nhà cung cấp dịch thuật (phân biệt máy chủ sống, model đã tải, lỗi model).
 */
export async function checkProviderHealth(env = {}) {
  const nllbUrl = resolveEnv(env, "WORDBRIDGE_NLLB_API_URL");
  if (nllbUrl) {
    try {
      const healthUrl = `${nllbUrl.replace(/\/+$/, "")}/health`;
      const res = await fetchWithTimeoutAndRetry(healthUrl, { method: "GET" }, 3500, 0);
      if (!res.ok) {
        return {
          provider: "self_hosted_nllb",
          serverAlive: true,
          modelStatus: "error",
          translationReady: false,
          detail: `HTTP ${res.status}`
        };
      }
      const data = await res.json();
      const loaded = Boolean(data.model_weights_loaded || data.translation_ready);
      return {
        provider: "self_hosted_nllb",
        serverAlive: Boolean(data.server_alive ?? true),
        modelStatus: data.model_status || (loaded ? "loaded" : "not_loaded"),
        translationReady: loaded,
        detail: data.model_error || null
      };
    } catch (_) {
      return {
        provider: "self_hosted_nllb",
        serverAlive: false,
        modelStatus: "unreachable",
        translationReady: false,
        detail: "Không thể kết nối tới microservice NLLB-200."
      };
    }
  }

  const libreUrl = resolveEnv(env, "LIBRETRANSLATE_API_URL");
  if (libreUrl) {
    try {
      const res = await fetchWithTimeoutAndRetry(`${libreUrl.replace(/\/+$/, "")}/languages`, { method: "GET" }, 3500, 0);
      return {
        provider: "self_hosted_libretranslate",
        serverAlive: res.ok,
        modelStatus: res.ok ? "loaded" : "error",
        translationReady: res.ok,
        detail: res.ok ? null : `HTTP ${res.status}`
      };
    } catch (_) {
      return {
        provider: "self_hosted_libretranslate",
        serverAlive: false,
        modelStatus: "unreachable",
        translationReady: false,
        detail: "Không thể kết nối tới máy chủ LibreTranslate."
      };
    }
  }

  const status = getProvidersStatus(env);
  if (status.activeProvider !== "unconfigured") {
    return {
      provider: status.activeProvider,
      serverAlive: true,
      modelStatus: "external_configured",
      translationReady: true,
      detail: null
    };
  }

  return {
    provider: "unconfigured",
    serverAlive: false,
    modelStatus: "not_configured",
    translationReady: false,
    detail: "Chưa cấu hình WORDBRIDGE_NLLB_API_URL hoặc nhà cung cấp dịch thuật độc lập."
  };
}

async function callLibreTranslate(segment, sourceLang, targetLang, domainId, env) {
  const libreUrl = resolveEnv(env, "LIBRETRANSLATE_API_URL");
  if (!libreUrl) return null;
  const apiKey = resolveEnv(env, "LIBRETRANSLATE_API_KEY");
  const { maskedText, replacements } = applyDomainGlossaryPrePass(segment, sourceLang, targetLang, domainId);

  const res = await fetchWithTimeoutAndRetry(`${libreUrl.replace(/\/+$/, "")}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: maskedText,
      source: sourceLang,
      target: targetLang,
      format: "text",
      ...(apiKey ? { api_key: apiKey } : {})
    })
  });
  if (!res.ok) {
    const err = new Error(`ERR_LIBRETRANSLATE_HTTP_${res.status}`);
    err.status = res.status === 400 ? 400 : 503;
    throw err;
  }
  const data = await res.json();
  if (!data || typeof data.translatedText !== "string") {
    throw new Error("ERR_INVALID_PROVIDER_RESPONSE");
  }
  const restored = restoreDomainGlossaryPostPass(data.translatedText, replacements);
  return {
    translatedText: restored,
    provider: "self_hosted_libretranslate",
    appliedTerms: replacements.map((r) => ({ source: r.source, target: r.target }))
  };
}

async function callExternalZdrProvider(segment, sourceLang, targetLang, domainId, env) {
  const externalZdrVerified = resolveEnv(env, "EXTERNAL_ZDR_VERIFIED").toLowerCase() === "true";
  if (!externalZdrVerified) return null;

  const deeplKey = resolveEnv(env, "DEEPL_API_KEY");
  if (deeplKey) {
    const endpoint = resolveEnv(env, "DEEPL_API_URL") || "https://api.deepl.com/v2/translate";
    const { maskedText, replacements } = applyDomainGlossaryPrePass(segment, sourceLang, targetLang, domainId);
    const res = await fetchWithTimeoutAndRetry(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `DeepL-Auth-Key ${deeplKey}`
      },
      body: JSON.stringify({
        text: [maskedText],
        source_lang: sourceLang.toUpperCase(),
        target_lang: targetLang.toUpperCase()
      })
    });
    if (!res.ok) {
      const err = new Error(`ERR_DEEPL_HTTP_${res.status}`);
      err.status = 503;
      throw err;
    }
    const data = await res.json();
    const out = data?.translations?.[0]?.text;
    if (typeof out !== "string") throw new Error("ERR_INVALID_DEEPL_RESPONSE");
    return {
      translatedText: restoreDomainGlossaryPostPass(out, replacements),
      provider: "deepl_zdr",
      appliedTerms: replacements.map((r) => ({ source: r.source, target: r.target }))
    };
  }

  const openaiKey = resolveEnv(env, "OPENAI_API_KEY");
  if (openaiKey) {
    const baseUrl = resolveEnv(env, "OPENAI_BASE_URL") || "https://api.openai.com/v1";
    const model = resolveEnv(env, "OPENAI_MODEL") || "gpt-4o-mini";
    const domainObj = getDomainById(domainId);
    const srcInfo = getLanguageByCode(sourceLang);
    const tgtInfo = getLanguageByCode(targetLang);

    const res = await fetchWithTimeoutAndRetry(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: `You are a professional translator for Word Bridge Translation. Translate accurately from ${srcInfo?.nameEn || sourceLang} to ${tgtInfo?.nameEn || targetLang} using terminology appropriate for the "${domainObj.nameVi} (${domainObj.nameEn})" domain. Return ONLY the translated text without explanations or markdown wrappers.`
          },
          { role: "user", content: segment }
        ]
      })
    });
    if (!res.ok) {
      const err = new Error(`ERR_OPENAI_HTTP_${res.status}`);
      err.status = 503;
      throw err;
    }
    const data = await res.json();
    const out = data?.choices?.[0]?.message?.content;
    if (typeof out !== "string" || !out.trim()) throw new Error("ERR_INVALID_OPENAI_RESPONSE");
    return {
      translatedText: out.trim(),
      provider: "openai_zdr",
      appliedTerms: []
    };
  }

  return null;
}

/**
 * Dịch một phân đoạn văn bản qua chuỗi provider thực tế (có hỗ trợ custom adapter cho kiểm thử tích hợp).
 */
async function translateSegmentViaRealProvider(segment, sourceLang, targetLang, domainId, env) {
  // Cho phép tiêm adapter thực thi trực tiếp trong integration test mà không dùng mock ẩn trong production
  if (env && typeof env.customTranslationExecutor === "function") {
    const { maskedText, replacements } = applyDomainGlossaryPrePass(segment, sourceLang, targetLang, domainId);
    const res = await env.customTranslationExecutor({
      text: maskedText,
      sourceLang,
      targetLang,
      domainId,
      srcFlores: toFlores200Code(sourceLang),
      tgtFlores: toFlores200Code(targetLang)
    });
    if (!res || typeof res.translatedText !== "string") {
      const err = new Error("ERR_CUSTOM_PROVIDER_FAILED");
      err.status = 503;
      throw err;
    }
    return {
      translatedText: restoreDomainGlossaryPostPass(res.translatedText, replacements),
      provider: res.provider || "self_hosted_nllb",
      appliedTerms: replacements.map((r) => ({ source: r.source, target: r.target }))
    };
  }

  // 1. Self-Hosted Word Bridge NLLB-200 Microservice
  const nllbUrl = resolveEnv(env, "WORDBRIDGE_NLLB_API_URL");
  if (nllbUrl) {
    const nllbRes = await translateViaSelfHostedNllb(segment, sourceLang, targetLang, domainId, {
      WORDBRIDGE_NLLB_API_URL: nllbUrl,
      WORDBRIDGE_NLLB_TOKEN: resolveEnv(env, "WORDBRIDGE_NLLB_TOKEN"),
      REQUEST_TIMEOUT: LIMITS.REQUEST_TIMEOUT_MS
    });
    if (nllbRes && nllbRes.ok && typeof nllbRes.translatedText === "string") {
      return {
        translatedText: nllbRes.translatedText,
        provider: "self_hosted_nllb",
        appliedTerms: nllbRes.appliedTerms || []
      };
    }
    const err = new Error(nllbRes?.message || "Máy chủ dịch thuật NLLB-200 tự vận hành chưa sẵn sàng.");
    err.code = nllbRes?.code || "ERR_NLLB_UNAVAILABLE";
    err.status = nllbRes?.status || 503;
    throw err;
  }

  // 2. Self-Hosted LibreTranslate
  const libreRes = await callLibreTranslate(segment, sourceLang, targetLang, domainId, env);
  if (libreRes) return libreRes;

  // 3. External Zero-Data-Retention API (chỉ khi EXTERNAL_ZDR_VERIFIED=true)
  const externalRes = await callExternalZdrProvider(segment, sourceLang, targetLang, domainId, env);
  if (externalRes) return externalRes;

  const err = new Error(
    "Chưa kết nối bộ máy dịch thuật thực tế (WORDBRIDGE_NLLB_API_URL). Hệ thống từ chối trả bản dịch giả lập."
  );
  err.code = "ERR_TRANSLATION_PROVIDER_UNAVAILABLE";
  err.status = 503;
  throw err;
}

/**
 * Hàm điều phối dịch văn bản chính thức của Word Bridge Translation.
 */
export async function translateText(payload = {}, env = {}) {
  const startTs = Date.now();
  const rawText = normalizeInputText(payload.text || "");
  if (!rawText.trim()) {
    return {
      ok: false,
      status: 400,
      code: "ERR_EMPTY_TEXT",
      message: "Vui lòng nhập nội dung văn bản cần dịch."
    };
  }

  const maxLen = Number(resolveEnv(env, "MAX_TEXT_LENGTH")) || LIMITS.MAX_TEXT_LENGTH;
  if (rawText.length > maxLen) {
    return {
      ok: false,
      status: 413,
      code: "ERR_TEXT_TOO_LONG",
      message: `Văn bản vượt quá giới hạn tối đa ${maxLen.toLocaleString("vi-VN")} ký tự mỗi lần dịch.`
    };
  }

  const requestedSource = String(payload.sourceLang || "auto").trim().toLowerCase();
  const targetLang = String(payload.targetLang || "vi").trim().toLowerCase();
  const domainObj = getDomainById(payload.domain || "general");

  if (!isValidLanguageCode(targetLang)) {
    return {
      ok: false,
      status: 400,
      code: "ERR_UNSUPPORTED_TARGET_LANGUAGE",
      message: `Ngôn ngữ đích "${targetLang}" không nằm trong danh sách ngôn ngữ được hỗ trợ.`
    };
  }

  let resolvedSource = requestedSource;
  let detectedInfo = null;
  if (requestedSource === "auto" || !requestedSource) {
    detectedInfo = detectLanguage(rawText);
    resolvedSource = detectedInfo.code;
  } else if (!isValidLanguageCode(requestedSource)) {
    return {
      ok: false,
      status: 400,
      code: "ERR_UNSUPPORTED_SOURCE_LANGUAGE",
      message: `Ngôn ngữ nguồn "${requestedSource}" không nằm trong danh sách ngôn ngữ được hỗ trợ.`
    };
  }

  // Trường hợp ngôn ngữ nguồn và đích trùng nhau
  if (resolvedSource === targetLang) {
    return {
      ok: true,
      status: 200,
      translatedText: rawText,
      sourceLang: resolvedSource,
      targetLang,
      detectedLanguage: detectedInfo,
      domain: { id: domainObj.id, nameVi: domainObj.nameVi, nameEn: domainObj.nameEn },
      provider: "same-language-passthrough",
      appliedTerms: [],
      stats: analyzeTextStats(rawText),
      durationMs: Date.now() - startTs,
      zeroUserDataStorage: true
    };
  }

  const segments = splitTextIntoSegments(rawText, 1500);
  const translatedSegments = [];
  const allAppliedTerms = [];
  let providerUsed = "";

  try {
    for (const seg of segments) {
      if (!seg.trim()) {
        translatedSegments.push(seg);
        continue;
      }
      const res = await translateSegmentViaRealProvider(seg, resolvedSource, targetLang, domainObj.id, env);
      translatedSegments.push(res.translatedText);
      providerUsed = res.provider;
      if (Array.isArray(res.appliedTerms)) {
        allAppliedTerms.push(...res.appliedTerms);
      }
    }
  } catch (err) {
    return {
      ok: false,
      status: err?.status || 503,
      code: err?.code || "ERR_TRANSLATION_PROVIDER_UNAVAILABLE",
      message:
        err?.message ||
        "Bộ máy dịch thuật hiện không khả dụng. Không có nội dung người dùng nào được lưu lại.",
      zeroUserDataStorage: true
    };
  }

  const finalText = translatedSegments.join("\n");
  return {
    ok: true,
    status: 200,
    translatedText: finalText,
    sourceLang: resolvedSource,
    targetLang,
    detectedLanguage: detectedInfo,
    domain: { id: domainObj.id, nameVi: domainObj.nameVi, nameEn: domainObj.nameEn },
    provider: providerUsed,
    segmentsProcessed: segments.length,
    appliedTerms: allAppliedTerms.slice(0, 30),
    stats: analyzeTextStats(finalText),
    durationMs: Date.now() - startTs,
    zeroUserDataStorage: true
  };
}
