# Dịch thuật Word Bridge (Word Bridge Translation – TRANS)

- **Tên hệ thống:** Word Bridge Translation (`Dịch thuật Word Bridge – TRANS`)
- **Website chính thức:** `https://dichthuat.wordbridge.io.vn`
- **Hệ sinh thái:** Word Bridge (`https://wordbridge.io.vn`)
- **Email hỗ trợ và phản hồi chính thức & duy nhất:** `wordbridge.education@gmail.com`
- **Kiến trúc v2.0:** Máy chủ Node.js độc lập + Microservice dịch thuật tự vận hành FastAPI NLLB-200 (CTranslate2 INT8) + Xử lý PDF/Ảnh hoàn toàn trên RAM + SMTP độc lập (**0% Cloudflare**).
- **Chính sách dữ liệu:** **ZERO USER DATA STORAGE** — Không lưu văn bản dịch, tài liệu gốc, hình ảnh tải lên, kết quả dịch, lịch sử dịch hay nội dung phản hồi. Nếu bật cơ sở dữ liệu độc lập (SQLite/PostgreSQL), chỉ lưu duy nhất số đếm tổng hợp `site_metrics.total_accesses`.

## Tính năng & 08 Giao diện Công khai
1. **Dịch văn bản (`/`, `/dich-van-ban`):** Tự động nhận diện ngôn ngữ, 104 ngôn ngữ (hỗ trợ Unicode & RTL), 20 lĩnh vực chuyên ngành áp dụng thực tế qua pre/post-pass thuật ngữ, xử lý văn bản dài theo phân đoạn.
2. **Dịch tài liệu (`/dich-tai-lieu`):** Hỗ trợ `PDF, DOCX, DOC, PPTX, XLSX, CSV, TXT` (tối đa 50 MB). PDF xuất đa trang chuẩn Unicode tiếng Việt, bảo toàn bảng biểu, không cắt dòng; chống ZIP Bomb và kiểm tra Magic Bytes.
3. **Dịch trang web (`/dich-trang-web`):** Bảo vệ chống SSRF (chặn IP nội bộ, kiểm tra DNS chống DNS Rebinding, kiểm tra từng hop redirect, đọc stream giới hạn 2 MB) và chống XSS (xóa `<script>`, `<iframe>`, `on*`, `javascript:`, gắn CSP, hiển thị trong `<iframe sandbox="">`).
4. **Dịch hình ảnh (`/dich-hinh-anh`):** Nhận diện chữ thực tế bằng Tesseract chạy qua pipe RAM (`stdin` → `stdout`, không ghi tệp tạm lên ổ đĩa) cho `JPG, JPEG, PNG, WEBP` (tối đa 10 MB).
5. **Giới thiệu (`/gioi-thieu`):** Giới thiệu dịch vụ, định hướng toàn cầu, 4 tính năng cốt lõi và cam kết quyền riêng tư.
6. **Quyền riêng tư và Điều khoản (`/quyen-rieng-tu`):** Một trang thống nhất gồm 5 mục nội dung (không sidebar).
7. **Trợ giúp (`/tro-giup`):** Một trang thống nhất gồm 6 nhóm nội dung, thanh tìm kiếm trực tiếp và FAQ đóng/mở.
8. **Gửi ý kiến phản hồi (`/phan-hoi`):** 8 loại phản hồi, đính kèm tùy chọn, tự động chuyển email qua SMTP độc lập tới `wordbridge.education@gmail.com` theo mẫu tiêu đề `[WORD BRIDGE TRANS] – [LOẠI PHẢN HỒI] – [TIÊU ĐỀ]`.

## API Chính thức (v1)
| Endpoint | Chức năng |
| --- | --- |
| `GET /api/v1/specs` | Thông tin API, giới hạn dung lượng và định dạng hỗ trợ |
| `GET /api/v1/languages` | Danh sách ngôn ngữ toàn cầu |
| `GET /api/v1/domains` | Danh sách 20 lĩnh vực chuyên ngành |
| `POST /api/v1/detect` | Nhận diện ngôn ngữ văn bản |
| `POST /api/v1/translate` | Dịch văn bản |
| `POST /api/v1/translate/document` | Dịch tài liệu trên RAM |
| `POST /api/v1/translate/website` | Dịch trang web an toàn (SSRF/XSS hardened) |
| `POST /api/v1/translate/image` | Dịch hình ảnh thực tế (Tesseract RAM) |
| `POST /api/v1/feedback` | Gửi ý kiến phản hồi qua SMTP độc lập |
| `GET /api/health` | Kiểm tra sức khỏe máy chủ, trạng thái model và database |

