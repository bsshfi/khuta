/* ومض آرك — رسائل داخل التطبيق من لوحة الإدارة (admin.wamdarc.com)
   ملف مشترك بين التطبيقات. يقرأ رسالة التطبيق (إن وجدت) ويعرضها كبطاقة صغيرة أسفل الشاشة.
   لا يرسل أي بيانات عن المستخدم. الاستخدام: <script src="wamd-cfg.js" data-app="falaq" defer></script> */
(function () {
  'use strict';
  var me = document.currentScript, APP = (me && me.getAttribute('data-app')) || '';
  var API = 'https://push-wamdarc.bsshfi.workers.dev/cfg?app=';
  if (!APP || !window.fetch) return;
  var SEEN = 'wamd-cfg-seen';
  function seen() { try { return JSON.parse(localStorage.getItem(SEEN) || '[]'); } catch (e) { return []; } }
  function mark(id) { try { var s = seen(); if (s.indexOf(id) < 0) { s.push(id); localStorage.setItem(SEEN, JSON.stringify(s.slice(-40))); } } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function show(m) {
    var en = (document.documentElement.lang || '').slice(0, 2) === 'en' && m.en && (m.en.title || m.en.body);
    var t = en ? m.en : m.ar, rtl = !en;
    if (!t || !(t.title || t.body)) return;
    var bg = m.tone === 'promo' ? 'linear-gradient(120deg,#5A2CD8,#9B52D8 55%,#FF8A2A)' : m.tone === 'warn' ? 'linear-gradient(120deg,#B4581A,#E08A2E)' : 'linear-gradient(120deg,#2A1B6E,#4B23C8)';
    var box = document.createElement('div');
    box.setAttribute('role', 'status');
    box.setAttribute('dir', rtl ? 'rtl' : 'ltr');
    box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:2147483000;max-width:520px;margin:0 auto;' +
      'background:' + bg + ';color:#fff;border-radius:20px;padding:14px 16px 14px;box-shadow:0 18px 50px rgba(10,6,40,.45);font:15px/1.6 inherit;' +
      'transform:translateY(130%);transition:transform .45s cubic-bezier(.2,.8,.2,1)';
    box.innerHTML = '<button type="button" aria-label="' + (rtl ? 'إغلاق' : 'Close') + '" style="position:absolute;top:8px;' + (rtl ? 'left' : 'right') + ':8px;width:30px;height:30px;border:0;border-radius:50%;background:rgba(255,255,255,.18);color:#fff;font:18px/30px sans-serif;cursor:pointer;padding:0">×</button>' +
      (t.title ? '<div style="font-weight:700;font-size:16px;padding-' + (rtl ? 'left' : 'right') + ':34px">' + esc(t.title) + '</div>' : '') +
      (t.body ? '<div style="opacity:.92;margin-top:2px;white-space:pre-line">' + esc(t.body) + '</div>' : '') +
      (m.link ? '<a href="' + esc(m.link) + '" target="_blank" rel="noopener" style="display:inline-block;margin-top:10px;background:#fff;color:#1A1247;text-decoration:none;font-weight:700;border-radius:999px;padding:7px 16px;font-size:14px">' + esc(t.btn || (rtl ? 'افتح' : 'Open')) + '</a>' : '');
    var close = function () { mark(m.id); box.style.transform = 'translateY(140%)'; setTimeout(function () { box.remove(); }, 500); };
    box.querySelector('button').onclick = close;
    var a = box.querySelector('a'); if (a) a.addEventListener('click', function () { mark(m.id); });
    document.body.appendChild(box);
    requestAnimationFrame(function () { requestAnimationFrame(function () { box.style.transform = 'translateY(0)'; }); });
    if (m.once) mark(m.id);
  }
  function run() {
    fetch(API + encodeURIComponent(APP), { cache: 'no-store', credentials: 'omit' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      var m = j && j.msg; if (!m || !m.id || seen().indexOf(m.id) >= 0) return;
      setTimeout(function () { show(m); }, 1800);
    }).catch(function () {});
  }
  if (document.readyState === 'complete') run(); else addEventListener('load', run);
})();
