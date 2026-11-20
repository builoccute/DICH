/**
 * @file src/server.js
 * @description Máy chủ HTTP Độc lập (Standalone Node.js Server) cho Word Bridge Translation.
 *   - KHÔNG sử dụng Cloudflare Workers hay `worker.js`.
 *   - Nạp cấu hình từ `.env` (nếu có), bảo vệ giới hạn dung lượng thân yêu cầu, tắt nhẹ nhàng (graceful shutdown).
 *   - Sẵn sàng triển khai sau Nginx hoặc Caddy với chứng chỉ HTTPS độc lập.
 */

import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { dispatchRequest } from "./api/router.js";
import { createMetricsStore } from "./db/site-metrics.js";
import { NO_STORE_HEADERS, LIMITS, sanitizedLog } from "./security/privacy-shield.js";

function loadDotEnvIfPresent() {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = val;
      }
    }
  } catch (_) {}
}

loadDotEnvIfPresent();

const MAX_HTTP_BODY_BYTES = Math.ceil(LIMITS.MAX_DOCUMENT_BYTES * 1.45);

export function createTranslationServer(customEnv = {}) {
  const sharedMetrics = createMetricsStore(customEnv);
  const env = {
    APP_NAME: "Dịch thuật Word Bridge",
    PUBLIC_DOMAIN: process.env.PUBLIC_DOMAIN || "https://dichthuat.wordbridge.io.vn",
    ZERO_USER_DATA_STORAGE: "true",
    metricsStore: sharedMetrics,
    ...customEnv
  };

  const server = http.createServer(async (req, res) => {
    try {
      const host = req.headers.host || `127.0.0.1:${process.env.PORT || 8787}`;
      const proto = req.headers["x-forwarded-proto"] || "http";
      const fullUrl = `${proto}://${host}${req.url || "/"}`;
      const method = (req.method || "GET").toUpperCase();

      const chunks = [];
      let receivedBytes = 0;
      let abortedTooLarge = false;

      if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        for await (const chunk of req) {
          receivedBytes += chunk.length;
          if (receivedBytes > MAX_HTTP_BODY_BYTES) {
            abortedTooLarge = true;
            break;
          }
          chunks.push(chunk);
        }
      }

      if (abortedTooLarge) {
        res.statusCode = 413;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        Object.entries(NO_STORE_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
        res.end(JSON.stringify({ ok: false, code: "ERR_PAYLOAD_TOO_LARGE", message: "Yêu cầu vượt quá giới hạn dung lượng." }));
        return;
      }

      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (Array.isArray(v)) headers.set(k, v.join(", "));
        else if (typeof v === "string") headers.set(k, v);
      }
      if (!headers.has("x-client-signal") && req.socket?.remoteAddress) {
        headers.set("x-client-signal", req.socket.remoteAddress);
      }

      const bodyBuffer = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
      const fetchReq = new Request(fullUrl, {
        method,
        headers,
        body: ["GET", "HEAD", "OPTIONS"].includes(method) ? undefined : bodyBuffer
      });

      const response = await dispatchRequest(fetchReq, env);
      res.statusCode = response.status;
      response.headers.forEach((val, key) => {
        res.setHeader(key, val);
      });

      const arrayBuf = await response.arrayBuffer();
      res.end(Buffer.from(arrayBuf));
    } catch (err) {
      sanitizedLog("ERROR", "SERVER_UNHANDLED_EXCEPTION", { code: err?.code || "ERR_SERVER" });
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      Object.entries(NO_STORE_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
      res.end(
        JSON.stringify({
          ok: false,
          code: "ERR_INTERNAL_SERVER",
          message: "Hệ thống gặp sự cố kỹ thuật tạm thời. Không có dữ liệu người dùng nào bị lưu lại."
        })
      );
    }
  });

  server.requestTimeout = LIMITS.REQUEST_TIMEOUT_MS + 10000;
  server.headersTimeout = 15000;

  return { server, env };
}

// Giữ tên xuất tương thích cho các bộ test nội bộ
export const createNodeTestServer = createTranslationServer;

const isMainModule =
  process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isMainModule) {
  const port = Number(process.env.PORT || 8787);
  const host = process.env.HOST || "0.0.0.0";
  const { server } = createTranslationServer();

  server.listen(port, host, () => {
    sanitizedLog("INFO", "SERVER_STARTED", { port, host, zeroUserDataStorage: true });
    console.log(`[Word Bridge Translation] Independent Server running on http://${host}:${port} (Zero User Data Storage: ENFORCED)`);
  });

  const shutdown = (signal) => {
    sanitizedLog("INFO", "SERVER_SHUTDOWN", { signal });
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
