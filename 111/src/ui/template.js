/**
 * @file src/ui/template.js
 * @description Giao diện Người dùng Hoàn chỉnh (Full UI Implementation) cho Word Bridge Translation
 * Đối chiếu chính xác 100% với 08 hình ảnh thiết kế tham khảo đã thống nhất:
 *   1. Giao diện trang Dịch văn bản (image_42d121.jpg)
 *   2. Giao diện trang Dịch tài liệu (image_42d13d.jpg)
 *   3. Giao diện trang Dịch trang web (image_42d15f.jpg)
 *   4. Giao diện trang Dịch hình ảnh (image_42d17a.jpg)
 *   5. Giao diện Giới thiệu về Word Bridge Translation (image_442e5d.jpg)
 *   6. Giao diện Quyền riêng tư và Điều khoản (image_442e3d.jpg)
 *   7. Giao diện Trợ giúp - Trung tâm hỗ trợ (image_44444c.jpg)
 *   8. Giao diện Gửi ý kiến phản hồi tới wordbridge.education@gmail.com (image_449a5e.jpg)
 *
 * CAM KẾT ZERO USER DATA STORAGE:
 *   - Không sử dụng localStorage, sessionStorage, indexedDB, document.cookie hay Cache API để lưu dữ liệu dịch.
 */

import { GLOBAL_LANGUAGES } from "../services/languages.js";
import { SPECIALIZED_DOMAINS } from "../services/domains.js";
import { FEEDBACK_TYPES, OFFICIAL_SUPPORT_EMAIL } from "../services/feedback-mailer.js";
import { WORD_BRIDGE_LOGO_SVG, FEATURE_ICONS_SVG } from "./assets.js";

const VIEW_SEO_METADATA = Object.freeze({
  text: {
    title: "Dịch văn bản – Dịch thuật Word Bridge (TRANS) | dichthuat.wordbridge.io.vn",
    description: "Dịch văn bản trực tuyến nhanh chóng, chính xác giữa hơn 100 ngôn ngữ và 20 lĩnh vực chuyên ngành với chính sách Zero User Data Storage."
  },
  document: {
    title: "Dịch tài liệu (PDF, DOCX, PPTX, XLSX, CSV, TXT) – Dịch thuật Word Bridge",
    description: "Tải tài liệu lên để dịch nhanh và chính xác, giữ nguyên bố cục, bảng biểu và định dạng trên bộ nhớ tạm."
  },
  website: {
    title: "Dịch trang web trực tuyến – Dịch thuật Word Bridge (TRANS)",
    description: "Dịch toàn bộ nội dung của một trang web sang ngôn ngữ bạn chọn, giữ nguyên bố cục và liên kết với bộ lọc chống SSRF."
  },
  image: {
    title: "Dịch hình ảnh & Nhận diện OCR (JPG, PNG, WEBP) – Dịch thuật Word Bridge",
    description: "Nhận diện văn bản trong ảnh và dịch sang hơn 100 ngôn ngữ, giữ nguyên bố cục nội dung."
  },
  about: {
    title: "Giới thiệu về Word Bridge Translation – Hệ sinh thái Word Bridge",
    description: "Word Bridge Translation là công cụ dịch thuật trực tuyến của Word Bridge, giúp bạn chuyển đổi ngôn ngữ nhanh chóng, chính xác và an toàn."
  },
  privacy: {
    title: "Quyền riêng tư và Điều khoản – Word Bridge Translation",
    description: "Cam kết bảo vệ dữ liệu cá nhân, chính sách Zero User Data Storage, quyền lợi người dùng và quy định khi sử dụng Word Bridge Translation."
  },
  help: {
    title: "Trợ giúp & Trung tâm Hỗ trợ – Word Bridge Translation",
    description: "Hướng dẫn sử dụng, xử lý sự cố, câu hỏi thường gặp (FAQ) và hỗ trợ người dùng Word Bridge Translation."
  },
  feedback: {
    title: "Gửi ý kiến phản hồi – Word Bridge Translation (wordbridge.education@gmail.com)",
    description: "Chia sẻ ý kiến, góp ý hoặc báo cáo vấn đề kỹ thuật trực tiếp tới đội ngũ Word Bridge Translation."
  }
});

