'use strict';

/* ======================= ثابت‌ها و تنظیمات ======================= */
const $ = (s) => document.querySelector(s);
const MAX_BYTES = 30 * 1024 * 1024;
const MAX_MEDIA = 15 * 1024 * 1024;
const MAX_CHARS = 120000;
const DEFAULT_ASK = 'محتوای فایل‌های پیوست را بررسی کن و خلاصه‌ای از آن‌ها بده.';
const DEFAULT_PROMPT =
  "You are a helpful assistant. The user attaches files; their extracted content appears inside the user's message " +
  "between '=== فایل' markers. Answer based on the files, point to the relevant parts, say clearly if the answer " +
  'is not in the files, and reply in the same language as the user\'s question.';

const PROVIDERS = {
  openai: {
    label: 'OpenAI و سازگارها (OpenRouter، AnyRouter، DeepSeek، ...)',
    base: 'https://api.openai.com/v1', model: 'gpt-4o-mini',
    hint: 'مثال: https://openrouter.ai/api/v1 — برنامه خودش /chat/completions را اضافه می‌کند.'
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    base: 'https://api.anthropic.com', model: 'claude-sonnet-5-5',
    hint: 'آدرس پیش‌فرض را فقط برای پراکسی/گیت‌وی عوض کنید.'
  },
  gemini: {
    label: 'Google Gemini',
    base: 'https://generativelanguage.googleapis.com', model: 'gemini-2.5-flash',
    hint: 'Gemini علاوه بر متن و تصویر، فایل صوتی و ویدیویی را هم می‌خواند.'
  }
};

const CDN = {
  pdf: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  pdfWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  mammoth: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
  xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  jszip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
};

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'];
const MEDIA_MIME = {
  mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', ogg: 'audio/ogg', flac: 'audio/flac', aac: 'audio/aac',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', '3gp': 'video/3gpp'
};

/* ======================= وضعیت و تنظیمات — دقیقاً بر مشخصات ArsinLia 0.0.20 ======================= */
const LANGS = {
  fa: { dir: 'rtl', name: 'فارسی' }, en: { dir: 'ltr', name: 'English' }, ar: { dir: 'rtl', name: 'العربية' }
};
/* برچسب‌ها: فارسی دقیقاً رشته‌های خود ArsinLia 0.0.20 است */
const STR = {
  fa: {
    settings: 'تنظیمات', aiHub: '⚙️ تنظیمات هوش مصنوعی', providers: 'ارائه دهندگان هوش مصنوعی',
    colorsThemes: '🎨 رنگ و تم‌ها', subTheme: 'تم', themeLight: 'روشن', themeDark: 'تیره', themeSystem: 'سیستم',
    userBubble: 'رنگ حباب پیام‌های شما', aiBubble: 'رنگ پیام هوش مصنوعی', chatBg: 'رنگ پس‌زمینه‌ی گفتگو',
    titleOptionsColor: 'رنگ عناوین و گزینه‌ها', followSystem: '🌓 پیروی از تم سیستم',
    customHex: 'کد هگز دلخواه (مثل ‎#2E7D8A‎)', invalidHex: 'کد هگز نامعتبر است',
    memorySection: '🧠 حافظه‌ی بلندمدت', memoryInChat: 'استفاده از حافظه در گفتگو',
    memoryAuto: 'استخراج خودکار با AI', memoryAutoHint: 'وقتی روشن باشد، بعد از چند پیام، نکات مهم درباره‌ی شما به‌صورت خودکار در حافظه ذخیره می‌شود.',
    languageSection: '🌐 زبان', crashSection: 'گزارش کرش', crashShow: 'نمایش آخرین گزارش کرش',
    crashEmpty: 'کرشی ثبت نشده است.', crashCopy: 'کپی', close: 'بستن', back: 'بازگشت',
    addProvider: 'افزودن ارائه‌دهنده‌ی تازه', editProvider: 'ویرایش ارائه‌دهنده',
    pName: 'نام ارائه‌دهنده (مثلاً: سرور خانگی)', pBase: 'Base URL (قابل ویرایش)', pBasePh: 'https://api.openai.com/v1',
    pKey: 'کلید API (رمزنگاری‌شده ذخیره می‌شود)', pModel: 'نام مدل متنی', pModelPh: 'gpt-4o-mini',
    loadModels: 'بارگذاری مدل‌ها', loadKeyHint: 'ابتدا کلید API را وارد کنید',
    modelRole: 'راهبرد پاسخگویی مدل', roleFast: 'سریع', roleBalanced: 'متعادل', roleQuality: 'دقیق',
    saveAi: '💾 ذخیره‌ی تنظیمات هوش مصنوعی', cancel: 'انصراف', del: 'حذف', save: 'ذخیره',
    provEmpty: 'هنوز ارائه‌دهنده‌ای ذخیره نشده است.', delProvTitle: 'حذف ارائه‌دهنده',
    delProvMsg: 'حذف شود؟ کلید ذخیره‌شده‌ی آن هم پاک می‌شود.',
    modelSelectTitle: 'انتخاب مدل', modelSearch: 'جستجوی مدل…', modelLoading: 'در حال بارگذاری مدل‌ها…',
    modelNoResults: 'مدلی یافت نشد', connFail: 'اتصال ممکن نشد: ', fillAll: 'نام، آدرس پایه و مدل را کامل کنید', saved: 'ذخیره شد',
    menuSettings: 'تنظیمات', menuAbout: 'درباره‌ی FileChat', menuHistory: 'تاریخچه گفتگوها',
    newChat: 'گفتگوی جدید', deleteChat: 'حذف گفتگو', delChatTitle: 'حذف گفتگو',
    delChatMsg: 'این گفتگو و همه‌ی پیام‌هایش حذف شود؟', rename: 'تغییر نام', renameTitle: 'تغییر نام گفتگو',
    renameLabel: 'نام جدید گفتگو', shareThread: 'اشتراک گفتگو',
    emptyList: 'هنوز گفت‌وگویی نداری. یکی شروع کن!', greeting: 'سلام! من FileChat هستم',
    inputHint: 'پیامت رو بنویس…', chooseModel: 'انتخاب مدل', modelSearchHint: 'جستجوی مدل…',
    modelSearchEmpty: 'مدلی با این نام پیدا نشد', modelFetchFailed: 'بارگذاری مدل‌های این ارائه‌دهنده ناموفق بود', retry: 'تلاش مجدد',
    sources: 'منابع', copy: 'کپی', copied: 'کپی شد', copyFail: 'کپی ممکن نشد', resend: 'ارسال مجدد',
    attach: 'پیوست فایل', send: 'ارسال', stopGen: 'توقف تولید', untitled: 'گفتگوی بدون عنوان',
    readingFile: 'در حال خواندن فایل...', readFail: 'خواندن فایل ناموفق بود', emptyAnswer: '(پاسخ خالی دریافت شد)',
    keyFirst: 'ابتدا از تنظیمات یک ارائه‌دهنده اضافه کنید', colorDone: 'انجام شد؛ رنگ تغییر کرد.',
    viewEnable: 'فعال‌کردن در پاسخ‌ها', viewDisable: 'غیرفعال‌کردن در پاسخ‌ها', viewNone: '(متن قابل نمایشی برای این فایل در حافظه نیست)',
    fileOff: ' (غیرفعال)', install: 'نصب برنامه',
    aboutTagline: 'چت با فایل‌های شما', aboutVersion: 'نسخه', aboutVersionVal: '۶٫۰',
    aboutText: 'FileChat با فایل‌های شما گفتگو می‌کند: PDF و اسناد را کامل می‌خواند و برای هر سؤال، بخش مرتبط از متن کامل را پیدا می‌کند و بر همان اساس پاسخ می‌دهد. به ارائه‌دهنده‌هایی که خودتان با نشانی و کلید اضافه می‌کنید وصل می‌شود؛ کلید فقط در حافظه‌ی همین دستگاه می‌ماند.'
  },
  en: {
    settings: 'Settings', aiHub: '⚙️ AI settings', providers: 'AI providers',
    colorsThemes: '🎨 Colors & themes', subTheme: 'Theme', themeLight: 'Light', themeDark: 'Dark', themeSystem: 'System',
    userBubble: 'Your message bubble color', aiBubble: 'AI message color', chatBg: 'Chat background color',
    titleOptionsColor: 'Titles & options color', followSystem: '🌓 Follow system theme',
    customHex: 'Custom hex code (e.g. #2E7D8A)', invalidHex: 'Invalid hex code',
    memorySection: '🧠 Long-term memory', memoryInChat: 'Use memory in chat',
    memoryAuto: 'Automatic extraction with AI', memoryAutoHint: 'When on, after a few messages, key facts about you are stored automatically.',
    languageSection: '🌐 Language', crashSection: 'Crash report', crashShow: 'Show latest crash report',
    crashEmpty: 'No crash recorded.', crashCopy: 'Copy', close: 'Close', back: 'Back',
    addProvider: 'Add new provider', editProvider: 'Edit provider',
    pName: 'Provider name (e.g. Home server)', pBase: 'Base URL (editable)', pBasePh: 'https://api.openai.com/v1',
    pKey: 'API key (stored encrypted)', pModel: 'Text model name', pModelPh: 'gpt-4o-mini',
    loadModels: 'Load models', loadKeyHint: 'Enter the API key first',
    modelRole: 'Model response strategy', roleFast: 'Fast', roleBalanced: 'Balanced', roleQuality: 'Precise',
    saveAi: '💾 Save AI settings', cancel: 'Cancel', del: 'Delete', save: 'Save',
    provEmpty: 'No provider saved yet.', delProvTitle: 'Delete provider',
    delProvMsg: 'Delete? Its saved key will be removed too.',
    modelSelectTitle: 'Select model', modelSearch: 'Search models…', modelLoading: 'Loading models…',
    modelNoResults: 'No model found', connFail: 'Connection failed: ', fillAll: 'Complete name, base URL and model', saved: 'Saved',
    menuSettings: 'Settings', menuAbout: 'About FileChat', menuHistory: 'Chat history',
    newChat: 'New chat', deleteChat: 'Delete chat', delChatTitle: 'Delete chat',
    delChatMsg: 'Delete this chat and all its messages?', rename: 'Rename', renameTitle: 'Rename chat',
    renameLabel: 'New chat name', shareThread: 'Share chat',
    emptyList: 'No chats yet. Start one!', greeting: 'Hi! I am FileChat',
    inputHint: 'Write your message…', chooseModel: 'Choose model', modelSearchHint: 'Search models…',
    modelSearchEmpty: 'No model with this name', modelFetchFailed: 'Loading this provider’s models failed', retry: 'Retry',
    sources: 'Sources', copy: 'Copy', copied: 'Copied', copyFail: 'Copy failed', resend: 'Resend',
    attach: 'Attach file', send: 'Send', stopGen: 'Stop generating', untitled: 'Untitled chat',
    readingFile: 'Reading file...', readFail: 'Could not read the file', emptyAnswer: '(empty reply)',
    keyFirst: 'First add a provider in Settings', colorDone: 'Done; color changed.',
    viewEnable: 'Enable in answers', viewDisable: 'Disable in answers', viewNone: '(no displayable text stored for this file)',
    fileOff: ' (off)', install: 'Install app',
    aboutTagline: 'Chat with your files', aboutVersion: 'Version', aboutVersionVal: '6.0',
    aboutText: 'FileChat chats with your files: it reads PDFs and documents in full and, for each question, finds the relevant part of the complete text and answers from it. It connects to providers you add with your own URL and key; keys stay only on this device.'
  },
  ar: {
    settings: 'الإعدادات', aiHub: '⚙️ إعدادات الذكاء الاصطناعي', providers: 'مقدمو الذكاء الاصطناعي',
    colorsThemes: '🎨 الألوان والسمات', subTheme: 'السمة', themeLight: 'فاتح', themeDark: 'داكن', themeSystem: 'النظام',
    userBubble: 'لون فقاعة رسائلك', aiBubble: 'لون رسالة الذكاء الاصطناعي', chatBg: 'لون خلفية المحادثة',
    titleOptionsColor: 'لون العناوين والخيارات', followSystem: '🌓 اتباع سمة النظام',
    customHex: 'كود سداسي مخصص (مثل #2E7D8A)', invalidHex: 'كود سداسي غير صالح',
    memorySection: '🧠 الذاكرة طويلة الأمد', memoryInChat: 'استخدام الذاكرة في المحادثة',
    memoryAuto: 'الاستخراج التلقائي بالذكاء الاصطناعي', memoryAutoHint: 'عند التشغيل، تحفظ النقاط المهمة عنك تلقائيا بعد بضع رسائل.',
    languageSection: '🌐 اللغة', crashSection: 'تقرير الأعطال', crashShow: 'عرض آخر تقرير عطل',
    crashEmpty: 'لا عطل مسجل.', crashCopy: 'نسخ', close: 'إغلاق', back: 'رجوع',
    addProvider: 'إضافة مقدم جديد', editProvider: 'تعديل المقدم',
    pName: 'اسم المقدم (مثلا: خادم منزلي)', pBase: 'Base URL (قابل للتحرير)', pBasePh: 'https://api.openai.com/v1',
    pKey: 'مفتاح API (يحفظ مشفرا)', pModel: 'اسم النموذج النصي', pModelPh: 'gpt-4o-mini',
    loadModels: 'تحميل النماذج', loadKeyHint: 'أدخل مفتاح API أولا',
    modelRole: 'استراتيجية رد النموذج', roleFast: 'سريع', roleBalanced: 'متوازن', roleQuality: 'دقيق',
    saveAi: '💾 حفظ إعدادات الذكاء الاصطناعي', cancel: 'إلغاء', del: 'حذف', save: 'حفظ',
    provEmpty: 'لا مقدم محفوظ بعد.', delProvTitle: 'حذف المقدم',
    delProvMsg: 'يحذف؟ سيحذف مفتاحه المحفوظ أيضا.',
    modelSelectTitle: 'اختيار النموذج', modelSearch: 'بحث النماذج…', modelLoading: 'جار تحميل النماذج…',
    modelNoResults: 'لم يعثر على نموذج', connFail: 'فشل الاتصال: ', fillAll: 'أكمل الاسم والعنوان والنموذج', saved: 'تم الحفظ',
    menuSettings: 'الإعدادات', menuAbout: 'حول FileChat', menuHistory: 'سجل المحادثات',
    newChat: 'محادثة جديدة', deleteChat: 'حذف المحادثة', delChatTitle: 'حذف المحادثة',
    delChatMsg: 'حذف هذه المحادثة وكل رسائلها؟', rename: 'إعادة التسمية', renameTitle: 'إعادة تسمية المحادثة',
    renameLabel: 'اسم المحادثة الجديد', shareThread: 'مشاركة المحادثة',
    emptyList: 'لا محادثات بعد. ابدأ واحدة!', greeting: 'مرحبا! أنا FileChat',
    inputHint: 'اكتب رسالتك…', chooseModel: 'اختيار النموذج', modelSearchHint: 'بحث النماذج…',
    modelSearchEmpty: 'لا نموذج بهذا الاسم', modelFetchFailed: 'فشل تحميل نماذج هذا المقدم', retry: 'إعادة المحاولة',
    sources: 'المصادر', copy: 'نسخ', copied: 'تم النسخ', copyFail: 'فشل النسخ', resend: 'إعادة الإرسال',
    attach: 'إرفاق ملف', send: 'إرسال', stopGen: 'إيقاف التوليد', untitled: 'محادثة بلا عنوان',
    readingFile: 'جار قراءة الملف...', readFail: 'تعذرت قراءة الملف', emptyAnswer: '(رد فارغ)',
    keyFirst: 'أضف مقدما أولا من الإعدادات', colorDone: 'تم؛ تغير اللون.',
    viewEnable: 'التفعيل في الردود', viewDisable: 'التعطيل في الردود', viewNone: '(لا نص محفوظ لهذا الملف)',
    fileOff: ' (معطل)', install: 'تثبيت التطبيق',
    aboutTagline: 'الدردشة مع ملفاتك', aboutVersion: 'الإصدار', aboutVersionVal: '٦٫٠',
    aboutText: 'FileChat يدردش مع ملفاتك: يقرأ ملفات PDF والمستندات كاملة ويجد لكل سؤال الجزء المناسب من النص الكامل ويجيب بناء عليه. يتصل بالمقدمين الذين تضيفهم بعنوانك ومفتاحك؛ تبقى المفاتيح على هذا الجهاز فقط.'
  }
};
function t(k) { const L = STR[settings.lang] || STR.fa; return L[k] || STR.fa[k] || k; }

