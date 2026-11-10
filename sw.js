const VERSION = 'filechat-v6';
const SHELL = [
  './', './index.html', './app.css', './app.js', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== 'shared-files').map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // دریافت فایل از «اشتراک‌گذاری» سیستم‌عامل (Web Share Target)
  if (req.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      try {
        const fd = await req.formData();
        const files = fd.getAll('files').filter((f) => typeof f !== 'string');
        const c = await caches.open('shared-files');
        for (const k of await c.keys()) await c.delete(k);
        let i = 0;
        for (const f of files) {
          await c.put('/shared/' + i++, new Response(f, {
            headers: { 'Content-Type': f.type || 'application/octet-stream', 'X-Name': encodeURIComponent(f.name) }
          }));
        }
      } catch (err) { /* ignore */ }
      return Response.redirect(new URL('./?shared=1', self.registration.scope).href, 303);
    })());
    return;
  }

  if (req.method !== 'GET') return;

  // کتابخانه‌های CDN (pdf.js و ...): اول کش، در غیر این صورت شبکه و ذخیره
  if (url.hostname === 'cdnjs.cloudflare.com') {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }))
    );
    return;
  }

  // فایل‌های خود برنامه: کش‌اول با به‌روزرسانی در پس‌زمینه
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) => {
        const net = fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
        return hit || net;
      })
    );
  }
  // بقیه (API ها) مستقیم به شبکه می‌روند
});
