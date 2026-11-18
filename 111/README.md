# DỊCH THUẬT WORD BRIDGE — WORD BRIDGE TRANSLATION (TRANS)

- **Tên sản phẩm:** Dịch thuật Word Bridge (`Word Bridge Translation`)
- **Tên dịch vụ:** `Trans`
- **Website chính thức:** [https://dichthuat.wordbridge.io.vn](https://dichthuat.wordbridge.io.vn)
- **Hệ sinh thái:** Word Bridge ([https://wordbridge.io.vn](https://wordbridge.io.vn))
- **Cơ sở dữ liệu Cloudflare D1:** `word` (`ce84cc48-6d49-409b-b45a-13ba3bc4a771`, binding `DB`)
- **Hạ tầng Cloudflare R2 hiện có:** `word` (`Default Storage Class`, binding `R2`)
- **Phương châm:** *WORD BRIDGE – CONNECTING LANGUAGES, CONNECTING THE WORLD.*

## 1. Phân biệt Word Bridge Trans và Word Bridge Learning

| Tiêu chí | Word Bridge Trans (`dichthuat.wordbridge.io.vn`) | Word Bridge Learning (`wordbridge.io.vn`) |
| :--- | :--- | :--- |
| **Định hướng cốt lõi** | Nền tảng dịch thuật trực tuyến đa ngôn ngữ toàn cầu, độc lập hoàn toàn với chương trình học ngoại ngữ | Nền tảng học tập, tự rèn luyện ngoại ngữ và kết nối cộng đồng học tập |
| **Phạm vi ngôn ngữ** | **32+ ngôn ngữ toàn cầu** + Tự động nhận diện ngôn ngữ (`auto`), hỗ trợ cả ngôn ngữ viết từ phải sang trái (`RTL`: Ả Rập, Do Thái, Ba Tư, Urdu) | Tập trung ban đầu vào **05 ngôn ngữ học tập**: Tiếng Trung (`zh`), Tiếng Anh (`en`), Tiếng Hàn (`ko`), Tiếng Nhật (`ja`), Tiếng Nga (`ru`) |
| **Chính sách dữ liệu** | **ZERO USER DATA STORAGE**: Không lưu bất kỳ văn bản dịch, tệp tài liệu, ảnh OCR, metadata hay lịch sử dịch thuật nào của người dùng; chỉ lưu duy nhất tổng số lượt truy cập website (`site_metrics.total_accesses`) trên D1 | Lưu tiến độ thực hành, lộ trình học tập và không gian tổ chức theo tài khoản đăng ký |

## 2. Nguyên tắc Kiến trúc Bắt buộc: ZERO USER DATA STORAGE

Hệ thống **Dịch thuật Word Bridge (`Trans`)** tuân thủ nghiêm ngặt chính sách không lưu trữ dữ liệu người dùng:

1. **Không lưu nội dung dịch thuật:** Văn bản người dùng nhập, văn bản nguồn, văn bản đích, nội dung dịch từng đoạn và nội dung dịch 20 chuyên ngành chỉ được xử lý trên bộ nhớ RAM tạm thời (`Ephemeral In-Memory`) và giải phóng ngay sau khi trả kết quả.
2. **Không lưu thông tin tệp & OCR:** Tệp `PDF`, `DOCX`, `DOC`, `TXT`, `PPTX`, `XLSX`, `CSV` và hình ảnh `PNG`, `JPG/JPEG`, `WEBP` được kiểm tra chữ ký nhị phân (`Magic Bytes`), trích xuất và tái tạo trực tiếp trong bộ nhớ RAM rồi xóa trắng (`buffer.fill(0)`) trong khối `finally`. Tuyệt đối không ghi tệp người dùng lên Cloudflare R2 hay ghi metadata vào Cloudflare D1.
3. **Không lưu lịch sử & không theo dõi người dùng:** Không có chức năng Lưu bản dịch, Xem lại bản dịch cũ, Lịch sử dịch thuật, Từ điển cá nhân có lưu dữ liệu, hay Tài liệu gần đây. Không thống kê theo người dùng, tài khoản, địa chỉ IP, thiết bị hoặc phiên.
4. **Không lưu trên trình duyệt & chống Cache:** Không sử dụng `localStorage`, `sessionStorage`, `IndexedDB`, `Cookies` hoặc `Cache API` để lưu nội dung dịch thuật. Toàn bộ phản hồi từ `/api/trans/*` đều gắn header `Cache-Control: no-store, no-cache, must-revalidate, max-age=0` và `X-Zero-User-Data-Storage: enforced`.
5. **Chỉ số thống kê duy nhất trên Cloudflare D1 (`word`):** Bảng `site_metrics` chỉ lưu duy nhất một hàng `metric_key = 'total_accesses'`, được cập nhật bằng truy vấn tăng nguyên tử (`UPDATE site_metrics SET total_accesses = total_accesses + 1 WHERE metric_key = 'total_accesses'`) khi có lượt truy cập trang chính hợp lệ (không tăng bởi request tải tài nguyên tĩnh, healthcheck, prefetch hay request API dịch thuật).

## 3. Cấu trúc Thư mục Dự án

```text
wordbridge-translation/
├── .env.example                                  # Mẫu biến môi trường (đã loại bỏ hoàn toàn Secrets)
├── .gitignore                                    # Quy tắc loại trừ node_modules, .env, cache, dữ liệu tạm
├── package.json                                  # Khai báo scripts build, test, verify, migrate, deploy
├── package-lock.json                             # Lockfile chuẩn đảm bảo tính nhất quán khi cài đặt
├── wrangler.toml                                 # Cấu hình Cloudflare Workers, D1 (word) và R2 (word)
├── README.md                                     # Tài liệu hướng dẫn cài đặt, cấu hình và triển khai
├── database/
│   ├── schema.sql                                # Schema tổng thể D1 (bao gồm bảng site_metrics)
│   ├── seeds/
│   │   ├── 01_reference_data.sql                 # Dữ liệu danh mục tham chiếu ban đầu
│   │   └── 02_vn_admin_units.json                # Danh mục đơn vị hành chính Việt Nam
│   └── migrations/
│       ├── 0001_initial_core_and_auth.sql
│       ├── 0002_learning_progress_resources.sql
│       ├── 0003_community_chat_organizations.sql
│       ├── 0004_commerce_payment_loyalty.sql
│       ├── 0005_exam_cms_admin_ops.sql
│       ├── 0006_upgrade_2026_full_features.sql
│       └── 0007_translation_site_metrics_zero_storage.sql
├── scripts/
│   └── manage.js                                 # Công cụ CLI kiểm tra build, migrate, seed, verify
├── src/
│   ├── worker.js                                 # Entrypoint chuẩn ES Module cho Cloudflare Workers
│   ├── server.js                                 # Máy chủ HTTP Node.js đồng nhất với Worker
│   ├── app.dispatcher.js                         # Bộ điều phối API trung tâm (/api/trans/* và hệ sinh thái)
│   ├── config/
│   │   ├── constants.js                          # Hằng số thương hiệu, định tuyến và cấu hình hệ thống
│   │   ├── env.js                                # Quản lý biến môi trường và trạng thái kết nối D1/R2
│   │   ├── runtime.js                            # Tiện ích SHA-256/HMAC/Path tương thích 100% V8 Edge Isolate
│   │   └── embedded-data.js                      # Dữ liệu schema & giao diện nhúng cho Cloudflare Workers
│   ├── adapters/
│   │   ├── translation.adapter.js                # Động cơ dịch 32+ ngôn ngữ, 20 chuyên ngành, Tài liệu & OCR trong RAM
│   │   ├── database.adapter.js                   # Adapter kết nối Cloudflare D1 (word) & InMemoryD1Engine
│   │   ├── storage.adapter.js                    # Adapter Cloudflare R2 (word) có chốt chặn Zero-R2 cho dịch thuật
│   │   ├── email.adapter.js                      # Adapter gửi email giao dịch qua Resend API
│   │   ├── payment.adapter.js                    # Adapter đối soát thanh toán QR
│   │   └── realtime.adapter.js                   # Adapter sự kiện thời gian thực
│   ├── modules/
│   │   ├── translation.module.js                 # Nghiệp vụ Dịch thuật Word Bridge, bộ đếm D1 & kiểm toán Zero Storage
│   │   ├── learning.module.js                    # Nghiệp vụ học tập 05 ngôn ngữ (đã loại bỏ log ai_assistant_logs)
│   │   ├── users.module.js                       # Quản lý tài khoản và phiên đăng nhập
│   │   ├── progress.module.js                    # Quản lý tiến độ và hạn mức lưu trữ
│   │   ├── connections.module.js                 # Kết nối bạn học
│   │   ├── community.module.js                   # Bảng tin cộng đồng
│   │   ├── organizations.module.js               # Không gian tổ chức
│   │   ├── commerce.module.js                    # Gói thành viên & hỗ trợ
│   │   ├── payment.module.js                     # Xử lý đơn hàng
│   │   ├── exam.module.js                        # Hệ thống khảo thí
│   │   ├── cms.module.js                         # Quản trị nội dung CMS
│   │   └── admin.module.js                       # Vận hành & bảo trì hệ thống
│   ├── security/
│   │   ├── auth.service.js                       # Xác thực người dùng & quản trị viên tách biệt
│   │   ├── defense.middleware.js                 # WAF chống SQLi/XSS/SSRF, Rate Limiting ẩn danh & No-Store Headers
│   │   └── rbac.middleware.js                    # Phân quyền RBAC
│   └── frontend/
│       ├── index.html                            # Giao diện chính thức tích hợp Dịch thuật Word Bridge (Trans)
│       ├── css/
│       │   ├── design-system.css                 # Hệ thống thiết kế & giao diện responsive của Dịch thuật Word Bridge
│       │   └── layouts-responsive.css            # Bố cục đa thiết bị (Desktop, Laptop, Tablet, Smartphone)
│       ├── js/
│       │   ├── app-core.js                       # Nhân điều hướng SPA và quản lý trạng thái phiên
│       │   ├── views-translation.js              # Giao diện Dịch văn bản, Dịch tài liệu, OCR & Kiểm chứng Zero Storage
│       │   ├── views-public-auth.js              # Giao diện Trang chủ, Giới thiệu, Pháp lý, Đăng nhập/Đăng ký
│       │   ├── views-learning.js                 # Giao diện Học ngoại ngữ 05 ngôn ngữ
│       │   ├── views-community-org.js            # Giao diện Cộng đồng & Tổ chức
│       │   ├── views-commerce-exam.js            # Giao diện Dịch vụ & Khảo thí
│       │   └── views-admin-cms.js                # Giao diện Quản trị viên
│       └── assets/                               # Logo SVG và hình minh họa thương hiệu Word Bridge
└── tests/
    └── full-system.test.js                       # Bộ kiểm thử tự động toàn diện 13 phân hệ (bao gồm Full Test Trans)
```

## 4. Danh sách Biến Môi trường và Secrets Cần Khai Báo

Khi triển khai lên môi trường Production (Cloudflare Workers), người triển khai cấu hình các biến bí mật thông qua `npx wrangler secret put <KEY>` hoặc trên Cloudflare Dashboard (**Workers & Pages → wordbridge-edu → Settings → Variables and Secrets**):

| Tên Secret / Biến | Bắt buộc | Mô tả công dụng |
| :--- | :---: | :--- |
| `SESSION_SECRET` | **Có** | Chuỗi ngẫu nhiên tối thiểu 32–64 ký tự dùng để ký và bảo vệ phiên xác thực |
| `CSRF_SECRET` | **Có** | Chuỗi bí mật dùng để sinh CSRF Token và băm ẩn danh bộ đếm Rate Limiting trong RAM |
| `ADMIN_BOOTSTRAP_SECRET` | Tùy chọn | Mã bí mật một lần để khởi tạo tài khoản Super Admin đầu tiên |
| `TRANSLATION_PROVIDER` | Tùy chọn | Mặc định là `wordbridge_neural_edge_engine` (hoặc `cloudflare_workers_ai` / `external_zero_retention_api`) |
| `TRANSLATION_API_URL` | Tùy chọn | Endpoint API dịch thuật bên ngoài (nếu kết nối thêm nhà cung cấp có cam kết Zero Data Retention) |
| `TRANSLATION_API_KEY` | Tùy chọn | Khóa API dịch thuật bên ngoài (được giữ kín ở Backend Worker, tuyệt đối không đưa xuống Frontend) |
| `RESEND_API_KEY` | Tùy chọn | Khóa API Resend để gửi email OTP và thông báo hệ thống |

## 5. Hướng Dẫn Cài Đặt, Kiểm Thử và Đưa Lên GitHub để Triển Khai Cloudflare (10 Bước)

### Bước 1: Tạo GitHub Repository
Đăng nhập GitHub và tạo một repository mới (ví dụ: `word-bridge-translation`, chế độ Private hoặc Public tùy nhu cầu quản lý).

### Bước 2: Giải nén và Đưa toàn bộ mã nguồn từ ZIP vào Repository
Giải nén gói `WORD_BRIDGE_TRANSLATION_GITHUB_DEPLOY_READY.zip` vào thư mục dự án trên máy tính:
```bash
unzip WORD_BRIDGE_TRANSLATION_GITHUB_DEPLOY_READY.zip -d word-bridge-translation
cd word-bridge-translation
```

### Bước 3: Kiểm tra cài đặt, Build và Chạy bộ kiểm thử toàn diện cục bộ
```bash
npm install
npm run build
npm run verify
npm test
```

### Bước 4: Kiểm tra cấu trúc Repository trước khi Commit
Đảm bảo có đầy đủ `wrangler.toml`, `package.json`, `package-lock.json`, `.gitignore`, `.env.example`, `src/`, `database/`, `scripts/`, `tests/` và **không** chứa file `.env` thật hay `node_modules`.

### Bước 5: Commit và Push mã nguồn lên GitHub
```bash
git init
git branch -M main
git add .
git commit -m "feat(trans): release Word Bridge Translation platform with Zero User Data Storage"
git remote add origin https://github.com/<ten-tai-khoan>/word-bridge-translation.git
git push -u origin main
```

### Bước 6: Cấu hình các Biến môi trường và Secrets trên Cloudflare
Chạy lệnh khai báo Secrets trực tiếp qua Wrangler CLI (hoặc nhập trên Cloudflare Dashboard):
```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put CSRF_SECRET
# Tùy chọn nếu kết nối thêm API dịch thuật bên ngoài có chính sách Zero Data Retention:
npx wrangler secret put TRANSLATION_API_KEY
```

### Bước 7: Kết nối GitHub với Cloudflare Workers Builds
Trên Cloudflare Dashboard (`Workers & Pages` → `wordbridge-edu` → `Settings` → `Build` → `Connect to Git`), chọn repository `word-bridge-translation` vừa đẩy lên GitHub để kích hoạt triển khai tự động mỗi khi push lên nhánh `main`.

### Bước 8: Kiểm tra D1 và R2 Binding trong `wrangler.toml`
Xác nhận `wrangler.toml` giữ nguyên kết nối tới hạ tầng hiện có:
- **D1 Binding:** `binding = "DB"`, `database_name = "word"`, `database_id = "ce84cc48-6d49-409b-b45a-13ba3bc4a771"`
- **R2 Binding:** `binding = "R2"`, `bucket_name = "word"`

Áp dụng migration khởi tạo bảng `site_metrics` (an toàn, không xóa bảng cũ) lên Cloudflare D1 từ xa:
```bash
npx wrangler d1 execute word --remote --file=./database/migrations/0007_translation_site_metrics_zero_storage.sql
```

### Bước 9: Build và Triển khai lên Cloudflare Workers
```bash
npm run build
npx wrangler deploy
```
Sau đó gắn Custom Domain `dichthuat.wordbridge.io.vn` vào Worker trong mục **Settings → Domains & Routes**.

### Bước 10: Kiểm thử Website sau khi triển khai
1. Truy cập `https://dichthuat.wordbridge.io.vn/` (hoặc `/dich-thuat`), kiểm tra bộ đếm `total_accesses` tăng đúng `+1`.
2. Kiểm tra `GET https://dichthuat.wordbridge.io.vn/api/trans/privacy-audit` trả về `"compliant": true` và header `Cache-Control: no-store`.
3. Thực hiện dịch thử văn bản, tài liệu (`PDF`, `DOCX`, `XLSX`, `PPTX`, `CSV`, `TXT`) và ảnh `OCR` (`PNG`, `JPG`, `WEBP`).
