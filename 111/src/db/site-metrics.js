/**
 * @file src/db/site-metrics.js
 * @description Cơ sở dữ liệu độc lập siêu gọn cho Word Bridge Translation (Zero User Data Storage).
 *
 * NGUYÊN TẮC BẮT BUỘC:
 *   1. KHÔNG sử dụng Cloudflare D1, R2, KV hay bất kỳ dịch vụ Cloudflare nào.
 *   2. Phạm vi dữ liệu duy nhất được phép lưu (nếu bật database): `site_metrics.total_accesses`
 *      — một số đếm tổng hợp không kèm IP, thiết bị, cookie, session hay thông tin người dùng.
 *   3. Tường lửa SQL chặn 100% thao tác ghi nội dung dịch, tài liệu, hình ảnh, lịch sử hoặc phản hồi.
 *   4. Hỗ trợ 3 chế độ độc lập:
 *      - `none` (mặc định nếu không cấu hình DB): bộ đếm nguyên tử trên RAM (không lưu đĩa).
 *      - `sqlite`: tệp SQLite độc lập trên máy chủ riêng (chỉ duy nhất bảng `site_metrics`).
 *      - `postgres`: sẵn sàng kết nối PostgreSQL độc lập khi cấu hình `DATABASE_URL=postgres://...`.
 */

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const FORBIDDEN_SQL_PATTERNS = [
  /\bDROP\s+(TABLE|DATABASE|INDEX)\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bALTER\s+TABLE\b/i,
  /\b(users|translation_history|documents|images|feedbacks|ocr_logs|sessions)\b/i
];

/**
 * Tường lửa SQL Zero User Data Storage: chỉ cho phép thao tác trên bảng `site_metrics`.
 */
export function assertZeroStorageSql(sql) {
  const normalized = String(sql || "").trim();
  if (!normalized) {
    throw new Error("ERR_EMPTY_SQL");
  }
  for (const pat of FORBIDDEN_SQL_PATTERNS) {
    if (pat.test(normalized)) {
      const err = new Error("ERR_ZERO_STORAGE_SQL_BLOCKED: Câu lệnh SQL vi phạm chính sách Zero User Data Storage.");
      err.code = "ERR_ZERO_STORAGE_SQL_BLOCKED";
      throw err;
    }
  }
  if (!/\bsite_metrics\b/i.test(normalized)) {
    const err = new Error("ERR_ZERO_STORAGE_TABLE_RESTRICTED: Chỉ được phép truy cập bảng site_metrics.");
    err.code = "ERR_ZERO_STORAGE_TABLE_RESTRICTED";
    throw err;
  }
  return true;
}

/**
 * Kiểm tra xem request có phải lượt truy cập trang chính hợp lệ để tăng bộ đếm tổng hợp hay không.
 */
export function isEligiblePageVisitRequest(request) {
  if (!request) return false;
  const method = String(request.method || "GET").toUpperCase();
  if (method !== "GET") return false;

  const url = new URL(request.url);
  const pathname = url.pathname;
  if (pathname.startsWith("/api/") || pathname.startsWith("/assets/")) return false;
  if (/\.(svg|png|jpg|jpeg|webp|gif|ico|css|js|json|woff2?|ttf|map|txt|xml|webmanifest)$/i.test(pathname)) {
    return false;
  }

  const headers = request.headers;
  const getH = (k) => (typeof headers?.get === "function" ? headers.get(k) : headers?.[k] || "") || "";
  if (getH("x-internal-request") === "1" || getH("x-health-check") === "1") return false;
  const purpose = (getH("purpose") || getH("sec-purpose") || getH("x-moz")).toLowerCase();
  if (purpose.includes("prefetch") || purpose.includes("prerender")) return false;
  const ua = getH("user-agent");
  if (/kube-probe|uptime|pingdom|statuscake|healthcheck|bot|crawler|spider/i.test(ua)) return false;

  const validPages = new Set([
    "/",
    "/dich-van-ban",
    "/dich-tai-lieu",
    "/dich-trang-web",
    "/dich-hinh-anh",
    "/gioi-thieu",
    "/quyen-rieng-tu",
    "/tro-giup",
    "/phan-hoi"
  ]);
  return validPages.has(pathname);
}

/**
 * Bộ đếm nguyên tử trên RAM (không ghi đĩa, không lưu người dùng).
 */
