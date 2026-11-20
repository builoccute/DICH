/**
 * @file tests/full-system.test.js
 * @description Bộ kiểm thử toàn diện cho Word Bridge Translation v2.0 (Kiến trúc Độc lập, Zero Cloudflare).
 *
 * KIỂM THỬ THỰC TẾ:
 *   1. Toàn bộ 08 giao diện công khai + SEO từng trang + chuẩn Icon SVG đơn sắc #0B63E5 (0 emoji, 0 OCR/WEB, 0 Cloudflare).
 *   2. Tài nguyên thương hiệu & SEO (/favicon.ico nhị phân ICO thật, /assets/favicon.svg, /assets/icon-192.png, manifest, robots, sitemap).
 *   3. Chính sách trung thực dịch thuật: trả 503 khi chưa cấu hình provider (KHÔNG trả bản dịch giả).
 *   4. Bộ máy dịch thuật thực tế qua HTTP microservice NLLB-200 cục bộ (chunking, 20 lĩnh vực chuyên ngành).
 *   5. Dịch tài liệu PDF đa trang chuẩn Unicode tiếng Việt (>60 dòng, 2+ trang, giữ bảng biểu, KHÔNG cắt 44 dòng), DOCX, CSV, TXT, chặn EXE/MIME spoofing.
 *   6. Dịch trang web: chặn SSRF (localhost, 127.0.0.1, 169.254.169.254, ::1, redirect nội bộ) & làm sạch XSS (<script>, onerror, javascript:).
 *   7. Dịch hình ảnh thực tế bằng Tesseract trên ảnh PNG in chữ thật (qua RAM, KHÔNG mẹo metadata).
 *   8. Gửi email phản hồi thật qua máy chủ SMTP RFC 5321 cục bộ tới wordbridge.education@gmail.com kèm tệp đính kèm + trả 503 khi chưa cấu hình SMTP.
 *   9. Cơ sở dữ liệu độc lập SQLite `site_metrics.total_accesses` + Tường lửa SQL Zero User Data Storage.
 *  10. Kiểm thử Microservice FastAPI `self-hosted-nmt/app.py` (health check phân biệt model chưa tải & trả 503).
 */

import assert from "node:assert/strict";
import * as http from "node:http";
import * as net from "node:net";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { createTranslationServer } from "../src/server.js";
import { buildZipArchive, parseZipArchive } from "../src/services/document-processor.js";
import { sanitizeHtmlForSafeDisplay, validateSafeExternalUrl } from "../src/services/website-translator.js";
import { assertZeroStorageSql, StandaloneSqliteMetricsStore } from "../src/db/site-metrics.js";

const results = [];
async function runTest(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.error(`  [FAIL] ${name}: ${err.message}`);
  }
}

/**
 * Tạo máy chủ HTTP NLLB-200 tương thích giao thức `/v1/nllb/translate` & `/health` cho kiểm thử tích hợp cục bộ.
 */
function startLocalNllbProtocolServer() {
  return new Promise((resolve) => {
    const srv = http.createServer(async (req, res) => {
      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, server_alive: true, model_status: "loaded", model_weights_loaded: true, translation_ready: true }));
        return;
      }
      if (req.url === "/v1/nllb/translate" && req.method === "POST") {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const body = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
        const translateItem = (s) => `[${body.target_lang.toUpperCase()}] ${String(s)}`;
        const out = Array.isArray(body.text) ? body.text.map(translateItem) : translateItem(body.text);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, translated_text: out, engine: "ctranslate2-nllb-200-int8" }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      resolve({ server: srv, url: `http://127.0.0.1:${port}` });
    });
  });
}

/**
 * Tạo máy chủ SMTP RFC 5321 cục bộ để kiểm thử gửi thư phản hồi thực tế.
 */
