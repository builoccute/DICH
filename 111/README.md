# Dịch thuật Word Bridge (Word Bridge Translation – Trans)

- **Tên hệ thống:** Dịch thuật Word Bridge (`Word Bridge Translation` – Dịch vụ `Trans`)
- **Tên miền chính thức:** [https://dichthuat.wordbridge.io.vn](https://dichthuat.wordbridge.io.vn)
- **Hệ sinh thái:** Word Bridge ([https://wordbridge.io.vn](https://wordbridge.io.vn))
- **Khẩu hiệu:** *Where Languages Bring People Together.* / *WORD BRIDGE – CONNECTING LANGUAGES, CONNECTING THE WORLD.*
- **Nguyên tắc kiến trúc cốt lõi:** **ZERO USER DATA STORAGE** (Không lưu trữ bất kỳ văn bản, tệp tài liệu, hình ảnh OCR, metadata hay lịch sử dịch thuật nào của người dùng; chỉ lưu duy nhất tổng số lượt truy cập website `total_accesses` trong Cloudflare D1).

## 1. Phân biệt Word Bridge Learning và Word Bridge Trans

| Tiêu chí | Word Bridge Learning (`wordbridge.io.vn`) | Word Bridge Trans (`dichthuat.wordbridge.io.vn`) |
| :--- | :--- | :--- |
| **Định hướng** | Nền tảng học tập và thực hành ngoại ngữ | Hệ thống dịch thuật trực tuyến toàn cầu |
| **Phạm vi ngôn ngữ** | Hỗ trợ ban đầu 05 ngôn ngữ học tập (`zh`, `en`, `ko`, `ja`, `ru`) | Hỗ trợ **104 ngôn ngữ toàn cầu** (bao gồm cả ngôn ngữ RTL như `ar`, `he`, `fa`, `ur`) |
| **Chế độ chuyên ngành** | Theo giáo trình học tập | **20 chế độ dịch thuật chuyên ngành** độc lập |
| **Chính sách dữ liệu** | Lưu tiến độ học tập theo tài khoản | **ZERO USER DATA STORAGE** (Chỉ lưu tổng lượt truy cập `site_metrics.total_accesses`) |

## 2. Cấu trúc Thư mục Dự án

```text
word-bridge-translation/
├── package.json                                  # Khai báo scripts build, test, audit, deploy
├── package-lock.json                             # Khóa phiên bản phụ thuộc phục vụ CI/CD
├── wrangler.toml                                 # Cấu hình Cloudflare Workers, D1 (word) & R2 (word)
├── .gitignore                                    # Loại bỏ node_modules, Secrets và tệp tạm
├── .env.example                                  # Mẫu khai báo biến môi trường (không chứa Secrets)
├── README.md                                     # Tài liệu hướng dẫn cài đặt, GitHub và triển khai
├── migrations/
│   └── 0001_site_metrics_zero_storage.sql        # Migration bổ sung an toàn cho bảng site_metrics
├── public/
│   └── assets/
│       └── logo.jpg                              # Logo chính thức của thương hiệu Word Bridge
├── scripts/
│   └── build.js                                  # Kịch bản kiểm tra cú pháp & kiểm toán Zero-Storage
├── src/
│   ├── worker.js                                 # Điểm vào chuẩn ES Module cho Cloudflare Workers
│   ├── server.js                                 # Máy chủ HTTP cục bộ (Node.js >= 20)
│   ├── api/
│   │   └── router.js                             # Bộ định tuyến API & giao diện (Cache-Control: no-store)
│   ├── db/
│   │   └── d1-metrics.js                         # Bộ đếm nguyên tử D1 & Tường lửa SQL Zero-Storage
│   ├── security/
│   │   ├── privacy-shield.js                     # Kiểm tra Magic Bytes, Rate Limiter, xóa bộ nhớ tạm
│   │   └── r2-guard.js                           # Khóa bảo vệ R2 (chặn ghi tệp người dùng, bảo toàn bucket)
│   ├── services/
│   │   ├── languages.js                          # Danh mục 104 ngôn ngữ toàn cầu & nhận diện ngôn ngữ
│   │   ├── domains.js                            # 20 chuyên ngành dịch thuật & từ điển thuật ngữ công khai
│   │   ├── translation-engine.js                 # Lõi dịch thuật đa tầng (Workers AI / Cloud API / Built-in)
│   │   ├── document-processor.js                 # Xử lý dịch tài liệu trên RAM (PDF, DOCX, XLSX, PPTX, TXT, CSV, DOC)
│   │   └── ocr-processor.js                      # Nhận diện OCR & dịch hình ảnh trên RAM (PNG, JPG, WEBP)
│   └── ui/
│       ├── assets.js                             # Phục vụ tài nguyên thương hiệu Word Bridge
│       └── template.js                           # Giao diện Frontend Responsive (Zero Browser Storage)
└── tests/
    └── full-system.test.js                       # Bộ kiểm thử tự động toàn diện (Full Test Suite)
```

## 3. Chính sách Hạ tầng Cloudflare D1 & R2

1. **Cloudflare D1 Database (`word`):**
   - `binding = "DB"`
   - `database_name = "word"`
   - `database_id = "ce84cc48-6d49-409b-b45a-13ba3bc4a771"`
   - Bảo toàn nguyên vẹn toàn bộ các bảng hiện có trong Database `word` (tuyệt đối không `DROP TABLE` hay `DROP DATABASE`).
   - Chỉ sử dụng bảng `site_metrics (id INTEGER PRIMARY KEY CHECK (id = 1), total_accesses INTEGER NOT NULL DEFAULT 0)` với câu lệnh cập nhật nguyên tử:
     ```sql
     INSERT INTO site_metrics (id, total_accesses) VALUES (1, 1)
     ON CONFLICT(id) DO UPDATE SET total_accesses = total_accesses + 1
     RETURNING total_accesses;
     ```
2. **Cloudflare R2 Object Storage (`word`):**
   - `binding = "R2"`
   - `bucket_name = "word"`
   - Giữ nguyên bucket `word` và toàn bộ các object hiện có của hệ sinh thái Word Bridge.
   - Module `R2ZeroStorageGuard` (`src/security/r2-guard.js`) chặn 100% thao tác ghi tệp người dùng (`put`, `createMultipartUpload`) hoặc xóa dữ liệu (`delete`) từ hệ thống dịch thuật.

## 4. Hướng dẫn Cài đặt, Kiểm thử và Build Cục bộ

Yêu cầu môi trường: **Node.js >= 20.0.0** và **npm >= 10.0.0**.

```bash
# 1. Cài đặt dependencies
npm install

# 2. Chạy kiểm toán tĩnh chính sách Zero User Data Storage & Build
npm run build

# 3. Chạy bộ kiểm thử tự động toàn diện (Full Test Suite)
npm test

# 4. Khởi động máy chủ phát triển cục bộ tại http://localhost:8787
npm run dev
```

## 5. Hướng dẫn Đưa Mã nguồn lên GitHub và Triển khai Cloudflare Workers

### Bước 1: Tạo GitHub Repository và Đẩy Mã nguồn
```bash
git init
git branch -M main
git add .
git commit -m "feat: release Word Bridge Translation (Trans) with Zero User Data Storage"
git remote add origin https://github.com/<ten-to-chuc>/word-bridge-translation.git
git push -u origin main
```

### Bước 2: Khai báo Secrets trên Cloudflare Workers (Tùy chọn nâng cấp nhà cung cấp Cloud AI)
Hệ thống hoạt động ngay lập tức với bộ máy dịch thuật nội tại hoặc Cloudflare Workers AI. Để kích hoạt thêm các nhà cung cấp dịch thuật đám mây (chế độ Zero Data Retention), chạy các lệnh sau:
```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put DEEPL_API_KEY
npx wrangler secret put GOOGLE_TRANSLATE_API_KEY
npx wrangler secret put AZURE_TRANSLATOR_KEY
```

### Bước 3: Thực thi Migration Bổ sung An toàn trên Cloudflare D1
```bash
# Kiểm tra ở môi trường local trước:
npm run db:migrate:local

# Áp dụng lên Database D1 `word` (ce84cc48-6d49-409b-b45a-13ba3bc4a771):
npm run db:migrate:remote
```

### Bước 4: Triển khai lên Cloudflare Workers (`dichthuat.wordbridge.io.vn`)
```bash
npm run deploy
# Hoặc chạy trực tiếp:
npx wrangler deploy
```

### Bước 5: Kiểm tra Sau Triển khai (Post-Deploy Verification)
- Truy cập `https://dichthuat.wordbridge.io.vn/api/health` để kiểm tra trạng thái kết nối D1 (`word`), trạng thái bảo toàn R2 (`word`), header `Cache-Control: no-store` và trạng thái các nhà cung cấp dịch thuật.
- Truy cập `https://dichthuat.wordbridge.io.vn/` để kiểm tra giao diện dịch văn bản, dịch tài liệu, dịch hình ảnh OCR và bộ đếm tổng lượt truy cập.
