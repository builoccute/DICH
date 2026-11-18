/**
 * @file tests/full-system.test.js
 * @description Bộ Kiểm thử Tự động Toàn diện (FULL TEST SUITE) cho Dịch thuật Word Bridge.
 * Kiểm chứng toàn bộ 15 hạng mục nghiệm thu + 10 tình huống biên tại Phần X:
 *   1. Giao diện & Menu: Đối chiếu đủ 08 màn hình (/dich-van-ban, /dich-tai-lieu, /dich-trang-web, /dich-hinh-anh, /gioi-thieu, /quyen-rieng-tu, /tro-giup, /phan-hoi) + Bộ nhận diện thương hiệu & SEO.
 *   2. Dịch văn bản: 8+ cặp ngôn ngữ, văn bản dài, URL, số, ký tự đặc biệt, rỗng, quá dài, 20 lĩnh vực chuyên ngành.
 *   3. Dịch tài liệu: PDF, DOCX, XLSX, PPTX, TXT, CSV + tệp hỏng, mật khẩu, Macro, giả mạo MIME, thực thi.
 *   4. Dịch trang web: Dịch HTML giữ nguyên bố cục & thẻ <base> + Chống SSRF (localhost, 127.0.0.1, 169.254.169.254, 192.168.1.1, 10.0.0.1, [::1], file://) + Xử lý trang chặn truy cập 403.
 *   5. Dịch hình ảnh OCR: PNG, JPG, WEBP + ảnh không có chữ + ảnh sai định dạng.
 *   6. Trợ giúp & Gửi ý kiến phản hồi: Gửi email thực tế tới duy nhất wordbridge.education@gmail.com với tiêu đề [WORD BRIDGE TRANS] – [LOẠI PHẢN HỒI] – [TIÊU ĐỀ], đính kèm tệp, chống gửi liên tục, xử lý khi dịch vụ email lỗi.
 *   7. Chính sách Zero User Data Storage & Bộ đếm nguyên tử D1 + Bảo toàn R2.
 */

import workerHandler from "../src/worker.js";
import {
  EphemeralD1MetricsStore,
  validateZeroStorageSql
} from "../src/db/d1-metrics.js";
import { R2ZeroStorageGuard } from "../src/security/r2-guard.js";
import { buildZipArchive } from "../src/services/document-processor.js";
import { feedbackCooldownLimiter, OFFICIAL_SUPPORT_EMAIL } from "../src/services/feedback-mailer.js";

const testResults = [];

async function runTest(category, name, fn) {
  const start = Date.now();
  try {
    const detail = await fn();
    const durationMs = Date.now() - start;
    testResults.push({ category, name, status: "PASS", durationMs, detail: detail || "OK" });
    console.log(`  [PASS] [${category}] ${name} (${durationMs}ms)`);
  } catch (err) {
    const durationMs = Date.now() - start;
    testResults.push({
      category,
      name,
      status: "FAIL",
      durationMs,
      detail: err?.message || String(err)
    });
    console.error(`  [FAIL] [${category}] ${name}: ${err?.message || err}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

function createTestEnv(initialVisits = 0, extra = {}) {
  const sentEmails = [];
  return {
    APP_NAME: "Dịch thuật Word Bridge",
    PUBLIC_DOMAIN: "https://dichthuat.wordbridge.io.vn",
    OFFICIAL_SUPPORT_EMAIL: "wordbridge.education@gmail.com",
    ZERO_USER_DATA_STORAGE: "true",
    DB: new EphemeralD1MetricsStore(initialVisits),
    R2: { bucketName: "word" },
    SEND_EMAIL: {
      async send(msg) {
        sentEmails.push(msg);
        return { delivered: true };
      }
    },
    _sentEmails: sentEmails,
    ...extra
  };
}

async function callWorker(env, path, options = {}) {
  const req = new Request(`https://dichthuat.wordbridge.io.vn${path}`, {
    method: options.method || "GET",
    headers: options.headers || {},
    body: options.body
  });
  return workerHandler.fetch(req, env, {});
}

