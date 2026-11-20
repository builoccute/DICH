/**
 * @file src/worker.js
 * @description Điểm vào ES Module tương thích Cloudflare Workers Builds (ES Module Fetch Handler)
 * và chạy đồng nhất cùng bộ định tuyến `src/api/router.js`.
 */

import { dispatchRequest } from "./api/router.js";
import { NO_STORE_HEADERS, sanitizedLog } from "./security/privacy-shield.js";

const workerHandler = {
  async fetch(request, env = {}, ctx = {}) {
    try {
      return await dispatchRequest(request, env, ctx);
    } catch (err) {
      sanitizedLog("ERROR", "UNHANDLED_WORKER_EXCEPTION", {
        code: err?.code || "ERR_INTERNAL"
      });
      return new Response(
        JSON.stringify({
          ok: false,
          code: "ERR_INTERNAL_SERVER",
          message: "Hệ thống gặp sự cố kỹ thuật tạm thời. Không có dữ liệu người dùng nào bị lưu lại."
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            ...NO_STORE_HEADERS
          }
        }
      );
    }
  }
};

export default workerHandler;
