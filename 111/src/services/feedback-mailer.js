/**
 * @file src/services/feedback-mailer.js
 * @description Hệ thống Tiếp nhận Ý kiến Phản hồi & Tự động Gửi Email Hỗ trợ.
 * ĐỊA CHỈ EMAIL TIẾP NHẬN CHÍNH THỨC VÀ DUY NHẤT:
 *   wordbridge.education@gmail.com
 *
 * Yêu cầu bắt buộc (Phần VII):
 *   - Tiêu đề email chuẩn: [WORD BRIDGE TRANS] – [LOẠI PHẢN HỒI] – [TIÊU ĐỀ]
 *   - Hỗ trợ 08 loại phản hồi chính thức.
 *   - Hỗ trợ tệp đính kèm tùy chọn (JPG, JPEG, PNG, PDF | tối đa 10 MB) kiểm tra bằng Magic Bytes.
 *   - Tuyệt đối không dùng `mailto:`, không giả lập thành công, không lưu vào D1/R2.
 *   - Hỗ trợ gửi qua Cloudflare Email Routing (`env.SEND_EMAIL`), Resend/SendGrid/MailChannels/SMTP Relay API.
 */

import { verifyFileSignature, wipeBuffer, escapeHtml, sanitizedLog } from "../security/privacy-shield.js";

export const OFFICIAL_SUPPORT_EMAIL = "wordbridge.education@gmail.com";
export const VERIFIED_SENDER_ADDRESS = "noreply@wordbridge.io.vn";
export const MAX_FEEDBACK_MESSAGE_LENGTH = 2000;
export const MAX_FEEDBACK_TITLE_LENGTH = 200;
export const MAX_FEEDBACK_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export const FEEDBACK_TYPES = Object.freeze([
  { id: "technical_bug", label: "Báo lỗi kỹ thuật" },
  { id: "ui_feedback", label: "Góp ý giao diện" },
  { id: "translation_quality", label: "Góp ý chất lượng dịch thuật" },
  { id: "language_request", label: "Đề xuất ngôn ngữ" },
  { id: "feature_request", label: "Đề xuất tính năng" },
  { id: "support_request", label: "Yêu cầu hỗ trợ" },
  { id: "security_issue", label: "Báo cáo vấn đề bảo mật" },
  { id: "other", label: "Nội dung khác" }
]);

// Bộ chống gửi liên tục (Anti-Spam Cooldown) trên RAM không lưu IP
class FeedbackCooldownLimiter {
  constructor() {
    this.recentBuckets = new Map();
  }

  checkAndRecord(signalKey) {
    const now = Date.now();
    for (const [k, entry] of this.recentBuckets.entries()) {
      if (now - entry.firstTs > 15000) this.recentBuckets.delete(k);
    }
    const existing = this.recentBuckets.get(signalKey);
    const count = existing ? existing.count + 1 : 1;
    const firstTs = existing ? existing.firstTs : now;
    if (count > 5) {
      return {
        allowed: false,
        message: "Bạn đang gửi phản hồi quá nhanh. Vui lòng đợi 15 giây trước khi gửi yêu cầu tiếp theo."
      };
    }
    this.recentBuckets.set(signalKey, { count, firstTs });
    return { allowed: true };
  }

  reset() {
    this.recentBuckets.clear();
  }
}

export const feedbackCooldownLimiter = new FeedbackCooldownLimiter();

export function resolveFeedbackTypeLabel(typeInput) {
  const raw = String(typeInput || "").trim();
  const found = FEEDBACK_TYPES.find(
    (t) => t.id.toLowerCase() === raw.toLowerCase() || t.label.toLowerCase() === raw.toLowerCase()
  );
  return found ? found.label : null;
}

/**
 * Kiểm tra tệp đính kèm trong biểu mẫu phản hồi (Hỗ trợ JPG, JPEG, PNG, PDF | Tối đa 10 MB).
 */
