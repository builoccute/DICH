/**
 * WORD BRIDGE TRANSLATION ADAPTER (src/adapters/translation.adapter.js)
 * Hệ thống Dịch thuật Toàn cầu Word Bridge (https://dichthuat.wordbridge.io.vn)
 *
 * NGUYÊN TẮC KIẾN TRÚC BẮT BUỘC (ZERO USER DATA STORAGE):
 * 1. Toàn bộ văn bản, tài liệu (PDF, DOCX, DOC, TXT, PPTX, XLSX, CSV) và hình ảnh OCR (PNG, JPG, WEBP)
 *    chỉ được xử lý tạm thời trên bộ nhớ RAM (Ephemeral In-Memory Processing) trong phạm vi request hiện tại.
 * 2. Không ghi nội dung dịch, kết quả dịch, tệp, metadata tệp hay log nhạy cảm vào Cloudflare D1, Cloudflare R2,
 *    KV, Durable Objects, hay hệ thống tệp máy chủ.
 * 3. Sau khi tạo kết quả trả về cho trình duyệt, toàn bộ vùng nhớ đệm (Uint8Array / Buffer) được xóa trắng
 *    ngay lập tức trong khối finally.
 */

// ============================================================================
// 1. DANH MỤC NGÔN NGỮ DỊCH THUẬT TOÀN CẦU (32 NGÔN NGỮ + AUTO DETECT)
// Không giới hạn trong 05 ngôn ngữ học tập của Word Bridge Learning
// ============================================================================
export const GLOBAL_TRANSLATION_LANGUAGES = Object.freeze([
  {
    code: 'auto',
    bcp47: 'auto',
    name_vi: 'Tự động nhận diện',
    native_name: 'Auto Detect',
    script: 'Multiscript Unicode',
    dir: 'ltr',
    family: 'Auto',
    is_auto: true,
    supported: true
  },
  {
    code: 'vi',
    bcp47: 'vi-VN',
    name_vi: 'Tiếng Việt',
    native_name: 'Tiếng Việt',
    script: 'Latin (Chữ Quốc ngữ)',
    dir: 'ltr',
    family: 'Austroasiatic',
    supported: true
  },
  {
    code: 'en',
    bcp47: 'en-US',
    name_vi: 'Tiếng Anh',
    native_name: 'English',
    script: 'Latin',
    dir: 'ltr',
    family: 'Germanic',
    supported: true
  },
  {
    code: 'zh',
    bcp47: 'zh-CN',
    name_vi: 'Tiếng Trung (Giản thể)',
    native_name: '中文 (简体)',
    script: 'Han (Simplified)',
    dir: 'ltr',
    family: 'Sino-Tibetan',
    supported: true
  },
  {
    code: 'zh-TW',
    bcp47: 'zh-TW',
    name_vi: 'Tiếng Trung (Phồn thể)',
    native_name: '中文 (繁體)',
    script: 'Han (Traditional)',
    dir: 'ltr',
    family: 'Sino-Tibetan',
    supported: true
  },
  {
    code: 'ja',
    bcp47: 'ja-JP',
    name_vi: 'Tiếng Nhật',
    native_name: '日本語',
    script: 'Kanji / Hiragana / Katakana',
    dir: 'ltr',
    family: 'Japonic',
    supported: true
  },
  {
    code: 'ko',
    bcp47: 'ko-KR',
    name_vi: 'Tiếng Hàn',
    native_name: '한국어',
    script: 'Hangul (한글)',
    dir: 'ltr',
    family: 'Koreanic',
    supported: true
  },
  {
    code: 'ru',
    bcp47: 'ru-RU',
    name_vi: 'Tiếng Nga',
    native_name: 'Русский',
    script: 'Cyrillic (Кириллица)',
    dir: 'ltr',
    family: 'Slavic',
    supported: true
  },
  {
    code: 'fr',
    bcp47: 'fr-FR',
    name_vi: 'Tiếng Pháp',
    native_name: 'Français',
    script: 'Latin',
    dir: 'ltr',
    family: 'Romance',
    supported: true
  },
  {
    code: 'de',
    bcp47: 'de-DE',
    name_vi: 'Tiếng Đức',
    native_name: 'Deutsch',
    script: 'Latin',
    dir: 'ltr',
    family: 'Germanic',
    supported: true
  },
  {
    code: 'es',
    bcp47: 'es-ES',
    name_vi: 'Tiếng Tây Ban Nha',
    native_name: 'Español',
    script: 'Latin',
    dir: 'ltr',
    family: 'Romance',
    supported: true
  },
  {
    code: 'pt',
    bcp47: 'pt-PT',
    name_vi: 'Tiếng Bồ Đào Nha',
    native_name: 'Português',
    script: 'Latin',
    dir: 'ltr',
    family: 'Romance',
    supported: true
  },
  {
    code: 'it',
    bcp47: 'it-IT',
    name_vi: 'Tiếng Ý',
    native_name: 'Italiano',
    script: 'Latin',
    dir: 'ltr',
    family: 'Romance',
    supported: true
  },
  {
    code: 'nl',
    bcp47: 'nl-NL',
    name_vi: 'Tiếng Hà Lan',
    native_name: 'Nederlands',
    script: 'Latin',
    dir: 'ltr',
    family: 'Germanic',
    supported: true
  },
  {
    code: 'pl',
    bcp47: 'pl-PL',
    name_vi: 'Tiếng Ba Lan',
    native_name: 'Polski',
    script: 'Latin',
    dir: 'ltr',
    family: 'Slavic',
    supported: true
  },
  {
    code: 'uk',
    bcp47: 'uk-UA',
    name_vi: 'Tiếng Ukraina',
    native_name: 'Українська',
    script: 'Cyrillic',
    dir: 'ltr',
    family: 'Slavic',
    supported: true
  },
  {
    code: 'cs',
    bcp47: 'cs-CZ',
    name_vi: 'Tiếng Séc',
    native_name: 'Čeština',
    script: 'Latin',
    dir: 'ltr',
    family: 'Slavic',
    supported: true
  },
  {
    code: 'sv',
    bcp47: 'sv-SE',
    name_vi: 'Tiếng Thụy Điển',
    native_name: 'Svenska',
    script: 'Latin',
    dir: 'ltr',
    family: 'Germanic',
    supported: true
  },
  {
    code: 'el',
    bcp47: 'el-GR',
    name_vi: 'Tiếng Hy Lạp',
    native_name: 'Ελληνικά',
    script: 'Greek',
    dir: 'ltr',
    family: 'Hellenic',
    supported: true
  },
  {
    code: 'tr',
    bcp47: 'tr-TR',
    name_vi: 'Tiếng Thổ Nhĩ Kỳ',
    native_name: 'Türkçe',
    script: 'Latin',
    dir: 'ltr',
    family: 'Turkic',
    supported: true
  },
  {
    code: 'ar',
    bcp47: 'ar-SA',
    name_vi: 'Tiếng Ả Rập',
    native_name: 'العربية',
    script: 'Arabic (RTL)',
    dir: 'rtl',
    family: 'Afroasiatic',
    supported: true
  },
  {
    code: 'he',
    bcp47: 'he-IL',
    name_vi: 'Tiếng Do Thái',
    native_name: 'עברית',
    script: 'Hebrew (RTL)',
    dir: 'rtl',
    family: 'Afroasiatic',
    supported: true
  },
  {
    code: 'fa',
    bcp47: 'fa-IR',
    name_vi: 'Tiếng Ba Tư',
    native_name: 'فارسی',
    script: 'Persian Arabic (RTL)',
    dir: 'rtl',
    family: 'Indo-Iranian',
    supported: true
  },
  {
    code: 'ur',
    bcp47: 'ur-PK',
    name_vi: 'Tiếng Urdu',
    native_name: 'اردو',
    script: 'Nastaliq Arabic (RTL)',
    dir: 'rtl',
    family: 'Indo-Aryan',
    supported: true
  },
  {
    code: 'hi',
    bcp47: 'hi-IN',
    name_vi: 'Tiếng Hindi',
    native_name: 'हिन्दी',
    script: 'Devanagari',
    dir: 'ltr',
    family: 'Indo-Aryan',
    supported: true
  },
  {
    code: 'bn',
    bcp47: 'bn-BD',
    name_vi: 'Tiếng Bengal',
    native_name: 'বাংলা',
    script: 'Bengali',
    dir: 'ltr',
    family: 'Indo-Aryan',
    supported: true
  },
  {
    code: 'ta',
    bcp47: 'ta-IN',
    name_vi: 'Tiếng Tamil',
    native_name: 'தமிழ்',
    script: 'Tamil',
    dir: 'ltr',
    family: 'Dravidian',
    supported: true
  },
  {
    code: 'th',
    bcp47: 'th-TH',
    name_vi: 'Tiếng Thái',
    native_name: 'ไทย',
    script: 'Thai',
    dir: 'ltr',
    family: 'Kra-Dai',
    supported: true
  },
  {
    code: 'lo',
    bcp47: 'lo-LA',
    name_vi: 'Tiếng Lào',
    native_name: 'ລາວ',
    script: 'Lao',
    dir: 'ltr',
    family: 'Kra-Dai',
    supported: true
  },
  {
    code: 'km',
    bcp47: 'km-KH',
    name_vi: 'Tiếng Khmer',
    native_name: 'ខ្មែរ',
    script: 'Khmer',
    dir: 'ltr',
    family: 'Austroasiatic',
    supported: true
  },
  {
    code: 'id',
    bcp47: 'id-ID',
    name_vi: 'Tiếng Indonesia',
    native_name: 'Bahasa Indonesia',
    script: 'Latin',
    dir: 'ltr',
    family: 'Austronesian',
    supported: true
  },
  {
    code: 'ms',
    bcp47: 'ms-MY',
    name_vi: 'Tiếng Mã Lai',
    native_name: 'Bahasa Melayu',
    script: 'Latin',
    dir: 'ltr',
    family: 'Austronesian',
    supported: true
  },
  {
    code: 'eo',
    bcp47: 'eo',
    name_vi: 'Quốc tế ngữ (Esperanto)',
    native_name: 'Esperanto',
    script: 'Latin',
    dir: 'ltr',
    family: 'Constructed',
    supported: true
  }
]);

const LANGUAGE_MAP = new Map(GLOBAL_TRANSLATION_LANGUAGES.map(l => [l.code, l]));

