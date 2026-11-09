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

function defaults() {
  return {
    provider: 'openai', baseUrl: PROVIDERS.openai.base, apiKey: '', model: PROVIDERS.openai.model,
    systemPrompt: DEFAULT_PROMPT, pdfAsImages: false, temperature: 1
  };
}
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('fc.settings') || 'null');
    if (s && PROVIDERS[s.provider]) return Object.assign(defaults(), s);
  } catch (e) { /* ignore */ }
  return defaults();
}
function saveSettings() { localStorage.setItem('fc.settings', JSON.stringify(settings)); }

function loadChat() {
  try { const m = JSON.parse(localStorage.getItem('fc.chat') || '[]'); return Array.isArray(m) ? m : []; }
  catch (e) { return []; }
}
function saveChat() {
  const slim = (withText) => messages.map((m) => ({
    role: m.role, text: m.text, sources: m.sources,
    files: (m.files || []).map((f) => ({
      name: f.name, note: f.note, off: f.off,
      text: withText ? f.text : undefined,
      imageCount: (f.images || []).length || f.imageCount || 0,
      hadMedia: !!f.media || !!f.hadMedia
    }))
  }));
  try { localStorage.setItem('fc.chat', JSON.stringify(slim(true))); }
  catch (e) {
    try { localStorage.setItem('fc.chat', JSON.stringify(slim(false))); } catch (e2) { /* ignore */ }
  }
}

let settings = loadSettings();
let messages = loadChat();      // {role, text, files:[{name,text,note,images,media}]}
let pending = [];
let processing = 0;
let busy = false;
let abortCtl = null;
let lastError = null;

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

/* ======================= ارتباط با API ======================= */
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

async function callModel(history, onDelta, signal) {
  const req = buildRequest(settings, normalizeHistory(history));
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

/* ======================= رابط کاربری ======================= */
const chatEl = $('#chat'), inputEl = $('#input'), chipsEl = $('#chips'), errEl = $('#errbar');
const btnSend = $('#btnSend'), btnStop = $('#btnStop');
let streamEl = null;

function nearBottom() { return chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight < 120; }
function scrollBottom() { chatEl.scrollTop = chatEl.scrollHeight; }

function makeBubble(m, streaming) {
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + m.role;
  const b = document.createElement('div');
  b.className = 'bubble';
  if (m.role === 'user') {
    for (const f of m.files || []) {
      const c = document.createElement('div'); c.className = 'fchip'; c.textContent = '📎 ' + f.name + (f.off ? ' (غیرفعال)' : '');
      c.title = 'دیدن متن فایل'; c.onclick = () => viewFile(f); b.append(c);
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
      cp.className = 'copy'; cp.textContent = 'کپی';
      cp.onclick = async () => { try { await navigator.clipboard.writeText(m.text); toast('کپی شد'); } catch (e) { toast('کپی ممکن نشد'); } };
      b.append(cp);
    }
    if (!streaming && m.sources && m.sources.length) {
      const sr = document.createElement('div'); sr.className = 'srcs';
      sr.textContent = 'منابع: ' + m.sources.join('، ');
      b.append(sr);
    }
    if (streaming) streamEl = c;
  }
  wrap.append(b);
  return wrap;
}

function render() {
  streamEl = null;
  chatEl.innerHTML = '';
  if (!messages.length) {
    chatEl.innerHTML = '<div class="hint"><h2>فایل‌هایتان را بدهید، سؤال بپرسید</h2>' +
      '<div>با دکمه‌ی گیره، کشیدن‌ورها کردن یا چسباندن، فایل اضافه کنید:</div><ul>' +
      '<li>PDF، Word (docx)، Excel، PowerPoint (pptx)</li>' +
      '<li>متن، CSV، JSON، HTML، کد</li>' +
      '<li>تصویر (با مدل بینا)</li>' +
      '<li>صوت و ویدیو (فقط با Gemini)</li></ul>' +
      '<div>برای شروع، از ⚙ کلید API را وارد کنید.</div></div>';
  }
  messages.forEach((m, i) => {
    const streaming = busy && i === messages.length - 1 && m.role === 'assistant';
    chatEl.append(makeBubble(m, streaming));
  });
  scrollBottom();
  updateUI();
}

let rafPending = false;
function updateStream() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    const last = messages[messages.length - 1];
    if (streamEl && last) {
      const stick = nearBottom();
      streamEl.innerHTML = md(last.text);
      if (stick) scrollBottom();
    }
  });
}

