/**
 * @file src/services/feedback-mailer.js
 * @description Hệ thống Tiếp nhận Ý kiến Phản hồi & Tự động Gửi Email qua SMTP Độc lập (Zero Cloudflare Email Routing).
 *
 * ĐỊA CHỈ TIẾP NHẬN CHÍNH THỨC VÀ DUY NHẤT:
 *   wordbridge.education@gmail.com
 *
 * QUY CHUẨN BẮT BUỘC:
 *   - Tiêu đề email chuẩn: [WORD BRIDGE TRANS] – [LOẠI PHẢN HỒI] – [TIÊU ĐỀ]
 *   - KHÔNG sử dụng Cloudflare Email Routing (đã loại bỏ hoàn toàn).
 *   - KHÔNG dùng `mailto:` làm cơ chế chính.
 *   - KHÔNG lưu nội dung phản hồi vào database dịch thuật.
 *   - KHÔNG báo thành công khi máy chủ SMTP chưa xác nhận `250 OK`.
 */

import { EphemeralRateLimiter, escapeHtml, verifyFileSignature, wipeBuffer } from "../security/privacy-shield.js";

export const OFFICIAL_SUPPORT_EMAIL = "wordbridge.education@gmail.com";
export const MAX_FEEDBACK_MESSAGE_LENGTH = 2000;
export const MAX_FEEDBACK_TITLE_LENGTH = 200;
export const MAX_FEEDBACK_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export const FEEDBACK_TYPES = Object.freeze([
  { id: "bug", label: "Báo lỗi kỹ thuật" },
  { id: "ui", label: "Góp ý giao diện" },
  { id: "quality", label: "Góp ý chất lượng bản dịch" },
  { id: "language", label: "Đề xuất ngôn ngữ" },
  { id: "feature", label: "Đề xuất tính năng" },
  { id: "support", label: "Yêu cầu hỗ trợ" },
  { id: "security", label: "Báo cáo bảo mật" },
  { id: "other", label: "Nội dung khác" }
]);

export const feedbackCooldownLimiter = new EphemeralRateLimiter(5, 10 * 60 * 1000);

export function resolveFeedbackTypeLabel(typeInput) {
  const norm = String(typeInput || "").trim().toLowerCase();
  const found = FEEDBACK_TYPES.find((t) => t.id === norm || t.label.toLowerCase() === norm);
  return found ? found.label : null;
}

export function validateFeedbackAttachment(uint8Array, filename = "") {
  if (!uint8Array || uint8Array.length === 0) return { valid: true, skipped: true };
  if (uint8Array.length > MAX_FEEDBACK_ATTACHMENT_BYTES) {
    return { valid: false, code: "ERR_ATTACHMENT_TOO_LARGE", message: "Tệp đính kèm vượt quá 10 MB." };
  }
  const lower = String(filename || "").toLowerCase();
  if (lower.endsWith(".pdf")) {
    return verifyFileSignature(uint8Array, filename, "document");
  }
  return verifyFileSignature(uint8Array, filename, "image");
}

function encodeMimeHeaderUtf8(str) {
  const clean = String(str || "").replace(/[\r\n]+/g, " ").trim();
  if (/^[\x20-\x7E]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${Buffer.from(clean, "utf-8").toString("base64")}?=`;
}

export function buildRfc5322MimeEmail({
  fromAddress,
  toAddress = OFFICIAL_SUPPORT_EMAIL,
  replyTo = "",
  subject,
  textBody,
  htmlBody,
  attachment = null
}) {
  const boundaryMix = `----=_WBTrans_Mix_${Math.random().toString(16).slice(2, 10) + Date.now().toString(16).slice(-8)}`;
  const boundaryAlt = `----=_WBTrans_Alt_${Math.random().toString(16).slice(2, 10) + Date.now().toString(16).slice(-8)}`;
  const dateHeader = new Date().toUTCString();
  const msgId = `<wbtrans-${Math.random().toString(16).slice(2, 12) + Date.now().toString(16).slice(-8)}@wordbridge.io.vn>`;

  const headers = [
    `From: Word Bridge Translation <${fromAddress}>`,
    `To: <${toAddress}>`,
    ...(replyTo ? [`Reply-To: <${replyTo}>`] : []),
    `Subject: ${encodeMimeHeaderUtf8(subject)}`,
    `Date: ${dateHeader}`,
    `Message-ID: ${msgId}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundaryMix}"`
  ];

  const parts = [
    `--${boundaryMix}`,
    `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
    ``,
    `--${boundaryAlt}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(textBody, "utf-8").toString("base64").replace(/.{1,76}/g, "$&\r\n").trim(),
    `--${boundaryAlt}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(htmlBody, "utf-8").toString("base64").replace(/.{1,76}/g, "$&\r\n").trim(),
    `--${boundaryAlt}--`
  ];

  if (attachment && attachment.bytes && attachment.bytes.length > 0) {
    const safeName = String(attachment.filename || "attachment.bin").replace(/[^a-zA-Z0-9._-]/g, "_");
    const b64 = Buffer.from(attachment.bytes).toString("base64").replace(/.{1,76}/g, "$&\r\n").trim();
    parts.push(
      `--${boundaryMix}`,
      `Content-Type: ${attachment.mimeType || "application/octet-stream"}; name="${safeName}"`,
      `Content-Disposition: attachment; filename="${safeName}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      b64
    );
  }

  parts.push(`--${boundaryMix}--`, ``);
  return `${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}`;
}

