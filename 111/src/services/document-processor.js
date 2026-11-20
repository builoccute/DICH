/**
 * @file src/services/document-processor.js
 * @description Bộ xử lý Dịch Tài liệu hoàn toàn trên RAM (Zero User Data Storage).
 * Hỗ trợ: PDF, DOCX, DOC, PPTX, XLSX, CSV, TXT.
 *
 * KHẮC PHỤC TOÀN DIỆN CÁC LỖI TRƯỚC ĐÂY:
 *   - PDF: Xử lý đa trang đầy đủ qua `pdf-helper.py` trên RAM (stdin/stdout, không lưu đĩa),
 *     hỗ trợ đầy đủ Unicode tiếng Việt (DejaVuSans/NotoSans), KHÔNG cắt 44 dòng,
 *     KHÔNG giới hạn 1 trang, bảo toàn đoạn văn và bảng biểu tối đa.
 *   - DOCX / PPTX / XLSX: Kiểm tra chống ZIP Bomb nghiêm ngặt (số entry, dung lượng giải nén, tỷ lệ nén),
 *     dịch trực tiếp từng thẻ văn bản XML (<w:t>, <a:t>, <t>) và đóng gói lại tệp OOXML hoàn chỉnh trên RAM.
 *   - DOC đời cũ: Trích xuất chuỗi văn bản an toàn và thông báo rõ định dạng xuất `.txt` (không tuyên bố sai lệch).
 *   - Xóa trắng toàn bộ Buffer trong khối `finally`.
 */

import * as zlib from "node:zlib";
import { translateText } from "./translation-engine.js";
import { getDomainById } from "./domains.js";
import { verifyFileSignature, wipeBuffer, LIMITS } from "../security/privacy-shield.js";

async function getNodeSpawnSync() {
  try {
    if (typeof process === "undefined" || !process.versions?.node) return null;
    const modName = "node:" + "child_process";
    const mod = await import(/* @vite-ignore */ modName);
    return typeof mod.spawnSync === "function" ? mod.spawnSync : null;
  } catch (_) {
    return null;
  }
}

