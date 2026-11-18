-- Migration 0007: Word Bridge Translation (dichthuat.wordbridge.io.vn)
-- Thiết lập bảng thống kê tối giản site_metrics trên Cloudflare D1 (database: word, id: ce84cc48-6d49-409b-b45a-13ba3bc4a771)
-- Tuân thủ tuyệt đối chính sách ZERO USER DATA STORAGE:
-- Chỉ lưu duy nhất tổng số lượt truy cập website (total_accesses), không lưu IP, thiết bị, phiên hay nội dung dịch thuật.

CREATE TABLE IF NOT EXISTS site_metrics (
    metric_key TEXT PRIMARY KEY,
    total_accesses INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO site_metrics (metric_key, total_accesses) VALUES ('total_accesses', 0);
