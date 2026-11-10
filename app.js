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

/* ======================= وضعیت و تنظیمات (پوسته ArsinLia) ======================= */
const LANGS = {
  fa: { dir: 'rtl', name: 'فارسی' }, en: { dir: 'ltr', name: 'English' }, ar: { dir: 'rtl', name: 'العربية' }
};
const STR = {
  fa: {
    appTitle: 'چت با فایل', chats: 'گفتگوها', newChat: 'گفتگوی جدید', settings: 'تنظیمات',
    aiSettings: 'تنظیمات هوش مصنوعی', providers: 'ارائه دهندگان هوش مصنوعی', addProvider: 'افزودن ارائه‌دهنده',
    appearance: 'ظاهر و رنگ', language: 'زبان', memory: 'حافظه‌ی گفتگو', memoryHint: 'مدل از پیام‌های قبلی همین گفتگو باخبر باشد',
    about: 'درباره', back: 'بازگشت', theme: 'تم', themeSystem: 'سیستم', themeLight: 'روشن', themeDark: 'تیره',
    colorMe: 'رنگ حباب پیام‌های من', colorAi: 'رنگ حباب پاسخ‌ها', colorAccent: 'رنگ اصلی (دکمه‌ها)', resetColors: 'بازگردانی رنگ‌های پیش‌فرض',
    systemPrompt: 'پرامپت سیستمی', temperature: 'دمای پاسخ (خلاقیت)', pdfImg: 'ارسال PDF به صورت تصویر (فقط ۱۰ صفحه‌ی اول — فقط برای PDF اسکن‌شده؛ PDF متنی را با این گزینه نفرستید)',
    save: 'ذخیره', cancel: 'انصراف', close: 'بستن', del: 'حذف', edit: 'ویرایش',
    pName: 'نام ارائه‌دهنده', pType: 'نوع API', pBase: 'Base URL', pKey: 'API Key', showKey: 'نمایش کلید', pModel: 'نام مدل',
    loadModels: 'بارگزاری مدلها', loadingModels: 'در حال بارگزاری مدلها...', needBaseKey: 'اول Base URL و API Key را وارد کنید.',
    noModels: 'پرووایدر هیچ مدلی برنگرداند.', modelsLoaded: 'مدل بارگزاری شد. روی مدل موردنظر بزنید، بعد «ذخیره» را بزنید.',
    connFail: 'اتصال ممکن نشد: ', fillAll: 'نام، آدرس، کلید و مدل را کامل کنید', saved: 'ذخیره شد',
    placeholder: 'سؤال درباره‌ی فایل‌ها...', send: 'ارسال', stop: 'توقف', retry: 'تلاش مجدد', copy: 'کپی', copied: 'کپی شد', copyFail: 'کپی ممکن نشد',
    sources: 'منابع: ', readingFile: 'در حال خواندن فایل...', untitled: 'گفتگوی بدون عنوان',
    searchModels: 'جستجوی مدل...', chooseModel: 'انتخاب مدل', noProvider: 'هنوز ارائه‌دهنده‌ای با کلید ثبت نشده است — از تنظیمات اضافه کنید.',
    keyFirst: 'ابتدا از تنظیمات یک ارائه‌دهنده با کلید API اضافه کنید', emptyAnswer: '(پاسخ خالی دریافت شد)',
    hintTitle: 'فایل‌هایتان را بدهید، سؤال بپرسید', hintBody: 'با دکمه‌ی گیره، کشیدن‌ورها کردن یا چسباندن، فایل اضافه کنید:',
    hintFormats: 'PDF کامل خوانده می‌شود؛ Word (docx)، Excel، PowerPoint، متن، تصویر و صوت/ویدیو (Gemini) هم پشتیبانی می‌شوند.',
    qSummary: 'خلاصه‌ی فایل‌ها', qKeys: 'نکات کلیدی', qIssues: 'بررسی ایرادها',
    viewEnable: 'فعال‌کردن در پاسخ‌ها', viewDisable: 'غیرفعال‌کردن در پاسخ‌ها', viewNone: '(متن قابل نمایشی برای این فایل در حافظه نیست)',
    clearData: 'پاک کردن همه‌ی داده‌ها', clearConfirm: 'کلیدها، تنظیمات و همه‌ی گفتگوها پاک شود؟',
    delChatConfirm: 'این گفتگو پاک شود؟', delProvConfirm: 'این ارائه‌دهنده پاک شود؟', newChatConfirm: 'گفتگوی جدید شروع شود؟',
    aboutText: 'چت با فایل‌ها: PDF و اسناد را کامل می‌خواند و برای هر سؤال، بخش مرتبط از متن کامل را پیدا می‌کند و پاسخ را بر همان اساس می‌دهد. به هر ارائه‌دهنده‌ای با نشانی و کلید خودتان وصل می‌شود؛ کلید فقط در حافظه‌ی همین دستگاه می‌ماند.',
    version: 'نسخه ۵٫۰', install: 'نصب برنامه', attach: 'پیوست فایل', fileOff: ' (غیرفعال)', readFail: 'خواندن فایل ناموفق بود',
    colorDone: 'انجام شد؛ رنگ تغییر کرد.', noChats: 'هنوز گفتگویی نیست'
  },
  en: {
    appTitle: 'FileChat', chats: 'Chats', newChat: 'New chat', settings: 'Settings',
    aiSettings: 'AI settings', providers: 'AI providers', addProvider: 'Add provider',
    appearance: 'Appearance & colors', language: 'Language', memory: 'Conversation memory', memoryHint: 'Let the model see earlier messages of this chat',
    about: 'About', back: 'Back', theme: 'Theme', themeSystem: 'System', themeLight: 'Light', themeDark: 'Dark',
    colorMe: 'My message bubble color', colorAi: 'Reply bubble color', colorAccent: 'Accent color (buttons)', resetColors: 'Reset default colors',
    systemPrompt: 'System prompt', temperature: 'Temperature', pdfImg: 'Send PDF as images (first 10 pages only — scanned PDFs only)',
    save: 'Save', cancel: 'Cancel', close: 'Close', del: 'Delete', edit: 'Edit',
    pName: 'Provider name', pType: 'API type', pBase: 'Base URL', pKey: 'API Key', showKey: 'Show key', pModel: 'Model name',
    loadModels: 'Load models', loadingModels: 'Loading models...', needBaseKey: 'Enter Base URL and API Key first.',
    noModels: 'The provider returned no models.', modelsLoaded: 'models loaded. Tap a model, then Save.',
    connFail: 'Connection failed: ', fillAll: 'Complete name, URL, key and model', saved: 'Saved',
    placeholder: 'Ask about your files...', send: 'Send', stop: 'Stop', retry: 'Retry', copy: 'Copy', copied: 'Copied', copyFail: 'Copy failed',
    sources: 'Sources: ', readingFile: 'Reading file...', untitled: 'Untitled chat',
    searchModels: 'Search models...', chooseModel: 'Choose model', noProvider: 'No provider with a key yet — add one in Settings.',
    keyFirst: 'First add a provider with an API key in Settings', emptyAnswer: '(empty reply)',
    hintTitle: 'Give your files, ask questions', hintBody: 'Add files with the clip button, drag & drop, or paste:',
    hintFormats: 'PDFs are read in full; Word (docx), Excel, PowerPoint, text, images and audio/video (Gemini) are supported.',
    qSummary: 'Summarize files', qKeys: 'Key points', qIssues: 'Review issues',
    viewEnable: 'Enable in answers', viewDisable: 'Disable in answers', viewNone: '(no displayable text stored for this file)',
    clearData: 'Erase all data', clearConfirm: 'Erase keys, settings and all chats?',
    delChatConfirm: 'Delete this chat?', delProvConfirm: 'Delete this provider?', newChatConfirm: 'Start a new chat?',
    aboutText: 'Chat with your files: reads PDFs and documents in full and, for each question, finds the relevant part of the complete text and answers from it. Connects to any provider with your own URL and key; keys stay only on this device.',
    version: 'Version 5.0', install: 'Install app', attach: 'Attach file', fileOff: ' (off)', readFail: 'Could not read the file',
    colorDone: 'Done; color changed.', noChats: 'No chats yet'
  },
  ar: {
    appTitle: 'الدردشة مع الملف', chats: 'المحادثات', newChat: 'محادثة جديدة', settings: 'الإعدادات',
    aiSettings: 'إعدادات الذكاء الاصطناعي', providers: 'مقدمو الذكاء الاصطناعي', addProvider: 'إضافة مقدم',
    appearance: 'المظهر والألوان', language: 'اللغة', memory: 'ذاكرة المحادثة', memoryHint: 'اطلاع النموذج على رسائل هذه المحادثة السابقة',
    about: 'حول', back: 'رجوع', theme: 'السمة', themeSystem: 'النظام', themeLight: 'فاتح', themeDark: 'داكن',
    colorMe: 'لون فقاعة رسائلي', colorAi: 'لون فقاعة الردود', colorAccent: 'اللون الرئيسي (الأزرار)', resetColors: 'استعادة الألوان الافتراضية',
    systemPrompt: 'موجه النظام', temperature: 'حرارة الرد', pdfImg: 'إرسال PDF كصور (أول ١٠ صفحات فقط — للمسح الضوئي فقط)',
    save: 'حفظ', cancel: 'إلغاء', close: 'إغلاق', del: 'حذف', edit: 'تعديل',
    pName: 'اسم المقدم', pType: 'نوع API', pBase: 'Base URL', pKey: 'API Key', showKey: 'إظهار المفتاح', pModel: 'اسم النموذج',
    loadModels: 'تحميل النماذج', loadingModels: 'جار تحميل النماذج...', needBaseKey: 'أدخل Base URL و API Key أولا.',
    noModels: 'لم يرجع المقدم أي نموذج.', modelsLoaded: 'نموذجا تم تحميلها. اضغط نموذجا ثم احفظ.',
    connFail: 'فشل الاتصال: ', fillAll: 'أكمل الاسم والعنوان والمفتاح والنموذج', saved: 'تم الحفظ',
    placeholder: 'اسأل عن ملفاتك...', send: 'إرسال', stop: 'إيقاف', retry: 'إعادة المحاولة', copy: 'نسخ', copied: 'تم النسخ', copyFail: 'فشل النسخ',
    sources: 'المصادر: ', readingFile: 'جار قراءة الملف...', untitled: 'محادثة بلا عنوان',
    searchModels: 'بحث النماذج...', chooseModel: 'اختيار النموذج', noProvider: 'لا مقدم بمفتاح بعد — أضفه من الإعدادات.',
    keyFirst: 'أضف أولا مقدما بمفتاح API من الإعدادات', emptyAnswer: '(رد فارغ)',
    hintTitle: 'أعط ملفاتك واسأل', hintBody: 'أضف الملفات بزر المشبك أو السحب أو اللصق:',
    hintFormats: 'تقرأ ملفات PDF كاملة؛ وتدعم Word و Excel و PowerPoint والنصوص والصور والصوت/الفيديو (Gemini).',
    qSummary: 'تلخيص الملفات', qKeys: 'النقاط الرئيسية', qIssues: 'مراجعة الأخطاء',
    viewEnable: 'التفعيل في الردود', viewDisable: 'التعطيل في الردود', viewNone: '(لا نص محفوظ لهذا الملف)',
    clearData: 'مسح كل البيانات', clearConfirm: 'مسح المفاتيح والإعدادات وكل المحادثات؟',
    delChatConfirm: 'حذف هذه المحادثة؟', delProvConfirm: 'حذف هذا المقدم؟', newChatConfirm: 'بدء محادثة جديدة؟',
    aboutText: 'الدردشة مع ملفاتك: يقرأ ملفات PDF والمستندات كاملة ويجد لكل سؤال الجزء المناسب من النص الكامل ويجيب بناء عليه. يتصل بأي مقدم بعنوانك ومفتاحك؛ تبقى المفاتيح على هذا الجهاز فقط.',
    version: 'الإصدار ٥٫٠', install: 'تثبيت التطبيق', attach: 'إرفاق ملف', fileOff: ' (معطل)', readFail: 'تعذرت قراءة الملف',
    colorDone: 'تم؛ تغير اللون.', noChats: 'لا محادثات بعد'
  }
};
function t(k) { const L = STR[settings.lang] || STR.fa; return L[k] || STR.fa[k] || k; }