export function renderTranslationAppHtml({
  initialView = "text",
  totalAccesses = 0,
  providerStatus = {}
} = {}) {
  const safeView = VIEW_SEO_METADATA[initialView] ? initialView : "text";
  const seo = VIEW_SEO_METADATA[safeView];
  const languagesJson = JSON.stringify(GLOBAL_LANGUAGES);
  const domainsJson = JSON.stringify(SPECIALIZED_DOMAINS);
  const feedbackTypesJson = JSON.stringify(FEEDBACK_TYPES);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${seo.title}</title>
  <meta name="description" content="${seo.description}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://dichthuat.wordbridge.io.vn/" />
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Dịch thuật Word Bridge (TRANS)" />
  <meta property="og:title" content="${seo.title}" />
  <meta property="og:description" content="${seo.description}" />
  <meta property="og:url" content="https://dichthuat.wordbridge.io.vn/" />
  <meta property="og:image" content="https://dichthuat.wordbridge.io.vn/assets/og-banner.svg" />
  <style>
    :root {
      --wb-blue: #0b63e5;
      --wb-blue-dark: #084bb5;
      --wb-blue-soft: #eef4ff;
      --wb-blue-border: #bfdbfe;
      --wb-teal: #084c59;
      --wb-red: #d91c24;
      --wb-bg-top: #f3f7fc;
      --wb-bg-bottom: #e9f1fb;
      --wb-surface: #ffffff;
      --wb-border: #dce5f0;
      --wb-text: #0f172a;
      --wb-muted: #52637a;
      --wb-radius-lg: 20px;
      --wb-radius-md: 12px;
      --wb-shadow: 0 10px 35px rgba(15, 23, 42, 0.06);
    }

    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      background: linear-gradient(180deg, var(--wb-bg-top) 0%, var(--wb-bg-bottom) 100%);
      color: var(--wb-text);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 15px;
      line-height: 1.5;
      display: flex;
      flex-direction: column;
      -webkit-font-smoothing: antialiased;
    }

    /* 1. THANH ĐIỀU HƯỚNG CHÍNH THỐNG NHẤT (ĐỐI CHIẾU 08 ẢNH THIẾT KẾ) */
    .wb-navbar {
      background: var(--wb-surface);
      border-bottom: 1px solid var(--wb-border);
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 12px rgba(15, 23, 42, 0.03);
    }
    .wb-navbar-inner {
      max-width: 1340px;
      margin: 0 auto;
      padding: 0 22px;
      min-height: 68px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
    }
    .wb-brand-group {
      display: flex;
      align-items: center;
      gap: 14px;
      text-decoration: none;
      color: inherit;
    }
    .wb-brand-logo {
      height: 42px;
      width: auto;
      display: flex;
      align-items: center;
    }
    .wb-brand-logo img {
      height: 42px;
      width: auto;
      object-fit: contain;
    }
    .wb-brand-divider {
      width: 1px;
      height: 26px;
      background: #cbd5e1;
    }
    .wb-brand-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .wb-brand-title {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    .wb-badge-trans {
      background: var(--wb-red);
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 9px;
      border-radius: 999px;
      letter-spacing: 0.04em;
    }

    .wb-nav-links {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }
    .wb-nav-item {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 9px 14px;
      border-radius: 10px;
      border: none;
      background: transparent;
      color: #1e293b;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.16s ease;
    }
    .wb-nav-item:hover {
      background: #f1f5f9;
      color: var(--wb-blue);
    }
    .wb-nav-item.active {
      background: var(--wb-blue-soft);
      color: var(--wb-blue);
      font-weight: 700;
    }
    .wb-nav-item.active::after {
      content: "";
      position: absolute;
      left: 14px;
      right: 14px;
      bottom: -11px;
      height: 3px;
      border-radius: 3px 3px 0 0;
      background: var(--wb-blue);
    }
    .wb-app-launcher {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      border: 1px solid transparent;
      background: transparent;
      color: #334155;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .wb-app-launcher:hover {
      background: #f1f5f9;
    }
    .wb-launcher-menu {
      position: absolute;
      top: 48px;
      right: 0;
      width: 270px;
      background: #ffffff;
      border: 1px solid var(--wb-border);
      border-radius: 14px;
      box-shadow: 0 14px 32px rgba(15, 23, 42, 0.12);
      padding: 12px;
      display: none;
      z-index: 200;
      text-align: left;
    }
    .wb-launcher-menu.open {
      display: block;
    }
    .wb-launcher-link {
      display: flex;
      flex-direction: column;
      padding: 9px 11px;
      border-radius: 9px;
      text-decoration: none;
      color: var(--wb-text);
      font-size: 13px;
    }
    .wb-launcher-link:hover {
      background: var(--wb-blue-soft);
    }

    /* KHUNG NỘI DUNG CHÍNH */
    .wb-page-container {
      max-width: 1260px;
      width: 100%;
      margin: 26px auto 36px;
      padding: 0 22px;
      flex: 1;
    }
    .wb-view-section {
      display: none;
    }
    .wb-view-section.active {
      display: block;
    }

    /* CARD TRẮNG BO GÓC CHUẨN THIẾT KẾ */
    .wb-main-card {
      background: var(--wb-surface);
      border: 1px solid var(--wb-border);
      border-radius: var(--wb-radius-lg);
      box-shadow: var(--wb-shadow);
      padding: 26px 28px;
    }

    /* THANH CHỌN NGÔN NGỮ CHUẨN (image_42d121.jpg) */
    .wb-lang-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 16px;
      margin-bottom: 18px;
    }
    .wb-select-box {
      position: relative;
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 4px 12px;
      min-height: 46px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .wb-select-box:focus-within {
      border-color: var(--wb-blue);
      box-shadow: 0 0 0 3px rgba(11, 99, 229, 0.12);
    }
    .wb-select-icon {
      font-size: 17px;
      margin-right: 9px;
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
    }
    .wb-select-native {
      width: 100%;
      border: none;
      background: transparent;
      font-family: inherit;
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      outline: none;
      cursor: pointer;
    }
    .wb-swap-circle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: var(--wb-blue);
      font-size: 19px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.05);
      transition: all 0.18s ease;
    }
    .wb-swap-circle:hover {
      background: var(--wb-blue-soft);
      border-color: var(--wb-blue);
      transform: rotate(180deg);
    }

    /* KHUNG NHẬP & KHUNG KẾT QUẢ DỊCH VĂN BẢN (image_42d121.jpg) */
    .wb-text-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }
    .wb-text-panel {
      border: 1px solid #d5dfec;
      border-radius: 16px;
      padding: 16px 18px 12px;
      display: flex;
      flex-direction: column;
      min-height: 270px;
      background: #ffffff;
    }
    .wb-text-panel-target {
      background: #f8fafd;
    }
    .wb-textarea {
      width: 100%;
      flex: 1;
      border: none;
      resize: none;
      background: transparent;
      font-family: inherit;
      font-size: 16.5px;
      line-height: 1.6;
      color: #0f172a;
      outline: none;
    }
    .wb-textarea::placeholder {
      color: #64748b;
    }
    .wb-target-display {
      width: 100%;
      flex: 1;
      font-size: 16.5px;
      line-height: 1.6;
      color: #0f172a;
      white-space: pre-wrap;
      overflow-wrap: break-word;
    }
    .wb-target-display.placeholder {
      color: #64748b;
    }
    .wb-panel-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 10px;
      margin-top: 8px;
      color: #64748b;
      font-size: 13.5px;
    }
    .wb-icon-action {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: #334155;
      font-size: 17px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }
    .wb-icon-action:hover {
      background: #e2e8f0;
      color: var(--wb-blue);
    }

    /* NÚT HÀNH ĐỘNG CHÍNH MÀU XANH LAM (image_42d121 - image_449a5e) */
    .wb-btn-center-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
      margin-top: 22px;
      flex-wrap: wrap;
    }
    .wb-btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      padding: 12px 38px;
      min-width: 195px;
      border-radius: 12px;
      border: none;
      background: linear-gradient(180deg, #166ef3 0%, #0952c6 100%);
      color: #ffffff;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(11, 99, 229, 0.26);
      transition: transform 0.12s, box-shadow 0.15s;
      text-decoration: none;
    }
    .wb-btn-primary:hover {
      background: linear-gradient(180deg, #0d61e0 0%, #0745a8 100%);
      box-shadow: 0 8px 22px rgba(11, 99, 229, 0.34);
    }
    .wb-btn-outline {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 11px 22px;
      border-radius: 12px;
      border: 1px solid #93c5fd;
      background: #ffffff;
      color: var(--wb-blue);
      font-size: 14.5px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s;
    }
    .wb-btn-outline:hover {
      background: var(--wb-blue-soft);
    }

    /* HEADER TIÊU ĐỀ TRONG CARD (DỊCH TÀI LIỆU / TRANG WEB / HÌNH ẢNH) */
    .wb-section-head {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 20px;
    }
    .wb-section-icon-box {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: var(--wb-blue-soft);
      color: var(--wb-blue);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .wb-section-head h2 {
      margin: 0 0 3px 0;
      font-size: 23px;
      font-weight: 800;
      color: #0f172a;
    }
    .wb-section-head p {
      margin: 0;
      font-size: 14.5px;
      color: var(--wb-muted);
    }

    /* KHUNG KÉO THẢ TÀI LIỆU & HÌNH ẢNH (image_42d13d.jpg & image_42d17a.jpg) */
    .wb-dropzone-box {
      border: 1.5px dashed #7ab3ef;
      border-radius: 16px;
      background: #f8fbff;
      padding: 36px 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.18s ease;
    }
    .wb-dropzone-box:hover, .wb-dropzone-box.dragover {
      background: #eef6ff;
      border-color: var(--wb-blue);
    }
    .wb-dropzone-title {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 12px 0 6px;
    }
    .wb-dropzone-sub {
      font-size: 13.5px;
      color: #64748b;
      margin-bottom: 16px;
    }
    .wb-controls-3col {
      display: grid;
      grid-template-columns: 1fr auto 1fr 1fr;
      align-items: end;
      gap: 14px;
      margin-top: 20px;
    }
    .wb-field-label {
      display: block;
      font-size: 13.5px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 7px;
    }
    .wb-info-note-bar {
      margin-top: 20px;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      border-radius: 11px;
      padding: 11px 16px;
      font-size: 13.5px;
      color: #1e3a8a;
      display: flex;
      align-items: center;
      gap: 9px;
    }

    /* DỊCH TRANG WEB URL BAR (image_42d15f.jpg) */
    .wb-url-input-wrap {
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 6px 14px;
      min-height: 54px;
      margin-bottom: 18px;
    }
    .wb-url-input-wrap:focus-within {
      border-color: var(--wb-blue);
      box-shadow: 0 0 0 3px rgba(11, 99, 229, 0.12);
    }
    .wb-url-input {
      width: 100%;
      border: none;
      outline: none;
      font-size: 15.5px;
      color: #0f172a;
      padding: 0 10px;
      background: transparent;
    }

    /* DỊCH HÌNH ẢNH 2 CỘT (image_42d17a.jpg) */
    .wb-image-split {
      display: grid;
      grid-template-columns: 1.75fr 1fr;
      gap: 24px;
      align-items: center;
    }
    .wb-image-side-card {
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .wb-check-list {
      list-style: none;
      padding: 0;
      margin: 14px 0 0 0;
      width: 100%;
    }
    .wb-check-list li {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 9px;
    }
    .wb-green-tick {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #22c55e;
      color: #ffffff;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    /* GIAO DIỆN 5: GIỚI THIỆU (image_442e5d.jpg) */
    .wb-hero-banner {
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      gap: 28px;
      align-items: center;
      margin-bottom: 28px;
    }
    .wb-pill-tag {
      display: inline-block;
      background: #dbeafe;
      color: #1d4ed8;
      font-size: 13px;
      font-weight: 700;
      padding: 5px 14px;
      border-radius: 999px;
      margin-bottom: 12px;
    }
    .wb-hero-title {
      font-size: 34px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 12px 0;
      letter-spacing: -0.02em;
    }
    .wb-hero-desc {
      font-size: 16px;
      color: #334155;
      line-height: 1.65;
      margin: 0 0 20px 0;
    }
    .wb-feature-4grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin: 16px 0 32px;
    }
    .wb-pastel-card {
      border-radius: 16px;
      padding: 20px 18px;
      border: 1px solid rgba(15, 23, 42, 0.06);
      cursor: pointer;
      transition: transform 0.16s, box-shadow 0.16s;
    }
    .wb-pastel-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
    }
    .wb-pastel-blue { background: #edf4ff; }
    .wb-pastel-green { background: #eafaf1; }
    .wb-pastel-purple { background: #f3f0ff; }
    .wb-pastel-amber { background: #fff8eb; }
    .wb-why-5grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 14px;
      margin-top: 16px;
      background: #ffffff;
      border: 1px solid var(--wb-border);
      border-radius: 16px;
      padding: 20px;
    }
    .wb-why-item {
      padding: 4px 12px;
      border-right: 1px solid #e2e8f0;
    }
    .wb-why-item:last-child {
      border-right: none;
    }

    /* GIAO DIỆN 6: QUYỀN RIÊNG TƯ & ĐIỀU KHOẢN (image_442e3d.jpg) */
    .wb-accordion-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .wb-accordion-item {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
    }
    .wb-accordion-header {
      width: 100%;
      padding: 16px 20px;
      border: none;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      cursor: pointer;
      text-align: left;
    }
    .wb-accordion-header:hover {
      background: #f8fafc;
    }
    .wb-acc-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .wb-acc-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--wb-blue-soft);
      color: var(--wb-blue);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }
    .wb-accordion-body {
      display: none;
      padding: 0 20px 18px 78px;
      font-size: 14.5px;
      color: #334155;
      line-height: 1.65;
      border-top: 1px dashed #e2e8f0;
    }
    .wb-accordion-item.open .wb-accordion-body {
      display: block;
      padding-top: 14px;
    }

    /* GIAO DIỆN 7: TRỢ GIÚP (image_44444c.jpg) */
    .wb-help-search-bar {
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 999px;
      padding: 6px 8px 6px 18px;
      max-width: 620px;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
    }
    .wb-help-search-bar input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 15px;
      background: transparent;
    }
    .wb-help-bottom-grid {
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      gap: 20px;
      margin-top: 22px;
    }

    /* GIAO DIỆN 8: GỬI Ý KIẾN PHẢN HỒI (image_449a5e.jpg) */
    .wb-feedback-grid {
      display: grid;
      grid-template-columns: 1.45fr 1fr;
      gap: 22px;
      align-items: start;
    }
    .wb-form-input {
      width: 100%;
      padding: 12px 14px;
      border-radius: 11px;
      border: 1px solid #cbd5e1;
      font-family: inherit;
      font-size: 14.5px;
      color: #0f172a;
      outline: none;
      background: #ffffff;
    }
    .wb-form-input:focus {
      border-color: var(--wb-blue);
      box-shadow: 0 0 0 3px rgba(11, 99, 229, 0.12);
    }

    /* KHU VỰC HIỂN THỊ THÔNG BÁO & KẾT QUẢ */
    .wb-toast {
      margin-top: 16px;
      padding: 13px 18px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      display: none;
    }
    .wb-toast.show { display: block; }
    .wb-toast-error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
    .wb-toast-success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
    .wb-toast-info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }

    /* FOOTER THỐNG NHẤT TOÀN TRANG (ĐỐI CHIẾU 08 ẢNH) */
    .wb-footer {
      background: var(--wb-surface);
      border-top: 1px solid var(--wb-border);
      margin-top: auto;
    }
    .wb-footer-inner {
      max-width: 1340px;
      margin: 0 auto;
      padding: 14px 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .wb-footer-links {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .wb-footer-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 13px;
      border-radius: 9px;
      border: none;
      background: transparent;
      color: #334155;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
    }
    .wb-footer-link:hover, .wb-footer-link.active {
      background: var(--wb-blue-soft);
      color: var(--wb-blue);
    }

    @media (max-width: 980px) {
      .wb-text-grid,
      .wb-controls-3col,
      .wb-image-split,
      .wb-hero-banner,
      .wb-feature-4grid,
      .wb-why-5grid,
      .wb-help-bottom-grid,
      .wb-feedback-grid {
        grid-template-columns: 1fr;
      }
      .wb-lang-row {
        grid-template-columns: 1fr;
      }
      .wb-why-item {
        border-right: none;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 10px;
      }
    }
  </style>
</head>
<body>
  <!-- 1. THANH ĐIỀU HƯỚNG CHÍNH THỐNG NHẤT -->
  <header class="wb-navbar">
    <div class="wb-navbar-inner">
      <a href="/" class="wb-brand-group" onclick="event.preventDefault(); switchView('text');">
        <div class="wb-brand-logo">
          <img src="/assets/logo.jpg" alt="WORD BRIDGE" onerror="this.style.display='none'; this.parentElement.innerHTML=${JSON.stringify(WORD_BRIDGE_LOGO_SVG)};" />
        </div>
        <span class="wb-brand-divider"></span>
        <div class="wb-brand-title-wrap">
          <span class="wb-brand-title">Dịch thuật Word Bridge</span>
          <span class="wb-badge-trans">TRANS</span>
        </div>
      </a>

      <nav class="wb-nav-links" aria-label="Điều hướng chính">
        <a href="/dich-van-ban" class="wb-nav-item" id="navBtn_text" onclick="event.preventDefault(); switchView('text');">
          <span>${FEATURE_ICONS_SVG.text}</span>
          <span>Dịch văn bản</span>
        </a>
        <a href="/dich-tai-lieu" class="wb-nav-item" id="navBtn_document" onclick="event.preventDefault(); switchView('document');">
          <span>${FEATURE_ICONS_SVG.document}</span>
          <span>Dịch tài liệu</span>
        </a>
        <a href="/dich-trang-web" class="wb-nav-item" id="navBtn_website" onclick="event.preventDefault(); switchView('website');">
          <span>${FEATURE_ICONS_SVG.website}</span>
          <span>Dịch trang web</span>
        </a>
        <a href="/dich-hinh-anh" class="wb-nav-item" id="navBtn_image" onclick="event.preventDefault(); switchView('image');">
          <span>${FEATURE_ICONS_SVG.image}</span>
          <span>Dịch hình ảnh</span>
        </a>
        <a href="/quyen-rieng-tu" class="wb-nav-item" id="navBtn_privacy" onclick="event.preventDefault(); switchView('privacy');">
          <span>🛡️</span>
          <span>Quyền riêng tư &amp; Điều khoản</span>
        </a>
        <a href="/tro-giup" class="wb-nav-item" id="navBtn_help" onclick="event.preventDefault(); switchView('help');">
          <span>❓</span>
          <span>Trợ giúp</span>
        </a>

        <div class="wb-app-launcher" onclick="toggleLauncherMenu(event)" title="Hệ sinh thái Word Bridge">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <circle cx="5" cy="5" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="19" cy="5" r="2"/>
            <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
            <circle cx="5" cy="19" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
          </svg>
          <div class="wb-launcher-menu" id="wbLauncherMenu">
            <div style="font-size:11.5px;font-weight:800;color:#64748b;padding:4px 10px;text-transform:uppercase;">Hệ sinh thái Word Bridge</div>
            <a href="https://dichthuat.wordbridge.io.vn" class="wb-launcher-link" onclick="event.preventDefault(); switchView('text');">
              <strong>Word Bridge Translation (TRANS)</strong>
              <span style="color:#64748b;font-size:12px;">Hệ thống dịch thuật toàn cầu (104 ngôn ngữ)</span>
            </a>
            <a href="https://wordbridge.io.vn" target="_blank" rel="noopener noreferrer" class="wb-launcher-link">
              <strong>Word Bridge Learning</strong>
              <span style="color:#64748b;font-size:12px;">Nền tảng học tập &amp; thực hành ngoại ngữ</span>
            </a>
            <div style="border-top:1px solid #e2e8f0;margin-top:6px;padding:8px 10px 2px;font-size:12px;color:#0f766e;">
              Lượt truy cập D1: <strong id="wbTotalAccesses">${Number(totalAccesses).toLocaleString("vi-VN")}</strong>
            </div>
          </div>
        </div>
      </nav>
    </div>
  </header>

  <main class="wb-page-container">
    <!-- =================================================================== -->
    <!-- GIAO DIỆN 1: TRANG DỊCH VĂN BẢN (image_42d121.jpg)                  -->
    <!-- =================================================================== -->
    <section id="view_text" class="wb-view-section">
      <div class="wb-main-card">
        <div class="wb-lang-row">
          <div class="wb-select-box">
            <span class="wb-select-icon">✨</span>
            <select id="wbTextSourceLang" class="wb-select-native" aria-label="Ngôn ngữ nguồn"></select>
          </div>

          <button type="button" class="wb-swap-circle" onclick="swapLangPair('wbTextSourceLang', 'wbTextTargetLang', true)" title="Đổi vị trí hai ngôn ngữ">
            ⇄
          </button>

          <div style="display:grid; grid-template-columns: 1.3fr 1fr; gap:10px;">
            <div class="wb-select-box">
              <span class="wb-select-icon">🌐</span>
              <select id="wbTextTargetLang" class="wb-select-native" aria-label="Ngôn ngữ đích"></select>
            </div>
            <div class="wb-select-box" title="Lĩnh vực dịch thuật chuyên ngành">
              <span class="wb-select-icon">🥞</span>
              <select id="wbTextDomain" class="wb-select-native" aria-label="Lĩnh vực chuyên ngành"></select>
            </div>
          </div>
        </div>

        <div class="wb-text-grid">
          <!-- Khung nhập văn bản -->
          <div class="wb-text-panel" id="wbTextSourcePanel">
            <textarea
              id="wbSourceInput"
              class="wb-textarea"
              maxlength="15000"
              placeholder="Nhập văn bản cần dịch..."
              oninput="onTextInputChanged()"
            ></textarea>
            <div class="wb-panel-bottom">
              <div style="display:flex; align-items:center; gap:10px;">
                <button type="button" class="wb-icon-action" onclick="speakTextContent('source')" title="Phát âm văn bản nguồn">
                  🎙️
                </button>
                <span id="wbSourceCounters">0 ký tự &nbsp;|&nbsp; 0 từ</span>
                <span id="wbDetectedLangInfo" style="color:var(--wb-blue);font-weight:600;"></span>
              </div>
              <button type="button" class="wb-icon-action" onclick="clearTextTranslation()" title="Xóa nội dung">
                ✕
              </button>
            </div>
          </div>

          <!-- Khung hiển thị bản dịch -->
          <div class="wb-text-panel wb-text-panel-target" id="wbTextTargetPanel">
            <div id="wbTargetOutput" class="wb-target-display placeholder">Bản dịch sẽ hiển thị tại đây...</div>
            <div class="wb-panel-bottom">
              <span id="wbTargetDomainMeta" style="font-size:12.5px;color:#64748b;">Chính sách: Zero User Data Storage</span>
              <div style="display:flex; align-items:center; gap:6px;">
                <button type="button" class="wb-icon-action" onclick="speakTextContent('target')" title="Phát âm bản dịch">
                  🔊
                </button>
                <button type="button" class="wb-icon-action" onclick="copyTargetText()" title="Sao chép kết quả">
                  ❐
                </button>
                <button type="button" class="wb-icon-action" onclick="toggleTargetFullscreen()" title="Mở rộng khung kết quả">
                  ⤢
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="wb-btn-center-row">
          <button type="button" class="wb-btn-primary" id="wbBtnTranslateText" onclick="executeTextTranslation()">
            <span>文A</span>
            <span>Dịch</span>
          </button>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- GIAO DIỆN 2: TRANG DỊCH TÀI LIỆU (image_42d13d.jpg)                 -->
    <!-- =================================================================== -->
    <section id="view_document" class="wb-view-section">
      <div class="wb-main-card">
        <div class="wb-section-head">
          <div class="wb-section-icon-box">${FEATURE_ICONS_SVG.document}</div>
          <div>
            <h2>Dịch tài liệu</h2>
            <p>Tải tài liệu lên để dịch nhanh và chính xác, giữ nguyên bố cục.</p>
          </div>
        </div>

        <div
          class="wb-dropzone-box"
          onclick="document.getElementById('wbDocFileInput').click()"
          ondragover="event.preventDefault(); this.classList.add('dragover');"
          ondragleave="this.classList.remove('dragover');"
          ondrop="onDropFile(event, 'document')"
        >
          <div style="color:var(--wb-blue);">${FEATURE_ICONS_SVG.document}</div>
          <div class="wb-dropzone-title" id="wbDocSelectedLabel">Kéo thả tài liệu vào đây hoặc nhấn để chọn tệp</div>
          <div class="wb-dropzone-sub">Hỗ trợ: PDF, DOCX, DOC, PPTX, XLSX, CSV, TXT &nbsp;|&nbsp; Dung lượng tối đa: 50 MB</div>
          <button type="button" class="wb-btn-primary" style="min-width:160px;padding:10px 24px;font-size:14.5px;">
            📁 Chọn tài liệu
          </button>
          <input
            type="file"
            id="wbDocFileInput"
            accept=".pdf,.docx,.doc,.pptx,.xlsx,.csv,.txt"
            style="display:none"
            onchange="onDocFilePicked(this.files[0])"
          />
        </div>

        <div class="wb-controls-3col">
          <div>
            <label class="wb-field-label" for="wbDocSourceLang">Ngôn ngữ tài liệu</label>
            <div class="wb-select-box">
              <span class="wb-select-icon">✨</span>
              <select id="wbDocSourceLang" class="wb-select-native"></select>
            </div>
          </div>

          <button type="button" class="wb-swap-circle" onclick="swapLangPair('wbDocSourceLang', 'wbDocTargetLang', false)" title="Đổi chiều ngôn ngữ">
            ⇄
          </button>

          <div>
            <label class="wb-field-label" for="wbDocTargetLang">Dịch sang</label>
            <div class="wb-select-box">
              <span class="wb-select-icon">🌐</span>
              <select id="wbDocTargetLang" class="wb-select-native"></select>
            </div>
          </div>

          <div>
            <label class="wb-field-label" for="wbDocDomain">Lĩnh vực (tùy chọn)</label>
            <div class="wb-select-box">
              <span class="wb-select-icon">🥞</span>
              <select id="wbDocDomain" class="wb-select-native"></select>
            </div>
          </div>
        </div>

        <div class="wb-btn-center-row">
          <button type="button" class="wb-btn-primary" onclick="executeDocumentTranslation()">
            <span>文A</span>
            <span>Dịch tài liệu</span>
          </button>
        </div>

        <!-- Khu vực tải kết quả tài liệu đã dịch -->
        <div id="wbDocResultBox" style="display:none; margin-top:22px; padding:18px; border-radius:14px; border:1px solid #bae6fd; background:#f0f9ff;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div>
              <strong id="wbDocOutName" style="font-size:16px; color:#0c4a6e;"></strong>
              <div id="wbDocOutMeta" style="font-size:13px; color:#0369a1; margin-top:3px;"></div>
            </div>
            <button type="button" class="wb-btn-primary" id="wbDocDownloadTrigger">⬇️ Tải tài liệu đã dịch</button>
          </div>
          <div id="wbDocNoticeText" style="font-size:12.5px; color:#b45309; margin-top:8px;"></div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px;">
            <pre id="wbDocSourcePreview" style="margin:0; padding:10px; background:#fff; border:1px solid #cbd5e1; border-radius:8px; max-height:150px; overflow:auto; white-space:pre-wrap; font-size:12.5px;"></pre>
            <pre id="wbDocTargetPreview" style="margin:0; padding:10px; background:#fff; border:1px solid #cbd5e1; border-radius:8px; max-height:150px; overflow:auto; white-space:pre-wrap; font-size:12.5px;"></pre>
          </div>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- GIAO DIỆN 3: TRANG DỊCH TRANG WEB (image_42d15f.jpg)                -->
    <!-- =================================================================== -->
    <section id="view_website" class="wb-view-section">
      <div class="wb-main-card">
        <div class="wb-section-head">
          <div class="wb-section-icon-box">${FEATURE_ICONS_SVG.website}</div>
          <div>
            <h2>Dịch trang web</h2>
            <p>Dịch toàn bộ nội dung của một trang web sang ngôn ngữ bạn chọn.</p>
          </div>
        </div>

        <div class="wb-url-input-wrap">
          <span style="font-size:18px; color:var(--wb-blue);">🔗</span>
          <input
            type="url"
            id="wbWebsiteUrlInput"
            class="wb-url-input"
            placeholder="Nhập địa chỉ trang web (ví dụ: https://www.skyfirst.io.vn)"
          />
          <button type="button" class="wb-icon-action" onclick="document.getElementById('wbWebsiteUrlInput').value='';" title="Xóa URL">
            ✕
          </button>
        </div>

        <div class="wb-lang-row">
          <div>
            <label class="wb-field-label" for="wbWebSourceLang">Ngôn ngữ trang web</label>
            <div class="wb-select-box">
              <span class="wb-select-icon">✨</span>
              <select id="wbWebSourceLang" class="wb-select-native"></select>
            </div>
          </div>

          <button type="button" class="wb-swap-circle" style="margin-top:24px;" onclick="swapLangPair('wbWebSourceLang', 'wbWebTargetLang', false)" title="Đổi chiều ngôn ngữ">
            ⇄
          </button>

          <div>
            <label class="wb-field-label" for="wbWebTargetLang">Dịch sang</label>
            <div class="wb-select-box">
              <span class="wb-select-icon">🌐</span>
              <select id="wbWebTargetLang" class="wb-select-native"></select>
            </div>
          </div>
        </div>

        <div class="wb-btn-center-row">
          <button type="button" class="wb-btn-primary" onclick="executeWebsiteTranslation()">
            <span>🌐</span>
            <span>Dịch trang web</span>
          </button>
        </div>

        <div class="wb-info-note-bar">
          <span>ⓘ</span>
          <span><strong>Lưu ý:</strong> Kết quả dịch sẽ được hiển thị trên một trang mới, giữ nguyên bố cục và các liên kết của trang web gốc.</span>
        </div>

        <div id="wbWebsiteResultBox" style="display:none; margin-top:20px; padding:18px; border-radius:14px; border:1px solid #bae6fd; background:#f8fafc;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
            <div>
              <strong id="wbWebResultTitle" style="color:#0f172a; font-size:15.5px;"></strong>
              <div id="wbWebResultMeta" style="font-size:13px; color:#475569;"></div>
            </div>
            <button type="button" class="wb-btn-primary" id="wbOpenTranslatedWebBtn" style="padding:9px 20px; font-size:14px;">
              ↗️ Mở trang web đã dịch trên tab mới
            </button>
          </div>
          <iframe id="wbWebPreviewFrame" title="Bản xem trước trang web đã dịch" sandbox="allow-same-origin" style="width:100%; height:360px; border:1px solid #cbd5e1; border-radius:10px; background:#ffffff;"></iframe>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- GIAO DIỆN 4: TRANG DỊCH HÌNH ẢNH (image_42d17a.jpg)                 -->
    <!-- =================================================================== -->
    <section id="view_image" class="wb-view-section">
      <div class="wb-main-card">
        <div class="wb-section-head">
          <div class="wb-section-icon-box">${FEATURE_ICONS_SVG.image}</div>
          <div>
            <h2>Dịch hình ảnh</h2>
            <p>Nhận diện và dịch nội dung trong hình ảnh.</p>
          </div>
        </div>

        <div class="wb-image-split">
          <div
            class="wb-dropzone-box"
            onclick="document.getElementById('wbOcrFileInput').click()"
            ondragover="event.preventDefault(); this.classList.add('dragover');"
            ondragleave="this.classList.remove('dragover');"
            ondrop="onDropFile(event, 'image')"
          >
            <div style="color:var(--wb-blue);">${FEATURE_ICONS_SVG.image}</div>
            <div class="wb-dropzone-title" id="wbOcrSelectedLabel">Kéo thả hình ảnh vào đây hoặc nhấn để chọn ảnh</div>
            <div class="wb-dropzone-sub">Hỗ trợ: JPG, JPEG, PNG, WEBP &nbsp;|&nbsp; Dung lượng tối đa: 10 MB</div>
            <button type="button" class="wb-btn-primary" style="min-width:160px;padding:10px 24px;font-size:14.5px;">
              📁 Chọn hình ảnh
            </button>
            <input
              type="file"
              id="wbOcrFileInput"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              style="display:none"
              onchange="onOcrFilePicked(this.files[0])"
            />
          </div>

          <div class="wb-image-side-card">
            <svg viewBox="0 0 260 110" width="230" height="98" aria-hidden="true">
              <rect x="10" y="10" width="95" height="88" rx="12" fill="#f1f5f9" stroke="#cbd5e1"/>
              <text x="34" y="52" font-family="Inter,sans-serif" font-size="28" font-weight="800" fill="#64748b">A</text>
              <rect x="24" y="64" width="65" height="6" rx="3" fill="#cbd5e1"/>
              <rect x="24" y="76" width="48" height="6" rx="3" fill="#cbd5e1"/>
              <path d="M 118 54 L 142 54 M 135 47 L 142 54 L 135 61" stroke="#0b63e5" stroke-width="3" fill="none" stroke-linecap="round"/>
              <rect x="155" y="10" width="95" height="88" rx="12" fill="#eef4ff" stroke="#93c5fd"/>
              <text x="178" y="52" font-family="Inter,sans-serif" font-size="26" font-weight="800" fill="#0b63e5">文</text>
              <rect x="169" y="64" width="65" height="6" rx="3" fill="#93c5fd"/>
              <rect x="169" y="76" width="48" height="6" rx="3" fill="#93c5fd"/>
            </svg>
            <ul class="wb-check-list">
              <li><span class="wb-green-tick">✓</span><span>Nhận diện văn bản trong ảnh</span></li>
              <li><span class="wb-green-tick">✓</span><span>Dịch sang hơn 100 ngôn ngữ</span></li>
              <li><span class="wb-green-tick">✓</span><span>Giữ nguyên bố cục nội dung</span></li>
            </ul>
          </div>
        </div>

        <div class="wb-controls-3col">
          <div>
            <label class="wb-field-label" for="wbOcrSourceLang">Ngôn ngữ trong ảnh</label>
            <div class="wb-select-box">
              <span class="wb-select-icon">✨</span>
              <select id="wbOcrSourceLang" class="wb-select-native"></select>
            </div>
          </div>

          <button type="button" class="wb-swap-circle" onclick="swapLangPair('wbOcrSourceLang', 'wbOcrTargetLang', false)" title="Đổi chiều ngôn ngữ">
            ⇄
          </button>

          <div>
            <label class="wb-field-label" for="wbOcrTargetLang">Dịch sang</label>
            <div class="wb-select-box">
              <span class="wb-select-icon">🌐</span>
              <select id="wbOcrTargetLang" class="wb-select-native"></select>
            </div>
          </div>

          <div>
            <label class="wb-field-label" for="wbOcrDomain">Lĩnh vực (tùy chọn)</label>
            <div class="wb-select-box">
              <span class="wb-select-icon">🥞</span>
              <select id="wbOcrDomain" class="wb-select-native"></select>
            </div>
          </div>
        </div>

        <div class="wb-btn-center-row">
          <button type="button" class="wb-btn-primary" onclick="executeOcrTranslation()">
            <span>文A</span>
            <span>Dịch hình ảnh</span>
          </button>
        </div>

        <div class="wb-info-note-bar">
          <span>ⓘ</span>
          <span><strong>Lưu ý:</strong> Đảm bảo hình ảnh rõ nét, văn bản dễ đọc để đạt kết quả dịch chính xác hơn.</span>
        </div>

        <div id="wbOcrResultBox" style="display:none; margin-top:20px; padding:18px; border-radius:14px; border:1px solid #bae6fd; background:#f8fafc;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
            <strong id="wbOcrResultHeader" style="color:#0f172a;">Kết quả Nhận diện &amp; Dịch hình ảnh</strong>
            <div style="display:flex; gap:8px;">
              <button type="button" class="wb-btn-outline" style="padding:7px 14px; font-size:13px;" onclick="copyOcrResult()">📋 Sao chép bản dịch</button>
              <button type="button" class="wb-btn-outline" style="padding:7px 14px; font-size:13px;" onclick="downloadOcrResultTxt()">⬇️ Tải kết quả (.txt)</button>
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
            <div>
              <div style="font-size:12px; font-weight:700; color:#475569; margin-bottom:5px;">VĂN BẢN GỐC TRONG ẢNH:</div>
              <pre id="wbOcrSourceText" style="margin:0; padding:12px; background:#fff; border:1px solid #cbd5e1; border-radius:10px; min-height:120px; white-space:pre-wrap; font-size:14px;"></pre>
            </div>
            <div>
              <div style="font-size:12px; font-weight:700; color:#475569; margin-bottom:5px;">BẢN DỊCH:</div>
              <pre id="wbOcrTargetText" style="margin:0; padding:12px; background:#fff; border:1px solid #cbd5e1; border-radius:10px; min-height:120px; white-space:pre-wrap; font-size:14px;"></pre>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- GIAO DIỆN 5: TRANG GIỚI THIỆU (image_442e5d.jpg)                    -->
    <!-- =================================================================== -->
    <section id="view_about" class="wb-view-section">
      <div class="wb-main-card">
        <div class="wb-hero-banner">
          <div>
            <span class="wb-pill-tag">Giới thiệu</span>
            <h1 class="wb-hero-title">Giới thiệu về Word Bridge Translation</h1>
            <p class="wb-hero-desc">
              Word Bridge Translation là công cụ dịch thuật trực tuyến của Word Bridge, giúp bạn chuyển đổi ngôn ngữ nhanh chóng, chính xác và tiện lợi cho học tập, làm việc, nghiên cứu và giao tiếp quốc tế.
            </p>
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
              <button type="button" class="wb-btn-primary" onclick="switchView('text')">
                <span>文A</span>
                <span>Sử dụng ngay</span>
              </button>
              <button type="button" class="wb-btn-outline" onclick="switchView('help')">
                <span>▶</span>
                <span>Xem hướng dẫn</span>
              </button>
            </div>
          </div>
          <div style="text-align:center;">
            <svg viewBox="0 0 360 210" width="100%" style="max-width:340px;" aria-hidden="true">
              <circle cx="265" cy="95" r="72" fill="#dbeafe" stroke="#60a5fa" stroke-width="2"/>
              <rect x="30" y="36" width="240" height="145" rx="14" fill="#ffffff" stroke="#93c5fd" stroke-width="2"/>
              <rect x="30" y="36" width="240" height="24" rx="14" fill="#eff6ff"/>
              <circle cx="46" cy="48" r="4" fill="#ef4444"/><circle cx="58" cy="48" r="4" fill="#f59e0b"/><circle cx="70" cy="48" r="4" fill="#22c55e"/>
              <rect x="46" y="74" width="90" height="90" rx="10" fill="#f8fafc" stroke="#e2e8f0"/>
              <text x="76" y="122" font-family="Inter,sans-serif" font-size="34" font-weight="800" fill="#0b63e5">A</text>
              <circle cx="150" cy="118" r="16" fill="#ffffff" stroke="#93c5fd"/>
              <text x="142" y="124" font-family="Inter,sans-serif" font-size="16" font-weight="800" fill="#0b63e5">⇄</text>
              <rect x="164" y="74" width="90" height="90" rx="10" fill="#eff6ff" stroke="#bfdbfe"/>
              <text x="194" y="122" font-family="Inter,sans-serif" font-size="32" font-weight="800" fill="#0b63e5">文</text>
            </svg>
          </div>
        </div>

        <h2 style="font-size:21px; font-weight:800; margin:0 0 14px 0;">Các tính năng chính</h2>
        <div class="wb-feature-4grid">
          <div class="wb-pastel-card wb-pastel-blue" onclick="switchView('text')">
            <div style="color:#0b63e5; font-size:24px; font-weight:800; margin-bottom:8px;">A文</div>
            <strong style="font-size:16px; display:block; margin-bottom:6px;">Dịch văn bản</strong>
            <span style="font-size:13.5px; color:#475569;">Dịch nhanh đoạn văn, câu hoặc nội dung dài giữa nhiều ngôn ngữ.</span>
          </div>
          <div class="wb-pastel-card wb-pastel-green" onclick="switchView('document')">
            <div style="color:#16a34a; font-size:24px; margin-bottom:8px;">📄</div>
            <strong style="font-size:16px; display:block; margin-bottom:6px;">Dịch tài liệu</strong>
            <span style="font-size:13.5px; color:#475569;">Dịch các tệp tài liệu như PDF, DOCX, PPTX, XLSX và nhiều định dạng khác.</span>
          </div>
          <div class="wb-pastel-card wb-pastel-purple" onclick="switchView('website')">
            <div style="color:#7c3aed; font-size:24px; margin-bottom:8px;">🌐</div>
            <strong style="font-size:16px; display:block; margin-bottom:6px;">Dịch trang web</strong>
            <span style="font-size:13.5px; color:#475569;">Dịch toàn bộ nội dung của một trang web sang ngôn ngữ bạn chọn.</span>
          </div>
          <div class="wb-pastel-card wb-pastel-amber" onclick="switchView('image')">
            <div style="color:#d97706; font-size:24px; margin-bottom:8px;">🖼️</div>
            <strong style="font-size:16px; display:block; margin-bottom:6px;">Dịch hình ảnh</strong>
            <span style="font-size:13.5px; color:#475569;">Nhận diện và dịch nội dung trong hình ảnh.</span>
          </div>
        </div>

        <h2 style="font-size:21px; font-weight:800; margin:0 0 12px 0;">Vì sao nên chọn Word Bridge Translation?</h2>
        <div class="wb-why-5grid">
          <div class="wb-why-item">
            <strong style="display:block; color:#0f172a; margin-bottom:4px;">⚡ Nhanh chóng</strong>
            <span style="font-size:13px; color:#475569;">Xử lý và trả kết quả trong thời gian ngắn.</span>
          </div>
          <div class="wb-why-item">
            <strong style="display:block; color:#0f172a; margin-bottom:4px;">🛡️ Chính xác</strong>
            <span style="font-size:13px; color:#475569;">Bản dịch tự nhiên, dễ hiểu, phù hợp ngữ cảnh.</span>
          </div>
          <div class="wb-why-item">
            <strong style="display:block; color:#0f172a; margin-bottom:4px;">🥞 Đa dạng ngôn ngữ</strong>
            <span style="font-size:13px; color:#475569;">Hỗ trợ nhiều ngôn ngữ trên thế giới.</span>
          </div>
          <div class="wb-why-item">
            <strong style="display:block; color:#0f172a; margin-bottom:4px;">👥 Tiện lợi</strong>
            <span style="font-size:13px; color:#475569;">Sử dụng trực tuyến, trên nhiều thiết bị, mọi lúc mọi nơi.</span>
          </div>
          <div class="wb-why-item">
            <strong style="display:block; color:#0f172a; margin-bottom:4px;">🔒 An toàn</strong>
            <span style="font-size:13px; color:#475569;">Tôn trọng quyền riêng tư, không lưu trữ nội dung dịch.</span>
          </div>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- GIAO DIỆN 6: TRANG QUYỀN RIÊNG TƯ & ĐIỀU KHOẢN (image_442e3d.jpg)   -->
    <!-- =================================================================== -->
    <section id="view_privacy" class="wb-view-section">
      <div class="wb-main-card">
        <div class="wb-hero-banner" style="margin-bottom:20px;">
          <div>
            <h1 class="wb-hero-title">Quyền riêng tư và Điều khoản</h1>
            <p class="wb-hero-desc" style="margin-bottom:0;">
              Cam kết bảo vệ dữ liệu cá nhân, quyền lợi của người dùng và quy định khi sử dụng Word Bridge Translation.
            </p>
          </div>
          <div style="text-align:center;">
            <svg viewBox="0 0 240 130" width="210" height="115" aria-hidden="true">
              <path d="M 75 18 L 125 32 L 125 72 C 125 100 100 116 75 124 C 50 116 25 100 25 72 L 25 32 Z" fill="#1d4ed8"/>
              <rect x="61" y="64" width="28" height="22" rx="4" fill="#ffffff"/>
              <path d="M 67 64 V 56 A 8 8 0 0 1 83 56 V 64" stroke="#ffffff" stroke-width="4" fill="none"/>
              <rect x="135" y="24" width="75" height="92" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
              <circle cx="152" cy="50" r="6" fill="#22c55e"/><rect x="164" y="47" width="34" height="6" rx="3" fill="#cbd5e1"/>
              <circle cx="152" cy="74" r="6" fill="#22c55e"/><rect x="164" y="71" width="34" height="6" rx="3" fill="#cbd5e1"/>
            </svg>
          </div>
        </div>

        <div class="wb-accordion-list">
          <div class="wb-accordion-item open">
            <button type="button" class="wb-accordion-header" onclick="toggleAccordion(this)">
              <div class="wb-acc-left">
                <div class="wb-acc-icon">🛡️</div>
                <div>
                  <strong style="font-size:16.5px; display:block; color:#0f172a;">Quyền riêng tư</strong>
                  <span style="font-size:13.5px; color:#475569;">Giải thích cách chúng tôi thu thập, sử dụng, xử lý và bảo vệ thông tin của bạn khi sử dụng dịch vụ.</span>
                </div>
              </div>
              <span>⌄</span>
            </button>
            <div class="wb-accordion-body">
              <ul>
                <li><strong>Chính sách Zero User Data Storage:</strong> Hệ thống Dịch thuật Word Bridge không lưu trữ văn bản nguồn, không lưu kết quả dịch, không lưu tài liệu gốc, không lưu hình ảnh tải lên và không lưu lịch sử dịch thuật cá nhân.</li>
                <li><strong>Sử dụng Cloudflare D1 &amp; R2:</strong> Cơ sở dữ liệu Cloudflare D1 (<code>word</code>) chỉ lưu duy nhất một chỉ số tổng lượt truy cập website (<code>site_metrics.total_accesses</code>). Cloudflare R2 không được sử dụng để lưu trữ tài liệu hoặc kết quả dịch của người dùng.</li>
                <li><strong>Không huấn luyện &amp; Không quảng cáo:</strong> Nội dung dịch chỉ được xử lý tạm thời trên RAM, giải phóng ngay sau khi hoàn tất hoặc khi xảy ra lỗi, không sử dụng để huấn luyện mô hình AI và không dùng cho mục đích quảng cáo.</li>
                <li><strong>Biểu mẫu phản hồi:</strong> Khi bạn chủ động gửi biểu mẫu phản hồi hoặc yêu cầu hỗ trợ, nội dung đó được chuyển trực tiếp đến địa chỉ email hỗ trợ chính thức <strong>${OFFICIAL_SUPPORT_EMAIL}</strong> để đội ngũ kỹ thuật xử lý yêu cầu.</li>
              </ul>
            </div>
          </div>

          <div class="wb-accordion-item">
            <button type="button" class="wb-accordion-header" onclick="toggleAccordion(this)">
              <div class="wb-acc-left">
                <div class="wb-acc-icon">📄</div>
                <div>
                  <strong style="font-size:16.5px; display:block; color:#0f172a;">Điều khoản sử dụng</strong>
                  <span style="font-size:13.5px; color:#475569;">Quy định về phạm vi, điều kiện, trách nhiệm và quyền, nghĩa vụ của người dùng khi sử dụng Word Bridge Translation.</span>
                </div>
              </div>
              <span>⌄</span>
            </button>
            <div class="wb-accordion-body">
              <p>Người dùng được phép sử dụng miễn phí các tính năng dịch văn bản, dịch tài liệu (PDF, DOCX, DOC, PPTX, XLSX, CSV, TXT tối đa 50 MB), dịch trang web và dịch hình ảnh (JPG, JPEG, PNG, WEBP tối đa 10 MB) cho mục đích học tập, làm việc, nghiên cứu hợp pháp. Nghiêm cấm tải lên tệp chứa mã độc, macro độc hại hoặc lợi dụng chức năng dịch trang web để tấn công SSRF vào hệ thống mạng nội bộ.</p>
            </div>
          </div>

          <div class="wb-accordion-item">
            <button type="button" class="wb-accordion-header" onclick="toggleAccordion(this)">
              <div class="wb-acc-left">
                <div class="wb-acc-icon">🍪</div>
                <div>
                  <strong style="font-size:16.5px; display:block; color:#0f172a;">Chính sách cookie</strong>
                  <span style="font-size:13.5px; color:#475569;">Thông tin về việc sử dụng cookie để cải thiện trải nghiệm và vận hành dịch vụ.</span>
                </div>
              </div>
              <span>⌄</span>
            </button>
            <div class="wb-accordion-body">
              <p>Word Bridge Translation không sử dụng cookie theo dõi quảng cáo, không lưu nội dung dịch vào <code>document.cookie</code>, <code>localStorage</code>, <code>sessionStorage</code> hay <code>indexedDB</code> của trình duyệt. Mọi phản hồi API đều áp dụng chính sách <code>Cache-Control: no-store</code>.</p>
            </div>
          </div>

          <div class="wb-accordion-item">
            <button type="button" class="wb-accordion-header" onclick="toggleAccordion(this)">
              <div class="wb-acc-left">
                <div class="wb-acc-icon">©</div>
                <div>
                  <strong style="font-size:16.5px; display:block; color:#0f172a;">Quyền sở hữu trí tuệ</strong>
                  <span style="font-size:13.5px; color:#475569;">Quy định về bản quyền, quyền sở hữu trí tuệ đối với nội dung, thương hiệu và công nghệ của Word Bridge.</span>
                </div>
              </div>
              <span>⌄</span>
            </button>
            <div class="wb-accordion-body">
              <p>Thương hiệu Word Bridge, biểu tượng cây cầu trên trang sách mở, khẩu hiệu <em>"Where Languages Bring People Together"</em> và kiến trúc phần mềm Word Bridge Translation thuộc quyền sở hữu trí tuệ của Hệ sinh thái Word Bridge (<code>wordbridge.io.vn</code>). Người dùng giữ toàn bộ quyền sở hữu trí tuệ đối với văn bản và tài liệu gốc của mình.</p>
            </div>
          </div>

          <div class="wb-accordion-item">
            <button type="button" class="wb-accordion-header" onclick="toggleAccordion(this)">
              <div class="wb-acc-left">
                <div class="wb-acc-icon">🔄</div>
                <div>
                  <strong style="font-size:16.5px; display:block; color:#0f172a;">Cập nhật chính sách</strong>
                  <span style="font-size:13.5px; color:#475569;">Cách thức và thời điểm chúng tôi cập nhật, điều chỉnh các chính sách liên quan.</span>
                </div>
              </div>
              <span>⌄</span>
            </button>
            <div class="wb-accordion-body">
              <p>Mọi cập nhật về chính sách bảo mật và điều khoản dịch vụ sẽ được công bố công khai tại trang này trên <code>https://dichthuat.wordbridge.io.vn/quyen-rieng-tu</code> đồng thời giữ vững nguyên tắc cốt lõi là không lưu trữ dữ liệu dịch thuật của người dùng.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- GIAO DIỆN 7: TRANG TRỢ GIÚP (image_44444c.jpg)                      -->
    <!-- =================================================================== -->
    <section id="view_help" class="wb-view-section">
      <div class="wb-main-card">
        <div class="wb-hero-banner" style="margin-bottom:24px;">
          <div>
            <span class="wb-pill-tag">Trung tâm hỗ trợ</span>
            <h1 class="wb-hero-title">Trợ giúp – Word Bridge Translation</h1>
            <p class="wb-hero-desc">
              Hướng dẫn sử dụng, giải đáp thắc mắc và hỗ trợ bạn trong quá trình sử dụng dịch vụ.
            </p>
            <div class="wb-help-search-bar">
              <span style="color:#64748b; margin-right:8px;">🔍</span>
              <input
                type="search"
                id="wbHelpSearchInput"
                placeholder="Tìm kiếm hướng dẫn, câu hỏi thường gặp..."
                oninput="filterHelpContent()"
              />
              <button type="button" class="wb-btn-primary" style="min-width:110px; padding:9px 18px; border-radius:999px; font-size:14px;" onclick="filterHelpContent()">
                Tìm kiếm
              </button>
            </div>
          </div>
          <div style="text-align:center;">
            <svg viewBox="0 0 260 150" width="230" height="130" aria-hidden="true">
              <rect x="40" y="34" width="160" height="98" rx="10" fill="#ffffff" stroke="#60a5fa" stroke-width="3"/>
              <rect x="95" y="12" width="54" height="40" rx="10" fill="#1d4ed8"/>
              <text x="122" y="40" text-anchor="middle" font-family="Inter,sans-serif" font-size="26" font-weight="800" fill="#ffffff">?</text>
              <circle cx="170" cy="88" r="24" fill="#dbeafe"/>
              <text x="170" y="96" text-anchor="middle" font-size="22">🎧</text>
            </svg>
          </div>
        </div>

        <!-- 4 Thẻ danh mục Trợ giúp -->
        <div class="wb-feature-4grid" style="margin-bottom:22px;">
          <div class="wb-pastel-card wb-pastel-blue" onclick="showHelpTopicDetail('guides')">
            <div style="color:#0b63e5; font-size:24px; margin-bottom:8px;">📖</div>
            <strong style="font-size:16px; display:block; margin-bottom:5px;">Hướng dẫn sử dụng</strong>
            <span style="font-size:13px; color:#475569;">Cách sử dụng các tính năng dịch văn bản, tài liệu, trang web và hình ảnh.</span>
          </div>
          <div class="wb-pastel-card wb-pastel-green" onclick="showHelpTopicDetail('troubleshooting')">
            <div style="color:#16a34a; font-size:24px; margin-bottom:8px;">⚙️</div>
            <strong style="font-size:16px; display:block; margin-bottom:5px;">Xử lý sự cố</strong>
            <span style="font-size:13px; color:#475569;">Các giải pháp cho lỗi thường gặp khi sử dụng dịch vụ.</span>
          </div>
          <div class="wb-pastel-card wb-pastel-purple" onclick="showHelpTopicDetail('security')">
            <div style="color:#7c3aed; font-size:24px; margin-bottom:8px;">🛡️</div>
            <strong style="font-size:16px; display:block; margin-bottom:5px;">Tài khoản &amp; Bảo mật</strong>
            <span style="font-size:13px; color:#475569;">Thông tin về quyền riêng tư, bảo mật dữ liệu và sử dụng an toàn.</span>
          </div>
          <div class="wb-pastel-card wb-pastel-amber" onclick="showHelpTopicDetail('faq')">
            <div style="color:#d97706; font-size:24px; margin-bottom:8px;">ⓘ</div>
            <strong style="font-size:16px; display:block; margin-bottom:5px;">Câu hỏi thường gặp (FAQ)</strong>
            <span style="font-size:13px; color:#475569;">Tổng hợp các thắc mắc phổ biến và câu trả lời chi tiết.</span>
          </div>
        </div>

        <!-- Khu vực hiển thị chi tiết Hướng dẫn / Xử lý sự cố / Bảo mật khi người dùng chọn thẻ -->
        <div id="wbHelpTopicDetailBox" style="margin-bottom:22px; padding:18px 20px; border-radius:14px; background:#f8fafc; border:1px solid #e2e8f0;">
          <h3 id="wbHelpTopicTitle" style="margin:0 0 10px 0; color:#0f172a; font-size:17px;">1. Hướng dẫn sử dụng 04 cơ chế dịch thuật</h3>
          <div id="wbHelpTopicBody" style="font-size:14px; color:#334155; line-height:1.65;">
            <ul>
              <li><strong>Dịch văn bản (<a href="/dich-van-ban" onclick="event.preventDefault(); switchView('text');">Mở công cụ</a>):</strong> Nhập hoặc dán văn bản (tối đa 15.000 ký tự/lần), chọn ngôn ngữ nguồn hoặc để <em>Tự động nhận diện</em>, chọn ngôn ngữ đích, chọn lĩnh vực chuyên ngành và nhấn <strong>Dịch</strong>.</li>
              <li><strong>Dịch tài liệu (<a href="/dich-tai-lieu" onclick="event.preventDefault(); switchView('document');">Mở công cụ</a>):</strong> Tải lên tệp PDF, DOCX, DOC, PPTX, XLSX, CSV hoặc TXT (tối đa 50 MB, không đặt mật khẩu và không chứa Macro), chọn ngôn ngữ và lĩnh vực rồi nhấn <strong>Dịch tài liệu</strong> để nhận tệp kết quả tải về ngay.</li>
              <li><strong>Dịch trang web (<a href="/dich-trang-web" onclick="event.preventDefault(); switchView('website');">Mở công cụ</a>):</strong> Nhập địa chỉ URL công khai (bắt đầu bằng <code>http://</code> hoặc <code>https://</code>), chọn ngôn ngữ đích và nhấn <strong>Dịch trang web</strong> để xem phiên bản trang web đã dịch giữ nguyên bố cục.</li>
              <li><strong>Dịch hình ảnh (<a href="/dich-hinh-anh" onclick="event.preventDefault(); switchView('image');">Mở công cụ</a>):</strong> Chọn ảnh JPG, JPEG, PNG hoặc WEBP (tối đa 10 MB) có chữ rõ nét và nhấn <strong>Dịch hình ảnh</strong> để trích xuất văn bản gốc kèm bản dịch.</li>
            </ul>
          </div>
        </div>

        <!-- Khối 2 cột dưới: Câu hỏi thường gặp (FAQ) & Vẫn cần hỗ trợ? (image_44444c.jpg) -->
        <div class="wb-help-bottom-grid">
          <div style="border:1px solid #e2e8f0; border-radius:16px; padding:20px;">
            <h3 style="margin:0 0 14px 0; font-size:18px; display:flex; align-items:center; gap:8px;">
              <span>💬</span>
              <span>Câu hỏi thường gặp</span>
            </h3>
            <div class="wb-accordion-list" id="wbFaqList">
              <div class="wb-accordion-item faq-entry">
                <button type="button" class="wb-accordion-header" style="padding:13px 16px;" onclick="toggleAccordion(this)">
                  <strong style="font-size:14.5px; color:#0f172a;">Word Bridge Translation có miễn phí không?</strong>
                  <span>⌄</span>
                </button>
                <div class="wb-accordion-body" style="padding:12px 16px;">
                  Word Bridge Translation cung cấp hoàn toàn miễn phí cả 04 tính năng Dịch văn bản, Dịch tài liệu, Dịch trang web và Dịch hình ảnh trực tuyến cho cộng đồng người dùng.
                </div>
              </div>

              <div class="wb-accordion-item faq-entry">
                <button type="button" class="wb-accordion-header" style="padding:13px 16px;" onclick="toggleAccordion(this)">
                  <strong style="font-size:14.5px; color:#0f172a;">Dịch tài liệu hỗ trợ những định dạng nào?</strong>
                  <span>⌄</span>
                </button>
                <div class="wb-accordion-body" style="padding:12px 16px;">
                  Hệ thống hỗ trợ 07 định dạng tài liệu phổ biến: <strong>PDF, DOCX, DOC, PPTX, XLSX, CSV, TXT</strong> với dung lượng tối đa 50 MB mỗi tệp.
                </div>
              </div>

              <div class="wb-accordion-item faq-entry">
                <button type="button" class="wb-accordion-header" style="padding:13px 16px;" onclick="toggleAccordion(this)">
                  <strong style="font-size:14.5px; color:#0f172a;">Dịch trang web có giữ nguyên bố cục không?</strong>
                  <span>⌄</span>
                </button>
                <div class="wb-accordion-body" style="padding:12px 16px;">
                  Hệ thống bảo toàn tối đa cấu trúc HTML, hình ảnh, bảng biểu và chuẩn hóa các liên kết của trang web gốc. Lưu ý: những trang yêu cầu đăng nhập tài khoản riêng, chặn bot (403) hoặc địa chỉ mạng nội bộ (SSRF) sẽ không thể truy cập.
                </div>
              </div>

              <div class="wb-accordion-item faq-entry">
                <button type="button" class="wb-accordion-header" style="padding:13px 16px;" onclick="toggleAccordion(this)">
                  <strong style="font-size:14.5px; color:#0f172a;">Nội dung tôi dịch có được lưu lại không?</strong>
                  <span>⌄</span>
                </button>
                <div class="wb-accordion-body" style="padding:12px 16px;">
                  <strong>Tuyệt đối không.</strong> Hệ thống áp dụng nguyên tắc <strong>Zero User Data Storage</strong>: toàn bộ văn bản, tài liệu, hình ảnh và kết quả dịch chỉ được xử lý tạm thời trên RAM và xóa ngay sau khi trả kết quả.
                </div>
              </div>

              <div class="wb-accordion-item faq-entry">
                <button type="button" class="wb-accordion-header" style="padding:13px 16px;" onclick="toggleAccordion(this)">
                  <strong style="font-size:14.5px; color:#0f172a;">Làm thế nào để báo lỗi hoặc góp ý?</strong>
                  <span>⌄</span>
                </button>
                <div class="wb-accordion-body" style="padding:12px 16px;">
                  Bạn chỉ cần nhấn nút <strong>Gửi yêu cầu hỗ trợ</strong> bên cạnh hoặc chọn mục <strong>Gửi ý kiến phản hồi</strong> ở chân trang. Hệ thống sẽ tự động gửi thông tin trực tiếp về email hỗ trợ chính thức <strong>${OFFICIAL_SUPPORT_EMAIL}</strong>.
                </div>
              </div>
            </div>
          </div>

          <div style="border:1px solid #dbeafe; border-radius:16px; padding:24px; background:linear-gradient(135deg, #f8fbff 0%, #eef5ff 100%); display:flex; flex-direction:column; justify-content:center;">
            <h3 style="margin:0 0 10px 0; font-size:20px; color:#0f172a; display:flex; align-items:center; gap:10px;">
              <span style="color:var(--wb-blue);">🎧</span>
              <span>Vẫn cần hỗ trợ?</span>
            </h3>
            <p style="font-size:14.5px; color:#334155; line-height:1.6; margin:0 0 18px 0;">
              Nếu bạn không tìm thấy câu trả lời phù hợp, hãy liên hệ với chúng tôi để được hỗ trợ thêm. Mọi yêu cầu được chuyển trực tiếp tới hộp thư chính thức <strong>${OFFICIAL_SUPPORT_EMAIL}</strong>.
            </p>
            <div>
              <button type="button" class="wb-btn-primary" onclick="switchView('feedback')">
                <span>✉️</span>
                <span>Gửi yêu cầu hỗ trợ</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- GIAO DIỆN 8: TRANG GỬI Ý KIẾN PHẢN HỒI (image_449a5e.jpg)           -->
    <!-- =================================================================== -->
    <section id="view_feedback" class="wb-view-section">
      <div class="wb-main-card">
        <div style="margin-bottom:14px;">
          <button type="button" class="wb-btn-outline" style="padding:6px 14px; border-radius:999px; font-size:13px;" onclick="switchView('help')">
            ← Trợ giúp
          </button>
        </div>

        <div class="wb-section-head">
          <div class="wb-section-icon-box">💬</div>
          <div>
            <h2>Gửi ý kiến phản hồi</h2>
            <p>Chia sẻ ý kiến, góp ý hoặc báo cáo vấn đề để chúng tôi cải thiện Word Bridge Translation tốt hơn.</p>
          </div>
        </div>

        <div class="wb-feedback-grid">
          <!-- Biểu mẫu bên trái -->
          <form id="wbFeedbackForm" onsubmit="event.preventDefault(); submitFeedbackForm();" style="border:1px solid #e2e8f0; border-radius:16px; padding:22px; background:#ffffff;">
            <div style="margin-bottom:16px;">
              <label class="wb-field-label" for="wbFeedbackType">Loại phản hồi <span style="color:#dc2626;">*</span></label>
              <div class="wb-select-box">
                <span class="wb-select-icon">📢</span>
                <select id="wbFeedbackType" class="wb-select-native" required>
                  <option value="">Chọn loại phản hồi</option>
                </select>
              </div>
            </div>

            <div style="margin-bottom:16px;">
              <label class="wb-field-label" for="wbFeedbackTitle">Tiêu đề <span style="color:#dc2626;">*</span></label>
              <input
                type="text"
                id="wbFeedbackTitle"
                class="wb-form-input"
                maxlength="200"
                required
                placeholder="Nhập tiêu đề ngắn gọn (ví dụ: Lỗi khi dịch tài liệu)..."
              />
            </div>

            <div style="margin-bottom:16px;">
              <label class="wb-field-label" for="wbFeedbackMessage">Nội dung chi tiết <span style="color:#dc2626;">*</span></label>
              <div style="position:relative;">
                <textarea
                  id="wbFeedbackMessage"
                  class="wb-form-input"
                  rows="5"
                  maxlength="2000"
                  required
                  placeholder="Mô tả cụ thể ý kiến, góp ý hoặc vấn đề bạn gặp phải..."
                  oninput="updateFeedbackCharCounter()"
                  style="resize:vertical; padding-bottom:26px;"
                ></textarea>
                <span id="wbFeedbackCharCount" style="position:absolute; right:12px; bottom:8px; font-size:12px; color:#64748b;">0 / 2.000</span>
              </div>
            </div>

            <div style="margin-bottom:16px;">
              <label class="wb-field-label" for="wbFeedbackContact">Email liên hệ nhận phản hồi (tùy chọn – dùng cho Reply-To)</label>
              <input
                type="email"
                id="wbFeedbackContact"
                class="wb-form-input"
                placeholder="Nhập email của bạn nếu cần đội ngũ Word Bridge phản hồi lại (không bắt buộc)..."
              />
            </div>

            <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-bottom:20px;">
              <button type="button" class="wb-btn-outline" style="padding:9px 16px; font-size:13.5px;" onclick="document.getElementById('wbFeedbackFileInput').click()">
                📎 Đính kèm tệp (tùy chọn)
              </button>
              <span id="wbFeedbackFileLabel" style="font-size:13px; color:#64748b;">
                Hỗ trợ: JPG, JPEG, PNG, PDF &nbsp;|&nbsp; Dung lượng tối đa: 10 MB
              </span>
              <input
                type="file"
                id="wbFeedbackFileInput"
                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                style="display:none"
                onchange="onFeedbackFilePicked(this.files[0])"
              />
            </div>

            <div style="display:flex; justify-content:center; gap:14px; flex-wrap:wrap;">
              <button type="button" class="wb-btn-outline" onclick="resetFeedbackForm()">
                ↻ Làm mới
              </button>
              <button type="submit" class="wb-btn-primary" id="wbFeedbackSubmitBtn">
                <span>✈️</span>
                <span>Gửi phản hồi</span>
              </button>
            </div>
          </form>

          <!-- Khung hướng dẫn bên phải -->
          <div style="border:1px solid #e2e8f0; border-radius:16px; padding:22px; background:#f8fbff;">
            <h3 style="margin:0 0 12px 0; font-size:17px; color:#0f172a; display:flex; align-items:center; gap:8px;">
              <span>🎯</span>
              <span>Bạn có thể phản hồi về</span>
            </h3>
            <ul class="wb-check-list" style="margin-top:0;">
              <li><span class="wb-green-tick">✓</span><span>Chất lượng và độ chính xác của bản dịch.</span></li>
              <li><span class="wb-green-tick">✓</span><span>Trải nghiệm giao diện và khả năng sử dụng.</span></li>
              <li><span class="wb-green-tick">✓</span><span>Ngôn ngữ cần bổ sung.</span></li>
              <li><span class="wb-green-tick">✓</span><span>Định dạng tài liệu cần hỗ trợ.</span></li>
              <li><span class="wb-green-tick">✓</span><span>Tính năng mới mong muốn.</span></li>
              <li><span class="wb-green-tick">✓</span><span>Báo cáo lỗi kỹ thuật hoặc nội dung chưa phù hợp.</span></li>
            </ul>

            <hr style="border:none; border-top:1px solid #e2e8f0; margin:18px 0;" />

            <h3 style="margin:0 0 10px 0; font-size:17px; color:#0f172a; display:flex; align-items:center; gap:8px;">
              <span style="color:var(--wb-blue);">ⓘ</span>
              <span>Lưu ý</span>
            </h3>
            <ul style="margin:0; padding-left:18px; font-size:13.5px; color:#334155; line-height:1.65;">
              <li>Vui lòng mô tả rõ ràng, cụ thể và ngắn gọn.</li>
              <li>Có thể đính kèm ảnh chụp màn hình (nếu cần).</li>
              <li>Không gửi mật khẩu, mã xác thực hoặc thông tin cá nhân nhạy cảm.</li>
              <li>Mọi ý kiến đều được tự động chuyển trực tiếp tới hộp thư chính thức <strong>${OFFICIAL_SUPPORT_EMAIL}</strong> để ghi nhận và xem xét.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- KHU VỰC THÔNG BÁO TRẠNG THÁI CHUNG -->
    <div id="wbGlobalToast" class="wb-toast" role="status" aria-live="polite"></div>
  </main>

  <!-- FOOTER THỐNG NHẤT TOÀN WEBSITE (ĐỐI CHIẾU 08 ẢNH) -->
  <footer class="wb-footer">
    <div class="wb-footer-inner">
      <a href="/" class="wb-brand-group" onclick="event.preventDefault(); switchView('text');">
        <div class="wb-brand-logo" style="height:34px;">
          <img src="/assets/logo.jpg" alt="WORD BRIDGE" style="height:34px;" onerror="this.style.display='none'; this.parentElement.innerHTML=${JSON.stringify(WORD_BRIDGE_LOGO_SVG)};" />
        </div>
        <div style="display:flex; flex-direction:column;">
          <strong style="font-size:13px; color:#0f172a;">WORD BRIDGE</strong>
          <span style="font-size:11.5px; color:#64748b;">Dịch thuật Word Bridge</span>
        </div>
      </a>

      <div class="wb-footer-links">
        <a href="/gioi-thieu" class="wb-footer-link" id="footBtn_about" onclick="event.preventDefault(); switchView('about');">
          <span>ⓘ</span>
          <span>Giới thiệu về Word Bridge Translation</span>
        </a>
        <a href="/quyen-rieng-tu" class="wb-footer-link" id="footBtn_privacy" onclick="event.preventDefault(); switchView('privacy');">
          <span>🛡️</span>
          <span>Quyền riêng tư và Điều khoản</span>
        </a>
        <a href="/tro-giup" class="wb-footer-link" id="footBtn_help" onclick="event.preventDefault(); switchView('help');">
          <span>❓</span>
          <span>Trợ giúp</span>
        </a>
        <a href="/phan-hoi" class="wb-footer-link" id="footBtn_feedback" onclick="event.preventDefault(); switchView('feedback');">
          <span>💬</span>
          <span>Gửi ý kiến phản hồi</span>
        </a>
      </div>

      <div style="display:flex; align-items:center; gap:8px; font-size:13.5px; font-weight:600; color:#334155;">
        <span>🌐</span>
        <span>Tiếng Việt</span>
        <span>⌄</span>
      </div>
    </div>
  </footer>

  <script>
    const WB_LANGUAGES = ${languagesJson};
    const WB_DOMAINS = ${domainsJson};
    const WB_FEEDBACK_TYPES = ${feedbackTypesJson};
    const INITIAL_VIEW = ${JSON.stringify(safeView)};

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

    let appState = {
      currentView: INITIAL_VIEW,
      selectedDocFile: null,
      selectedOcrFile: null,
      selectedFeedbackFile: null,
      lastDocBlobUrl: null,
      lastTranslatedWebsiteHtml: "",
      lastOcrTranslatedText: ""
    };

    function populateAllSelects() {
      const sourceIds = ["wbTextSourceLang", "wbDocSourceLang", "wbWebSourceLang", "wbOcrSourceLang"];
      const targetIds = ["wbTextTargetLang", "wbDocTargetLang", "wbWebTargetLang", "wbOcrTargetLang"];
      const domainIds = ["wbTextDomain", "wbDocDomain", "wbOcrDomain"];

      sourceIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = "";
        WB_LANGUAGES.forEach((l) => {
          const opt = document.createElement("option");
          opt.value = l.code;
          opt.textContent = l.code === "auto" ? "Tự động nhận diện" : l.name + " (" + l.nativeName + ")";
          if (l.code === "auto") opt.selected = true;
          el.appendChild(opt);
        });
      });

      targetIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = "";
        WB_LANGUAGES.filter((l) => l.code !== "auto").forEach((l) => {
          const opt = document.createElement("option");
          opt.value = l.code;
          opt.textContent = l.name + " (" + l.nativeName + ")";
          if (l.code === "vi") opt.selected = true;
          el.appendChild(opt);
        });
      });

      domainIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = "";
        WB_DOMAINS.forEach((d) => {
          const opt = document.createElement("option");
          opt.value = d.id;
          opt.textContent = d.name;
          if (d.id === "general") opt.selected = true;
          el.appendChild(opt);
        });
      });

      const fbSelect = document.getElementById("wbFeedbackType");
      if (fbSelect) {
        WB_FEEDBACK_TYPES.forEach((t) => {
          const opt = document.createElement("option");
          opt.value = t.id;
          opt.textContent = t.label;
          fbSelect.appendChild(opt);
        });
      }
    }

    function switchView(viewName, skipPushState) {
      const target = VIEW_TO_PATH[viewName] ? viewName : "text";
      appState.currentView = target;

      document.querySelectorAll(".wb-view-section").forEach((sec) => {
        sec.classList.toggle("active", sec.id === "view_" + target);
      });

      ["text", "document", "website", "image", "privacy", "help"].forEach((navKey) => {
        const btn = document.getElementById("navBtn_" + navKey);
        if (btn) {
          const isMatch = navKey === target || (navKey === "help" && target === "feedback");
          btn.classList.toggle("active", isMatch);
        }
      });

      ["about", "privacy", "help", "feedback"].forEach((footKey) => {
        const fBtn = document.getElementById("footBtn_" + footKey);
        if (fBtn) fBtn.classList.toggle("active", footKey === target);
      });

      hideToast();
      if (!skipPushState && window.history && window.history.pushState) {
        const newPath = target === "text" ? "/" : VIEW_TO_PATH[target];
        window.history.pushState({ view: target }, "", newPath);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    window.addEventListener("popstate", (evt) => {
      const v = evt.state?.view || "text";
      switchView(v, true);
    });

    function toggleLauncherMenu(evt) {
      evt.stopPropagation();
      document.getElementById("wbLauncherMenu").classList.toggle("open");
    }
    document.addEventListener("click", () => {
      const menu = document.getElementById("wbLauncherMenu");
      if (menu) menu.classList.remove("open");
    });

    function showToast(type, msg) {
      const box = document.getElementById("wbGlobalToast");
      box.className = "wb-toast show wb-toast-" + type;
      box.textContent = msg;
    }

    function hideToast() {
      const box = document.getElementById("wbGlobalToast");
      box.className = "wb-toast";
      box.textContent = "";
    }

    function swapLangPair(sourceId, targetId, isTextView) {
      const srcEl = document.getElementById(sourceId);
      const tgtEl = document.getElementById(targetId);
      let srcVal = srcEl.value;
      const tgtVal = tgtEl.value;
      if (srcVal === "auto") {
        srcVal = tgtVal === "vi" ? "en" : "vi";
      }
      srcEl.value = tgtVal;
      tgtEl.value = srcVal;

      if (isTextView) {
        const outEl = document.getElementById("wbTargetOutput");
        if (!outEl.classList.contains("placeholder") && outEl.textContent.trim()) {
          document.getElementById("wbSourceInput").value = outEl.textContent;
          onTextInputChanged();
        }
      }
    }

    function onTextInputChanged() {
      const text = document.getElementById("wbSourceInput").value;
      const chars = Array.from(text).length;
      const words = text.trim() ? text.trim().split(/\\s+/).length : 0;
      document.getElementById("wbSourceCounters").innerHTML =
        chars.toLocaleString("vi-VN") + " ký tự &nbsp;|&nbsp; " + words.toLocaleString("vi-VN") + " từ";
    }

    function clearTextTranslation() {
      document.getElementById("wbSourceInput").value = "";
      document.getElementById("wbSourceCounters").innerHTML = "0 ký tự &nbsp;|&nbsp; 0 từ";
      document.getElementById("wbDetectedLangInfo").textContent = "";
      const out = document.getElementById("wbTargetOutput");
      out.textContent = "Bản dịch sẽ hiển thị tại đây...";
      out.classList.add("placeholder");
      hideToast();
    }

    async function executeTextTranslation() {
      const text = document.getElementById("wbSourceInput").value;
      if (!text.trim()) {
        showToast("error", "Vui lòng nhập nội dung văn bản cần dịch.");
        return;
      }
      hideToast();
      const out = document.getElementById("wbTargetOutput");
      out.classList.remove("placeholder");
      out.textContent = "Đang dịch nội dung...";

      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            text,
            sourceLang: document.getElementById("wbTextSourceLang").value,
            targetLang: document.getElementById("wbTextTargetLang").value,
            domain: document.getElementById("wbTextDomain").value
          })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          out.textContent = "Bản dịch sẽ hiển thị tại đây...";
          out.classList.add("placeholder");
          showToast("error", data.message || "Không thể dịch văn bản.");
          return;
        }
        out.textContent = data.translatedText;
        out.dir = data.targetLanguage?.dir || "ltr";
        document.getElementById("wbDetectedLangInfo").textContent =
          data.sourceLanguage?.autoDetected
            ? "• Đã nhận diện: " + (data.sourceLanguage?.name || data.sourceLanguage?.resolved)
            : "";
        document.getElementById("wbSourceCounters").innerHTML =
          (data.stats?.source?.charCount || 0).toLocaleString("vi-VN") +
          " ký tự &nbsp;|&nbsp; " +
          (data.stats?.source?.wordCount || 0).toLocaleString("vi-VN") +
          " từ";
        document.getElementById("wbTargetDomainMeta").textContent =
          "Lĩnh vực: " + (data.domain?.name || "Tổng quát") + " · Zero User Data Storage";
      } catch (_) {
        showToast("error", "Lỗi kết nối máy chủ dịch thuật. Vui lòng thử lại.");
      }
    }

    async function copyTargetText() {
      const out = document.getElementById("wbTargetOutput");
      if (out.classList.contains("placeholder") || !out.textContent.trim()) {
        showToast("info", "Chưa có kết quả dịch để sao chép.");
        return;
      }
      try {
        await navigator.clipboard.writeText(out.textContent);
        showToast("success", "Đã sao chép bản dịch vào clipboard.");
      } catch (_) {}
    }

    function toggleTargetFullscreen() {
      const panel = document.getElementById("wbTextTargetPanel");
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (panel.requestFullscreen) {
        panel.requestFullscreen();
      }
    }

    function speakTextContent(side) {
      if (!("speechSynthesis" in window)) {
        showToast("info", "Trình duyệt của bạn không hỗ trợ phát âm giọng nói.");
        return;
      }
      const text =
        side === "source"
          ? document.getElementById("wbSourceInput").value.trim()
          : document.getElementById("wbTargetOutput").classList.contains("placeholder")
            ? ""
            : document.getElementById("wbTargetOutput").textContent.trim();
      if (!text) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const code =
        side === "source"
          ? document.getElementById("wbTextSourceLang").value
          : document.getElementById("wbTextTargetLang").value;
      const info = WB_LANGUAGES.find((l) => l.code === code);
      u.lang = (info && info.speechLang) || (code === "auto" ? "vi-VN" : code);
      window.speechSynthesis.speak(u);
    }

    function arrayBufferToBase64(buffer) {
      const bytes = new Uint8Array(buffer);
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      }
      return btoa(binary);
    }

    function onDropFile(evt, mode) {
      evt.preventDefault();
      evt.currentTarget.classList.remove("dragover");
      const file = evt.dataTransfer?.files?.[0];
      if (!file) return;
      if (mode === "document") onDocFilePicked(file);
      else if (mode === "image") onOcrFilePicked(file);
    }

    function onDocFilePicked(file) {
      if (!file) return;
      appState.selectedDocFile = file;
      document.getElementById("wbDocSelectedLabel").textContent =
        "Đã chọn tệp: " + file.name + " (" + (file.size / 1024).toFixed(1) + " KB)";
      hideToast();
    }

    async function executeDocumentTranslation() {
      const file = appState.selectedDocFile;
      if (!file) {
        showToast("error", "Vui lòng chọn tệp tài liệu cần dịch (PDF, DOCX, DOC, PPTX, XLSX, CSV, TXT).");
        return;
      }
      hideToast();
      showToast("info", "Đang xử lý và dịch tài liệu trên bộ nhớ tạm...");
      try {
        const base64Content = arrayBufferToBase64(await file.arrayBuffer());
        const res = await fetch("/api/document/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            filename: file.name,
            base64Content,
            sourceLang: document.getElementById("wbDocSourceLang").value,
            targetLang: document.getElementById("wbDocTargetLang").value,
            domain: document.getElementById("wbDocDomain").value
          })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          showToast("error", data.message || "Không thể dịch tài liệu này.");
          return;
        }
        if (appState.lastDocBlobUrl) URL.revokeObjectURL(appState.lastDocBlobUrl);
        const bin = atob(data.downloadBase64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blobUrl = URL.createObjectURL(new Blob([bytes], { type: data.mimeType }));
        appState.lastDocBlobUrl = blobUrl;

        document.getElementById("wbDocOutName").textContent = "Tài liệu kết quả: " + data.outputFilename;
        document.getElementById("wbDocOutMeta").textContent =
          "Định dạng: " + data.format.toUpperCase() + " · Dung lượng: " + data.outputByteLength.toLocaleString("vi-VN") + " bytes";
        document.getElementById("wbDocNoticeText").textContent = data.limitationsNotice || "";
        document.getElementById("wbDocSourcePreview").textContent = data.sourcePreview || "";
        document.getElementById("wbDocTargetPreview").textContent = data.translatedPreview || "";

        document.getElementById("wbDocDownloadTrigger").onclick = () => {
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = data.outputFilename;
          document.body.appendChild(a);
          a.click();
          a.remove();
        };
        document.getElementById("wbDocResultBox").style.display = "block";
        showToast("success", "Đã dịch tài liệu thành công! Bạn có thể tải tài liệu đã dịch về máy.");
      } catch (_) {
        showToast("error", "Phát sinh lỗi khi xử lý tài liệu.");
      }
    }

    async function executeWebsiteTranslation() {
      const url = document.getElementById("wbWebsiteUrlInput").value.trim();
      if (!url) {
        showToast("error", "Vui lòng nhập địa chỉ URL trang web cần dịch.");
        return;
      }
      hideToast();
      showToast("info", "Đang kiểm tra bảo mật chống SSRF và dịch nội dung trang web...");
      try {
        const res = await fetch("/api/website/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            url,
            sourceLang: document.getElementById("wbWebSourceLang").value,
            targetLang: document.getElementById("wbWebTargetLang").value
          })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          showToast("error", data.message || "Không thể dịch trang web này.");
          return;
        }
        appState.lastTranslatedWebsiteHtml = data.translatedHtml;
        document.getElementById("wbWebResultTitle").textContent = "Đã dịch trang web: " + data.url;
        document.getElementById("wbWebResultMeta").textContent =
          "Ngôn ngữ nguồn: " +
          (data.sourceLanguage?.name || data.sourceLanguage?.resolved) +
          " → " +
          (data.targetLanguage?.name || data.targetLanguage?.code) +
          " · Đã dịch " +
          data.translatedNodeCount +
          " thành phần nội dung";

        const frame = document.getElementById("wbWebPreviewFrame");
        frame.srcdoc = data.translatedHtml;

        document.getElementById("wbOpenTranslatedWebBtn").onclick = () => {
          const blob = new Blob([appState.lastTranslatedWebsiteHtml], { type: "text/html; charset=utf-8" });
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, "_blank", "noopener");
        };

        document.getElementById("wbWebsiteResultBox").style.display = "block";
        showToast("success", "Đã dịch trang web thành công!");
      } catch (_) {
        showToast("error", "Không thể xử lý trang web được yêu cầu.");
      }
    }

    function onOcrFilePicked(file) {
      if (!file) return;
      appState.selectedOcrFile = file;
      document.getElementById("wbOcrSelectedLabel").textContent =
        "Đã chọn ảnh: " + file.name + " (" + (file.size / 1024).toFixed(1) + " KB)";
      hideToast();
    }

    async function executeOcrTranslation() {
      const file = appState.selectedOcrFile;
      if (!file) {
        showToast("error", "Vui lòng chọn hình ảnh cần dịch (JPG, JPEG, PNG, WEBP).");
        return;
      }
      hideToast();
      showToast("info", "Đang nhận diện văn bản trong ảnh và dịch thuật...");
      try {
        const base64Content = arrayBufferToBase64(await file.arrayBuffer());
        const res = await fetch("/api/ocr/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            filename: file.name,
            base64Content,
            sourceLang: document.getElementById("wbOcrSourceLang").value,
            targetLang: document.getElementById("wbOcrTargetLang").value,
            domain: document.getElementById("wbOcrDomain").value
          })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          showToast("error", data.message || "Không thể nhận diện văn bản từ hình ảnh này.");
          return;
        }
        appState.lastOcrTranslatedText = data.translatedText;
        document.getElementById("wbOcrSourceText").textContent = data.extractedText;
        document.getElementById("wbOcrTargetText").textContent = data.translatedText;
        document.getElementById("wbOcrResultBox").style.display = "block";
        showToast("success", "Đã nhận diện và dịch nội dung hình ảnh thành công!");
      } catch (_) {
        showToast("error", "Lỗi khi xử lý nhận diện hình ảnh.");
      }
    }

    async function copyOcrResult() {
      if (!appState.lastOcrTranslatedText) return;
      try {
        await navigator.clipboard.writeText(appState.lastOcrTranslatedText);
        showToast("success", "Đã sao chép bản dịch hình ảnh.");
      } catch (_) {}
    }

    function downloadOcrResultTxt() {
      if (!appState.lastOcrTranslatedText) return;
      const blob = new Blob([appState.lastOcrTranslatedText], { type: "text/plain; charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "wordbridge-image-translation.txt";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    function toggleAccordion(btnEl) {
      const item = btnEl.closest(".wb-accordion-item");
      if (item) item.classList.toggle("open");
    }

    const HELP_TOPICS_CONTENT = {
      guides: {
        title: "1. Hướng dẫn sử dụng 04 cơ chế dịch thuật",
        html: "<ul><li><strong>Dịch văn bản:</strong> Nhập văn bản trực tiếp hoặc dán nội dung (tối đa 15.000 ký tự), chọn cặp ngôn ngữ và lĩnh vực rồi nhấn Dịch.</li><li><strong>Dịch tài liệu:</strong> Tải tệp PDF, DOCX, DOC, PPTX, XLSX, CSV hoặc TXT (tối đa 50 MB) để dịch và tải ngay tệp kết quả.</li><li><strong>Dịch trang web:</strong> Nhập URL trang web công khai (http/https) để dịch toàn bộ trang giữ nguyên bố cục.</li><li><strong>Dịch hình ảnh:</strong> Tải ảnh JPG, JPEG, PNG, WEBP (tối đa 10 MB) để nhận diện chữ OCR và dịch sang hơn 100 ngôn ngữ.</li></ul>"
      },
      troubleshooting: {
        title: "2. Xử lý sự cố & Các lỗi thường gặp",
        html: "<ul><li><strong>Tệp vượt quá dung lượng hoặc có mật khẩu:</strong> Chia nhỏ tài liệu dưới 50 MB (hình ảnh dưới 10 MB) và gỡ mật khẩu trước khi tải lên.</li><li><strong>Trang web không thể dịch:</strong> Kiểm tra URL có đúng chuẩn <code>https://</code> hay không; các trang nội bộ (localhost/IP riêng) hoặc trang chặn bot (403) sẽ được hệ thống thông báo rõ.</li><li><strong>Hình ảnh không nhận diện được chữ:</strong> Đảm bảo ảnh chụp thẳng, đủ sáng, chữ không bị mờ hoặc bị che khuất.</li></ul>"
      },
      security: {
        title: "3. Tài khoản, Quyền riêng tư & Bảo mật Dữ liệu",
        html: "<ul><li><strong>Không cần tạo tài khoản bắt buộc:</strong> Bạn có thể sử dụng ngay toàn bộ tính năng dịch thuật mà không phải khai báo thông tin cá nhân.</li><li><strong>Zero User Data Storage:</strong> Không lưu văn bản dịch, không lưu tài liệu gốc, không lưu hình ảnh hay lịch sử dịch thuật.</li><li><strong>Chống SSRF &amp; Chặn Macro:</strong> Tự động từ chối tệp Office chứa Macro (<code>vbaProject.bin</code>) và ngăn chặn mọi truy vấn URL vào địa chỉ nội bộ.</li></ul>"
      },
      faq: {
        title: "4. Câu hỏi thường gặp (FAQ) & Hỗ trợ trực tiếp",
        html: "<p>Xem danh sách câu hỏi thường gặp ngay bên dưới hoặc nhấn nút <strong>Gửi yêu cầu hỗ trợ</strong> để gửi thông tin trực tiếp về email chính thức <strong>wordbridge.education@gmail.com</strong>.</p>"
      }
    };

    function showHelpTopicDetail(topicKey) {
      const info = HELP_TOPICS_CONTENT[topicKey] || HELP_TOPICS_CONTENT.guides;
      document.getElementById("wbHelpTopicTitle").textContent = info.title;
      document.getElementById("wbHelpTopicBody").innerHTML = info.html;
    }

    function filterHelpContent() {
      const q = (document.getElementById("wbHelpSearchInput").value || "").toLowerCase().trim();
      document.querySelectorAll("#wbFaqList .faq-entry").forEach((item) => {
        const text = item.textContent.toLowerCase();
        const matched = !q || text.includes(q);
        item.style.display = matched ? "block" : "none";
        if (q && matched) item.classList.add("open");
      });
    }

    function updateFeedbackCharCounter() {
      const val = document.getElementById("wbFeedbackMessage").value || "";
      document.getElementById("wbFeedbackCharCount").textContent =
        val.length.toLocaleString("vi-VN") + " / 2.000";
    }

    function onFeedbackFilePicked(file) {
      if (!file) return;
      appState.selectedFeedbackFile = file;
      document.getElementById("wbFeedbackFileLabel").textContent =
        "Đã đính kèm: " + file.name + " (" + (file.size / 1024).toFixed(1) + " KB)";
    }

    function resetFeedbackForm() {
      document.getElementById("wbFeedbackForm").reset();
      appState.selectedFeedbackFile = null;
      document.getElementById("wbFeedbackCharCount").textContent = "0 / 2.000";
      document.getElementById("wbFeedbackFileLabel").innerHTML =
        "Hỗ trợ: JPG, JPEG, PNG, PDF &nbsp;|&nbsp; Dung lượng tối đa: 10 MB";
      hideToast();
    }

    async function submitFeedbackForm() {
      const feedbackType = document.getElementById("wbFeedbackType").value;
      const title = document.getElementById("wbFeedbackTitle").value.trim();
      const message = document.getElementById("wbFeedbackMessage").value.trim();
      const contactEmail = document.getElementById("wbFeedbackContact").value.trim();

      if (!feedbackType || !title || !message) {
        showToast("error", "Vui lòng điền đầy đủ Loại phản hồi, Tiêu đề và Nội dung chi tiết.");
        return;
      }

      hideToast();
      showToast("info", "Đang gửi ý kiến phản hồi tới wordbridge.education@gmail.com...");

      try {
        let attachmentBase64 = "";
        let attachmentFilename = "";
        if (appState.selectedFeedbackFile) {
          attachmentBase64 = arrayBufferToBase64(await appState.selectedFeedbackFile.arrayBuffer());
          attachmentFilename = appState.selectedFeedbackFile.name;
        }

        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            feedbackType,
            title,
            message,
            contactEmail,
            attachmentBase64,
            attachmentFilename
          })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          showToast("error", data.message || "Không thể gửi phản hồi lúc này.");
          return;
        }
        resetFeedbackForm();
        showToast(
          "success",
          "Đã gửi phản hồi thành công tới " + data.recipient + " với tiêu đề: " + data.subject
        );
      } catch (_) {
        showToast("error", "Lỗi kết nối khi gửi biểu mẫu phản hồi.");
      }
    }

    populateAllSelects();
    switchView(INITIAL_VIEW, true);
  </script>
</body>
</html>`;
}