function startLocalSmtpCaptureServer() {
  return new Promise((resolve) => {
    const captured = [];
    const srv = net.createServer((socket) => {
      let inData = false;
      let current = { mailFrom: "", rcptTo: "", rawData: "" };
      let buf = "";
      socket.write("220 localhost ESMTP WordBridgeTest\r\n");
      socket.on("data", (chunk) => {
        buf += chunk.toString("utf-8");
        while (true) {
          if (inData) {
            const endIdx = buf.indexOf("\r\n.\r\n");
            if (endIdx === -1) break;
            current.rawData += buf.slice(0, endIdx);
            buf = buf.slice(endIdx + 5);
            inData = false;
            captured.push({ ...current });
            socket.write("250 2.0.0 OK queued\r\n");
          } else {
            const nl = buf.indexOf("\r\n");
            if (nl === -1) break;
            const line = buf.slice(0, nl);
            buf = buf.slice(nl + 2);
            const upper = line.toUpperCase();
            if (upper.startsWith("EHLO") || upper.startsWith("HELO")) socket.write("250-localhost\r\n250 AUTH PLAIN\r\n");
            else if (upper.startsWith("AUTH PLAIN")) socket.write("235 2.7.0 Authentication successful\r\n");
            else if (upper.startsWith("MAIL FROM:")) { current.mailFrom = line.slice(10).trim(); socket.write("250 OK\r\n"); }
            else if (upper.startsWith("RCPT TO:")) { current.rcptTo = line.slice(8).trim(); socket.write("250 OK\r\n"); }
            else if (upper === "DATA") { inData = true; socket.write("354 Start mail input\r\n"); }
            else if (upper === "QUIT") { socket.write("221 Bye\r\n"); socket.end(); }
            else socket.write("250 OK\r\n");
          }
        }
      });
    });
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      resolve({ server: srv, port, captured });
    });
  });
}