let uidC = Date.now() % 100000;
function uid() { return 'x' + (++uidC).toString(36) + Date.now().toString(36).slice(-3); }

function defaultSettings() {
  return {
    v: 2, providers: [], systemPrompt: DEFAULT_PROMPT, pdfAsImages: false, temperature: 1,
    theme: 'system', lang: 'fa', memory: true,
    colors: { me: '', ai: '', accent: '' }
  };
}
function loadSettings() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem('fc.settings') || 'null'); } catch (e) { /* ignore */ }
  const d = defaultSettings();
  if (s && s.v === 2 && Array.isArray(s.providers)) return Object.assign(d, s, { colors: Object.assign(d.colors, s.colors || {}) });
  if (s && PROVIDERS[s.provider]) {
    // مهاجرت از نسخه‌ی تک‌پرووایدر
    d.providers = [{
      id: uid(), name: t0(s.provider), type: s.provider,
      baseUrl: s.baseUrl || PROVIDERS[s.provider].base, apiKey: s.apiKey || '',
      model: s.model || PROVIDERS[s.provider].model, models: []
    }];
    d.systemPrompt = s.systemPrompt || d.systemPrompt;
    d.pdfAsImages = !!s.pdfAsImages; d.temperature = s.temperature ?? 1;
    return d;
  }
  return d;
}
function t0(type) { return type === 'anthropic' ? 'Anthropic' : type === 'gemini' ? 'Gemini' : 'OpenAI'; }
function saveSettings() { try { localStorage.setItem('fc.settings', JSON.stringify(settings)); } catch (e) { /* ignore */ } }