let uidC = Date.now() % 100000;
function uid() { return 'x' + (++uidC).toString(36) + Date.now().toString(36).slice(-3); }
function t0(type) { return type === 'anthropic' ? 'Anthropic' : type === 'gemini' ? 'Gemini' : 'OpenAI'; }
/* تشخیص خودکار پروتکل از روی نشانی — مثل ArsinLia، پشت صحنه و بدون فیلد در فرم */
function detectType(baseUrl, fallback) {
  const u = String(baseUrl || '').toLowerCase();
  if (u.includes('anthropic') || u.includes('claude')) return 'anthropic';
  if (u.includes('generativelanguage.googleapis') || u.includes('gemini')) return 'gemini';
  return fallback && PROVIDERS[fallback] ? fallback : 'openai';
}

const ROLE_TEMP = { fast: 0.3, balanced: 0.7, quality: 1.0 };
function defaultSettings() {
  return {
    v: 3, providers: [], systemPrompt: DEFAULT_PROMPT, pdfAsImages: false,
    theme: 'dark', lang: 'fa', memory: true, memoryAuto: false,
    colors: { me: '#2E7D32', ai: '#2A2A4A', bg: '#000000', title: '#FFFFFF' }
  };
}
function loadSettings() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem('fc.settings') || 'null'); } catch (e) { /* ignore */ }
  const d = defaultSettings();
  if (s && s.v === 3 && Array.isArray(s.providers)) {
    return Object.assign(d, s, { colors: Object.assign(d.colors, s.colors || {}) });
  }
  if (s && s.v === 2 && Array.isArray(s.providers)) {
    d.providers = s.providers.map((p) => ({ role: 'balanced', models: [], ...p }));
    d.theme = (s.theme === 'light' || s.theme === 'dark') ? s.theme : 'dark'; d.lang = s.lang || 'fa'; d.memory = s.memory !== false;
    if (s.colors) {
      if (s.colors.me) d.colors.me = s.colors.me;
      if (s.colors.ai) d.colors.bg = s.colors.ai;
    }
    return d;
  }
  if (s && PROVIDERS[s.provider]) {
    d.providers = [{
      id: uid(), name: t0(s.provider), type: s.provider,
      baseUrl: s.baseUrl || PROVIDERS[s.provider].base, apiKey: s.apiKey || '',
      model: s.model || PROVIDERS[s.provider].model, models: [], role: 'balanced'
    }];
    d.systemPrompt = s.systemPrompt || d.systemPrompt;
    return d;
  }
  return d;
}
function saveSettings() { try { localStorage.setItem('fc.settings', JSON.stringify(settings)); } catch (e) { /* ignore */ } }

/* گفتگوها (رشته‌ها) */
function newThread() { return { id: uid(), title: '', sel: null, messages: [] }; }
function slimThread(th, withText) {
  return {
    id: th.id, title: th.title, sel: th.sel,
    messages: th.messages.map((m) => ({
      role: m.role, text: m.text, sources: m.sources,
      files: (m.files || []).map((f) => ({
        name: f.name, note: f.note, off: f.off, pages: f.pages,
        text: withText ? f.text : undefined,
        imageCount: (f.images || []).length || f.imageCount || 0,
        hadMedia: !!f.media || !!f.hadMedia
      }))
    }))
  };
}
function loadThreads() {
  try {
    const a = JSON.parse(localStorage.getItem('fc.threads') || 'null');
    if (Array.isArray(a) && a.length) return a;
  } catch (e) { /* ignore */ }
  try {
    const old = JSON.parse(localStorage.getItem('fc.chat') || 'null');
    if (Array.isArray(old) && old.length) { const th = newThread(); th.messages = old; return [th]; }
  } catch (e) { /* ignore */ }
  return [newThread()];
}
function saveThreads() {
  try { localStorage.setItem('fc.threads', JSON.stringify(threads.map((x) => slimThread(x, true)))); }
  catch (e) {
    try { localStorage.setItem('fc.threads', JSON.stringify(threads.map((x) => slimThread(x, false)))); } catch (e2) { /* ignore */ }
  }
}