export function validateFeedbackAttachment(uint8Array, filename = "") {
  if (!uint8Array || uint8Array.byteLength === 0) {
    return { valid: true, hasAttachment: false };
  }
  if (uint8Array.byteLength > MAX_FEEDBACK_ATTACHMENT_BYTES) {
    return {
      valid: false,
      code: "ERR_FEEDBACK_ATTACHMENT_TOO_LARGE",
      message: "Tệp đính kèm vượt quá dung lượng tối đa 10 MB."
    };
  }

  const b0 = uint8Array[0];
  const b1 = uint8Array[1];
  const b2 = uint8Array[2];
  const b3 = uint8Array[3];

  const isPng = b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47;
  const isJpeg = b0 === 0xff && b1 === 0xd8 && b2 === 0xff;
  const isPdf =
    uint8Array.byteLength >= 5 &&
    b0 === 0x25 &&
    b1 === 0x50 &&
    b2 === 0x44 &&
    b3 === 0x46 &&
    uint8Array[4] === 0x2d;

  if (!isPng && !isJpeg && !isPdf) {
    return {
      valid: false,
      code: "ERR_FEEDBACK_INVALID_ATTACHMENT_TYPE",
      message: "Tệp đính kèm không hợp lệ. Chỉ hỗ trợ định dạng JPG, JPEG, PNG hoặc PDF (tối đa 10 MB)."
    };
  }

  const mimeType = isPng ? "image/png" : isJpeg ? "image/jpeg" : "application/pdf";
  const ext = isPng ? "png" : isJpeg ? "jpg" : "pdf";
  const safeFilename =
    String(filename || `attachment.${ext}`).replace(/[^a-zA-Z0-9._-]/g, "_") || `attachment.${ext}`;

  return {
    valid: true,
    hasAttachment: true,
    mimeType,
    filename: safeFilename,
    byteLength: uint8Array.byteLength
  };
}

/**
 * Đóng gói bức thư chuẩn RFC 5322 MIME để gửi qua Cloudflare Email Routing (`env.SEND_EMAIL`).
 */
export function buildRfc5322MimeEmail({
  subject,
  fromAddress,
  toAddress,
  replyTo,
  textBody,
  htmlBody,
  attachment
}) {
  const boundary = `wb_mime_${Date.now().toString(36)}`;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
  const headers = [
    `From: "Word Bridge Translation Support" <${fromAddress}>`,
    `To: <${toAddress}>`,
    `Subject: ${encodedSubject}`,
    `Date: ${new Date().toUTCString()}`,
    `MIME-Version: 1.0`
  ];
  if (replyTo) {
    headers.push(`Reply-To: <${replyTo}>`);
  }

  if (!attachment || !attachment.hasAttachment) {
    headers.push(`Content-Type: text/html; charset="UTF-8"`);
    headers.push(`Content-Transfer-Encoding: base64`);
    const b64Html = Buffer.from(htmlBody, "utf-8").toString("base64");
    return `${headers.join("\r\n")}\r\n\r\n${b64Html}\r\n`;
  }

  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  const parts = [
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(htmlBody, "utf-8").toString("base64"),
    `--${boundary}`,
    `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
    `Content-Disposition: attachment; filename="${attachment.filename}"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    attachment.base64Data,
    `--${boundary}--`
  ];

  return `${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}\r\n`;
}

/**
 * Xử lý biểu mẫu phản hồi và gửi email thực tế tới duy nhất `wordbridge.education@gmail.com`.
 */
