/**
 * @file src/db/site-metrics.js
 * @description Bộ đếm tổng lượt truy cập siêu gọn theo nguyên tắc Zero User Data Storage.
 * Tương thích 100% cả Cloudflare Workers (Zero Node child_process/fs) lẫn Node.js độc lập.
 * Phạm vi duy nhất được phép truy cập: `site_metrics.total_accesses`.
 */

const FORBIDDEN_SQL_PATTERNS = [
  /\bDROP\s+(TABLE|DATABASE|INDEX)\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bALTER\s+TABLE\b/i,
  /\b(users|translation_history|documents|images|feedbacks|ocr_logs|sessions)\b/i
];

export function assertZeroStorageSql(sql) {
  const normalized = String(sql || "").trim();
  if (!normalized) throw new Error("ERR_EMPTY_SQL");
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

class BoundSqlMetricsStore {
  constructor(dbBinding) {
    this.db = dbBinding;
  }

  async _ensure() {
    const createSql = "CREATE TABLE IF NOT EXISTS site_metrics (metric_key TEXT PRIMARY KEY, total_accesses INTEGER NOT NULL DEFAULT 0)";
    const initSql = "INSERT OR IGNORE INTO site_metrics (metric_key, total_accesses) VALUES ('total_accesses', 0)";
    assertZeroStorageSql(createSql);
    assertZeroStorageSql(initSql);
    await this.db.prepare(createSql).run();
    await this.db.prepare(initSql).run();
  }

  async getTotalAccesses() {
    try {
      await this._ensure();
      const sql = "SELECT total_accesses FROM site_metrics WHERE metric_key = 'total_accesses'";
      assertZeroStorageSql(sql);
      const row = await this.db.prepare(sql).first();
      return Number(row?.total_accesses || 0);
    } catch (_) {
      return 0;
    }
  }

  async incrementAccesses() {
    try {
      await this._ensure();
      const sql = "UPDATE site_metrics SET total_accesses = total_accesses + 1 WHERE metric_key = 'total_accesses'";
      assertZeroStorageSql(sql);
      await this.db.prepare(sql).run();
      return await this.getTotalAccesses();
    } catch (_) {
      return 0;
    }
  }

  getStatus() {
    return {
      mode: "bound-sql",
      persistent: true,
      allowedTable: "site_metrics",
      allowedColumn: "total_accesses",
      zeroUserDataStorage: true
    };
  }
}

const globalFallbackStore = new InMemoryMetricsStore(0);

export function createMetricsStore(env = {}) {
  if (env && env.metricsStore && typeof env.metricsStore.getTotalAccesses === "function") {
    return env.metricsStore;
  }
  if (env && env.DB && typeof env.DB.prepare === "function") {
    return new BoundSqlMetricsStore(env.DB);
  }
  return globalFallbackStore;
}