## Lệnh Kiểm tra, Build và Khởi chạy Cục bộ
```bash
# 1. Sao chép cấu hình mẫu
cp .env.example .env

# 2. Chạy kiểm toán tĩnh, kiểm tra cú pháp JS/Python, Zero-Cloudflare & Monochrome SVG
npm run build

# 3. Chạy toàn bộ bộ kiểm thử độc lập
npm test

# 4. Xác minh các module dùng chung của hệ sinh thái Word Bridge Learning vẫn nguyên vẹn
npm run verify:ecosystem

# 5. Khởi chạy máy chủ Node.js độc lập
npm start
```

# Hướng dẫn Triển khai Máy chủ Độc lập, DNS, HTTPS và Email SMTP
## Word Bridge Translation (TRANS) — `https://dichthuat.wordbridge.io.vn`

---

## 1. Yêu cầu Phần cứng & Phần mềm Máy chủ Riêng (VPS / Dedicated Server)
- **Hệ điều hành:** Ubuntu 22.04 LTS hoặc Debian 12 (64-bit).
- **Cấu hình tối thiểu:** 2 vCPU, 4 GB RAM, 20 GB SSD (khuyến nghị 4 vCPU, 8 GB RAM khi chạy đồng thời NLLB-200 CTranslate2 INT8 và Tesseract).
- **Phần mềm:** Node.js `>= 18.18.0` (khuyến nghị Node.js 20 LTS), Python `3.11+`, Docker & Docker Compose, Nginx hoặc Caddy, `tesseract-ocr`, `tesseract-ocr-vie`, `tesseract-ocr-eng`, `fonts-dejavu-core`.

## 2. Triển khai Dịch vụ trên Máy chủ Riêng

### Cách A: Triển khai bằng Docker Compose (Khuyến nghị)
```bash
git clone <URL_GITHUB_REPO> word-bridge-translation
cd word-bridge-translation
cp .env.example .env
# Chỉnh sửa .env điền SMTP_HOST, SMTP_USER, SMTP_PASSWORD, WORDBRIDGE_NLLB_TOKEN
nano .env

docker compose up -d --build
# Kiểm tra trạng thái sức khỏe hệ thống
curl -s http://127.0.0.1:8787/api/health
```

### Cách B: Triển khai trực tiếp bằng Systemd + Python venv
```bash
sudo apt-get update
sudo apt-get install -y nodejs python3 python3-venv python3-pip tesseract-ocr tesseract-ocr-vie tesseract-ocr-eng fonts-dejavu-core
pip3 install pypdf pdfplumber reportlab

# Khởi chạy microservice NLLB-200
cd self-hosted-nmt
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='JustFrederik/nllb-200-distilled-600M-ct2-int8', local_dir='./models/nllb-200-distilled-600M-int8')"
NLLB_CT2_MODEL_DIR=./models/nllb-200-distilled-600M-int8 uvicorn app:app --host 127.0.0.1 --port 8080 --no-access-log

# Khởi chạy máy chủ Node.js chính (trong thư mục gốc dự án)
npm run build
npm test
PORT=8787 WORDBRIDGE_NLLB_API_URL=http://127.0.0.1:8080 node src/server.js
```

## 3. Chuyển DNS Độc lập & Thiết lập HTTPS (KHÔNG Cloudflare)
1. **Chuẩn bị trước khi chuyển DNS:** Đảm bảo máy chủ mới đã chạy ổn định tại `http://127.0.0.1:8787/api/health` và kiểm tra đầy đủ bản ghi DNS của các sản phẩm khác thuộc `wordbridge.io.vn` (đặc biệt MX, TXT SPF/DKIM/DMARC, bản ghi A/CNAME của trang học tập) để không làm gián đoạn dịch vụ hiện có.
2. **Chuyển nhà cung cấp DNS độc lập:** Sử dụng DNS của nhà đăng ký tên miền `.io.vn` (như P.A. Việt Nam, Mắt Bão, iNET) hoặc nhà cung cấp DNS độc lập không thuộc Cloudflare (như Route53, DigitalOcean DNS, Hetzner DNS).
3. **Bản ghi DNS cần cấu hình:**
   - `A` record: `dichthuat.wordbridge.io.vn` → `<IPv4_VPS_CỦA_BẠN>` (TTL `300` giây khi chuyển đổi).
   - `AAAA` record (nếu VPS có IPv6): `dichthuat.wordbridge.io.vn` → `<IPv6_VPS_CỦA_BẠN>`.
   - **Tắt hoàn toàn Proxy (Orange Cloud)** và chỉ gỡ nameserver cũ sau khi bản ghi mới đã đồng bộ đầy đủ.