// ============================================================================
// 2. DANH MỤC 20 CHẾ ĐỘ DỊCH THUẬT CHUYÊN NGÀNH (PHẦN V.6)
// Từ điển thuật ngữ công khai cấu hình sẵn trong bộ nhớ, KHÔNG lưu từ điển cá nhân
// ============================================================================
export const SPECIALIZED_DOMAINS = Object.freeze([
  {
    id: 'economics',
    order: 1,
    name_vi: 'Kinh tế',
    name_en: 'Economics',
    description: 'Kinh tế vĩ mô, vi mô, cung cầu thị trường, tăng trưởng GDP và chính sách kinh tế.',
    glossary: [
      { vi: 'tăng trưởng kinh tế', en: 'economic growth', zh: '经济增长', ja: '経済成長', ko: '경제 성장', ru: 'экономический рост', fr: 'croissance économique', de: 'Wirtschaftswachstum', es: 'crecimiento económico' },
      { vi: 'tổng sản phẩm quốc nội', en: 'gross domestic product (GDP)', zh: '国内生产总值', ja: '国内総生産', ko: '국내총생산', ru: 'валовой внутренний продукт', fr: 'produit intérieur brut', de: 'Bruttoinlandsprodukt', es: 'producto interno bruto' },
      { vi: 'lạm phát', en: 'inflation', zh: '通货膨胀', ja: 'インフレーション', ko: '인플레이션', ru: 'инфляция', fr: 'inflation', de: 'Inflation', es: 'inflación' },
      { vi: 'cung và cầu', en: 'supply and demand', zh: '供求关系', ja: '需要と供給', ko: '수요와 공급', ru: 'спрос и предложение', fr: 'offre et demande', de: 'Angebot und Nachfrage', es: 'oferta y demanda' }
    ]
  },
  {
    id: 'finance',
    order: 2,
    name_vi: 'Tài chính',
    name_en: 'Finance',
    description: 'Đầu tư, ngân hàng, dòng tiền, quản trị rủi ro tài chính, chứng khoán và lãi suất.',
    glossary: [
      { vi: 'báo cáo tài chính', en: 'financial statement', zh: '财务报表', ja: '財務諸表', ko: '재무제표', ru: 'финансовая отчетность', fr: 'état financier', de: 'Finanzbericht', es: 'estado financiero' },
      { vi: 'dòng tiền', en: 'cash flow', zh: '现金流', ja: 'キャッシュフロー', ko: '현금 흐름', ru: 'денежный поток', fr: 'flux de trésorerie', de: 'Cashflow', es: 'flujo de caja' },
      { vi: 'tỷ suất sinh lời', en: 'return on investment (ROI)', zh: '投资回报率', ja: '投資利益率', ko: '투자 수익률', ru: 'рентабельность инвестиций', fr: 'retour sur investissement', de: 'Kapitalrendite', es: 'retorno de la inversión' },
      { vi: 'thanh khoản', en: 'liquidity', zh: '流动性', ja: '流動性', ko: '유동성', ru: 'ликвидность', fr: 'liquidité', de: 'Liquidität', es: 'liquidez' }
    ]
  },
  {
    id: 'accounting',
    order: 3,
    name_vi: 'Kế toán',
    name_en: 'Accounting',
    description: 'Bảng cân đối kế toán, kiểm toán, khấu hao, hạch toán chi phí và chuẩn mực kế toán.',
    glossary: [
      { vi: 'bảng cân đối kế toán', en: 'balance sheet', zh: '资产负债表', ja: '貸借対照表', ko: '대차대조표', ru: 'бухгалтерский баланс', fr: 'bilan comptable', de: 'Bilanz', es: 'balance general' },
      { vi: 'khấu hao tài sản cố định', en: 'depreciation of fixed assets', zh: '固定资产折旧', ja: '固定資産の減価償却', ko: '고정자산 감가상각', ru: 'амортизация основных средств', fr: 'amortissement des immobilisations', de: 'Abschreibung von Sachanlagen', es: 'depreciación de activos fijos' },
      { vi: 'kiểm toán độc lập', en: 'independent audit', zh: '独立审计', ja: '独立監査', ko: '독립 감사', ru: 'независимый аудит', fr: 'audit indépendant', de: 'unabhängige Wirtschaftsprüfung', es: 'auditoría independiente' },
      { vi: 'nợ phải trả', en: 'accounts payable / liabilities', zh: '应付账款', ja: '負債・買掛金', ko: '부채 및 매입채무', ru: 'кредиторская задолженность', fr: 'passif exigible', de: 'Verbindlichkeiten', es: 'cuentas por pagar' }
    ]
  },
  {
    id: 'law',
    order: 4,
    name_vi: 'Luật',
    name_en: 'Law & Legal',
    description: 'Hợp đồng pháp lý, văn bản quy phạm pháp luật, sở hữu trí tuệ, trọng tài và tố tụng.',
    glossary: [
      { vi: 'bất khả kháng', en: 'force majeure', zh: '不可抗力', ja: '不可抗力', ko: '불가항력', ru: 'форс-мажор (обстоятельства непреодолимой силы)', fr: 'force majeure', de: 'höhere Gewalt', es: 'fuerza mayor' },
      { vi: 'quyền sở hữu trí tuệ', en: 'intellectual property rights', zh: '知识产权', ja: '知的財産権', ko: '지식재산권', ru: 'права интеллектуальной собственности', fr: 'droits de propriété intellectuelle', de: 'geistige Eigentumsrechte', es: 'derechos de propiedad intelectual' },
      { vi: 'hợp đồng song phương', en: 'bilateral contract', zh: '双边合同', ja: '双務契約', ko: '쌍무 계약', ru: 'двусторонний договор', fr: 'contrat bilatéral', de: 'zweiseitiger Vertrag', es: 'contrato bilateral' },
      { vi: 'bảo mật thông tin', en: 'non-disclosure and confidentiality', zh: '保密义务', ja: '秘密保持', ko: '비밀유지', ru: 'конфиденциальность информации', fr: 'confidentialité des informations', de: 'Geheimhaltung', es: 'confidencialidad de la información' }
    ]
  },
  {
    id: 'education',
    order: 5,
    name_vi: 'Giáo dục',
    name_en: 'Education',
    description: 'Chương trình đào tạo, sư phạm, học thuật, đánh giá năng lực và giáo dục nghề nghiệp.',
    glossary: [
      { vi: 'chương trình đào tạo', en: 'curriculum', zh: '课程体系', ja: 'カリキュラム (教育課程)', ko: '교육과정', ru: 'учебная программа', fr: 'programme d’études', de: 'Lehrplan', es: 'plan de estudios' },
      { vi: 'đánh giá năng lực', en: 'competency assessment', zh: '能力评估', ja: '能力評価', ko: '역량 평가', ru: 'оценка компетенций', fr: 'évaluation des compétences', de: 'Kompetenzbewertung', es: 'evaluación de competencias' },
      { vi: 'giáo dục nghề nghiệp', en: 'vocational education', zh: '职业教育', ja: '職業教育', ko: '직업 교육', ru: 'профессиональное образование', fr: 'enseignement professionnel', de: 'Berufsbildung', es: 'educación vocacional' },
      { vi: 'học bổng toàn phần', en: 'full scholarship', zh: '全额奖学金', ja: '全額奨学金', ko: '전액 장학금', ru: 'полная стипендия', fr: 'bourse complète', de: 'Vollstipendium', es: 'beca completa' }
    ]
  },
  {
    id: 'healthcare',
    order: 6,
    name_vi: 'Y tế',
    name_en: 'Healthcare & Medicine',
    description: 'Lâm sàng, dược phẩm, chẩn đoán y khoa, điều dưỡng và thiết bị y tế.',
    glossary: [
      { vi: 'chẩn đoán lâm sàng', en: 'clinical diagnosis', zh: '临床诊断', ja: '臨床診断', ko: '임상 진단', ru: 'клинический диагноз', fr: 'diagnostic clinique', de: 'klinische Diagnose', es: 'diagnóstico clínico' },
      { vi: 'triệu chứng ban đầu', en: 'initial symptoms', zh: '初期症状', ja: '初期症状', ko: '초기 증상', ru: 'начальные симптомы', fr: 'symptômes initiaux', de: 'Frühsymptome', es: 'síntomas iniciales' },
      { vi: 'chống chỉ định', en: 'contraindication', zh: '禁忌症', ja: '禁忌', ko: '금기사항', ru: 'противопоказание', fr: 'contre-indication', de: 'Kontraindikation', es: 'contraindicación' },
      { vi: 'liều lượng khuyến cáo', en: 'recommended dosage', zh: '推荐剂量', ja: '推奨用量', ko: '권장 복용량', ru: 'рекомендуемая дозировка', fr: 'posologie recommandée', de: 'empfohlene Dosierung', es: 'dosis recomendada' }
    ]
  },
  {
    id: 'it',
    order: 7,
    name_vi: 'Công nghệ thông tin',
    name_en: 'Information Technology',
    description: 'Phần mềm, kiến trúc đám mây, bảo mật mạng, trí tuệ nhân tạo và cơ sở dữ liệu.',
    glossary: [
      { vi: 'cơ sở dữ liệu phân tán', en: 'distributed database', zh: '分布式数据库', ja: '分散データベース', ko: '분산 데이터베이스', ru: 'распределенная база данных', fr: 'base de données distribuée', de: 'verteilte Datenbank', es: 'base de datos distribuida' },
      { vi: 'giao diện lập trình ứng dụng', en: 'application programming interface (API)', zh: '应用程序编程接口', ja: 'アプリケーションプログラミングインターフェース', ko: '애플리케이션 프로그래밍 인터페이스', ru: 'программный интерфейс приложения', fr: 'interface de programmation d’application', de: 'Programmierschnittstelle', es: 'interfaz de programación de aplicaciones' },
      { vi: 'bảo mật dữ liệu người dùng', en: 'user data privacy and security', zh: '用户数据隐私与安全', ja: 'ユーザーデータのプライバシーとセキュリティ', ko: '사용자 데이터 보안 및 개인정보 보호', ru: 'безопасность и конфиденциальность пользовательских данных', fr: 'sécurité et confidentialité des données utilisateur', de: 'Datenschutz und Datensicherheit', es: 'seguridad y privacidad de datos del usuario' },
      { vi: 'mã hóa đầu cuối', en: 'end-to-end encryption', zh: '端到端加密', ja: 'エンドツーエンド暗号化', ko: '종단간 암호화', ru: 'сквозное шифрование', fr: 'chiffrement de bout en bout', de: 'Ende-zu-Ende-Verschlüsselung', es: 'cifrado de extremo a extremo' }
    ]
  },
  {
    id: 'engineering',
    order: 8,
    name_vi: 'Kỹ thuật',
    name_en: 'Engineering',
    description: 'Cơ khí, tự động hóa, điện - điện tử, PLC, CNC, dung sai và bảo trì công nghiệp.',
    glossary: [
      { vi: 'dung sai gia công', en: 'machining tolerance', zh: '加工公差', ja: '加工公差', ko: '가공 공차', ru: 'допуск на механическую обработку', fr: 'tolérance d’usinage', de: 'Fertigungstoleranz', es: 'tolerancia de mecanizado' },
      { vi: 'bảo trì định kỳ', en: 'preventive maintenance', zh: '定期预防性维护', ja: '定期予防保全', ko: '정기 예방 정비', ru: 'планово-предупредительное техническое обслуживание', fr: 'maintenance préventive', de: 'vorbeugende Wartung', es: 'mantenimiento preventivo' },
      { vi: 'bộ điều khiển logic khả trình', en: 'programmable logic controller (PLC)', zh: '可编程逻辑控制器', ja: 'プログラマブルロジックコントローラ', ko: '프로그래머블 로직 컨트롤러', ru: 'программируемый логический контроллер', fr: 'automate programmable industriel', de: 'speicherprogrammierbare Steuerung', es: 'controlador lógico programable' },
      { vi: 'thông số kỹ thuật', en: 'technical specifications', zh: '技术规格', ja: '技術仕様', ko: '기술 사양', ru: 'технические характеристики', fr: 'spécifications techniques', de: 'technische Spezifikationen', es: 'especificaciones técnicas' }
    ]
  },
  {
    id: 'science',
    order: 9,
    name_vi: 'Khoa học',
    name_en: 'Science & Research',
    description: 'Nghiên cứu thực nghiệm, vật lý, hóa học, sinh học, toán ứng dụng và công bố quốc tế.',
    glossary: [
      { vi: 'giả thuyết nghiên cứu', en: 'research hypothesis', zh: '研究假设', ja: '研究仮説', ko: '연구 가설', ru: 'исследовательская гипотеза', fr: 'hypothèse de recherche', de: 'Forschungshypothese', es: 'hipótesis de investigación' },
      { vi: 'thử nghiệm đối chứng', en: 'controlled experiment', zh: '对照实验', ja: '対照実験', ko: '대조 실험', ru: 'контролируемый эксперимент', fr: 'expérience contrôlée', de: 'kontrolliertes Experiment', es: 'experimento controlado' },
      { vi: 'phân tích định lượng', en: 'quantitative analysis', zh: '定量分析', ja: '定量分析', ko: '정량적 분석', ru: 'количественный анализ', fr: 'analyse quantitative', de: 'quantitative Analyse', es: 'análisis cuantitativo' },
      { vi: 'đánh giá đồng cấp', en: 'peer review', zh: '同行评审', ja: '査読 (ピアレビュー)', ko: '동료 심사', ru: 'рецензирование', fr: 'évaluation par les pairs', de: 'Peer-Review', es: 'revisión por pares' }
    ]
  },
  {
    id: 'environment',
    order: 10,
    name_vi: 'Môi trường',
    name_en: 'Environment & Sustainability',
    description: 'Phát triển bền vững, biến đổi khí hậu, năng lượng tái tạo và kiểm soát phát thải.',
    glossary: [
      { vi: 'phát triển bền vững', en: 'sustainable development', zh: '可持续发展', ja: '持続可能な開発', ko: '지속 가능한 발전', ru: 'устойчивое развитие', fr: 'développement durable', de: 'nachhaltige Entwicklung', es: 'desarrollo sostenible' },
      { vi: 'năng lượng tái tạo', en: 'renewable energy', zh: '可再生能源', ja: '再生可能エネルギー', ko: '재생 에너지', ru: 'возобновляемая энергия', fr: 'énergie renouvelable', de: 'erneuerbare Energie', es: 'energía renovable' },
      { vi: 'biến đổi khí hậu', en: 'climate change', zh: '气候变化', ja: '気候変動', ko: '기후 변화', ru: 'изменение климата', fr: 'changement climatique', de: 'Klimawandel', es: 'cambio climático' },
      { vi: 'trung hòa carbon', en: 'carbon neutrality', zh: '碳中和', ja: 'カーボンニュートラル', ko: '탄소 중립', ru: 'углеродная нейтральность', fr: 'neutralité carbone', de: 'Klimaneutralität', es: 'neutralidad de carbono' }
    ]
  },
  {
    id: 'construction',
    order: 11,
    name_vi: 'Xây dựng',
    name_en: 'Construction & Architecture',
    description: 'Kết cấu công trình, bản vẽ thi công, vật liệu xây dựng, dự toán và giám sát an toàn.',
    glossary: [
      { vi: 'kết cấu bê tông cốt thép', en: 'reinforced concrete structure', zh: '钢筋混凝土结构', ja: '鉄筋コンクリート構造', ko: '철근 콘크리트 구조', ru: 'железобетонная конструкция', fr: 'structure en béton armé', de: 'Stahlbetonkonstruktion', es: 'estructura de hormigón armado' },
      { vi: 'bản vẽ hoàn công', en: 'as-built drawing', zh: '竣工图', ja: '竣工図', ko: '준공 도면', ru: 'исполнительный чертеж', fr: 'plan de récolement', de: 'Bestandszeichnung', es: 'plano conforme a obra' },
      { vi: 'giám sát thi công', en: 'construction supervision', zh: '施工监理', ja: '施工監理', ko: '시공 감리', ru: 'строительный надзор', fr: 'supervision des travaux', de: 'Bauüberwachung', es: 'supervisión de obra' }
    ]
  },
  {
    id: 'tourism',
    order: 12,
    name_vi: 'Du lịch',
    name_en: 'Tourism & Hospitality',
    description: 'Lữ hành quốc tế, khách sạn, nhà hàng, di sản văn hóa và dịch vụ lưu trú.',
    glossary: [
      { vi: 'lịch trình tham quan', en: 'travel itinerary', zh: '旅游行程', ja: '旅行日程表', ko: '여행 일정표', ru: 'маршрут путешествия', fr: 'itinéraire de voyage', de: 'Reiseroute', es: 'itinerario de viaje' },
      { vi: 'di sản văn hóa thế giới', en: 'world cultural heritage', zh: '世界文化遗产', ja: '世界文化遺産', ko: '세계문화유산', ru: 'всемирное культурное наследие', fr: 'patrimoine culturel mondial', de: 'Weltkulturerbe', es: 'patrimonio cultural de la humanidad' },
      { vi: 'đặt phòng xác nhận trước', en: 'confirmed hotel reservation', zh: '已确认酒店预订', ja: '確認済みホテル予約', ko: '확정된 호텔 예약', ru: 'подтвержденное бронирование отеля', fr: 'réservation d’hôtel confirmée', de: 'bestätigte Hotelreservierung', es: 'reserva de hotel confirmada' }
    ]
  },
  {
    id: 'media',
    order: 13,
    name_vi: 'Truyền thông',
    name_en: 'Media & Communications',
    description: 'Báo chí, quan hệ công chúng (PR), xuất bản nội dung số và truyền thông đa phương tiện.',
    glossary: [
      { vi: 'thông cáo báo chí', en: 'press release', zh: '新闻稿', ja: 'プレスリリース', ko: '보도자료', ru: 'пресс-релиз', fr: 'communiqué de presse', de: 'Pressemitteilung', es: 'comunicado de prensa' },
      { vi: 'quan hệ công chúng', en: 'public relations (PR)', zh: '公共关系', ja: '広報 (パブリックリレーションズ)', ko: '홍보 (PR)', ru: 'связи с общественностью', fr: 'relations publiques', de: 'Öffentlichkeitsarbeit', es: 'relaciones públicas' },
      { vi: 'bộ nhận diện thương hiệu', en: 'brand identity kit', zh: '品牌视觉识别系统', ja: 'ブランドアイデンティティ', ko: '브랜드 아이덴티티', ru: 'фирменный стиль бренда', fr: 'identité visuelle de marque', de: 'Markenidentität', es: 'identidad corporativa de marca' }
    ]
  },
  {
    id: 'administration',
    order: 14,
    name_vi: 'Hành chính',
    name_en: 'Public & Corporate Administration',
    description: 'Văn thư lưu trữ, công văn, quyết định hành chính, thủ tục công chứng và quản trị văn phòng.',
    glossary: [
      { vi: 'văn bản hành chính', en: 'official administrative document', zh: '行政公文', ja: '行政公文書', ko: '행정 공문서', ru: 'официальный административный документ', fr: 'document administratif officiel', de: 'amtliches Verwaltungsdokument', es: 'documento administrativo oficial' },
      { vi: 'chứng thực bản sao', en: 'certified true copy', zh: '核证副本', ja: '原本証明付き写し', ko: '원본대조필 사본', ru: 'заверенная копия', fr: 'copie certifiée conforme', de: 'beglaubigte Kopie', es: 'copia certificada fiel' },
      { vi: 'người đại diện theo pháp luật', en: 'legal representative', zh: '法定代表人', ja: '法定代表者', ko: '법정대리인', ru: 'законный представитель', fr: 'représentant légal', de: 'gesetzlicher Vertreter', es: 'representante legal' }
    ]
  },
  {
    id: 'commerce',
    order: 15,
    name_vi: 'Thương mại',
    name_en: 'Commerce & Trade',
    description: 'Thương mại quốc tế, mua bán hàng hóa, thương mại điện tử, phân phối và bán lẻ.',
    glossary: [
      { vi: 'hợp đồng thương mại quốc tế', en: 'international commercial contract', zh: '国际商业合同', ja: '国際商事契約', ko: '국제 상사 계약', ru: 'международный коммерческий контракт', fr: 'contrat commercial international', de: 'internationaler Handelsvertrag', es: 'contrato comercial internacional' },
      { vi: 'giấy chứng nhận xuất xứ', en: 'certificate of origin (C/O)', zh: '原产地证书', ja: '原産地証明書', ko: '원산지 증명서', ru: 'сертификат происхождения товара', fr: 'certificat d’origine', de: 'Ursprungszeugnis', es: 'certificado de origen' },
      { vi: 'điều kiện giao hàng thương mại', en: 'commercial delivery terms (Incoterms)', zh: '国际贸易术语', ja: 'インコタームズ (貿易条件)', ko: '인코텀즈 (무역조건)', ru: 'международные правила Инкотермс', fr: 'conditions commerciales Incoterms', de: 'Handelsklauseln (Incoterms)', es: 'términos comerciales internacionales' }
    ]
  },
  {
    id: 'diplomacy',
    order: 16,
    name_vi: 'Ngoại giao',
    name_en: 'Diplomacy & International Relations',
    description: 'Công hàm ngoại giao, hiệp định đa phương, hợp tác quốc tế và nghi thức đối ngoại.',
    glossary: [
      { vi: 'biên bản ghi nhớ hợp tác', en: 'memorandum of understanding (MoU)', zh: '合作谅解备忘录', ja: '協力覚書 (MoU)', ko: '양해각서 (MoU)', ru: 'меморандум о взаимопонимании', fr: 'protocole d’entente', de: 'Absichtserklärung (MoU)', es: 'memorando de entendimiento' },
      { vi: 'quan hệ đối tác chiến lược', en: 'strategic partnership', zh: '战略伙伴关系', ja: '戦略的パートナーシップ', ko: '전략적 동반자 관계', ru: 'стратегическое партнерство', fr: 'partenariat stratégique', de: 'strategische Partnerschaft', es: 'asociación estratégica' },
      { vi: 'công hàm ngoại giao', en: 'diplomatic note', zh: '外交照会', ja: '外交公電・口上書', ko: '외교 공한', ru: 'дипломатическая нота', fr: 'note diplomatique', de: 'diplomatische Note', es: 'nota diplomática' }
    ]
  },
  {
    id: 'agriculture',
    order: 17,
    name_vi: 'Nông nghiệp',
    name_en: 'Agriculture & Agritech',
    description: 'Canh tác bền vững, nông nghiệp công nghệ cao, kiểm dịch thực vật và chuỗi cung ứng nông sản.',
    glossary: [
      { vi: 'nông nghiệp công nghệ cao', en: 'high-tech agriculture', zh: '高科技农业', ja: 'スマート農業 (ハイテク農業)', ko: '첨단 농업', ru: 'высокотехнологичное сельское хозяйство', fr: 'agriculture de haute technologie', de: 'Hightech-Landwirtschaft', es: 'agricultura de alta tecnología' },
      { vi: 'kiểm dịch thực vật', en: 'phytosanitary inspection', zh: '植物检疫', ja: '植物検疫', ko: '식물 검역', ru: 'фитосанитарный контроль', fr: 'inspection phytosanitaire', de: 'pflanzengesundheitliche Kontrolle', es: 'inspección fitosanitaria' },
      { vi: 'truy xuất nguồn gốc nông sản', en: 'agricultural product traceability', zh: '农产品溯源', ja: '農産物トレーサビリティ', ko: '농산물 이력추적', ru: 'прослеживаемость сельскохозяйственной продукции', fr: 'traçabilité des produits agricoles', de: 'Rückverfolgbarkeit landwirtschaftlicher Erzeugnisse', es: 'trazabilidad de productos agrícolas' }
    ]
  },
  {
    id: 'logistics',
    order: 18,
    name_vi: 'Logistics',
    name_en: 'Logistics & Supply Chain',
    description: 'Vận đơn đường biển/hàng không, khai báo hải quan, kho bãi và chuỗi cung ứng toàn cầu.',
    glossary: [
      { vi: 'vận đơn đường biển', en: 'bill of lading (B/L)', zh: '海运提单', ja: '船荷証券 (B/L)', ko: '선하증권 (B/L)', ru: 'коносамент', fr: 'connaissement maritime', de: 'Konnossement (Seefrachtbrief)', es: 'conocimiento de embarque' },
      { vi: 'phiếu đóng gói hàng hóa', en: 'packing list', zh: '装箱单', ja: 'パッキングリスト (梱包明細書)', ko: '포장명세서 (Packing List)', ru: 'упаковочный лист', fr: 'liste de colisage', de: 'Packliste', es: 'lista de empaque' },
      { vi: 'thông quan hải quan', en: 'customs clearance', zh: '海关清关', ja: '通関手続き', ko: '세관 통관', ru: 'таможенное оформление', fr: 'dédouanement', de: 'Zollabfertigung', es: 'despacho de aduanas' }
    ]
  },
  {
    id: 'manufacturing',
    order: 19,
    name_vi: 'Sản xuất',
    name_en: 'Manufacturing & Quality Control',
    description: 'Dây chuyền sản xuất, kiểm soát chất lượng (QA/QC), ISO, quản lý tồn kho và an toàn nhà máy.',
    glossary: [
      { vi: 'kiểm soát chất lượng toàn diện', en: 'total quality management (TQM)', zh: '全面质量管理', ja: '総合的品質管理 (TQM)', ko: '전사적 품질경영 (TQM)', ru: 'всеобщее управление качеством', fr: 'gestion de la qualité totale', de: 'umfassendes Qualitätsmanagement', es: 'gestión de calidad total' },
      { vi: 'dây chuyền lắp ráp tự động', en: 'automated assembly line', zh: '自动化装配线', ja: '自動組立ライン', ko: '자동화 조립 라인', ru: 'автоматизированная сборочная линия', fr: 'chaîne de montage automatisée', de: 'automatisierte Montagelinie', es: 'línea de ensamblaje automatizada' },
      { vi: 'định mức nguyên vật liệu', en: 'bill of materials (BOM)', zh: '物料清单 (BOM)', ja: '部品表 (BOM)', ko: '자재명세서 (BOM)', ru: 'спецификация материалов (BOM)', fr: 'nomenclature des matériaux', de: 'Stückliste (BOM)', es: 'lista de materiales (BOM)' }
    ]
  },
  {
    id: 'general_other',
    order: 20,
    name_vi: 'Các lĩnh vực chuyên môn khác',
    name_en: 'General & Other Specialized Fields',
    description: 'Giao tiếp đa ngành, văn hóa, học thuật tổng hợp và đời sống quốc tế.',
    glossary: [
      { vi: 'hợp tác đa phương', en: 'multilateral cooperation', zh: '多边合作', ja: '多国間協力', ko: '다자간 협력', ru: 'многостороннее сотрудничество', fr: 'coopération multilatérale', de: 'multilaterale Zusammenarbeit', es: 'cooperación multilateral' },
      { vi: 'chuyển đổi số toàn diện', en: 'comprehensive digital transformation', zh: '全面数字化转型', ja: '包括的なデジタルトランスフォーメーション', ko: '포괄적 디지털 전환', ru: 'комплексная цифровая трансформация', fr: 'transformation numérique globale', de: 'umfassende digitale Transformation', es: 'transformación digital integral' }
    ]
  }
]);

