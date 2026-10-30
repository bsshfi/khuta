/* إحصائيات ومض آرك — عدّاد استخدام مجهول، ملف مشترك بين التطبيقات والموقع.
   يرسل فقط: اسم التطبيق، معرّف عشوائي يولّده الجهاز، هل التطبيق مثبّت، نوع الجهاز، رقم الإصدار، اللغة.
   لا أسماء ولا موقع جغرافي ولا كوكيز. الاستخدام: <script src="wamd-stats.js" data-app="falaq" defer></script> */
(function () {
  'use strict';
  var API = 'https://push-wamdarc.bsshfi.workers.dev/hit';
  var me = document.currentScript, APP = (me && me.getAttribute('data-app')) || '';
  if (!APP || !window.fetch) return;
  var dev = '';
  try {
    dev = localStorage.getItem('wamd-dev') || '';
    if (!/^[a-z0-9]{8,32}$/.test(dev)) {
      var a = new Uint8Array(10); (window.crypto || window.msCrypto).getRandomValues(a);
      dev = Array.prototype.map.call(a, function (b) { return ('0' + b.toString(36)).slice(-2); }).join('');
      localStorage.setItem('wamd-dev', dev);
    }
  } catch (e) { return; }
  var ua = navigator.userAgent;
  var plat = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios' : /android/i.test(ua) ? 'android' : 'desktop';
  var inst = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var ver = '';
  // رقم الإصدار من اسم ذاكرة التطبيق (مثل falaq-1.9) حتى ما يحتاج تعديل مع كل تحديث
  try {
    if (window.caches) caches.keys().then(function (ks) {
      var re = new RegExp('^' + APP + '-v?(\\d+(?:\\.\\d+)*)$');
      ks.forEach(function (k) { var m = re.exec(k); if (m) ver = m[1]; });
    });
  } catch (e) {}
  function send(ev) {
    var b = JSON.stringify({ app: APP, dev: dev, ev: ev, inst: inst ? 1 : 0, plat: plat, ver: ver, lang: document.documentElement.lang === 'en' ? 'en' : 'ar', path: APP === 'site' ? location.pathname : '' });
    try { fetch(API, { method: 'POST', body: b, keepalive: true, mode: 'cors', credentials: 'omit', headers: { 'Content-Type': 'text/plain' } }).catch(function () {}); } catch (e) {}
  }
  var hiddenAt = 0;
  function beat() { if (document.visibilityState === 'visible') send('beat'); }
  setTimeout(function () { send('open'); }, 1200);   // بعد ما يجهز رقم الإصدار
  setInterval(beat, 60000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') { hiddenAt = Date.now(); return; }
    // الرجوع للتطبيق بعد ٣٠ دقيقة أو أكثر يُحسب فتحة جديدة
    send(hiddenAt && Date.now() - hiddenAt > 30 * 60e3 ? 'open' : 'beat');
  });
})();