/**
 * Khách hàng SMTP chuẩn RFC 5321 độc lập (hỗ trợ SMTPS 465, STARTTLS 587 và SMTP cục bộ).
 */
export async function sendViaStandaloneSmtp({ host, port, secure, user, pass, mailFrom, rcptTo, rawMime, timeoutMs = 15000 }) {
  const netMod = await import(/* @vite-ignore */ ("node:" + "net"));
  const tlsMod = await import(/* @vite-ignore */ ("node:" + "tls"));
  const net = netMod.default || netMod;
  const tls = tlsMod.default || tlsMod;
  return new Promise((resolve, reject) => {
    let socket = null;
    let buffer = "";
    let step = 0;
    let settled = false;

    const finish = (err, info) => {
      if (settled) return;
      settled = true;
      try {
        if (socket && !socket.destroyed) socket.end();
      } catch (_) {}
      if (err) reject(err);
      else resolve(info);
    };

    const writeCmd = (cmd) => {
      socket.write(`${cmd}\r\n`);
    };

    const attachListeners = (sock) => {
      sock.setTimeout(timeoutMs, () => finish(new Error("ERR_SMTP_TIMEOUT")));
      sock.on("error", (err) => finish(err));
      sock.on("data", (chunk) => {
        buffer += chunk.toString("utf-8");
        const lines = buffer.split("\r\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line || line.length < 3) continue;
          // Phản hồi nhiều dòng dạng "250-..."
          if (line[3] === "-") continue;
          const code = Number(line.slice(0, 3));

          if (step === 0) {
            if (code !== 220) return finish(new Error(`ERR_SMTP_GREETING_${code}`));
            step = 1;
            writeCmd("EHLO dichthuat.wordbridge.io.vn");
          } else if (step === 1) {
            if (code !== 250) return finish(new Error(`ERR_SMTP_EHLO_${code}`));
            if (!secure && Number(port) === 587) {
              step = 2;
              writeCmd("STARTTLS");
            } else if (user && pass) {
              step = 4;
              const authPayload = Buffer.from(`\u0000${user}\u0000${pass}`, "utf-8").toString("base64");
              writeCmd(`AUTH PLAIN ${authPayload}`);
            } else {
              step = 5;
              writeCmd(`MAIL FROM:<${mailFrom}>`);
            }
          } else if (step === 2) {
            if (code !== 220) return finish(new Error(`ERR_SMTP_STARTTLS_${code}`));
            const upgraded = tls.connect({ socket: sock, servername: host, rejectUnauthorized: true });
            sock.removeAllListeners("data");
            sock.removeAllListeners("error");
            socket = upgraded;
            step = 3;
            attachListeners(upgraded);
            upgraded.once("secureConnect", () => writeCmd("EHLO dichthuat.wordbridge.io.vn"));
          } else if (step === 3) {
            if (code !== 250) return finish(new Error(`ERR_SMTP_EHLO_TLS_${code}`));
            if (user && pass) {
              step = 4;
              const authPayload = Buffer.from(`\u0000${user}\u0000${pass}`, "utf-8").toString("base64");
              writeCmd(`AUTH PLAIN ${authPayload}`);
            } else {
              step = 5;
              writeCmd(`MAIL FROM:<${mailFrom}>`);
            }
          } else if (step === 4) {
            if (code !== 235) return finish(new Error(`ERR_SMTP_AUTH_${code}`));
            step = 5;
            writeCmd(`MAIL FROM:<${mailFrom}>`);
          } else if (step === 5) {
            if (code !== 250) return finish(new Error(`ERR_SMTP_MAIL_FROM_${code}`));
            step = 6;
            writeCmd(`RCPT TO:<${rcptTo}>`);
          } else if (step === 6) {
            if (code !== 250 && code !== 251) return finish(new Error(`ERR_SMTP_RCPT_TO_${code}`));
            step = 7;
            writeCmd("DATA");
          } else if (step === 7) {
            if (code !== 354) return finish(new Error(`ERR_SMTP_DATA_${code}`));
            step = 8;
            // Dot-stuffing chuẩn RFC 5321
            const stuffed = rawMime.replace(/^\./gm, "..");
            socket.write(`${stuffed}\r\n.\r\n`);
          } else if (step === 8) {
            if (code !== 250) return finish(new Error(`ERR_SMTP_DELIVERY_${code}`));
            step = 9;
            writeCmd("QUIT");
            finish(null, { accepted: true, responseCode: code, responseLine: line });
          }
        }
      });
    };

    if (secure) {
      socket = tls.connect({ host, port: Number(port), servername: host, rejectUnauthorized: true });
    } else {
      socket = net.createConnection({ host, port: Number(port) });
    }
    attachListeners(socket);
  });
}