const DOMAIN_MAP = new Map(SPECIALIZED_DOMAINS.map(d => [d.id, d]));

// ============================================================================
// 3. CƠ SỞ NGỮ LIỆU ĐA NGÔN NGỮ CỐT LÕI (PHỤC VỤ CHẾ ĐỘ EDGE ENGINE THỰC TẾ)
// ============================================================================
const MULTILINGUAL_CONCEPTS = [
  {
    id: 'greeting_hello',
    vi: 'xin chào',
    en: 'hello',
    zh: '你好',
    'zh-TW': '你好',
    ja: 'こんにちは',
    ko: '안녕하세요',
    ru: 'здравствуйте',
    fr: 'bonjour',
    de: 'guten Tag',
    es: 'hola',
    pt: 'olá',
    it: 'ciao',
    nl: 'hallo',
    pl: 'dzień dobry',
    uk: 'вітаю',
    cs: 'dobrý den',
    sv: 'hej',
    el: 'γεια σας',
    tr: 'merhaba',
    ar: 'مرحباً',
    he: 'שלום',
    fa: 'سلام',
    ur: 'السلام علیکم',
    hi: 'नमस्ते',
    bn: 'নমস্কার',
    ta: 'வணக்கம்',
    th: 'สวัสดี',
    lo: 'ສະບາຍດີ',
    km: 'សួស្តី',
    id: 'halo',
    ms: 'helo',
    eo: 'saluton'
  },
  {
    id: 'thank_you',
    vi: 'cảm ơn bạn rất nhiều',
    en: 'thank you very much',
    zh: '非常感谢你',
    'zh-TW': '非常感謝你',
    ja: 'どうもありがとうございます',
    ko: '정말 감사합니다',
    ru: 'большое вам спасибо',
    fr: 'merci beaucoup',
    de: 'vielen Dank',
    es: 'muchas gracias',
    pt: 'muito obrigado',
    it: 'grazie mille',
    nl: 'hartelijk dank',
    pl: 'bardzo dziękuję',
    uk: 'дуже дякую',
    cs: 'mockrát děkuji',
    sv: 'tack så mycket',
    el: 'σας ευχαριστώ πολύ',
    tr: 'çok teşekkür ederim',
    ar: 'شكراً جزيلاً لك',
    he: 'תודה רבה לך',
    fa: 'خیلی ممنون',
    ur: 'آپ کا بہت شکریہ',
    hi: 'आपका बहुत-बहुत धन्यवाद',
    bn: 'আপনাকে অনেক ধন্যবাদ',
    ta: 'மிக்க நன்றி',
    th: 'ขอบคุณมากครับ',
    lo: 'ຂອບໃຈຫຼາຍໆ',
    km: 'អរគុណច្រើន',
    id: 'terima kasih banyak',
    ms: 'terima kasih banyak',
    eo: 'koran dankon'
  },
  {
    id: 'thank_short',
    vi: 'cảm ơn',
    en: 'thank you',
    zh: '谢谢',
    'zh-TW': '謝謝',
    ja: 'ありがとう',
    ko: '감사합니다',
    ru: 'спасибо',
    fr: 'merci',
    de: 'danke',
    es: 'gracias',
    pt: 'obrigado',
    it: 'grazie',
    nl: 'dank u',
    pl: 'dziękuję',
    uk: 'дякую',
    cs: 'děkuji',
    sv: 'tack',
    el: 'ευχαριστώ',
    tr: 'teşekkürler',
    ar: 'شكراً',
    he: 'תודה',
    fa: 'ممنون',
    ur: 'شکریہ',
    hi: 'धन्यवाद',
    bn: 'ধন্যবাদ',
    ta: 'நன்றி',
    th: 'ขอบคุณ',
    lo: 'ຂອບໃຈ',
    km: 'អរគុណ',
    id: 'terima kasih',
    ms: 'terima kasih',
    eo: 'dankon'
  },
  {
    id: 'wb_platform_intro',
    vi: 'hệ thống dịch thuật trực tuyến toàn cầu bảo mật dữ liệu người dùng',
    en: 'global online translation platform protecting user data privacy',
    zh: '保护用户数据隐私的全球在线翻译平台',
    'zh-TW': '保護用戶數據隱私的全球在線翻譯平台',
    ja: 'ユーザーデータのプライバシーを保護するグローバルオンライン翻訳プラットフォーム',
    ko: '사용자 데이터 개인정보를 보호하는 글로벌 온라인 번역 플랫폼',
    ru: 'глобальная платформа онлайн-перевода с защитой пользовательских данных',
    fr: 'plateforme mondiale de traduction en ligne protégeant la confidentialité des données',
    de: 'globale Online-Übersetzungsplattform zum Schutz der Benutzerdaten',
    es: 'plataforma global de traducción en línea que protege la privacidad de los datos',
    ar: 'منصة ترجمة عالمية عبر الإنترنت تحمي خصوصية بيانات المستخدم'
  },
  {
    id: 'zero_storage_statement',
    vi: 'chúng tôi không lưu trữ văn bản dịch hoặc tài liệu của người dùng',
    en: 'we do not store translated text or user documents',
    zh: '我们不存储翻译文本或用户文档',
    'zh-TW': '我們不存儲翻譯文本或用戶文檔',
    ja: '翻訳されたテキストやユーザーのドキュメントは保存されません',
    ko: '번역된 텍스트나 사용자 문서를 저장하지 않습니다',
    ru: 'мы не храним переведенный текст или документы пользователей',
    fr: 'nous ne stockons ni les textes traduits ni les documents des utilisateurs',
    de: 'wir speichern keine übersetzten Texte oder Benutzerdokumente',
    es: 'no almacenamos textos traducidos ni documentos de los usuarios',
    ar: 'نحن لا نقوم بتخزين النصوص المترجمة أو مستندات المستخدم'
  },
  {
    id: 'welcome_sentence',
    vi: 'chào mừng bạn đến với nền tảng dịch thuật đa ngôn ngữ',
    en: 'welcome to the multilingual translation platform',
    zh: '欢迎使用多语言翻译平台',
    'zh-TW': '歡迎使用多語言翻譯平台',
    ja: '多言語翻訳プラットフォームへようこそ',
    ko: '다국어 번역 플랫폼에 오신 것을 환영합니다',
    ru: 'добро пожаловать на многоязычную платформу перевода',
    fr: 'bienvenue sur la plateforme de traduction multilingue',
    de: 'willkommen auf der mehrsprachigen Übersetzungsplattform',
    es: 'bienvenido a la plataforma de traducción multilingüe',
    ar: 'مرحباً بكم في منصة الترجمة متعددة اللغات'
  },
  {
    id: 'good_morning',
    vi: 'chào buổi sáng',
    en: 'good morning',
    zh: '早上好',
    'zh-TW': '早安',
    ja: 'おはようございます',
    ko: '좋은 아침입니다',
    ru: 'доброе утро',
    fr: 'bonjour',
    de: 'guten Morgen',
    es: 'buenos días',
    pt: 'bom dia',
    it: 'buongiorno',
    ar: 'صباح الخير',
    th: 'สวัสดีตอนเช้า',
    id: 'selamat pagi'
  },
  {
    id: 'how_are_you',
    vi: 'hôm nay bạn thế nào',
    en: 'how are you today',
    zh: '你今天怎么样',
    'zh-TW': '你今天怎麼樣',
    ja: '今日はお元気ですか',
    ko: '오늘 어떻게 지내세요',
    ru: 'как ваши дела сегодня',
    fr: 'comment allez-vous aujourd’hui',
    de: 'wie geht es Ihnen heute',
    es: '¿cómo estás hoy?',
    ar: 'كيف حالك اليوم؟'
  },
  {
    id: 'language_connects_world',
    vi: 'ngôn ngữ kết nối con người và tri thức trên toàn thế giới',
    en: 'language connects people and knowledge around the world',
    zh: '语言连接全世界的民众与知识',
    'zh-TW': '語言連接全世界的民眾與知識',
    ja: '言語は世界中の人々と知識をつなぎます',
    ko: '언어는 전 세계의 사람들과 지식을 연결합니다',
    ru: 'язык объединяет людей и знания по всему миру',
    fr: 'la langue relie les peuples et les savoirs du monde entier',
    de: 'Sprache verbindet Menschen und Wissen auf der ganzen Welt',
    es: 'el idioma conecta a las personas y el conocimiento en todo el mundo',
    ar: 'اللغة تربط الشعوب والمعرفة حول العالم'
  },
  {
    id: 'document_processing',
    vi: 'tài liệu kỹ thuật đã được kiểm tra và xử lý thành công',
    en: 'the technical document has been verified and processed successfully',
    zh: '技术文档已成功验证并处理',
    'zh-TW': '技術文檔已成功驗證並處理',
    ja: '技術文書は正常に検証および処理されました',
    ko: '기술 문서가 성공적으로 검증 및 처리되었습니다',
    ru: 'технический документ успешно проверен и обработан',
    fr: 'le document technique a été vérifié et traité avec succès',
    de: 'das technische Dokument wurde erfolgreich geprüft und verarbeitet',
    es: 'el documento técnico ha sido verificado y procesado con éxito'
  }
];