export async function submitFeedbackAndSendEmail(payload = {}, env = {}, clientSignal = "default") {
  let attachmentBytes = null;
  try {
    // 1. Kiểm tra chống spam liên tục
    const rateCheck = feedbackCooldownLimiter.checkAndRecord(clientSignal);
    if (!rateCheck.allowed) {
      return {
        ok: false,
        code: "ERR_FEEDBACK_RATE_LIMITED",
        message: rateCheck.message
      };
    }

    // 2. Kiểm tra Loại phản hồi
    const typeLabel = resolveFeedbackTypeLabel(payload.feedbackType || payload.type);
    if (!typeLabel) {
      return {
        ok: false,
        code: "ERR_INVALID_FEEDBACK_TYPE",
        message: "Vui lòng chọn loại phản hồi hợp lệ từ danh sách."
      };
    }

    // 3. Kiểm tra Tiêu đề
    const title = String(payload.title || "").trim();
    if (!title) {
      return {
        ok: false,
        code: "ERR_EMPTY_FEEDBACK_TITLE",
        message: "Vui lòng nhập tiêu đề ngắn gọn cho ý kiến phản hồi."
      };
    }
    if (title.length > MAX_FEEDBACK_TITLE_LENGTH) {
      return {
        ok: false,
        code: "ERR_FEEDBACK_TITLE_TOO_LONG",
        message: `Tiêu đề phản hồi không được vượt quá ${MAX_FEEDBACK_TITLE_LENGTH} ký tự.`
      };
    }

    // 4. Kiểm tra Nội dung chi tiết
    const message = String(payload.message || payload.content || "").trim();
    if (!message) {
      return {
        ok: false,
        code: "ERR_EMPTY_FEEDBACK_MESSAGE",
        message: "Vui lòng nhập nội dung chi tiết ý kiến hoặc vấn đề bạn gặp phải."
      };
    }
    if (message.length > MAX_FEEDBACK_MESSAGE_LENGTH) {
      return {
        ok: false,
        code: "ERR_FEEDBACK_MESSAGE_TOO_LONG",
        message: `Nội dung chi tiết không được vượt quá ${MAX_FEEDBACK_MESSAGE_LENGTH.toLocaleString("vi-VN")} ký tự.`
      };
    }

    // 5. Kiểm tra Email liên hệ tùy chọn (đưa vào Reply-To nếu hợp lệ)
    const contactEmail = String(payload.contactEmail || "").trim();
    let validatedReplyTo = "";
    if (contactEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactEmail)) {
        return {
          ok: false,
          code: "ERR_INVALID_CONTACT_EMAIL",
          message: "Địa chỉ email liên hệ (tùy chọn) không đúng định dạng."
        };
      }
      validatedReplyTo = contactEmail;
    }

    // 6. Kiểm tra tệp đính kèm tùy chọn (JPG, JPEG, PNG, PDF <= 10 MB)
    let attachmentInfo = { valid: true, hasAttachment: false };
    if (payload.attachmentBase64) {
      const cleanedB64 = String(payload.attachmentBase64).replace(/^data:[^;]+;base64,/, "").trim();
      attachmentBytes = new Uint8Array(Buffer.from(cleanedB64, "base64"));
      const check = validateFeedbackAttachment(attachmentBytes, payload.attachmentFilename || "attachment");
      if (!check.valid) {
        return {
          ok: false,
          code: check.code,
          message: check.message
        };
      }
      attachmentInfo = {
        ...check,
        base64Data: cleanedB64
      };
    }

    // 7. Thiết lập tiêu đề chuẩn bắt buộc: [WORD BRIDGE TRANS] – [LOẠI PHẢN HỒI] – [TIÊU ĐỀ]
    const emailSubject = `[WORD BRIDGE TRANS] – [${typeLabel.toUpperCase()}] – [${title}]`;
    const receivedAt = new Date().toISOString();
    const relatedFeature = String(payload.relatedFeature || "Word Bridge Translation Web").trim();

    const textBody = [
      "HỆ THỐNG TIẾP NHẬN PHẢN HỒI – WORD BRIDGE TRANSLATION (DICHTHUAT.WORDBRIDGE.IO.VN)",
      "================================================================================",
      `Email nhận chính thức: ${OFFICIAL_SUPPORT_EMAIL}`,
      `Loại phản hồi: ${typeLabel}`,
      `Tiêu đề: ${title}`,
      `Chức năng liên quan: ${relatedFeature}`,
      `Thời điểm tiếp nhận: ${receivedAt}`,
      `Thông tin liên hệ (Reply-To): ${validatedReplyTo || "Không cung cấp (Ẩn danh)"}`,
      `Tệp đính kèm: ${attachmentInfo.hasAttachment ? `${attachmentInfo.filename} (${attachmentInfo.byteLength} bytes)` : "Không có"}`,
      "--------------------------------------------------------------------------------",
      "NỘI DUNG CHI TIẾT:",
      message,
      "================================================================================"
    ].join("\n");

    const htmlBody = `<div style="font-family:Inter,Arial,sans-serif;max-width:680px;margin:0 auto;border:1px solid #d9e3ea;border-radius:12px;overflow:hidden;">
      <div style="background:#084c59;color:#ffffff;padding:16px 20px;border-bottom:4px solid #d1101a;">
        <h2 style="margin:0;font-size:18px;">WORD BRIDGE TRANSLATION (TRANS) – PHẢN HỒI NGƯỜI DÙNG</h2>
        <div style="font-size:12px;opacity:0.9;margin-top:4px;">Website: https://dichthuat.wordbridge.io.vn · Tiếp nhận tại: ${OFFICIAL_SUPPORT_EMAIL}</div>
      </div>
      <div style="padding:20px;background:#ffffff;color:#11242b;font-size:14px;line-height:1.6;">
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr><td style="padding:6px 0;font-weight:700;width:180px;">Loại phản hồi:</td><td>${escapeHtml(typeLabel)}</td></tr>
          <tr><td style="padding:6px 0;font-weight:700;">Tiêu đề:</td><td>${escapeHtml(title)}</td></tr>
          <tr><td style="padding:6px 0;font-weight:700;">Chức năng liên quan:</td><td>${escapeHtml(relatedFeature)}</td></tr>
          <tr><td style="padding:6px 0;font-weight:700;">Thời điểm tiếp nhận:</td><td>${escapeHtml(receivedAt)}</td></tr>
          <tr><td style="padding:6px 0;font-weight:700;">Email người gửi:</td><td>${escapeHtml(validatedReplyTo || "Không cung cấp")}</td></tr>
          <tr><td style="padding:6px 0;font-weight:700;">Tệp đính kèm:</td><td>${attachmentInfo.hasAttachment ? escapeHtml(`${attachmentInfo.filename} (${attachmentInfo.byteLength} bytes)`) : "Không có"}</td></tr>
        </table>
        <div style="background:#f4f8fa;border-left:4px solid #084c59;padding:14px 16px;border-radius:6px;white-space:pre-wrap;">${escapeHtml(message)}</div>
      </div>
    </div>`;

    const rawMime = buildRfc5322MimeEmail({
      subject: emailSubject,
      fromAddress: VERIFIED_SENDER_ADDRESS,
      toAddress: OFFICIAL_SUPPORT_EMAIL,
      replyTo: validatedReplyTo,
      textBody,
      htmlBody,
      attachment: attachmentInfo
    });

    // 8. Thực hiện gửi Email qua các kênh đã cấu hình
    // Kênh A: Custom Test/Runtime Transport Handler hoặc Cloudflare Email Routing Binding (env.SEND_EMAIL)
    if (env && env.SEND_EMAIL && typeof env.SEND_EMAIL.send === "function") {
      try {
        await env.SEND_EMAIL.send({
          from: VERIFIED_SENDER_ADDRESS,
          to: OFFICIAL_SUPPORT_EMAIL,
          replyTo: validatedReplyTo || undefined,
          subject: emailSubject,
          raw: rawMime
        });
        return {
          ok: true,
          recipient: OFFICIAL_SUPPORT_EMAIL,
          subject: emailSubject,
          feedbackType: typeLabel,
          receivedAt,
          transport: "cloudflare_send_email_binding",
          message: `Ý kiến phản hồi của bạn đã được gửi thành công tới ${OFFICIAL_SUPPORT_EMAIL}.`
        };
      } catch (err) {
        sanitizedLog("ERROR", "EMAIL_BINDING_SEND_FAILED", { errorCode: "ERR_SEND_EMAIL_BINDING" });
        return {
          ok: false,
          code: "ERR_EMAIL_DELIVERY_FAILED",
          recipient: OFFICIAL_SUPPORT_EMAIL,
          message: "Dịch vụ gửi email đang gặp sự cố kết nối tạm thời. Vui lòng thử lại sau ít phút."
        };
      }
    }

    // Kênh B: Resend Transactional Email API (RESEND_API_KEY)
    if (env && env.RESEND_API_KEY) {
      try {
        const resendPayload = {
          from: `Word Bridge Translation <${VERIFIED_SENDER_ADDRESS}>`,
          to: [OFFICIAL_SUPPORT_EMAIL],
          subject: emailSubject,
          html: htmlBody,
          text: textBody
        };
        if (validatedReplyTo) resendPayload.reply_to = validatedReplyTo;
        if (attachmentInfo.hasAttachment) {
          resendPayload.attachments = [
            {
              filename: attachmentInfo.filename,
              content: attachmentInfo.base64Data
            }
          ];
        }
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.RESEND_API_KEY}`
          },
          body: JSON.stringify(resendPayload)
        });
        if (!res.ok) {
          return {
            ok: false,
            code: "ERR_EMAIL_PROVIDER_REJECTED",
            recipient: OFFICIAL_SUPPORT_EMAIL,
            message: `Nhà cung cấp dịch vụ email trả về lỗi (${res.status}). Không thể hoàn tất gửi phản hồi.`
          };
        }
        return {
          ok: true,
          recipient: OFFICIAL_SUPPORT_EMAIL,
          subject: emailSubject,
          feedbackType: typeLabel,
          receivedAt,
          transport: "resend_transactional_api",
          message: `Ý kiến phản hồi của bạn đã được chuyển thành công tới ${OFFICIAL_SUPPORT_EMAIL}.`
        };
      } catch (_) {
        return {
          ok: false,
          code: "ERR_EMAIL_DELIVERY_FAILED",
          recipient: OFFICIAL_SUPPORT_EMAIL,
          message: "Không thể kết nối tới máy chủ gửi email giao dịch. Vui lòng thử lại sau."
        };
      }
    }

    // Kênh C: SMTP / Webhook Relay API (SMTP_RELAY_URL)
    if (env && env.SMTP_RELAY_URL) {
      try {
        const res = await fetch(env.SMTP_RELAY_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(env.SMTP_RELAY_TOKEN ? { Authorization: `Bearer ${env.SMTP_RELAY_TOKEN}` } : {})
          },
          body: JSON.stringify({
            from: VERIFIED_SENDER_ADDRESS,
            to: OFFICIAL_SUPPORT_EMAIL,
            replyTo: validatedReplyTo,
            subject: emailSubject,
            text: textBody,
            html: htmlBody,
            rawMime
          })
        });
        if (!res.ok) {
          return {
            ok: false,
            code: "ERR_SMTP_RELAY_FAILED",
            recipient: OFFICIAL_SUPPORT_EMAIL,
            message: "Máy chủ SMTP Relay tạm thời không phản hồi."
          };
        }
        return {
          ok: true,
          recipient: OFFICIAL_SUPPORT_EMAIL,
          subject: emailSubject,
          feedbackType: typeLabel,
          receivedAt,
          transport: "smtp_relay_webhook",
          message: `Ý kiến phản hồi của bạn đã được gửi tới ${OFFICIAL_SUPPORT_EMAIL}.`
        };
      } catch (_) {
        return {
          ok: false,
          code: "ERR_SMTP_RELAY_UNREACHABLE",
          recipient: OFFICIAL_SUPPORT_EMAIL,
          message: "Không thể kết nối tới máy chủ SMTP Relay."
        };
      }
    }

    // Nếu chưa có binding SEND_EMAIL hoặc RESEND_API_KEY/SMTP_RELAY_URL trong môi trường
    return {
      ok: false,
      code: "ERR_EMAIL_SERVICE_NOT_CONFIGURED",
      recipient: OFFICIAL_SUPPORT_EMAIL,
      subject: emailSubject,
      message: `Hệ thống đã kiểm tra hợp lệ biểu mẫu (đích nhận: ${OFFICIAL_SUPPORT_EMAIL}), nhưng dịch vụ gửi email (Cloudflare Email Routing SEND_EMAIL hoặc RESEND_API_KEY) chưa được kích hoạt trên môi trường này.`
    };
  } finally {
    if (attachmentBytes) wipeBuffer(attachmentBytes);
  }
}