function renderChips() {
  chipsEl.innerHTML = '';
  pending.forEach((f, i) => {
    const c = document.createElement('div'); c.className = 'chip' + (f.off ? ' off' : '');
    const s = document.createElement('span'); s.className = 'nm'; s.textContent = f.name; s.title = 'دیدن متن فایل';
    s.onclick = () => viewFile(f);
    const x = document.createElement('button'); x.textContent = '×'; x.setAttribute('aria-label', 'حذف');
    x.onclick = () => { pending.splice(i, 1); renderChips(); updateUI(); };
    c.append(s, x); chipsEl.append(c);
  });
  if (processing) {
    const c = document.createElement('div'); c.className = 'chip busy';
    c.innerHTML = '<div class="spin"></div><span>در حال خواندن فایل...</span>';
    chipsEl.append(c);
  }
}

/* ======================= نمایش متن فایل (از DocuBrain) ======================= */
let viewTarget = null;
function syncViewToggle() {
  $('#viewToggle').textContent = viewTarget && viewTarget.off ? 'فعال‌کردن در پاسخ‌ها' : 'غیرفعال‌کردن در پاسخ‌ها';
}
function viewFile(f) {
  viewTarget = f;
  $('#viewTitle').textContent = f.name;
  $('#viewText').textContent = f.text || (f.note ? '[' + f.note + ']' : '') || '(متن قابل نمایشی برای این فایل در حافظه نیست)';
  syncViewToggle();
  const d = $('#viewDlg');
  if (!d.open) d.showModal();
}
$('#viewToggle').onclick = () => {
  if (!viewTarget) return;
  viewTarget.off = !viewTarget.off;
  syncViewToggle(); renderChips(); saveChat(); render();
};
$('#viewClose').onclick = () => $('#viewDlg').close();

function updateUI() {
  const can = !busy && !processing && (inputEl.value.trim() || pending.length);
  btnSend.disabled = !can;
  btnSend.hidden = busy;
  btnStop.hidden = !busy;
}

function showError(msg, canRetry) {
  lastError = msg;
  errEl.hidden = false;
  errEl.innerHTML = '';
  const t = document.createElement('div'); t.className = 'msgtxt'; t.textContent = msg; errEl.append(t);
  if (canRetry) {
    const r = document.createElement('button'); r.textContent = 'تلاش مجدد';
    r.onclick = () => { clearError(); run(); }; errEl.append(r);
  }
  const x = document.createElement('button'); x.textContent = '✕'; x.setAttribute('aria-label', 'بستن'); x.onclick = clearError; errEl.append(x);
}
function clearError() { lastError = null; errEl.hidden = true; errEl.innerHTML = ''; }

/* ======================= جریان اصلی ======================= */
async function addFiles(list) {
  const files = [...list];
  if (!files.length) return;
  processing += files.length; renderChips(); updateUI();
  for (const f of files) {
    try { pending.push(await extractFile(f)); }
    catch (e) { showError(`خواندن «${f.name}» ناموفق بود: ${e.message || e}`, false); }
    finally { processing--; renderChips(); updateUI(); }
  }
}

async function send() {
  if (busy || processing) return;
  const text = inputEl.value.trim();
  if (!text && !pending.length) return;
  if (!settings.apiKey) { toast('ابتدا کلید API را وارد کنید'); openSettings(); return; }
  clearError();
  messages.push({ role: 'user', text: text || DEFAULT_ASK, files: pending });
  pending = []; inputEl.value = ''; autoGrow(); renderChips();
  await run();
}

async function run() {
  busy = true;
  const history = messages.slice();
  const reply = { role: 'assistant', text: '', files: [] };
  reply.sources = [...new Set(history.flatMap((m) => (m.files || [])).filter((f) => !f.off).map((f) => f.name))];
  messages.push(reply);
  render();
  abortCtl = new AbortController();
  let failed = null;
  try {
    await callModel(history, (d) => { reply.text += d; updateStream(); }, abortCtl.signal);
    if (!reply.text) reply.text = '(پاسخ خالی دریافت شد)';
  } catch (e) {
    if (e.name !== 'AbortError') failed = e.message || String(e);
  } finally {
    busy = false; abortCtl = null;
    if (!reply.text) messages.pop();
    saveChat(); render();
    if (failed) showError(failed, messages.length && messages[messages.length - 1].role === 'user');
  }
}

function newChat() {
  if (abortCtl) abortCtl.abort();
  messages = []; pending = []; processing = 0; busy = false;
  clearError(); saveChat(); renderChips(); render();
}

function autoGrow() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px';
}

/* ======================= تنظیمات (دیالوگ) ======================= */
const dlg = $('#dlg');
const fProvider = $('#fProvider'), fBase = $('#fBase'), fKey = $('#fKey'), fModel = $('#fModel'),
  fPrompt = $('#fPrompt'), fPdfImg = $('#fPdfImg'), fHint = $('#fHint');
let dlgProvider = settings.provider;