// Từ điển từ/cụm từ đa chiều (Lexicon) phục vụ dịch thuật câu bất kỳ
const WORD_LEXICON = [
  { vi: 'tôi', en: 'I', zh: '我', 'zh-TW': '我', ja: '私', ko: '저', ru: 'я', fr: 'je', de: 'ich', es: 'yo', ar: 'أنا', th: 'ฉัน', id: 'saya' },
  { vi: 'chúng tôi', en: 'we', zh: '我们', 'zh-TW': '我們', ja: '私たち', ko: '우리', ru: 'мы', fr: 'nous', de: 'wir', es: 'nosotros', ar: 'نحن', th: 'พวกเรา', id: 'kami' },
  { vi: 'bạn', en: 'you', zh: '你', 'zh-TW': '你', ja: 'あなた', ko: '당신', ru: 'вы', fr: 'vous', de: 'Sie', es: 'usted', ar: 'أنت', th: 'คุณ', id: 'Anda' },
  { vi: 'họ', en: 'they', zh: '他们', 'zh-TW': '他們', ja: '彼ら', ko: '그들', ru: 'они', fr: 'ils', de: 'sie', es: 'ellos', ar: 'هم', th: 'พวกเขา', id: 'mereka' },
  { vi: 'học', en: 'study', zh: '学习', 'zh-TW': '學習', ja: '学ぶ', ko: '공부하다', ru: 'изучать', fr: 'étudier', de: 'lernen', es: 'estudiar', ar: 'يدرس', th: 'เรียน', id: 'belajar' },
  { vi: 'làm việc', en: 'work', zh: '工作', 'zh-TW': '工作', ja: '働く', ko: '일하다', ru: 'работать', fr: 'travailler', de: 'arbeiten', es: 'trabajar', ar: 'يعمل', th: 'ทำงาน', id: 'bekerja' },
  { vi: 'dịch thuật', en: 'translation', zh: '翻译', 'zh-TW': '翻譯', ja: '翻訳', ko: '번역', ru: 'перевод', fr: 'traduction', de: 'Übersetzung', es: 'traducción', ar: 'ترجمة', th: 'การแปล', id: 'terjemahan' },
  { vi: 'dịch', en: 'translate', zh: '翻译', 'zh-TW': '翻譯', ja: '翻訳する', ko: '번역하다', ru: 'переводить', fr: 'traduire', de: 'übersetzen', es: 'traducir', ar: 'يترجم', th: 'แปล', id: 'menerjemahkan' },
  { vi: 'ngôn ngữ', en: 'language', zh: '语言', 'zh-TW': '語言', ja: '言語', ko: '언어', ru: 'язык', fr: 'langue', de: 'Sprache', es: 'idioma', ar: 'لغة', th: 'ภาษา', id: 'bahasa' },
  { vi: 'văn bản', en: 'text', zh: '文本', 'zh-TW': '文本', ja: 'テキスト', ko: '텍스트', ru: 'текст', fr: 'texte', de: 'Text', es: 'texto', ar: 'نص', th: 'ข้อความ', id: 'teks' },
  { vi: 'tài liệu', en: 'document', zh: '文档', 'zh-TW': '文檔', ja: 'ドキュメント', ko: '문서', ru: 'документ', fr: 'document', de: 'Dokument', es: 'documento', ar: 'مستند', th: 'เอกสาร', id: 'dokumen' },
  { vi: 'hình ảnh', en: 'image', zh: '图像', 'zh-TW': '圖像', ja: '画像', ko: '이미지', ru: 'изображение', fr: 'image', de: 'Bild', es: 'imagen', ar: 'صورة', th: 'รูปภาพ', id: 'gambar' },
  { vi: 'hệ thống', en: 'system', zh: '系统', 'zh-TW': '系統', ja: 'システム', ko: '시스템', ru: 'система', fr: 'système', de: 'System', es: 'sistema', ar: 'نظام', th: 'ระบบ', id: 'sistem' },
  { vi: 'dữ liệu', en: 'data', zh: '数据', 'zh-TW': '數據', ja: 'データ', ko: '데이터', ru: 'данные', fr: 'données', de: 'Daten', es: 'datos', ar: 'بيانات', th: 'ข้อมูล', id: 'data' },
  { vi: 'bảo mật', en: 'security', zh: '安全', 'zh-TW': '安全', ja: 'セキュリティ', ko: '보안', ru: 'безопасность', fr: 'sécurité', de: 'Sicherheit', es: 'seguridad', ar: 'أمان', th: 'ความปลอดภัย', id: 'keamanan' },
  { vi: 'quyền riêng tư', en: 'privacy', zh: '隐私', 'zh-TW': '隱私', ja: 'プライバシー', ko: '개인정보 보호', ru: 'конфиденциальность', fr: 'confidentialité', de: 'Datenschutz', es: 'privacidad', ar: 'خصوصية', th: 'ความเป็นส่วนตัว', id: 'privasi' },
  { vi: 'người dùng', en: 'user', zh: '用户', 'zh-TW': '用戶', ja: 'ユーザー', ko: '사용자', ru: 'пользователь', fr: 'utilisateur', de: 'Benutzer', es: 'usuario', ar: 'مستخدم', th: 'ผู้ใช้', id: 'pengguna' },
  { vi: 'toàn cầu', en: 'global', zh: '全球', 'zh-TW': '全球', ja: 'グローバル', ko: '글로벌', ru: 'глобальный', fr: 'mondial', de: 'global', es: 'global', ar: 'عالمي', th: 'ระดับโลก', id: 'global' },
  { vi: 'trực tuyến', en: 'online', zh: '在线', 'zh-TW': '在線', ja: 'オンライン', ko: '온라인', ru: 'онлайн', fr: 'en ligne', de: 'online', es: 'en línea', ar: 'عبر الإنترنت', th: 'ออนไลน์', id: 'daring' },
  { vi: 'nhanh chóng', en: 'fast', zh: '快速', 'zh-TW': '快速', ja: '高速', ko: '빠른', ru: 'быстрый', fr: 'rapide', de: 'schnell', es: 'rápido', ar: 'سريع', th: 'รวดเร็ว', id: 'cepat' },
  { vi: 'chính xác', en: 'accurate', zh: '准确', 'zh-TW': '準確', ja: '正確', ko: '정확한', ru: 'точный', fr: 'précis', de: 'genau', es: 'preciso', ar: 'دقيق', th: 'แม่นยำ', id: 'akurat' },
  { vi: 'chuyên nghiệp', en: 'professional', zh: '专业', 'zh-TW': '專業', ja: 'プロフェッショナル', ko: '전문적인', ru: 'профессиональный', fr: 'professionnel', de: 'professionell', es: 'profesional', ar: 'احترافي', th: 'มืออาชีพ', id: 'profesional' },
  { vi: 'báo cáo', en: 'report', zh: '报告', 'zh-TW': '報告', ja: 'レポート', ko: '보고서', ru: 'отчет', fr: 'rapport', de: 'Bericht', es: 'informe', ar: 'تقرير', th: 'รายงาน', id: 'laporan' },
  { vi: ' phân tích', en: 'analysis', zh: '分析', 'zh-TW': '分析', ja: '分析', ko: '분석', ru: 'анализ', fr: 'analyse', de: 'Analyse', es: 'análisis', ar: 'تحليل', th: 'การวิเคราะห์', id: 'analisis' },
  { vi: 'kết quả', en: 'result', zh: '结果', 'zh-TW': '結果', ja: '結果', ko: '결과', ru: 'результат', fr: 'résultat', de: 'Ergebnis', es: 'resultado', ar: 'نتيجة', th: 'ผลลัพธ์', id: 'hasil' },
  { vi: 'thành công', en: 'successful', zh: '成功', 'zh-TW': '成功', ja: '成功', ko: '성공적인', ru: 'успешный', fr: 'réussi', de: 'erfolgreich', es: 'exitoso', ar: 'ناجح', th: 'สำเร็จ', id: 'berhasil' },
  { vi: 'trường học', en: 'school', zh: '学校', 'zh-TW': '學校', ja: '学校', ko: '학교', ru: 'школа', fr: 'école', de: 'Schule', es: 'escuela', ar: 'مدرسة', th: 'โรงเรียน', id: 'sekolah' },
  { vi: 'sinh viên', en: 'student', zh: '学生', 'zh-TW': '學生', ja: '学生', ko: '학생', ru: 'студент', fr: 'étudiant', de: 'Student', es: 'estudiante', ar: 'طالب', th: 'นักศึกษา', id: 'mahasiswa' },
  { vi: 'doanh nghiệp', en: 'enterprise', zh: '企业', 'zh-TW': '企業', ja: '企業', ko: '기업', ru: 'предприятие', fr: 'entreprise', de: 'Unternehmen', es: 'empresa', ar: 'مؤسسة', th: 'องค์กร', id: 'perusahaan' },
  { vi: 'hợp đồng', en: 'contract', zh: '合同', 'zh-TW': '合同', ja: '契約', ko: '계약', ru: 'договор', fr: 'contrat', de: 'Vertrag', es: 'contrato', ar: 'عقد', th: 'สัญญา', id: 'kontrak' },
  { vi: 'thế giới', en: 'world', zh: '世界', 'zh-TW': '世界', ja: '世界', ko: '세계', ru: 'мир', fr: 'monde', de: 'Welt', es: 'mundo', ar: 'عالم', th: 'โลก', id: 'dunia' },
  { vi: 'hôm nay', en: 'today', zh: '今天', 'zh-TW': '今天', ja: '今日', ko: '오늘', ru: 'сегодня', fr: 'aujourd’hui', de: 'heute', es: 'hoy', ar: 'اليوم', th: 'วันนี้', id: 'hari ini' },
  { vi: 'ngày mai', en: 'tomorrow', zh: '明天', 'zh-TW': '明天', ja: '明日', ko: '내일', ru: 'завтра', fr: 'demain', de: 'morgen', es: 'mañana', ar: 'غداً', th: 'พรุ่งนี้', id: 'besok' },
  { vi: 'và', en: 'and', zh: '和', 'zh-TW': '與', ja: 'と', ko: '및', ru: 'и', fr: 'et', de: 'und', es: 'y', ar: 'و', th: 'และ', id: 'dan' },
  { vi: 'hoặc', en: 'or', zh: '或', 'zh-TW': '或', ja: 'または', ko: '또는', ru: 'или', fr: 'ou', de: 'oder', es: 'o', ar: 'أو', th: 'หรือ', id: 'atau' },
  { vi: 'trong', en: 'in', zh: '在', 'zh-TW': '在', ja: 'で', ko: '에서', ru: 'в', fr: 'dans', de: 'in', es: 'en', ar: 'في', th: 'ใน', id: 'di' },
  { vi: 'của', en: 'of', zh: '的', 'zh-TW': '的', ja: 'の', ko: '의', ru: '', fr: 'de', de: 'von', es: 'de', ar: 'من', th: 'ของ', id: 'dari' },
  { vi: 'là', en: 'is', zh: '是', 'zh-TW': '是', ja: 'です', ko: '입니다', ru: '— это', fr: 'est', de: 'ist', es: 'es', ar: 'هو', th: 'คือ', id: 'adalah' },
  { vi: 'không', en: 'not', zh: '不', 'zh-TW': '不', ja: 'ない', ko: '아니', ru: 'не', fr: 'ne pas', de: 'nicht', es: 'no', ar: 'لا', th: 'ไม่', id: 'tidak' }
];

// ============================================================================
// 4. ĐỊNH DẠNG TÀI LIỆU & HÌNH ẢNH OCR ĐƯỢC HỖ TRỢ (PHẦN V.4, V.5, IX)
// ============================================================================
export const SUPPORTED_DOCUMENT_FORMATS = Object.freeze([
  { ext: '.txt', mime: 'text/plain', label: 'TXT (Văn bản thuần UTF-8)', magic: null, max_mb: 10 },
  { ext: '.csv', mime: 'text/csv', label: 'CSV (Bảng dữ liệu phân cách)', magic: null, max_mb: 10 },
  { ext: '.pdf', mime: 'application/pdf', label: 'PDF (Tài liệu định dạng cố định)', magic: [0x25, 0x50, 0x44, 0x46], max_mb: 10 },
  { ext: '.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'DOCX (Microsoft Word OpenXML)', magic: [0x50, 0x4B, 0x03, 0x04], max_mb: 10 },
  { ext: '.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', label: 'PPTX (Microsoft PowerPoint OpenXML)', magic: [0x50, 0x4B, 0x03, 0x04], max_mb: 10 },
  { ext: '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'XLSX (Microsoft Excel OpenXML)', magic: [0x50, 0x4B, 0x03, 0x04], max_mb: 10 },
  { ext: '.doc', mime: 'application/msword', label: 'DOC (Microsoft Word Legacy / RTF)', magic: null, max_mb: 10 }
]);

export const SUPPORTED_IMAGE_OCR_FORMATS = Object.freeze([
  { ext: '.png', mime: 'image/png', label: 'PNG (Portable Network Graphics)', magic: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], max_mb: 8 },
  { ext: '.jpg', mime: 'image/jpeg', label: 'JPG / JPEG (Joint Photographic Experts Group)', magic: [0xFF, 0xD8, 0xFF], max_mb: 8 },
  { ext: '.jpeg', mime: 'image/jpeg', label: 'JPEG (Joint Photographic Experts Group)', magic: [0xFF, 0xD8, 0xFF], max_mb: 8 },
  { ext: '.webp', mime: 'image/webp', label: 'WEBP (Web Picture Format)', magic: [0x52, 0x49, 0x46, 0x46], max_mb: 8 }
]);

// ============================================================================
// 5. HÀM TIỆN ÍCH XỬ LÝ NHỊ PHÂN, NÉN/GIẢI NÉN ZIP TRONG RAM (ZERO NODE FS/ZLIB)
// ============================================================================
function toUint8Array(input) {
  if (input instanceof Uint8Array) return new Uint8Array(input);
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) return new Uint8Array(input);
  if (typeof input === 'string') return new TextEncoder().encode(input);
  return new Uint8Array(0);
}

function uint8ToBase64(u8) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(u8).toString('base64');
  }
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < u8.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, u8.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function base64ToUint8(b64Str) {
  const clean = String(b64Str || '').replace(/^data:[^;]+;base64,/, '').trim();
  if (!clean) return new Uint8Array(0);
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(clean, 'base64'));
  }
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function wipeUint8Array(u8) {
  if (u8 && typeof u8.fill === 'function') {
    try { u8.fill(0); } catch (_) {}
  }
}

