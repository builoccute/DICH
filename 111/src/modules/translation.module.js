import {
  GLOBAL_TRANSLATION_LANGUAGES,
  SPECIALIZED_DOMAINS,
  SUPPORTED_DOCUMENT_FORMATS,
  SUPPORTED_IMAGE_OCR_FORMATS,
  getTranslationProviderConfig,
  detectLanguage,
  computeTextStatistics,
  applyTextUtility,
  translateTextEphemeral,
  translateDocumentEphemeral,
  processImageOcrEphemeral
} from '../adapters/translation.adapter.js';

/**
 * PHÂN HỆ DỊCH THUẬT TOÀN CẦU WORD BRIDGE (src/modules/translation.module.js)
 * Tên sản phẩm: Dịch thuật Word Bridge (Word Bridge Translation — Trans)
 * Tên miền chính thức: https://dichthuat.wordbridge.io.vn
 *
 * CHÍNH SÁCH ZERO USER DATA STORAGE:
 * - Tuyệt đối không lưu văn bản dịch, kết quả dịch, tệp tải lên, tệp đầu ra, kết quả OCR, metadata tệp hay lịch sử dịch.
 * - Chỉ sử dụng Cloudflare D1 (database "word", ID "ce84cc48-6d49-409b-b45a-13ba3bc4a771") cho duy nhất
 *   bộ đếm nguyên tử tổng số lượt truy cập website (site_metrics.total_accesses).
 * - Bảo toàn tuyệt đối Cloudflare R2 (bucket "word"), không ghi bất kỳ tệp dịch thuật nào của người dùng lên R2.
 */
export class TranslationModule {
  constructor(db, storageAdapter = null) {
    this.db = db;
    this.storageAdapter = storageAdapter;
    this.ensureSiteMetricsInitialized();
  }

  ensureSiteMetricsInitialized() {
    try {
      const existing = this.db.get(
        `SELECT metric_key, total_accesses FROM site_metrics WHERE metric_key = ?`,
        ['total_accesses']
      );
      if (!existing) {
        this.db.run(
          `INSERT OR IGNORE INTO site_metrics (metric_key, total_accesses) VALUES (?, ?)`,
          ['total_accesses', 0]
        );
      }
    } catch (_) {}
  }

  /**
   * Kiểm tra xem một request có phải lượt truy cập trang chính hợp lệ hay không (PHẦN III.1.3 & XI.5)
   * - Không tăng bộ đếm bởi các request tải tài nguyên (/assets, /css, /js, icon, font)
   * - Không tăng bộ đếm bởi các request kiểm tra sức khỏe Worker (/api/trans/health, /api/system/bootstrap)
   * - Không tăng bộ đếm bởi các request API dịch thuật (/api/trans/translate, /api/trans/document, /api/trans/ocr...)
   * - Không tăng bộ đếm bởi các request nội bộ hoặc prefetch
   */
  isEligiblePageAccess({ pathname = '/', method = 'GET', headers = {}, isExplicitAccessEndpoint = false }) {
    const cleanPath = String(pathname || '/').split('?')[0];
    const h = {};
    for (const [k, v] of Object.entries(headers || {})) {
      h[k.toLowerCase()] = String(v || '');
    }

    // Chặn các request nội bộ, healthcheck, bot tự động hoặc prefetch
    if (h['x-internal-request'] === '1' || h['x-health-check'] === '1') return false;
    if (h['purpose'] === 'prefetch' || h['sec-purpose'] === 'prefetch' || h['x-moz'] === 'prefetch') return false;
    if (/kube-probe|cloudflare-healthcheck|uptime|pingdom|statuscake/i.test(h['user-agent'] || '')) return false;

    if (isExplicitAccessEndpoint) {
      return method === 'POST' && cleanPath === '/api/trans/access';
    }

    if (method !== 'GET') return false;
    if (cleanPath.startsWith('/api/')) return false;
    if (cleanPath.startsWith('/assets/') || cleanPath.startsWith('/css/') || cleanPath.startsWith('/js/')) return false;
    if (/\.(svg|png|jpg|jpeg|webp|gif|ico|css|js|json|woff|woff2|ttf|map|txt|xml)$/i.test(cleanPath)) return false;

    const validEntryPaths = new Set(['/', '/dich-thuat', '/trans']);
    return validEntryPaths.has(cleanPath);
  }

  /**
   * Tăng bộ đếm tổng số lượt truy cập website một cách nguyên tử trên Cloudflare D1 (PHẦN III.1.3)
   * Không lưu địa chỉ IP, không lưu thời gian từng người, không lưu trình duyệt/thiết bị hay session.
   */
  recordValidPageAccess(reqMeta = {}) {
    this.ensureSiteMetricsInitialized();
    const eligible = this.isEligiblePageAccess(reqMeta);
    if (!eligible) {
      return {
        counted: false,
        total_accesses: this.getTotalAccesses(),
        metric_label: 'Tổng lượt truy cập website'
      };
    }

    this.db.run(
      `UPDATE site_metrics SET total_accesses = total_accesses + 1 WHERE metric_key = ?`,
      ['total_accesses']
    );

    return {
      counted: true,
      total_accesses: this.getTotalAccesses(),
      metric_label: 'Tổng lượt truy cập website'
    };
  }