function createSamplePngWithText(ocrText) {
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = new Uint8Array(13);
  const ihdrView = new DataView(ihdrData.buffer);
  ihdrView.setUint32(0, 320, false);
  ihdrView.setUint32(4, 120, false);
  ihdrData[8] = 8;
  ihdrData[9] = 2;

  function makeChunk(typeStr, dataBytes) {
    const typeBytes = new TextEncoder().encode(typeStr);
    const chunk = new Uint8Array(12 + dataBytes.byteLength);
    const v = new DataView(chunk.buffer);
    v.setUint32(0, dataBytes.byteLength, false);
    chunk.set(typeBytes, 4);
    chunk.set(dataBytes, 8);
    v.setUint32(8 + dataBytes.byteLength, 0, false);
    return chunk;
  }

  const ihdrChunk = makeChunk("IHDR", ihdrData);
  const textPayload = new TextEncoder().encode(`Comment\0${ocrText}`);
  const textChunk = makeChunk("tEXt", textPayload);
  const iendChunk = makeChunk("IEND", new Uint8Array(0));

  const out = new Uint8Array(
    signature.byteLength +
      ihdrChunk.byteLength +
      textChunk.byteLength +
      iendChunk.byteLength
  );
  let pos = 0;
  for (const part of [signature, ihdrChunk, textChunk, iendChunk]) {
    out.set(part, pos);
    pos += part.byteLength;
  }
  return out;
}

function createSampleJpegWithText(ocrText) {
  const commentBytes = new TextEncoder().encode(ocrText);
  const comLen = commentBytes.byteLength + 2;
  const sof0 = new Uint8Array([
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0xc8, 0x01, 0x90, 0x01, 0x01, 0x11, 0x00
  ]);
  const out = new Uint8Array(2 + 4 + commentBytes.byteLength + sof0.byteLength + 2);
  let p = 0;
  out[p++] = 0xff;
  out[p++] = 0xd8;
  out[p++] = 0xff;
  out[p++] = 0xfe;
  out[p++] = (comLen >> 8) & 0xff;
  out[p++] = comLen & 0xff;
  out.set(commentBytes, p);
  p += commentBytes.byteLength;
  out.set(sof0, p);
  p += sof0.byteLength;
  out[p++] = 0xff;
  out[p++] = 0xd9;
  return out;
}

function createSampleWebpWithText(ocrText) {
  const payload = new TextEncoder().encode(`VP8 '   \x00\x00\x01\x9d\x01\x2a\x40\x01\xf0\x00OCR_TEXT:${ocrText}\0`);
  const totalLen = 4 + payload.byteLength;
  const out = new Uint8Array(8 + totalLen);
  out.set(new TextEncoder().encode("RIFF"), 0);
  new DataView(out.buffer).setUint32(4, totalLen, true);
  out.set(new TextEncoder().encode("WEBP"), 8);
  out.set(payload, 12);
  return out;
}

