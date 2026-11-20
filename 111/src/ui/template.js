/**
 * @file src/ui/template.js
 * @description Giao diện Công khai 08 Màn hình Hoàn chỉnh cho Word Bridge Translation (TRANS).
 *
 * TUÂN THỦ 100% CÁC TIÊU CHUẨN BẮT BUỘC:
 *   - 08 giao diện hoàn chỉnh: Dịch văn bản, Dịch tài liệu, Dịch trang web, Dịch hình ảnh,
 *     Giới thiệu, Quyền riêng tư và Điều khoản (1 trang, 5 mục, không sidebar),
 *     Trợ giúp (1 trang, 6 nhóm + tìm kiếm + FAQ đóng/mở, không sidebar),
 *     Gửi ý kiến phản hồi (8 loại phản hồi + đính kèm + gửi email SMTP thực tế).
 *   - Thanh điều hướng duy nhất + Footer đồng bộ toàn website.
 *   - 100% Icon SVG đơn sắc (#0B63E5) từ `src/ui/icons.js`, TUYỆT ĐỐI KHÔNG dùng emoji hay icon nhiều màu.
 *   - KHÔNG hiển thị chữ viết tắt "OCR", "WEB" trong tên chức năng công khai.
 *   - KHÔNG hiển thị Cloudflare, D1, R2, database ID hay tên máy chủ.
 *   - KHÔNG dùng localStorage/sessionStorage/indexedDB/document.cookie/caches (Zero User Data Storage).
 *   - SEO chuẩn theo từng trang (title, description, canonical, Open Graph riêng biệt).
 */

import { renderSvgIcon, LOGO_HORIZONTAL_LIGHT_SVG } from "./assets.js";
import { escapeHtml } from "../security/privacy-shield.js";

const PUBLIC_DOMAIN = "https://dichthuat.wordbridge.io.vn";

const PAGE_SEO_META = Object.freeze({
  text: {
    path: "/",
    title: "Dịch văn bản — Dịch thuật Word Bridge (TRANS)",
    description: "Dịch văn bản đa ngôn ngữ toàn cầu kèm 20 lĩnh vực chuyên ngành trên hạ tầng độc lập, không lưu dữ liệu người dùng."
  },
  document: {
    path: "/dich-tai-lieu",
    title: "Dịch tài liệu PDF, DOCX, XLSX, PPTX — Dịch thuật Word Bridge (TRANS)",
    description: "Tải lên và dịch trực tiếp tài liệu PDF, DOCX, DOC, PPTX, XLSX, CSV, TXT hoàn toàn trên RAM với chính sách Zero User Data Storage."
  },
  website: {
    path: "/dich-trang-web",
    title: "Dịch trang web trực tuyến an toàn — Dịch thuật Word Bridge (TRANS)",
    description: "Dịch nội dung trang web theo địa chỉ URL an toàn với cơ chế làm sạch HTML chống mã độc và bảo vệ quyền riêng tư."
  },
  image: {
    path: "/dich-hinh-anh",
    title: "Dịch hình ảnh sang đa ngôn ngữ — Dịch thuật Word Bridge (TRANS)",
    description: "Tải ảnh JPG, JPEG, PNG, WEBP để nhận diện chữ trong hình ảnh và dịch sang nhiều ngôn ngữ trực tiếp trên bộ nhớ tạm."
  },
  about: {
    path: "/gioi-thieu",
    title: "Giới thiệu — Dịch thuật Word Bridge (Word Bridge Translation)",
    description: "Tìm hiểu về Dịch thuật Word Bridge (TRANS), định hướng dịch thuật toàn cầu, bốn chức năng chính và cam kết Zero User Data Storage."
  },
  privacy: {
    path: "/quyen-rieng-tu",
    title: "Quyền riêng tư và Điều khoản — Dịch thuật Word Bridge (TRANS)",
    description: "Chính sách quyền riêng tư, điều khoản sử dụng, chính sách cookie, quyền sở hữu trí tuệ và cập nhật chính sách của Word Bridge Translation."
  },
  help: {
    path: "/tro-giup",
    title: "Trợ giúp & Câu hỏi thường gặp — Dịch thuật Word Bridge (TRANS)",
    description: "Hướng dẫn sử dụng bốn công cụ dịch thuật, xử lý sự cố, bảo mật dữ liệu và giải đáp câu hỏi thường gặp."
  },
  feedback: {
    path: "/phan-hoi",
    title: "Gửi ý kiến phản hồi — Dịch thuật Word Bridge (TRANS)",
    description: "Gửi báo lỗi kỹ thuật, góp ý chất lượng bản dịch, đề xuất ngôn ngữ hoặc yêu cầu hỗ trợ trực tiếp tới đội ngũ Word Bridge Translation."
  }
});