let settings = loadSettings();
let threads = loadThreads();
let curId = threads[0].id;
try { const c = localStorage.getItem('fc.cur'); if (c && threads.some((x) => x.id === c)) curId = c; } catch (e) { /* ignore */ }
function cur() { return threads.find((x) => x.id === curId) || threads[0]; }
function setCur(id) { curId = id; try { localStorage.setItem('fc.cur', id); } catch (e) { /* ignore */ } }

let pending = [];
let processing = 0;
let busy = false;
let abortCtl = null;
let lastError = null;

function providerById(id) { return settings.providers.find((p) => p.id === id) || null; }
function activeProviders() { return settings.providers.slice(); }
function currentSel() {
  const th = cur();
  if (th.sel && providerById(th.sel.providerId)) return th.sel;
  const ap = activeProviders();
  if (!ap.length) return null;
  const p = ap[0];
  return { providerId: p.id, model: p.model || (p.models && p.models[0]) || '' };
}
function effSettings() {
  const sel = currentSel();
  if (!sel) return null;
  const p = providerById(sel.providerId);
  if (!p) return null;
  return {
    provider: detectType(p.baseUrl, p.type), baseUrl: p.baseUrl, apiKey: p.apiKey || '',
    model: sel.model || p.model, systemPrompt: settings.systemPrompt,
    temperature: ROLE_TEMP[p.role] ?? 0.7
  };
}

/* ======= رنگ: دقیقاً الگوریتم‌های تم ArsinLia ======= */
function parseHex(hex) {
  const h = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
}
function relLum(rgb) {
  const ch = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * ch(rgb[0]) + 0.7152 * ch(rgb[1]) + 0.0722 * ch(rgb[2]);
}
function contrast(fg, bg) {
  const l1 = relLum(fg) + 0.05, l2 = relLum(bg) + 0.05;
  return Math.max(l1, l2) / Math.min(l1, l2);
}
function toHex(rgb) { return '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join(''); }
/* محافظ خواناییِ حفظ‌کننده‌ی فام — همان nudgeReadable آرسین‌لیا (آستانه ۳) */
function nudgeReadable(fgHex, bgHex, minRatio) {
  minRatio = minRatio || 3.0;
  const fg = parseHex(fgHex), bg = parseHex(bgHex);
  if (!fg || !bg) return fgHex;
  if (contrast(fg, bg) >= minRatio) return fgHex;
  const target = relLum(bg) < 0.4 ? [1, 1, 1] : [0, 0, 0];
  let c = fg.slice();
  for (let i = 0; i < 32; i++) {
    c = c.map((v, j) => v + (target[j] - v) * 0.18);
    if (contrast(c, bg) >= minRatio) return toHex(c);
  }
  return contrast([1, 1, 1], bg) >= contrast([0, 0, 0], bg) ? '#ffffff' : '#000000';
}
function ensureReadable(fgHex, bgHex) {
  const fg = parseHex(fgHex), bg = parseHex(bgHex);
  if (!fg || !bg) return fgHex;
  if (contrast(fg, bg) >= 4.5) return fgHex;
  return contrast([1, 1, 1], bg) >= contrast([0, 0, 0], bg) ? '#ffffff' : '#000000';
}
function onAccent(hex) {
  const rgb = parseHex(hex); if (!rgb) return '#ffffff';
  return contrast([1, 1, 1], rgb) >= contrast([0, 0, 0], rgb) ? '#ffffff' : '#000000';
}

/* طرح رنگ فعال بر اساس تم — همان سه طرح ArsinLia */
function scheme() {
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (settings.theme === 'light' || (settings.theme === 'system' && !sysDark)) {
    return { name: 'light', bg: '#FAF6ED', surface: '#FFFFFF', surfaceVariant: '#F1E7C8', onSurface: '#1B1B2E', onSurfaceVariant: '#5B5240', primaryContainer: '#F0E3BC', onPrimaryContainer: '#3A2C0E', error: '#D33F3F', outline: '#c9c2ab' };
  }
  if (settings.theme === 'system') {
    return { name: 'sysdark', bg: '#0B0B18', surface: '#171730', surfaceVariant: '#20203C', onSurface: '#F5F2EA', onSurfaceVariant: '#CFC0A0', primaryContainer: '#4A3A17', onPrimaryContainer: '#F3E5C0', error: '#FF6B6B', outline: '#3d3d5c' };
  }
  return { name: 'dark', bg: '#000000', surface: '#000000', surfaceVariant: '#232323', onSurface: '#F5F5F5', onSurfaceVariant: '#BDBDBD', primaryContainer: '#4A3A17', onPrimaryContainer: '#F3E5C0', error: '#FF6B6B', outline: '#3a3a3a' };
}
function chatBgHex() {
  const b = settings.colors.bg;
  return (!b || b === 'system') ? scheme().bg : b;
}
function applyAppearance() {
  const root = document.documentElement;
  const sc = scheme();
  root.dataset.theme = sc.name === 'light' ? 'light' : 'dark';
  const set = (k, v) => root.style.setProperty(k, v);
  set('--bg', sc.bg); set('--surface', sc.surface); set('--surface-variant', sc.surfaceVariant);
  set('--on-surface', sc.onSurface); set('--on-surface-variant', sc.onSurfaceVariant);
  set('--primary-container', sc.primaryContainer); set('--on-primary-container', sc.onPrimaryContainer);
  set('--error', sc.error); set('--outline', sc.outline);
  set('--code', sc.name === 'light' ? '#F1E7C8' : sc.surfaceVariant);
  // لهجه‌ی پیش‌فرض = رنگ پیام کاربر (قانون 1.0.34 آرسین‌لیا)؛ در تم روشن فقط به‌اندازه‌ی خوانایی اصلاح می‌شود
  const accent = sc.name === 'light' ? nudgeReadable(settings.colors.me, sc.bg) : settings.colors.me;
  set('--primary', accent); set('--on-primary', onAccent(parseHex(accent) ? accent : settings.colors.me));
  const cbg = chatBgHex();
  set('--chat-bg', cbg);
  set('--ai-text', nudgeReadable(settings.colors.ai, cbg));
  set('--me-bg', settings.colors.me);
  set('--on-me', ensureReadable(relLum(parseHex(settings.colors.me) || [0, 0, 0]) > 0.5 ? '#000000' : '#ffffff', settings.colors.me));
  set('--send-tint', nudgeReadable(settings.colors.me, cbg));
  set('--title', settings.colors.title);
  set('--title-on-bg', nudgeReadable(settings.colors.title, sc.bg));
  set('--title-on-chat', nudgeReadable(settings.colors.title, cbg));
  set('--title-on-surface', nudgeReadable(settings.colors.title, sc.surface));
}
function applyLang() {
  const L = LANGS[settings.lang] || LANGS.fa;
  document.documentElement.lang = settings.lang;
  document.documentElement.dir = L.dir;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); el.setAttribute('aria-label', t(el.dataset.i18nTitle)); });
}

/* ======================= ابزارهای کمکی ======================= */
function toast(t) {
  const el = $('#toast'); el.textContent = t; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2600);
}
function esc(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function clip(s) {
  return s.length > MAX_CHARS ? s.slice(0, MAX_CHARS) + '\n\n[... ادامه‌ی متن به دلیل طولانی بودن حذف شد ...]' : s;
}

/* ======================= رندر Markdown (امن) ======================= */
function inline(s) {
  const codes = [];
  s = s.replace(/`([^`\n]+)`/g, (_, c) => { codes.push('<code>' + esc(c) + '</code>'); return '\u0001' + (codes.length - 1) + '\u0001'; });
  s = esc(s);
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
       .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return s.replace(/\u0001(\d+)\u0001/g, (_, i) => codes[+i]);
}

function md(src) {
  const blocks = [];
  src = src.replace(/```[^\n]*\n([\s\S]*?)(```|$)/g, (_, code) => {
    blocks.push('<pre dir="ltr"><code>' + esc(code.replace(/\n$/, '')) + '</code></pre>');
    return '\n\u0000' + (blocks.length - 1) + '\u0000\n';
  });
  const lines = src.split('\n');
  const out = [];
  let para = [];
  const flush = () => {
    if (para.length) { out.push('<p>' + inline(para.join('\n')).replace(/\n/g, '<br>') + '</p>'); para = []; }
  };
  const LI = /^\s*([-*+]|\d+[.)])\s+/;
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    const t = ln.trim();
    let m;
    if (/^\u0000\d+\u0000$/.test(t)) { flush(); out.push(blocks[+t.slice(1, -1)]); i++; continue; }
    if (!t) { flush(); i++; continue; }
    if ((m = ln.match(/^(#{1,6})\s+(.*)$/))) { flush(); out.push('<h' + m[1].length + '>' + inline(m[2]) + '</h' + m[1].length + '>'); i++; continue; }
    if (/^\s*([-*_])\1\1+\s*$/.test(ln)) { flush(); out.push('<hr>'); i++; continue; }
    if (/^\s*>/.test(ln)) {
      flush(); const q = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      out.push('<blockquote>' + inline(q.join('\n')).replace(/\n/g, '<br>') + '</blockquote>');
      continue;
    }
    if (LI.test(ln)) {
      flush();
      const tag = /^\s*\d+[.)]\s+/.test(ln) ? 'ol' : 'ul';
      const items = [];
      while (i < lines.length && LI.test(lines[i])) { items.push(lines[i].replace(LI, '')); i++; }
      out.push('<' + tag + '>' + items.map((x) => '<li>' + inline(x) + '</li>').join('') + '</' + tag + '>');
      continue;
    }
    if (t.startsWith('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
      flush();
      const split = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = split(ln); i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(split(lines[i])); i++; }
      out.push('<div class="tbl"><table><thead><tr>' + head.map((c) => '<th>' + inline(c) + '</th>').join('') +
        '</tr></thead><tbody>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table></div>');
      continue;
    }
    para.push(ln); i++;
  }
  flush();
  return out.join('');
}

/* ======================= استخراج محتوای فایل ======================= */
const loaded = {};
function loadScript(url) {
  if (!loaded[url]) {
    loaded[url] = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = url; s.onload = res;
      s.onerror = () => { delete loaded[url]; rej(new Error('بارگذاری کتابخانه ممکن نشد (اینترنت/فیلترشکن را بررسی کنید)')); };
      document.head.appendChild(s);
    });
  }
  return loaded[url];
}

function decodeText(buf) {
  const u = new Uint8Array(buf);
  if (u[0] === 0xFF && u[1] === 0xFE) return new TextDecoder('utf-16le').decode(buf);
  if (u[0] === 0xFE && u[1] === 0xFF) return new TextDecoder('utf-16be').decode(buf);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^\uFEFF/, ''); }
  catch (e) { return new TextDecoder('windows-1256').decode(buf); }
}

function canvasToB64(canvas) { return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]; }

async function imageBlob(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 2048 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  if (bmp.close) bmp.close();
  return { mime: 'image/jpeg', b64: canvasToB64(c) };
}

function fileToB64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = () => rej(new Error('خواندن فایل ناموفق بود'));
    r.readAsDataURL(file);
  });
}

async function pdfProcess(file, buf, asImages) {
  await loadScript(CDN.pdf);
  pdfjsLib.GlobalWorkerOptions.workerSrc = CDN.pdfWorker;
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;

  const render = async (max) => {
    const imgs = [];
    for (let p = 1; p <= Math.min(doc.numPages, max); p++) {
      const page = await doc.getPage(p);
      const v1 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: 1600 / Math.max(v1.width, v1.height) });
      const c = document.createElement('canvas');
      c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      imgs.push({ mime: 'image/jpeg', b64: canvasToB64(c) });
    }
    return imgs;
  };

  if (asImages) {
    const images = await render(10);
    return { name: file.name, images, note: `PDF به صورت تصویر ارسال شد (${images.length} صفحه‌ی اول)` };
  }

  let out = '';
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    let line = '', lastY = null;
    for (const it of tc.items) {
      const y = it.transform ? it.transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) line += '\n';
      line += it.str;
      if (y !== null) lastY = y;
    }
    out += `\n--- صفحه ${p} ---\n` + line;
  }
  out = out.normalize('NFKC');
  if (out.replace(/--- صفحه \d+ ---/g, '').trim().length >= 40) return { name: file.name, text: out.trim(), pages: doc.numPages };

  const images = await render(8);
  return {
    name: file.name, images,
    note: `این PDF متن قابل استخراج نداشت (احتمالاً اسکن است)؛ ${images.length} صفحه‌ی اول به صورت تصویر ارسال شد و مدل باید قابلیت بینایی داشته باشد`
  };
}

function numIn(s) { const m = s.split('/').pop().match(/\d+/); return m ? +m[0] : 0; }

async function pptxText(buf) {
  await loadScript(CDN.jszip);
  const zip = await JSZip.loadAsync(buf);
  const names = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => numIn(a) - numIn(b));
  const parts = [];
  for (let i = 0; i < names.length; i++) {
    const xml = await zip.files[names[i]].async('string');
    const d = new DOMParser().parseFromString(xml, 'application/xml');
    const paras = [...d.getElementsByTagName('a:p')].map((p) =>
      [...p.getElementsByTagName('a:t')].map((t) => t.textContent).join('')).filter(Boolean);
    parts.push(`### اسلاید ${i + 1}\n` + paras.join('\n'));
  }
  return parts.join('\n\n');
}