/* گفتگوها (رشته‌ها) */
function newThread() {
  return { id: uid(), title: '', sel: null, messages: [] };
}
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
    if (Array.isArray(old) && old.length) { const th = newThread(); th.messages = old; th.title = ''; return [th]; }
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

/* انتخاب مدل جاری */
function providerById(id) { return settings.providers.find((p) => p.id === id) || null; }
function activeProviders() { return settings.providers.filter((p) => p.apiKey && p.apiKey.trim()); }
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
    provider: p.type, baseUrl: p.baseUrl, apiKey: p.apiKey, model: sel.model || p.model,
    systemPrompt: settings.systemPrompt, temperature: settings.temperature
  };
}

/* ظاهر: تم و رنگ‌ها */
function lum(hex) {
  const c = hex.replace('#', '');
  if (c.length < 6) return 1;
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
function applyAppearance() {
  const root = document.documentElement;
  let dark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'dark' : 'light';
  const cs = settings.colors || {};
  if (cs.me) { root.style.setProperty('--me', cs.me); root.style.setProperty('--on-me', lum(cs.me) > 0.6 ? '#1b1d2a' : '#ffffff'); }
  else { root.style.removeProperty('--me'); root.style.removeProperty('--on-me'); }
  if (cs.ai) { root.style.setProperty('--ai-bg', cs.ai); root.style.setProperty('--on-ai', lum(cs.ai) > 0.6 ? '#1b1d2a' : '#f2f3fa'); }
  else { root.style.removeProperty('--ai-bg'); root.style.removeProperty('--on-ai'); }
  if (cs.accent) root.style.setProperty('--primary', cs.accent);
  else root.style.removeProperty('--primary');
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

/* ======================= رابط کاربری: گفتگو ======================= */
const chatEl = $('#chat'), inputEl = $('#input'), chipsEl = $('#chips'), errEl = $('#errbar');
const btnSend = $('#btnSend'), btnStop = $('#btnStop');

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
      // نمایش کلمه‌به‌کلمه، نرم و به ترتیب جمله — بدون کندکردن پاسخ
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
      if (stick) scrollBottom();
    }
    if (!busy && shownLen >= full.length) stopReveal();
  }, 30);
}
function updateStream() { /* نمایش تدریجی با تایمر انجام می‌شود */ }

