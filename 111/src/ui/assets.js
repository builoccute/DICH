/**
 * @file src/ui/assets.js
 * @description Hệ thống Nhận diện Thương hiệu Toàn diện của Word Bridge Translation (Phần III.2 & VIII.3):
 *   1. Logo chính cho website (`/assets/logo.jpg`)
 *   2. Logo phiên bản ngang (`/assets/logo-horizontal.svg`)
 *   3. Logo phiên bản biểu tượng (`/assets/logo-icon.svg`)
 *   4. Favicon trình duyệt (`/favicon.ico` & `/assets/favicon.svg`)
 *   5. Biểu tượng ứng dụng web & PWA (`/manifest.webmanifest`, `/assets/icon-192.svg`, `/assets/icon-512.svg`)
 *   6. Hình ảnh đại diện Open Graph khi chia sẻ liên kết (`/assets/og-banner.svg`)
 *   7. Bộ 04 biểu tượng nhận diện cho bốn chức năng dịch thuật (Văn bản, Tài liệu, Trang web, Hình ảnh)
 *   8. Các tệp SEO chuẩn (`/robots.txt`, `/sitemap.xml`)
 */

import * as fs from "node:fs";
import * as path from "node:path";

let cachedLogoBytes = null;

/**
 * Logo phiên bản ngang (Horizontal Brand Logo)
 */
export const WORD_BRIDGE_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 180" width="100%" height="100%" role="img" aria-label="WORD BRIDGE - Where Languages Bring People Together">
  <rect width="680" height="180" fill="transparent" rx="12"/>
  <g transform="translate(20, 18)">
    <path d="M 16 88 A 88 76 0 0 1 184 88" fill="none" stroke="#d1101a" stroke-width="11" stroke-linecap="round"/>
    <line x1="65" y1="36" x2="65" y2="88" stroke="#d1101a" stroke-width="9" stroke-linecap="round"/>
    <line x1="100" y1="24" x2="100" y2="96" stroke="#d1101a" stroke-width="9" stroke-linecap="round"/>
    <line x1="135" y1="36" x2="135" y2="88" stroke="#d1101a" stroke-width="9" stroke-linecap="round"/>
    <path d="M 10 96 Q 55 82 100 105 Q 145 82 190 96 L 184 114 Q 145 100 100 122 Q 55 100 16 114 Z" fill="#2994a3"/>
    <path d="M 6 122 Q 55 108 100 130 Q 145 108 194 122 L 188 136 Q 145 122 100 142 Q 55 122 12 136 Z" fill="#084c59"/>
  </g>
  <text x="235" y="96" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="56" font-weight="900" letter-spacing="1">
    <tspan fill="#084c59">WORD</tspan>
    <tspan dx="10" fill="#d1101a">BRIDGE</tspan>
  </text>
  <text x="237" y="136" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="600" fill="#0d5663">
    Where Languages Bring People Together.
  </text>
</svg>`;

/**
 * Logo phiên bản biểu tượng (Icon Mark / Favicon / App Icon)
 */
export const WORD_BRIDGE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="220" height="220" role="img" aria-label="Word Bridge Translation Icon">
  <rect width="220" height="220" rx="44" fill="#ffffff"/>
  <rect x="6" y="6" width="208" height="208" rx="40" fill="none" stroke="#e2e8f0" stroke-width="4"/>
  <g transform="translate(10, 32)">
    <path d="M 16 88 A 88 76 0 0 1 184 88" fill="none" stroke="#d1101a" stroke-width="12" stroke-linecap="round"/>
    <line x1="65" y1="36" x2="65" y2="88" stroke="#d1101a" stroke-width="10" stroke-linecap="round"/>
    <line x1="100" y1="24" x2="100" y2="96" stroke="#d1101a" stroke-width="10" stroke-linecap="round"/>
    <line x1="135" y1="36" x2="135" y2="88" stroke="#d1101a" stroke-width="10" stroke-linecap="round"/>
    <path d="M 10 96 Q 55 82 100 105 Q 145 82 190 96 L 184 114 Q 145 100 100 122 Q 55 100 16 114 Z" fill="#2994a3"/>
    <path d="M 6 122 Q 55 108 100 130 Q 145 108 194 122 L 188 136 Q 145 122 100 142 Q 55 122 12 136 Z" fill="#084c59"/>
  </g>
</svg>`;

/**
 * Hình ảnh đại diện Open Graph (1200x630) khi chia sẻ liên kết dichthuat.wordbridge.io.vn
 */