async function extractFile(file) {
  if (file.size > MAX_BYTES) throw new Error('حجم فایل بیشتر از ۳۰ مگابایت است');
  const name = file.name || 'file';
  const ext = (name.split('.').pop() || '').toLowerCase();
  const mime = (file.type || '').toLowerCase();
  const textual = (t) => (t.trim() ? { name, text: clip(t) } : { name, note: 'هیچ متنی در این فایل پیدا نشد' });

  if (mime.startsWith('image/') || IMAGE_EXT.includes(ext)) return { name, images: [await imageBlob(file)] };

  if (mime === 'application/pdf' || ext === 'pdf') return pdfProcess(file, await file.arrayBuffer(), settings.pdfAsImages);

  if (ext === 'docx') {
    await loadScript(CDN.mammoth);
    const r = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return textual(r.value || '');
  }
  if (ext === 'xlsx' || ext === 'xls' || ext === 'ods') {
    await loadScript(CDN.xlsx);
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    return textual(wb.SheetNames.map((n) => `### برگه: ${n}\n` + XLSX.utils.sheet_to_csv(wb.Sheets[n])).join('\n\n'));
  }
  if (ext === 'pptx') return textual(await pptxText(await file.arrayBuffer()));

  if (mime.startsWith('audio/') || mime.startsWith('video/') || MEDIA_MIME[ext]) {
    if (file.size > MAX_MEDIA) throw new Error('فایل صوتی/ویدیویی بیشتر از ۱۵ مگابایت است');
    const m = (mime.startsWith('audio/') || mime.startsWith('video/')) ? mime : MEDIA_MIME[ext];
    return { name, media: { mime: m, b64: await fileToB64(file) } };
  }

  const buf = await file.arrayBuffer();
  const head = new Uint8Array(buf.slice(0, 4096));
  const bom16 = head[0] === 0xFF && head[1] === 0xFE || head[0] === 0xFE && head[1] === 0xFF;
  if (!bom16 && head.includes(0)) throw new Error('نوع این فایل پشتیبانی نمی‌شود');
  let t = decodeText(buf);
  if (ext === 'html' || ext === 'htm') {
    const d = new DOMParser().parseFromString(t, 'text/html');
    d.querySelectorAll('script,style').forEach((n) => n.remove());
    t = d.body ? d.body.textContent : t;
  }
  return textual(t);
}

/* برای فایل‌های بزرگ: متن کامل خوانده می‌شود و برای هر سؤال، بخش‌های مرتبط از آن انتخاب می‌شود */
const CTX_BUDGET = 100000;
const REL_BUDGET = 60000;
function faNorm(s) {
  return String(s || '')
    .replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/ة/g, 'ه').replace(/[أإ]/g, 'ا')
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[‌ـ]/g, ' ')
    .replace(/[​-‏‪-‮⁦-⁩﻿]/g, '')
    .toLowerCase();
}
function chunkText(text) {
  const parts = text.split(/\n--- صفحه (\d+) ---\n/);
  const segs = [];
  for (let i = 1; i < parts.length; i += 2) segs.push({ page: +parts[i], text: parts[i + 1] || '' });
  if (!segs.length) segs.push({ page: null, text });
  const chunks = [];
  for (const sg of segs) {
    let rest = sg.text;
    while (rest.length > 2600) {
      let cut = rest.lastIndexOf('\n', 2600);
      if (cut < 1200) cut = 2600;
      chunks.push({ page: sg.page, text: rest.slice(0, cut) });
      rest = rest.slice(cut);
    }
    if (rest.trim()) chunks.push({ page: sg.page, text: rest });
  }
  return chunks;
}
function relevantText(f, question) {
  const chunks = chunkText(f.text);
  const q = faNorm(question);
  const terms = [...new Set(q.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2))];
  const art = q.match(/ماده\s*[–—-]?\s*(\d+)/);
  const scored = chunks.map((c, i) => {
    const cn = faNorm(c.text);
    let sc = 0;
    for (const t of terms) {
      let n = 0, j = 0;
      while ((j = cn.indexOf(t, j)) >= 0 && n < 5) { n++; j += t.length; }
      sc += n;
    }
    if (art && new RegExp('ماده\\s*[–—-]?\\s*' + art[1] + '(?![0-9])').test(cn)) sc += 100;
    return { i, sc, c };
  });
  const anyHit = scored.some((x) => x.sc > 0);
  const chosen = [];
  let used = 0;
  if (anyHit) {
    const ranked = scored.filter((x) => x.sc > 0).sort((a, b) => b.sc - a.sc || a.i - b.i);
    for (const x of ranked) {
      if (used + x.c.text.length > REL_BUDGET) continue;
      chosen.push(x); used += x.c.text.length;
    }
  } else {
    const avg = 2600;
    const step = Math.max(1, Math.floor(chunks.length / Math.max(1, Math.floor(CTX_BUDGET / avg))));
    for (let i = 0; i < chunks.length && used < CTX_BUDGET; i += step) { chosen.push(scored[i]); used += scored[i].c.text.length; }
  }
  chosen.sort((a, b) => a.i - b.i);
  let s = `[متن کامل این فایل${f.pages ? '، ' + f.pages + ' صفحه' : ''} و ${f.text.length} حرف است؛ بخش‌های مرتبط با سؤال از آن انتخاب شده است]\n`;
  for (const x of chosen) s += (x.c.page ? `--- صفحه ${x.c.page} ---\n` : '') + x.c.text.trim() + '\n';
  return s;
}
function fullText(m, mediaSupported, question) {
  let s = '';
  for (const f of m.files || []) {
    s += `=== فایل: ${f.name} ===\n`;
    if (f.note) s += `[${f.note}]\n`;
    if (f.text) s += (f.text.length <= CTX_BUDGET ? f.text : relevantText(f, question || '')) + '\n';
    const nImg = (f.images || []).length || f.imageCount || 0;
    if (!f.text && nImg) s += '(تصویر پیوست شده است)\n';
    if (f.media || f.hadMedia) {
      s += mediaSupported && f.media ? '(فایل صوتی/ویدیویی پیوست شده است)\n'
        : '(این فایل صوتی/ویدیویی است و در دسترس مدل نیست)\n';
    }
    s += '=== پایان فایل ===\n\n';
  }
  return s + m.text;
}

function normalizeHistory(list) {
  const out = [];
  for (const m of list) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) {
      out[out.length - 1] = { role: m.role, text: last.text + '\n\n' + m.text, files: (last.files || []).concat(m.files || []) };
    } else out.push(m);
  }
  return out;
}