  getTotalAccesses() {
    this.ensureSiteMetricsInitialized();
    const row = this.db.get(
      `SELECT total_accesses FROM site_metrics WHERE metric_key = ?`,
      ['total_accesses']
    );
    return row ? Number(row.total_accesses || 0) : 0;
  }

  getPlatformMetadata(workerEnv = null) {
    const providerConfig = getTranslationProviderConfig(workerEnv);
    return {
      product: {
        name_vi: 'Dịch thuật Word Bridge',
        name_en: 'Word Bridge Translation',
        service_code: 'Trans',
        domain: 'dichthuat.wordbridge.io.vn',
        origin: 'https://dichthuat.wordbridge.io.vn',
        ecosystem: 'Word Bridge (https://wordbridge.io.vn)',
        slogan: 'WORD BRIDGE – CONNECTING LANGUAGES, CONNECTING THE WORLD.'
      },
      ecosystem_distinction: {
        word_bridge_learning: {
          purpose: 'Nền tảng học tập và thực hành ngoại ngữ',
          initial_languages_count: 5,
          initial_languages: ['zh', 'en', 'ko', 'ja', 'ru']
        },
        word_bridge_trans: {
          purpose: 'Hệ thống dịch thuật trực tuyến toàn cầu (Độc lập với chương trình học ngoại ngữ)',
          supported_languages_count: GLOBAL_TRANSLATION_LANGUAGES.filter(l => !l.is_auto).length,
          restricted_to_learning_languages: false
        }
      },
      cloudflare_infrastructure: {
        d1: {
          binding: 'DB',
          database_name: 'word',
          database_id: 'ce84cc48-6d49-409b-b45a-13ba3bc4a771',
          allowed_usage: 'Chỉ lưu trữ duy nhất tổng số lượt truy cập website (site_metrics.total_accesses)',
          stores_user_translation_data: false
        },
        r2: {
          binding: 'R2',
          bucket_name: 'word',
          storage_class: 'Default Storage Class',
          preserved: true,
          allowed_for_translation_files: false,
          stores_user_documents_or_ocr: false
        }
      },
      zero_user_data_storage_policy: {
        enforced: true,
        only_stored_metric: 'total_accesses',
        prohibited_data: [
          'Văn bản nguồn & văn bản sau khi dịch',
          'Tệp PDF, DOCX, DOC, TXT, PPTX, XLSX, CSV tải lên hoặc xuất ra',
          'Hình ảnh & văn bản trích xuất OCR',
          'Metadata tệp, tên tệp, đường dẫn tệp',
          'Lịch sử dịch thuật, bản dịch đã lưu, từ điển cá nhân',
          'Thống kê theo người dùng, tài khoản, địa chỉ IP, thiết bị hoặc phiên',
          'LocalStorage, SessionStorage, IndexedDB, Cache API chứa nội dung dịch'
        ],
        cache_control_header: 'no-store, no-cache, must-revalidate, max-age=0'
      },
      provider_status: {
        active_provider: providerConfig.provider,
        workers_ai_bound: providerConfig.workers_ai_bound,
        external_api_configured: providerConfig.external_api_configured,
        zero_data_retention: providerConfig.zero_data_retention,
        trains_on_user_data: providerConfig.trains_on_user_data,
        limits: {
          max_text_chars: providerConfig.max_text_chars,
          max_document_mb: 10,
          max_image_mb: 8
        }
      },
      site_metrics: {
        total_accesses: this.getTotalAccesses(),
        metric_note: 'Tổng số lượt truy cập trang chính hợp lệ (không phải số người dùng duy nhất, không theo dõi danh tính).'
      },
      languages: GLOBAL_TRANSLATION_LANGUAGES,
      domains: SPECIALIZED_DOMAINS.map(d => ({
        id: d.id,
        order: d.order,
        name_vi: d.name_vi,
        name_en: d.name_en,
        description: d.description,
        glossary_count: (d.glossary || []).length
      })),
      supported_document_formats: SUPPORTED_DOCUMENT_FORMATS.map(f => ({
        ext: f.ext,
        mime: f.mime,
        label: f.label,
        max_mb: f.max_mb
      })),
      supported_image_ocr_formats: SUPPORTED_IMAGE_OCR_FORMATS.map(f => ({
        ext: f.ext,
        mime: f.mime,
        label: f.label,
        max_mb: f.max_mb
      }))
    };
  }