function makeBubble(m, streaming) {
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + m.role;
  const b = document.createElement('div');
  b.className = 'bubble';
  if (m.role === 'user') {
    for (const f of m.files || []) {
      const c = document.createElement('div'); c.className = 'fchip'; c.textContent = '📎 ' + f.name + (f.off ? t('fileOff') : '');
      c.title = f.name; c.onclick = () => viewFile(f); b.append(c);
    }
    const p = document.createElement('div'); p.className = 'utext'; p.textContent = m.text; b.append(p);
  } else {
    const c = document.createElement('div');
    c.className = 'md' + (streaming ? ' typing' : '');
    c.innerHTML = md(m.text);
    b.append(c);
    if (!streaming && m.text) {
      b.classList.add('has-copy');
      const cp = document.createElement('button');
      cp.className = 'copy'; cp.textContent = t('copy');
      cp.onclick = async () => { try { await navigator.clipboard.writeText(m.text); toast(t('copied')); } catch (e) { toast(t('copyFail')); } };
      b.append(cp);
    }
    if (!streaming && m.sources && m.sources.length) {
      const sr = document.createElement('div'); sr.className = 'srcs';
      sr.textContent = t('sources') + m.sources.join('، ');
      b.append(sr);
    }
    if (streaming) streamEl = c;
  }
  wrap.append(b);
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
    const h = document.createElement('div'); h.className = 'hint';
    h.innerHTML = '<h2>' + esc(t('hintTitle')) + '</h2><div>' + esc(t('hintBody')) + '</div><div class="hints">' + esc(t('hintFormats')) + '</div>';
    chatEl.append(h);
  }
  msgs.forEach((m, i) => {
    const streaming = busy && i === msgs.length - 1 && m.role === 'assistant';
    chatEl.append(makeBubble(m, streaming));
  });
  scrollBottom();
  updateUI();
  renderThreads();
  updateModelChip();
}