function resolveEnv(env, key) {
  return String((env && env[key]) || process.env[key] || "").trim();
}

export async function submitFeedbackAndSendEmail(payload = {}, env = {}, clientSignal = "default") {
  // 1. Chống bot spam (Honeypot)
  if (payload.websiteTrap && String(payload.websiteTrap).trim().length > 0) {
    return { ok: false, status: 400, code: "ERR_SPAM_DETECTED", message: "Yêu cầu không hợp lệ." };
  }

  // 2. Giới hạn tốc độ chống spam
  const rl = feedbackCooldownLimiter.check(clientSignal);
  if (!rl.allowed) {
    return {
      ok: false,
      status: 429,
      code: "ERR_FEEDBACK_RATE_LIMITED",
      message: "Bạn vừa gửi nhiều phản hồi liên tiếp. Vui lòng thử lại sau ít phút."
    };
  }

  // 3. Kiểm tra dữ liệu đầu vào
  const typeLabel = resolveFeedbackTypeLabel(payload.feedbackType || payload.type);
  if (!typeLabel) {
    return { ok: false, status: 400, code: "ERR_INVALID_FEEDBACK_TYPE", message: "Loại phản hồi không hợp lệ." };
  }

  const title = String(payload.title || "").replace(/[\r\n]+/g, " ").trim();
  if (title.length < 3 || title.length > MAX_FEEDBACK_TITLE_LENGTH) {
    return {
      ok: false,
      status: 400,
      code: "ERR_INVALID_FEEDBACK_TITLE",
      message: `Tiêu đề phản hồi phải từ 3 đến ${MAX_FEEDBACK_TITLE_LENGTH} ký tự.`
    };
  }

  const message = String(payload.message || payload.content || "").trim();
  if (message.length < 10 || message.length > MAX_FEEDBACK_MESSAGE_LENGTH) {
    return {
      ok: false,
      status: 400,
      code: "ERR_INVALID_FEEDBACK_MESSAGE",
      message: `Nội dung chi tiết phải từ 10 đến ${MAX_FEEDBACK_MESSAGE_LENGTH} ký tự.`
    };
  }

  const contactEmail = String(payload.contactEmail || "").trim();
  let validatedReplyTo = "";
  if (contactEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) || contactEmail.length > 254) {
      return { ok: false, status: 400, code: "ERR_INVALID_CONTACT_EMAIL", message: "Địa chỉ email liên hệ không đúng định dạng." };
    }
    validatedReplyTo = contactEmail;
  }

  // 4. Kiểm tra tệp đính kèm tùy chọn (trên RAM)
  let attachmentBytes = null;
  let attachmentObj = null;
  try {
    if (payload.attachmentBase64) {
      attachmentBytes = new Uint8Array(Buffer.from(String(payload.attachmentBase64), "base64"));
      const attCheck = validateFeedbackAttachment(attachmentBytes, payload.attachmentFilename || "attachment");
      if (!attCheck.valid) {
        return { ok: false, status: 400, code: attCheck.code, message: attCheck.message };
      }
      attachmentObj = {
        filename: String(payload.attachmentFilename || `attachment.${attCheck.format}`),
        mimeType: attCheck.mimeType,
        bytes: attachmentBytes
      };
    }

    const emailSubject = `[WORD BRIDGE TRANS] – [${typeLabel.toUpperCase()}] – [${title}]`;
    const mailTo = OFFICIAL_SUPPORT_EMAIL; // Khóa cứng địa chỉ nhận duy nhất
    const mailFrom = resolveEnv(env, "MAIL_FROM") || resolveEnv(env, "SMTP_USER") || "noreply@wordbridge.io.vn";

    const textBody = [
      `HỆ THỐNG DỊCH THUẬT WORD BRIDGE (TRANS)`,
      `Website: https://dichthuat.wordbridge.io.vn`,
      `Loại phản hồi: ${typeLabel}`,
      `Tiêu đề: ${title}`,
      `Email liên hệ người gửi: ${validatedReplyTo || "Không cung cấp"}`,
      `Thời gian tiếp nhận (UTC): ${new Date().toISOString()}`,
      `---`,
      message
    ].join("\n");

    const htmlBody = `<!DOCTYPE html><html lang="vi"><body style="font-family:Inter,Arial,sans-serif;color:#1e293b;line-height:1.6;">
      <div style="max-width:640px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="background:#0B63E5;color:#ffffff;padding:18px 24px;">
          <h2 style="margin:0;font-size:18px;">WORD BRIDGE TRANSLATION — PHẢN HỒI NGƯỜI DÙNG</h2>
          <div style="font-size:12px;opacity:0.9;margin-top:4px;">https://dichthuat.wordbridge.io.vn</div>
        </div>
        <div style="padding:20px 24px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:6px 0;font-weight:700;width:160px;">Loại phản hồi:</td><td>${escapeHtml(typeLabel)}</td></tr>
            <tr><td style="padding:6px 0;font-weight:700;">Tiêu đề:</td><td>${escapeHtml(title)}</td></tr>
            <tr><td style="padding:6px 0;font-weight:700;">Email liên hệ:</td><td>${escapeHtml(validatedReplyTo || "Không cung cấp")}</td></tr>
          </table>
          <div style="margin-top:16px;padding:14px;background:#f8fafc;border-left:4px solid #0B63E5;white-space:pre-wrap;">${escapeHtml(message)}</div>
        </div>
      </div>
    </body></html>`;

    const rawMime = buildRfc5322MimeEmail({
      fromAddress: mailFrom,
      toAddress: mailTo,
      replyTo: validatedReplyTo,
      subject: emailSubject,
      textBody,
      htmlBody,
      attachment: attachmentObj
    });

    const smtpHost = resolveEnv(env, "SMTP_HOST");
    const smtpPort = Number(resolveEnv(env, "SMTP_PORT") || 587);
    const smtpUser = resolveEnv(env, "SMTP_USER");
    const smtpPass = resolveEnv(env, "SMTP_PASSWORD");
    const smtpSecure = resolveEnv(env, "SMTP_SECURE").toLowerCase() === "true" || smtpPort === 465;

    if (!smtpHost) {
      return {
        ok: false,
        status: 503,
        code: "ERR_SMTP_NOT_CONFIGURED",
        message:
          "Hệ thống gửi email SMTP độc lập chưa được cấu hình trên máy chủ (SMTP_HOST). Không thể gửi phản hồi lúc này.",
        zeroUserDataStorage: true
      };
    }

    const smtpRes = await sendViaStandaloneSmtp({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      user: smtpUser,
      pass: smtpPass,
      mailFrom,
      rcptTo: mailTo,
      rawMime
    });

    return {
      ok: true,
      status: 200,
      delivered: true,
      recipient: mailTo,
      subject: emailSubject,
      smtpResponseCode: smtpRes.responseCode,
      message: "Ý kiến phản hồi của bạn đã được chuyển thành công tới đội ngũ Word Bridge Translation.",
      zeroUserDataStorage: true
    };
  } catch (err) {
    return {
      ok: false,
      status: 502,
      code: "ERR_SMTP_DELIVERY_FAILED",
      message: `Máy chủ email không thể chuyển thư lúc này (${err?.message || "SMTP error"}). Vui lòng thử lại sau.`,
      zeroUserDataStorage: true
    };
  } finally {
    wipeBuffer(attachmentBytes);
  }
}