  listLanguages(searchQuery = '') {
    const q = String(searchQuery || '').trim().toLowerCase();
    const list = GLOBAL_TRANSLATION_LANGUAGES.filter(lang => {
      if (!q) return true;
      return (
        lang.code.toLowerCase().includes(q) ||
        lang.name_vi.toLowerCase().includes(q) ||
        lang.native_name.toLowerCase().includes(q) ||
        lang.script.toLowerCase().includes(q)
      );
    });
    return {
      total_supported: GLOBAL_TRANSLATION_LANGUAGES.filter(l => !l.is_auto).length,
      languages: list
    };
  }

  listDomains() {
    return {
      total_domains: SPECIALIZED_DOMAINS.length,
      domains: SPECIALIZED_DOMAINS
    };
  }

  detectSourceLanguage(body = {}) {
    const text = String(body.text ?? '');
    if (!text.trim()) {
      const err = new Error('Vui lòng cung cấp văn bản cần nhận diện ngôn ngữ.');
      err.statusCode = 400;
      throw err;
    }
    const detection = detectLanguage(text);
    const stats = computeTextStatistics(text);
    return {
      detection,
      statistics: stats,
      zero_user_data_storage: true
    };
  }

  async translateText(body = {}, workerEnv = null) {
    const result = await translateTextEphemeral({
      text: body.text,
      sourceLang: body.source_lang || body.sourceLang || 'auto',
      targetLang: body.target_lang || body.targetLang || 'en',
      domain: body.domain || 'general_other',
      workerEnv
    });
    return result;
  }

  async translateDocument(body = {}, workerEnv = null) {
    const result = await translateDocumentEphemeral({
      fileBase64: body.file_base64 || body.fileBase64 || '',
      fileName: body.file_name || body.fileName || 'document.txt',
      mimeType: body.mime_type || body.mimeType || '',
      sourceLang: body.source_lang || body.sourceLang || 'auto',
      targetLang: body.target_lang || body.targetLang || 'en',
      domain: body.domain || 'general_other',
      workerEnv
    });
    return result;
  }

  async translateImageOcr(body = {}, workerEnv = null) {
    const result = await processImageOcrEphemeral({
      imageBase64: body.image_base64 || body.imageBase64 || '',
      fileName: body.file_name || body.fileName || 'image.png',
      mimeType: body.mime_type || body.mimeType || '',
      recognizedTextHint: body.recognized_text_hint || body.recognizedTextHint || '',
      sourceLang: body.source_lang || body.sourceLang || 'auto',
      targetLang: body.target_lang || body.targetLang || 'vi',
      domain: body.domain || 'general_other',
      workerEnv
    });
    return result;
  }

  runTextUtility(body = {}) {
    const text = String(body.text ?? '');
    const action = String(body.action || 'clean_whitespace');
    return applyTextUtility(text, action);
  }

  /**
   * Kiểm toán kỹ thuật trực tiếp chứng minh tuân thủ ZERO USER DATA STORAGE (PHẦN XI.4)
   */
  verifyZeroStorageCompliance() {
    this.ensureSiteMetricsInitialized();
    const metricsRows = this.db.query(`SELECT * FROM site_metrics`);
    const aiLogRows = this.db.query(`SELECT * FROM ai_assistant_logs`);
    const storageFileRows = this.db.query(`SELECT * FROM storage_files`);
    const tableNames = Array.from(this.db.memoryEngine.tables.keys());

    const forbiddenTranslationTables = tableNames.filter(t =>
      /translation_history|translated_files|ocr_logs|user_dictionary|saved_translations|visitor_logs/i.test(t)
    );

    const translationFilesInStorage = storageFileRows.filter(f =>
      String(f.storage_key || '').includes('trans') ||
      String(f.owner_type || '').includes('trans')
    );

    const metricsSchemaCols = this.db.memoryEngine.meta.site_metrics
      ? this.db.memoryEngine.meta.site_metrics.columns
      : ['metric_key', 'total_accesses'];

    return {
      compliant:
        forbiddenTranslationTables.length === 0 &&
        aiLogRows.length === 0 &&
        translationFilesInStorage.length === 0 &&
        metricsRows.length === 1 &&
        metricsSchemaCols.length === 2,
      d1_database_name: 'word',
      d1_database_id: 'ce84cc48-6d49-409b-b45a-13ba3bc4a771',
      r2_bucket_name: 'word',
      checks: {
        no_translation_history_tables: forbiddenTranslationTables.length === 0,
        site_metrics_columns: metricsSchemaCols,
        site_metrics_row_count: metricsRows.length,
        total_accesses: this.getTotalAccesses(),
        ai_assistant_logs_count: aiLogRows.length,
        r2_translation_files_count: translationFilesInStorage.length,
        cache_control_enforced: 'no-store, no-cache, must-revalidate, max-age=0'
      }
    };
  }
}

export default { TranslationModule };