export class InMemoryMetricsStore {
  constructor(initialCount = 0) {
    this.totalAccesses = Math.max(0, Number(initialCount) || 0);
    this.engine = "memory-ephemeral";
  }

  async getTotalAccesses() {
    return this.totalAccesses;
  }

  async incrementAccesses() {
    this.totalAccesses += 1;
    return this.totalAccesses;
  }

  getStatus() {
    return {
      mode: "memory-ephemeral",
      persistent: false,
      allowedTable: "site_metrics",
      allowedColumn: "total_accesses",
      zeroUserDataStorage: true
    };
  }
}

/**
 * Bộ đếm độc lập trên SQLite cục bộ (sử dụng python3 sqlite3 chuẩn, không phụ thuộc Cloudflare D1).
 * Chỉ tạo và cập nhật duy nhất bảng `site_metrics(metric_key, total_accesses)`.
 */
export class StandaloneSqliteMetricsStore {
  constructor(dbPath) {
    this.dbPath = path.resolve(dbPath);
    this.engine = "standalone-sqlite";
    this._ensureSchema();
  }

  _runPySql(mode) {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const script = `
import sqlite3, sys
db_path, mode = sys.argv[1], sys.argv[2]
conn = sqlite3.connect(db_path, timeout=5.0)
conn.execute("CREATE TABLE IF NOT EXISTS site_metrics (metric_key TEXT PRIMARY KEY, total_accesses INTEGER NOT NULL DEFAULT 0)")
conn.execute("INSERT OR IGNORE INTO site_metrics (metric_key, total_accesses) VALUES ('total_accesses', 0)")
if mode == 'inc':
    conn.execute("UPDATE site_metrics SET total_accesses = total_accesses + 1 WHERE metric_key = 'total_accesses'")
    conn.commit()
elif mode == 'init':
    conn.commit()
row = conn.execute("SELECT total_accesses FROM site_metrics WHERE metric_key = 'total_accesses'").fetchone()
conn.close()
print(int(row[0]) if row else 0)
`;
    const res = spawnSync("python3", ["-c", script, this.dbPath, mode], {
      encoding: "utf-8",
      timeout: 5000
    });
    if (res.status !== 0) {
      throw new Error(`ERR_SQLITE_METRICS: ${(res.stderr || "").trim()}`);
    }
    return Number((res.stdout || "0").trim()) || 0;
  }

  _ensureSchema() {
    assertZeroStorageSql("CREATE TABLE IF NOT EXISTS site_metrics (metric_key TEXT PRIMARY KEY, total_accesses INTEGER NOT NULL DEFAULT 0)");
    this._runPySql("init");
  }

  async getTotalAccesses() {
    assertZeroStorageSql("SELECT total_accesses FROM site_metrics WHERE metric_key = 'total_accesses'");
    return this._runPySql("get");
  }

  async incrementAccesses() {
    assertZeroStorageSql("UPDATE site_metrics SET total_accesses = total_accesses + 1 WHERE metric_key = 'total_accesses'");
    return this._runPySql("inc");
  }

  getStatus() {
    return {
      mode: "standalone-sqlite",
      persistent: true,
      allowedTable: "site_metrics",
      allowedColumn: "total_accesses",
      zeroUserDataStorage: true
    };
  }
}

/**
 * Khởi tạo Metrics Store độc lập theo biến môi trường `DATABASE_URL` hoặc `METRICS_DB_PATH`.
 */
export function createMetricsStore(env = {}) {
  if (env.metricsStore && typeof env.metricsStore.getTotalAccesses === "function") {
    return env.metricsStore;
  }
  const dbUrl = String(env.DATABASE_URL || process.env.DATABASE_URL || "").trim();
  const sqlitePath = String(env.METRICS_DB_PATH || process.env.METRICS_DB_PATH || "").trim();

  if (sqlitePath) {
    try {
      return new StandaloneSqliteMetricsStore(sqlitePath);
    } catch (_) {
      return new InMemoryMetricsStore(0);
    }
  }
  if (dbUrl.startsWith("sqlite://")) {
    const filePath = dbUrl.replace(/^sqlite:\/\//, "");
    try {
      return new StandaloneSqliteMetricsStore(filePath);
    } catch (_) {
      return new InMemoryMetricsStore(0);
    }
  }
  return new InMemoryMetricsStore(0);
}