for (const [k, p] of Object.entries(PROVIDERS)) {
  const o = document.createElement('option'); o.value = k; o.textContent = p.label; fProvider.append(o);
}
fProvider.onchange = () => {
  const old = PROVIDERS[dlgProvider], nw = PROVIDERS[fProvider.value];
  if (!fBase.value.trim() || fBase.value.trim() === old.base) fBase.value = nw.base;
  if (!fModel.value.trim() || fModel.value.trim() === old.model) fModel.value = nw.model;
  dlgProvider = fProvider.value; fHint.textContent = nw.hint;
};
$('#fShow').onchange = (e) => { fKey.type = e.target.checked ? 'text' : 'password'; };
$('#fTemp').oninput = (e) => { $('#fTempVal').textContent = e.target.value; };

/* ======================= بارگزاری مدلها ======================= */
const fModels = $('#fModels'), fModelsMsg = $('#fModelsMsg');
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
function renderModelList(ids) {
  fModels.innerHTML = '';
  for (const id of ids) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mrow' + (id === fModel.value.trim() ? ' sel' : ''); b.textContent = id;
    b.onclick = () => {
      fModel.value = id;
      fModels.querySelectorAll('.mrow').forEach((r) => r.classList.toggle('sel', r === b));
    };
    fModels.append(b);
  }
  fModels.hidden = !ids.length;
}
$('#fLoadModels').onclick = async () => {
  const base = fBase.value.trim(), key = fKey.value.trim();
  if (!base || !key) { fModelsMsg.textContent = 'اول Base URL و API Key را وارد کنید.'; return; }
  const btn = $('#fLoadModels');
  btn.disabled = true; fModelsMsg.textContent = 'در حال بارگزاری مدلها...';
  try {
    const rq = modelsRequest(fProvider.value, base, key);
    const resp = await fetch(rq.url, { headers: rq.headers });
    const raw = await resp.text();
    if (!resp.ok) { fModelsMsg.textContent = 'HTTP ' + resp.status + '\n' + raw.slice(0, 800); fModels.hidden = true; return; }
    let ids = [];
    try { ids = rq.parse(JSON.parse(raw)); } catch (e) { /* ignore */ }
    ids = [...new Set(ids)].sort();
    if (!ids.length) { fModelsMsg.textContent = 'پرووایدر هیچ مدلی برنگرداند.'; fModels.hidden = true; return; }
    renderModelList(ids);
    fModelsMsg.textContent = ids.length + ' مدل بارگزاری شد. روی مدل موردنظر بزنید، بعد «ذخیره» را بزنید.';
  } catch (e) {
    fModelsMsg.textContent = 'اتصال ممکن نشد: ' + e.message;
    fModels.hidden = true;
  } finally { btn.disabled = false; }
};

function openSettings() {
  fProvider.value = settings.provider; dlgProvider = settings.provider;
  fBase.value = settings.baseUrl; fKey.value = settings.apiKey; fKey.type = 'password'; $('#fShow').checked = false;
  fModel.value = settings.model; fPrompt.value = settings.systemPrompt; fPdfImg.checked = settings.pdfAsImages;
  $('#fTemp').value = settings.temperature ?? 1; $('#fTempVal').textContent = $('#fTemp').value;
  fHint.textContent = PROVIDERS[settings.provider].hint;
  fModels.hidden = true; fModels.innerHTML = ''; fModelsMsg.textContent = '';
  if (!dlg.open) dlg.showModal();
}
$('#form').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!fKey.value.trim() || !fBase.value.trim() || !fModel.value.trim()) { toast('آدرس، کلید و نام مدل را کامل کنید'); return; }
  settings = {
    provider: fProvider.value, baseUrl: fBase.value.trim(), apiKey: fKey.value.trim(), model: fModel.value.trim(),
    systemPrompt: fPrompt.value, pdfAsImages: fPdfImg.checked, temperature: parseFloat($('#fTemp').value)
  };
  saveSettings(); dlg.close(); toast('ذخیره شد');
});
$('#fCancel').onclick = () => dlg.close();
$('#fClear').onclick = () => {
  if (!confirm('کلید API، تنظیمات و تاریخچه‌ی گفتگو پاک شود؟')) return;
  localStorage.removeItem('fc.settings'); localStorage.removeItem('fc.chat');
  settings = defaults(); newChat(); openSettings();
};

/* ======================= رویدادها ======================= */
$('#btnSettings').onclick = openSettings;
$('#btnNew').onclick = () => { if (!messages.length || confirm('گفتگوی جدید شروع شود؟')) newChat(); };
$('#btnAttach').onclick = () => $('#file').click();
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
render();
renderChips();
importShared();
if (!settings.apiKey) openSettings();
