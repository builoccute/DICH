# Dịch thuật Word Bridge (Word Bridge Translation – TRANS)

- **Tên hệ thống:** Dịch thuật Word Bridge (`Word Bridge Translation` – Dịch vụ `TRANS`)
- **Website chính thức:** [https://dichthuat.wordbridge.io.vn](https://dichthuat.wordbridge.io.vn)
- **Hệ sinh thái:** Word Bridge ([https://wordbridge.io.vn](https://wordbridge.io.vn))
- **Email tiếp nhận hỗ trợ và phản hồi chính thức & duy nhất:** `wordbridge.education@gmail.com`
- **Chính sách dữ liệu:** **ZERO USER DATA STORAGE** (Không lưu văn bản dịch, tài liệu gốc, hình ảnh tải lên, kết quả dịch hay lịch sử dịch thuật cá nhân; Cloudflare D1 chỉ lưu duy nhất tổng số lượt truy cập `site_metrics.total_accesses`; Cloudflare R2 bị khóa ghi đối với mọi tệp người dùng).

## 1. Hệ thống 08 Giao diện Chuẩn Thiết kế & Thanh Điều hướng Thống nhất

Hệ thống đã chuyển hóa đầy đủ 08 hình ảnh thiết kế tham khảo thành giao diện HTML5/CSS3/JS hoạt động thực tế:

1. **Giao diện Dịch văn bản (`/`, `/dich-van-ban`):** Nhập văn bản trực tiếp (tối đa 15.000 ký tự), tự động nhận diện ngôn ngữ, chọn thủ công 104 ngôn ngữ (có RTL), chọn 20 lĩnh vực chuyên ngành, đổi chiều ngôn ngữ (`⇄`), phát âm (`🎙️` / `🔊`), sao chép (`❐`), xóa (`✕`), phóng to (`⤢`) và nút `文A Dịch`.
2. **Giao diện Dịch tài liệu (`/dich-tai-lieu`):** Kéo thả hoặc chọn tệp `PDF, DOCX, DOC, PPTX, XLSX, CSV, TXT` (dung lượng tối đa 50 MB), chọn ngôn ngữ nguồn, ngôn ngữ đích, lĩnh vực chuyên ngành, xử lý trên bộ nhớ tạm và tải ngay tệp kết quả đã dịch.
3. **Giao diện Dịch trang web (`/dich-trang-web`):** Nhập địa chỉ URL trang web (ví dụ `https://www.skyfirst.io.vn`), kiểm tra chống SSRF nghiêm ngặt (chặn localhost, IP nội bộ RFC1918, Cloud Metadata `169.254.169.254`), dịch toàn bộ trang web giữ nguyên bố cục, hình ảnh, liên kết và mở trên trang mới.
4. **Giao diện Dịch hình ảnh (`/dich-hinh-anh`):** Kéo thả hoặc chọn ảnh `JPG, JPEG, PNG, WEBP` (dung lượng tối đa 10 MB), nhận diện văn bản OCR, dịch sang hơn 100 ngôn ngữ, hiển thị song song văn bản gốc và bản dịch.
5. **Giao diện Giới thiệu (`/gioi-thieu`):** Hero banner, nút `Sử dụng ngay` & `Xem hướng dẫn`, 04 thẻ tính năng chính và 05 giá trị cốt lõi (`Nhanh chóng`, `Chính xác`, `Đa dạng ngôn ngữ`, `Tiện lợi`, `An toàn`).
6. **Giao diện Quyền riêng tư và Điều khoản (`/quyen-rieng-tu`):** 05 mục nội dung mở rộng (`Quyền riêng tư`, `Điều khoản sử dụng`, `Chính sách cookie`, `Quyền sở hữu trí tuệ`, `Cập nhật chính sách`).
7. **Giao diện Trợ giúp (`/tro-giup`):** Thanh tìm kiếm hướng dẫn trực tiếp, 04 thẻ chuyên mục, 06 nhóm nội dung hỗ trợ, danh sách Câu hỏi thường gặp (FAQ) đóng/mở và khối `Vẫn cần hỗ trợ?` dẫn tới trang phản hồi.
8. **Giao diện Gửi ý kiến phản hồi (`/phan-hoi`):** Hỗ trợ 08 loại phản hồi, tiêu đề, nội dung chi tiết (`0 / 2.000`), đính kèm tệp tùy chọn (`JPG, JPEG, PNG, PDF` tối đa 10 MB), tự động gửi email trực tiếp tới duy nhất `wordbridge.education@gmail.com` với tiêu đề chuẩn:
   `[WORD BRIDGE TRANS] – [LOẠI PHẢN HỒI] – [TIÊU ĐỀ]`

## 2. Cấu trúc Thư mục Dự án (28 Tệp Mã nguồn)

```text
word-bridge-translation/
├── package.json                                  # Scripts: dev, build, audit:privacy, test, deploy
├── package-lock.json                             # Lockfile chuẩn cho GitHub & Cloudflare CI
├── wrangler.toml                                 # Bật sẵn [ai] binding="AI", D1 (word), R2 (word), SEND_EMAIL
├── .gitignore                                    # Loại bỏ node_modules, Secrets và tệp tạm
├── .env.example                                  # Mẫu cấu hình biến môi trường
├── README.md                                     # Tài liệu hướng dẫn triển khai và nghiệm thu
├── migrations/
│   └── 0001_site_metrics_zero_storage.sql        # Migration an toàn cho bảng site_metrics
├── public/
│   └── assets/
│       └── logo.jpg                              # Logo chính thức của thương hiệu Word Bridge
├── scripts/
│   └── build.js                                  # Kiểm toán tĩnh Zero-Storage & kiểm tra cấu hình
├── self-hosted-nmt/                              # Microservice NLLB-200 CTranslate2 INT8 tùy chọn
│   ├── app.py                                    # FastAPI + CTranslate2 INT8 (200 ngôn ngữ FLORES-200)
│   ├── requirements.txt                          # Dependencies Python
│   └── Dockerfile                                # Container chạy với --no-access-log
├── src/
│   ├── worker.js                                 # Điểm vào chuẩn ES Module cho Cloudflare Workers
│   ├── server.js                                 # Máy chủ HTTP cục bộ (Node.js >= 20)
│   ├── api/
│   │   └── router.js                             # Bộ định tuyến 08 trang, 04 cơ chế dịch, email & API v1
│   ├── db/
│   │   └── d1-metrics.js                         # Bộ đếm nguyên tử D1 & Tường lửa SQL Zero-Storage
│   ├── security/
│   │   ├── privacy-shield.js                     # Magic Bytes, Rate Limiter, xóa bộ nhớ tạm (50MB/10MB)
│   │   └── r2-guard.js                           # Khóa bảo vệ R2 (chặn ghi tệp người dùng)
│   ├── services/
│   │   ├── languages.js                          # 104 ngôn ngữ toàn cầu & nhận diện ngôn ngữ
│   │   ├── domains.js                            # 20 lĩnh vực chuyên ngành & từ điển thuật ngữ
│   │   ├── nllb-connector.js                     # Ánh xạ FLORES-200 & Pre/Post-pass thuật ngữ
│   │   ├── translation-engine.js                 # Lõi dịch thuật (Workers AI M2M100 / NLLB-200 / Cloud)
│   │   ├── document-processor.js                 # Dịch tài liệu trên RAM (PDF, DOCX, DOC, PPTX, XLSX, CSV, TXT)
│   │   ├── ocr-processor.js                      # Nhận diện OCR & dịch hình ảnh (JPG, JPEG, PNG, WEBP)
│   │   ├── website-translator.js                 # Dịch trang web trực tuyến & bộ lọc chống SSRF
│   │   └── feedback-mailer.js                    # Gửi email phản hồi tự động tới wordbridge.education@gmail.com
│   └── ui/
│       ├── assets.js                             # Bộ nhận diện Logo, Favicon, PWA, Open Graph, Sitemap
│       └── template.js                           # Giao diện 08 màn hình chuẩn thiết kế
└── tests/
    └── full-system.test.js                       # Bộ kiểm thử tự động toàn diện
```

## 3. Hướng dẫn Cài đặt, Kiểm thử và Triển khai

```bash
# 1. Cài đặt & Kiểm thử toàn diện
npm install
npm run build
npm test

# 2. Thực thi Migration D1 an toàn & Triển khai lên Cloudflare Workers
npm run db:migrate:remote
npx wrangler deploy
```

### Cấu hình Gửi Email Phản hồi tới `wordbridge.education@gmail.com`
1. **Cách 1 (Mặc định qua Cloudflare Email Routing):** Tệp `wrangler.toml` đã cấu hình sẵn binding `[[send_email]]` với `name = "SEND_EMAIL"` và `destination_address = "wordbridge.education@gmail.com"`. Bạn chỉ cần xác thực địa chỉ đích `wordbridge.education@gmail.com` trong mục **Email -> Email Routing -> Destination addresses** trên Cloudflare Dashboard của tên miền `wordbridge.io.vn`.
2. **Cách 2 (Qua Resend hoặc SMTP Relay tùy chọn):** Khai báo `npx wrangler secret put RESEND_API_KEY` hoặc `npx wrangler secret put SMTP_RELAY_URL`.
