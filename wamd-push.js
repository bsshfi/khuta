/* إشعارات ومض آرك — ملف مشترك بين فَلَق وسهم وخُطى
   يربط التطبيق بخادم الإشعارات على Cloudflare. لا تعدّل إلا رابط الخادم إن تغيّر. */
(function (root) {
  'use strict';
  var API = 'https://push-wamdarc.bsshfi.workers.dev';

  function isStandalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function supported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }

  // needInstall | unsupported | blocked | default | granted
  function status() {
    if (isIOS() && !isStandalone()) return 'needInstall';
    if (!supported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'blocked';
    return Notification.permission === 'granted' ? 'granted' : 'default';
  }

  // يجب استدعاؤها مباشرة داخل ضغطة المستخدم (شرط الآيفون)
  function request() {
    if (!supported()) return Promise.resolve('denied');
    if (Notification.permission !== 'default') return Promise.resolve(Notification.permission);
    try {
      var p = Notification.requestPermission();
      return p && p.then ? p : new Promise(function (res) { Notification.requestPermission(res); });
    } catch (e) { return Promise.resolve('denied'); }
  }

  function keyBytes(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }

  function subscribe(app, cfg, test) {
    return navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription().then(function (sub) {
        if (sub) return sub;
        return fetch(API + '/vapid').then(function (r) { return r.json(); }).then(function (k) {
          return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(k.key) });
        });
      });
    }).then(function (sub) {
      return fetch(API + '/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app: app, sub: sub.toJSON(), cfg: cfg, test: !!test }) });
    }).then(function (r) { if (!r.ok) throw new Error('server ' + r.status); return r.json(); });
  }

  function unsubscribe() {
    return navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
      if (!sub) return;
      fetch(API + '/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(function () {});
      return sub.unsubscribe();
    }).catch(function () {});
  }

  // تحديث الإعدادات في الخادم بهدوء (بعد ثانيتين من آخر تغيير)
  var syncT = null;
  function sync(app, getCfg) {
    if (status() !== 'granted') return;
    clearTimeout(syncT);
    syncT = setTimeout(function () { try { subscribe(app, getCfg(), false).catch(function () {}); } catch (e) {} }, 2000);
  }

  // متى نعرض بطاقة طلب الإشعارات: أول مرة، ثم مرة ثانية بعد 5 أيام لمن اختار «لاحقاً»
  function shouldAsk(st) {
    if (status() !== 'default') return false;
    var n = st.ntfAsk || 0;
    if (n === 0) return true;
    return n === 1 && Date.now() - (st.ntfAskAt || 0) > 5 * 864e5;
  }
  function markAsked(st) { st.ntfAsk = (st.ntfAsk || 0) + 1; st.ntfAskAt = Date.now(); }

  function tz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } }

  root.WamdPush = { API: API, status: status, request: request, subscribe: subscribe, unsubscribe: unsubscribe, sync: sync, shouldAsk: shouldAsk, markAsked: markAsked, tz: tz, isStandalone: isStandalone, isIOS: isIOS };
})(typeof window !== 'undefined' ? window : globalThis);