function buildRequest(s, h) {
  const base = s.baseUrl.trim().replace(/\/+$/, '');
  h = h.map((m) => ({ ...m, files: (m.files || []).filter((f) => !f.off) }));
  const lastUser = [...h].reverse().find((x) => x.role === 'user');
  const question = lastUser ? lastUser.text : '';
  if (s.provider === 'openai') {
    const msgs = [];
    if (s.systemPrompt.trim()) msgs.push({ role: 'system', content: s.systemPrompt });
    for (const m of h) {
      const imgs = (m.files || []).flatMap((f) => f.images || []);
      const t = fullText(m, false, question);
      if (imgs.length) {
        msgs.push({
          role: m.role,
          content: [{ type: 'text', text: t }].concat(imgs.map((i) => ({ type: 'image_url', image_url: { url: `data:${i.mime};base64,${i.b64}` } })))
        });
      } else msgs.push({ role: m.role, content: t });
    }
    return {
      url: base.endsWith('/chat/completions') ? base : base + '/chat/completions',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.apiKey },
      body: { model: s.model, messages: msgs, stream: true, temperature: s.temperature ?? 1 },
      extract: (o) => {
        const c = o.choices && o.choices[0];
        if (!c) return '';
        const v = (c.delta && c.delta.content) ?? (c.message && c.message.content) ?? '';
        return Array.isArray(v) ? v.map((p) => p.text || '').join('') : String(v || '');
      }
    };
  }
  if (s.provider === 'anthropic') {
    const msgs = h.map((m) => {
      const parts = (m.files || []).flatMap((f) => f.images || []).map((i) => ({ type: 'image', source: { type: 'base64', media_type: i.mime, data: i.b64 } }));
      parts.push({ type: 'text', text: fullText(m, false, question) });
      return { role: m.role, content: parts };
    });
    const body = { model: s.model, max_tokens: 4096, messages: msgs, stream: true, temperature: s.temperature ?? 1 };
    if (s.systemPrompt.trim()) body.system = s.systemPrompt;
    return {
      url: base.endsWith('/v1') ? base + '/messages' : base + '/v1/messages',
      headers: {
        'Content-Type': 'application/json', 'x-api-key': s.apiKey, 'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body,
      extract: (o) => {
        if (o.type === 'content_block_delta') return (o.delta && o.delta.text) || '';
        if (Array.isArray(o.content)) return o.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
        return '';
      }
    };
  }
  // gemini
  const contents = h.map((m) => {
    const parts = [{ text: fullText(m, true, question) }];
    for (const f of m.files || []) {
      for (const i of f.images || []) parts.push({ inlineData: { mimeType: i.mime, data: i.b64 } });
      if (f.media) parts.push({ inlineData: { mimeType: f.media.mime, data: f.media.b64 } });
    }
    return { role: m.role === 'assistant' ? 'model' : 'user', parts };
  });
  const body = { contents, generationConfig: { temperature: s.temperature ?? 1 } };
  if (s.systemPrompt.trim()) body.systemInstruction = { parts: [{ text: s.systemPrompt }] };
  const model = s.model.trim().replace(/^models\//, '');
  return {
    url: `${base}/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': s.apiKey },
    body,
    extract: (o) => {
      const c = o.candidates && o.candidates[0];
      const ps = c && c.content && c.content.parts;
      return ps ? ps.map((p) => p.text || '').join('') : '';
    }
  };
}

async function readSSE(resp, onData) {
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).replace(/\r$/, '');
      buf = buf.slice(idx + 1);
      if (line.startsWith('data:')) { const d = line.slice(5).trim(); if (d) onData(d); }
    }
  }
}

async function callModel(history, onDelta, signal, eff) {
  const req = buildRequest(eff, normalizeHistory(history));
  let resp;
  try {
    resp = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(req.body), signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new Error('اتصال به سرور ممکن نشد. اینترنت (یا فیلترشکن)، Base URL و اجازه‌ی CORS سرویس‌دهنده را بررسی کنید.\n(' + e.message + ')');
  }
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status}\n${t.slice(0, 1500)}`);
  }
  const handle = (o) => {
    if (o && o.error) throw new Error(typeof o.error === 'string' ? o.error : JSON.stringify(o.error));
    const t = req.extract(o);
    if (t) onDelta(t);
  };
  const ct = resp.headers.get('content-type') || '';
  if (ct.includes('text/event-stream') && resp.body) {
    await readSSE(resp, (d) => {
      if (d === '[DONE]') return;
      let o; try { o = JSON.parse(d); } catch (e) { return; }
      handle(o);
    });
  } else {
    const raw = await resp.text();
    let o; try { o = JSON.parse(raw); } catch (e) { throw new Error(raw.slice(0, 500)); }
    (Array.isArray(o) ? o : [o]).forEach(handle);
  }
}

/* ======================= رابط کاربری: گفتگو (مشخصات دقیق ArsinLia) ======================= */
const chatEl = $('#chat'), inputEl = $('#input'), chipsEl = $('#chips'), errEl = $('#errbar');
const btnSend = $('#btnSend'), btnStop = $('#btnStop');

/* دیالوگ تأیید عمومی به سبک AlertDialog */
let confirmRes = null;
function askConfirm(title, msg, okLabel) {
  return new Promise((res) => {
    confirmRes = res;
    $('#cfTitle').textContent = title;
    $('#cfText').textContent = msg;
    $('#cfOk').textContent = okLabel;
    $('#cfCancel').textContent = t('cancel');
    const d = $('#confirmDlg');
    if (!d.open) d.showModal();
  });
}
$('#cfOk').onclick = () => { $('#confirmDlg').close(); if (confirmRes) confirmRes(true); };
$('#cfCancel').onclick = () => { $('#confirmDlg').close(); if (confirmRes) confirmRes(false); };
$('#confirmDlg').addEventListener('close', () => { if (confirmRes) { const r = confirmRes; confirmRes = null; r(false); } });

function nearBottom() { return chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight < 120; }
function scrollBottom() { chatEl.scrollTop = chatEl.scrollHeight; }

let streamEl = null, revealTimer = null, shownLen = 0;
function stopReveal() { if (revealTimer) { clearInterval(revealTimer); revealTimer = null; } }
function startReveal() {
  stopReveal();
  shownLen = 0;
  revealTimer = setInterval(() => {
    const last = cur().messages[cur().messages.length - 1];
    if (!last || last.role !== 'assistant' || !streamEl) { stopReveal(); return; }
    const full = last.text;
    if (shownLen < full.length) {
      let target = full.length;
      const rest = full.slice(shownLen);
      const words = rest.split(/\s+/).filter(Boolean);
      const stepWords = Math.max(1, Math.ceil(words.length / 12));
      let adv = 0, counted = 0;
      for (const w of words) { adv += w.length + 1; counted++; if (counted >= stepWords) break; }
      target = Math.min(full.length, shownLen + Math.max(adv, 1));
      shownLen = target;
      const stick = nearBottom();
      streamEl.innerHTML = md(full.slice(0, shownLen));
      streamEl.classList.toggle('typingdots-off', shownLen > 0);
      const dots = streamEl.parentElement && streamEl.parentElement.querySelector('.tdots');
      if (dots && shownLen > 0) dots.remove();
      if (stick) scrollBottom();
    }
    if (!busy && shownLen >= full.length) stopReveal();
  }, 30);
}
function updateStream() { /* نمایش تدریجی با تایمر انجام می‌شود */ }

function iconBtn(svgPath, label, fn) {
  const b = document.createElement('button');
  b.className = 'mini-ic'; b.title = label; b.setAttribute('aria-label', label);
  b.innerHTML = '<svg viewBox="0 0 24 24"><path d="' + svgPath + '"/></svg>';
  b.onclick = fn;
  return b;
}
const SVG_COPY = 'M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z';
const SVG_RESEND = 'M17.65 6.35A8 8 0 1 0 19.73 14h-2.08a6 6 0 1 1-1.41-6.24L13 11h7V4l-2.35 2.35z';

function makeBubble(m, streaming) {
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + m.role;
  if (m.role === 'user') {
    const col = document.createElement('div'); col.className = 'ucol';
    const b = document.createElement('div'); b.className = 'bubble';
    for (const f of m.files || []) {
      const c = document.createElement('div'); c.className = 'fcard';
      const ic = document.createElement('span'); ic.className = 'fcard-ic'; ic.textContent = '📄';
      const nm = document.createElement('span'); nm.className = 'fcard-nm'; nm.textContent = f.name + (f.off ? t('fileOff') : '');
      c.append(ic, nm); c.title = f.name; c.onclick = () => viewFile(f);
      b.append(c);
    }
    if (m.text) { const p = document.createElement('div'); p.className = 'utext'; p.textContent = m.text; b.append(p); }
    col.append(b);
    const acts = document.createElement('div'); acts.className = 'uacts';
    acts.append(iconBtn(SVG_COPY, t('copy'), async () => { try { await navigator.clipboard.writeText(m.text); toast(t('copied')); } catch (e) { toast(t('copyFail')); } }));
    acts.append(iconBtn(SVG_RESEND, t('resend'), () => { inputEl.value = m.text; autoGrow(); updateUI(); inputEl.focus(); }));
    col.append(acts);
    wrap.append(col);
  } else {
    const col = document.createElement('div'); col.className = 'acol';
    const c = document.createElement('div');
    c.className = 'md';
    if (streaming && !m.text) {
      const dots = document.createElement('div'); dots.className = 'tdots';
      dots.innerHTML = '<span></span><span></span>';
      col.append(dots);
    }
    c.innerHTML = md(m.text);
    col.append(c);
    if (!streaming && m.sources && m.sources.length) {
      const sr = document.createElement('div'); sr.className = 'srcrow';
      const lb = document.createElement('span'); lb.className = 'srclab'; lb.textContent = t('sources') + ':';
      sr.append(lb);
      for (const s of m.sources) { const ch = document.createElement('span'); ch.className = 'srcchip'; ch.textContent = s; sr.append(ch); }
      col.append(sr);
    }
    if (!streaming && m.text) {
      const acts = document.createElement('div'); acts.className = 'aacts';
      acts.append(iconBtn(SVG_COPY, t('copy'), async () => { try { await navigator.clipboard.writeText(m.text); toast(t('copied')); } catch (e) { toast(t('copyFail')); } }));
      col.append(acts);
    }
    if (streaming) streamEl = c;
    wrap.append(col);
  }
  return wrap;
}

function threadModelName(th) {
  const sel = th.sel && providerById(th.sel.providerId) ? th.sel : null;
  if (sel) return sel.model || '';
  const ap = activeProviders();
  return ap.length ? (ap[0].model || (ap[0].models || [])[0] || '') : '';
}

function render() {
  streamEl = null;
  const msgs = cur().messages;
  chatEl.innerHTML = '';
  if (!msgs.length) {
    const h = document.createElement('div'); h.className = 'chatempty';
    const mark = document.createElement('div'); mark.className = 'almark'; mark.textContent = 'F.C';
    const gr = document.createElement('div'); gr.className = 'greet'; gr.textContent = t('greeting');
    h.append(mark, gr);
    chatEl.append(h);
  }
  msgs.forEach((m, i) => {
    const streaming = busy && i === msgs.length - 1 && m.role === 'assistant';
    chatEl.append(makeBubble(m, streaming));
  });
  scrollBottom();
  updateUI();
  updateModelChip();
}