4. **Thiết lập Reverse Proxy & HTTPS:**
   - Với **Caddy:** sao chép `deploy/Caddyfile` vào `/etc/caddy/Caddyfile` và chạy `sudo systemctl reload caddy` (tự động cấp chứng chỉ Let's Encrypt).
   - Với **Nginx:** sao chép `deploy/nginx.conf` vào `/etc/nginx/sites-available/wordbridge-trans`, tạo symlink và chạy `sudo certbot --nginx -d dichthuat.wordbridge.io.vn`.
5. **Kiểm tra sau chuyển đổi:**
   ```bash
   dig +short A dichthuat.wordbridge.io.vn
   curl -I https://dichthuat.wordbridge.io.vn/api/health
   ```

## 4. Cấu hình Email SMTP Tự động (`wordbridge.education@gmail.com`)
Hệ thống gửi phản hồi trực tiếp qua giao thức SMTP chuẩn RFC 5321 (hỗ trợ STARTTLS cổng 587 hoặc SMTPS cổng 465), khóa cứng địa chỉ nhận `wordbridge.education@gmail.com`.
- **Nếu dùng Gmail App Password:**
  1. Bật Xác minh 2 bước (2FA) cho tài khoản gửi thư.
  2. Tạo **Mật khẩu ứng dụng (App Password)** gồm 16 ký tự.
  3. Cấu hình trong `.env` trên máy chủ (tuyệt đối không commit lên GitHub):
     ```env
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_SECURE=false
     SMTP_USER=wordbridge.education@gmail.com
     SMTP_PASSWORD=<16_KY_TU_APP_PASSWORD>
     MAIL_FROM=wordbridge.education@gmail.com
     MAIL_TO=wordbridge.education@gmail.com
     ```
- **Nếu dùng SMTP giao dịch độc lập (Postmark / Brevo / Amazon SES / Mailgun SMTP):** điền đúng `SMTP_HOST`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASSWORD` và đảm bảo bản ghi SPF/DKIM cho tên miền `wordbridge.io.vn` hợp lệ.
- **Kiểm thử gửi thư thật sau cấu hình:**
  Gửi một biểu mẫu thử tại `https://dichthuat.wordbridge.io.vn/phan-hoi` và xác nhận thư đến hộp thư `wordbridge.education@gmail.com` với tiêu đề `[WORD BRIDGE TRANS] – [LOẠI PHẢN HỒI] – [TIÊU ĐỀ]`.


### Mẫu cấu hình Nginx (`nginx.conf`)
```nginx
# Nginx Reverse Proxy + HTTPS Configuration for Word Bridge Translation
# Domain: dichthuat.wordbridge.io.vn (Zero Cloudflare Proxy)

server {
    listen 80;
    listen [::]:80;
    server_name dichthuat.wordbridge.io.vn;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name dichthuat.wordbridge.io.vn;

    ssl_certificate /etc/letsencrypt/live/dichthuat.wordbridge.io.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dichthuat.wordbridge.io.vn/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Zero User Data Storage: Tắt ghi access log nội dung nhạy cảm
    access_log off;
    error_log /var/log/nginx/wordbridge-trans-error.log warn;

    client_max_body_size 75m;
    proxy_read_timeout 60s;
    proxy_send_timeout 60s;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "no-referrer" always;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_buffering off;
    }
}
```

### Mẫu cấu hình Caddy (`Caddyfile`)
```caddyfile
# Caddy Reverse Proxy + Automatic Let's Encrypt HTTPS for Word Bridge Translation
# Domain: dichthuat.wordbridge.io.vn (Zero Cloudflare)

dichthuat.wordbridge.io.vn {
    encode gzip zstd

    request_body {
        max_size 75MB
    }

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "no-referrer"
        -Server
    }

    reverse_proxy 127.0.0.1:8787 {
        header_up X-Forwarded-Proto https
        flush_interval -1
    }
}
```