function renderChips() {
  chipsEl.innerHTML = '';
  pending.forEach((f, i) => {
    const c = document.createElement('div'); c.className = 'chip' + (f.off ? ' off' : '');
    const s = document.createElement('span'); s.className = 'nm'; s.textContent = f.name; s.title = f.name;
    s.onclick = () => viewFile(f);
    const x = document.createElement('button'); x.textContent = '×'; x.setAttribute('aria-label', '×');
    x.onclick = () => { pending.splice(i, 1); renderChips(); updateUI(); };
    c.append(s, x); chipsEl.append(c);
  });
  if (processing) {
    const c = document.createElement('div'); c.className = 'chip busy';
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
  btnSend.disabled = !can;
  btnSend.hidden = busy;
  btnStop.hidden = !busy;
  inputEl.placeholder = t('placeholder');
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

/* ======================= منوی کناری: فهرست گفتگوها ======================= */
function openDrawer() { renderThreads(); $('#drawer').classList.add('open'); $('#scrim').hidden = false; }
function closeDrawer() { $('#drawer').classList.remove('open'); $('#scrim').hidden = true; }
function renderThreads() {
  const list = $('#threadList');
  if (!list) return;
  list.innerHTML = '';
  if (!threads.length) { list.innerHTML = '<div class="empty">' + esc(t('noChats')) + '</div>'; return; }
  for (const th of threads) {
    const row = document.createElement('div');
    row.className = 'trow' + (th.id === curId ? ' cur' : '');
    const main = document.createElement('div'); main.className = 'tmain';
    const tt = document.createElement('div'); tt.className = 'ttitle'; tt.textContent = th.title || t('untitled');
    const tm = document.createElement('div'); tm.className = 'tmodel'; tm.textContent = threadModelName(th);
    main.append(tt, tm);
    main.onclick = () => { setCur(th.id); closeDrawer(); stopReveal(); render(); };
    const del = document.createElement('button'); del.className = 'tdel'; del.textContent = '🗑';
    del.onclick = (e) => {
      e.stopPropagation();
      if (!confirm(t('delChatConfirm'))) return;
      threads = threads.filter((x) => x.id !== th.id);
      if (!threads.length) threads = [newThread()];
      if (!threads.some((x) => x.id === curId)) setCur(threads[0].id);
      saveThreads(); render();
    };
    row.append(main, del);
    list.append(row);
  }
}

/* ======================= کشوی انتخاب مدل ======================= */
function updateModelChip() {
  const sel = currentSel();
  const chip = $('#btnModel');
  const name = sel && sel.model ? sel.model : t('chooseModel');
  chip.textContent = name.length > 26 ? name.slice(0, 26) + '…' : name;
  $('#hdrModel').textContent = sel ? (providerById(sel.providerId) ? providerById(sel.providerId).name + ' · ' : '') + (sel.model || '') : '';
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
  const query = (q || '').toLowerCase();
  const aps = activeProviders();
  if (!aps.length) { box.innerHTML = '<div class="empty">' + esc(t('noProvider')) + '</div>'; return; }
  const sel = currentSel();
  for (const p of aps) {
    const models = (p.models && p.models.length) ? p.models : (p.model ? [p.model] : []);
    const shown = models.filter((m) => !query || m.toLowerCase().includes(query));
    if (!shown.length) continue;
    const gh = document.createElement('div'); gh.className = 'ghead'; gh.textContent = p.name;
    box.append(gh);
    for (const m of shown) {
      const r = document.createElement('button');
      r.className = 'mrow2' + (sel && sel.providerId === p.id && sel.model === m ? ' sel' : '');
      r.textContent = m; r.dir = 'ltr';
      r.onclick = () => {
        cur().sel = { providerId: p.id, model: m };
        saveThreads(); updateModelChip(); closeModelSheet(); renderThreads();
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

/* دستور رنگ در چت (به سبک ArsinLia): هر جمله‌ای که رنگ و بخش هدف را نام ببرد */
const COLOR_WORDS = [
  ['طلایی', '#c9a227'], ['gold', '#c9a227'], ['ذهبي', '#c9a227'],
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
  ['قهوه ای', '#8d5524'], ['قهوه‌ای', '#8d5524'], ['brown', '#8d5524'], ['بني', '#8d5524'],
  ['نقره ای', '#adb5bd'], ['نقره‌ای', '#adb5bd'], ['silver', '#adb5bd'], ['فضي', '#adb5bd'],
  ['فیروزه ای', '#0ca678'], ['فیروزه‌ای', '#0ca678'], ['teal', '#0ca678'],
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
  if (/(حباب پاسخ|پاسخ ها|پاسخ‌ها|حباب دستیار|حباب هوش|ردود|الرد|assistant)/.test(text)) target = 'ai';
  else if (/(رنگ اصلی|دکمه|تم |قالب|accent|button|الرئيسي|الأزرار)/.test(text)) target = 'accent';
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

function autoGrow() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px';
}

/* ======================= پیمایش صفحه‌ها ======================= */
const SCREENS = ['chat', 'settings', 'ai', 'providers', 'provform', 'appearance', 'about'];
function showScreen(name) {
  for (const s of SCREENS) {
    const el = $('#scr-' + s);
    if (el) el.hidden = s !== name;
  }
  if (name === 'providers') renderProviders();
  window.scrollTo(0, 0);
}

/* ======================= بارگزاری مدلها ======================= */
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

/* ======================= ارائه‌دهندگان ======================= */
function renderProviders() {
  const box = $('#provList');
  box.innerHTML = '';
  for (const p of settings.providers) {
    const card = document.createElement('div'); card.className = 'pcard';
    const top = document.createElement('div'); top.className = 'pcard-top';
    const nm = document.createElement('div'); nm.className = 'pname'; nm.textContent = p.name;
    const tp = document.createElement('div'); tp.className = 'ptype'; tp.textContent = t0(p.type);
    top.append(nm, tp);
    const meta = document.createElement('div'); meta.className = 'pmeta'; meta.dir = 'ltr'; meta.textContent = p.baseUrl;
    const meta2 = document.createElement('div'); meta2.className = 'pmeta';
    meta2.textContent = (p.model || '') + ((p.models && p.models.length) ? ' · ' + p.models.length + ' ✓' : '');
    const acts = document.createElement('div'); acts.className = 'pacts';
    const be = document.createElement('button'); be.className = 'txt'; be.textContent = t('edit');
    be.onclick = () => openProvForm(p.id);
    const bd = document.createElement('button'); bd.className = 'txt danger-t'; bd.textContent = t('del');
    bd.onclick = () => {
      if (!confirm(t('delProvConfirm'))) return;
      settings.providers = settings.providers.filter((x) => x.id !== p.id);
      for (const th of threads) if (th.sel && th.sel.providerId === p.id) th.sel = null;
      saveSettings(); saveThreads(); renderProviders(); render();
    };
    acts.append(be, bd);
    card.append(top, meta, meta2, acts);
    box.append(card);
  }
}

let editingId = null, formModels = null;
function openProvForm(id) {
  editingId = id || null;
  formModels = null;
  const p = id ? providerById(id) : null;
  $('#pfName').value = p ? p.name : '';
  $('#pfType').value = p ? p.type : 'openai';
  const type = $('#pfType').value;
  $('#pfBase').value = p ? p.baseUrl : PROVIDERS[type].base;
  $('#pfKey').value = p ? p.apiKey : '';
  $('#pfKey').type = 'password'; $('#pfShow').checked = false;
  $('#pfModel').value = p ? p.model : PROVIDERS[type].model;
  $('#pfHint').textContent = PROVIDERS[type].hint;
  $('#pfModels').hidden = true; $('#pfModels').innerHTML = '';
  $('#pfModelsMsg').textContent = '';
  showScreen('provform');
}
$('#pfType').onchange = () => {
  const old = PROVIDERS[editingId && providerById(editingId) ? providerById(editingId).type : 'openai'];
  const nw = PROVIDERS[$('#pfType').value];
  const b = $('#pfBase'), m = $('#pfModel');
  if (!b.value.trim() || b.value.trim() === old.base) b.value = nw.base;
  if (!m.value.trim() || m.value.trim() === old.model) m.value = nw.model;
  $('#pfHint').textContent = nw.hint;
};
$('#pfShow').onchange = (e) => { $('#pfKey').type = e.target.checked ? 'text' : 'password'; };
function renderFormModels(ids) {
  const box = $('#pfModels');
  box.innerHTML = '';
  for (const id of ids) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mrow' + (id === $('#pfModel').value.trim() ? ' sel' : ''); b.textContent = id;
    b.onclick = () => {
      $('#pfModel').value = id;
      box.querySelectorAll('.mrow').forEach((r) => r.classList.toggle('sel', r === b));
    };
    box.append(b);
  }
  box.hidden = !ids.length;
}
$('#pfLoad').onclick = async () => {
  const base = $('#pfBase').value.trim(), key = $('#pfKey').value.trim();
  const msg = $('#pfModelsMsg');
  if (!base || !key) { msg.textContent = t('needBaseKey'); return; }
  const btn = $('#pfLoad');
  btn.disabled = true; msg.textContent = t('loadingModels');
  try {
    const rq = modelsRequest($('#pfType').value, base, key);
    const resp = await fetch(rq.url, { headers: rq.headers });
    const raw = await resp.text();
    if (!resp.ok) { msg.textContent = 'HTTP ' + resp.status + '\n' + raw.slice(0, 800); $('#pfModels').hidden = true; return; }
    let ids = [];
    try { ids = rq.parse(JSON.parse(raw)); } catch (e) { /* ignore */ }
    ids = [...new Set(ids)].sort();
    if (!ids.length) { msg.textContent = t('noModels'); $('#pfModels').hidden = true; return; }
    formModels = ids;
    renderFormModels(ids);
    msg.textContent = ids.length + ' ' + t('modelsLoaded');
  } catch (e) {
    msg.textContent = t('connFail') + e.message;
    $('#pfModels').hidden = true;
  } finally { btn.disabled = false; }
};
$('#pfSave').onclick = () => {
  const name = $('#pfName').value.trim(), base = $('#pfBase').value.trim(),
    key = $('#pfKey').value.trim(), model = $('#pfModel').value.trim(), type = $('#pfType').value;
  if (!name || !base || !key || !model) { toast(t('fillAll')); return; }
  if (editingId) {
    const p = providerById(editingId);
    Object.assign(p, { name, type, baseUrl: base, apiKey: key, model });
    if (formModels) p.models = formModels;
  } else {
    settings.providers.push({ id: uid(), name, type, baseUrl: base, apiKey: key, model, models: formModels || [] });
  }
  saveSettings(); toast(t('saved'));
  showScreen('providers'); render();
};
$('#pfCancel').onclick = () => showScreen('providers');

/* ======================= ظاهر و رنگ ======================= */
const SWATCHES = ['#d92d20', '#e8590c', '#e8a100', '#2f9e44', '#0ca678', '#1971c2', '#7048e8', '#d6336c', '#c9a227', '#22345c', '#868e96', '#23242e'];
function renderAppearance() {
  document.querySelectorAll('#themeSeg button').forEach((b) => b.classList.toggle('sel', b.dataset.themeVal === settings.theme));
  for (const key of ['me', 'ai', 'accent']) {
    const box = $('#sw-' + key);
    box.innerHTML = '';
    for (const c of SWATCHES) {
      const s = document.createElement('button');
      s.className = 'sw' + (settings.colors[key] === c ? ' sel' : '');
      s.style.background = c; s.setAttribute('aria-label', c);
      s.onclick = () => { settings.colors[key] = c; saveSettings(); applyAppearance(); renderAppearance(); };
      box.append(s);
    }
    const inp = $('#cp-' + key);
    if (settings.colors[key]) inp.value = settings.colors[key];
  }
}
document.querySelectorAll('#themeSeg button').forEach((b) => {
  b.onclick = () => { settings.theme = b.dataset.themeVal; saveSettings(); applyAppearance(); renderAppearance(); };
});
for (const key of ['me', 'ai', 'accent']) {
  $('#cp-' + key).addEventListener('input', (e) => { settings.colors[key] = e.target.value; saveSettings(); applyAppearance(); });
  $('#cp-' + key).addEventListener('change', () => renderAppearance());
}
$('#resetColors').onclick = () => {
  settings.colors = { me: '', ai: '', accent: '' };
  saveSettings(); applyAppearance(); renderAppearance();
};

/* ======================= تنظیمات عمومی ======================= */
function syncGeneral() {
  $('#gPrompt').value = settings.systemPrompt;
  $('#gTemp').value = settings.temperature ?? 1;
  $('#gTempVal').textContent = $('#gTemp').value;
  $('#gPdfImg').checked = settings.pdfAsImages;
  $('#memToggle').checked = settings.memory;
  $('#langSel').value = settings.lang;
}
$('#gPrompt').addEventListener('change', () => { settings.systemPrompt = $('#gPrompt').value; saveSettings(); });
$('#gTemp').addEventListener('input', (e) => { $('#gTempVal').textContent = e.target.value; settings.temperature = parseFloat(e.target.value); saveSettings(); });
$('#gPdfImg').addEventListener('change', (e) => { settings.pdfAsImages = e.target.checked; saveSettings(); });
$('#memToggle').addEventListener('change', (e) => { settings.memory = e.target.checked; saveSettings(); });
$('#langSel').addEventListener('change', (e) => {
  settings.lang = e.target.value; saveSettings();
  applyLang(); render(); syncGeneral(); renderProviders();
});
$('#clearData').onclick = () => {
  if (!confirm(t('clearConfirm'))) return;
  for (const k of ['fc.settings', 'fc.threads', 'fc.chat', 'fc.cur']) localStorage.removeItem(k);
  settings = defaultSettings(); threads = [newThread()]; setCur(threads[0].id);
  pending = []; applyAppearance(); applyLang(); syncGeneral(); render(); renderChips();
  showScreen('settings');
};

/* ======================= رویدادها ======================= */
$('#btnMenu').onclick = openDrawer;
$('#btnSettings').onclick = () => { syncGeneral(); showScreen('settings'); };
$('#btnNewTop').onclick = () => { if (!cur().messages.length || confirm(t('newChatConfirm'))) newChatThread(); };
$('#drawerNew').onclick = () => { closeDrawer(); newChatThread(); };
$('#drawerSettings').onclick = () => { closeDrawer(); syncGeneral(); showScreen('settings'); };
$('#scrim').onclick = () => { closeDrawer(); closeModelSheet(); };
$('#btnAttach').onclick = () => $('#file').click();
$('#btnModel').onclick = openModelSheet;
$('#modelSearch').addEventListener('input', (e) => renderModelSheet(e.target.value));
document.querySelectorAll('#quick button').forEach((b) => {
  b.onclick = () => { inputEl.value = b.getAttribute('data-q'); autoGrow(); updateUI(); inputEl.focus(); };
});
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
$('#rowAppearance').onclick = () => { renderAppearance(); showScreen('appearance'); };
$('#rowAbout').onclick = () => showScreen('about');
$('#addProvider').onclick = () => openProvForm(null);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (settings.theme === 'system') applyAppearance(); });

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
if (!activeProviders().length) { toast(t('keyFirst')); showScreen('providers'); openProvForm(null); }