/* پیش‌نمایش پیوست‌ها داخل کامپوزر */
function renderChips() {
  chipsEl.innerHTML = '';
  pending.forEach((f, i) => {
    const c = document.createElement('div'); c.className = 'attprev' + (f.off ? ' off' : '');
    const ic = document.createElement('span'); ic.className = 'ap-ic'; ic.textContent = '📄';
    const mid = document.createElement('div'); mid.className = 'ap-mid';
    const nm = document.createElement('div'); nm.className = 'ap-nm'; nm.textContent = f.name; nm.title = f.name;
    nm.onclick = () => viewFile(f);
    const sub = document.createElement('div'); sub.className = 'ap-sub';
    sub.textContent = f.text ? f.text.length.toLocaleString(settings.lang === 'en' ? 'en' : 'fa') + ' ✓' : (f.note || '');
    mid.append(nm, sub);
    const x = document.createElement('button'); x.className = 'ap-x'; x.textContent = '✕';
    x.onclick = () => { pending.splice(i, 1); renderChips(); updateUI(); };
    c.append(ic, mid, x); chipsEl.append(c);
  });
  if (processing) {
    const c = document.createElement('div'); c.className = 'attprev busy';
    const sp = document.createElement('div'); sp.className = 'spin';
    const tx = document.createElement('span'); tx.textContent = t('readingFile');
    c.append(sp, tx); chipsEl.append(c);
  }
}

/* نمایش متن فایل */
let viewTarget = null;
function syncViewToggle() {
  $('#viewToggle').textContent = viewTarget && viewTarget.off ? t('viewEnable') : t('viewDisable');
}
function viewFile(f) {
  viewTarget = f;
  $('#viewTitle').textContent = f.name;
  $('#viewText').textContent = f.text || (f.note ? '[' + f.note + ']' : '') || t('viewNone');
  syncViewToggle();
  const d = $('#viewDlg');
  if (!d.open) d.showModal();
}
$('#viewToggle').onclick = () => {
  if (!viewTarget) return;
  viewTarget.off = !viewTarget.off;
  syncViewToggle(); renderChips(); saveThreads(); render();
};
$('#viewClose').onclick = () => $('#viewDlg').close();

function updateUI() {
  const can = !busy && !processing && (inputEl.value.trim() || pending.length);
  btnSend.hidden = !can;
  btnStop.hidden = !(busy && !can);
  inputEl.placeholder = t('inputHint');
}

function showError(msg, canRetry) {
  lastError = msg;
  errEl.hidden = false;
  errEl.innerHTML = '';
  const tx = document.createElement('div'); tx.className = 'msgtxt'; tx.textContent = msg; errEl.append(tx);
  if (canRetry) {
    const r = document.createElement('button'); r.textContent = t('retry');
    r.onclick = () => { clearError(); run(); }; errEl.append(r);
  }
  const x = document.createElement('button'); x.textContent = '✕'; x.onclick = clearError; errEl.append(x);
}
function clearError() { lastError = null; errEl.hidden = true; errEl.innerHTML = ''; }

/* ======================= منوی کناری (سه ورودی دقیق ArsinLia) ======================= */
function openDrawer() { $('#drawer').classList.add('open'); $('#scrim').hidden = false; }
function closeDrawer() { $('#drawer').classList.remove('open'); $('#scrim').hidden = true; $('#setSub').hidden = true; }

/* ======================= تاریخچه‌ی گفتگوها ======================= */
function renderThreads() {
  const list = $('#threadList');
  if (!list) return;
  list.innerHTML = '';
  if (!threads.length || (threads.length === 1 && !threads[0].messages.length && !threads[0].title)) {
    const e = document.createElement('div'); e.className = 'listempty';
    e.innerHTML = '<div class="lemoji">💬</div><div>' + esc(t('emptyList')) + '</div>';
    list.append(e);
    return;
  }
  for (const th of threads) {
    const row = document.createElement('div');
    row.className = 'trow' + (th.id === curId ? ' cur' : '');
    const main = document.createElement('div'); main.className = 'tmain';
    const tt = document.createElement('div'); tt.className = 'ttitle'; tt.textContent = th.title || t('untitled');
    const tm = document.createElement('div'); tm.className = 'tmodel'; tm.textContent = threadModelName(th);
    main.append(tt, tm);
    main.onclick = () => { setCur(th.id); stopReveal(); showScreen('chat'); render(); };
    const menu = document.createElement('button'); menu.className = 'tdots'; menu.textContent = '⋯';
    menu.onclick = (e) => { e.stopPropagation(); openThreadMenu(th, menu); };
    row.append(main, menu);
    list.append(row);
  }
}
let threadMenuFor = null;
function openThreadMenu(th, anchor) {
  threadMenuFor = th;
  const m = $('#threadMenu');
  m.hidden = false;
  const r = anchor.getBoundingClientRect();
  m.style.top = (r.bottom + 4) + 'px';
  m.style.insetInlineStart = Math.max(8, r.left - 40) + 'px';
}
function closeThreadMenu() { $('#threadMenu').hidden = true; threadMenuFor = null; }
document.addEventListener('click', (e) => {
  const m = $('#threadMenu');
  if (!m.hidden && !m.contains(e.target)) closeThreadMenu();
});

/* ======================= کشوی انتخاب مدل ======================= */
function updateModelChip() {
  const sel = currentSel();
  const chip = $('#btnModel');
  chip.querySelector('.mname').textContent = sel && sel.model ? sel.model : t('chooseModel');
}
function openModelSheet() {
  renderModelSheet('');
  $('#modelSheet').classList.add('open'); $('#scrim').hidden = false;
  const si = $('#modelSearch'); si.value = ''; setTimeout(() => si.focus(), 60);
}
function closeModelSheet() { $('#modelSheet').classList.remove('open'); if (!$('#drawer').classList.contains('open')) $('#scrim').hidden = true; }
function renderModelSheet(q) {
  const box = $('#modelGroups');
  box.innerHTML = '';
  const query = (q || '').trim().toLowerCase();
  const aps = activeProviders();
  const groups = [];
  for (const p of aps) {
    const models = [...new Set([p.model, ...((p.models) || [])].map((x) => (x || '').trim()).filter(Boolean))];
    const shown = models.filter((m) => !query || m.toLowerCase().includes(query));
    if (shown.length) groups.push({ p, shown });
  }
  if (!groups.length) {
    box.innerHTML = '<div class="empty">' + esc(query ? t('modelSearchEmpty') : t('keyFirst')) + '</div>';
    return;
  }
  const sel = currentSel();
  for (const { p, shown } of groups) {
    const gh = document.createElement('div'); gh.className = 'ghead'; gh.textContent = p.name;
    box.append(gh);
    for (const m of shown) {
      const r = document.createElement('button');
      r.className = 'mrow2' + (sel && sel.providerId === p.id && sel.model === m ? ' sel' : '');
      const tx = document.createElement('span'); tx.className = 'mname2'; tx.textContent = m; tx.dir = 'ltr';
      r.append(tx);
      if (sel && sel.providerId === p.id && sel.model === m) {
        const ck = document.createElement('span'); ck.className = 'mcheck'; ck.textContent = '✓';
        r.append(ck);
      }
      r.onclick = () => {
        cur().sel = { providerId: p.id, model: m };
        saveThreads(); updateModelChip(); closeModelSheet();
      };
      box.append(r);
    }
  }
}

/* ======================= جریان اصلی ======================= */
async function addFiles(list) {
  const files = [...list];
  if (!files.length) return;
  processing += files.length; renderChips(); updateUI();
  for (const f of files) {
    try { pending.push(await extractFile(f)); }
    catch (e) { showError(t('readFail') + ' «' + f.name + '»: ' + (e.message || e), false); }
    finally { processing--; renderChips(); updateUI(); }
  }
}