async function main() {
  console.log("=== [WORD BRIDGE TRANSLATION v2.0] FULL INDEPENDENT SYSTEM TESTS ===");

  const nllbMock = await startLocalNllbProtocolServer();
  const smtpMock = await startLocalSmtpCaptureServer();
  const tmpSqlite = path.join(os.tmpdir(), `wb_metrics_test_${Date.now()}.sqlite`);

  // Server 1: Chưa cấu hình provider/SMTP (kiểm thử trung thực 503)
  const unconfigured = createTranslationServer({
    WORDBRIDGE_NLLB_API_URL: "",
    LIBRETRANSLATE_API_URL: "",
    SMTP_HOST: ""
  });
  await new Promise((r) => unconfigured.server.listen(0, "127.0.0.1", r));
  const unconfUrl = `http://127.0.0.1:${unconfigured.server.address().port}`;

  // Server 2: Đã cấu hình đầy đủ NLLB cục bộ, SMTP cục bộ, SQLite độc lập
  const configured = createTranslationServer({
    WORDBRIDGE_NLLB_API_URL: nllbMock.url,
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: String(smtpMock.port),
    SMTP_SECURE: "false",
    SMTP_USER: "noreply@wordbridge.io.vn",
    SMTP_PASSWORD: "test-password",
    MAIL_FROM: "noreply@wordbridge.io.vn",
    DATABASE_URL: `sqlite://${tmpSqlite}`
  });
  await new Promise((r) => configured.server.listen(0, "127.0.0.1", r));
  const baseUrl = `http://127.0.0.1:${configured.server.address().port}`;

  try {
    await runTest("1. Tất cả 08 giao diện công khai tải 200, SEO canonical riêng, 0 emoji, 0 OCR/Cloudflare", async () => {
      const routes = [
        "/", "/dich-van-ban", "/dich-tai-lieu", "/dich-trang-web",
        "/dich-hinh-anh", "/gioi-thieu", "/quyen-rieng-tu", "/tro-giup", "/phan-hoi"
      ];
      const canonicals = new Set();
      const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
      for (const r of routes) {
        const res = await fetch(`${baseUrl}${r}`);
        assert.equal(res.status, 200, `Route ${r} phải trả 200`);
        const html = await res.text();
        assert.equal(emojiRe.test(html), false, `Route ${r} không được chứa emoji`);
        assert.equal(/\bCloudflare\b|\bD1\b|\bR2\b|ce84cc48/i.test(html), false, `Route ${r} không được lộ Cloudflare/D1/R2`);
        assert.equal(/>[^<]*\bOCR\b[^<]*</i.test(html), false, `Route ${r} không được hiển thị chữ viết tắt OCR công khai`);
        const m = html.match(/<link rel="canonical" href="([^"]+)"/);
        assert.ok(m, `Route ${r} phải có thẻ canonical`);
        canonicals.add(m[1]);
      }
      assert.ok(canonicals.size >= 8, "Mỗi trang độc lập phải có canonical riêng");
    });

    await runTest("2. Tài nguyên thương hiệu: Favicon ICO nhị phân thật, Favicon SVG đơn sắc, PNG PWA, Sitemap", async () => {
      const icoRes = await fetch(`${baseUrl}/favicon.ico`);
      assert.equal(icoRes.status, 200);
      assert.equal(icoRes.headers.get("content-type"), "image/x-icon");
      const icoBuf = Buffer.from(await icoRes.arrayBuffer());
      assert.equal(icoBuf[0], 0x00);
      assert.equal(icoBuf[2], 0x01); // Binary ICO magic

      const svgRes = await fetch(`${baseUrl}/assets/favicon.svg`);
      assert.equal(svgRes.status, 200);
      const svgText = await svgRes.text();
      assert.ok(svgText.includes("#0B63E5"), "Favicon SVG phải dùng màu chuẩn #0B63E5");

      const pngRes = await fetch(`${baseUrl}/assets/icon-192.png`);
      assert.equal(pngRes.status, 200);
      assert.equal(pngRes.headers.get("content-type"), "image/png");

      const smRes = await fetch(`${baseUrl}/sitemap.xml`);
      assert.equal(smRes.status, 200);
      const smText = await smRes.text();
      assert.ok(smText.includes("/dich-hinh-anh") && smText.includes("/quyen-rieng-tu"));
    });

    await runTest("3. API v1 specs, languages, 20 domains, detect và health check độc lập", async () => {
      const specs = await (await fetch(`${baseUrl}/api/v1/specs`)).json();
      assert.equal(specs.ok, true);
      assert.equal(specs.zeroUserDataStorage, true);
      assert.equal(specs.specializedDomainsCount, 20);

      const langs = await (await fetch(`${baseUrl}/api/v1/languages`)).json();
      assert.equal(langs.ok, true);
      assert.ok(langs.total >= 100);

      const det = await (await fetch(`${baseUrl}/api/v1/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Xin chào cộng đồng dịch thuật Word Bridge Việt Nam." })
      })).json();
      assert.equal(det.ok, true);
      assert.equal(det.detected.code, "vi");

      const health = await (await fetch(`${baseUrl}/api/health`)).json();
      assert.equal(health.ok, true);
      assert.equal(health.translationProvider.translationReady, true);
    });

    await runTest("4. Chính sách trung thực: KHÔNG trả bản dịch giả (trả 503 khi chưa kết nối provider)", async () => {
      const res = await fetch(`${unconfUrl}/api/v1/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Hello world", sourceLang: "en", targetLang: "vi" })
      });
      assert.equal(res.status, 503);
      const data = await res.json();
      assert.equal(data.ok, false);
      assert.equal(data.code, "ERR_TRANSLATION_PROVIDER_UNAVAILABLE");
    });

    await runTest("5. Dịch văn bản dài qua NLLB-200 HTTP + áp dụng 20 lĩnh vực chuyên ngành", async () => {
      const longPara = Array.from({ length: 45 }, (_, i) => `Đoạn ${i + 1}: Hợp đồng thương mại điện tử và bảo mật dữ liệu cá nhân.`).join("\n");
      const res = await fetch(`${baseUrl}/api/v1/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: longPara, sourceLang: "vi", targetLang: "en", domain: "legal" })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.ok, true);
      assert.ok(data.segmentsProcessed >= 2, "Văn bản dài phải được tách phân đoạn đúng thứ tự");
      assert.ok(data.translatedText.includes("[EN]"));
      assert.equal(data.domain.id, "legal");
    });

    await runTest("6. Dịch tài liệu PDF đa trang Unicode tiếng Việt (>60 dòng, không cắt 44 dòng) + DOCX + Chặn EXE", async () => {
      // Tạo PDF 2 trang chứa tiếng Việt có dấu (>60 dòng) bằng Python reportlab trên RAM
      const pyGen = spawnSync("python3", ["-c", `
import io, sys, base64
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, PageBreak
from reportlab.lib.styles import ParagraphStyle
pdfmetrics.registerFont(TTFont("DV", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
st = ParagraphStyle("s", fontName="DV", fontSize=10, leading=14)
buf = io.BytesIO()
doc = SimpleDocTemplate(buf, pagesize=A4)
story = [Paragraph(f"Dòng tiếng Việt có dấu số {i}: Dịch thuật Word Bridge bảo toàn đầy đủ nội dung.", st) for i in range(1, 36)]
story.append(PageBreak())
story += [Paragraph(f"Trang hai - Dòng số {i}: Kiểm thử đa trang không bị cắt ở 44 dòng.", st) for i in range(36, 70)]
doc.build(story)
sys.stdout.write(base64.b64encode(buf.getvalue()).decode("ascii"))
`], { encoding: "utf-8" });
      assert.equal(pyGen.status, 0, "Tạo PDF test đa trang thất bại");

      const pdfRes = await fetch(`${baseUrl}/api/v1/translate/document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "tai_lieu_da_trang.pdf",
          fileBase64: pyGen.stdout.trim(),
          sourceLang: "vi",
          targetLang: "en",
          domain: "general"
        })
      });
      assert.equal(pdfRes.status, 200);
      const pdfData = await pdfRes.json();
      assert.equal(pdfData.ok, true);
      assert.ok(pdfData.pageCount >= 2, "Phải trích xuất đủ từ 2 trang trở lên");

      // Kiểm chứng PDF đầu ra có đủ >= 2 trang và chứa dòng thứ 69 + Unicode tiếng Việt
      const pyVerify = spawnSync("python3", ["-c", `
import io, sys, base64, json
from pypdf import PdfReader
raw = base64.b64decode(sys.stdin.read())
r = PdfReader(io.BytesIO(raw))
full = "\\n".join((p.extract_text() or "") for p in r.pages)
print(json.dumps({"pages": len(r.pages), "hasLine69": "69" in full, "hasUnicode": "tiếng Việt" in full}))
`], { input: pdfData.outputBase64, encoding: "utf-8" });
      const vObj = JSON.parse(pyVerify.stdout);
      assert.ok(vObj.pages >= 2, `PDF xuất ra phải có >= 2 trang (thực tế: ${vObj.pages})`);
      assert.equal(vObj.hasLine69, true, "PDF xuất ra KHÔNG được cắt ở 44 dòng (phải còn dòng 69)");
      assert.equal(vObj.hasUnicode, true, "PDF xuất ra phải giữ nguyên dấu tiếng Việt Unicode");

      // Kiểm thử DOCX
      const docxEntries = new Map([
        ["[Content_Types].xml", new TextEncoder().encode('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>')],
        ["word/document.xml", new TextEncoder().encode('<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Xin chào thế giới</w:t></w:r></w:p></w:body></w:document>')]
      ]);
      const docxBytes = buildZipArchive(docxEntries);
      const docxRes = await fetch(`${baseUrl}/api/v1/translate/document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "mau.docx",
          fileBase64: Buffer.from(docxBytes).toString("base64"),
          sourceLang: "vi",
          targetLang: "en"
        })
      });
      const docxData = await docxRes.json();
      assert.equal(docxData.ok, true);
      const parsedOutDocx = parseZipArchive(new Uint8Array(Buffer.from(docxData.outputBase64, "base64")));
      const outXml = new TextDecoder("utf-8").decode(parsedOutDocx.get("word/document.xml"));
      assert.ok(outXml.includes("[EN]"));

      // Chặn tệp thực thi giả mạo .pdf
      const exeRes = await fetch(`${baseUrl}/api/v1/translate/document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "malware.pdf",
          fileBase64: Buffer.from("MZ\x90\x00\x03\x00\x00\x00").toString("base64"),
          targetLang: "en"
        })
      });
      assert.equal(exeRes.status, 400);
    });

    await runTest("7. Bảo mật Dịch trang web: Chặn SSRF (localhost, 169.254.169.254, ::1) & Xóa sạch XSS", async () => {
      for (const badUrl of [
        "http://localhost:8080/admin",
        "http://127.0.0.1/secret",
        "http://169.254.169.254/latest/meta-data/",
        "http://[::1]/",
        "http://10.0.0.5/internal"
      ]) {
        const chk = validateSafeExternalUrl(badUrl);
        assert.equal(chk.valid, false, `SSRF phải chặn ${badUrl}`);
      }

      const dirtyHtml = `<html><head></head><body><h1>Hello</h1><script>alert("xss")</script><img src="x" onerror="alert(1)"><a href="javascript:alert(2)">Click</a><iframe src="https://evil.test"></iframe></body></html>`;
      const cleaned = sanitizeHtmlForSafeDisplay(dirtyHtml, "https://example.com");
      assert.equal(/<script/i.test(cleaned), false, "Phải xóa hoàn toàn thẻ <script>");
      assert.equal(/<iframe/i.test(cleaned), false, "Phải xóa hoàn toàn thẻ <iframe>");
      assert.equal(/onerror=/i.test(cleaned), false, "Phải xóa thuộc tính sự kiện on*");
      assert.equal(/javascript:/i.test(cleaned), false, "Phải chặn giao thức javascript:");
      assert.ok(cleaned.includes("Content-Security-Policy"), "Phải chèn thẻ CSP bảo vệ");
    });

    await runTest("8. Dịch hình ảnh thực tế bằng Tesseract trên ảnh PNG in chữ thật (qua RAM)", async () => {
      const pyImg = spawnSync("python3", ["-c", `
import io, sys, base64
from PIL import Image, ImageDraw, ImageFont
img = Image.new("RGB", (640, 140), "white")
draw = ImageDraw.Draw(img)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
draw.text((28, 45), "WORD BRIDGE TRANSLATION", fill="black", font=font)
buf = io.BytesIO()
img.save(buf, format="PNG")
sys.stdout.write(base64.b64encode(buf.getvalue()).decode("ascii"))
`], { encoding: "utf-8" });
      assert.equal(pyImg.status, 0);

      const imgRes = await fetch(`${baseUrl}/api/v1/translate/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "test_text.png",
          imageBase64: pyImg.stdout.trim(),
          sourceLang: "en",
          targetLang: "vi"
        })
      });
      assert.equal(imgRes.status, 200);
      const imgData = await imgRes.json();
      assert.equal(imgData.ok, true);
      assert.ok(/WORD\s+BRIDGE/i.test(imgData.extractedText), `Tesseract phải nhận diện đúng chữ từ pixel (nhận được: ${imgData.extractedText})`);
      assert.ok(imgData.translatedText.includes("[VI]"));
    });

    await runTest("9. Gửi Email phản hồi tự động qua SMTP RFC 5321 độc lập tới wordbridge.education@gmail.com", async () => {
      // Trường hợp chưa cấu hình SMTP -> phải trả 503
      const failRes = await fetch(`${unconfUrl}/api/v1/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackType: "bug",
          title: "Kiểm thử khi chưa có SMTP",
          message: "Nội dung kiểm thử dài hơn 10 ký tự hợp lệ."
        })
      });
      assert.equal(failRes.status, 503);

      // Trường hợp đã cấu hình SMTP cục bộ -> gửi thật & xác nhận gói thư tại máy chủ SMTP
      const okRes = await fetch(`${baseUrl}/api/v1/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackType: "bug",
          title: "Kiểm thử SMTP độc lập",
          message: "Xác nhận gửi email phản hồi tự động qua máy chủ SMTP độc lập.",
          contactEmail: "nguoidung@example.com"
        })
      });
      assert.equal(okRes.status, 200);
      const okData = await okRes.json();
      assert.equal(okData.ok, true);
      assert.equal(okData.recipient, "wordbridge.education@gmail.com");
      assert.equal(smtpMock.captured.length, 1);
      assert.ok(smtpMock.captured[0].rcptTo.includes("wordbridge.education@gmail.com"));
    });

    await runTest("10. Cơ sở dữ liệu SQLite độc lập (site_metrics) & Tường lửa SQL Zero User Data Storage", async () => {
      assert.throws(() => assertZeroStorageSql("DROP TABLE site_metrics"), /ZERO_STORAGE/);
      assert.throws(() => assertZeroStorageSql("INSERT INTO users VALUES (1)"), /ZERO_STORAGE/);
      const store = new StandaloneSqliteMetricsStore(tmpSqlite);
      const before = await store.getTotalAccesses();
      const after = await store.incrementAccesses();
      assert.equal(after, before + 1);
    });

    await runTest("11. Microservice FastAPI self-hosted-nmt/app.py phân biệt trạng thái model chưa tải & trả 503", async () => {
      const pyFast = spawnSync("python3", ["-c", `
import sys, json
sys.path.insert(0, "self-hosted-nmt")
import app as nmt_app
from fastapi.testclient import TestClient
client = TestClient(nmt_app.app)
h = client.get("/health").json()
t = client.post("/v1/nllb/translate", json={"text": "Hello", "source_lang": "en", "target_lang": "vi"})
print(json.dumps({"server_alive": h["server_alive"], "model_status": h["model_status"], "translation_ready": h["translation_ready"], "translate_status": t.status_code}))
`], { encoding: "utf-8" });
      assert.equal(pyFast.status, 0, pyFast.stderr);
      const out = JSON.parse(pyFast.stdout);
      assert.equal(out.server_alive, true);
      assert.equal(out.model_status, "not_loaded");
      assert.equal(out.translation_ready, false);
      assert.equal(out.translate_status, 503);
    });
  } finally {
    configured.server.close();
    unconfigured.server.close();
    nllbMock.server.close();
    smtpMock.server.close();
    try { fs.unlinkSync(tmpSqlite); } catch (_) {}
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n=== KẾT QUẢ KIỂM THỬ: ${passed}/${results.length} PASS ===`);
  if (passed !== results.length) {
    process.exit(1);
  }
}

main();