export function renderTranslationAppHtml({
  initialView = "text",
  pathname = "/",
  totalAccesses = 0,
  languages = [],
  domains = [],
  feedbackTypes = []
} = {}) {
  const view = PAGE_SEO_META[initialView] ? initialView : "text";
  const seo = PAGE_SEO_META[view];
  const canonicalPath = pathname === "/dich-van-ban" ? "/dich-van-ban" : seo.path;
  const canonicalUrl = `${PUBLIC_DOMAIN}${canonicalPath === "/" ? "" : canonicalPath}`;

  const safeLanguagesJson = JSON.stringify(
    languages.map((l) => ({ code: l.code, nameVi: l.nameVi, nativeName: l.nativeName, rtl: Boolean(l.rtl) }))
  ).replace(/</g, "\\u003c");
  const safeDomainsJson = JSON.stringify(
    domains.map((d) => ({ id: d.id, nameVi: d.nameVi, nameEn: d.nameEn }))
  ).replace(/</g, "\\u003c");

  const feedbackOptionsHtml = feedbackTypes
    .map((ft) => `<option value="${escapeHtml(ft.id)}">${escapeHtml(ft.label)}</option>`)
    .join("");

  const navItems = [
    { id: "text", href: "/dich-van-ban", label: "Dịch văn bản", icon: "text" },
    { id: "document", href: "/dich-tai-lieu", label: "Dịch tài liệu", icon: "document" },
    { id: "website", href: "/dich-trang-web", label: "Dịch trang web", icon: "website" },
    { id: "image", href: "/dich-hinh-anh", label: "Dịch hình ảnh", icon: "image" }
  ];

  const navHtml = navItems
    .map(
      (item) =>
        `<a href="${item.href}" class="wb-nav-link${view === item.id ? " is-active" : ""}" data-view="${item.id}" aria-current="${view === item.id ? "page" : "false"}">${renderSvgIcon(item.icon, { size: 16 })}<span>${item.label}</span></a>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(seo.title)}</title>
  <meta name="description" content="${escapeHtml(seo.description)}">
  <meta name="theme-color" content="#0B63E5">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="manifest" href="/manifest.webmanifest">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Word Bridge Translation">
  <meta property="og:title" content="${escapeHtml(seo.title)}">
  <meta property="og:description" content="${escapeHtml(seo.description)}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:image" content="${PUBLIC_DOMAIN}/assets/og-banner.svg">
  <style>
    :root {
      --wb-blue: #0B63E5;
      --wb-blue-hover: #084EC0;
      --wb-blue-soft: #EFF6FF;
      --wb-blue-border: #BFDBFE;
      --wb-bg: #F8FAFC;
      --wb-surface: #FFFFFF;
      --wb-text: #0F172A;
      --wb-muted: #475569;
      --wb-border: #E2E8F0;
      --wb-danger: #B91C1C;
      --wb-danger-bg: #FEF2F2;
      --wb-success: #047857;
      --wb-success-bg: #ECFDF5;
      --wb-radius: 12px;
      --wb-shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 14px rgba(15, 23, 42, 0.04);
    }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: var(--wb-text); background: var(--wb-bg); line-height: 1.55; }
    a { color: var(--wb-blue); text-decoration: none; }
    a:hover { text-decoration: underline; }
    button, input, select, textarea { font-family: inherit; font-size: 0.95rem; }
    :focus-visible { outline: 2px solid var(--wb-blue); outline-offset: 2px; }

    /* Monochrome SVG icon standard */
    .wb-icon { color: var(--wb-blue); flex-shrink: 0; display: inline-block; vertical-align: middle; }
    .wb-btn-primary .wb-icon, .wb-nav-link.is-active .wb-icon { color: #FFFFFF; }
    .wb-btn-ghost:disabled .wb-icon, button:disabled .wb-icon { opacity: 0.45; }

    /* Header & Single Nav */
    .wb-header { background: var(--wb-surface); border-bottom: 1px solid var(--wb-border); position: sticky; top: 0; z-index: 40; }
    .wb-header-inner { max-width: 1180px; margin: 0 auto; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .wb-brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }
    .wb-brand svg { height: 40px; width: auto; display: block; }
    .wb-nav { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .wb-nav-link { display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; border-radius: 10px; font-weight: 600; font-size: 0.92rem; color: var(--wb-text); border: 1px solid transparent; transition: background 0.15s, border-color 0.15s; text-decoration: none; }
    .wb-nav-link:hover { background: var(--wb-blue-soft); border-color: var(--wb-blue-border); text-decoration: none; }
    .wb-nav-link.is-active { background: var(--wb-blue); color: #FFFFFF; border-color: var(--wb-blue); }

    /* Main Container */
    .wb-main { max-width: 1180px; margin: 0 auto; padding: 24px 20px 48px; min-height: calc(100vh - 220px); }
    .wb-view { display: none; }
    .wb-view.is-active { display: block; }
    .wb-card { background: var(--wb-surface); border: 1px solid var(--wb-border); border-radius: var(--wb-radius); box-shadow: var(--wb-shadow); padding: 22px; }
    .wb-page-head { margin-bottom: 18px; }
    .wb-page-head h1 { margin: 0 0 6px; font-size: 1.55rem; font-weight: 800; color: var(--wb-text); display: flex; align-items: center; gap: 10px; }
    .wb-page-head p { margin: 0; color: var(--wb-muted); font-size: 0.96rem; }

    /* Controls & Toolbars */
    .wb-toolbar { display: grid; grid-template-columns: 1fr auto 1fr 1fr; gap: 10px; align-items: end; margin-bottom: 16px; }
    .wb-field { display: flex; flex-direction: column; gap: 6px; }
    .wb-field label { font-size: 0.84rem; font-weight: 600; color: var(--wb-muted); display: inline-flex; align-items: center; gap: 6px; }
    .wb-select, .wb-input, .wb-textarea { width: 100%; border: 1px solid var(--wb-border); border-radius: 10px; padding: 10px 12px; background: #FFFFFF; color: var(--wb-text); }
    .wb-select:focus, .wb-input:focus, .wb-textarea:focus { border-color: var(--wb-blue); outline: none; box-shadow: 0 0 0 3px rgba(11, 99, 229, 0.14); }

    /* Buttons */
    .wb-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border-radius: 10px; font-weight: 600; cursor: pointer; border: 1px solid var(--wb-border); background: #FFFFFF; color: var(--wb-text); transition: background 0.15s, border-color 0.15s; }
    .wb-btn:hover:not(:disabled) { background: var(--wb-blue-soft); border-color: var(--wb-blue-border); }
    .wb-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .wb-btn-primary { background: var(--wb-blue); color: #FFFFFF; border-color: var(--wb-blue); }
    .wb-btn-primary:hover:not(:disabled) { background: var(--wb-blue-hover); border-color: var(--wb-blue-hover); }
    .wb-btn-icon { padding: 8px 10px; }

    /* Text Translation Dual Grid */
    .wb-dual-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .wb-pane { border: 1px solid var(--wb-border); border-radius: var(--wb-radius); background: #FFFFFF; display: flex; flex-direction: column; min-height: 270px; }
    .wb-pane-head { padding: 10px 14px; border-bottom: 1px solid var(--wb-border); display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; font-weight: 600; color: var(--wb-muted); }
    .wb-pane textarea { flex: 1; border: none; resize: vertical; padding: 14px; min-height: 190px; font-size: 1rem; line-height: 1.6; background: transparent; color: var(--wb-text); }
    .wb-pane textarea:focus { outline: none; }
    .wb-output-box { flex: 1; padding: 14px; min-height: 190px; font-size: 1rem; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
    .wb-output-placeholder { color: #94A3B8; }
    .wb-pane-foot { padding: 10px 14px; border-top: 1px solid var(--wb-border); display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; background: #FAFCFF; border-radius: 0 0 var(--wb-radius) var(--wb-radius); }
    .wb-actions-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .wb-fullscreen { position: fixed; inset: 16px; z-index: 60; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25); }

    /* Dropzone */
    .wb-dropzone { border: 2px dashed var(--wb-blue-border); border-radius: var(--wb-radius); padding: 28px 20px; text-align: center; background: var(--wb-blue-soft); cursor: pointer; transition: border-color 0.15s, background 0.15s; }
    .wb-dropzone.is-drag { border-color: var(--wb-blue); background: #DBEAFE; }
    .wb-dropzone p { margin: 8px 0 4px; font-weight: 600; color: var(--wb-text); }
    .wb-dropzone small { color: var(--wb-muted); }

    /* Status & Alerts */
    .wb-status { margin-top: 14px; padding: 12px 14px; border-radius: 10px; font-size: 0.92rem; display: none; align-items: flex-start; gap: 10px; border: 1px solid var(--wb-border); background: var(--wb-blue-soft); }
    .wb-status.is-visible { display: flex; }
    .wb-status.is-error { background: var(--wb-danger-bg); border-color: #FECACA; color: var(--wb-danger); }
    .wb-status.is-success { background: var(--wb-success-bg); border-color: #A7F3D0; color: var(--wb-success); }
    .wb-notice { margin-top: 12px; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--wb-blue-border); background: var(--wb-blue-soft); font-size: 0.9rem; color: var(--wb-text); display: flex; gap: 10px; align-items: flex-start; }

    /* Preview Iframe & Image */
    .wb-web-frame { width: 100%; height: 520px; border: 1px solid var(--wb-border); border-radius: var(--wb-radius); background: #FFFFFF; margin-top: 14px; }
    .wb-img-preview { max-width: 100%; max-height: 260px; border-radius: 10px; border: 1px solid var(--wb-border); margin-top: 12px; display: none; object-fit: contain; }

    /* About / Privacy / Help Sections */
    .wb-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin: 18px 0; }
    .wb-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 18px 0; }
    .wb-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 18px 0; }
    .wb-feature-card { border: 1px solid var(--wb-border); border-radius: var(--wb-radius); padding: 18px; background: #FFFFFF; }
    .wb-feature-card h3 { margin: 10px 0 6px; font-size: 1.02rem; }
    .wb-feature-card p { margin: 0; font-size: 0.9rem; color: var(--wb-muted); }

    .wb-policy-section { border: 1px solid var(--wb-border); border-radius: var(--wb-radius); padding: 20px; background: #FFFFFF; margin-bottom: 14px; }
    .wb-policy-section h2 { margin: 0 0 8px; font-size: 1.15rem; color: var(--wb-blue); display: flex; align-items: center; gap: 8px; }
    .wb-policy-section p, .wb-policy-section li { color: var(--wb-text); font-size: 0.94rem; }

    .wb-faq-item { border: 1px solid var(--wb-border); border-radius: 10px; background: #FFFFFF; margin-bottom: 10px; overflow: hidden; }
    .wb-faq-btn { width: 100%; text-align: left; padding: 14px 16px; background: transparent; border: none; font-weight: 600; color: var(--wb-text); display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
    .wb-faq-body { display: none; padding: 0 16px 14px; color: var(--wb-muted); font-size: 0.93rem; border-top: 1px solid var(--wb-border); padding-top: 12px; }
    .wb-faq-item.is-open .wb-faq-body { display: block; }

    /* Feedback Form */
    .wb-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .wb-hp { position: absolute; left: -9999px; opacity: 0; pointer-events: none; }

    /* Footer */
    .wb-footer { background: var(--wb-surface); border-top: 1px solid var(--wb-border); padding: 28px 20px; margin-top: 32px; }
    .wb-footer-inner { max-width: 1180px; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 18px; }
    .wb-footer-brand { display: flex; flex-direction: column; gap: 6px; }
    .wb-footer-brand svg { height: 34px; width: auto; }
    .wb-footer-links { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; }
    .wb-footer-links a { display: inline-flex; align-items: center; gap: 6px; font-size: 0.9rem; font-weight: 600; color: var(--wb-text); }
    .wb-footer-links a:hover { color: var(--wb-blue); }
    .wb-footer-meta { max-width: 1180px; margin: 16px auto 0; padding-top: 14px; border-top: 1px solid var(--wb-border); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; font-size: 0.84rem; color: var(--wb-muted); }

    /* Responsive */
    @media (max-width: 920px) {
      .wb-toolbar { grid-template-columns: 1fr 1fr; }
      .wb-dual-grid, .wb-grid-4, .wb-grid-3, .wb-grid-2, .wb-form-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .wb-header-inner { padding: 10px 14px; }
      .wb-nav-link { padding: 8px 10px; font-size: 0.85rem; }
      .wb-main { padding: 16px 14px 36px; }
      .wb-card { padding: 16px; }
      .wb-toolbar { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header class="wb-header">
    <div class="wb-header-inner">
      <a href="/" class="wb-brand" data-view="text" aria-label="Word Bridge Translation Trang chủ">${LOGO_HORIZONTAL_LIGHT_SVG}</a>
      <nav class="wb-nav" aria-label="Điều hướng chính">${navHtml}</nav>
    </div>
  </header>

  <main class="wb-main">
    <!-- 01. DỊCH VĂN BẢN -->
    <section id="view-text" class="wb-view${view === "text" ? " is-active" : ""}" aria-label="Dịch văn bản">
      <div class="wb-page-head">
        <h1>${renderSvgIcon("text", { size: 24 })}<span>Dịch văn bản</span></h1>
        <p>Dịch trực tiếp trên bộ nhớ tạm với 20 lĩnh vực chuyên ngành. Không lưu lịch sử hay nội dung dịch.</p>
      </div>
      <div class="wb-card">
        <div class="wb-toolbar">
          <div class="wb-field">
            <label for="text-src-lang">${renderSvgIcon("language", { size: 16 })}<span>Ngôn ngữ nguồn</span></label>
            <select id="text-src-lang" class="wb-select" aria-label="Chọn ngôn ngữ nguồn"></select>
          </div>
          <button type="button" id="btn-swap-text" class="wb-btn wb-btn-icon" title="Đổi chiều ngôn ngữ" aria-label="Đổi chiều ngôn ngữ">${renderSvgIcon("swap", { size: 20 })}</button>
          <div class="wb-field">
            <label for="text-tgt-lang">${renderSvgIcon("language", { size: 16 })}<span>Ngôn ngữ đích</span></label>
            <select id="text-tgt-lang" class="wb-select" aria-label="Chọn ngôn ngữ đích"></select>
          </div>
          <div class="wb-field">
            <label for="text-domain">${renderSvgIcon("domain", { size: 16 })}<span>Lĩnh vực chuyên ngành</span></label>
            <select id="text-domain" class="wb-select" aria-label="Chọn lĩnh vực chuyên ngành"></select>
          </div>
        </div>

        <div class="wb-dual-grid">
          <div class="wb-pane">
            <div class="wb-pane-head">
              <span>Văn bản nguồn</span>
              <span id="text-detected-badge"></span>
            </div>
            <textarea id="text-input" maxlength="15000" placeholder="Nhập hoặc dán văn bản cần dịch (tối đa 15.000 ký tự)..."></textarea>
            <div class="wb-pane-foot">
              <span id="text-char-count" style="font-size:0.84rem;color:var(--wb-muted);">0 / 15.000 ký tự</span>
              <div class="wb-actions-row">
                <button type="button" id="btn-speak-src" class="wb-btn wb-btn-icon" title="Phát âm văn bản nguồn" aria-label="Phát âm văn bản nguồn">${renderSvgIcon("speak", { size: 16 })}</button>
                <button type="button" id="btn-clear-text" class="wb-btn wb-btn-icon" title="Xóa nội dung" aria-label="Xóa nội dung">${renderSvgIcon("clear", { size: 16 })}</button>
                <button type="button" id="btn-run-text" class="wb-btn wb-btn-primary">${renderSvgIcon("text", { size: 16 })}<span>Dịch văn bản</span></button>
              </div>
            </div>
          </div>

          <div class="wb-pane" id="text-output-pane">
            <div class="wb-pane-head">
              <span>Kết quả dịch</span>
              <span id="text-provider-badge" style="font-size:0.8rem;"></span>
            </div>
            <div id="text-output" class="wb-output-box wb-output-placeholder" aria-live="polite">Bản dịch sẽ hiển thị tại đây.</div>
            <div class="wb-pane-foot">
              <span id="text-stats-meta" style="font-size:0.84rem;color:var(--wb-muted);"></span>
              <div class="wb-actions-row">
                <button type="button" id="btn-speak-tgt" class="wb-btn wb-btn-icon" title="Phát âm bản dịch" aria-label="Phát âm bản dịch">${renderSvgIcon("speak", { size: 16 })}</button>
                <button type="button" id="btn-copy-text" class="wb-btn wb-btn-icon" title="Sao chép bản dịch" aria-label="Sao chép bản dịch">${renderSvgIcon("copy", { size: 16 })}</button>
                <button type="button" id="btn-expand-text" class="wb-btn wb-btn-icon" title="Phóng to khung kết quả" aria-label="Phóng to khung kết quả">${renderSvgIcon("expand", { size: 16 })}</button>
              </div>
            </div>
          </div>
        </div>
        <div id="text-status" class="wb-status" role="status"></div>
      </div>
    </section>

    <!-- 02. DỊCH TÀI LIỆU -->
    <section id="view-document" class="wb-view${view === "document" ? " is-active" : ""}" aria-label="Dịch tài liệu">
      <div class="wb-page-head">
        <h1>${renderSvgIcon("document", { size: 24 })}<span>Dịch tài liệu</span></h1>
        <p>Hỗ trợ PDF, DOCX, DOC, PPTX, XLSX, CSV, TXT (tối đa 50 MB). Xử lý hoàn toàn trên RAM và trả tệp kết quả trực tiếp.</p>
      </div>
      <div class="wb-card">
        <div class="wb-toolbar">
          <div class="wb-field">
            <label for="doc-src-lang">${renderSvgIcon("language", { size: 16 })}<span>Ngôn ngữ nguồn</span></label>
            <select id="doc-src-lang" class="wb-select"></select>
          </div>
          <button type="button" id="btn-swap-doc" class="wb-btn wb-btn-icon" title="Đổi chiều ngôn ngữ" aria-label="Đổi chiều ngôn ngữ">${renderSvgIcon("swap", { size: 20 })}</button>
          <div class="wb-field">
            <label for="doc-tgt-lang">${renderSvgIcon("language", { size: 16 })}<span>Ngôn ngữ đích</span></label>
            <select id="doc-tgt-lang" class="wb-select"></select>
          </div>
          <div class="wb-field">
            <label for="doc-domain">${renderSvgIcon("domain", { size: 16 })}<span>Lĩnh vực chuyên ngành</span></label>
            <select id="doc-domain" class="wb-select"></select>
          </div>
        </div>

        <div id="doc-dropzone" class="wb-dropzone" tabindex="0" role="button" aria-label="Chọn hoặc kéo thả tệp tài liệu">
          ${renderSvgIcon("upload-doc", { size: 32 })}
          <p id="doc-file-label">Kéo thả tài liệu vào đây hoặc bấm để chọn tệp</p>
          <small>Định dạng hỗ trợ: PDF, DOCX, DOC, PPTX, XLSX, CSV, TXT · Tối đa 50 MB · Không lưu tệp trên máy chủ</small>
          <input type="file" id="doc-file-input" accept=".pdf,.docx,.doc,.pptx,.xlsx,.csv,.txt" hidden>
        </div>

        <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <button type="button" id="btn-run-doc" class="wb-btn wb-btn-primary">${renderSvgIcon("document", { size: 16 })}<span>Dịch tài liệu</span></button>
          <button type="button" id="btn-download-doc" class="wb-btn" style="display:none;">${renderSvgIcon("download", { size: 16 })}<span>Tải tệp kết quả</span></button>
        </div>
        <div id="doc-status" class="wb-status" role="status"></div>
        <div id="doc-preview-wrap" style="display:none;margin-top:14px;">
          <h3 style="margin:0 0 8px;font-size:0.95rem;">Xem trước nội dung đã dịch</h3>
          <pre id="doc-preview" style="background:#F8FAFC;border:1px solid var(--wb-border);border-radius:10px;padding:14px;white-space:pre-wrap;max-height:260px;overflow:auto;font-family:inherit;font-size:0.92rem;"></pre>
        </div>
      </div>
    </section>

    <!-- 03. DỊCH TRANG WEB -->
    <section id="view-website" class="wb-view${view === "website" ? " is-active" : ""}" aria-label="Dịch trang web">
      <div class="wb-page-head">
        <h1>${renderSvgIcon("website", { size: 24 })}<span>Dịch trang web</span></h1>
        <p>Nhập liên kết trang web công khai để dịch nội dung an toàn trong khung cô lập.</p>
      </div>
      <div class="wb-card">
        <div class="wb-toolbar">
          <div class="wb-field">
            <label for="web-src-lang">${renderSvgIcon("language", { size: 16 })}<span>Ngôn ngữ nguồn</span></label>
            <select id="web-src-lang" class="wb-select"></select>
          </div>
          <button type="button" id="btn-swap-web" class="wb-btn wb-btn-icon" title="Đổi chiều ngôn ngữ" aria-label="Đổi chiều ngôn ngữ">${renderSvgIcon("swap", { size: 20 })}</button>
          <div class="wb-field">
            <label for="web-tgt-lang">${renderSvgIcon("language", { size: 16 })}<span>Ngôn ngữ đích</span></label>
            <select id="web-tgt-lang" class="wb-select"></select>
          </div>
          <div class="wb-field">
            <label for="web-domain">${renderSvgIcon("domain", { size: 16 })}<span>Lĩnh vực chuyên ngành</span></label>
            <select id="web-domain" class="wb-select"></select>
          </div>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <input type="url" id="web-url-input" class="wb-input" style="flex:1;min-width:240px;" placeholder="https://example.com/bai-viet" aria-label="Địa chỉ URL trang web">
          <button type="button" id="btn-run-web" class="wb-btn wb-btn-primary">${renderSvgIcon("website", { size: 16 })}<span>Dịch trang web</span></button>
        </div>

        <div class="wb-notice">
          ${renderSvgIcon("shield", { size: 20 })}
          <div>Để đảm bảo an toàn, hệ thống chỉ truy cập trang web công khai (HTTP/HTTPS), chặn địa chỉ mạng nội bộ, loại bỏ mã kịch bản không an toàn và hiển thị kết quả trong khung cô lập. Một số trang yêu cầu đăng nhập hoặc chặn truy cập tự động có thể không dịch được.</div>
        </div>
        <div id="web-status" class="wb-status" role="status"></div>
        <iframe id="web-result-frame" class="wb-web-frame" sandbox="" title="Nội dung trang web đã dịch" style="display:none;"></iframe>
      </div>
    </section>

    <!-- 04. DỊCH HÌNH ẢNH -->
    <section id="view-image" class="wb-view${view === "image" ? " is-active" : ""}" aria-label="Dịch hình ảnh">
      <div class="wb-page-head">
        <h1>${renderSvgIcon("image", { size: 24 })}<span>Dịch hình ảnh</span></h1>
        <p>Tải lên hình ảnh JPG, JPEG, PNG hoặc WEBP (tối đa 10 MB) để nhận diện văn bản trong ảnh và dịch sang ngôn ngữ đích.</p>
      </div>
      <div class="wb-card">
        <div class="wb-toolbar">
          <div class="wb-field">
            <label for="img-src-lang">${renderSvgIcon("language", { size: 16 })}<span>Ngôn ngữ nguồn</span></label>
            <select id="img-src-lang" class="wb-select"></select>
          </div>
          <button type="button" id="btn-swap-img" class="wb-btn wb-btn-icon" title="Đổi chiều ngôn ngữ" aria-label="Đổi chiều ngôn ngữ">${renderSvgIcon("swap", { size: 20 })}</button>
          <div class="wb-field">
            <label for="img-tgt-lang">${renderSvgIcon("language", { size: 16 })}<span>Ngôn ngữ đích</span></label>
            <select id="img-tgt-lang" class="wb-select"></select>
          </div>
          <div class="wb-field">
            <label for="img-domain">${renderSvgIcon("domain", { size: 16 })}<span>Lĩnh vực chuyên ngành</span></label>
            <select id="img-domain" class="wb-select"></select>
          </div>
        </div>

        <div id="img-dropzone" class="wb-dropzone" tabindex="0" role="button" aria-label="Chọn hoặc kéo thả hình ảnh">
          ${renderSvgIcon("upload-image", { size: 32 })}
          <p id="img-file-label">Kéo thả hình ảnh vào đây hoặc bấm để chọn ảnh</p>
          <small>Hỗ trợ JPG, JPEG, PNG, WEBP · Tối đa 10 MB · Ảnh được xóa khỏi bộ nhớ tạm ngay sau khi xử lý</small>
          <input type="file" id="img-file-input" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden>
        </div>
        <img id="img-preview" class="wb-img-preview" alt="Xem trước hình ảnh tải lên">

        <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
          <button type="button" id="btn-run-img" class="wb-btn wb-btn-primary">${renderSvgIcon("image", { size: 16 })}<span>Dịch hình ảnh</span></button>
          <button type="button" id="btn-copy-img" class="wb-btn" style="display:none;">${renderSvgIcon("copy", { size: 16 })}<span>Sao chép bản dịch</span></button>
          <button type="button" id="btn-download-img" class="wb-btn" style="display:none;">${renderSvgIcon("download", { size: 16 })}<span>Tải bản dịch (.txt)</span></button>
        </div>
        <div id="img-status" class="wb-status" role="status"></div>

        <div id="img-results-grid" class="wb-dual-grid" style="margin-top:16px;display:none;">
          <div class="wb-pane">
            <div class="wb-pane-head"><span>Văn bản nhận diện từ hình ảnh</span></div>
            <div id="img-extracted-text" class="wb-output-box"></div>
          </div>
          <div class="wb-pane">
            <div class="wb-pane-head"><span>Bản dịch hoàn chỉnh</span></div>
            <div id="img-translated-text" class="wb-output-box"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- 05. GIỚI THIỆU -->
    <section id="view-about" class="wb-view${view === "about" ? " is-active" : ""}" aria-label="Giới thiệu về Word Bridge Translation">
      <div class="wb-card" style="padding:28px;">
        <div class="wb-page-head">
          <h1>${renderSvgIcon("info", { size: 24 })}<span>Giới thiệu về Word Bridge Translation</span></h1>
          <p>Dịch thuật Word Bridge (TRANS) là nền tảng dịch thuật đa ngôn ngữ toàn cầu thuộc hệ sinh thái Word Bridge, vận hành trên hạ tầng máy chủ độc lập và tuân thủ nghiêm ngặt chính sách Zero User Data Storage.</p>
        </div>
        <div style="margin:16px 0 22px;display:flex;gap:10px;flex-wrap:wrap;">
          <a href="/dich-van-ban" class="wb-btn wb-btn-primary" data-view="text">${renderSvgIcon("text", { size: 16 })}<span>Sử dụng ngay</span></a>
          <a href="/tro-giup" class="wb-btn" data-view="help">${renderSvgIcon("help", { size: 16 })}<span>Xem hướng dẫn</span></a>
        </div>

        <h2 style="font-size:1.15rem;margin:20px 0 10px;">Bốn chức năng dịch thuật cốt lõi</h2>
        <div class="wb-grid-4">
          <div class="wb-feature-card">
            ${renderSvgIcon("text", { size: 24 })}
            <h3>Dịch văn bản</h3>
            <p>Hỗ trợ nhận diện ngôn ngữ tự động, 20 lĩnh vực chuyên ngành và xử lý văn bản dài chuẩn Unicode.</p>
          </div>
          <div class="wb-feature-card">
            ${renderSvgIcon("document", { size: 24 })}
            <h3>Dịch tài liệu</h3>
            <p>Xử lý PDF đa trang, DOCX, DOC, PPTX, XLSX, CSV, TXT hoàn toàn trên RAM và xuất tệp trực tiếp.</p>
          </div>
          <div class="wb-feature-card">
            ${renderSvgIcon("website", { size: 24 })}
            <h3>Dịch trang web</h3>
            <p>Truy xuất trang công khai an toàn, lọc bỏ mã độc và hiển thị bản dịch trong khung cô lập.</p>
          </div>
          <div class="wb-feature-card">
            ${renderSvgIcon("image", { size: 24 })}
            <h3>Dịch hình ảnh</h3>
            <p>Nhận diện chữ trực tiếp từ ảnh JPG, JPEG, PNG, WEBP và dịch song song trên bộ nhớ tạm.</p>
          </div>
        </div>

        <h2 style="font-size:1.15rem;margin:22px 0 10px;">Cam kết chất lượng và quyền riêng tư</h2>
        <div class="wb-grid-3">
          <div class="wb-feature-card">
            ${renderSvgIcon("shield", { size: 24 })}
            <h3>Zero User Data Storage</h3>
            <p>Văn bản, tài liệu, hình ảnh và kết quả dịch chỉ đi qua RAM tạm thời, không lưu vào cơ sở dữ liệu hay kho tệp.</p>
          </div>
          <div class="wb-feature-card">
            ${renderSvgIcon("lock", { size: 24 })}
            <h3>Không huấn luyện AI từ dữ liệu người dùng</h3>
            <p>Tuyệt đối không dùng nội dung dịch thuật của bạn để huấn luyện mô hình, tiếp thị hay quảng cáo.</p>
          </div>
          <div class="wb-feature-card">
            ${renderSvgIcon("bolt", { size: 24 })}
            <h3>Hạ tầng tự vận hành độc lập</h3>
            <p>API và bộ máy dịch thuật do Word Bridge Translation quản lý trực tiếp, minh bạch trạng thái hệ thống.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 06. QUYỀN RIÊNG TƯ VÀ ĐIỀU KHOẢN (1 TRANG DUY NHẤT, 5 MỤC, KHÔNG SIDEBAR) -->
    <section id="view-privacy" class="wb-view${view === "privacy" ? " is-active" : ""}" aria-label="Quyền riêng tư và Điều khoản">
      <div class="wb-page-head">
        <h1>${renderSvgIcon("shield", { size: 24 })}<span>Quyền riêng tư và Điều khoản</span></h1>
        <p>Tài liệu pháp lý thống nhất áp dụng cho toàn bộ dịch vụ Dịch thuật Word Bridge (TRANS) tại dichthuat.wordbridge.io.vn.</p>
      </div>

      <article class="wb-policy-section">
        <h2>${renderSvgIcon("lock", { size: 20 })}<span>1. Quyền riêng tư</span></h2>
        <p>Word Bridge Translation áp dụng chính sách <strong>Zero User Data Storage</strong>. Mọi văn bản nhập, tài liệu tải lên, hình ảnh, địa chỉ trang web và kết quả dịch thuật chỉ được xử lý tạm thời trong bộ nhớ RAM và bị xóa trắng ngay sau khi trả kết quả về trình duyệt.</p>
        <ul>
          <li>Không lưu lịch sử dịch thuật, không lưu tệp gốc hoặc tệp đầu ra trên ổ đĩa hay kho lưu trữ đám mây.</li>
          <li>Không ghi nội dung dịch vào nhật ký máy chủ (log) và không đưa vào bộ nhớ đệm dùng chung.</li>
          <li>Không thu thập thông tin thiết bị hay địa chỉ IP để xây dựng hồ sơ người dùng.</li>
          <li>Không sử dụng nội dung dịch thuật để huấn luyện AI, quảng cáo hay chia sẻ cho bên thứ ba.</li>
        </ul>
      </article>

      <article class="wb-policy-section">
        <h2>${renderSvgIcon("book", { size: 20 })}<span>2. Điều khoản sử dụng</span></h2>
        <p>Người dùng cam kết sử dụng Dịch thuật Word Bridge cho mục đích hợp pháp, không tải lên tệp độc hại, mã thực thi, hoặc sử dụng công cụ Dịch trang web để quét hay tấn công hạ tầng nội bộ.</p>
        <p>Bản dịch tự động hỗ trợ tra cứu và làm việc nhanh; đối với tài liệu pháp lý, y tế hoặc hợp đồng ràng buộc, người dùng nên hiệu đính bởi chuyên gia trước khi ban hành chính thức.</p>
      </article>

      <article class="wb-policy-section">
        <h2>${renderSvgIcon("info", { size: 20 })}<span>3. Chính sách cookie</span></h2>
        <p>Word Bridge Translation không sử dụng cookie quảng cáo, không sử dụng cookie theo dõi hành vi đa trang và không lưu nội dung dịch trong bộ nhớ trình duyệt (localStorage, sessionStorage hay IndexedDB).</p>
      </article>

      <article class="wb-policy-section">
        <h2>${renderSvgIcon("shield", { size: 20 })}<span>4. Quyền sở hữu trí tuệ</span></h2>
        <p>Người dùng giữ toàn bộ quyền sở hữu trí tuệ đối với nội dung gốc và bản dịch tạo ra từ tài liệu của mình. Thương hiệu Word Bridge, Word Bridge Translation, giao diện, mã nguồn và hệ thống nhận diện đồ họa thuộc quyền sở hữu của hệ sinh thái Word Bridge.</p>
      </article>

      <article class="wb-policy-section">
        <h2>${renderSvgIcon("bell", { size: 20 })}<span>5. Cập nhật chính sách</span></h2>
        <p>Khi có thay đổi về kỹ thuật hoặc quy định pháp luật liên quan đến bảo vệ dữ liệu, trang này sẽ được cập nhật công khai kèm ngày hiệu lực mới. Mọi câu hỏi xin gửi về <a href="/phan-hoi" data-view="feedback">trang Gửi ý kiến phản hồi</a> hoặc email <strong>wordbridge.education@gmail.com</strong>.</p>
      </article>
    </section>

    <!-- 07. TRỢ GIÚP (1 TRANG DUY NHẤT, 6 NHÓM, TÌM KIẾM + FAQ ĐÓNG/MỞ, KHÔNG SIDEBAR) -->
    <section id="view-help" class="wb-view${view === "help" ? " is-active" : ""}" aria-label="Trợ giúp">
      <div class="wb-page-head">
        <h1>${renderSvgIcon("help", { size: 24 })}<span>Trợ giúp</span></h1>
        <p>Hướng dẫn sử dụng, xử lý sự cố và giải đáp thắc mắc về Dịch thuật Word Bridge (TRANS).</p>
      </div>

      <div class="wb-card" style="margin-bottom:16px;">
        <div class="wb-field">
          <label for="help-search">${renderSvgIcon("search", { size: 16 })}<span>Tìm kiếm hướng dẫn nhanh</span></label>
          <input type="search" id="help-search" class="wb-input" placeholder="Nhập từ khóa (ví dụ: PDF, hình ảnh, trang web, quyền riêng tư, phản hồi)...">
        </div>
      </div>

      <div id="help-groups-container">
        <article class="wb-policy-section wb-help-block" data-search="huong dan su dung dich van ban tai lieu trang web hinh anh">
          <h2>${renderSvgIcon("book", { size: 20 })}<span>1. Hướng dẫn sử dụng</span></h2>
          <ul>
            <li><a href="/dich-van-ban" data-view="text"><strong>Dịch văn bản:</strong></a> Chọn ngôn ngữ nguồn (hoặc tự động nhận diện), ngôn ngữ đích, lĩnh vực chuyên ngành rồi bấm Dịch văn bản.</li>
            <li><a href="/dich-tai-lieu" data-view="document"><strong>Dịch tài liệu:</strong></a> Kéo thả tệp PDF, DOCX, DOC, PPTX, XLSX, CSV hoặc TXT (tối đa 50 MB) và tải trực tiếp tệp kết quả.</li>
            <li><a href="/dich-trang-web" data-view="website"><strong>Dịch trang web:</strong></a> Dán địa chỉ URL công khai (https://...) để xem bản dịch trong khung an toàn.</li>
            <li><a href="/dich-hinh-anh" data-view="image"><strong>Dịch hình ảnh:</strong></a> Tải ảnh JPG, JPEG, PNG hoặc WEBP (tối đa 10 MB) để nhận diện chữ và xem bản dịch song song.</li>
          </ul>
        </article>

        <article class="wb-policy-section wb-help-block" data-search="xu ly su co loi pdf ma hoa mang cham vuot dung luong">
          <h2>${renderSvgIcon("alert", { size: 20 })}<span>2. Xử lý sự cố</span></h2>
          <ul>
            <li><strong>Tệp PDF bị báo mã hóa:</strong> Vui lòng gỡ mật khẩu bảo vệ PDF trước khi tải lên.</li>
            <li><strong>Tệp PDF dạng ảnh quét không có lớp chữ:</strong> Hãy chuyển từng trang sang ảnh PNG/JPG và dùng mục <a href="/dich-hinh-anh" data-view="image">Dịch hình ảnh</a>.</li>
            <li><strong>Không dịch được trang web:</strong> Một số website yêu cầu đăng nhập hoặc chặn truy cập tự động; hệ thống cũng chặn địa chỉ mạng nội bộ để bảo mật.</li>
            <li><strong>Báo lỗi máy chủ dịch tạm thời (503):</strong> Bộ máy dịch thuật tự vận hành đang nạp mô hình hoặc bảo trì; vui lòng thử lại sau ít phút.</li>
          </ul>
        </article>

        <article class="wb-policy-section wb-help-block" data-search="tai khoan bao mat quyen rieng tu zero user data storage">
          <h2>${renderSvgIcon("shield", { size: 20 })}<span>3. Tài khoản và Bảo mật</span></h2>
          <p>Bạn có thể sử dụng Dịch thuật Word Bridge trực tiếp mà không cần đăng nhập. Toàn bộ nội dung dịch được xử lý trong RAM và xóa ngay sau khi hoàn tất. Xem chi tiết tại <a href="/quyen-rieng-tu" data-view="privacy">Quyền riêng tư và Điều khoản</a>.</p>
        </article>

        <article class="wb-policy-section wb-help-block" data-search="cau hoi thuong gap faq luu tru doc ngon ngu">
          <h2>${renderSvgIcon("help", { size: 20 })}<span>4. Câu hỏi thường gặp</span></h2>
          <div class="wb-faq-item">
            <button type="button" class="wb-faq-btn" aria-expanded="false"><span>Word Bridge Translation có lưu nội dung tôi đã dịch không?</span>${renderSvgIcon("chevron-down", { size: 16 })}</button>
            <div class="wb-faq-body">Không. Theo chính sách Zero User Data Storage, văn bản, tài liệu, hình ảnh và kết quả dịch chỉ tồn tại tạm thời trên RAM trong suốt phiên xử lý rồi được giải phóng ngay.</div>
          </div>
          <div class="wb-faq-item">
            <button type="button" class="wb-faq-btn" aria-expanded="false"><span>Vì sao tệp .DOC đời cũ xuất ra định dạng .TXT?</span>${renderSvgIcon("chevron-down", { size: 16 })}</button>
            <div class="wb-faq-body">Định dạng nhị phân .DOC đời cũ không hỗ trợ tái cấu trúc XML như .DOCX, do đó hệ thống trích xuất toàn bộ nội dung văn bản và xuất tệp .TXT chuẩn UTF-8. Nếu muốn giữ cấu trúc tài liệu, bạn nên lưu tệp dưới dạng .DOCX trước khi dịch.</div>
          </div>
          <div class="wb-faq-item">
            <button type="button" class="wb-faq-btn" aria-expanded="false"><span>20 lĩnh vực chuyên ngành có tác dụng gì?</span>${renderSvgIcon("chevron-down", { size: 16 })}</button>
            <div class="wb-faq-body">Khi bạn chọn lĩnh vực (ví dụ Pháp lý, Y tế, Tài chính, Công nghệ thông tin), hệ thống áp dụng bộ thuật ngữ chuyên ngành tương ứng trong quá trình tiền xử lý và hậu xử lý bản dịch.</div>
          </div>
        </article>

        <article class="wb-policy-section wb-help-block" data-search="ho tro giai dap email lien he wordbridge">
          <h2>${renderSvgIcon("mail", { size: 20 })}<span>5. Hỗ trợ và giải đáp</span></h2>
          <p>Kênh tiếp nhận hỗ trợ kỹ thuật chính thức và duy nhất của Word Bridge Translation là hộp thư <strong>wordbridge.education@gmail.com</strong>.</p>
        </article>

        <article class="wb-policy-section wb-help-block" data-search="gui y kien phan hoi bao loi de xuat">
          <h2>${renderSvgIcon("feedback", { size: 20 })}<span>6. Gửi ý kiến phản hồi</span></h2>
          <p>Nếu bạn phát hiện lỗi kỹ thuật, muốn đề xuất ngôn ngữ mới hoặc cần hỗ trợ chuyên sâu, hãy gửi biểu mẫu trực tuyến để hệ thống tự động chuyển thư đến đội ngũ kỹ thuật.</p>
          <a href="/phan-hoi" class="wb-btn wb-btn-primary" data-view="feedback" style="margin-top:8px;">${renderSvgIcon("send", { size: 16 })}<span>Mở biểu mẫu Gửi ý kiến phản hồi</span></a>
        </article>
      </div>
    </section>

    <!-- 08. GỬI Ý KIẾN PHẢN HỒI -->
    <section id="view-feedback" class="wb-view${view === "feedback" ? " is-active" : ""}" aria-label="Gửi ý kiến phản hồi">
      <div class="wb-page-head">
        <h1>${renderSvgIcon("feedback", { size: 24 })}<span>Gửi ý kiến phản hồi</span></h1>
        <p>Mọi phản hồi được chuyển email tự động tới địa chỉ chính thức wordbridge.education@gmail.com và không lưu vào cơ sở dữ liệu dịch thuật.</p>
      </div>

      <div class="wb-card">
        <form id="feedback-form" novalidate>
          <input type="text" id="fb-trap" class="wb-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
          <div class="wb-form-grid">
            <div class="wb-field">
              <label for="fb-type">${renderSvgIcon("info", { size: 16 })}<span>Loại phản hồi *</span></label>
              <select id="fb-type" class="wb-select" required>${feedbackOptionsHtml}</select>
            </div>
            <div class="wb-field">
              <label for="fb-email">${renderSvgIcon("mail", { size: 16 })}<span>Email liên hệ (tùy chọn)</span></label>
              <input type="email" id="fb-email" class="wb-input" placeholder="ban@example.com">
            </div>
          </div>

          <div class="wb-field" style="margin-top:14px;">
            <label for="fb-title">${renderSvgIcon("text", { size: 16 })}<span>Tiêu đề *</span></label>
            <input type="text" id="fb-title" class="wb-input" maxlength="200" required placeholder="Tóm tắt ngắn gọn nội dung phản hồi (3 – 200 ký tự)">
          </div>

          <div class="wb-field" style="margin-top:14px;">
            <label for="fb-message">${renderSvgIcon("feedback", { size: 16 })}<span>Nội dung chi tiết *</span></label>
            <textarea id="fb-message" class="wb-textarea" rows="6" maxlength="2000" required placeholder="Mô tả chi tiết vấn đề, bước tái hiện hoặc đề xuất của bạn (10 – 2.000 ký tự)..."></textarea>
            <small id="fb-char-count" style="color:var(--wb-muted);">0 / 2.000 ký tự</small>
          </div>

          <div class="wb-field" style="margin-top:14px;">
            <label for="fb-file">${renderSvgIcon("attach", { size: 16 })}<span>Tệp đính kèm tùy chọn (JPG, JPEG, PNG, PDF — tối đa 10 MB)</span></label>
            <input type="file" id="fb-file" class="wb-input" accept=".jpg,.jpeg,.png,.pdf">
          </div>

          <div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap;">
            <button type="button" id="btn-reset-fb" class="wb-btn">${renderSvgIcon("refresh", { size: 16 })}<span>Làm mới</span></button>
            <button type="submit" id="btn-submit-fb" class="wb-btn wb-btn-primary">${renderSvgIcon("send", { size: 16 })}<span>Gửi phản hồi</span></button>
          </div>
          <div id="fb-status" class="wb-status" role="status"></div>
        </form>
      </div>
    </section>
  </main>

  <footer class="wb-footer">
    <div class="wb-footer-inner">
      <div class="wb-footer-brand">
        ${LOGO_HORIZONTAL_LIGHT_SVG}
        <span style="font-size:0.86rem;color:var(--wb-muted);">Dịch thuật Word Bridge – TRANS · Hệ sinh thái Word Bridge</span>
      </div>
      <div class="wb-footer-links" aria-label="Liên kết chân trang">
        <a href="/gioi-thieu" data-view="about">${renderSvgIcon("info", { size: 16 })}<span>Giới thiệu về Word Bridge Translation</span></a>
        <a href="/quyen-rieng-tu" data-view="privacy">${renderSvgIcon("shield", { size: 16 })}<span>Quyền riêng tư và Điều khoản</span></a>
        <a href="/tro-giup" data-view="help">${renderSvgIcon("help", { size: 16 })}<span>Trợ giúp</span></a>
        <a href="/phan-hoi" data-view="feedback">${renderSvgIcon("feedback", { size: 16 })}<span>Gửi ý kiến phản hồi</span></a>
      </div>
    </div>
    <div class="wb-footer-meta">
      <span>© ${new Date().getFullYear()} Word Bridge Ecosystem · Dịch thuật Word Bridge (TRANS) · Hỗ trợ: wordbridge.education@gmail.com</span>
      <span>Tổng lượt truy cập: <strong id="wb-total-accesses">${Number(totalAccesses || 0).toLocaleString("vi-VN")}</strong></span>
    </div>
  </footer>

  <script>
    (function() {
      const LANGUAGES = ${safeLanguagesJson};
      const DOMAINS = ${safeDomainsJson};
      const VIEW_TO_PATH = {
        text: "/dich-van-ban",
        document: "/dich-tai-lieu",
        website: "/dich-trang-web",
        image: "/dich-hinh-anh",
        about: "/gioi-thieu",
        privacy: "/quyen-rieng-tu",
        help: "/tro-giup",
        feedback: "/phan-hoi"
      };
      const PATH_TO_VIEW = {
        "/": "text",
        "/dich-van-ban": "text",
        "/dich-tai-lieu": "document",
        "/dich-trang-web": "website",
        "/dich-hinh-anh": "image",
        "/gioi-thieu": "about",
        "/quyen-rieng-tu": "privacy",
        "/tro-giup": "help",
        "/phan-hoi": "feedback"
      };

      let selectedDocFile = null;
      let lastDocDownload = null;
      let selectedImgFile = null;
      let lastImgResultText = "";

      function byId(id) { return document.getElementById(id); }

      function setStatus(id, type, message) {
        const el = byId(id);
        if (!el) return;
        if (!message) { el.className = "wb-status"; el.textContent = ""; return; }
        el.className = "wb-status is-visible" + (type === "error" ? " is-error" : type === "success" ? " is-success" : "");
        el.textContent = message;
      }

      function populateSelects() {
        const srcIds = ["text-src-lang", "doc-src-lang", "web-src-lang", "img-src-lang"];
        const tgtIds = ["text-tgt-lang", "doc-tgt-lang", "web-tgt-lang", "img-tgt-lang"];
        const domIds = ["text-domain", "doc-domain", "web-domain", "img-domain"];

        srcIds.forEach(function(id) {
          const sel = byId(id);
          if (!sel) return;
          sel.innerHTML = '<option value="auto">Tự động nhận diện</option>' +
            LANGUAGES.map(function(l) { return '<option value="' + l.code + '">' + l.nameVi + ' (' + l.nativeName + ')</option>'; }).join("");
          sel.value = "auto";
        });

        tgtIds.forEach(function(id) {
          const sel = byId(id);
          if (!sel) return;
          sel.innerHTML = LANGUAGES.map(function(l) { return '<option value="' + l.code + '">' + l.nameVi + ' (' + l.nativeName + ')</option>'; }).join("");
          sel.value = "vi";
        });

        domIds.forEach(function(id) {
          const sel = byId(id);
          if (!sel) return;
          sel.innerHTML = DOMAINS.map(function(d) { return '<option value="' + d.id + '">' + d.nameVi + '</option>'; }).join("");
          sel.value = "general";
        });
      }

      function switchView(viewName, skipPush) {
        document.querySelectorAll(".wb-view").forEach(function(el) {
          el.classList.toggle("is-active", el.id === "view-" + viewName);
        });
        document.querySelectorAll(".wb-nav-link").forEach(function(el) {
          const active = el.getAttribute("data-view") === viewName;
          el.classList.toggle("is-active", active);
          el.setAttribute("aria-current", active ? "page" : "false");
        });
        if (!skipPush && VIEW_TO_PATH[viewName]) {
          window.history.pushState({ view: viewName }, "", VIEW_TO_PATH[viewName]);
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      document.addEventListener("click", function(evt) {
        const link = evt.target.closest("a[data-view]");
        if (!link) return;
        evt.preventDefault();
        switchView(link.getAttribute("data-view"), false);
      });

      window.addEventListener("popstate", function() {
        const v = PATH_TO_VIEW[window.location.pathname] || "text";
        switchView(v, true);
      });

      function wireSwap(btnId, srcId, tgtId) {
        const btn = byId(btnId);
        if (!btn) return;
        btn.addEventListener("click", function() {
          const s = byId(srcId), t = byId(tgtId);
          if (!s || !t || s.value === "auto") return;
          const tmp = s.value;
          s.value = t.value;
          t.value = tmp;
        });
      }

      function fileToBase64(file) {
        return new Promise(function(resolve, reject) {
          const reader = new FileReader();
          reader.onload = function() {
            const res = String(reader.result || "");
            const idx = res.indexOf(",");
            resolve(idx >= 0 ? res.slice(idx + 1) : res);
          };
          reader.onerror = function() { reject(new Error("Không thể đọc tệp.")); };
          reader.readAsDataURL(file);
        });
      }

      // 1. Dịch văn bản
      const textInput = byId("text-input");
      if (textInput) {
        textInput.addEventListener("input", function() {
          byId("text-char-count").textContent = textInput.value.length.toLocaleString("vi-VN") + " / 15.000 ký tự";
        });
      }
      byId("btn-clear-text").addEventListener("click", function() {
        textInput.value = "";
        byId("text-char-count").textContent = "0 / 15.000 ký tự";
        const out = byId("text-output");
        out.textContent = "Bản dịch sẽ hiển thị tại đây.";
        out.classList.add("wb-output-placeholder");
        byId("text-detected-badge").textContent = "";
        byId("text-provider-badge").textContent = "";
        byId("text-stats-meta").textContent = "";
        setStatus("text-status", "", "");
      });

      byId("btn-run-text").addEventListener("click", async function() {
        const text = textInput.value;
        if (!text.trim()) {
          setStatus("text-status", "error", "Vui lòng nhập văn bản cần dịch.");
          return;
        }
        const btn = byId("btn-run-text");
        btn.disabled = true;
        setStatus("text-status", "info", "Đang xử lý dịch văn bản trên bộ nhớ tạm...");
        try {
          const res = await fetch("/api/v1/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: text,
              sourceLang: byId("text-src-lang").value,
              targetLang: byId("text-tgt-lang").value,
              domain: byId("text-domain").value
            })
          });
          const data = await res.json();
          if (!res.ok || !data.ok) {
            setStatus("text-status", "error", data.message || "Không thể dịch văn bản lúc này.");
          } else {
            const out = byId("text-output");
            out.textContent = data.translatedText;
            out.classList.remove("wb-output-placeholder");
            if (data.detectedLanguage) {
              byId("text-detected-badge").textContent = "Nhận diện: " + data.detectedLanguage.nameVi;
            }
            byId("text-provider-badge").textContent = data.provider || "";
            byId("text-stats-meta").textContent = (data.stats ? data.stats.words + " từ · " : "") + (data.durationMs || 0) + " ms";
            setStatus("text-status", "success", "Đã dịch xong trên bộ nhớ tạm.");
          }
        } catch (_) {
          setStatus("text-status", "error", "Lỗi kết nối tới máy chủ API dịch thuật.");
        } finally {
          btn.disabled = false;
        }
      });

      byId("btn-copy-text").addEventListener("click", async function() {
        const out = byId("text-output");
        if (out.classList.contains("wb-output-placeholder") || !out.textContent.trim()) return;
        try {
          await navigator.clipboard.writeText(out.textContent);
          setStatus("text-status", "success", "Đã sao chép bản dịch vào bộ nhớ tạm.");
        } catch (_) {
          setStatus("text-status", "error", "Trình duyệt không cho phép sao chép tự động.");
        }
      });

      byId("btn-expand-text").addEventListener("click", function() {
        byId("text-output-pane").classList.toggle("wb-fullscreen");
      });

      function speakText(text, langCode) {
        if (!text || !text.trim()) return;
        if (!("speechSynthesis" in window)) {
          setStatus("text-status", "error", "Trình duyệt hiện tại không hỗ trợ phát âm.");
          return;
        }
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text.slice(0, 1000));
        if (langCode && langCode !== "auto") utt.lang = langCode;
        window.speechSynthesis.speak(utt);
      }
      byId("btn-speak-src").addEventListener("click", function() { speakText(textInput.value, byId("text-src-lang").value); });
      byId("btn-speak-tgt").addEventListener("click", function() {
        const out = byId("text-output");
        if (!out.classList.contains("wb-output-placeholder")) speakText(out.textContent, byId("text-tgt-lang").value);
      });

      // 2. Dịch tài liệu
      function wireDropzone(zoneId, inputId, onFile) {
        const zone = byId(zoneId), inp = byId(inputId);
        zone.addEventListener("click", function() { inp.click(); });
        zone.addEventListener("keydown", function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inp.click(); } });
        zone.addEventListener("dragover", function(e) { e.preventDefault(); zone.classList.add("is-drag"); });
        zone.addEventListener("dragleave", function() { zone.classList.remove("is-drag"); });
        zone.addEventListener("drop", function(e) {
          e.preventDefault(); zone.classList.remove("is-drag");
          if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
        });
        inp.addEventListener("change", function() { if (inp.files && inp.files[0]) onFile(inp.files[0]); });
      }

      wireDropzone("doc-dropzone", "doc-file-input", function(file) {
        selectedDocFile = file;
        byId("doc-file-label").textContent = "Đã chọn: " + file.name + " (" + (file.size / 1024).toFixed(1) + " KB)";
        byId("btn-download-doc").style.display = "none";
        setStatus("doc-status", "", "");
      });

      byId("btn-run-doc").addEventListener("click", async function() {
        if (!selectedDocFile) { setStatus("doc-status", "error", "Vui lòng chọn tệp tài liệu trước."); return; }
        const btn = byId("btn-run-doc");
        btn.disabled = true;
        setStatus("doc-status", "info", "Đang trích xuất và dịch tài liệu trên RAM...");
        try {
          const b64 = await fileToBase64(selectedDocFile);
          const res = await fetch("/api/v1/translate/document", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: selectedDocFile.name,
              fileBase64: b64,
              sourceLang: byId("doc-src-lang").value,
              targetLang: byId("doc-tgt-lang").value,
              domain: byId("doc-domain").value
            })
          });
          const data = await res.json();
          if (!res.ok || !data.ok) {
            setStatus("doc-status", "error", data.message || "Không thể dịch tài liệu.");
          } else {
            lastDocDownload = data;
            byId("btn-download-doc").style.display = "inline-flex";
            byId("doc-preview-wrap").style.display = "block";
            byId("doc-preview").textContent = data.previewText || "";
            setStatus("doc-status", "success", data.formatNotice || "Đã dịch tài liệu thành công.");
          }
        } catch (_) {
          setStatus("doc-status", "error", "Lỗi kết nối khi dịch tài liệu.");
        } finally {
          btn.disabled = false;
        }
      });

      byId("btn-download-doc").addEventListener("click", function() {
        if (!lastDocDownload || !lastDocDownload.outputBase64) return;
        const bin = atob(lastDocDownload.outputBase64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: lastDocDownload.outputMimeType || "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = lastDocDownload.outputFilename || "translated_document";
        a.click();
        setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
      });

      // 3. Dịch trang web
      byId("btn-run-web").addEventListener("click", async function() {
        const targetUrl = byId("web-url-input").value.trim();
        if (!targetUrl) { setStatus("web-status", "error", "Vui lòng nhập địa chỉ URL trang web."); return; }
        const btn = byId("btn-run-web");
        btn.disabled = true;
        setStatus("web-status", "info", "Đang kiểm tra bảo mật, tải và dịch trang web...");
        try {
          const res = await fetch("/api/v1/translate/website", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: targetUrl,
              sourceLang: byId("web-src-lang").value,
              targetLang: byId("web-tgt-lang").value,
              domain: byId("web-domain").value
            })
          });
          const data = await res.json();
          if (!res.ok || !data.ok) {
            setStatus("web-status", "error", data.message || "Không thể dịch trang web này.");
            byId("web-result-frame").style.display = "none";
          } else {
            const frame = byId("web-result-frame");
            frame.srcdoc = data.translatedHtml;
            frame.style.display = "block";
            setStatus("web-status", "success", "Đã dịch và làm sạch nội dung trang web an toàn (" + (data.translatedNodes || 0) + " khối văn bản).");
          }
        } catch (_) {
          setStatus("web-status", "error", "Lỗi kết nối khi dịch trang web.");
        } finally {
          btn.disabled = false;
        }
      });

      // 4. Dịch hình ảnh
      wireDropzone("img-dropzone", "img-file-input", function(file) {
        selectedImgFile = file;
        byId("img-file-label").textContent = "Đã chọn ảnh: " + file.name + " (" + (file.size / 1024).toFixed(1) + " KB)";
        const prev = byId("img-preview");
        prev.src = URL.createObjectURL(file);
        prev.style.display = "block";
        setStatus("img-status", "", "");
      });

      byId("btn-run-img").addEventListener("click", async function() {
        if (!selectedImgFile) { setStatus("img-status", "error", "Vui lòng chọn hình ảnh trước."); return; }
        const btn = byId("btn-run-img");
        btn.disabled = true;
        setStatus("img-status", "info", "Đang nhận diện văn bản trong hình ảnh và dịch...");
        try {
          const b64 = await fileToBase64(selectedImgFile);
          const res = await fetch("/api/v1/translate/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: selectedImgFile.name,
              imageBase64: b64,
              sourceLang: byId("img-src-lang").value,
              targetLang: byId("img-tgt-lang").value,
              domain: byId("img-domain").value
            })
          });
          const data = await res.json();
          if (!res.ok || !data.ok) {
            setStatus("img-status", "error", data.message || "Không thể dịch hình ảnh.");
          } else {
            lastImgResultText = data.translatedText || "";
            byId("img-extracted-text").textContent = data.extractedText || "";
            byId("img-translated-text").textContent = lastImgResultText;
            byId("img-results-grid").style.display = "grid";
            byId("btn-copy-img").style.display = "inline-flex";
            byId("btn-download-img").style.display = "inline-flex";
            setStatus("img-status", "success", "Đã nhận diện văn bản và dịch hình ảnh thành công.");
          }
        } catch (_) {
          setStatus("img-status", "error", "Lỗi kết nối khi dịch hình ảnh.");
        } finally {
          btn.disabled = false;
        }
      });

      byId("btn-copy-img").addEventListener("click", async function() {
        if (!lastImgResultText) return;
        try {
          await navigator.clipboard.writeText(lastImgResultText);
          setStatus("img-status", "success", "Đã sao chép bản dịch hình ảnh.");
        } catch (_) {}
      });

      byId("btn-download-img").addEventListener("click", function() {
        if (!lastImgResultText) return;
        const blob = new Blob([lastImgResultText], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "wordbridge_image_translation.txt";
        a.click();
        setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
      });

      // 7. Trợ giúp — Tìm kiếm & FAQ đóng/mở
      document.querySelectorAll(".wb-faq-btn").forEach(function(btn) {
        btn.addEventListener("click", function() {
          const item = btn.closest(".wb-faq-item");
          const open = item.classList.toggle("is-open");
          btn.setAttribute("aria-expanded", open ? "true" : "false");
        });
      });
      const helpSearch = byId("help-search");
      if (helpSearch) {
        helpSearch.addEventListener("input", function() {
          const q = helpSearch.value.trim().toLowerCase();
          document.querySelectorAll(".wb-help-block").forEach(function(block) {
            const hay = (block.textContent + " " + (block.getAttribute("data-search") || "")).toLowerCase();
            block.style.display = !q || hay.includes(q) ? "block" : "none";
          });
        });
      }

      // 8. Gửi ý kiến phản hồi
      const fbMsg = byId("fb-message");
      if (fbMsg) {
        fbMsg.addEventListener("input", function() {
          byId("fb-char-count").textContent = fbMsg.value.length.toLocaleString("vi-VN") + " / 2.000 ký tự";
        });
      }
      byId("btn-reset-fb").addEventListener("click", function() {
        byId("feedback-form").reset();
        byId("fb-char-count").textContent = "0 / 2.000 ký tự";
        setStatus("fb-status", "", "");
      });
      byId("feedback-form").addEventListener("submit", async function(e) {
        e.preventDefault();
        const btn = byId("btn-submit-fb");
        btn.disabled = true;
        setStatus("fb-status", "info", "Đang gửi phản hồi qua máy chủ email độc lập...");
        try {
          let attB64 = "";
          let attName = "";
          const fileInput = byId("fb-file");
          if (fileInput.files && fileInput.files[0]) {
            attName = fileInput.files[0].name;
            attB64 = await fileToBase64(fileInput.files[0]);
          }
          const res = await fetch("/api/v1/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              feedbackType: byId("fb-type").value,
              title: byId("fb-title").value,
              message: byId("fb-message").value,
              contactEmail: byId("fb-email").value,
              websiteTrap: byId("fb-trap").value,
              attachmentFilename: attName,
              attachmentBase64: attB64
            })
          });
          const data = await res.json();
          if (!res.ok || !data.ok) {
            setStatus("fb-status", "error", data.message || "Không thể gửi phản hồi lúc này.");
          } else {
            setStatus("fb-status", "success", data.message || "Đã gửi phản hồi thành công.");
            byId("feedback-form").reset();
            byId("fb-char-count").textContent = "0 / 2.000 ký tự";
          }
        } catch (_) {
          setStatus("fb-status", "error", "Lỗi kết nối tới máy chủ phản hồi.");
        } finally {
          btn.disabled = false;
        }
      });

      populateSelects();
      wireSwap("btn-swap-text", "text-src-lang", "text-tgt-lang");
      wireSwap("btn-swap-doc", "doc-src-lang", "doc-tgt-lang");
      wireSwap("btn-swap-web", "web-src-lang", "web-tgt-lang");
      wireSwap("btn-swap-img", "img-src-lang", "img-tgt-lang");
    })();
  </script>
</body>
</html>`;
}