/* دستور رنگ در چت — هر جمله‌ای که رنگ و بخش هدف را نام ببرد (به سبک ArsinLia) */
const COLOR_WORDS = [
  ['طلایی', '#D4AF37'], ['gold', '#D4AF37'], ['ذهبي', '#D4AF37'],
  ['قرمز', '#d92d20'], ['سرخ', '#d92d20'], ['red', '#d92d20'], ['أحمر', '#d92d20'],
  ['آبی', '#1971c2'], ['blue', '#1971c2'], ['أزرق', '#1971c2'],
  ['سبز', '#2f9e44'], ['green', '#2f9e44'], ['أخضر', '#2f9e44'],
  ['زرد', '#e8a100'], ['yellow', '#e8a100'], ['أصفر', '#e8a100'],
  ['نارنجی', '#e8590c'], ['orange', '#e8590c'], ['برتقالي', '#e8590c'],
  ['بنفش', '#7048e8'], ['purple', '#7048e8'], ['بنفسجي', '#7048e8'],
  ['صورتی', '#d6336c'], ['pink', '#d6336c'], ['وردي', '#d6336c'],
  ['مشکی', '#23242e'], ['سیاه', '#23242e'], ['black', '#23242e'], ['أسود', '#23242e'],
  ['سفید', '#f4f5fa'], ['white', '#f4f5fa'], ['أبيض', '#f4f5fa'],
  ['خاکستری', '#868e96'], ['طوسی', '#868e96'], ['gray', '#868e96'], ['grey', '#868e96'], ['رمادي', '#868e96'],
  ['قهوه ای', '#4E342E'], ['قهوه‌ای', '#4E342E'], ['brown', '#4E342E'], ['بني', '#4E342E'],
  ['نقره ای', '#adb5bd'], ['نقره‌ای', '#adb5bd'], ['silver', '#adb5bd'], ['فضي', '#adb5bd'],
  ['فیروزه ای', '#00838F'], ['فیروزه‌ای', '#00838F'], ['teal', '#00838F'],
  ['کرم', '#efe0bd'], ['cream', '#efe0bd'],
  ['سرمه ای', '#22345c'], ['سرمه‌ای', '#22345c'], ['navy', '#22345c'],
  ['زرشکی', '#862e4b'], ['یشمی', '#0b7285'], ['cyan', '#0b7285']
];
function detectColorCommand(raw) {
  const text = faNorm(raw);
  if (!text) return null;
  let hex = null;
  const hm = text.match(/#([0-9a-f]{6})/);
  if (hm) hex = '#' + hm[1];
  if (!hex) {
    for (const [w, h] of COLOR_WORDS) { if (text.includes(faNorm(w))) { hex = h; break; } }
  }
  if (!hex) return null;
  let target = null;
  if (/(پس زمینه|پس‌زمینه|background|الخلفية)/.test(text)) target = 'bg';
  else if (/(عناوین|گزینه|titles|العناوين)/.test(text)) target = 'title';
  else if (/(حباب پاسخ|پاسخ ها|پاسخ‌ها|حباب دستیار|حباب هوش|ردود|الرد|assistant)/.test(text)) target = 'ai';
  else if (/(حباب|پیام|رسائل|رسائلي|رسائلی|bubble|message)/.test(text)) target = 'me';
  if (!target) return null;
  return { target, hex };
}
function applyColorCommand(cmd) {
  settings.colors[cmd.target] = cmd.hex;
  saveSettings(); applyAppearance();
}

async function send() {
  if (busy || processing) return;
  const text = inputEl.value.trim();
  if (!text && !pending.length) return;
  const th = cur();
  if (!pending.length && text) {
    const cmd = detectColorCommand(text);
    if (cmd) {
      applyColorCommand(cmd);
      th.messages.push({ role: 'user', text, files: [] });
      th.messages.push({ role: 'assistant', text: t('colorDone'), files: [] });
      if (!th.title) th.title = text.slice(0, 42);
      inputEl.value = ''; autoGrow();
      saveThreads(); render();
      return;
    }
  }
  if (!effSettings()) { toast(t('keyFirst')); showScreen('providers'); return; }
  clearError();
  const userText = text || DEFAULT_ASK;
  th.messages.push({ role: 'user', text: userText, files: pending });
  if (!th.title) th.title = userText.slice(0, 42);
  pending = []; inputEl.value = ''; autoGrow(); renderChips();
  saveThreads();
  await run();
}

async function run() {
  const th = cur();
  const eff = effSettings();
  if (!eff) { toast(t('keyFirst')); return; }
  busy = true;
  const all = th.messages.slice();
  const history = settings.memory ? all : all.slice(-1);
  const reply = { role: 'assistant', text: '', files: [] };
  reply.sources = [...new Set(history.flatMap((m) => (m.files || [])).filter((f) => !f.off).map((f) => f.name))];
  th.messages.push(reply);
  render();
  startReveal();
  abortCtl = new AbortController();
  let failed = null;
  try {
    await callModel(history, (d) => { reply.text += d; }, abortCtl.signal, eff);
    if (!reply.text) reply.text = t('emptyAnswer');
  } catch (e) {
    if (e.name !== 'AbortError') failed = e.message || String(e);
  } finally {
    busy = false; abortCtl = null;
    stopReveal();
    if (!reply.text) th.messages.pop();
    saveThreads(); render();
    if (failed) showError(failed, th.messages.length && th.messages[th.messages.length - 1].role === 'user');
  }
}

function newChatThread() {
  if (abortCtl) abortCtl.abort();
  stopReveal();
  const th = newThread();
  threads.unshift(th);
  setCur(th.id);
  pending = []; processing = 0; busy = false;
  clearError(); saveThreads(); renderChips(); render();
}

async function deleteThreadById(id) {
  threads = threads.filter((x) => x.id !== id);
  if (!threads.length) threads = [newThread()];
  if (!threads.some((x) => x.id === curId)) setCur(threads[0].id);
  saveThreads();
}

function autoGrow() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
}

/* ======================= پیمایش صفحه‌ها ======================= */
const SCREENS = ['chat', 'history', 'settings', 'ai', 'providers', 'about'];
function showScreen(name) {
  for (const s of SCREENS) {
    const el = $('#scr-' + s);
    if (el) el.hidden = s !== name;
  }
  if (name === 'providers') renderProviders();
  if (name === 'history') renderThreads();
  window.scrollTo(0, 0);
}