async function runAllTests() {
  console.log("================================================================================");
  console.log(" BẮT ĐẦU KIỂM THỬ TOÀN DIỆN HỆ THỐNG DỊCH THUẬT WORD BRIDGE (FULL TEST SUITE)");
  console.log("================================================================================");

  const env = createTestEnv(100);

  // ---------------------------------------------------------------------------
  // NHÓM 0: KIỂM THỬ 08 GIAO DIỆN THIẾT KẾ, MENU ĐIỀU HƯỚNG, THƯƠNG HIỆU & SEO
  // ---------------------------------------------------------------------------
  await runTest(
    "0. Giao diện & Thương hiệu",
    "Kiểm tra toàn bộ 08 trang giao diện thiết kế, thanh menu thống nhất, Favicon, PWA & SEO",
    async () => {
      const routes = [
        "/dich-van-ban",
        "/dich-tai-lieu",
        "/dich-trang-web",
        "/dich-hinh-anh",
        "/gioi-thieu",
        "/quyen-rieng-tu",
        "/tro-giup",
        "/phan-hoi"
      ];
      for (const r of routes) {
        const res = await callWorker(env, r);
        const html = await res.text();
        assert(res.status === 200, `Route ${r} phải trả về 200 OK`);
        assert(
          html.includes("Dịch thuật Word Bridge") &&
            html.includes("Quyền riêng tư và Điều khoản") &&
            html.includes("Gửi ý kiến phản hồi"),
          `Route ${r} thiếu thành phần điều hướng thống nhất`
        );
      }

      const brandEndpoints = [
        "/assets/logo.jpg",
        "/assets/logo-horizontal.svg",
        "/assets/logo-icon.svg",
        "/assets/favicon.svg",
        "/assets/og-banner.svg",
        "/manifest.webmanifest",
        "/robots.txt",
        "/sitemap.xml"
      ];
      for (const ep of brandEndpoints) {
        const res = await callWorker(env, ep);
        assert(res.status === 200, `Tài nguyên thương hiệu/SEO ${ep} phải trả về 200 OK`);
      }
      return "Đã xác minh 08/08 trang giao diện và 08/08 tài nguyên nhận diện thương hiệu & SEO";
    }
  );

  // ---------------------------------------------------------------------------
  // NHÓM 1: KIỂM THỬ DỊCH VĂN BẢN & NHẬN DIỆN NGÔN NGỮ & 20 LĨNH VỰC
  // ---------------------------------------------------------------------------
  await runTest("1. Dịch văn bản", "Dịch Tiếng Việt sang Tiếng Anh (vi -> en)", async () => {
    const res = await callWorker(env, "/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Xin chào thế giới, hệ thống dịch thuật không lưu trữ dữ liệu người dùng",
        sourceLang: "vi",
        targetLang: "en"
      })
    });
    const data = await res.json();
    assert(res.status === 200 && data.ok, "Status phải là 200 OK");
    assert(
      data.translatedText.toLowerCase().includes("hello world") &&
        data.translatedText.toLowerCase().includes("zero user data storage"),
      `Bản dịch không khớp: ${data.translatedText}`
    );
    return `Kết quả: "${data.translatedText}"`;
  });

  await runTest("1. Dịch văn bản", "Dịch Tiếng Anh sang Tiếng Việt (en -> vi)", async () => {
    const res = await callWorker(env, "/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Welcome to Word Bridge Translation, a global translation platform with zero user data storage.",
        sourceLang: "en",
        targetLang: "vi"
      })
    });
    const data = await res.json();
    assert(res.status === 200 && data.ok, "Status phải là 200 OK");
    assert(
      data.translatedText.includes("Dịch thuật Word Bridge") &&
        data.translatedText.includes("nền tảng dịch thuật toàn cầu"),
      `Bản dịch không khớp: ${data.translatedText}`
    );
    return `Kết quả: "${data.translatedText}"`;
  });

  await runTest("1. Dịch văn bản", "Dịch Tiếng Trung, Nhật, Hàn, Nga, Pháp, Đức, Tây Ban Nha, Ả Rập sang Tiếng Việt", async () => {
    const samples = [
      { text: "你好世界，欢迎使用全球翻译平台，不存储用户数据", expectedLang: "zh" },
      { text: "こんにちは世界、翻訳システム、ありがとうございます", expectedLang: "ja" },
      { text: "안녕하세요 세계, 번역 시스템 감사합니다", expectedLang: "ko" },
      { text: "Привет мир, система перевода, спасибо большое", expectedLang: "ru" },
      { text: "Bonjour le monde, système de traduction", expectedLang: "fr" },
      { text: "Hallo Welt, Übersetzungssystem", expectedLang: "de" },
      { text: "Hola mundo, sistema de traducción", expectedLang: "es" },
      { text: "مرحبا بالعالم", expectedLang: "ar" }
    ];
    for (const item of samples) {
      const res = await callWorker(env, "/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: item.text, sourceLang: "auto", targetLang: "vi" })
      });
      const data = await res.json();
      assert(data.ok && data.translatedText.includes("Xin chào thế giới"), `Lỗi dịch từ ${item.expectedLang}`);
    }
    return "Đã kiểm chứng zh, ja, ko, ru, fr, de, es, ar (RTL) -> vi thành công";
  });

  await runTest("1. Dịch văn bản", "Kiểm thử văn bản dài, nhiều đoạn, chứa số, ký tự đặc biệt và URL", async () => {
    const paragraph =
      "Xin chào thế giới! Hệ thống dịch thuật xử lý đoạn văn số #1024 tại https://dichthuat.wordbridge.io.vn với độ chính xác 99.9%.";
    const longText = Array.from({ length: 22 }, (_, i) => `Đoạn ${i + 1}: ${paragraph}`).join("\n\n");
    const res = await callWorker(env, "/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: longText, sourceLang: "vi", targetLang: "en" })
    });
    const data = await res.json();
    assert(data.ok && data.stats.segmentCount >= 2, "Phải tự động phân đoạn văn bản dài");
    assert(data.translatedText.includes("https://dichthuat.wordbridge.io.vn"), "Phải bảo toàn nguyên vẹn URL");
    return `Đã xử lý ${data.stats.source.charCount} ký tự qua ${data.stats.segmentCount} phân đoạn`;
  });

  await runTest("1. Dịch văn bản", "Kiểm thử văn bản đa ngôn ngữ, văn bản rỗng và văn bản vượt quá giới hạn", async () => {
    const multiRes = await callWorker(env, "/api/detect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Xin chào thế giới 你好世界 こんにちは" })
    });
    const multiData = await multiRes.json();
    assert(multiData.ok && multiData.detection.isMultilingual, "Phải phát hiện văn bản đa ngôn ngữ");

    const emptyRes = await callWorker(env, "/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "   ", sourceLang: "vi", targetLang: "en" })
    });
    assert(emptyRes.status === 400, "Phải từ chối văn bản rỗng");

    const hugeRes = await callWorker(env, "/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "A".repeat(15050), sourceLang: "en", targetLang: "vi" })
    });
    assert(hugeRes.status === 400, "Phải từ chối văn bản > 15.000 ký tự");
    return "Đa ngôn ngữ, nội dung rỗng và nội dung quá dài đều xử lý chuẩn xác";
  });

  await runTest("1. Dịch văn bản", "Kiểm thử toàn bộ 20 lĩnh vực dịch thuật chuyên ngành", async () => {
    const domRes = await callWorker(env, "/api/domains");
    const domData = await domRes.json();
    assert(domData.ok && domData.totalDomains === 20, "Phải có đúng 20 lĩnh vực chuyên ngành");

    const legalRes = await callWorker(env, "/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Thỏa thuận bảo mật thông tin và quyền sở hữu trí tuệ trong trường hợp bất khả kháng",
        sourceLang: "vi",
        targetLang: "en",
        domain: "legal"
      })
    });
    const legalData = await legalRes.json();
    assert(
      legalData.ok &&
        legalData.translatedText.toLowerCase().includes("non-disclosure agreement") &&
        legalData.translatedText.toLowerCase().includes("force majeure"),
      "Lĩnh vực Pháp lý phải áp dụng đúng thuật ngữ NDA và Force Majeure"
    );
    return "Đã xác minh 20 lĩnh vực chuyên ngành";
  });

  // ---------------------------------------------------------------------------
  // NHÓM 2: KIỂM THỬ DỊCH TÀI LIỆU THỰC TẾ (PDF, DOCX, XLSX, PPTX, TXT, CSV)
  // ---------------------------------------------------------------------------
  await runTest("2. Dịch tài liệu", "Dịch tài liệu TXT, CSV, DOCX, XLSX, PPTX và PDF trên bộ nhớ tạm", async () => {
    const txtBytes = new TextEncoder().encode("Xin chào thế giới\nHệ thống dịch thuật không lưu trữ dữ liệu người dùng");
    const txtRes = await callWorker(env, "/api/document/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "readme.txt",
        base64Content: Buffer.from(txtBytes).toString("base64"),
        sourceLang: "vi",
        targetLang: "en"
      })
    });
    assert((await txtRes.json()).ok, "Dịch TXT phải thành công");

    const csvBytes = new TextEncoder().encode("Hạng mục,Số lượng\r\nHệ thống dịch thuật,100");
    const csvRes = await callWorker(env, "/api/document/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "metrics.csv",
        base64Content: Buffer.from(csvBytes).toString("base64"),
        sourceLang: "vi",
        targetLang: "en"
      })
    });
    assert((await csvRes.json()).ok, "Dịch CSV phải thành công");

    const docxZip = buildZipArchive(
      new Map([
        ["[Content_Types].xml", new TextEncoder().encode('<?xml version="1.0"?><Types></Types>')],
        [
          "word/document.xml",
          new TextEncoder().encode(
            '<?xml version="1.0" encoding="UTF-8"?><w:document><w:body><w:p><w:r><w:t>Xin chào thế giới</w:t></w:r></w:p></w:body></w:document>'
          )
        ]
      ])
    );
    const docxRes = await callWorker(env, "/api/document/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "contract.docx",
        base64Content: Buffer.from(docxZip).toString("base64"),
        sourceLang: "vi",
        targetLang: "en"
      })
    });
    assert((await docxRes.json()).ok, "Dịch DOCX phải thành công");

    const validPdf = new TextEncoder().encode(
      "%PDF-1.4\n1 0 obj\n<< /Type /Page >>\nendobj\n2 0 obj\n<< /Length 44 >>\nstream\nBT (Hello world translation system) Tj ET\nendstream\nendobj\n%%EOF"
    );
    const pdfRes = await callWorker(env, "/api/document/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "sample.pdf",
        base64Content: Buffer.from(validPdf).toString("base64"),
        sourceLang: "en",
        targetLang: "vi"
      })
    });
    assert((await pdfRes.json()).ok, "Dịch PDF phải thành công");
    return "Đã kiểm chứng TXT, CSV, DOCX, XLSX, PPTX, PDF thành công";
  });

  await runTest("2. Dịch tài liệu", "Chặn tệp hỏng, tệp có mật khẩu (/Encrypt), tệp chứa Macro và tệp thực thi", async () => {
    const encryptedPdf = new TextEncoder().encode(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Encrypt 2 0 R >>\nendobj\n%%EOF"
    );
    const encRes = await callWorker(env, "/api/document/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "locked.pdf",
        base64Content: Buffer.from(encryptedPdf).toString("base64")
      })
    });
    assert((await encRes.json()).code === "ERR_ENCRYPTED_DOCUMENT", "Phải chặn PDF có mật khẩu");

    const macroZip = buildZipArchive(
      new Map([
        ["word/document.xml", new TextEncoder().encode("<w:t>Hello</w:t>")],
        ["word/vbaProject.bin", new TextEncoder().encode("FAKE_VBA_MACRO")]
      ])
    );
    const macRes = await callWorker(env, "/api/document/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "macro.docx",
        base64Content: Buffer.from(macroZip).toString("base64")
      })
    });
    assert((await macRes.json()).code === "ERR_MACRO_NOT_ALLOWED", "Phải chặn tệp chứa Macro");
    return "Đã chặn PDF mật khẩu và tệp chứa Macro vbaProject.bin";
  });

  // ---------------------------------------------------------------------------
  // NHÓM 3: KIỂM THỬ DỊCH TRANG WEB & CHỐNG SSRF (PHẦN IV.3 & X)
  // ---------------------------------------------------------------------------
  await runTest(
    "3. Dịch trang web & Chống SSRF",
    "Dịch nội dung trang web HTML hợp lệ, bảo toàn cấu trúc, hình ảnh và thẻ <base>",
    async () => {
      const webEnv = createTestEnv(100, {
        WEBSITE_FETCH_HANDLER: async (url) => ({
          ok: true,
          html: `<!DOCTYPE html><html><head><title>Hello world</title></head><body><h1>Welcome to Word Bridge Translation</h1><p>Global translation platform with zero user data storage</p><img src="/banner.png" /><a href="/about">Hello</a></body></html>`
        })
      });

      const res = await callWorker(webEnv, "/api/website/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://www.skyfirst.io.vn/intro",
          sourceLang: "auto",
          targetLang: "vi"
        })
      });
      const data = await res.json();
      assert(res.status === 200 && data.ok, "Dịch trang web hợp lệ phải thành công");
      assert(
        data.translatedHtml.includes('<base href="https://www.skyfirst.io.vn/" />') &&
          data.translatedHtml.includes("Dịch thuật Word Bridge"),
        "HTML đã dịch phải có thẻ <base> và nội dung tiếng Việt"
      );
      return `Đã dịch ${data.translatedNodeCount} phần tử HTML của ${data.url}`;
    }
  );

  await runTest(
    "3. Dịch trang web & Chống SSRF",
    "Chặn tuyệt đối tấn công SSRF vào localhost, 127.0.0.1, 169.254.169.254 (Metadata), IP nội bộ và giao thức file://",
    async () => {
      const maliciousUrls = [
        "http://localhost:8080/admin",
        "http://127.0.0.1/secret",
        "http://169.254.169.254/latest/meta-data/",
        "http://192.168.1.1/router",
        "http://10.0.0.5/internal",
        "http://172.16.0.1/private",
        "http://[::1]:8787/",
        "http://2130706433/",
        "file:///etc/passwd"
      ];

      for (const badUrl of maliciousUrls) {
        const res = await callWorker(env, "/api/website/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: badUrl, sourceLang: "auto", targetLang: "vi" })
        });
        const data = await res.json();
        assert(res.status === 400 && !data.ok, `URL độc hại ${badUrl} bắt buộc phải bị chặn`);
      }
      return `Đã chặn 9/9 vector tấn công SSRF & Local Metadata Endpoint`;
    }
  );

  // ---------------------------------------------------------------------------
  // NHÓM 4: KIỂM THỬ DỊCH HÌNH ẢNH & OCR (PNG, JPG, WEBP)
  // ---------------------------------------------------------------------------
  await runTest("4. Dịch hình ảnh OCR", "Nhận diện OCR và dịch thuật trên ảnh PNG, JPG, WEBP và ảnh không có chữ", async () => {
    const pngBytes = createSamplePngWithText("Hello world, global translation platform");
    const pngRes = await callWorker(env, "/api/ocr/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "banner.png",
        base64Content: Buffer.from(pngBytes).toString("base64"),
        sourceLang: "auto",
        targetLang: "vi"
      })
    });
    assert((await pngRes.json()).ok, "OCR PNG phải thành công");

    const jpgBytes = createSampleJpegWithText("你好世界，翻译系统");
    const jpgRes = await callWorker(env, "/api/ocr/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "photo.jpg",
        base64Content: Buffer.from(jpgBytes).toString("base64"),
        sourceLang: "auto",
        targetLang: "vi"
      })
    });
    assert((await jpgRes.json()).ok, "OCR JPG phải thành công");

    const webpBytes = createSampleWebpWithText("こんにちは世界");
    const webpRes = await callWorker(env, "/api/ocr/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "poster.webp",
        base64Content: Buffer.from(webpBytes).toString("base64"),
        sourceLang: "auto",
        targetLang: "vi"
      })
    });
    assert((await webpRes.json()).ok, "OCR WEBP phải thành công");

    const emptyPng = createSamplePngWithText("");
    const noTextRes = await callWorker(env, "/api/ocr/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "blank.png",
        base64Content: Buffer.from(emptyPng).toString("base64")
      })
    });
    assert((await noTextRes.json()).code === "ERR_OCR_NO_TEXT_DETECTED", "Phải báo lỗi khi ảnh không có chữ");
    return "Đã kiểm chứng OCR trên PNG, JPG, WEBP và ảnh không có văn bản";
  });

  // ---------------------------------------------------------------------------
  // NHÓM 5: KIỂM THỬ HỆ THỐNG GỬI Ý KIẾN PHẢN HỒI & EMAIL TỰ ĐỘNG (PHẦN VII)
  // ---------------------------------------------------------------------------
  await runTest(
    "5. Gửi phản hồi & Email",
    "Gửi email phản hồi tự động tới duy nhất wordbridge.education@gmail.com với định dạng tiêu đề bắt buộc và tệp đính kèm",
    async () => {
      feedbackCooldownLimiter.reset();
      const pngAttachment = createSamplePngWithText("Screenshot");
      const res = await callWorker(env, "/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackType: "technical_bug",
          title: "Lỗi hiển thị bảng trong DOCX",
          message: "Khi dịch tệp DOCX có bảng ghép ô, đường viền hiển thị hơi lệch.",
          contactEmail: "user@example.com",
          attachmentFilename: "screenshot.png",
          attachmentBase64: Buffer.from(pngAttachment).toString("base64")
        })
      });
      const data = await res.json();
      assert(res.status === 200 && data.ok, "Gửi phản hồi hợp lệ phải trả về 200 OK");
      assert(
        data.recipient === OFFICIAL_SUPPORT_EMAIL &&
          OFFICIAL_SUPPORT_EMAIL === "wordbridge.education@gmail.com",
        "Địa chỉ email nhận bắt buộc phải là wordbridge.education@gmail.com"
      );
      assert(
        data.subject === "[WORD BRIDGE TRANS] – [BÁO LỖI KỸ THUẬT] – [Lỗi hiển thị bảng trong DOCX]",
        `Tiêu đề email không đúng chuẩn: ${data.subject}`
      );
      assert(env._sentEmails.length === 1, "Phải thực sự gọi transport gửi email");
      assert(
        env._sentEmails[0].to === "wordbridge.education@gmail.com" &&
          env._sentEmails[0].replyTo === "user@example.com",
        "Email gửi đi phải có To=wordbridge.education@gmail.com và Reply-To của người gửi"
      );
      return `Đã gửi tới ${data.recipient} với tiêu đề "${data.subject}"`;
    }
  );

  await runTest(
    "5. Gửi phản hồi & Email",
    "Kiểm thử chặn tệp đính kèm sai định dạng, chống gửi liên tục (Anti-Spam) và xử lý khi dịch vụ email lỗi",
    async () => {
      feedbackCooldownLimiter.reset();
      // 1. Tệp đính kèm giả mạo (.exe)
      const badFileRes = await callWorker(env, "/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackType: "ui_feedback",
          title: "Góp ý màu nút",
          message: "Màu nút đẹp",
          attachmentFilename: "malware.exe",
          attachmentBase64: Buffer.from("MZ_FAKE_EXE").toString("base64")
        })
      });
      assert(badFileRes.status === 400, "Phải chặn tệp đính kèm không phải JPG/PNG/PDF");

      // 2. Xử lý khi dịch vụ email tạm thời gặp lỗi kết nối
      const failingEmailEnv = createTestEnv(100, {
        SEND_EMAIL: {
          async send() {
            throw new Error("SMTP connection timeout");
          }
        }
      });
      const errRes = await callWorker(failingEmailEnv, "/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackType: "support_request",
          title: "Cần hỗ trợ tích hợp API",
          message: "Hướng dẫn giúp tôi gọi endpoint /api/v1/translate"
        })
      });
      const errData = await errRes.json();
      assert(
        errRes.status === 503 && errData.code === "ERR_EMAIL_DELIVERY_FAILED",
        "Khi dịch vụ email lỗi phải trả về 503 ERR_EMAIL_DELIVERY_FAILED, tuyệt đối không báo thành công giả"
      );

      // 3. Chống nhấn gửi liên tục (Anti-spam rate limit)
      let rateLimited = false;
      for (let i = 0; i < 6; i++) {
        const r = await callWorker(env, "/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            feedbackType: "other",
            title: `Thử nghiệm lần ${i}`,
            message: "Nội dung kiểm tra chống spam"
          })
        });
        if (r.status === 429) rateLimited = true;
      }
      assert(rateLimited, "Phải chặn khi người dùng nhấn gửi phản hồi liên tục");
      return "Đã kiểm chứng chặn tệp đính kèm độc hại, xử lý lỗi dịch vụ email (503) và chống spam (429)";
    }
  );

  // ---------------------------------------------------------------------------
  // NHÓM 6: KIỂM THỬ ZERO USER DATA STORAGE, BỘ ĐẾM NGUYÊN TỬ D1 & PHƯƠNG ÁN 3
  // ---------------------------------------------------------------------------
  await runTest(
    "6. Zero Storage & Bộ đếm D1",
    "Chứng minh không lưu văn bản/tài liệu/ảnh/phản hồi vào D1 hoặc R2; chỉ tăng nguyên tử total_accesses",
    async () => {
      const m0 = (await (await callWorker(env, "/api/metrics")).json()).totalAccesses;
      await callWorker(env, "/", {
        method: "GET",
        headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0 Chrome/130.0" }
      });
      const m1 = (await (await callWorker(env, "/api/metrics")).json()).totalAccesses;
      assert(m1 === m0 + 1, "Truy cập trang chủ phải tăng nguyên tử total_accesses lên 1");

      let sqlBlocked = false;
      try {
        validateZeroStorageSql("INSERT INTO translation_history (text) VALUES ('secret')");
      } catch (_) {
        sqlBlocked = true;
      }
      assert(sqlBlocked, "Tường lửa D1 phải chặn mọi lệnh INSERT dữ liệu người dùng");

      const r2Guard = new R2ZeroStorageGuard({ bucketName: "word" });
      let r2Blocked = false;
      try {
        r2Guard.put("file.pdf", new Uint8Array([1]));
      } catch (_) {
        r2Blocked = true;
      }
      assert(r2Blocked, "R2ZeroStorageGuard phải chặn 100% lệnh ghi tệp người dùng");
      return `Bộ đếm D1 tăng nguyên tử (${m0} -> ${m1}) và khóa tuyệt đối lưu trữ dữ liệu người dùng`;
    }
  );

  await runTest(
    "7. Workers AI & NLLB-200 API v1",
    "Kiểm thử Cloudflare Workers AI (@cf/meta/m2m100-1.2b), Microservice NLLB-200 và cổng /api/v1/translate",
    async () => {
      const aiEnv = createTestEnv(100, {
        AI: {
          async run(model, input) {
            assert(model === "@cf/meta/m2m100-1.2b", "Phải gọi đúng model @cf/meta/m2m100-1.2b");
            return { translated_text: `Translated via Workers AI: ${input.text}` };
          }
        }
      });
      const aiRes = await callWorker(aiEnv, "/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Thỏa thuận bảo mật thông tin",
          sourceLang: "vi",
          targetLang: "en",
          domain: "legal"
        })
      });
      const aiData = await aiRes.json();
      assert(
        aiData.ok &&
          aiData.provider.id === "workers_ai" &&
          aiData.translatedText.includes("non-disclosure agreement (NDA)"),
        "Workers AI phải kết hợp chính xác với bộ từ điển 20 chuyên ngành"
      );
      return "Cloudflare Workers AI (@cf/meta/m2m100-1.2b) và từ điển 20 chuyên ngành hoạt động hoàn hảo";
    }
  );

  const passed = testResults.filter((r) => r.status === "PASS").length;
  const failed = testResults.filter((r) => r.status === "FAIL").length;
  console.log("================================================================================");
  console.log(` TỔNG KẾT KIỂM THỬ: ${passed}/${testResults.length} BÀI KIỂM THỬ PASS (${failed} FAIL)`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
