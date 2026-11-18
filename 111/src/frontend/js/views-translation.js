'use strict';

/**
 * GIAO DIỆN HỆ THỐNG DỊCH THUẬT WORD BRIDGE (src/frontend/js/views-translation.js)
 * Tên sản phẩm: Dịch thuật Word Bridge (Word Bridge Translation — Trans)
 * Website: https://dichthuat.wordbridge.io.vn
 *
 * NGUYÊN TẮC BẮT BUỘC (ZERO USER DATA STORAGE):
 * - Không sử dụng localStorage, sessionStorage, IndexedDB, Cookies hoặc Cache API để lưu văn bản dịch,
 *   kết quả dịch, tài liệu tải lên, kết quả OCR hay lịch sử dịch thuật.
 * - Không có nút Lưu bản dịch, Xem lại bản dịch cũ, Lịch sử dịch thuật, Từ điển cá nhân hay Tài liệu gần đây.
 * - Mọi dữ liệu trong phiên được giải phóng ngay khi người dùng bấm Xóa hoặc kết thúc thao tác.
 */
(function (WB) {
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function countWordsAndCharsClient(rawText) {
    const str = String(rawText ?? '');
    const chars = Array.from(str).length;
    const cjk = (str.match(/[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF]/g) || []).length;
    const nonCjk = str.replace(/[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF]/g, ' ').trim();
    const alpha = nonCjk ? nonCjk.split(/\s+/).filter(Boolean).length : 0;
    const lines = str ? str.split(/\r?\n/).length : 0;
    return { chars, words: cjk + alpha, lines };
  }

  function speakTextInBrowser(text, bcp47Lang) {
    const clean = String(text || '').trim();
    if (!clean) {
      WB.toast('Chưa có nội dung văn bản để phát âm.', 'error');
      return;
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') {
      WB.toast('Trình duyệt hiện tại không hỗ trợ API phát âm trực tiếp (Web Speech API).', 'error');
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new window.SpeechSynthesisUtterance(clean);
      utter.lang = bcp47Lang && bcp47Lang !== 'auto' ? bcp47Lang : 'vi-VN';
      utter.rate = 1.0;
      window.speechSynthesis.speak(utter);
      WB.toast(`Đang phát âm nội dung (${utter.lang})...`, 'info');
    } catch (_) {
      WB.toast('Không thể khởi tạo bộ phát âm cho ngôn ngữ này trên thiết bị.', 'error');
    }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result || '');
        const idx = res.indexOf(';base64,');
        resolve(idx >= 0 ? res.slice(idx + 8) : res);
      };
      reader.onerror = () => reject(new Error('Không thể đọc tệp từ trình duyệt.'));
      reader.readAsDataURL(file);
    });
  }

  function triggerEphemeralDownload(base64Data, fileName, mimeType) {
    const bin = atob(base64Data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType || 'application/octet-stream' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName || 'translated-document.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Giải phóng Blob URL và vùng nhớ tạm ngay sau khi tải xuống
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      bytes.fill(0);
    }, 1000);
  }

  async function renderTranslationWorkspace(container, options = {}) {
    let transMeta = WB.state.bootstrap?.translation || null;
    if (!transMeta) {
      try {
        transMeta = await WB.api('/api/trans/bootstrap');
      } catch (_) {
        transMeta = {
          languages: [],
          domains: [],
          supported_document_formats: [],
          supported_image_ocr_formats: [],
          site_metrics: { total_accesses: 0 },
          provider_status: { active_provider: 'wordbridge_neural_edge_engine' }
        };
      }
    } else {
      // Cập nhật số lượt truy cập mới nhất từ D1
      try {
        const m = await WB.api('/api/trans/metrics');
        if (m && typeof m.total_accesses === 'number') {
          transMeta.site_metrics = { total_accesses: m.total_accesses };
        }
      } catch (_) {}
    }

    const languages = transMeta.languages || [];
    const targetLanguages = languages.filter(l => !l.is_auto);
    const domains = transMeta.domains || [];
    const docFormats = transMeta.supported_document_formats || [];
    const ocrFormats = transMeta.supported_image_ocr_formats || [];
    const totalAccesses = transMeta.site_metrics?.total_accesses ?? 0;

    // Biến trạng thái tạm thời chỉ tồn tại trong bộ nhớ RAM của phiên hiện tại
    const ephemeralState = {
      activeTab: options.initialTab || 'text',
      sourceLang: 'auto',
      targetLang: 'vi',
      domain: 'general_other',
      lastDetectedLang: null,
      lastTargetBcp47: 'vi-VN',
      lastDocOutput: null
    };

    container.innerHTML = `
      <section class="wb-trans-shell" aria-label="Không gian Dịch thuật Toàn cầu Word Bridge">
        <!-- BANNER NHẬN DIỆN RIÊNG CỦA WORD BRIDGE TRANSLATION (TRANS) -->
        <div class="wb-trans-hero-bar">
          <div class="wb-trans-hero-left">
            <div class="wb-trans-badge-row">
              <span class="wb-trans-service-pill">WORD BRIDGE TRANS • DICHTHUAT.WORDBRIDGE.IO.VN</span>
              <span class="wb-trans-privacy-pill" title="Hệ thống không lưu trữ bất kỳ văn bản, tài liệu hay lịch sử dịch thuật nào của người dùng">
                ${WB.icon('shield', 14)}
                <span>ZERO USER DATA STORAGE</span>
              </span>
            </div>
            <h1 class="wb-trans-main-title">
              Dịch thuật <span style="color:#FFFFFF;">WORD</span> <span style="color:#FFB4A8;">BRIDGE</span> — Nền tảng Dịch thuật Đa ngôn ngữ Toàn cầu
            </h1>
            <p class="wb-trans-subtitle">
              Hỗ trợ <strong>${targetLanguages.length} ngôn ngữ toàn cầu</strong>, <strong>${domains.length} chế độ dịch chuyên ngành</strong>, xử lý trực tuyến tài liệu (PDF, DOCX, DOC, TXT, PPTX, XLSX, CSV) và nhận diện OCR hình ảnh (PNG, JPG, WEBP) trên bộ nhớ tạm thời gian thực. Độc lập hoàn toàn với lộ trình 05 ngôn ngữ của <em>Word Bridge Learning</em>.
            </p>
          </div>

          <div class="wb-trans-metrics-card" aria-label="Chỉ số thống kê duy nhất trên Cloudflare D1">
            <div class="wb-trans-metrics-label">CHỈ SỐ DUY NHẤT TRÊN CLOUDFLARE D1 (word)</div>
            <div class="wb-trans-metrics-value" id="wbTransTotalAccessCount">${Number(totalAccesses).toLocaleString('vi-VN')}</div>
            <div class="wb-trans-metrics-sub">Tổng số lượt truy cập website (Nguyên tử • Không định danh)</div>
          </div>
        </div>

        <!-- THANH ĐIỀU HƯỚNG 04 CHẾ ĐỘ DỊCH THUẬT -->
        <div class="wb-trans-mode-tabs" role="tablist" aria-label="Chọn công cụ dịch thuật">
          <button type="button" class="wb-trans-tab-btn active" data-trans-tab="text" role="tab" aria-selected="true">
            ${WB.icon('book', 17)}
            <span>Dịch văn bản (${targetLanguages.length} ngôn ngữ)</span>
          </button>
          <button type="button" class="wb-trans-tab-btn" data-trans-tab="document" role="tab" aria-selected="false">
            ${WB.icon('folder', 17)}
            <span>Dịch tài liệu (PDF, DOCX, PPTX, XLSX, CSV, TXT)</span>
          </button>
          <button type="button" class="wb-trans-tab-btn" data-trans-tab="ocr" role="tab" aria-selected="false">
            ${WB.icon('sparkle', 17)}
            <span>Dịch hình ảnh &amp; Nhận diện OCR</span>
          </button>
          <button type="button" class="wb-trans-tab-btn" data-trans-tab="privacy" role="tab" aria-selected="false">
            ${WB.icon('shield', 17)}
            <span>Kiểm chứng Zero Storage &amp; Hạ tầng D1/R2</span>
          </button>
        </div>

        <!-- THANH ĐIỀU KHIỂN NGÔN NGỮ TOÀN CẦU & 20 CHUYÊN NGÀNH DÙNG CHUNG -->
        <div class="wb-trans-controls-bar">
          <div class="wb-trans-lang-selector-group">
            <div class="wb-trans-lang-col">
              <label for="wbTransSourceLangSelect">Ngôn ngữ nguồn</label>
              <input type="search" id="wbTransSourceLangSearch" class="wb-trans-lang-filter" placeholder="Tìm nhanh ngôn ngữ nguồn (tên/mã)..." aria-label="Tìm kiếm ngôn ngữ nguồn" />
              <select id="wbTransSourceLangSelect" class="wb-input wb-trans-select">
                ${languages.map(l => `
                  <option value="${escapeHtml(l.code)}" ${l.code === 'auto' ? 'selected' : ''}>
                    ${escapeHtml(l.name_vi)} — ${escapeHtml(l.native_name)} [${escapeHtml(l.code.toUpperCase())}]${l.dir === 'rtl' ? ' (RTL)' : ''}
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="wb-trans-swap-col">
              <button type="button" id="wbTransSwapLangBtn" class="wb-btn wb-btn-outline wb-trans-swap-btn" title="Đảo chiều cặp ngôn ngữ dịch thuật" aria-label="Đảo chiều ngôn ngữ">
                ${WB.icon('refresh', 18)}
                <span>Đảo chiều</span>
              </button>
            </div>

            <div class="wb-trans-lang-col">
              <label for="wbTransTargetLangSelect">Ngôn ngữ đích</label>
              <input type="search" id="wbTransTargetLangSearch" class="wb-trans-lang-filter" placeholder="Tìm nhanh ngôn ngữ đích (tên/mã)..." aria-label="Tìm kiếm ngôn ngữ đích" />
              <select id="wbTransTargetLangSelect" class="wb-input wb-trans-select">
                ${targetLanguages.map(l => `
                  <option value="${escapeHtml(l.code)}" ${l.code === 'vi' ? 'selected' : ''}>
                    ${escapeHtml(l.name_vi)} — ${escapeHtml(l.native_name)} [${escapeHtml(l.code.toUpperCase())}]${l.dir === 'rtl' ? ' (RTL)' : ''}
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="wb-trans-domain-col">
              <label for="wbTransDomainSelect">Chế độ dịch chuyên ngành (20 lĩnh vực)</label>
              <div class="wb-trans-domain-hint">Ưu tiên chuẩn xác thuật ngữ chuyên môn &amp; ngữ cảnh</div>
              <select id="wbTransDomainSelect" class="wb-input wb-trans-select">
                ${domains.map(d => `
                  <option value="${escapeHtml(d.id)}" ${d.id === 'general_other' ? 'selected' : ''}>
                    ${d.order}. ${escapeHtml(d.name_vi)} (${escapeHtml(d.name_en)})
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
          <div id="wbTransLangWarningBar" class="wb-trans-warning-banner" style="display:none;"></div>
        </div>

        <!-- ================================================================== -->
        <!-- PANEL 1: DỊCH VĂN BẢN TRỰC TUYẾN & CÔNG CỤ HỖ TRỢ DỊCH THUẬT       -->
        <!-- ================================================================== -->
        <div class="wb-trans-panel" id="wbTransPanel_text">
          <div class="wb-trans-editor-grid">
            <!-- CỘT VĂN BẢN NGUỒN -->
            <div class="wb-trans-editor-box">
              <div class="wb-trans-box-header">
                <div>
                  <strong>Văn bản cần dịch</strong>
                  <span id="wbTransDetectedBadge" class="wb-trans-detected-chip">Tự động nhận diện ngôn ngữ</span>
                </div>
                <div class="wb-trans-box-actions">
                  <button type="button" class="wb-btn wb-btn-outline wb-btn-xs" id="wbTransSpeakSourceBtn" title="Phát âm văn bản nguồn">
                    ${WB.icon('volume', 15)}
                    <span>Phát âm</span>
                  </button>
                  <button type="button" class="wb-btn wb-btn-outline wb-btn-xs" id="wbTransClearBtn" title="Xóa văn bản và giải phóng bộ nhớ tạm">
                    ${WB.icon('x', 15)}
                    <span>Xóa</span>
                  </button>
                </div>
              </div>

              <textarea
                id="wbTransSourceInput"
                class="wb-trans-textarea"
                rows="8"
                maxlength="20000"
                placeholder="Nhập hoặc dán văn bản cần dịch tại đây (hỗ trợ văn bản ngắn, văn bản dài nhiều đoạn, ký tự đặc biệt, đa ngôn ngữ)... Dữ liệu chỉ xử lý tạm thời trong phiên và không được lưu trữ."
              ></textarea>

              <!-- THANH CÔNG CỤ HỖ TRỢ XỬ LÝ VĂN BẢN TRONG PHIÊN -->
              <div class="wb-trans-utility-bar">
                <div class="wb-trans-utility-btns">
                  <button type="button" class="wb-trans-util-chip" data-util-action="clean_whitespace" title="Làm sạch khoảng trắng thừa, giữ xuống dòng chuẩn">Làm sạch khoảng trắng</button>
                  <button type="button" class="wb-trans-util-chip" data-util-action="uppercase" title="Chuyển toàn bộ sang CHỮ HOA">CHỮ HOA</button>
                  <button type="button" class="wb-trans-util-chip" data-util-action="lowercase" title="Chuyển toàn bộ sang chữ thường">chữ thường</button>
                  <button type="button" class="wb-trans-util-chip" data-util-action="titlecase" title="Viết Hoa Chữ Cái Đầu Từ">Viết Hoa Đầu Từ</button>
                  <button type="button" class="wb-trans-util-chip" data-util-action="sentencecase" title="Viết hoa chữ cái đầu câu">Chuẩn hóa đầu câu</button>
                </div>
                <div class="wb-trans-stats-Counter" id="wbTransSourceStats">
                  0 / 20.000 ký tự • 0 từ • 0 dòng
                </div>
              </div>

              <!-- MẪU THỬ NHANH ĐA NGÔN NGỮ (KHÔNG LƯU LỊCH SỬ) -->
              <div class="wb-trans-quick-samples">
                <span>Thử nhanh đa ngôn ngữ:</span>
                <button type="button" class="wb-trans-sample-btn" data-sample="Hello, welcome to the multilingual translation platform. We do not store translated text or user documents." data-src="auto" data-tgt="vi">Anh → Việt</button>
                <button type="button" class="wb-trans-sample-btn" data-sample="Chào mừng bạn đến với nền tảng dịch thuật đa ngôn ngữ. Báo cáo tài chính và vận đơn đường biển đã được kiểm toán độc lập." data-src="vi" data-tgt="en" data-dom="finance">Việt → Anh (Chuyên ngành)</button>
                <button type="button" class="wb-trans-sample-btn" data-sample="欢迎使用多语言翻译平台。我们不存储翻译文本或用户文档。" data-src="zh" data-tgt="vi">Trung → Việt</button>
                <button type="button" class="wb-trans-sample-btn" data-sample="多言語翻訳プラットフォームへようこそ。非常感谢你。" data-src="auto" data-tgt="vi">Nhật/Đa ngôn ngữ → Việt</button>
                <button type="button" class="wb-trans-sample-btn" data-sample="다국어 번역 플랫폼에 오신 것을 환영합니다." data-src="ko" data-tgt="vi">Hàn → Việt</button>
                <button type="button" class="wb-trans-sample-btn" data-sample="Добро пожаловать на многоязычную платформу перевода." data-src="ru" data-tgt="vi">Nga → Việt</button>
                <button type="button" class="wb-trans-sample-btn" data-sample="مرحباً بكم في منصة الترجمة متعددة اللغات" data-src="ar" data-tgt="vi">Ả Rập (RTL) → Việt</button>
              </div>
            </div>

            <!-- CỘT KẾT QUẢ DỊCH -->
            <div class="wb-trans-editor-box wb-trans-output-box">
              <div class="wb-trans-box-header">
                <div>
                  <strong>Kết quả bản dịch</strong>
                  <span id="wbTransTargetLangBadge" class="wb-trans-detected-chip" style="background:#E6F4F4;color:var(--wb-deep-teal);">Tiếng Việt [VI]</span>
                </div>
                <div class="wb-trans-box-actions">
                  <button type="button" class="wb-btn wb-btn-outline wb-btn-xs" id="wbTransSpeakTargetBtn" title="Phát âm bản dịch">
                    ${WB.icon('volume', 15)}
                    <span>Phát âm</span>
                  </button>
                  <button type="button" class="wb-btn wb-btn-outline wb-btn-xs" id="wbTransCopyOutputBtn" title="Sao chép kết quả dịch vào bộ nhớ tạm">
                    ${WB.icon('check', 15)}
                    <span>Sao chép</span>
                  </button>
                  <button type="button" class="wb-btn wb-btn-accent wb-btn-xs" id="wbTransExecuteBtn">
                    ${WB.icon('sparkle', 15)}
                    <span>Dịch ngay</span>
                  </button>
                </div>
              </div>

              <div
                id="wbTransResultDisplay"
                class="wb-trans-result-area"
                dir="ltr"
                aria-live="polite"
              >Kết quả dịch thuật sẽ hiển thị trực tiếp tại đây. Hệ thống xử lý trên bộ nhớ tạm thời gian thực và tự động giải phóng sau khi hoàn tất.</div>

              <div class="wb-trans-utility-bar">
                <div id="wbTransEngineStatusNote" class="wb-trans-engine-note">
                  Trạng thái: Sẵn sàng • Không lưu lịch sử dịch thuật • Cache-Control: no-store
                </div>
                <div class="wb-trans-stats-Counter" id="wbTransTargetStats">
                  0 ký tự • 0 từ
                </div>
              </div>

              <!-- VÙNG HIỂN THỊ THUẬT NGỮ CHUYÊN NGÀNH ĐÃ ÁP DỤNG TRONG PHIÊN -->
              <div id="wbTransAppliedGlossaryBox" class="wb-trans-glossary-box" style="display:none;"></div>
            </div>
          </div>
        </div>

        <!-- ================================================================== -->
        <!-- PANEL 2: DỊCH TÀI LIỆU TRỰC TUYẾN (EPHEMERAL IN-MEMORY)            -->
        <!-- ================================================================== -->
        <div class="wb-trans-panel" id="wbTransPanel_document" style="display:none;">
          <div class="wb-trans-doc-layout">
            <div class="wb-trans-dropzone" id="wbTransDocDropzone">
              <div class="wb-trans-dropzone-icon">${WB.icon('folder', 36)}</div>
              <h3>Tải lên hoặc Kéo thả Tài liệu cần dịch trực tuyến</h3>
              <p>
                Hỗ trợ định dạng thực tế: <strong>PDF, DOCX, DOC, TXT, PPTX, XLSX, CSV</strong> (Tối đa <strong>10MB</strong>/tệp).<br/>
                Tài liệu chỉ được đọc, trích xuất và dịch trên bộ nhớ RAM tạm thời, trả trực tiếp về trình duyệt và <strong>xóa ngay lập tức</strong>. Tuyệt đối không lưu tệp lên Cloudflare R2 hay ghi metadata vào D1.
              </p>
              <input type="file" id="wbTransDocFileInput" accept=".pdf,.docx,.doc,.txt,.pptx,.xlsx,.csv" style="display:none;" />
              <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:14px;">
                <button type="button" class="wb-btn wb-btn-primary" id="wbTransSelectDocBtn">
                  ${WB.icon('plus', 17)}
                  <span>Chọn tài liệu từ thiết bị</span>
                </button>
                <button type="button" class="wb-btn wb-btn-accent" id="wbTransStartDocBtn" disabled>
                  ${WB.icon('sparkle', 17)}
                  <span>Thực hiện dịch tài liệu</span>
                </button>
                <button type="button" class="wb-btn wb-btn-outline" id="wbTransResetDocBtn">
                  ${WB.icon('x', 17)}
                  <span>Xóa phiên tài liệu</span>
                </button>
              </div>
              <div id="wbTransSelectedDocInfo" class="wb-trans-file-badge" style="display:none;"></div>
            </div>

            <div class="wb-trans-doc-status-card">
              <h4>Định dạng hỗ trợ &amp; Quy tắc bảo toàn cấu trúc</h4>
              <ul class="wb-trans-format-list">
                ${docFormats.map(f => `
                  <li>
                    <strong>${escapeHtml(f.ext.toUpperCase())}</strong>: ${escapeHtml(f.label)} (Giới hạn ${f.max_mb}MB • Kiểm tra chữ ký Magic Bytes)
                  </li>
                `).join('')}
              </ul>
              <div id="wbTransDocProgressBox" class="wb-trans-progress-box" style="display:none;"></div>
              <div id="wbTransDocResultBox" style="display:none;margin-top:14px;"></div>
            </div>
          </div>
        </div>

        <!-- ================================================================== -->
        <!-- PANEL 3: DỊCH HÌNH ẢNH & NHẬN DIỆN OCR (EPHEMERAL IN-MEMORY)       -->
        <!-- ================================================================== -->
        <div class="wb-trans-panel" id="wbTransPanel_ocr" style="display:none;">
          <div class="wb-trans-doc-layout">
            <div class="wb-trans-dropzone" id="wbTransOcrDropzone">
              <div class="wb-trans-dropzone-icon">${WB.icon('sparkle', 36)}</div>
              <h3>Chọn hoặc Kéo thả Hình ảnh để Nhận diện Văn bản (OCR) &amp; Dịch thuật</h3>
              <p>
                Hỗ trợ định dạng ảnh thực tế: <strong>PNG, JPG/JPEG, WEBP</strong> (Tối đa <strong>8MB</strong>/ảnh).<br/>
                Toàn bộ ảnh và văn bản OCR chỉ xử lý tạm thời trong phiên hiện tại, không lưu ảnh lên R2, không lưu kết quả OCR vào D1.
              </p>
              <input type="file" id="wbTransOcrFileInput" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" style="display:none;" />
              <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:14px;">
                <button type="button" class="wb-btn wb-btn-primary" id="wbTransSelectOcrBtn">
                  ${WB.icon('plus', 17)}
                  <span>Chọn hình ảnh (PNG, JPG, WEBP)</span>
                </button>
                <button type="button" class="wb-btn wb-btn-accent" id="wbTransStartOcrBtn" disabled>
                  ${WB.icon('sparkle', 17)}
                  <span>Nhận diện OCR &amp; Dịch ngay</span>
                </button>
                <button type="button" class="wb-btn wb-btn-outline" id="wbTransResetOcrBtn">
                  ${WB.icon('x', 17)}
                  <span>Xóa ảnh &amp; Giải phóng bộ nhớ</span>
                </button>
              </div>
              <div id="wbTransSelectedOcrInfo" class="wb-trans-file-badge" style="display:none;"></div>
            </div>

            <div class="wb-trans-doc-status-card">
              <h4>Kết quả Trích xuất OCR &amp; Bản dịch Hình ảnh</h4>
              <div id="wbTransOcrResultBox">
                <p style="color:#526B6C;font-size:14px;margin:0;">
                  Tải lên một hình ảnh chứa văn bản để hệ thống kiểm tra định dạng nhị phân (Magic Bytes), trích xuất nội dung chữ, tự động nhận diện ngôn ngữ và dịch sang ngôn ngữ đích.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- ================================================================== -->
        <!-- PANEL 4: KIỂM CHỨNG KỸ THUẬT ZERO USER DATA STORAGE & D1/R2        -->
        <!-- ================================================================== -->
        <div class="wb-trans-panel" id="wbTransPanel_privacy" style="display:none;">
          <div class="wb-trans-privacy-grid">
            <div class="wb-trans-privacy-card">
              <h3>1. Chính sách ZERO USER DATA STORAGE</h3>
              <p>
                Hệ thống <strong>Dịch thuật Word Bridge (https://dichthuat.wordbridge.io.vn)</strong> được thiết kế theo kiến trúc không lưu trữ dữ liệu người dùng:
              </p>
              <ul>
                <li><strong>Không lưu nội dung dịch thuật:</strong> Văn bản nguồn, văn bản sau khi dịch, nội dung dịch từng đoạn và nội dung dịch chuyên ngành đều được xóa khỏi RAM ngay sau khi trả kết quả.</li>
                <li><strong>Không lưu tài liệu &amp; ảnh OCR:</strong> Tệp PDF, DOCX, DOC, TXT, PPTX, XLSX, CSV và ảnh PNG/JPG/WEBP không bao giờ được ghi vào Cloudflare R2 hay D1.</li>
                <li><strong>Không lưu lịch sử &amp; không theo dõi:</strong> Không có bảng lịch sử dịch, không lưu từ điển cá nhân, không lưu thông tin theo tài khoản, IP, thiết bị hay phiên.</li>
                <li><strong>Không lưu trên trình duyệt &amp; Cache:</strong> Không ghi vào LocalStorage, SessionStorage, IndexedDB, Cookies hay Cache API; mọi phản hồi API đều gắn <code>Cache-Control: no-store</code>.</li>
              </ul>
            </div>

            <div class="wb-trans-privacy-card">
              <h3>2. Hạ tầng Cloudflare D1 &amp; R2 Hiện Có</h3>
              <p>
                Bảo toàn nguyên vẹn hạ tầng Cloudflare của hệ sinh thái Word Bridge:
              </p>
              <ul>
                <li><strong>Cloudflare D1 Database:</strong> Tên <code>word</code> — ID <code>ce84cc48-6d49-409b-b45a-13ba3bc4a771</code> (Binding <code>DB</code>). Trong phạm vi dịch thuật, D1 chỉ lưu duy nhất 1 chỉ số nguyên tử: <code>site_metrics.total_accesses</code>.</li>
                <li><strong>Cloudflare R2 Bucket:</strong> Tên <code>word</code> — <code>Default Storage Class</code> (Binding <code>R2</code>). Bucket được giữ nguyên để bảo toàn hệ sinh thái, nhưng khóa cứng mọi thao tác ghi tệp dịch thuật của người dùng.</li>
              </ul>
              <button type="button" class="wb-btn wb-btn-primary" id="wbTransRunPrivacyAuditBtn" style="margin-top:10px;">
                ${WB.icon('shield', 16)}
                <span>Chạy Kiểm chứng Kỹ thuật Trực tiếp (/api/trans/privacy-audit)</span>
              </button>
              <div id="wbTransPrivacyAuditOutput" style="margin-top:12px;"></div>
            </div>
          </div>
        </div>
      </section>
    `;

    // ========================================================================
    // GẮN SỰ KIỆN TƯƠNG TÁC THỰC TẾ CHO TOÀN BỘ KHÔNG GIAN DỊCH THUẬT
    // ========================================================================
    const srcSelect = container.querySelector('#wbTransSourceLangSelect');
    const tgtSelect = container.querySelector('#wbTransTargetLangSelect');
    const srcSearch = container.querySelector('#wbTransSourceLangSearch');
    const tgtSearch = container.querySelector('#wbTransTargetLangSearch');
    const domSelect = container.querySelector('#wbTransDomainSelect');
    const swapBtn = container.querySelector('#wbTransSwapLangBtn');
    const warnBar = container.querySelector('#wbTransLangWarningBar');
    const srcInput = container.querySelector('#wbTransSourceInput');
    const resDisplay = container.querySelector('#wbTransResultDisplay');
    const srcStatsEl = container.querySelector('#wbTransSourceStats');
    const tgtStatsEl = container.querySelector('#wbTransTargetStats');
    const detectedBadge = container.querySelector('#wbTransDetectedBadge');
    const targetBadge = container.querySelector('#wbTransTargetLangBadge');
    const engineNote = container.querySelector('#wbTransEngineStatusNote');
    const glossaryBox = container.querySelector('#wbTransAppliedGlossaryBox');

    function populateLanguageOptions(selectEl, list, currentValue) {
      selectEl.innerHTML = list.map(l => `
        <option value="${escapeHtml(l.code)}" ${l.code === currentValue ? 'selected' : ''}>
          ${escapeHtml(l.name_vi)} — ${escapeHtml(l.native_name)} [${escapeHtml(l.code.toUpperCase())}]${l.dir === 'rtl' ? ' (RTL)' : ''}
        </option>
      `).join('');
      if (list.some(l => l.code === currentValue)) {
        selectEl.value = currentValue;
      } else if (list.length > 0) {
        selectEl.value = list[0].code;
      }
    }

    function updateLanguagePairBadgesAndWarnings() {
      const sCode = srcSelect.value;
      const tCode = tgtSelect.value;
      ephemeralState.sourceLang = sCode;
      ephemeralState.targetLang = tCode;
      ephemeralState.domain = domSelect.value;

      const sLang = languages.find(l => l.code === sCode);
      const tLang = targetLanguages.find(l => l.code === tCode);

      if (sLang && srcInput) {
        srcInput.dir = sLang.dir === 'rtl' ? 'rtl' : 'ltr';
      }
      if (tLang) {
        ephemeralState.lastTargetBcp47 = tLang.bcp47 || tLang.code;
        if (targetBadge) {
          targetBadge.textContent = `${tLang.name_vi} [${tLang.code.toUpperCase()}]${tLang.dir === 'rtl' ? ' • RTL' : ''}`;
        }
        if (resDisplay) {
          resDisplay.dir = tLang.dir === 'rtl' ? 'rtl' : 'ltr';
        }
      }

      if (sCode !== 'auto' && sCode === tCode) {
        warnBar.style.display = 'block';
        warnBar.textContent = 'Cảnh báo: Ngôn ngữ nguồn và ngôn ngữ đích đang trùng nhau. Hệ thống sẽ giữ nguyên văn bản hoặc bạn có thể chọn ngôn ngữ đích khác.';
      } else {
        warnBar.style.display = 'none';
        warnBar.textContent = '';
      }
    }

    // Tìm kiếm nhanh ngôn ngữ nguồn & đích
    if (srcSearch) {
      srcSearch.oninput = () => {
        const q = srcSearch.value.trim().toLowerCase();
        const filtered = languages.filter(l =>
          !q ||
          l.code.toLowerCase().includes(q) ||
          l.name_vi.toLowerCase().includes(q) ||
          l.native_name.toLowerCase().includes(q)
        );
        populateLanguageOptions(srcSelect, filtered.length ? filtered : languages, ephemeralState.sourceLang);
        updateLanguagePairBadgesAndWarnings();
      };
    }

    if (tgtSearch) {
      tgtSearch.oninput = () => {
        const q = tgtSearch.value.trim().toLowerCase();
        const filtered = targetLanguages.filter(l =>
          !q ||
          l.code.toLowerCase().includes(q) ||
          l.name_vi.toLowerCase().includes(q) ||
          l.native_name.toLowerCase().includes(q)
        );
        populateLanguageOptions(tgtSelect, filtered.length ? filtered : targetLanguages, ephemeralState.targetLang);
        updateLanguagePairBadgesAndWarnings();
      };
    }

    srcSelect.onchange = updateLanguagePairBadgesAndWarnings;
    tgtSelect.onchange = updateLanguagePairBadgesAndWarnings;
    domSelect.onchange = updateLanguagePairBadgesAndWarnings;

    // Nút đảo chiều ngôn ngữ
    if (swapBtn) {
      swapBtn.onclick = () => {
        const curSrc = srcSelect.value;
        const curTgt = tgtSelect.value;
        const nextSrc = curTgt;
        const nextTgt = curSrc === 'auto'
          ? (ephemeralState.lastDetectedLang && ephemeralState.lastDetectedLang !== 'und' ? ephemeralState.lastDetectedLang : 'en')
          : curSrc;

        srcSelect.value = nextSrc;
        if (targetLanguages.some(l => l.code === nextTgt)) {
          tgtSelect.value = nextTgt;
        }
        // Đảo nội dung văn bản nếu đã có kết quả dịch hợp lệ
        const currentOutput = resDisplay.getAttribute('data-translated-raw') || '';
        if (currentOutput && srcInput) {
          srcInput.value = currentOutput;
          const st = countWordsAndCharsClient(srcInput.value);
          srcStatsEl.textContent = `${st.chars.toLocaleString('vi-VN')} / 20.000 ký tự • ${st.words.toLocaleString('vi-VN')} từ • ${st.lines} dòng`;
        }
        updateLanguagePairBadgesAndWarnings();
        WB.toast(`Đã đảo chiều ngôn ngữ: ${nextSrc.toUpperCase()} → ${tgtSelect.value.toUpperCase()}`);
      };
    }

    // Chuyển đổi giữa 4 Tab chức năng
    container.querySelectorAll('[data-trans-tab]').forEach(tabBtn => {
      tabBtn.onclick = () => {
        const tabId = tabBtn.getAttribute('data-trans-tab');
        ephemeralState.activeTab = tabId;
        container.querySelectorAll('[data-trans-tab]').forEach(b => {
          const active = b.getAttribute('data-trans-tab') === tabId;
          b.classList.toggle('active', active);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        ['text', 'document', 'ocr', 'privacy'].forEach(p => {
          const panel = container.querySelector(`#wbTransPanel_${p}`);
          if (panel) panel.style.display = p === tabId ? 'block' : 'none';
        });
      };
    });

    // Đếm từ/ký tự thời gian thực khi người dùng nhập
    if (srcInput) {
      srcInput.oninput = () => {
        const st = countWordsAndCharsClient(srcInput.value);
        srcStatsEl.textContent = `${st.chars.toLocaleString('vi-VN')} / 20.000 ký tự • ${st.words.toLocaleString('vi-VN')} từ • ${st.lines} dòng`;
      };
    }

    // Thực thi dịch văn bản qua Backend API (/api/trans/translate)
    async function executeTextTranslation() {
      const text = srcInput ? srcInput.value : '';
      if (!text.trim()) {
        WB.toast('Vui lòng nhập nội dung văn bản cần dịch.', 'error');
        return;
      }
      engineNote.textContent = 'Đang xử lý dịch thuật trên bộ nhớ tạm...';
      try {
        const res = await WB.api('/api/trans/translate', {
          method: 'POST',
          body: {
            text,
            source_lang: srcSelect.value,
            target_lang: tgtSelect.value,
            domain: domSelect.value
          }
        });

        ephemeralState.lastDetectedLang = res.source_language?.resolved || 'en';
        ephemeralState.lastTargetBcp47 = res.target_language?.bcp47 || res.target_language?.code || 'vi-VN';

        // Cập nhật hướng văn bản RTL/LTR
        srcInput.dir = res.source_language?.dir === 'rtl' ? 'rtl' : 'ltr';
        resDisplay.dir = res.target_language?.dir === 'rtl' ? 'rtl' : 'ltr';
        resDisplay.textContent = res.translated_text || '';
        resDisplay.setAttribute('data-translated-raw', res.translated_text || '');

        const multiTag = res.source_language?.is_multilingual ? ' • Đa ngôn ngữ' : '';
        detectedBadge.textContent = res.source_language?.auto_detected
          ? `Đã nhận diện: ${res.source_language.name_vi} [${res.source_language.resolved.toUpperCase()}] (${Math.round((res.source_language.confidence || 0.9) * 100)}%${multiTag})`
          : `Nguồn: ${res.source_language?.name_vi} [${res.source_language?.resolved.toUpperCase()}]`;

        targetBadge.textContent = `${res.target_language?.name_vi} [${res.target_language?.code.toUpperCase()}]${res.target_language?.dir === 'rtl' ? ' • RTL' : ''}`;

        const sSt = res.source_statistics || countWordsAndCharsClient(text);
        const tSt = res.target_statistics || countWordsAndCharsClient(res.translated_text);
        srcStatsEl.textContent = `${sSt.characters.toLocaleString('vi-VN')} / 20.000 ký tự • ${sSt.words.toLocaleString('vi-VN')} từ • ${sSt.lines} dòng`;
        tgtStatsEl.textContent = `${tSt.characters.toLocaleString('vi-VN')} ký tự • ${tSt.words.toLocaleString('vi-VN')} từ • ${tSt.lines} dòng`;

        engineNote.textContent = `Hoàn tất (${res.engine_info?.provider || 'Edge Engine'}) • Zero User Data Storage • Đã giải phóng bộ nhớ tạm`;

        // Hiển thị thuật ngữ chuyên ngành đã áp dụng trong phiên
        const appliedTerms = res.domain?.applied_terms || [];
        if (appliedTerms.length > 0) {
          glossaryBox.style.display = 'block';
          glossaryBox.innerHTML = `
            <div style="font-weight:700;font-size:12.5px;color:var(--wb-deep-teal);margin-bottom:6px;">
              Thuật ngữ chuyên ngành ${escapeHtml(res.domain.name_vi)} đã chuẩn hóa trong bản dịch (${appliedTerms.length}):
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${appliedTerms.map(t => `
                <span class="wb-trans-term-pill">
                  <strong>${escapeHtml(t.source_term)}</strong> → ${escapeHtml(t.target_term)}
                </span>
              `).join('')}
            </div>
          `;
        } else {
          glossaryBox.style.display = 'none';
          glossaryBox.innerHTML = '';
        }
      } catch (err) {
        engineNote.textContent = `Lỗi xử lý: ${err.message}`;
        WB.toast(err.message || 'Không thể thực hiện dịch văn bản.', 'error');
      }
    }

    const execBtn = container.querySelector('#wbTransExecuteBtn');
    if (execBtn) execBtn.onclick = executeTextTranslation;

    // Nút xóa văn bản & giải phóng hoàn toàn dữ liệu trên giao diện
    const clearBtn = container.querySelector('#wbTransClearBtn');
    if (clearBtn) {
      clearBtn.onclick = () => {
        if (srcInput) {
          srcInput.value = '';
          srcInput.dir = 'ltr';
        }
        resDisplay.textContent = 'Kết quả dịch thuật sẽ hiển thị trực tiếp tại đây. Hệ thống xử lý trên bộ nhớ tạm thời gian thực và tự động giải phóng sau khi hoàn tất.';
        resDisplay.removeAttribute('data-translated-raw');
        resDisplay.dir = 'ltr';
        srcStatsEl.textContent = '0 / 20.000 ký tự • 0 từ • 0 dòng';
        tgtStatsEl.textContent = '0 ký tự • 0 từ';
        detectedBadge.textContent = 'Tự động nhận diện ngôn ngữ';
        glossaryBox.style.display = 'none';
        glossaryBox.innerHTML = '';
        engineNote.textContent = 'Đã xóa nội dung và giải phóng hoàn toàn bộ nhớ phiên hiện tại.';
        WB.toast('Đã xóa sạch nội dung văn bản trong phiên.', 'info');
      };
    }

    // Nút sao chép bản dịch
    const copyBtn = container.querySelector('#wbTransCopyOutputBtn');
    if (copyBtn) {
      copyBtn.onclick = async () => {
        const rawOut = resDisplay.getAttribute('data-translated-raw') || '';
        if (!rawOut.trim()) {
          WB.toast('Chưa có kết quả dịch để sao chép.', 'error');
          return;
        }
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(rawOut);
          }
          WB.toast('Đã sao chép bản dịch vào bộ nhớ tạm (Clipboard).', 'success');
        } catch (_) {
          WB.toast('Đã chọn nội dung bản dịch để sao chép.', 'info');
        }
      };
    }

    // Nút phát âm văn bản nguồn & bản dịch
    const speakSrcBtn = container.querySelector('#wbTransSpeakSourceBtn');
    if (speakSrcBtn) {
      speakSrcBtn.onclick = () => {
        const sCode = srcSelect.value === 'auto' ? (ephemeralState.lastDetectedLang || 'en') : srcSelect.value;
        const sLang = languages.find(l => l.code === sCode);
        speakTextInBrowser(srcInput.value, sLang ? sLang.bcp47 : sCode);
      };
    }
    const speakTgtBtn = container.querySelector('#wbTransSpeakTargetBtn');
    if (speakTgtBtn) {
      speakTgtBtn.onclick = () => {
        const rawOut = resDisplay.getAttribute('data-translated-raw') || '';
        speakTextInBrowser(rawOut, ephemeralState.lastTargetBcp47);
      };
    }

    // Các nút công cụ xử lý văn bản (Làm sạch khoảng trắng, Chữ hoa/thường...)
    container.querySelectorAll('[data-util-action]').forEach(btn => {
      btn.onclick = async () => {
        const action = btn.getAttribute('data-util-action');
        if (!srcInput || !srcInput.value.trim()) {
          WB.toast('Vui lòng nhập văn bản trước khi sử dụng công cụ xử lý.', 'error');
          return;
        }
        try {
          const out = await WB.api('/api/trans/text-tools', {
            method: 'POST',
            body: { text: srcInput.value, action }
          });
          srcInput.value = out.result_text || '';
          const st = out.statistics || countWordsAndCharsClient(srcInput.value);
          srcStatsEl.textContent = `${st.characters.toLocaleString('vi-VN')} / 20.000 ký tự • ${st.words.toLocaleString('vi-VN')} từ • ${st.lines} dòng`;
          if (out.input_issues && out.input_issues.length > 0) {
            WB.toast(`Đã xử lý (${out.input_issues.join(' ')})`, 'info');
          } else {
            WB.toast('Đã áp dụng công cụ chuẩn hóa văn bản trong phiên.', 'success');
          }
        } catch (err) {
          WB.toast(err.message, 'error');
        }
      };
    });

    // Các nút mẫu thử nhanh đa ngôn ngữ
    container.querySelectorAll('.wb-trans-sample-btn').forEach(btn => {
      btn.onclick = () => {
        const sample = btn.getAttribute('data-sample') || '';
        const s = btn.getAttribute('data-src') || 'auto';
        const t = btn.getAttribute('data-tgt') || 'vi';
        const d = btn.getAttribute('data-dom') || 'general_other';
        srcSelect.value = s;
        tgtSelect.value = t;
        domSelect.value = d;
        srcInput.value = sample;
        updateLanguagePairBadgesAndWarnings();
        executeTextTranslation();
      };
    });

    // ========================================================================
    // XỬ LÝ TAB 2: DỊCH TÀI LIỆU TRỰC TUYẾN TRONG BỘ NHỚ TẠM
    // ========================================================================
    let selectedDocFile = null;
    const docInput = container.querySelector('#wbTransDocFileInput');
    const selectDocBtn = container.querySelector('#wbTransSelectDocBtn');
    const startDocBtn = container.querySelector('#wbTransStartDocBtn');
    const resetDocBtn = container.querySelector('#wbTransResetDocBtn');
    const docInfoEl = container.querySelector('#wbTransSelectedDocInfo');
    const docProgressEl = container.querySelector('#wbTransDocProgressBox');
    const docResultEl = container.querySelector('#wbTransDocResultBox');
    const docDropzone = container.querySelector('#wbTransDocDropzone');

    function handleSelectDocumentFile(file) {
      if (!file) return;
      selectedDocFile = file;
      docInfoEl.style.display = 'inline-block';
      docInfoEl.textContent = `Đã chọn: ${file.name} (${(file.size / 1024).toFixed(1)} KB) • Chỉ xử lý tạm trong RAM`;
      startDocBtn.disabled = false;
      docResultEl.style.display = 'none';
      docResultEl.innerHTML = '';
    }

    if (selectDocBtn && docInput) {
      selectDocBtn.onclick = () => docInput.click();
      docInput.onchange = () => {
        if (docInput.files && docInput.files[0]) {
          handleSelectDocumentFile(docInput.files[0]);
        }
      };
    }

    if (docDropzone) {
      docDropzone.ondragover = e => { e.preventDefault(); docDropzone.classList.add('drag-over'); };
      docDropzone.ondragleave = () => docDropzone.classList.remove('drag-over');
      docDropzone.ondrop = e => {
        e.preventDefault();
        docDropzone.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleSelectDocumentFile(e.dataTransfer.files[0]);
        }
      };
    }

    if (startDocBtn) {
      startDocBtn.onclick = async () => {
        if (!selectedDocFile) return;
        docProgressEl.style.display = 'block';
        docProgressEl.textContent = 'Đang kiểm tra định dạng nhị phân (Magic Bytes), trích xuất nội dung và dịch trong bộ nhớ tạm...';
        startDocBtn.disabled = true;
        try {
          const b64 = await fileToBase64(selectedDocFile);
          const out = await WB.api('/api/trans/document', {
            method: 'POST',
            body: {
              file_name: selectedDocFile.name,
              mime_type: selectedDocFile.type,
              file_base64: b64,
              source_lang: srcSelect.value,
              target_lang: tgtSelect.value,
              domain: domSelect.value
            }
          });
          ephemeralState.lastDocOutput = out;
          docProgressEl.textContent = `Hoàn tất dịch ${out.segments_translated} phân đoạn (${out.original_format}) • Đã xóa vùng đệm trên máy chủ (Zero R2 / Zero D1).`;
          docResultEl.style.display = 'block';
          docResultEl.innerHTML = `
            <div class="wb-trans-doc-complete-box">
              <div style="font-weight:700;color:var(--wb-deep-teal);margin-bottom:6px;">
                Tài liệu đầu ra sẵn sàng tải xuống: ${escapeHtml(out.output_file_name)} (${(out.output_size_bytes / 1024).toFixed(1)} KB)
              </div>
              <div style="font-size:13px;color:#2C4243;margin-bottom:8px;">
                <strong>Thành phần bảo toàn:</strong> ${escapeHtml((out.preserved_elements || []).join(', '))}<br/>
                <strong>Ghi chú định dạng:</strong> ${escapeHtml(out.formatting_notice || '')}
              </div>
              <div style="background:#FFFFFF;border:1px solid #D8E6E6;border-radius:8px;padding:10px;font-size:13px;max-height:140px;overflow:auto;margin-bottom:10px;">
                <strong>Xem trước nội dung sau khi dịch:</strong><br/>
                <div style="white-space:pre-wrap;margin-top:4px;">${escapeHtml(out.translated_preview || '')}</div>
              </div>
              <button type="button" class="wb-btn wb-btn-accent" id="wbTransDownloadTranslatedDocBtn">
                ${WB.icon('arrowRight', 16)}
                <span>Tải tài liệu đã dịch xuống máy (Và giải phóng bộ nhớ)</span>
              </button>
            </div>
          `;
          const dlBtn = container.querySelector('#wbTransDownloadTranslatedDocBtn');
          if (dlBtn) {
            dlBtn.onclick = () => {
              if (!ephemeralState.lastDocOutput) return;
              triggerEphemeralDownload(
                ephemeralState.lastDocOutput.output_base64,
                ephemeralState.lastDocOutput.output_file_name,
                ephemeralState.lastDocOutput.output_mime_type
              );
              WB.toast('Đã tải tài liệu xuống máy và giải phóng bộ nhớ tạm.', 'success');
            };
          }
        } catch (err) {
          docProgressEl.textContent = `Lỗi xử lý tài liệu: ${err.message}`;
          WB.toast(err.message, 'error');
        } finally {
          startDocBtn.disabled = false;
        }
      };
    }

    if (resetDocBtn) {
      resetDocBtn.onclick = () => {
        selectedDocFile = null;
        ephemeralState.lastDocOutput = null;
        if (docInput) docInput.value = '';
        docInfoEl.style.display = 'none';
        docInfoEl.textContent = '';
        docProgressEl.style.display = 'none';
        docProgressEl.textContent = '';
        docResultEl.style.display = 'none';
        docResultEl.innerHTML = '';
        startDocBtn.disabled = true;
        WB.toast('Đã xóa phiên tài liệu và giải phóng bộ nhớ tạm.', 'info');
      };
    }

    // ========================================================================
    // XỬ LÝ TAB 3: DỊCH HÌNH ẢNH & NHẬN DIỆN OCR TRONG BỘ NHỚ TẠM
    // ========================================================================
    let selectedOcrFile = null;
    const ocrInput = container.querySelector('#wbTransOcrFileInput');
    const selectOcrBtn = container.querySelector('#wbTransSelectOcrBtn');
    const startOcrBtn = container.querySelector('#wbTransStartOcrBtn');
    const resetOcrBtn = container.querySelector('#wbTransResetOcrBtn');
    const ocrInfoEl = container.querySelector('#wbTransSelectedOcrInfo');
    const ocrResultEl = container.querySelector('#wbTransOcrResultBox');
    const ocrDropzone = container.querySelector('#wbTransOcrDropzone');

    function handleSelectOcrFile(file) {
      if (!file) return;
      selectedOcrFile = file;
      ocrInfoEl.style.display = 'inline-block';
      ocrInfoEl.textContent = `Đã chọn ảnh: ${file.name} (${(file.size / 1024).toFixed(1)} KB) • Chỉ xử lý tạm trong RAM`;
      startOcrBtn.disabled = false;
    }

    if (selectOcrBtn && ocrInput) {
      selectOcrBtn.onclick = () => ocrInput.click();
      ocrInput.onchange = () => {
        if (ocrInput.files && ocrInput.files[0]) {
          handleSelectOcrFile(ocrInput.files[0]);
        }
      };
    }

    if (ocrDropzone) {
      ocrDropzone.ondragover = e => { e.preventDefault(); ocrDropzone.classList.add('drag-over'); };
      ocrDropzone.ondragleave = () => ocrDropzone.classList.remove('drag-over');
      ocrDropzone.ondrop = e => {
        e.preventDefault();
        ocrDropzone.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleSelectOcrFile(e.dataTransfer.files[0]);
        }
      };
    }

    if (startOcrBtn) {
      startOcrBtn.onclick = async () => {
        if (!selectedOcrFile) return;
        ocrResultEl.innerHTML = `<p style="color:var(--wb-deep-teal);font-weight:600;">Đang kiểm tra định dạng ảnh, nhận diện văn bản OCR và dịch thuật trên bộ nhớ tạm...</p>`;
        startOcrBtn.disabled = true;
        try {
          const b64 = await fileToBase64(selectedOcrFile);
          const out = await WB.api('/api/trans/ocr', {
            method: 'POST',
            body: {
              file_name: selectedOcrFile.name,
              mime_type: selectedOcrFile.type,
              image_base64: b64,
              source_lang: srcSelect.value,
              target_lang: tgtSelect.value,
              domain: domSelect.value
            }
          });

          if (!out.has_text) {
            ocrResultEl.innerHTML = `
              <div style="background:#FFF8EB;border-left:4px solid #D97706;padding:12px;border-radius:8px;font-size:13.5px;">
                <strong>Thông báo OCR (${escapeHtml(out.image_format)}):</strong> ${escapeHtml(out.quality_warning || 'Không phát hiện văn bản trong ảnh.')}
              </div>
            `;
          } else {
            ocrResultEl.innerHTML = `
              <div style="display:grid;gap:10px;">
                ${out.quality_warning ? `<div style="background:#FFF8EB;padding:8px 12px;border-radius:6px;font-size:12.5px;color:#92400E;">${escapeHtml(out.quality_warning)}</div>` : ''}
                <div style="background:#F4F9F9;border:1px solid #D8E6E6;border-radius:8px;padding:10px;">
                  <div style="font-weight:700;font-size:12.5px;color:#526B6C;margin-bottom:4px;">
                    Văn bản gốc trích xuất OCR (${escapeHtml(out.source_language?.name_vi || 'Tự động')}):
                  </div>
                  <div style="white-space:pre-wrap;font-size:14px;">${escapeHtml(out.extracted_text)}</div>
                </div>
                <div style="background:#EBF7F7;border:1px solid var(--wb-light-teal);border-radius:8px;padding:10px;">
                  <div style="font-weight:700;font-size:12.5px;color:var(--wb-deep-teal);margin-bottom:4px;">
                    Kết quả dịch OCR (${escapeHtml(out.target_language?.name_vi || tgtSelect.value.toUpperCase())}):
                  </div>
                  <div id="wbTransOcrTranslatedText" style="white-space:pre-wrap;font-size:14.5px;font-weight:600;color:#182C2D;">${escapeHtml(out.translated_text)}</div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <button type="button" class="wb-btn wb-btn-outline wb-btn-xs" id="wbTransCopyOcrBtn">
                    ${WB.icon('check', 14)}
                    <span>Sao chép kết quả dịch OCR</span>
                  </button>
                </div>
              </div>
            `;
            const copyOcrBtn = container.querySelector('#wbTransCopyOcrBtn');
            if (copyOcrBtn) {
              copyOcrBtn.onclick = async () => {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  await navigator.clipboard.writeText(out.translated_text || '');
                }
                WB.toast('Đã sao chép kết quả dịch OCR.', 'success');
              };
            }
          }
        } catch (err) {
          ocrResultEl.innerHTML = `<p style="color:var(--wb-vermilion);font-weight:600;">Lỗi OCR: ${escapeHtml(err.message)}</p>`;
          WB.toast(err.message, 'error');
        } finally {
          startOcrBtn.disabled = false;
        }
      };
    }

    if (resetOcrBtn) {
      resetOcrBtn.onclick = () => {
        selectedOcrFile = null;
        if (ocrInput) ocrInput.value = '';
        ocrInfoEl.style.display = 'none';
        ocrInfoEl.textContent = '';
        startOcrBtn.disabled = true;
        ocrResultEl.innerHTML = `<p style="color:#526B6C;font-size:14px;margin:0;">Đã xóa hình ảnh và giải phóng toàn bộ dữ liệu OCR tạm thời trong phiên.</p>`;
        WB.toast('Đã xóa ảnh và giải phóng bộ nhớ OCR.', 'info');
      };
    }

    // ========================================================================
    // XỬ LÝ TAB 4: KIỂM CHỨNG KỸ THUẬT ZERO USER DATA STORAGE
    // ========================================================================
    const auditBtn = container.querySelector('#wbTransRunPrivacyAuditBtn');
    const auditOut = container.querySelector('#wbTransPrivacyAuditOutput');
    if (auditBtn && auditOut) {
      auditBtn.onclick = async () => {
        try {
          const res = await WB.api('/api/trans/privacy-audit');
          const countEl = container.querySelector('#wbTransTotalAccessCount');
          if (countEl && res.checks && typeof res.checks.total_accesses === 'number') {
            countEl.textContent = Number(res.checks.total_accesses).toLocaleString('vi-VN');
          }
          auditOut.innerHTML = `
            <div style="background:#EBF8F2;border-left:4px solid #10B981;padding:12px;border-radius:8px;font-size:13px;">
              <strong>Trạng thái tuân thủ Zero User Data Storage: ${res.compliant ? 'ĐẠT 100% (PASS)' : 'CẦN KIỂM TRA'}</strong><br/>
              • D1 Database: <code>${escapeHtml(res.d1_database_name)}</code> (${escapeHtml(res.d1_database_id)})<br/>
              • Cột bảng <code>site_metrics</code>: <code>${escapeHtml((res.checks?.site_metrics_columns || []).join(', '))}</code><br/>
              • Tổng số lượt truy cập hiện tại (<code>total_accesses</code>): <strong>${Number(res.checks?.total_accesses || 0).toLocaleString('vi-VN')}</strong><br/>
              • Số bản ghi log nội dung dịch / AI: <strong>${res.checks?.ai_assistant_logs_count ?? 0}</strong><br/>
              • Số tệp dịch thuật lưu trên R2 bucket <code>${escapeHtml(res.r2_bucket_name)}</code>: <strong>${res.checks?.r2_translation_files_count ?? 0}</strong><br/>
              • Header bảo vệ Cache: <code>${escapeHtml(res.checks?.cache_control_enforced || '')}</code>
            </div>
          `;
        } catch (err) {
          WB.toast(err.message, 'error');
        }
      };
    }

    updateLanguagePairBadgesAndWarnings();
  }

  // Expose helper để có thể nhúng trực tiếp không gian Dịch thuật Word Bridge vào Trang chủ và tuyến /dich-thuat, /trans
  WB.renderTranslationWorkspace = renderTranslationWorkspace;

  WB.registerView('/dich-thuat', async function (root, _pathname, queryParams) {
    const mode = queryParams.get('tab') || 'text';
    root.innerHTML = `<div class="wb-container" style="padding-top:24px;padding-bottom:44px;" id="wbStandaloneTransMount"></div>`;
    const mount = root.querySelector('#wbStandaloneTransMount');
    await renderTranslationWorkspace(mount, { initialTab: mode });
  });

  WB.registerView('/trans', async function (root, _pathname, queryParams) {
    const mode = queryParams.get('tab') || 'text';
    root.innerHTML = `<div class="wb-container" style="padding-top:24px;padding-bottom:44px;" id="wbStandaloneTransMount"></div>`;
    const mount = root.querySelector('#wbStandaloneTransMount');
    await renderTranslationWorkspace(mount, { initialTab: mode });
  });
})(window.WB);