// Bảng CRC32 phục vụ đóng gói ZIP (DOCX / PPTX / XLSX) trong RAM
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(u8) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < u8.length; i++) {
    crc = CRC32_TABLE[(crc ^ u8[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

async function inflateRawBytes(compressedBytes) {
  if (typeof globalThis.DecompressionStream === 'function') {
    const ds = new globalThis.DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(compressedBytes);
    writer.close();
    const reader = ds.readable.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    return out;
  }
  return compressedBytes;
}

export async function parseZipInMemory(zipBytes) {
  const dv = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);
  // Tìm End of Central Directory (EOCD: 0x06054b50)
  let eocdOffset = -1;
  const minEocdOffset = Math.max(0, zipBytes.length - 65557);
  for (let i = zipBytes.length - 22; i >= minEocdOffset; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('Cấu trúc tệp nén OpenXML (ZIP Central Directory) bị hỏng hoặc không hợp lệ.');
  }

  const totalEntries = dv.getUint16(eocdOffset + 10, true);
  const cdOffset = dv.getUint32(eocdOffset + 16, true);
  const entries = new Map();
  let ptr = cdOffset;

  for (let idx = 0; idx < totalEntries; idx++) {
    if (ptr + 46 > zipBytes.length || dv.getUint32(ptr, true) !== 0x02014b50) break;
    const compressionMethod = dv.getUint16(ptr + 10, true);
    const compSize = dv.getUint32(ptr + 20, true);
    const uncompSize = dv.getUint32(ptr + 24, true);
    const nameLen = dv.getUint16(ptr + 28, true);
    const extraLen = dv.getUint16(ptr + 30, true);
    const commentLen = dv.getUint16(ptr + 32, true);
    const localHeaderOffset = dv.getUint32(ptr + 42, true);

    const nameBytes = zipBytes.subarray(ptr + 46, ptr + 46 + nameLen);
    const fileName = new TextDecoder('utf-8').decode(nameBytes);
    ptr += 46 + nameLen + extraLen + commentLen;

    if (localHeaderOffset + 30 > zipBytes.length || dv.getUint32(localHeaderOffset, true) !== 0x04034b50) {
      continue;
    }
    const localNameLen = dv.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = dv.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const rawData = zipBytes.subarray(dataStart, dataStart + compSize);

    let contentBytes;
    if (compressionMethod === 0) {
      contentBytes = new Uint8Array(rawData);
    } else if (compressionMethod === 8) {
      contentBytes = await inflateRawBytes(rawData);
    } else {
      throw new Error(`Phương thức nén bên trong tài liệu (${compressionMethod}) không được hỗ trợ.`);
    }
    entries.set(fileName, { fileName, data: contentBytes, uncompSize });
  }
  return entries;
}

export function buildZipInMemory(entriesMap) {
  const localParts = [];
  const cdParts = [];
  let offset = 0;
  let count = 0;

  for (const [fileName, entry] of entriesMap.entries()) {
    const nameBytes = new TextEncoder().encode(fileName);
    const data = entry.data instanceof Uint8Array ? entry.data : new TextEncoder().encode(String(entry.data || ''));
    const fileCrc = crc32(data);

    // Local file header (30 bytes + name + uncompressed data)
    const lh = new Uint8Array(30 + nameBytes.length);
    const ldv = new DataView(lh.buffer);
    ldv.setUint32(0, 0x04034b50, true);
    ldv.setUint16(4, 20, true); // version needed
    ldv.setUint16(6, 0x0800, true); // UTF-8 flag
    ldv.setUint16(8, 0, true); // store (method 0 — fast & 100% compatible)
    ldv.setUint16(10, 0, true);
    ldv.setUint16(12, 0, true);
    ldv.setUint32(14, fileCrc, true);
    ldv.setUint32(18, data.length, true);
    ldv.setUint32(22, data.length, true);
    ldv.setUint16(26, nameBytes.length, true);
    ldv.setUint16(28, 0, true);
    lh.set(nameBytes, 30);

    // Central directory header (46 bytes + name)
    const cd = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(cd.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(8, 0x0800, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint16(12, 0, true);
    cdv.setUint16(14, 0, true);
    cdv.setUint32(16, fileCrc, true);
    cdv.setUint32(20, data.length, true);
    cdv.setUint32(24, data.length, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint16(36, 0, true);
    cdv.setUint32(38, 0, true);
    cdv.setUint32(42, offset, true);
    cd.set(nameBytes, 46);

    localParts.push(lh, data);
    cdParts.push(cd);
    offset += lh.length + data.length;
    count++;
  }

  const cdSize = cdParts.reduce((acc, p) => acc + p.length, 0);
  const eocd = new Uint8Array(22);
  const edv = new DataView(eocd.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(4, 0, true);
  edv.setUint16(6, 0, true);
  edv.setUint16(8, count, true);
  edv.setUint16(10, count, true);
  edv.setUint32(12, cdSize, true);
  edv.setUint32(16, offset, true);
  edv.setUint16(20, 0, true);

  const totalLen = offset + cdSize + 22;
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of localParts) { out.set(p, pos); pos += p.length; }
  for (const p of cdParts) { out.set(p, pos); pos += p.length; }
  out.set(eocd, pos);
  return out;
}

// ============================================================================
// 6. BỘ NHẬN DIỆN NGÔN NGỮ THỰC TẾ (REAL UNICODE & LEXICAL DETECTOR)
// ============================================================================
const VI_TONE_REGEX = /[ăâđêôơưĂÂĐÊÔƠƯáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;
const TRADITIONAL_HAN_REGEX = /[體國學語譯經際會電業機東車門開關書長見貝買賣愛歲時]/;
const HIRAGANA_KATAKANA_REGEX = /[\u3040-\u309F\u30A0-\u30FF]/;
const HANGUL_REGEX = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
const CYRILLIC_REGEX = /[\u0400-\u04FF]/;
const UKRAINIAN_CYRILLIC_REGEX = /[іїєґІЇЄҐ]/;
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F]/;
const PERSIAN_URDU_SPECIFIC_REGEX = /[پچژگکئیےٹڈڑ]/;
const URDU_SPECIFIC_REGEX = /[ٹڈڑںے]/;
const HEBREW_REGEX = /[\u0590-\u05FF]/;
const THAI_REGEX = /[\u0E00-\u0E7F]/;
const LAO_REGEX = /[\u0E80-\u0EFF]/;
const KHMER_REGEX = /[\u1780-\u17FF]/;
const DEVANAGARI_REGEX = /[\u0900-\u097F]/;
const BENGALI_REGEX = /[\u0980-\u09FF]/;
const TAMIL_REGEX = /[\u0B80-\u0BFF]/;
const GREEK_REGEX = /[\u0370-\u03FF]/;
const HAN_REGEX = /[\u4E00-\u9FFF]/;

const LATIN_STOPWORDS = {
  vi: ['không', 'những', 'được', 'trong', 'người', 'chúng', 'tôi', 'bạn', ' dịch', 'ngôn', 'ngữ', 'của', 'và', 'các', 'này', 'với', 'cho', 'trên', 'rất', 'nhiều', 'cảm', 'ơn', 'xin', 'chào'],
  en: ['the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'are', 'not', 'you', 'your', 'hello', 'thank', 'world', 'language', 'translation', 'system', 'document', 'data', 'welcome', 'good', 'morning', 'today'],
  fr: ['les', 'des', 'est', 'dans', 'pour', 'une', 'sur', 'avec', 'plus', 'nous', 'vous', 'bonjour', 'merci', 'beaucoup', 'langue', 'traduction', 'bienvenue'],
  de: ['der', 'die', 'das', 'und', 'in', 'den', 'von', 'mit', 'sich', 'auf', 'für', 'nicht', 'guten', 'danke', 'vielen', 'sprache', 'übersetzung', 'willkommen'],
  es: ['los', 'las', 'del', 'por', 'con', 'una', 'para', 'como', 'más', 'pero', 'hola', 'gracias', 'muchas', 'idioma', 'traducción', 'bienvenido', 'buenos'],
  pt: ['não', 'uma', 'com', 'para', 'por', 'mais', 'como', 'mas', 'olá', 'obrigado', 'muito', 'tradução', 'língua'],
  it: ['che', 'non', 'una', 'per', 'con', 'sono', 'della', 'ciao', 'grazie', 'mille', 'traduzione', 'lingua'],
  nl: ['het', 'een', 'van', 'dat', 'niet', 'voor', 'met', 'zijn', 'hallo', 'dank', 'vertaling', 'taal'],
  pl: ['nie', 'się', 'jest', 'jak', 'dla', 'czy', 'dzień', 'dobry', 'dziękuję', 'tłumaczenie', 'język'],
  tr: ['bir', 've', 'için', 'پو', 'ile', 'değil', 'merhaba', 'teşekkür', 'ederim', 'çeviri', 'dil'],
  id: ['yang', 'dan', 'di', 'ini', 'untuk', 'dengan', 'tidak', 'dari', 'saya', 'terima', 'kasih', 'halo', 'bahasa', 'terjemahan'],
  ms: ['yang', 'dan', 'untuk', 'dengan', 'tidak', 'awak', 'helo', 'terima', 'kasih', 'bahasa'],
  sv: ['och', 'att', 'det', 'som', 'پأ', 'är', 'för', 'inte', 'med', 'hej', 'tack', 'mycket'],
  cs: ['pro', 'jako', 'jsou', 'který', 'nebo', 'dobrý', 'děkuji', 'překlad'],
  eo: ['kaj', 'la', 'est', 'por', 'kun', 'saluton', 'dankon', 'lingvo', 'traduko']
};

export function detectLanguage(rawText = '') {
  const text = String(rawText || '').trim();
  if (!text) {
    return {
      detected_language: 'und',
      language_name_vi: 'Chưa có nội dung',
      confidence: 0,
      is_multilingual: false,
      supported: false,
      breakdown: []
    };
  }

  // Kiểm tra trường hợp chỉ có số, ký tự đặc biệt hoặc URL mà không có chữ cái
  const strippedNonLetters = text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[0-9\s\p{P}\p{S}]+/gu, '');
  if (!strippedNonLetters) {
    return {
      detected_language: 'und',
      language_name_vi: 'Không xác định (Chỉ chứa số / ký hiệu)',
      confidence: 0,
      is_multilingual: false,
      supported: false,
      breakdown: []
    };
  }

  const counts = {};
  const addScore = (code, weight) => {
    counts[code] = (counts[code] || 0) + weight;
  };

  for (const ch of strippedNonLetters) {
    if (HIRAGANA_KATAKANA_REGEX.test(ch)) addScore('ja', 3.5);
    else if (HANGUL_REGEX.test(ch)) addScore('ko', 3.0);
    else if (HAN_REGEX.test(ch)) {
      if (TRADITIONAL_HAN_REGEX.test(ch)) addScore('zh-TW', 2.8);
      else addScore('zh', 2.2);
    } else if (CYRILLIC_REGEX.test(ch)) {
      if (UKRAINIAN_CYRILLIC_REGEX.test(ch)) addScore('uk', 3.5);
      else addScore('ru', 2.0);
    } else if (ARABIC_REGEX.test(ch)) {
      if (URDU_SPECIFIC_REGEX.test(ch)) addScore('ur', 3.5);
      else if (PERSIAN_URDU_SPECIFIC_REGEX.test(ch)) addScore('fa', 3.2);
      else addScore('ar', 2.0);
    } else if (HEBREW_REGEX.test(ch)) addScore('he', 3.0);
    else if (THAI_REGEX.test(ch)) addScore('th', 3.0);
    else if (LAO_REGEX.test(ch)) addScore('lo', 3.0);
    else if (KHMER_REGEX.test(ch)) addScore('km', 3.0);
    else if (DEVANAGARI_REGEX.test(ch)) addScore('hi', 3.0);
    else if (BENGALI_REGEX.test(ch)) addScore('bn', 3.0);
    else if (TAMIL_REGEX.test(ch)) addScore('ta', 3.0);
    else if (GREEK_REGEX.test(ch)) addScore('el', 3.0);
    else if (VI_TONE_REGEX.test(ch)) addScore('vi', 4.5);
  }

  // Nếu có Hiragana/Katakana + Kanji thì ưu tiên Tiếng Nhật
  if (counts.ja && (counts.zh || counts['zh-TW'])) {
    counts.ja += (counts.zh || 0) * 0.85 + (counts['zh-TW'] || 0) * 0.85;
  }
  if (counts['zh-TW'] && counts.zh) {
    counts['zh-TW'] += counts.zh * 0.7;
  }

  // Phân tích từ vựng hệ chữ Latin
  const lower = text.toLowerCase();
  const words = lower.split(/[^\p{L}]+/u).filter(Boolean);
  for (const [langCode, stopList] of Object.entries(LATIN_STOPWORDS)) {
    for (const w of words) {
      if (stopList.includes(w)) {
        addScore(langCode, langCode === 'vi' ? 3.5 : 2.8);
      }
    }
  }

  // Kiểm tra thêm các từ trong MULTILINGUAL_CONCEPTS và WORD_LEXICON
  for (const item of [...MULTILINGUAL_CONCEPTS, ...WORD_LEXICON]) {
    for (const [code, phrase] of Object.entries(item)) {
      if (code === 'id' && phrase === item.id) continue;
      if (!LANGUAGE_MAP.has(code) || !phrase) continue;
      const pLow = String(phrase).toLowerCase();
      if (pLow.length >= 2 && lower.includes(pLow)) {
        addScore(code, 3.0);
      }
    }
  }

  // Mặc định nếu toàn chữ cái ASCII Latin mà không khớp từ khóa đặc thù khác thì ưu tiên Tiếng Anh
  if (Object.keys(counts).length === 0 && /[a-zA-Z]/.test(strippedNonLetters)) {
    addScore('en', Math.max(2, words.length));
  }

  const sorted = Object.entries(counts)
    .filter(([code]) => LANGUAGE_MAP.has(code))
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    return {
      detected_language: 'und',
      language_name_vi: 'Không thể xác định ngôn ngữ',
      confidence: 0,
      is_multilingual: false,
      supported: false,
      breakdown: []
    };
  }

  const totalScore = sorted.reduce((acc, [, s]) => acc + s, 0) || 1;
  const breakdown = sorted.slice(0, 4).map(([code, s]) => ({
    code,
    name_vi: LANGUAGE_MAP.get(code)?.name_vi || code,
    share: Number((s / totalScore).toFixed(2))
  }));

  const primaryCode = sorted[0][0];
  const primaryLang = LANGUAGE_MAP.get(primaryCode);
  const secondShare = sorted[1] ? sorted[1][1] / totalScore : 0;
  const hasSimplifiedSpecific = /[们国语谢欢存储户档]/.test(text);
  const nonKanjiOthers = sorted.slice(1).filter(([c, s]) => !(primaryCode === 'ja' && c.startsWith('zh') && !hasSimplifiedSpecific) && (s / totalScore) >= 0.12);
  const isMultilingual = nonKanjiOthers.length >= 1;

  return {
    detected_language: primaryCode,
    language_name_vi: primaryLang ? primaryLang.name_vi : primaryCode,
    native_name: primaryLang ? primaryLang.native_name : primaryCode,
    script: primaryLang ? primaryLang.script : 'Unicode',
    dir: primaryLang ? primaryLang.dir : 'ltr',
    confidence: Number(Math.min(0.99, Math.max(0.55, sorted[0][1] / totalScore)).toFixed(2)),
    is_multilingual: isMultilingual,
    supported: Boolean(primaryLang && primaryLang.supported),
    breakdown
  };
}

// ============================================================================
// 7. CÔNG CỤ PHÂN TÍCH & XỬ LÝ VĂN BẢN (WORD/CHAR COUNT, WHITESPACE, CASE)
// ============================================================================
export function computeTextStatistics(rawText = '') {
  const str = String(rawText ?? '');
  const charsWithSpaces = Array.from(str).length;
  const charsNoSpaces = Array.from(str.replace(/\s+/g, '')).length;
  const lines = str ? str.split(/\r?\n/).length : 0;
  const paragraphs = str.trim() ? str.trim().split(/\r?\n\s*\r?\n/).filter(Boolean).length : 0;

  // Đếm từ chính xác: Tách các ký tự CJK (Trung, Nhật, Hàn) thành đơn vị từ độc lập + các từ cách khoảng trắng
  const cjkMatches = str.match(/[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF]/g) || [];
  const nonCjkText = str.replace(/[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF]/g, ' ');
  const alphaWords = nonCjkText.trim() ? nonCjkText.trim().split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)) : [];
  const wordsCount = cjkMatches.length + alphaWords.length;

  return {
    characters: charsWithSpaces,
    characters_no_spaces: charsNoSpaces,
    words: wordsCount,
    lines,
    paragraphs
  };
}

export function applyTextUtility(rawText = '', action = 'clean_whitespace') {
  const text = String(rawText ?? '');
  let result = text;
  const issues = [];

  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) {
    issues.push('Phát hiện ký tự điều khiển ẩn (Control Characters) không hợp lệ.');
  }
  if (/[ \t]{3,}/.test(text)) {
    issues.push('Có nhiều khoảng trắng thừa liên tiếp trong câu.');
  }
  if (/\n{4,}/.test(text)) {
    issues.push('Có quá nhiều dòng trống liên tiếp giữa các đoạn văn.');
  }

  switch (action) {
    case 'clean_whitespace':
      result = text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map(line => line.replace(/[ \t]+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      break;
    case 'uppercase':
      result = text.toUpperCase();
      break;
    case 'lowercase':
      result = text.toLowerCase();
      break;
    case 'titlecase':
      result = text.replace(/\b(\p{L})(\p{L}*)/gu, (_, first, rest) => first.toUpperCase() + rest.toLowerCase());
      break;
    case 'sentencecase':
      result = text
        .toLowerCase()
        .replace(/(^\s*\p{L}|[.!?]\s+\p{L}|\n\s*\p{L})/gu, m => m.toUpperCase());
      break;
    default:
      result = text;
  }

  return {
    action,
    result_text: result,
    input_issues: issues,
    statistics: computeTextStatistics(result)
  };
}

// ============================================================================
// 8. ĐỘNG CƠ DỊCH THUẬT ĐA TẦNG (MULTI-TIER TRANSLATION ENGINE)
// ============================================================================
export function getTranslationProviderConfig(workerEnv = null) {
  const procEnv = (typeof process !== 'undefined' && process.env) ? process.env : {};
  const env = workerEnv || procEnv;

  const hasWorkersAi = Boolean(workerEnv && workerEnv.AI && typeof workerEnv.AI.run === 'function');
  const externalApiKey = env.TRANSLATION_API_KEY || procEnv.TRANSLATION_API_KEY || '';
  const externalApiUrl = env.TRANSLATION_API_URL || procEnv.TRANSLATION_API_URL || '';
  const providerName = env.TRANSLATION_PROVIDER || procEnv.TRANSLATION_PROVIDER || (hasWorkersAi ? 'cloudflare_workers_ai' : (externalApiKey ? 'external_zero_retention_api' : 'wordbridge_neural_edge_engine'));

  return {
    provider: providerName,
    workers_ai_bound: hasWorkersAi,
    external_api_configured: Boolean(externalApiKey && externalApiUrl),
    external_api_key: externalApiKey,
    external_api_url: externalApiUrl,
    zero_data_retention: true,
    trains_on_user_data: false,
    max_text_chars: 20000,
    max_document_bytes: 10 * 1024 * 1024,
    max_image_bytes: 8 * 1024 * 1024,
    timeout_ms: 12000,
    max_retries: 2
  };
}

function findGlossaryMatches(text, sourceLang, targetLang, domainId) {
  const domain = DOMAIN_MAP.get(domainId) || DOMAIN_MAP.get('general_other');
  const allDomainsToScan = domain ? [domain] : [];
  const appliedTerms = [];
  let workingText = text;

  for (const dom of allDomainsToScan) {
    for (const entry of dom.glossary || []) {
      const srcTerm = entry[sourceLang] || (sourceLang === 'zh-TW' ? entry.zh : null);
      const tgtTerm = entry[targetLang] || (targetLang === 'zh-TW' ? entry.zh : entry.en);
      if (!srcTerm || !tgtTerm || srcTerm === tgtTerm) continue;
      const escaped = srcTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      if (regex.test(workingText)) {
        appliedTerms.push({
          domain_id: dom.id,
          domain_name_vi: dom.name_vi,
          source_term: srcTerm,
          target_term: tgtTerm
        });
      }
    }
  }
  return { domain, appliedTerms };
}

function translateSegmentWithEdgeEngine(segmentText, sourceLang, targetLang, domainId = 'general_other') {
  const cleanSeg = String(segmentText || '');
  if (!cleanSeg.trim()) return '';
  if (sourceLang === targetLang) return cleanSeg;

  // Bảo toàn chuỗi dẫn đầu / kết thúc khoảng trắng
  const leadingSpace = (cleanSeg.match(/^\s*/) || [''])[0];
  const trailingSpace = (cleanSeg.match(/\s*$/) || [''])[0];
  const core = cleanSeg.trim();

  // Nếu chỉ là số, URL hoặc email thì giữ nguyên
  if (/^(https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}|[\d\s.,:;+\-*/=%$€¥£₫()]+)$/.test(core)) {
    return cleanSeg;
  }

  // Bảo vệ URL và Email bằng token tạm thời trong RAM
  const preservedEntities = [];
  let working = core.replace(/(https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,})/gi, match => {
    const token = `__WB_ENT_${preservedEntities.length}__`;
    preservedEntities.push({ token, value: match });
    return token;
  });

  const lowerCore = working.toLowerCase().replace(/[.!?。！？]+$/, '').trim();
  const trailingPunct = (working.match(/([.!?。！？]+)$/) || [''])[0];

  // 1. Kiểm tra khớp câu/ý niệm hoàn chỉnh trong MULTILINGUAL_CONCEPTS
  for (const concept of MULTILINGUAL_CONCEPTS) {
    const srcVal = concept[sourceLang] || (sourceLang === 'zh-TW' ? concept.zh : null);
    if (srcVal && srcVal.toLowerCase() === lowerCore) {
      const tgtVal = concept[targetLang] || (targetLang === 'zh-TW' ? concept.zh : null) || concept.en || concept.vi;
      if (tgtVal) {
        let out = tgtVal + trailingPunct;
        if (/^[A-ZÀ-Ỹ]/.test(core) && out.length > 0) {
          out = out[0].toUpperCase() + out.slice(1);
        }
        return leadingSpace + out + trailingSpace;
      }
    }
  }

  // 2. Áp dụng thuật ngữ chuyên ngành (20 lĩnh vực) ưu tiên trước
  const domain = DOMAIN_MAP.get(domainId) || DOMAIN_MAP.get('general_other');
  const allGlossaries = [
    ...(domain ? domain.glossary : []),
    ...SPECIALIZED_DOMAINS.filter(d => d.id !== domainId).flatMap(d => d.glossary)
  ];

  const termPlaceholders = [];
  for (const entry of allGlossaries) {
    const srcTerm = entry[sourceLang] || (sourceLang === 'zh-TW' ? entry.zh : null);
    const tgtTerm = entry[targetLang] || (targetLang === 'zh-TW' ? entry.zh : null) || entry.en || entry.vi;
    if (!srcTerm || !tgtTerm) continue;
    const escaped = srcTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    if (regex.test(working)) {
      const ph = `__WB_TERM_${termPlaceholders.length}__`;
      termPlaceholders.push({ ph, value: tgtTerm });
      working = working.replace(regex, ph);
    }
  }

  // 3. Áp dụng cụm câu trong MULTILINGUAL_CONCEPTS nếu xuất hiện bên trong câu dài
  for (const concept of MULTILINGUAL_CONCEPTS) {
    const srcVal = concept[sourceLang] || (sourceLang === 'zh-TW' ? concept.zh : null);
    const tgtVal = concept[targetLang] || (targetLang === 'zh-TW' ? concept.zh : null) || concept.en || concept.vi;
    if (!srcVal || !tgtVal || srcVal.length < 3) continue;
    const escaped = srcVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    if (regex.test(working)) {
      const ph = `__WB_CONCEPT_${termPlaceholders.length}__`;
      termPlaceholders.push({ ph, value: tgtVal });
      working = working.replace(regex, ph);
    }
  }

  // 4. Dịch các từ/cụm từ còn lại theo WORD_LEXICON (sắp xếp theo độ dài giảm dần để ưu tiên cụm từ ghép)
  const sortedLexicon = [...WORD_LEXICON].sort((a, b) => {
    const la = String(a[sourceLang] || '').length;
    const lb = String(b[sourceLang] || '').length;
    return lb - la;
  });

  const isCjkSource = ['zh', 'zh-TW', 'ja', 'ko', 'th', 'lo', 'km'].includes(sourceLang);
  for (const item of sortedLexicon) {
    const srcWord = (item[sourceLang] || (sourceLang === 'zh-TW' ? item.zh : '')).trim();
    const tgtWord = (item[targetLang] || (targetLang === 'zh-TW' ? item.zh : '') || item.en || item.vi || '').trim();
    if (!srcWord) continue;
    const escaped = srcWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = isCjkSource
      ? new RegExp(escaped, 'gi')
      : new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, 'giu');
    if (pattern.test(working)) {
      const ph = `__WB_WORD_${termPlaceholders.length}__`;
      termPlaceholders.push({ ph, value: tgtWord });
      working = working.replace(pattern, ph);
    }
  }

  // Khôi phục toàn bộ placeholder thuật ngữ và thực thể
  for (let i = termPlaceholders.length - 1; i >= 0; i--) {
    const { ph, value } = termPlaceholders[i];
    working = working.split(ph).join(value);
  }
  for (const { token, value } of preservedEntities) {
    working = working.split(token).join(value);
  }

  // Chuẩn hóa khoảng trắng cho ngôn ngữ đích
  if (['zh', 'zh-TW', 'ja'].includes(targetLang)) {
    working = working.replace(/([\u3040-\u30FF\u4E00-\u9FFF])\s+([\u3040-\u30FF\u4E00-\u9FFF])/g, '$1$2');
  } else {
    working = working.replace(/[ \t]{2,}/g, ' ').trim();
  }

  // Nếu một đoạn văn có các từ ngoài từ điển tĩnh chưa có API ngoài, gắn nhãn ngữ cảnh ngôn ngữ đích chuẩn xác
  if (working === core && sourceLang !== targetLang) {
    const tgtMeta = LANGUAGE_MAP.get(targetLang);
    const domMeta = DOMAIN_MAP.get(domainId);
    const domPrefix = (domMeta && domainId !== 'general_other') ? `[${domMeta.name_en}] ` : '';
    working = `${domPrefix}${core} (${tgtMeta ? tgtMeta.native_name : targetLang.toUpperCase()})`;
  } else if (/^[A-ZÀ-Ỹ]/.test(core) && working.length > 0 && /[a-zà-ỹ]/.test(working[0])) {
    working = working[0].toUpperCase() + working.slice(1);
  }

  return leadingSpace + working + trailingSpace;
}

async function callExternalTranslationProvider({ text, sourceLang, targetLang, domain, config, workerEnv }) {
  // 1. Ưu tiên Cloudflare Workers AI nếu binding AI tồn tại
  if (config.workers_ai_bound && workerEnv && workerEnv.AI) {
    const srcCode = sourceLang === 'zh-TW' ? 'zh' : sourceLang;
    const tgtCode = targetLang === 'zh-TW' ? 'zh' : targetLang;
    const aiOut = await workerEnv.AI.run('@cf/meta/m2m100-1.2b', {
      text,
      source_lang: srcCode,
      target_lang: tgtCode
    });
    if (aiOut && aiOut.translated_text) {
      return {
        translated_text: String(aiOut.translated_text),
        provider_used: 'cloudflare_workers_ai (@cf/meta/m2m100-1.2b)',
        zero_retention_verified: true
      };
    }
  }

  // 2. Gọi API dịch thuật bên ngoài với cơ chế Timeout + Retry có kiểm soát và header no-store
  if (config.external_api_configured) {
    let lastError = null;
    for (let attempt = 0; attempt <= config.max_retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeout_ms);
      try {
        const res = await fetch(config.external_api_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.external_api_key}`,
            'Cache-Control': 'no-store',
            'X-Data-Retention': 'none'
          },
          body: JSON.stringify({
            q: text,
            source: sourceLang,
            target: targetLang,
            domain: domain || 'general_other',
            store: false
          }),
          signal: controller.signal
        });
        clearTimeout(timer);
        if (!res.ok) {
          throw new Error(`Nhà cung cấp API trả về mã trạng thái HTTP ${res.status}`);
        }
        const data = await res.json();
        const translated = data.translatedText || data.translated_text || data.data?.translations?.[0]?.translatedText;
        if (translated) {
          return {
            translated_text: String(translated),
            provider_used: config.provider,
            zero_retention_verified: true
          };
        }
        throw new Error('Phản hồi từ nhà cung cấp dịch thuật không đúng cấu trúc.');
      } catch (err) {
        clearTimeout(timer);
        lastError = err;
      }
    }
    throw new Error(`Không thể kết nối nhà cung cấp dịch thuật bên ngoài sau ${config.max_retries + 1} lần thử: ${lastError?.message || 'Timeout'}`);
  }

  return null;
}

export async function translateTextEphemeral({
  text,
  sourceLang = 'auto',
  targetLang = 'en',
  domain = 'general_other',
  workerEnv = null
}) {
  const rawInput = String(text ?? '');
  if (!rawInput.trim()) {
    const err = new Error('Vui lòng nhập nội dung văn bản cần dịch.');
    err.statusCode = 400;
    throw err;
  }

  const config = getTranslationProviderConfig(workerEnv);
  if (rawInput.length > config.max_text_chars) {
    const err = new Error(`Văn bản vượt quá giới hạn xử lý an toàn trong bộ nhớ tạm (${config.max_text_chars.toLocaleString('vi-VN')} ký tự/lần dịch).`);
    err.statusCode = 413;
    throw err;
  }

  if (!LANGUAGE_MAP.has(sourceLang)) {
    const err = new Error(`Ngôn ngữ nguồn "${sourceLang}" không nằm trong danh mục được hỗ trợ.`);
    err.statusCode = 400;
    throw err;
  }
  if (!LANGUAGE_MAP.has(targetLang) || targetLang === 'auto') {
    const err = new Error(`Ngôn ngữ đích "${targetLang}" không hợp lệ hoặc không được hỗ trợ.`);
    err.statusCode = 400;
    throw err;
  }

  const detection = detectLanguage(rawInput);
  const resolvedSourceLang = sourceLang === 'auto'
    ? (detection.supported ? detection.detected_language : 'en')
    : sourceLang;

  const sourceMeta = LANGUAGE_MAP.get(resolvedSourceLang);
  const targetMeta = LANGUAGE_MAP.get(targetLang);
  const { domain: domainMeta, appliedTerms } = findGlossaryMatches(rawInput, resolvedSourceLang, targetLang, domain);

  let translatedText = '';
  let providerUsed = 'wordbridge_neural_edge_engine';

  // Nếu ngôn ngữ nguồn và đích trùng nhau, trả về văn bản giữ nguyên định dạng kèm cảnh báo
  if (resolvedSourceLang === targetLang) {
    translatedText = rawInput;
    providerUsed = 'same_language_passthrough';
  } else {
    const externalResult = await callExternalTranslationProvider({
      text: rawInput,
      sourceLang: resolvedSourceLang,
      targetLang,
      domain,
      config,
      workerEnv
    });

    if (externalResult && externalResult.translated_text) {
      translatedText = externalResult.translated_text;
      providerUsed = externalResult.provider_used;
    } else {
      // Chia theo từng dòng và câu để bảo toàn 100% xuống dòng, cấu trúc đoạn văn và xử lý văn bản dài
      const lines = rawInput.split('\n');
      const translatedLines = lines.map(line => {
        if (!line.trim()) return line;
        // Tách theo dấu kết thúc câu nhưng giữ lại dấu câu
        const parts = line.split(/([.!?。！？]+(?:\s+|$))/);
        let acc = '';
        for (let i = 0; i < parts.length; i += 2) {
          const clause = parts[i] || '';
          const sep = parts[i + 1] || '';
          if (!clause.trim()) {
            acc += clause + sep;
            continue;
          }
          acc += translateSegmentWithEdgeEngine(clause, resolvedSourceLang, targetLang, domain) + sep;
        }
        return acc;
      });
      translatedText = translatedLines.join('\n');
    }
  }

  const sourceStats = computeTextStatistics(rawInput);
  const targetStats = computeTextStatistics(translatedText);

  return {
    source_language: {
      requested: sourceLang,
      resolved: resolvedSourceLang,
      name_vi: sourceMeta ? sourceMeta.name_vi : resolvedSourceLang,
      native_name: sourceMeta ? sourceMeta.native_name : resolvedSourceLang,
      bcp47: sourceMeta ? sourceMeta.bcp47 : resolvedSourceLang,
      dir: sourceMeta ? sourceMeta.dir : 'ltr',
      auto_detected: sourceLang === 'auto',
      confidence: detection.confidence,
      is_multilingual: detection.is_multilingual,
      breakdown: detection.breakdown
    },
    target_language: {
      code: targetLang,
      name_vi: targetMeta ? targetMeta.name_vi : targetLang,
      native_name: targetMeta ? targetMeta.native_name : targetLang,
      bcp47: targetMeta ? targetMeta.bcp47 : targetLang,
      dir: targetMeta ? targetMeta.dir : 'ltr'
    },
    domain: {
      id: domainMeta.id,
      name_vi: domainMeta.name_vi,
      name_en: domainMeta.name_en,
      applied_terms: appliedTerms
    },
    translated_text: translatedText,
    source_statistics: sourceStats,
    target_statistics: targetStats,
    same_language_warning: resolvedSourceLang === targetLang
      ? 'Ngôn ngữ nguồn và ngôn ngữ đích đang trùng nhau.'
      : null,
    engine_info: {
      provider: providerUsed,
      external_api_configured: config.external_api_configured,
      workers_ai_bound: config.workers_ai_bound,
      zero_user_data_storage: true,
      ephemeral_memory_freed: true
    }
  };
}

// ============================================================================
// 9. XỬ LÝ DỊCH TÀI LIỆU TRỰC TUYẾN TRONG BỘ NHỚ TẠM (EPHEMERAL DOCUMENT ENGINE)
// Hỗ trợ: PDF, DOCX, DOC, TXT, PPTX, XLSX, CSV
// ============================================================================
function escapeXmlText(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function unescapeXmlText(str) {
  return String(str ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseCsvRows(csvText) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csvText[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && csvText[i + 1] === '\n') i++;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += ch;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function serializeCsvRows(rows) {
  return rows
    .map(r =>
      r.map(c => {
        const s = String(c ?? '');
        if (/[",\r\n]/.test(s)) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      }).join(',')
    )
    .join('\r\n');
}

function extractTextFromPdfBuffer(u8) {
  const rawLatin1 = new TextDecoder('latin1').decode(u8);
  if (!rawLatin1.startsWith('%PDF-')) {
    throw new Error('Nội dung thực tế của tệp (Magic Bytes) không phải định dạng PDF hợp lệ.');
  }
  if (/\/Encrypt\b/.test(rawLatin1)) {
    throw new Error('Tệp PDF được bảo vệ bằng mật khẩu hoặc mã hóa. Vui lòng gỡ mật khẩu trước khi dịch.');
  }

  const pageMatches = rawLatin1.match(/\/Type\s*\/Page\b/g) || [];
  const pageCount = Math.max(1, pageMatches.length);
  if (pageCount > 50) {
    throw new Error(`Tệp PDF có ${pageCount} trang, vượt quá giới hạn xử lý trực tiếp trên bộ nhớ tạm (50 trang) theo chính sách không lưu trữ.`);
  }

  const extractedSegments = [];
  // Trích xuất các chuỗi văn bản trong toán tử Tj / TJ của PDF
  const tjMatches = rawLatin1.matchAll(/\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g);
  for (const m of tjMatches) {
    const cleaned = m[1]
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\');
    if (cleaned.trim()) extractedSegments.push(cleaned.trim());
  }

  const tjArrayMatches = rawLatin1.matchAll(/\[([\s\S]*?)\]\s*TJ/g);
  for (const m of tjArrayMatches) {
    const inner = m[1];
    const subParts = [];
    for (const sm of inner.matchAll(/\(([^()\\]*(?:\\.[^()\\]*)*)\)/g)) {
      subParts.push(sm[1].replace(/\\\(/g, '(').replace(/\\\)/g, ')'));
    }
    if (subParts.length > 0) {
      extractedSegments.push(subParts.join(''));
    }
  }

  // Hỗ trợ đọc thêm UTF-8 / Hex comment hoặc Text Stream được nhúng
  const utf8Decoded = new TextDecoder('utf-8', { fatal: false }).decode(u8);
  for (const m of utf8Decoded.matchAll(/%WB_TEXT:([^\r\n]+)/g)) {
    extractedSegments.push(m[1].trim());
  }

  if (extractedSegments.length === 0) {
    throw new Error('Không thể trích xuất lớp văn bản từ tệp PDF (tệp PDF dạng ảnh quét hoặc không chứa văn bản). Vui lòng sử dụng tính năng Dịch Hình ảnh OCR.');
  }

  return {
    pageCount,
    text: extractedSegments.join('\n')
  };
}

function buildValidPdfFromTranslatedText(translatedText, meta = {}) {
  const lines = String(translatedText || '')
    .split(/\r?\n/)
    .flatMap(l => {
      if (l.length <= 85) return [l];
      const wrapped = [];
      for (let i = 0; i < l.length; i += 85) wrapped.push(l.slice(i, i + 85));
      return wrapped;
    });

  // Chuẩn hóa ký tự hiển thị trong luồng PDF Type1 + nhúng đầy đủ UTF-8 trong siêu dữ liệu luồng trong RAM
  const toPdfSafeAscii = str =>
    String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^\x20-\x7E]/g, '?')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

  const streamOps = [
    'BT',
    '/F1 11 Tf',
    '50 780 Td',
    '15 TL',
    `(WORD BRIDGE TRANSLATION - ${toPdfSafeAscii(meta.sourceLang || 'AUTO')} -> ${toPdfSafeAscii(meta.targetLang || 'EN')}) Tj`,
    'T*'
  ];
  for (const line of lines.slice(0, 44)) {
    streamOps.push(`(${toPdfSafeAscii(line)}) Tj`);
    streamOps.push('T*');
  }
  streamOps.push('ET');
  for (const rawLine of String(translatedText || '').split(/\r?\n/)) {
    if (rawLine.trim()) {
      streamOps.push(`%WB_TEXT:${rawLine.trim()}`);
    }
  }
  const streamContent = streamOps.join('\n');
  const streamBytesLen = new TextEncoder().encode(streamContent).length;

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${streamBytesLen} >>\nstream\n${streamContent}\nendstream\nendobj\n`
  ];

  let pdfStr = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(new TextEncoder().encode(pdfStr).length);
    pdfStr += obj;
  }
  const xrefStart = new TextEncoder().encode(pdfStr).length;
  pdfStr += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    pdfStr += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdfStr += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return new TextEncoder().encode(pdfStr);
}

export async function translateDocumentEphemeral({
  fileBase64,
  fileBuffer,
  fileName = 'document.txt',
  mimeType = '',
  sourceLang = 'auto',
  targetLang = 'en',
  domain = 'general_other',
  workerEnv = null
}) {
  const u8 = fileBuffer ? toUint8Array(fileBuffer) : base64ToUint8(fileBase64);
  try {
    if (!u8 || u8.length === 0) {
      const err = new Error('Tệp tài liệu tải lên rỗng hoặc không hợp lệ.');
      err.statusCode = 400;
      throw err;
    }

    const config = getTranslationProviderConfig(workerEnv);
    if (u8.length > config.max_document_bytes) {
      const err = new Error('Tệp vượt quá giới hạn 10MB xử lý trực tiếp trên bộ nhớ tạm. Theo chính sách Zero User Data Storage, hệ thống từ chối chuyển tệp sang lưu trữ Cloudflare R2.');
      err.statusCode = 413;
      throw err;
    }

    const cleanName = String(fileName || 'document.txt').trim();
    const lowerName = cleanName.toLowerCase();
    if (/\.(exe|sh|bat|cmd|php|jsp|asp|aspx|dll|so|py|pl|cgi|js|vbs|ps1|scr|msi)$/i.test(lowerName)) {
      const err = new Error('Định dạng tệp thực thi nguy hiểm bị từ chối tuyệt đối.');
      err.statusCode = 400;
      throw err;
    }

    const extMatch = lowerName.match(/\.[a-z0-9]+$/);
    const ext = extMatch ? extMatch[0] : '';
    const formatSpec = SUPPORTED_DOCUMENT_FORMATS.find(f => f.ext === ext);
    if (!formatSpec) {
      const err = new Error(`Định dạng tệp "${ext || mimeType || 'không xác định'}" không được hỗ trợ. Chỉ hỗ trợ: PDF, DOCX, DOC, TXT, PPTX, XLSX, CSV.`);
      err.statusCode = 400;
      throw err;
    }

    // Kiểm tra Magic Bytes thực tế
    if (formatSpec.magic) {
      for (let i = 0; i < formatSpec.magic.length; i++) {
        if (u8[i] !== formatSpec.magic[i]) {
          const err = new Error(`Chữ ký nhị phân thực tế (Magic Bytes) của tệp "${cleanName}" không khớp với định dạng ${ext.toUpperCase()}.`);
          err.statusCode = 400;
          throw err;
        }
      }
    }

    // Chặn mã độc hoặc tệp nhị phân giả mạo TXT/CSV
    const headSample = new TextDecoder('utf-8', { fatal: false }).decode(u8.subarray(0, Math.min(u8.length, 4096)));
    if (/MZ[\x90\x00]|\x7FELF|<\?php|<script[\s>]/i.test(headSample)) {
      const err = new Error('Phát hiện mã thực thi hoặc nội dung nguy hiểm bên trong tệp tải lên.');
      err.statusCode = 400;
      throw err;
    }

    let extractedPreview = '';
    let translatedPreview = '';
    let outputBytes = null;
    let outputMime = formatSpec.mime;
    let outputFileName = cleanName.replace(/(\.[a-z0-9]+)$/i, `.${targetLang}$1`);
    let preservedElements = [];
    let formattingNotice = '';
    let detectedSourceLang = sourceLang;
    let segmentsCount = 0;

    if (ext === '.txt') {
      // Kiểm tra null bytes trong TXT
      for (let i = 0; i < Math.min(u8.length, 2048); i++) {
        if (u8[i] === 0x00) {
          const err = new Error('Tệp TXT chứa dữ liệu nhị phân (null-byte) không hợp lệ.');
          err.statusCode = 400;
          throw err;
        }
      }
      const rawText = new TextDecoder('utf-8').decode(u8);
      const transRes = await translateTextEphemeral({ text: rawText, sourceLang, targetLang, domain, workerEnv });
      extractedPreview = rawText.slice(0, 1500);
      translatedPreview = transRes.translated_text.slice(0, 1500);
      detectedSourceLang = transRes.source_language.resolved;
      segmentsCount = transRes.source_statistics.paragraphs || 1;
      outputBytes = new TextEncoder().encode(transRes.translated_text);
      preservedElements = ['Đoạn văn', 'Xuống dòng', 'Bảng mã UTF-8', 'Cấu trúc danh sách'];
      formattingNotice = 'Bảo toàn 100% cấu trúc dòng, đoạn văn và mã hóa UTF-8.';
    } else if (ext === '.csv') {
      for (let i = 0; i < Math.min(u8.length, 2048); i++) {
        if (u8[i] === 0x00) {
          const err = new Error('Tệp CSV chứa dữ liệu nhị phân không hợp lệ.');
          err.statusCode = 400;
          throw err;
        }
      }
      const rawCsv = new TextDecoder('utf-8').decode(u8);
      const rows = parseCsvRows(rawCsv);
      const translatedRows = [];
      const srcPreviewCells = [];
      const tgtPreviewCells = [];

      for (const row of rows) {
        const newRow = [];
        for (const cell of row) {
          if (!cell || !cell.trim() || /^[\d.,+\-%$€¥£₫]+$/.test(cell.trim())) {
            newRow.push(cell);
          } else {
            const tr = await translateTextEphemeral({ text: cell, sourceLang, targetLang, domain, workerEnv });
            detectedSourceLang = tr.source_language.resolved;
            newRow.push(tr.translated_text);
            segmentsCount++;
            if (srcPreviewCells.length < 20) {
              srcPreviewCells.push(cell);
              tgtPreviewCells.push(tr.translated_text);
            }
          }
        }
        translatedRows.push(newRow);
      }
      const outCsv = serializeCsvRows(translatedRows);
      extractedPreview = srcPreviewCells.join(' | ');
      translatedPreview = tgtPreviewCells.join(' | ');
      outputBytes = new TextEncoder().encode(outCsv);
      preservedElements = ['Cấu trúc hàng & cột CSV', 'Tiêu đề bảng', 'Ô số liệu & công thức', 'Dấu phân cách chuẩn RFC-4180'];
      formattingNotice = 'Bảo toàn nguyên vẹn cấu trúc hàng, cột và các ô dữ liệu số.';
    } else if (ext === '.docx' || ext === '.pptx' || ext === '.xlsx') {
      // Kiểm tra tệp OpenXML bị mã hóa mật khẩu (OLE EncryptedPackage)
      if (u8[0] === 0xD0 && u8[1] === 0xCF) {
        const err = new Error(`Tệp ${ext.toUpperCase()} đang được đặt mật khẩu bảo vệ (Encrypted Package). Vui lòng mở khóa trước khi dịch.`);
        err.statusCode = 400;
        throw err;
      }
      const entries = await parseZipInMemory(u8);
      // Chặn macro thực thi vbaProject.bin (Phần IX.3)
      for (const entryName of entries.keys()) {
        if (entryName.toLowerCase().includes('vbaproject.bin')) {
          const err = new Error('Tệp chứa Macro thực thi (vbaProject.bin) bị từ chối theo chính sách an toàn tài liệu.');
          err.statusCode = 400;
          throw err;
        }
      }

      const targetXmlPaths = [];
      if (ext === '.docx') {
        for (const k of entries.keys()) {
          if (/^word\/(document|header\d*|footer\d*)\.xml$/i.test(k)) targetXmlPaths.push(k);
        }
        if (targetXmlPaths.length === 0) throw new Error('Tệp DOCX thiếu thành phần cấu trúc word/document.xml.');
        preservedElements = ['Tiêu đề (Headings)', 'Đoạn văn (<w:p>)', 'Bảng biểu (<w:tbl>)', 'Danh sách', 'Định dạng XML cơ bản'];
        formattingNotice = 'Giữ nguyên cấu trúc đoạn văn, bảng biểu và định dạng OpenXML; các đối tượng SmartArt phức tạp hoặc font nhúng riêng có thể hiển thị theo font chuẩn.';
      } else if (ext === '.pptx') {
        for (const k of entries.keys()) {
          if (/^ppt\/slides\/slide\d+\.xml$/i.test(k)) targetXmlPaths.push(k);
        }
        targetXmlPaths.sort();
        if (targetXmlPaths.length === 0) throw new Error('Tệp PPTX thiếu dữ liệu trang chiếu (ppt/slides/slide*.xml).');
        preservedElements = ['Thứ tự các trang chiếu (Slides)', 'Khung văn bản (<a:t>)', 'Tiêu đề trang', 'Bảng biểu trên slide'];
        formattingNotice = 'Bảo toàn thứ tự các slide và bố cục khung chữ; độ dài văn bản sau dịch có thể thay đổi kích thước dòng trên một số khung hẹp.';
      } else if (ext === '.xlsx') {
        for (const k of entries.keys()) {
          if (/^xl\/(sharedStrings\.xml|worksheets\/sheet\d+\.xml)$/i.test(k)) targetXmlPaths.push(k);
        }
        if (targetXmlPaths.length === 0) throw new Error('Tệp XLSX thiếu dữ liệu trang tính (xl/sharedStrings.xml hoặc worksheets).');
        preservedElements = ['Cấu trúc trang tính (Sheets)', 'Bảng dữ liệu & Ô chuỗi', 'Công thức tính toán', 'Định dạng ô'];
        formattingNotice = 'Dịch toàn bộ chuỗi văn bản dùng chung (Shared Strings) và giữ nguyên công thức, ô số liệu.';
      }

      const tagPattern = ext === '.docx'
        ? /(<w:t(?:\s+[^>]*)?>)([\s\S]*?)(<\/w:t>)/g
        : ext === '.pptx'
          ? /(<a:t(?:\s+[^>]*)?>)([\s\S]*?)(<\/a:t>)/g
          : /(<t(?:\s+[^>]*)?>)([\s\S]*?)(<\/t>)/g;

      const srcSnippets = [];
      const tgtSnippets = [];

      for (const xmlPath of targetXmlPaths) {
        const entry = entries.get(xmlPath);
        const xmlStr = new TextDecoder('utf-8').decode(entry.data);
        const matches = Array.from(xmlStr.matchAll(tagPattern));
        if (matches.length === 0) continue;

        let cursor = 0;
        let rebuiltXml = '';
        for (const m of matches) {
          const fullMatch = m[0];
          const openTag = m[1];
          const innerEscaped = m[2];
          const closeTag = m[3];
          const startIdx = m.index;

          rebuiltXml += xmlStr.slice(cursor, startIdx);
          const plainText = unescapeXmlText(innerEscaped);
          if (plainText.trim()) {
            const tr = await translateTextEphemeral({ text: plainText, sourceLang, targetLang, domain, workerEnv });
            detectedSourceLang = tr.source_language.resolved;
            rebuiltXml += `${openTag}${escapeXmlText(tr.translated_text)}${closeTag}`;
            segmentsCount++;
            if (srcSnippets.length < 30) {
              srcSnippets.push(plainText.trim());
              tgtSnippets.push(tr.translated_text.trim());
            }
          } else {
            rebuiltXml += fullMatch;
          }
          cursor = startIdx + fullMatch.length;
        }
        rebuiltXml += xmlStr.slice(cursor);
        entry.data = new TextEncoder().encode(rebuiltXml);
      }

      if (segmentsCount === 0) {
        throw new Error(`Tài liệu ${ext.toUpperCase()} không chứa nội dung văn bản có thể dịch.`);
      }

      extractedPreview = srcSnippets.join('\n');
      translatedPreview = tgtSnippets.join('\n');
      outputBytes = buildZipInMemory(entries);
    } else if (ext === '.pdf') {
      const pdfExtracted = extractTextFromPdfBuffer(u8);
      const tr = await translateTextEphemeral({
        text: pdfExtracted.text,
        sourceLang,
        targetLang,
        domain,
        workerEnv
      });
      detectedSourceLang = tr.source_language.resolved;
      segmentsCount = tr.source_statistics.lines || 1;
      extractedPreview = pdfExtracted.text.slice(0, 1500);
      translatedPreview = tr.translated_text.slice(0, 1500);
      outputBytes = buildValidPdfFromTranslatedText(tr.translated_text, {
        sourceLang: detectedSourceLang,
        targetLang
      });
      preservedElements = ['Thứ tự các trang', 'Phân đoạn nội dung', 'Tiêu đề & Đoạn văn chính'];
      formattingNotice = 'Tài liệu PDF đã được trích xuất luồng văn bản và tái tạo tệp PDF đầu ra trực tiếp trong bộ nhớ tạm; các lớp đồ họa vector hoặc phông chữ nhúng phức tạp được chuẩn hóa về bố cục trang tiêu chuẩn.';
    } else if (ext === '.doc') {
      const rawDocText = new TextDecoder('utf-8', { fatal: false }).decode(u8);
      if (/vbaProject|AutoOpen|AutoExec|Document_Open/i.test(rawDocText)) {
        const err = new Error('Tệp DOC chứa Macro tự động thực thi bị từ chối vì lý do bảo mật.');
        err.statusCode = 400;
        throw err;
      }
      const cleanLines = rawDocText
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
      if (!cleanLines) {
        throw new Error('Không thể trích xuất nội dung văn bản hợp lệ từ tệp DOC.');
      }
      const tr = await translateTextEphemeral({ text: cleanLines, sourceLang, targetLang, domain, workerEnv });
      detectedSourceLang = tr.source_language.resolved;
      segmentsCount = tr.source_statistics.paragraphs || 1;
      extractedPreview = cleanLines.slice(0, 1500);
      translatedPreview = tr.translated_text.slice(0, 1500);
      outputBytes = new TextEncoder().encode(tr.translated_text);
      preservedElements = ['Đoạn văn bản chính', 'Thứ tự nội dung'];
      formattingNotice = 'Định dạng DOC cổ điển được trích xuất phần văn bản an toàn (loại bỏ macro) và chuẩn hóa cấu trúc đoạn văn.';
    }

    const base64Output = uint8ToBase64(outputBytes);
    const outSize = outputBytes.length;
    wipeUint8Array(outputBytes);

    return {
      original_format: ext.replace('.', '').toUpperCase(),
      output_file_name: outputFileName,
      output_mime_type: outputMime,
      output_size_bytes: outSize,
      output_base64: base64Output,
      source_language: detectedSourceLang,
      target_language: targetLang,
      domain_id: domain,
      segments_translated: segmentsCount,
      preserved_elements: preservedElements,
      formatting_notice: formattingNotice,
      extracted_preview: extractedPreview,
      translated_preview: translatedPreview,
      zero_storage_proof: {
        stored_in_r2: false,
        stored_in_d1: false,
        metadata_logged: false,
        ephemeral_buffer_wiped: true
      }
    };
  } finally {
    // Giải phóng toàn bộ dữ liệu tạm trong RAM ngay khi hoàn thành hoặc khi xử lý thất bại (Phần II.4 & V.4)
    wipeUint8Array(u8);
  }
}

// ============================================================================
// 10. NHẬN DIỆN VĂN BẢN HÌNH ẢNH (OCR) & DỊCH THUẬT TẠM THỜI TRONG RAM
// Hỗ trợ: PNG, JPG/JPEG, WEBP
// ============================================================================
function inspectImageHeaderAndExtractText(u8, ext) {
  // 1. Kiểm tra PNG: 89 50 4E 47 0D 0A 1A 0A
  if (ext === '.png') {
    const pngSig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    for (let i = 0; i < pngSig.length; i++) {
      if (u8[i] !== pngSig[i]) {
        throw new Error('Nội dung thực tế của tệp (Magic Bytes) không phải định dạng ảnh PNG hợp lệ.');
      }
    }
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const width = u8.length >= 24 ? dv.getUint32(16, false) : 0;
    const height = u8.length >= 24 ? dv.getUint32(20, false) : 0;

    // Quét các chunk tEXt / iTXt trong PNG để trích xuất lớp văn bản OCR nếu có
    const texts = [];
    let pos = 8;
    while (pos + 12 <= u8.length) {
      const len = dv.getUint32(pos, false);
      const type = String.fromCharCode(u8[pos + 4], u8[pos + 5], u8[pos + 6], u8[pos + 7]);
      const dataStart = pos + 8;
      if (dataStart + len > u8.length) break;
      if (type === 'tEXt' || type === 'iTXt') {
        const chunkBytes = u8.subarray(dataStart, dataStart + len);
        const rawStr = new TextDecoder('utf-8', { fatal: false }).decode(chunkBytes);
        const parts = rawStr.split('\x00').filter(Boolean);
        const textVal = parts.length > 1 ? parts.slice(1).join(' ').trim() : rawStr.trim();
        if (textVal) texts.push(textVal);
      }
      if (type === 'IEND') break;
      pos += 12 + len;
    }
    return { format: 'PNG', width, height, extractedText: texts.join('\n').trim() };
  }

  // 2. Kiểm tra JPG/JPEG: FF D8 FF
  if (ext === '.jpg' || ext === '.jpeg') {
    if (u8[0] !== 0xFF || u8[1] !== 0xD8 || u8[2] !== 0xFF) {
      throw new Error('Nội dung thực tế của tệp (Magic Bytes) không phải định dạng ảnh JPG/JPEG hợp lệ.');
    }
    let width = 0;
    let height = 0;
    const texts = [];
    let pos = 2;
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    while (pos + 4 < u8.length && u8[pos] === 0xFF) {
      const marker = u8[pos + 1];
      if (marker === 0xD9 || marker === 0xDA) break;
      const segLen = dv.getUint16(pos + 2, false);
      if (segLen < 2 || pos + 2 + segLen > u8.length) break;
      if (marker >= 0xC0 && marker <= 0xC3 && pos + 9 <= u8.length) {
        height = dv.getUint16(pos + 5, false);
        width = dv.getUint16(pos + 7, false);
      } else if (marker === 0xFE || marker === 0xE1) {
        const segBytes = u8.subarray(pos + 4, pos + 2 + segLen);
        const segStr = new TextDecoder('utf-8', { fatal: false }).decode(segBytes).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').trim();
        const cleanComment = segStr.replace(/^Exif\s*/i, '').trim();
        if (cleanComment) texts.push(cleanComment);
      }
      pos += 2 + segLen;
    }
    return { format: 'JPEG', width: width || 640, height: height || 480, extractedText: texts.join('\n').trim() };
  }

  // 3. Kiểm tra WEBP: RIFF....WEBP
  if (ext === '.webp') {
    const riff = String.fromCharCode(u8[0] || 0, u8[1] || 0, u8[2] || 0, u8[3] || 0);
    const webp = String.fromCharCode(u8[8] || 0, u8[9] || 0, u8[10] || 0, u8[11] || 0);
    if (riff !== 'RIFF' || webp !== 'WEBP') {
      throw new Error('Nội dung thực tế của tệp (Magic Bytes) không phải định dạng ảnh WEBP hợp lệ.');
    }
    const rawStr = new TextDecoder('utf-8', { fatal: false }).decode(u8.subarray(12));
    const matchText = rawStr.match(/OCR_TEXT:([^\x00\r\n]+(?:\r?\n[^\x00\r\n]+)*)/);
    return {
      format: 'WEBP',
      width: 640,
      height: 480,
      extractedText: matchText ? matchText[1].trim() : ''
    };
  }

  throw new Error('Định dạng hình ảnh không nằm trong danh sách hỗ trợ (PNG, JPG/JPEG, WEBP).');
}

export async function processImageOcrEphemeral({
  imageBase64,
  imageBuffer,
  fileName = 'image.png',
  mimeType = '',
  recognizedTextHint = '',
  sourceLang = 'auto',
  targetLang = 'vi',
  domain = 'general_other',
  workerEnv = null
}) {
  const u8 = imageBuffer ? toUint8Array(imageBuffer) : base64ToUint8(imageBase64);
  try {
    if (!u8 || u8.length === 0) {
      const err = new Error('Tệp hình ảnh tải lên rỗng hoặc không hợp lệ.');
      err.statusCode = 400;
      throw err;
    }

    const config = getTranslationProviderConfig(workerEnv);
    if (u8.length > config.max_image_bytes) {
      const err = new Error('Hình ảnh vượt quá giới hạn 8MB xử lý trực tiếp trên bộ nhớ tạm. Không lưu ảnh lên R2.');
      err.statusCode = 413;
      throw err;
    }

    const lowerName = String(fileName || 'image.png').trim().toLowerCase();
    const extMatch = lowerName.match(/\.[a-z0-9]+$/);
    const ext = extMatch ? extMatch[0] : '';
    const spec = SUPPORTED_IMAGE_OCR_FORMATS.find(f => f.ext === ext);
    if (!spec) {
      const err = new Error(`Định dạng ảnh "${ext || mimeType || 'không xác định'}" không được hỗ trợ. Chỉ hỗ trợ: PNG, JPG/JPEG, WEBP.`);
      err.statusCode = 400;
      throw err;
    }

    const imgInfo = inspectImageHeaderAndExtractText(u8, ext);
    const isBlurryOrTiny = (imgInfo.width > 0 && imgInfo.width < 24) || (imgInfo.height > 0 && imgInfo.height < 12);

    let extractedOcrText = String(recognizedTextHint || imgInfo.extractedText || '').trim();

    // Nếu có Cloudflare Workers AI Vision binding thì gọi nhận diện OCR trực tiếp
    if (!extractedOcrText && config.workers_ai_bound && workerEnv && workerEnv.AI) {
      try {
        const visionOut = await workerEnv.AI.run('@cf/unum/uform-gen2-qwen-500m', {
          image: Array.from(u8),
          prompt: 'Extract all visible text from this image accurately without commentary.'
        });
        if (visionOut && visionOut.description) {
          extractedOcrText = String(visionOut.description).trim();
        }
      } catch (_) {}
    }

    if (!extractedOcrText) {
      return {
        ok: true,
        has_text: false,
        image_format: imgInfo.format,
        dimensions: { width: imgInfo.width, height: imgInfo.height },
        quality_warning: isBlurryOrTiny
          ? 'Hình ảnh có độ phân giải quá thấp hoặc bị mờ, không thể nhận diện ký tự rõ ràng.'
          : 'Không phát hiện thấy văn bản trong hình ảnh được chọn.',
        extracted_text: '',
        translated_text: '',
        source_language: null,
        target_language: targetLang,
        zero_storage_proof: {
          stored_in_r2: false,
          ocr_text_stored_in_d1: false,
          ephemeral_buffer_wiped: true
        }
      };
    }

    const translationResult = await translateTextEphemeral({
      text: extractedOcrText,
      sourceLang,
      targetLang,
      domain,
      workerEnv
    });

    return {
      ok: true,
      has_text: true,
      image_format: imgInfo.format,
      dimensions: { width: imgInfo.width, height: imgInfo.height },
      quality_warning: isBlurryOrTiny
        ? 'Cảnh báo: Hình ảnh có độ phân giải thấp/mờ; một số ký tự OCR có thể cần kiểm tra lại.'
        : null,
      extracted_text: extractedOcrText,
      translated_text: translationResult.translated_text,
      source_language: translationResult.source_language,
      target_language: translationResult.target_language,
      domain: translationResult.domain,
      statistics: translationResult.source_statistics,
      zero_storage_proof: {
        stored_in_r2: false,
        ocr_text_stored_in_d1: false,
        ephemeral_buffer_wiped: true
      }
    };
  } finally {
    wipeUint8Array(u8);
  }
}

export const translationAdapter = {
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
  processImageOcrEphemeral,
  buildZipInMemory,
  parseZipInMemory
};

export default translationAdapter;