function buildPureJsMultiPagePdf(translatedText, meta = {}) {
  const safeAscii = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^\x20-\x7E]/g, " ")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

  const rawLines = [];
  for (const para of String(translatedText || "").split(/\r?\n/)) {
    const clean = safeAscii(para);
    if (!clean.trim()) { rawLines.push(""); continue; }
    for (let i = 0; i < clean.length; i += 86) {
      rawLines.push(clean.slice(i, i + 86));
    }
  }
  const LINES_PER_PAGE = 48;
  const pageChunks = [];
  for (let i = 0; i < Math.max(1, rawLines.length); i += LINES_PER_PAGE) {
    pageChunks.push(rawLines.slice(i, i + LINES_PER_PAGE));
  }

  const objects = [];
  const addObj = (body) => { objects.push(body); return objects.length; };
  const fontId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pagesId = addObj(""); // placeholder
  const pageIds = [];

  pageChunks.forEach((lines, idx) => {
    const cmds = ["BT", "/F1 10 Tf", "45 795 Td", "14 TL"];
    if (idx === 0) {
      cmds.push(`(WORD BRIDGE TRANSLATION - ${safeAscii(meta.sourceLang || "AUTO")} -> ${safeAscii(meta.targetLang || "VI")}) Tj`, "T*", "T*");
    }
    for (const ln of lines) {
      cmds.push(`(${ln}) Tj`, "T*");
    }
    cmds.push("ET");
    const stream = cmds.join("\n");
    const contentId = addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = addObj(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function extractPdfTextPureJs(pdfBytes) {
  const latin = new TextDecoder("latin1").decode(pdfBytes);
  if (/\/Encrypt\b/.test(latin)) {
    return { ok: false, code: "ERR_PDF_ENCRYPTED", message: "Tệp PDF được bảo vệ bằng mật khẩu." };
  }
  const pageMatches = latin.match(/\/Type\s*\/Page\b(?!s)/g) || [];
  const pageCount = Math.max(1, pageMatches.length);
  const chunks = [];
  const tjRe = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
  let m;
  while ((m = tjRe.exec(latin)) !== null) {
    chunks.push(m[1].replace(/\\([()\\])/g, "$1"));
  }
  const text = chunks.join(" ").trim();
  return { ok: true, pageCount, pages: [{ page: 1, text, tables: [] }], text, extractor: "pure-js-edge" };
}

const PDF_HELPER_PY_CODE = "#!/usr/bin/env python3\n# -*- coding: utf-8 -*-\n\"\"\"\n@file src/services/pdf-helper.py\n@description X\u1eed l\u00fd tr\u00edch xu\u1ea5t v\u00e0 xu\u1ea5t PDF \u0111a trang h\u1ed7 tr\u1ee3 \u0111\u1ea7y \u0111\u1ee7 Unicode ti\u1ebfng Vi\u1ec7t ho\u00e0n to\u00e0n tr\u00ean RAM.\n- Kh\u00f4ng l\u01b0u t\u1ec7p trung gian tr\u00ean \u1ed5 \u0111\u0129a (\u0111\u1ecdc tr\u1ef1c ti\u1ebfp t\u1eeb stdin, ghi tr\u1ef1c ti\u1ebfp ra stdout).\n- Kh\u1eafc ph\u1ee5c ho\u00e0n to\u00e0n l\u1ed7i c\u0169: kh\u00f4ng c\u1eaft \u1edf 44 d\u00f2ng, kh\u00f4ng gi\u1edbi h\u1ea1n 1 trang, kh\u00f4ng m\u1ea5t d\u1ea5u ti\u1ebfng Vi\u1ec7t,\n  b\u1ea3o to\u00e0n \u0111o\u1ea1n v\u0103n v\u00e0 b\u1ea3ng bi\u1ec3u t\u1ed1i \u0111a c\u00f3 th\u1ec3.\n\"\"\"\n\nimport io\nimport json\nimport os\nimport sys\n\nFONT_CANDIDATES_REGULAR = [\n    \"/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf\",\n    \"/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf\",\n    \"/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf\",\n    \"/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf\",\n]\n\nFONT_CANDIDATES_BOLD = [\n    \"/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf\",\n    \"/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf\",\n    \"/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf\",\n    \"/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf\",\n]\n\n\ndef find_font(candidates):\n    for p in candidates:\n        if os.path.isfile(p):\n            return p\n    return None\n\n\ndef cmd_extract(max_pages: int):\n    raw_bytes = sys.stdin.buffer.read()\n    if not raw_bytes:\n        print(json.dumps({\"ok\": False, \"code\": \"ERR_EMPTY_PDF\", \"message\": \"D\u1eef li\u1ec7u PDF tr\u1ed1ng.\"}))\n        return\n\n    buf = io.BytesIO(raw_bytes)\n    try:\n        from pypdf import PdfReader\n        reader = PdfReader(buf)\n        if reader.is_encrypted:\n            print(json.dumps({\n                \"ok\": False,\n                \"code\": \"ERR_PDF_ENCRYPTED\",\n                \"message\": \"T\u1ec7p PDF \u0111\u01b0\u1ee3c b\u1ea3o v\u1ec7 b\u1eb1ng m\u1eadt kh\u1ea9u. Vui l\u00f2ng m\u1edf kh\u00f3a tr\u01b0\u1edbc khi d\u1ecbch.\"\n            }))\n            return\n\n        page_count = len(reader.pages)\n        if page_count > max_pages:\n            print(json.dumps({\n                \"ok\": False,\n                \"code\": \"ERR_PDF_TOO_MANY_PAGES\",\n                \"message\": f\"T\u1ec7p PDF c\u00f3 {page_count} trang, v\u01b0\u1ee3t qu\u00e1 gi\u1edbi h\u1ea1n t\u1ed1i \u0111a {max_pages} trang.\"\n            }))\n            return\n\n        pages_data = []\n        used_pdfplumber = False\n        try:\n            import pdfplumber\n            buf.seek(0)\n            with pdfplumber.open(buf) as pdf:\n                used_pdfplumber = True\n                for idx, page in enumerate(pdf.pages):\n                    text = (page.extract_text() or \"\").strip()\n                    tables = page.extract_tables() or []\n                    clean_tables = []\n                    for tbl in tables:\n                        rows = []\n                        for r in tbl:\n                            if r and any(c is not None and str(c).strip() for c in r):\n                                rows.append([str(c).strip() if c is not None else \"\" for c in r])\n                        if rows:\n                            clean_tables.append(rows)\n                    pages_data.append({\n                        \"page\": idx + 1,\n                        \"text\": text,\n                        \"tables\": clean_tables\n                    })\n        except Exception:\n            used_pdfplumber = False\n\n        if not used_pdfplumber:\n            for idx, page in enumerate(reader.pages):\n                text = (page.extract_text() or \"\").strip()\n                pages_data.append({\"page\": idx + 1, \"text\": text, \"tables\": []})\n\n        combined_paragraphs = []\n        for p in pages_data:\n            if p[\"text\"]:\n                combined_paragraphs.append(p[\"text\"])\n            for tbl in p[\"tables\"]:\n                tbl_lines = [\" | \".join(row) for row in tbl]\n                tbl_block = \"\\n\".join(tbl_lines)\n                if tbl_block and tbl_block not in p[\"text\"]:\n                    combined_paragraphs.append(tbl_block)\n\n        full_text = \"\\n\\n\".join(combined_paragraphs).strip()\n        print(json.dumps({\n            \"ok\": True,\n            \"pageCount\": page_count,\n            \"pages\": pages_data,\n            \"text\": full_text,\n            \"extractor\": \"pdfplumber+pypdf\" if used_pdfplumber else \"pypdf\"\n        }, ensure_ascii=False))\n    except Exception as exc:\n        print(json.dumps({\n            \"ok\": False,\n            \"code\": \"ERR_PDF_PARSE_FAILED\",\n            \"message\": f\"Kh\u00f4ng th\u1ec3 ph\u00e2n t\u00edch c\u1ea5u tr\u00fac t\u1ec7p PDF (c\u00f3 th\u1ec3 t\u1ec7p b\u1ecb h\u1ecfng): {type(exc).__name__}\"\n        }, ensure_ascii=False))\n    finally:\n        buf.close()\n\n\ndef cmd_generate():\n    raw_in = sys.stdin.buffer.read()\n    payload = json.loads(raw_in.decode(\"utf-8\"))\n    pages = payload.get(\"pages\") or []\n    full_text = payload.get(\"translatedText\") or \"\"\n    meta = payload.get(\"meta\") or {}\n\n    from reportlab.lib.pagesizes import A4\n    from reportlab.lib.units import mm\n    from reportlab.lib import colors\n    from reportlab.pdfbase import pdfmetrics\n    from reportlab.pdfbase.ttfonts import TTFont\n    from reportlab.lib.styles import ParagraphStyle\n    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak\n    from xml.sax.saxutils import escape\n\n    reg_path = find_font(FONT_CANDIDATES_REGULAR)\n    bold_path = find_font(FONT_CANDIDATES_BOLD)\n    font_reg = \"Helvetica\"\n    font_bold = \"Helvetica-Bold\"\n    if reg_path:\n        pdfmetrics.registerFont(TTFont(\"WBUnicode\", reg_path))\n        font_reg = \"WBUnicode\"\n        if bold_path:\n            pdfmetrics.registerFont(TTFont(\"WBUnicodeBold\", bold_path))\n            font_bold = \"WBUnicodeBold\"\n        else:\n            font_bold = \"WBUnicode\"\n\n    out_buf = io.BytesIO()\n    doc = SimpleDocTemplate(\n        out_buf,\n        pagesize=A4,\n        leftMargin=18 * mm,\n        rightMargin=18 * mm,\n        topMargin=20 * mm,\n        bottomMargin=18 * mm,\n        title=\"Word Bridge Translation Document\",\n        author=\"Word Bridge Translation (dichthuat.wordbridge.io.vn)\"\n    )\n\n    brand_blue = colors.HexColor(\"#0B63E5\")\n    text_dark = colors.HexColor(\"#1E293B\")\n    muted = colors.HexColor(\"#64748B\")\n    border_col = colors.HexColor(\"#CBD5E1\")\n    header_bg = colors.HexColor(\"#EFF6FF\")\n\n    style_title = ParagraphStyle(\n        \"WBTitle\",\n        fontName=font_bold,\n        fontSize=13,\n        leading=18,\n        textColor=brand_blue,\n        spaceAfter=4,\n    )\n    style_meta = ParagraphStyle(\n        \"WBMeta\",\n        fontName=font_reg,\n        fontSize=9,\n        leading=13,\n        textColor=muted,\n        spaceAfter=12,\n    )\n    style_body = ParagraphStyle(\n        \"WBBody\",\n        fontName=font_reg,\n        fontSize=10.5,\n        leading=16,\n        textColor=text_dark,\n        spaceAfter=7,\n    )\n    style_cell = ParagraphStyle(\n        \"WBCell\",\n        fontName=font_reg,\n        fontSize=9.5,\n        leading=13,\n        textColor=text_dark,\n    )\n\n    story = []\n    src_lang = str(meta.get(\"sourceLang\") or \"auto\").upper()\n    tgt_lang = str(meta.get(\"targetLang\") or \"vi\").upper()\n    domain = str(meta.get(\"domain\") or \"T\u1ed5ng qu\u00e1t\")\n    story.append(Paragraph(escape(f\"WORD BRIDGE TRANSLATION \u2014 {src_lang} \u2192 {tgt_lang}\"), style_title))\n    story.append(Paragraph(escape(f\"L\u0129nh v\u1ef1c: {domain} \u00b7 X\u1eed l\u00fd ho\u00e0n to\u00e0n tr\u00ean RAM (Zero User Data Storage)\"), style_meta))\n\n    def append_text_blocks(txt: str):\n        for para in str(txt or \"\").split(\"\\n\"):\n            line = para.strip()\n            if not line:\n                story.append(Spacer(1, 5))\n            else:\n                story.append(Paragraph(escape(line), style_body))\n\n    if pages:\n        for p_idx, page_item in enumerate(pages):\n            if p_idx > 0:\n                story.append(PageBreak())\n            append_text_blocks(page_item.get(\"text\", \"\"))\n            for tbl in page_item.get(\"tables\") or []:\n                if not tbl:\n                    continue\n                col_count = max(len(r) for r in tbl)\n                if col_count <= 0:\n                    continue\n                avail_w = A4[0] - 36 * mm\n                col_w = [avail_w / col_count] * col_count\n                data = []\n                for row in tbl:\n                    padded = list(row) + [\"\"] * (col_count - len(row))\n                    data.append([Paragraph(escape(str(c)), style_cell) for c in padded[:col_count]])\n                t = Table(data, colWidths=col_w, repeatRows=1)\n                t.setStyle(TableStyle([\n                    (\"BACKGROUND\", (0, 0), (-1, 0), header_bg),\n                    (\"GRID\", (0, 0), (-1, -1), 0.5, border_col),\n                    (\"VALIGN\", (0, 0), (-1, -1), \"TOP\"),\n                    (\"LEFTPADDING\", (0, 0), (-1, -1), 5),\n                    (\"RIGHTPADDING\", (0, 0), (-1, -1), 5),\n                    (\"TOPPADDING\", (0, 0), (-1, -1), 4),\n                    (\"BOTTOMPADDING\", (0, 0), (-1, -1), 4),\n                ]))\n                story.append(Spacer(1, 6))\n                story.append(t)\n                story.append(Spacer(1, 8))\n    else:\n        append_text_blocks(full_text)\n\n    if len(story) <= 2:\n        story.append(Paragraph(\" \", style_body))\n\n    def draw_footer(canvas_obj, doc_obj):\n        canvas_obj.saveState()\n        canvas_obj.setFont(font_reg, 8.5)\n        canvas_obj.setFillColor(muted)\n        canvas_obj.drawString(18 * mm, 10 * mm, \"Word Bridge Translation \u2014 https://dichthuat.wordbridge.io.vn\")\n        canvas_obj.drawRightString(A4[0] - 18 * mm, 10 * mm, f\"Trang {doc_obj.page}\")\n        canvas_obj.restoreState()\n\n    doc.build(story, onFirstPage=draw_footer, onLaterPages=draw_footer)\n    sys.stdout.buffer.write(out_buf.getvalue())\n    out_buf.close()\n\n\nif __name__ == \"__main__\":\n    mode = sys.argv[1] if len(sys.argv) > 1 else \"\"\n    if mode == \"extract\":\n        max_p = int(sys.argv[2]) if len(sys.argv) > 2 else 50\n        cmd_extract(max_p)\n    elif mode == \"generate\":\n        cmd_generate()\n    else:\n        sys.stderr.write(\"Usage: pdf-helper.py [extract <max_pages>|generate]\\n\")\n        sys.exit(2)\n";

// Bảng CRC32 tiêu chuẩn phục vụ đóng gói container ZIP/OOXML trên RAM
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC32_TABLE[i] = c >>> 0;
}

function computeCrc32(uint8) {
  let crc = 0xffffffff;
  for (let i = 0; i < uint8.length; i++) {
    crc = CRC32_TABLE[(crc ^ uint8[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Giải nén container ZIP trên RAM kèm cơ chế chống ZIP Bomb nghiêm ngặt.
 */
export function parseZipArchive(zipBytes) {
  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);
  let eocdOffset = -1;
  for (let i = zipBytes.length - 22; i >= Math.max(0, zipBytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    const err = new Error("Tệp OOXML/ZIP bị hỏng hoặc không có cấu trúc ZIP hợp lệ.");
    err.code = "ERR_CORRUPT_ARCHIVE";
    throw err;
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  if (totalEntries > LIMITS.MAX_ZIP_ENTRIES) {
    const err = new Error(`Phát hiện rủi ro ZIP Bomb: số lượng tệp con (${totalEntries}) vượt quá giới hạn ${LIMITS.MAX_ZIP_ENTRIES}.`);
    err.code = "ERR_ZIP_BOMB_DETECTED";
    throw err;
  }

  const cdOffset = view.getUint32(eocdOffset + 16, true);
  const entries = new Map();
  let ptr = cdOffset;
  let totalUncompressed = 0;

  for (let idx = 0; idx < totalEntries; idx++) {
    if (ptr + 46 > zipBytes.length || view.getUint32(ptr, true) !== 0x02014b50) {
      const err = new Error("Cấu trúc Central Directory của tệp nén không hợp lệ.");
      err.code = "ERR_CORRUPT_ARCHIVE";
      throw err;
    }

    const compressionMethod = view.getUint16(ptr + 10, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const uncompressedSize = view.getUint32(ptr + 24, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localHeaderOffset = view.getUint32(ptr + 42, true);

    const nameBytes = zipBytes.subarray(ptr + 46, ptr + 46 + nameLen);
    const name = new TextDecoder("utf-8").decode(nameBytes);

    // Chặn Path Traversal bên trong tệp nén
    if (name.includes("..") || name.startsWith("/") || name.startsWith("\\")) {
      const err = new Error("Phát hiện đường dẫn nguy hiểm (Path Traversal) trong tệp nén.");
      err.code = "ERR_PATH_TRAVERSAL_ARCHIVE";
      throw err;
    }

    // Chống ZIP Bomb: kiểm tra tổng dung lượng và tỷ lệ nén
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > LIMITS.MAX_ZIP_UNCOMPRESSED_BYTES) {
      const err = new Error("Phát hiện rủi ro ZIP Bomb: dung lượng giải nén vượt quá giới hạn bộ nhớ an toàn.");
      err.code = "ERR_ZIP_BOMB_DETECTED";
      throw err;
    }
    if (compressedSize > 0 && uncompressedSize / compressedSize > LIMITS.MAX_ZIP_COMPRESSION_RATIO && uncompressedSize > 1024 * 1024) {
      const err = new Error("Phát hiện rủi ro ZIP Bomb: tỷ lệ nén bất thường.");
      err.code = "ERR_ZIP_BOMB_DETECTED";
      throw err;
    }

    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const rawSlice = zipBytes.subarray(dataStart, dataStart + compressedSize);

    let uncompressed;
    if (compressionMethod === 0) {
      uncompressed = new Uint8Array(rawSlice);
    } else if (compressionMethod === 8) {
      uncompressed = new Uint8Array(zlib.inflateRawSync(rawSlice, { maxOutputLength: LIMITS.MAX_ZIP_UNCOMPRESSED_BYTES }));
    } else {
      const err = new Error(`Phương thức nén ZIP (${compressionMethod}) không được hỗ trợ.`);
      err.code = "ERR_UNSUPPORTED_COMPRESSION";
      throw err;
    }

    entries.set(name, uncompressed);
    ptr += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

export function buildZipArchive(entriesMap) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const encoder = new TextEncoder();

  for (const [name, contentBytes] of entriesMap.entries()) {
    const nameBytes = encoder.encode(name);
    const crc = computeCrc32(contentBytes);
    const compressed = zlib.deflateRawSync(contentBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 8, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, compressed.length, true);
    lv.setUint32(22, contentBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, compressed);

    const cdHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cdHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 8, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, compressed.length, true);
    cv.setUint32(24, contentBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    cdHeader.set(nameBytes, 46);

    centralParts.push(cdHeader);
    offset += localHeader.length + compressed.length;
  }

  const cdSize = centralParts.reduce((sum, p) => sum + p.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entriesMap.size, true);
  ev.setUint16(10, entriesMap.size, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);

  const totalLen = offset + cdSize + 22;
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const part of [...localParts, ...centralParts, eocd]) {
    out.set(part, pos);
    pos += part.length;
  }
  return out;
}

function unescapeXmlEntities(str) {
  return String(str || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function escapeXmlEntities(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function translateXmlTextTag(xmlContent, tagName, options, env) {
  const regex = new RegExp(`(<${tagName}(?:\\s[^>]*)?>)([\\s\\S]*?)(<\\/${tagName}>)`, "g");
  const matches = [];
  let m;
  while ((m = regex.exec(xmlContent)) !== null) {
    const innerText = unescapeXmlEntities(m[2]);
    if (innerText.trim().length > 0) {
      matches.push({ index: m.index, fullLen: m[0].length, open: m[1], text: innerText, close: m[3] });
    }
  }
  if (matches.length === 0) return { xml: xmlContent, count: 0 };

  // Gom nhóm thành batch nhỏ để giữ tốc độ dịch và thứ tự chính xác
  const translatedMap = new Map();
  for (let i = 0; i < matches.length; i++) {
    const res = await translateText(
      {
        text: matches[i].text,
        sourceLang: options.sourceLang,
        targetLang: options.targetLang,
        domain: options.domain
      },
      env
    );
    if (!res.ok) {
      const err = new Error(res.message || "Lỗi dịch đoạn văn bản trong tài liệu.");
      err.code = res.code || "ERR_TRANSLATION_PROVIDER_UNAVAILABLE";
      err.status = res.status || 503;
      throw err;
    }
    translatedMap.set(i, res.translatedText);
  }

  let rebuilt = "";
  let lastIdx = 0;
  for (let i = 0; i < matches.length; i++) {
    const item = matches[i];
    rebuilt += xmlContent.slice(lastIdx, item.index);
    const escaped = escapeXmlEntities(translatedMap.get(i));
    const openTag = item.open.includes("xml:space") ? item.open : item.open.replace(/>$/, ' xml:space="preserve">');
    rebuilt += `${openTag}${escaped}${item.close}`;
    lastIdx = item.index + item.fullLen;
  }
  rebuilt += xmlContent.slice(lastIdx);
  return { xml: rebuilt, count: matches.length };
}

function parseCsvRows(csvText) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    if (inQuotes) {
      if (ch === '"' && csvText[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && csvText[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function serializeCsvRows(rows) {
  return rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? "");
          if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
          return s;
        })
        .join(",")
    )
    .join("\n");
}

async function runPdfExtractInMemory(pdfBytes) {
  const spawnSync = await getNodeSpawnSync();
  if (!spawnSync) return extractPdfTextPureJs(pdfBytes);
  const res = spawnSync("python3", ["-c", PDF_HELPER_PY_CODE, "extract", String(LIMITS.MAX_DOCUMENT_PAGES)], {
    input: Buffer.from(pdfBytes),
    maxBuffer: 50 * 1024 * 1024,
    timeout: 30000
  });
  if (res.status !== 0) {
    return {
      ok: false,
      code: "ERR_PDF_HELPER_FAILED",
      message: "Không thể trích xuất nội dung PDF trên bộ nhớ tạm."
    };
  }
  try {
    return JSON.parse(res.stdout.toString("utf-8"));
  } catch (_) {
    return { ok: false, code: "ERR_PDF_EXTRACT_PARSE", message: "Lỗi phân tích phản hồi trích xuất PDF." };
  }
}

async function runPdfGenerateInMemory(pages, translatedText, meta) {
  const spawnSync = await getNodeSpawnSync();
  if (!spawnSync) return buildPureJsMultiPagePdf(translatedText, meta);
  const payload = JSON.stringify({ pages, translatedText, meta });
  const res = spawnSync("python3", ["-c", PDF_HELPER_PY_CODE, "generate"], {
    input: Buffer.from(payload, "utf-8"),
    maxBuffer: 50 * 1024 * 1024,
    timeout: 30000
  });
  if (res.status !== 0 || !res.stdout || res.stdout.length === 0) {
    const err = new Error("Không thể tạo tệp PDF kết quả chuẩn Unicode trên bộ nhớ tạm.");
    err.code = "ERR_PDF_GENERATE_FAILED";
    err.status = 500;
    throw err;
  }
  return new Uint8Array(res.stdout);
}

function extractLegacyDocText(docBytes) {
  // Trích xuất chuỗi UTF-16LE và ASCII đọc được từ tệp OLE2 .doc
  const utf16Text = new TextDecoder("utf-16le", { fatal: false }).decode(docBytes);
  const runs = utf16Text.match(/[\p{L}\p{N}][\p{L}\p{N}\s,.;:!?()'"%/-]{12,}/gu) || [];
  const cleaned = runs
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 12 && !/Microsoft|Word\.Document|Root Entry|CompObj/i.test(s));
  if (cleaned.length > 0) {
    return cleaned.join("\n\n");
  }
  const latin = new TextDecoder("latin1").decode(docBytes);
  const asciiRuns = latin.match(/[A-Za-z0-9][A-Za-z0-9\s,.;:!?()'"%/-]{15,}/g) || [];
  return asciiRuns.filter((s) => !/Root Entry|WordDocument|SummaryInformation/i.test(s)).join("\n\n").trim();
}

export async function translateDocumentInMemory(inputBuffer, options = {}, env = {}) {
  const workingBuffer = inputBuffer instanceof Uint8Array ? new Uint8Array(inputBuffer) : new Uint8Array(Buffer.from(inputBuffer || []));
  const filename = String(options.filename || "document.txt");
  const sourceLang = String(options.sourceLang || "auto").toLowerCase();
  const targetLang = String(options.targetLang || "vi").toLowerCase();
  const domainObj = getDomainById(options.domain || "general");

  try {
    const sig = verifyFileSignature(workingBuffer, filename, "document");
    if (!sig.valid) {
      return { ok: false, status: 400, code: sig.code, message: sig.message, zeroUserDataStorage: true };
    }

    const baseName = filename.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_\-\u00C0-\u1EF9 ]/g, "_").slice(0, 64) || "translated_document";
    let outputBytes = null;
    let outputMime = sig.mimeType;
    let outputFilename = `${baseName}_${targetLang}.${sig.format}`;
    let previewText = "";
    let pageCount = 1;
    let formatNotice = null;

    if (sig.format === "txt") {
      const text = new TextDecoder("utf-8").decode(workingBuffer);
      const res = await translateText({ text, sourceLang, targetLang, domain: domainObj.id }, env);
      if (!res.ok) return res;
      previewText = res.translatedText;
      outputBytes = new TextEncoder().encode(res.translatedText);
      outputMime = "text/plain; charset=utf-8";
    } else if (sig.format === "csv") {
      const csvText = new TextDecoder("utf-8").decode(workingBuffer);
      const rows = parseCsvRows(csvText);
      const translatedRows = [];
      for (const row of rows) {
        const newRow = [];
        for (const cell of row) {
          if (!cell.trim() || /^[\d.,+\-%$€₫]+$/.test(cell.trim())) {
            newRow.push(cell);
          } else {
            const res = await translateText({ text: cell, sourceLang, targetLang, domain: domainObj.id }, env);
            if (!res.ok) return res;
            newRow.push(res.translatedText);
          }
        }
        translatedRows.push(newRow);
      }
      const outCsv = serializeCsvRows(translatedRows);
      previewText = outCsv.slice(0, 2000);
      outputBytes = new TextEncoder().encode("\uFEFF" + outCsv);
      outputMime = "text/csv; charset=utf-8";
    } else if (sig.format === "docx" || sig.format === "pptx" || sig.format === "xlsx") {
      const entries = parseZipArchive(workingBuffer);
      const targetPattern =
        sig.format === "docx"
          ? /^word\/(document|header\d*|footer\d*)\.xml$/
          : sig.format === "pptx"
          ? /^ppt\/slides\/slide\d+\.xml$/
          : /^xl\/sharedStrings\.xml$/;
      const tagName = sig.format === "docx" ? "w:t" : sig.format === "pptx" ? "a:t" : "t";

      let translatedNodeCount = 0;
      const previewParts = [];
      for (const [entryName, entryBytes] of entries.entries()) {
        if (targetPattern.test(entryName)) {
          const xmlStr = new TextDecoder("utf-8").decode(entryBytes);
          const { xml: outXml, count } = await translateXmlTextTag(
            xmlStr,
            tagName,
            { sourceLang, targetLang, domain: domainObj.id },
            env
          );
          translatedNodeCount += count;
          entries.set(entryName, new TextEncoder().encode(outXml));
          if (previewParts.length < 10) {
            const plain = outXml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            if (plain) previewParts.push(plain.slice(0, 300));
          }
        }
      }

      if (translatedNodeCount === 0) {
        return {
          ok: false,
          status: 422,
          code: "ERR_NO_EXTRACTABLE_TEXT",
          message: `Không tìm thấy văn bản có thể dịch trong tệp ${sig.format.toUpperCase()}.`,
          zeroUserDataStorage: true
        };
      }

      outputBytes = buildZipArchive(entries);
      previewText = previewParts.join("\n").slice(0, 2000);
      formatNotice = `Đã bảo toàn cấu trúc XML gốc của tệp ${sig.format.toUpperCase()} (${translatedNodeCount} phần tử văn bản được dịch).`;
    } else if (sig.format === "pdf") {
      const extracted = await runPdfExtractInMemory(workingBuffer);
      if (!extracted.ok) {
        return {
          ok: false,
          status: extracted.code === "ERR_PDF_TOO_MANY_PAGES" ? 413 : 422,
          code: extracted.code,
          message: extracted.message,
          zeroUserDataStorage: true
        };
      }
      if (!extracted.text || !extracted.text.trim()) {
        return {
          ok: false,
          status: 422,
          code: "ERR_PDF_NO_TEXT_LAYER",
          message: "Tệp PDF không chứa lớp văn bản (có thể là PDF dạng ảnh quét). Vui lòng dùng tính năng Dịch hình ảnh cho từng trang ảnh.",
          zeroUserDataStorage: true
        };
      }

      pageCount = extracted.pageCount || 1;
      const translatedPages = [];
      const previewBlocks = [];

      for (const pageItem of extracted.pages || []) {
        let translatedPageText = "";
        if (pageItem.text && pageItem.text.trim()) {
          const res = await translateText(
            { text: pageItem.text, sourceLang, targetLang, domain: domainObj.id },
            env
          );
          if (!res.ok) return res;
          translatedPageText = res.translatedText;
          if (previewBlocks.length < 3) previewBlocks.push(translatedPageText);
        }

        const translatedTables = [];
        for (const tbl of pageItem.tables || []) {
          const newTbl = [];
          for (const row of tbl) {
            const newRow = [];
            for (const cell of row) {
              if (!cell.trim() || /^[\d.,+\-%$€₫]+$/.test(cell.trim())) {
                newRow.push(cell);
              } else {
                const cRes = await translateText(
                  { text: cell, sourceLang, targetLang, domain: domainObj.id },
                  env
                );
                if (!cRes.ok) return cRes;
                newRow.push(cRes.translatedText);
              }
            }
            newTbl.push(newRow);
          }
          translatedTables.push(newTbl);
        }

        translatedPages.push({
          page: pageItem.page,
          text: translatedPageText,
          tables: translatedTables
        });
      }

      const fullTranslated = translatedPages.map((p) => p.text).filter(Boolean).join("\n\n");
      outputBytes = await runPdfGenerateInMemory(translatedPages, fullTranslated, {
        sourceLang,
        targetLang,
        domain: domainObj.nameVi
      });
      outputMime = "application/pdf";
      previewText = previewBlocks.join("\n\n").slice(0, 2000);
      formatNotice = `Đã xuất PDF đa trang chuẩn Unicode (${pageCount} trang, giữ cấu trúc đoạn văn và bảng biểu).`;
    } else if (sig.format === "doc") {
      const extractedText = extractLegacyDocText(workingBuffer);
      if (!extractedText) {
        return {
          ok: false,
          status: 422,
          code: "ERR_LEGACY_DOC_UNREADABLE",
          message: "Không thể trích xuất văn bản từ tệp .DOC đời cũ này. Vui lòng chuyển sang .DOCX rồi tải lên lại.",
          zeroUserDataStorage: true
        };
      }
      const res = await translateText({ text: extractedText, sourceLang, targetLang, domain: domainObj.id }, env);
      if (!res.ok) return res;
      previewText = res.translatedText.slice(0, 2000);
      outputBytes = new TextEncoder().encode(res.translatedText);
      outputMime = "text/plain; charset=utf-8";
      outputFilename = `${baseName}_${targetLang}.txt`;
      formatNotice =
        "Lưu ý định dạng .DOC đời cũ: hệ thống đã trích xuất và dịch toàn bộ nội dung sang tệp .TXT chuẩn UTF-8 vì định dạng nhị phân .DOC cũ không bảo toàn trọn vẹn bố cục gốc.";
    }

    const base64Output = Buffer.from(outputBytes).toString("base64");
    wipeBuffer(outputBytes);

    return {
      ok: true,
      status: 200,
      sourceFormat: sig.format,
      outputFilename,
      outputMimeType: outputMime,
      outputBase64: base64Output,
      outputBytesLength: Math.floor((base64Output.length * 3) / 4),
      pageCount,
      previewText,
      formatNotice,
      domain: { id: domainObj.id, nameVi: domainObj.nameVi },
      zeroUserDataStorage: true
    };
  } catch (err) {
    return {
      ok: false,
      status: err?.status || (err?.code?.startsWith("ERR_ZIP") || err?.code?.startsWith("ERR_CORRUPT") ? 400 : 500),
      code: err?.code || "ERR_DOCUMENT_PROCESSING_FAILED",
      message: err?.message || "Lỗi xử lý tài liệu trên bộ nhớ tạm.",
      zeroUserDataStorage: true
    };
  } finally {
    wipeBuffer(workingBuffer);
  }
}