export const WORD_BRIDGE_OG_BANNER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="ogBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f0f7ff"/>
      <stop offset="100%" stop-color="#e0f2fe"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#ogBg)"/>
  <rect x="60" y="60" width="1080" height="510" rx="28" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <g transform="translate(110, 120) scale(1.15)">
    <path d="M 16 88 A 88 76 0 0 1 184 88" fill="none" stroke="#d1101a" stroke-width="12" stroke-linecap="round"/>
    <line x1="65" y1="36" x2="65" y2="88" stroke="#d1101a" stroke-width="10" stroke-linecap="round"/>
    <line x1="100" y1="24" x2="100" y2="96" stroke="#d1101a" stroke-width="10" stroke-linecap="round"/>
    <line x1="135" y1="36" x2="135" y2="88" stroke="#d1101a" stroke-width="10" stroke-linecap="round"/>
    <path d="M 10 96 Q 55 82 100 105 Q 145 82 190 96 L 184 114 Q 145 100 100 122 Q 55 100 16 114 Z" fill="#2994a3"/>
    <path d="M 6 122 Q 55 108 100 130 Q 145 108 194 122 L 188 136 Q 145 122 100 142 Q 55 122 12 136 Z" fill="#084c59"/>
  </g>
  <text x="370" y="210" font-family="Inter, Arial, sans-serif" font-size="64" font-weight="900">
    <tspan fill="#084c59">WORD</tspan>
    <tspan dx="14" fill="#d1101a">BRIDGE</tspan>
  </text>
  <rect x="860" y="162" width="120" height="46" rx="23" fill="#d1101a"/>
  <text x="920" y="193" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="800" fill="#ffffff">TRANS</text>
  <text x="372" y="265" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700" fill="#0f172a">
    Dịch thuật Word Bridge – Nền tảng Dịch thuật Toàn cầu
  </text>
  <text x="115" y="370" font-family="Inter, Arial, sans-serif" font-size="26" fill="#334155">
    • Dịch văn bản · Dịch tài liệu (PDF, DOCX, PPTX, XLSX) · Dịch trang web · Dịch hình ảnh OCR
  </text>
  <text x="115" y="420" font-family="Inter, Arial, sans-serif" font-size="26" fill="#0f766e" font-weight="700">
    • Chính sách Zero User Data Storage · Bảo mật &amp; Tôn trọng Quyền riêng tư
  </text>
  <text x="115" y="505" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" fill="#1d4ed8">
    https://dichthuat.wordbridge.io.vn
  </text>
</svg>`;

/**
 * Bộ 04 biểu tượng nhận diện cho 04 chức năng dịch thuật
 */
export const FEATURE_ICONS_SVG = Object.freeze({
  text: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>`,
  document: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
  website: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  image: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`
});

export function getLogoAsset() {
  if (cachedLogoBytes) {
    return { bytes: cachedLogoBytes, contentType: "image/jpeg" };
  }
  try {
    const candidatePaths = [
      path.resolve(process.cwd(), "public/assets/logo.jpg"),
      path.resolve(process.cwd(), "word-bridge-translation/public/assets/logo.jpg")
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        cachedLogoBytes = new Uint8Array(fs.readFileSync(p));
        return { bytes: cachedLogoBytes, contentType: "image/jpeg" };
      }
    }
  } catch (_) {}
  return {
    bytes: new TextEncoder().encode(WORD_BRIDGE_LOGO_SVG),
    contentType: "image/svg+xml; charset=utf-8"
  };
}

export function getWebManifestJson() {
  return {
    name: "Dịch thuật Word Bridge (Word Bridge Translation)",
    short_name: "WB Trans",
    description:
      "Nền tảng dịch thuật trực tuyến toàn cầu của Word Bridge: Dịch văn bản, tài liệu, trang web và hình ảnh với chính sách Zero User Data Storage.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f8ff",
    theme_color: "#0b63e5",
    icons: [
      {
        src: "/assets/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any maskable"
      },
      {
        src: "/assets/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any maskable"
      }
    ]
  };
}

export function getRobotsTxt() {
  return [
    "User-agent: *",
    "Allow: /",
    "Allow: /dich-van-ban",
    "Allow: /dich-tai-lieu",
    "Allow: /dich-trang-web",
    "Allow: /dich-hinh-anh",
    "Allow: /gioi-thieu",
    "Allow: /quyen-rieng-tu",
    "Allow: /tro-giup",
    "Allow: /phan-hoi",
    "Disallow: /api/",
    "",
    "Sitemap: https://dichthuat.wordbridge.io.vn/sitemap.xml"
  ].join("\n");
}

export function getSitemapXml() {
  const pages = [
    { loc: "https://dichthuat.wordbridge.io.vn/", priority: "1.0" },
    { loc: "https://dichthuat.wordbridge.io.vn/dich-van-ban", priority: "0.9" },
    { loc: "https://dichthuat.wordbridge.io.vn/dich-tai-lieu", priority: "0.9" },
    { loc: "https://dichthuat.wordbridge.io.vn/dich-trang-web", priority: "0.9" },
    { loc: "https://dichthuat.wordbridge.io.vn/dich-hinh-anh", priority: "0.9" },
    { loc: "https://dichthuat.wordbridge.io.vn/gioi-thieu", priority: "0.8" },
    { loc: "https://dichthuat.wordbridge.io.vn/quyen-rieng-tu", priority: "0.7" },
    { loc: "https://dichthuat.wordbridge.io.vn/tro-giup", priority: "0.8" },
    { loc: "https://dichthuat.wordbridge.io.vn/phan-hoi", priority: "0.7" }
  ];
  const urlEntries = pages
    .map(
      (p) =>
        `  <url>\n    <loc>${p.loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;
}
