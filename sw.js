/* خُطى — يعمل بدون إنترنت. غيّر رقم الإصدار مع كل تحديث (ومعه VERSION في app.js) */
const VERSION = 'khuta-1.5';
const SHELL = ['./', 'index.html', 'app.js', 'globe.js', 'db.js', 'i18n.js', 'vendor.js', 'manifest.webmanifest',
  'data/countries.json', 'data/cities.json', 'data/earth.jpg',
  'fonts/plex-ar-400.woff2', 'fonts/plex-ar-700.woff2', 'fonts/plex-la-400.woff2', 'fonts/plex-la-700.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'khuta-fonts').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // خط شعار ومض آرك من Google Fonts: من الذاكرة أولاً
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open('khuta-fonts').then(c => c.match(e.request).then(hit => {
      const net = fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  if (url.origin !== location.origin) return;
  // البيانات والخطوط والأيقونات ثابتة: من الذاكرة أولاً
  if (/\/(data|fonts|icons)\//.test(url.pathname)) {
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return r;
    })));
    return;
  }
  // ملفات التطبيق: من الإنترنت أولاً حتى يوصل أي تحديث فوراً، والذاكرة عند انقطاع النت
  e.respondWith(fetch(e.request, { cache: 'no-store' }).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))));
});
