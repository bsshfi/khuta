/* خُطى — يعمل بدون إنترنت. غيّر رقم الإصدار مع كل تحديث (ومعه VERSION في app.js) */
const VERSION = 'khuta-1.10';
const SHELL = ['./', 'index.html', 'app.js', 'globe.js', 'db.js', 'i18n.js', 'vendor.js', 'wamd-push.js', 'manifest.webmanifest',
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

/* الإشعارات: ذكرى الرحلات والنسخة الاحتياطية والأخبار (بنغمة الجوال الافتراضية)
   الخادم لا يعرف أسماء الرحلات؛ نقرأ اسم الرحلة من الجوال نفسه لحظة وصول الإشعار */
function tripFromDB(id) {
  return new Promise(res => {
    try {
      const r = indexedDB.open('khuta');
      r.onerror = () => res(null);
      r.onsuccess = () => {
        try {
          const g = r.result.transaction('trips').objectStore('trips').get(id);
          g.onsuccess = () => res(g.result || null); g.onerror = () => res(null);
        } catch (e) { res(null); }
      };
    } catch (e) { res(null); }
  });
}
function placeName(t, ar) {
  if (t.title) return t.title;
  const s = (t.stops || [])[0]; if (!s) return '';
  if (s.city) return ar ? (s.city.ar || s.city.en) : s.city.en;
  try { return new Intl.DisplayNames([ar ? 'ar' : 'en'], { type: 'region' }).of(s.iso); } catch (e) { return ''; }
}
const AR_YEARS = n => n === 1 ? 'سنة' : n === 2 ? 'سنتين' : n <= 10 ? n + ' سنوات' : n + ' سنة';
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  const ar = d.lang !== 'en';
  e.waitUntil((async () => {
    let title = d.title || (ar ? 'خُطى' : 'Khuta'), body = d.body || '', url = './';
    if ((d.kind === 'before' || d.kind === 'after') && d.trip) {
      const t = await tripFromDB(d.trip);
      if (t && !t.deleted) {
        const name = placeName(t, ar);
        const what = !name ? '' : t.title ? (ar ? ' «' + name + '»' : ' “' + name + '”') : (ar ? ' إلى ' : ' to ') + name;
        const left = (t.pack || []).filter(x => !x.done).length;
        if (d.kind === 'before') {
          title = ar ? 'رحلتك' + what + ' بكرة ✈️' : 'Your trip' + what + ' is tomorrow ✈️';
          body = left ? (ar ? 'باقي ' + left + ' في قائمة التجهيز ما تأشّرت. افتحها وتأكد قبل تطلع.' : left + ' items on your packing list are still unchecked. Take a look before you leave.')
                      : (ar ? 'رحلة سعيدة! كل أغراضك جاهزة.' : 'Have a great trip! Everything is packed.');
          if (!(t.pack || []).length) body = ar ? 'رحلة سعيدة! لا تنسَ جوازك وشاحن جوالك.' : 'Have a great trip! Don’t forget your passport and charger.';
        }
        else { title = ar ? 'أهلاً بعودتك 🏡' : 'Welcome back 🏡'; body = ar ? 'أضف صور رحلتك' + what + ' ويومياتها قبل ما تنساها.' : 'Add your photos and notes from your trip' + what + ' before you forget.'; }
        url = './#trip=' + d.trip;
      }
    }
    // تذكير قائمة التجهيز قبل الرحلة بـ ٣ أيام
    if (d.kind === 'pack' && d.trip) {
      const t = await tripFromDB(d.trip);
      if (t && !t.deleted) {
        const name = placeName(t, ar), left = (t.pack || []).filter(x => !x.done).length;
        const what = !name ? '' : t.title ? (ar ? ' «' + name + '»' : ' “' + name + '”') : (ar ? ' إلى ' : ' to ') + name;
        title = ar ? 'باقي ٣ أيام على رحلتك' + what + ' 🧳' : '3 days until your trip' + what + ' 🧳';
        body = left ? (ar ? 'باقي ' + left + ' في قائمة التجهيز ما تأشّرت.' : left + ' items on your packing list are still unchecked.') : (ar ? 'كل أغراضك جاهزة 👌' : 'You’re all packed 👌');
        url = './#trip=' + d.trip;
      }
    }
    if (d.kind === 'anniv' && d.trip) {
      const t = await tripFromDB(d.trip);
      if (t && !t.deleted) {
        const name = placeName(t, ar), y = d.years || 1;
        const what = !name ? '' : t.title ? (ar ? ' «' + name + '»' : ' “' + name + '”') : (ar ? ' إلى ' : ' to ') + name;
        title = ar ? 'ذكرى رحلة 🌍' : 'Trip anniversary 🌍';
        body = ar ? 'قبل ' + AR_YEARS(y) + ' اليوم بدأت رحلتك' + what + '. افتحها وتذكّرها.'
                  : y + (y === 1 ? ' year' : ' years') + ' ago today, your trip' + what + ' began. Open it and look back.';
        url = './#trip=' + d.trip;
      }
      // يجب عرض إشعار لكل رسالة (شرط الآيفون)، فإن لم نجد الرحلة نعرض النص العام
    }
    await self.registration.showNotification(title, { body, tag: d.tag || 'khuta', lang: ar ? 'ar' : 'en', dir: ar ? 'rtl' : 'ltr', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url } });
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) { if (url !== './' && 'navigate' in c) c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