/* ======================= بارگذاری مدل‌ها ======================= */
function modelsRequest(provider, base, key) {
  base = base.trim().replace(/\/+$/, '');
  if (provider === 'anthropic') return {
    url: base.endsWith('/v1') ? base + '/models' : base + '/v1/models',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    parse: (o) => (o.data || []).map((m) => m.id).filter(Boolean)
  };
  if (provider === 'gemini') return {
    url: base + '/v1beta/models',
    headers: { 'x-goog-api-key': key },
    parse: (o) => (o.models || []).map((m) => String(m.name || '').replace(/^models\//, '')).filter(Boolean)
  };
  return {
    url: base.endsWith('/models') ? base : base + '/models',
    headers: { Authorization: 'Bearer ' + key },
    parse: (o) => (o.data || []).map((m) => m.id || m.name).filter(Boolean)
  };
}

/* دیالوگ انتخاب مدل (فرم ارائه‌دهنده) */
let pickerIds = [], pickerLoading = false;
function renderPickerList(q) {
  const box = $('#mpList');
  box.innerHTML = '';
  const query = (q || '').trim().toLowerCase();
  const shown = pickerIds.filter((id) => !query || id.toLowerCase().includes(query));
  if (pickerLoading && !pickerIds.length) { box.innerHTML = '<div class="mpmsg">' + esc(t('modelLoading')) + '</div>'; return; }
  if (!shown.length) { box.innerHTML = '<div class="mpmsg">' + esc(t('modelNoResults')) + '</div>'; return; }
  for (const id of shown) {
    const r = document.createElement('button');
    r.className = 'mprow'; r.textContent = id; r.dir = 'ltr';
    r.onclick = () => { $('#pfModel').value = id; $('#modelDlg').close(); };
    box.append(r);
  }
}
async function openModelPicker() {
  const base = $('#pfBase').value.trim(), key = $('#pfKey').value.trim();
  const d = $('#modelDlg');
  pickerIds = []; pickerLoading = true;
  $('#mpSearch').value = '';
  $('#mpMsg').textContent = '';
  renderPickerList('');
  if (!d.open) d.showModal();
  try {
    const rq = modelsRequest(detectType(base, 'openai'), base, key);
    const resp = await fetch(rq.url, { headers: rq.headers });
    const raw = await resp.text();
    if (!resp.ok) { $('#mpMsg').textContent = 'HTTP ' + resp.status + ' — ' + raw.slice(0, 300); pickerLoading = false; renderPickerList(''); return; }
    let ids = [];
    try { ids = rq.parse(JSON.parse(raw)); } catch (e) { /* ignore */ }
    pickerIds = [...new Set(ids)].sort();
    formModels = pickerIds;
    if (editingId) { const p = providerById(editingId); if (p) { p.models = pickerIds; saveSettings(); } }
  } catch (e) {
    $('#mpMsg').textContent = t('connFail') + e.message;
  } finally {
    pickerLoading = false;
    renderPickerList($('#mpSearch').value);
  }
}
$('#mpSearch').addEventListener('input', (e) => renderPickerList(e.target.value));
$('#mpClose').onclick = () => $('#modelDlg').close();

/* ======================= ارائه‌دهندگان ======================= */
function renderProviders() {
  const box = $('#provList');
  box.innerHTML = '';
  if (!settings.providers.length) {
    box.innerHTML = '<div class="provempty">' + esc(t('provEmpty')) + '</div>';
    return;
  }
  const sel = currentSel();
  for (const p of settings.providers) {
    const card = document.createElement('div');
    card.className = 'pcard' + (sel && sel.providerId === p.id ? ' active' : '');
    const nm = document.createElement('div'); nm.className = 'pname'; nm.textContent = p.name;
    nm.onclick = () => openProvForm(p.id);
    const be = document.createElement('button'); be.className = 'mini-ic'; be.title = t('editProvider');
    be.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
    be.onclick = () => openProvForm(p.id);
    const bd = document.createElement('button'); bd.className = 'mini-ic danger'; bd.title = t('del');
    bd.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
    bd.onclick = async () => {
      if (!(await askConfirm(t('delProvTitle'), '«' + p.name + '» ' + t('delProvMsg'), t('del')))) return;
      settings.providers = settings.providers.filter((x) => x.id !== p.id);
      for (const th of threads) if (th.sel && th.sel.providerId === p.id) th.sel = null;
      saveSettings(); saveThreads(); renderProviders(); render();
    };
    card.append(nm, be, bd);
    box.append(card);
  }
}

let editingId = null, formModels = null, formRole = 'balanced';
function openProvForm(id) {
  editingId = id || null;
  formModels = null;
  const p = id ? providerById(id) : null;
  $('#pfTitle').textContent = p ? t('editProvider') : t('addProvider');
  $('#pfName').value = p ? p.name : '';
  $('#pfBase').value = p ? p.baseUrl : '';
  $('#pfKey').value = p ? p.apiKey : '';
  $('#pfModel').value = p ? p.model : '';
  formRole = p ? (p.role || 'balanced') : 'balanced';
  syncRoleChips();
  $('#provFormCard').hidden = false;
  $('#provFormCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function syncRoleChips() {
  document.querySelectorAll('#pfRoles button').forEach((b) => b.classList.toggle('sel', b.dataset.role === formRole));
}
document.querySelectorAll('#pfRoles button').forEach((b) => { b.onclick = () => { formRole = b.dataset.role; syncRoleChips(); }; });
$('#pfLoad').onclick = openModelPicker;
$('#addProvider').onclick = () => openProvForm(null);
$('#pfCancel').onclick = () => { $('#provFormCard').hidden = true; };
$('#pfSave').onclick = () => {
  const name = $('#pfName').value.trim(), base = $('#pfBase').value.trim(),
    key = $('#pfKey').value.trim(), model = $('#pfModel').value.trim();
  if (!name || !base || !model) { toast(t('fillAll')); return; }
  if (editingId) {
    const p = providerById(editingId);
    Object.assign(p, { name, baseUrl: base, apiKey: key, model, role: formRole, type: detectType(base, p.type) });
    if (formModels) p.models = formModels;
  } else {
    settings.providers.push({ id: uid(), name, type: detectType(base, 'openai'), baseUrl: base, apiKey: key, model, models: formModels || [], role: formRole });
  }
  saveSettings(); toast(t('saved'));
  $('#provFormCard').hidden = true;
  renderProviders(); render();
};

/* ======================= رنگ و تم‌ها: انتخاب‌گر حباب (مشخصات ArsinLia) ======================= */
const PAL_ME = ['#2E7D8A', '#2E7D32', '#1565C0', '#4E342E', '#00838F', '#D4AF37'];
const PAL_AI = ['#2E7D8A', '#2E7D32', '#1565C0', '#4E342E', '#00838F', '#FFFFFF', '#D4AF37'];
const PAL_BG = ['#2E7D8A', '#2E7D32', '#1565C0', '#4E342E', '#00838F', '#000000', '#D4AF37'];
function buildPicker(mountId, palette, get, set, systemOption) {
  const mount = $('#' + mountId);
  mount.innerHTML = '';
  if (systemOption) {
    const row = document.createElement('div');
    row.className = 'sysrow' + (get() === 'system' ? ' sel' : '');
    row.innerHTML = '<span class="sysem">🌓</span><span class="syslab">' + esc(t('followSystem')) + '</span>' + (get() === 'system' ? '<span class="sysck">✓</span>' : '');
    row.onclick = () => { set('system'); };
    mount.append(row);
  }
  const grid = document.createElement('div'); grid.className = 'swgrid';
  for (const hex of palette) {
    const s = document.createElement('button');
    s.className = 'sw' + (get() && get().toLowerCase() === hex.toLowerCase() ? ' sel' : '');
    s.style.background = hex; s.setAttribute('aria-label', hex);
    if (get() && get().toLowerCase() === hex.toLowerCase()) s.innerHTML = '<span class="swck">✓</span>';
    s.onclick = () => set(hex);
    grid.append(s);
  }
  mount.append(grid);
  const row = document.createElement('div'); row.className = 'hexrow';
  const inp = document.createElement('input');
  inp.className = 'hexin'; inp.dir = 'ltr'; inp.value = get() === 'system' ? '' : (get() || '');
  inp.placeholder = t('customHex');
  const prev = document.createElement('div'); prev.className = 'hexprev';
  prev.style.background = parseHex(inp.value) ? inp.value : 'transparent';
  const err = document.createElement('div'); err.className = 'hexerr'; err.hidden = true; err.textContent = t('invalidHex');
  inp.addEventListener('input', () => {
    const v = inp.value.trim();
    prev.style.background = parseHex(v) ? v : 'transparent';
    if (parseHex(v)) { err.hidden = true; set(v); }
    else err.hidden = !v;
  });
  row.append(inp, prev);
  mount.append(row, err);
}
function renderAppearance() {
  document.querySelectorAll('#themeSeg button').forEach((b) => b.classList.toggle('sel', b.dataset.themeVal === settings.theme));
  const rebuild = () => { renderAppearance(); };
  buildPicker('pk-me', PAL_ME, () => settings.colors.me, (v) => { settings.colors.me = v; saveSettings(); applyAppearance(); rebuild(); }, false);
  buildPicker('pk-ai', PAL_AI, () => settings.colors.ai, (v) => { settings.colors.ai = v; saveSettings(); applyAppearance(); rebuild(); }, false);
  buildPicker('pk-bg', PAL_BG, () => settings.colors.bg, (v) => { settings.colors.bg = v; saveSettings(); applyAppearance(); rebuild(); }, true);
  buildPicker('pk-title', PAL_AI, () => settings.colors.title, (v) => { settings.colors.title = v; saveSettings(); applyAppearance(); rebuild(); }, false);
}
document.querySelectorAll('#themeSeg button').forEach((b) => {
  b.onclick = () => { settings.theme = b.dataset.themeVal; saveSettings(); applyAppearance(); renderAppearance(); };
});
document.querySelectorAll('.secthead').forEach((h) => {
  h.addEventListener('click', () => {
    const body = h.parentElement.querySelector('.sectbody');
    const open = body.hidden;
    body.hidden = !open;
    h.querySelector('.exp').textContent = open ? '▴' : '▾';
    if (open && h.dataset.sect === 'colors') renderAppearance();
  });
});
document.querySelectorAll('.subhead').forEach((h) => {
  h.addEventListener('click', () => {
    const body = h.parentElement.querySelector('.subbody');
    body.hidden = !body.hidden;
    h.querySelector('.exp').textContent = body.hidden ? '▾' : '▴';
  });
});

/* ======================= حافظه و زبان ======================= */
function syncGeneral() {
  $('#memToggle').checked = settings.memory;
  $('#memAutoToggle').checked = settings.memoryAuto;
  $('#langSel').value = settings.lang;
}
$('#memToggle').addEventListener('change', (e) => { settings.memory = e.target.checked; saveSettings(); });
$('#memAutoToggle').addEventListener('change', (e) => { settings.memoryAuto = e.target.checked; saveSettings(); });
$('#langSel').addEventListener('change', (e) => {
  settings.lang = e.target.value; saveSettings();
  applyLang(); render(); syncGeneral(); renderProviders(); renderThreads();
});

/* ======================= گزارش کرش (معادل وب: خطاهای ثبت‌شده‌ی خود برنامه) ======================= */
window.addEventListener('error', (e) => {
  try { localStorage.setItem('fc.crash', new Date().toISOString() + '\n' + (e.message || 'error')); } catch (x) { /* ignore */ }
});
$('#crashRow').onclick = () => {
  let txt = '';
  try { txt = localStorage.getItem('fc.crash') || ''; } catch (e) { /* ignore */ }
  $('#crashText').textContent = txt || t('crashEmpty');
  const d = $('#crashDlg');
  if (!d.open) d.showModal();
};
$('#crashClose').onclick = () => $('#crashDlg').close();
$('#crashCopyBtn').onclick = async () => {
  try { await navigator.clipboard.writeText($('#crashText').textContent); toast(t('copied')); } catch (e) { toast(t('copyFail')); }
};

/* ======================= رویدادهای گفتگو و منوها ======================= */
$('#btnMenu').onclick = openDrawer;
$('#btnNewTop').onclick = () => { showScreen('chat'); newChatThread(); };
$('#btnDots').onclick = (e) => { e.stopPropagation(); const m = $('#headMenu'); m.hidden = !m.hidden; };
document.addEventListener('click', (e) => {
  const m = $('#headMenu');
  if (!m.hidden && !m.contains(e.target) && e.target !== $('#btnDots')) m.hidden = true;
});
$('#hmDelete').onclick = async () => {
  $('#headMenu').hidden = true;
  if (await askConfirm(t('delChatTitle'), t('delChatMsg'), t('del'))) {
    await deleteThreadById(curId);
    showScreen('chat'); render(); renderChips();
  }
};
$('#drawerSettingsRow').onclick = () => { $('#setSub').hidden = !$('#setSub').hidden; };
$('#drawerAiRow').onclick = () => { closeDrawer(); showScreen('ai'); };
$('#drawerSettingsMain').onclick = () => { closeDrawer(); syncGeneral(); showScreen('settings'); };
$('#drawerAbout').onclick = () => { closeDrawer(); showScreen('about'); };
$('#drawerHistory').onclick = () => { closeDrawer(); showScreen('history'); };
$('#scrim').onclick = () => { closeDrawer(); closeModelSheet(); };
$('#btnAttach').onclick = () => $('#file').click();
$('#btnModel').onclick = openModelSheet;
$('#modelSearch').addEventListener('input', (e) => renderModelSheet(e.target.value));
$('#histNew').onclick = () => { showScreen('chat'); newChatThread(); };
$('#tmRename').onclick = () => {
  const th = threadMenuFor; closeThreadMenu();
  if (!th) return;
  $('#renameInput').value = th.title || '';
  const d = $('#renameDlg');
  $('#renameOk').onclick = () => {
    const v = $('#renameInput').value.trim();
    if (v) th.title = v;
    saveThreads(); renderThreads(); d.close();
  };
  if (!d.open) d.showModal();
};
$('#tmShare').onclick = async () => {
  const th = threadMenuFor; closeThreadMenu();
  if (!th) return;
  const txt = th.messages.map((m) => (m.role === 'user' ? '👤 ' : '🤖 ') + m.text).join('\n\n');
  try {
    if (navigator.share) await navigator.share({ title: th.title || t('untitled'), text: txt });
    else { await navigator.clipboard.writeText(txt); toast(t('copied')); }
  } catch (e) { /* ignore */ }
};
$('#tmDelete').onclick = async () => {
  const th = threadMenuFor; closeThreadMenu();
  if (!th) return;
  if (await askConfirm(t('delChatTitle'), t('delChatMsg'), t('del'))) {
    await deleteThreadById(th.id);
    renderThreads(); render();
  }
};
$('#renameCancel').onclick = () => $('#renameDlg').close();
$('#file').onchange = (e) => { addFiles(e.target.files); e.target.value = ''; };
btnSend.onclick = send;
btnStop.onclick = () => { if (abortCtl) abortCtl.abort(); };
inputEl.addEventListener('input', () => { autoGrow(); updateUI(); });
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && window.matchMedia('(hover: hover)').matches) { e.preventDefault(); send(); }
});
inputEl.addEventListener('paste', (e) => {
  const fs = [...(e.clipboardData ? e.clipboardData.files : [])];
  if (fs.length) { e.preventDefault(); addFiles(fs); }
});
['dragenter', 'dragover'].forEach((ev) => document.addEventListener(ev, (e) => {
  if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); document.body.classList.add('dropping'); }
}));
['dragleave', 'drop'].forEach((ev) => document.addEventListener(ev, (e) => {
  e.preventDefault(); document.body.classList.remove('dropping');
  if (ev === 'drop' && e.dataTransfer) addFiles(e.dataTransfer.files);
}));
document.querySelectorAll('[data-back]').forEach((b) => { b.onclick = () => showScreen(b.dataset.back); });
$('#rowAi').onclick = () => showScreen('ai');
$('#rowProviders').onclick = () => showScreen('providers');
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (settings.theme === 'system' || settings.colors.bg === 'system') applyAppearance(); });

/* نصب برنامه */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; $('#btnInstall').hidden = false; });
$('#btnInstall').onclick = async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt(); await deferredInstall.userChoice;
  deferredInstall = null; $('#btnInstall').hidden = true;
};
window.addEventListener('appinstalled', () => { $('#btnInstall').hidden = true; });

/* فایل‌های دریافت‌شده از «اشتراک‌گذاری» */
async function importShared() {
  const q = new URLSearchParams(location.search);
  if (!q.has('shared') || !('caches' in window)) return;
  history.replaceState(null, '', location.pathname);
  try {
    const c = await caches.open('shared-files');
    const files = [];
    for (const k of await c.keys()) {
      const r = await c.match(k);
      if (!r) continue;
      files.push(new File([await r.blob()], decodeURIComponent(r.headers.get('X-Name') || 'file'), { type: r.headers.get('Content-Type') || '' }));
      await c.delete(k);
    }
    if (files.length) addFiles(files);
  } catch (e) { /* ignore */ }
}

/* شروع */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
saveSettings(); saveThreads();
applyAppearance(); applyLang(); syncGeneral();
showScreen('chat');
render(); renderChips();
importShared();
if (!settings.providers.length) { toast(t('keyFirst')); showScreen('providers'); openProvForm(null); }
