/* خُطى | KHUTA — منطق التطبيق
   عند كل تحديث غيّر الإصدار في مكانين: VERSION هنا و VERSION في sw.js */
(() => {
  'use strict';
  const VERSION = '1.0';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- الإعدادات ---------- */
  const COLORS = ['#F0682C', '#3E8FC4', '#3E9B6E', '#9B5DC8', '#D4A017', '#D64F7A', '#2BA8A0', '#8A6E52'];
  const DEF = { lang: 'ar', theme: 'auto', digits: 'latn', home: { en: 'Riyadh', ar: 'الرياض', iso: 'SA', lat: 24.64, lon: 46.77 }, members: [{ id: 'me', name: '', color: COLORS[0] }], lastBackup: null, persistAsked: false };
  let S = loadS();
  function loadS() {
    try {
      const s = JSON.parse(localStorage.getItem('khuta') || '{}');
      const o = Object.assign({}, DEF, s);
      if (!Array.isArray(o.members) || !o.members.length) o.members = DEF.members.slice();
      if (!o.home || typeof o.home.lat !== 'number') o.home = DEF.home;
      return o;
    } catch (e) { return JSON.parse(JSON.stringify(DEF)); }
  }
  const save = () => { try { localStorage.setItem('khuta', JSON.stringify(S)); } catch (e) {} };
  const isEn = () => S.lang === 'en';
  const AR_DIG = '٠١٢٣٤٥٦٧٨٩';
  const D = s => S.digits === 'arab' ? String(s).replace(/\d/g, d => AR_DIG[d]) : String(s);
  function L(k, ...a) {
    const pack = I18N[S.lang] || I18N.ar;
    const v = k in pack ? pack[k] : I18N.ar[k];
    if (v == null) return k;
    const r = typeof v === 'function' ? v(...a) : v;
    return Array.isArray(r) ? r.map(D) : typeof r === 'string' ? D(r) : r;
  }
  const N = n => D(Number(n).toLocaleString('en-US'));
  const locale = () => (isEn() ? 'en-GB' : 'ar-SA') + '-u-ca-gregory-nu-' + (S.digits === 'arab' ? 'arab' : 'latn');
  const toDate = iso => new Date(iso + 'T12:00:00');
  const fmtDate = (iso, o) => iso ? new Intl.DateTimeFormat(locale(), o || { day: 'numeric', month: 'long', year: 'numeric' }).format(toDate(iso)) : '';
  function fmtRange(a, b) {
    if (!b || b === a) return fmtDate(a);
    const f = new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
    try { return f.formatRange(toDate(a), toDate(b)); } catch (e) { return f.format(toDate(a)) + ' – ' + f.format(toDate(b)); }
  }
  const nights = t => t.end ? Math.max(0, Math.round((toDate(t.end) - toDate(t.start)) / 864e5)) : 0;
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const flag = iso => /^[A-Z]{2}$/.test(iso) && iso !== 'XS' ? String.fromCodePoint(...[...iso].map(c => 127397 + c.charCodeAt(0))) : '🏳️';

  let toastT;
  function toast(msg, ms) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms || 2800); }

  /* ---------- الأيقونات ---------- */
  const ICON = {
    plane: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M10.5 13.5 3 11l1.2-1.6 7.8.4L16.5 4c.9-.9 2.6-1 3.4-.2s.7 2.5-.2 3.4L14 11.6l.4 7.8L12.8 20.6l-2.3-7.1z"/></svg>',
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><path d="M4 16.5V12l2-5h12l2 5v4.5"/><path d="M3 12h18v4.5H3z"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/></svg>',
    train: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 10h12M9 20l-1.5 1.5M15 20l1.5 1.5M9 17l-1 3M15 17l1 3"/><circle cx="9.5" cy="13.5" r=".9" fill="currentColor"/><circle cx="14.5" cy="13.5" r=".9" fill="currentColor"/></svg>',
    ship: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><path d="M4 14.5h16l-2.5 4.5h-11z"/><path d="M7 14.5V9h10v5.5M12 9V4.5M9 6.5h6"/><path d="M3 21c1.5 0 1.5-.8 3-.8s1.5.8 3 .8 1.5-.8 3-.8 1.5.8 3 .8 1.5-.8 3-.8 1.5.8 3 .8"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 15.5l-5-5-8.5 8.5"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/><path d="M4.5 7.5h15M4.5 16.5h15" stroke-dasharray="1.5 2"/></svg>'
  };
  const TRANS = ['plane', 'car', 'train', 'ship'];
  const transLbl = k => L({ plane: 'tPlane', car: 'tCar', train: 'tTrain', ship: 'tShip' }[k]);

  /* ---------- الدول والمدن ---------- */
  const COUNTRIES = new Map();
  let topo = null, CITIES = null, citiesP = null;
  const cName = iso => { const c = COUNTRIES.get(iso); return c ? (isEn() ? c.e : c.a) : iso; };
  const cAlt = iso => { const c = COUNTRIES.get(iso); return c ? (isEn() ? c.a : c.e) : ''; };
  const cityName = c => c ? (isEn() ? c.en : (c.ar || c.en)) : '';
  const stopName = s => s.city ? cityName(s.city) : cName(s.iso);
  // لون لكل قارة على الكرة والقوائم
  const CONT_C = { AS: '#FF6B35', EU: '#F72585', AF: '#FFB703', NA: '#7B2FF7', SA: '#2DC653', OC: '#06C6A8', AN: '#8FA3B8' };
  const contColor = iso => CONT_C[(COUNTRIES.get(iso) || {}).c] || '#FF6B35';
  // تدرّج ملوّن لكل رحلة بلا صورة غلاف
  const GRADS = ['linear-gradient(140deg,#FFB347 0%,#FF5E62 55%,#C2185B 100%)', 'linear-gradient(140deg,#43E7F5 0%,#0A79C4 60%,#3A2BB8 100%)',
    'linear-gradient(140deg,#2EE6B6 0%,#0BA5A0 50%,#0A5F8F 100%)', 'linear-gradient(140deg,#FFD25A 0%,#FF8F1C 55%,#E8501A 100%)',
    'linear-gradient(140deg,#FF9AC1 0%,#B05CFF 55%,#5B3FD9 100%)', 'linear-gradient(140deg,#A8F06A 0%,#2DC653 50%,#0A8F6B 100%)'];
  const tripGrad = t => { let h = 0; for (const ch of t.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return GRADS[h % GRADS.length]; };
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFKD')
      .replace(/[̀-ًͯ-ٰٟـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
  }
  const noAl = s => s.replace(/(^| )ال(?=\S)/g, '$1');
  function loadCities() {
    if (citiesP) return citiesP;
    citiesP = fetch('data/cities.json').then(r => r.json()).then(arr => {
      CITIES = arr.map(c => ({ en: c[0], ar: c[1], iso: c[2], lat: c[3], lon: c[4], pop: c[5], ke: norm(c[0]), ka: noAl(norm(c[1])) }));
      return CITIES;
    }).catch(e => { citiesP = null; throw e; });
    return citiesP;
  }
  function score(key, q) {
    if (!key) return 9;
    if (key === q) return 0;
    if (key.startsWith(q)) return 1;
    if (key.includes(' ' + q)) return 2;
    if (q.length > 2 && key.includes(q)) return 3;
    return 9;
  }
  function search(query, opts) {
    const q0 = norm(query); if (!q0) return [];
    const q = noAl(q0), out = [];
    if (!opts || !opts.citiesOnly) for (const [iso, c] of COUNTRIES) {
      const s = Math.min(score(norm(c.e), q0), score(noAl(norm(c.a)), q));
      if (s < 9) out.push({ type: 'country', iso, s: s - 0.5, pop: 1e9 });
    }
    if (CITIES) for (const c of CITIES) {
      const s = Math.min(score(c.ke, q0), score(c.ka, q));
      if (s < 9) out.push({ type: 'city', c, iso: c.iso, s, pop: c.pop });
      if (out.length > 400) break;
    }
    out.sort((a, b) => a.s - b.s || b.pop - a.pop);
    return out.slice(0, 12);
  }

  /* ---------- البيانات ---------- */
  let TRIPS = [], MEDIA = [];
  const tripById = id => TRIPS.find(t => t.id === id);
  const photoCount = id => MEDIA.filter(m => m.tripId === id && !m.deleted).length;
  async function loadData() {
    try {
      TRIPS = (await DB.all('trips')).filter(t => !t.deleted);
      MEDIA = await DB.mediaIndex();
    } catch (e) { TRIPS = []; MEDIA = []; console.warn(e); }
  }
  const urls = new Map();
  async function mediaURL(id, kind) {
    const key = id + ':' + kind;
    if (urls.has(key)) return urls.get(key);
    const m = await DB.get('media', id);
    if (!m || m.deleted || !m[kind]) return '';
    const u = URL.createObjectURL(m[kind]); urls.set(key, u); return u;
  }
  function dropURLs(id) { ['thumb', 'full'].forEach(k => { const u = urls.get(id + ':' + k); if (u) { URL.revokeObjectURL(u); urls.delete(id + ':' + k); } }); }
  function hydrate(root) {
    $$('img[data-mid]', root).forEach(img => {
      mediaURL(img.dataset.mid, img.dataset.kind || 'thumb').then(u => { if (u) img.src = u; else img.remove(); });
    });
  }
  async function askPersist() {
    if (S.persistAsked || !navigator.storage || !navigator.storage.persist) return;
    S.persistAsked = true; save();
    try { await navigator.storage.persist(); } catch (e) {}
  }

  function derive(trips) {
    const countries = new Map(), cities = new Set();
    for (const t of trips) for (const s of t.stops || []) {
      let c = countries.get(s.iso);
      if (!c) { c = { iso: s.iso, trips: new Set(), first: t.start, last: t.start, firstTrip: t, cities: new Map() }; countries.set(s.iso, c); }
      c.trips.add(t.id);
      if (t.start < c.first) { c.first = t.start; c.firstTrip = t; }
      if (t.start > c.last) c.last = t.start;
      if (s.city) { const k = s.city.en.toLowerCase(); c.cities.set(k, s.city); cities.add(s.iso + '|' + k); }
    }
    const conts = new Set(); for (const iso of countries.keys()) { const c = COUNTRIES.get(iso); if (c) conts.add(c.c); }
    return { countries, cities: cities.size, conts };
  }
  let DER = derive([]);
  const displayTitle = t => t.title || (t.stops && t.stops[0] ? stopName(t.stops[0]) + ' ' + D(t.start.slice(0, 4)) : '—');
  const memberName = m => m.id === 'me' && !m.name ? L('me') : m.name;
  const memberById = id => S.members.find(m => m.id === id);

  /* ---------- الخريطة ---------- */
  function syncGlobe() {
    if (!topo) return;
    const st = new Map();
    for (const iso of DER.countries.keys()) st.set(iso, contColor(iso));
    if (S.home && !st.has(S.home.iso)) st.set(S.home.iso, 'home');
    Globe.setStates(st);
    const seen = new Set(), dots = [];
    for (const t of TRIPS) for (const s of t.stops || []) if (s.city && typeof s.city.lat === 'number') {
      const k = s.city.lat + ',' + s.city.lon; if (seen.has(k)) continue; seen.add(k);
      dots.push({ c: [s.city.lon, s.city.lat] });
    }
    Globe.setDots(dots);
    Globe.setHome([S.home.lon, S.home.lat]);
  }
  function renderMap() {
    const c = [[DER.countries.size, 'cCountries'], [DER.cities, 'cCities'], [TRIPS.length, 'cTrips'], [DER.conts.size, 'cContinents']];
    $('#counters').innerHTML = c.map(([n, k]) => '<div class="counter"><b>' + N(n) + '</b><span>' + L(k) + '</span></div>').join('');
    $('#mapEmpty').hidden = TRIPS.length > 0;
    $('#myCountriesBlock').hidden = !DER.countries.size;
    const list = [...DER.countries.values()].sort((a, b) => b.trips.size - a.trips.size || b.last.localeCompare(a.last));
    $('#countryList').innerHTML = list.map(c => {
      const cities = [...c.cities.values()].map(cityName).slice(0, 4).join('، ');
      const sub = L('visitedTimes', L('nTimes', c.trips.size)) + (cities ? ' · ' + esc(cities) : '');
      return '<li><button data-iso="' + c.iso + '" style="--cc:' + contColor(c.iso) + '"><span class="cbar"></span><span class="flag">' + flag(c.iso) + '</span><span class="nm"><b>' + esc(cName(c.iso)) + '</b><span>' + sub + '</span></span><span class="pill">' + D(c.last.slice(0, 4)) + '</span></button></li>';
    }).join('');
    $('#contSummary').innerHTML = '<span class="conts">' + [...DER.conts].map(k => '<span style="--cc:' + CONT_C[k] + '">' + L('continents')[k] + '</span>').join('') + '</span>';
    syncGlobe();
  }
  $('#countryList').addEventListener('click', e => { const b = e.target.closest('button[data-iso]'); if (b) { window.scrollTo({ top: 0, behavior: 'smooth' }); openCountry(b.dataset.iso); } });
  function flyToIso(iso) {
    const c = COUNTRIES.get(iso); if (!c) return;
    Globe.flyTo(c.x, c.y, Math.min(5, Globe.zoomForIso(iso)));
  }
  $('#recenter').onclick = () => { Globe.setSelected(null); Globe.flyTo(S.home.lon, S.home.lat, 1); };

  /* ---------- الدولة ---------- */
  function openCountry(iso, fly = true) {
    if (!COUNTRIES.has(iso)) return;
    Globe.setSelected(iso); if (fly) flyToIso(iso);
    const d = DER.countries.get(iso), info = COUNTRIES.get(iso);
    let html = '<div class="chead"><span class="flag">' + flag(iso) + '</span><div><h2>' + esc(cName(iso)) + '</h2><div class="sub">' + esc(cAlt(iso)) + ' · ' + L('continents')[info.c] + '</div></div></div>';
    if (d) {
      html += '<div class="stat-row"><div><b>' + L('nTimes', d.trips.size) + '</b><span>' + L('visitedTimes', '').trim() + '</span></div><div><b>' + fmtDate(d.first, { month: 'short', year: 'numeric' }) + '</b><span>' + L('firstVisit') + '</span></div></div>';
      if (d.cities.size) html += '<h3>' + L('citiesVisited') + '</h3><div class="chips">' + [...d.cities.values()].map(c => '<span class="chip">' + esc(cityName(c)) + '</span>').join('') + '</div>';
      const trips = TRIPS.filter(t => d.trips.has(t.id)).sort((a, b) => b.start.localeCompare(a.start));
      html += '<h3>' + L('tripsHere') + '</h3><div class="tlist">' + trips.map(t => '<button data-trip="' + t.id + '"><b>' + esc(displayTitle(t)) + '</b><span>' + fmtDate(t.start, { month: 'short', year: 'numeric' }) + '</span></button>').join('') + '</div>';
    } else html += '<p style="margin-top:10px">' + L('notYet') + '</p>';
    html += '<div class="actions"><button class="btn primary" id="cAdd">' + ICON.plus + esc(L('addTripTo', cName(iso))) + '</button></div>';
    sheet(html, s => {
      $('#cAdd', s).onclick = () => openTripForm(null, { iso });
      $$('[data-trip]', s).forEach(b => b.onclick = () => { closeSheet(); openTrip(b.dataset.trip); });
    }, () => Globe.setSelected(null));
  }

  /* ---------- الرحلات ---------- */
  function renderTrips() {
    const days = S.lastBackup ? Math.floor((Date.now() - S.lastBackup) / 864e5) : null;
    $('#nag').innerHTML = TRIPS.length && (days === null || days >= 14) ? '<div class="nag"><p>' + L('backupNag', days) + '</p><button id="nagBtn">' + L('backupNow') + '</button></div>' : '';
    const nb = $('#nagBtn'); if (nb) nb.onclick = exportBackup;
    if (!TRIPS.length) {
      $('#tripList').innerHTML = '<div class="card empty">' + ICON.globe + '<div class="t">' + L('tripsEmptyT') + '</div><p>' + L('tripsEmptyS') + '</p><button class="btn primary" id="firstTrip">' + ICON.plus + L('addFirst') + '</button></div>';
      $('#firstTrip').onclick = () => openTripForm();
      return;
    }
    const sorted = TRIPS.slice().sort((a, b) => b.start.localeCompare(a.start));
    let html = '', year = '';
    for (const t of sorted) {
      const y = t.start.slice(0, 4);
      if (y !== year) { year = y; html += '<div class="year">' + D(y) + '</div>'; }
      const isos = [...new Set((t.stops || []).map(s => s.iso))];
      const pc = photoCount(t.id), n = nights(t);
      const badge = (t.transport || []).map(k => ICON[k]).join('');
      html += '<button class="tcard" data-trip="' + t.id + '"><div class="tcover"' + (t.cover ? '' : ' style="background:' + tripGrad(t) + '"') + '>' +
        (t.cover ? '<img alt="" loading="lazy" data-mid="' + t.cover + '" data-kind="full">' : '<div class="flags">' + isos.slice(0, 3).map(flag).join('') + '</div>') +
        (badge ? '<span class="badge">' + badge + '</span>' : '') +
        '</div><div class="tbody"><b>' + esc(displayTitle(t)) + '</b><div class="meta"><span>' + fmtRange(t.start, t.end) + '</span>' +
        (t.end ? '<span>' + L('nNights', n) + '</span>' : '') + (pc ? '<span>' + L('nPhotos', pc) + '</span>' : '') + '</div></div></button>';
    }
    $('#tripList').innerHTML = html;
    hydrate($('#tripList'));
  }
  $('#tripList').addEventListener('click', e => { const b = e.target.closest('.tcard'); if (b) openTrip(b.dataset.trip); });

  /* ---------- نموذج الرحلة ---------- */
  function openTripForm(trip, preset) {
    const d = trip ? JSON.parse(JSON.stringify(trip)) : {
      id: null, title: '', start: today(), end: '', stops: preset && preset.iso ? [{ id: DB.uid(), iso: preset.iso, city: null }] : [],
      transport: ['plane'], members: [S.members[0].id], notes: [], cover: null
    };
    const html = '<h2>' + L(trip ? 'editTrip' : 'newTrip') + '</h2>' +
      '<label class="field"><span>' + L('fTitle') + '</span><input class="inp" id="fTitle" maxlength="80" placeholder="' + esc(L('fTitlePh')) + '" value="' + esc(d.title) + '"></label>' +
      '<div class="row2"><label class="field"><span>' + L('fFrom') + '</span><input class="inp" type="date" id="fStart" value="' + d.start + '"></label>' +
      '<label class="field"><span>' + L('fTo') + '</span><input class="inp" type="date" id="fEnd" value="' + (d.end || '') + '"></label></div>' +
      '<h3>' + L('fStops') + '</h3><div class="chips" id="fStops"></div>' +
      '<input class="inp" id="fSearch" style="margin-top:8px" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="' + esc(L('fSearchPh')) + '">' +
      '<div class="results" id="fResults"></div>' +
      '<h3>' + L('fTransport') + '</h3><div class="chips" id="fTrans"></div>' +
      (S.members.length > 1 || S.members[0].name ? '<h3>' + L('fWho') + '</h3><div class="chips" id="fWho"></div>' : '') +
      '<div class="actions"><button class="btn primary" id="fSave">' + L('save') + '</button><button class="btn ghost" id="fCancel">' + L('cancel') + '</button></div>';
    sheet(html, s => {
      const drawStops = () => {
        $('#fStops', s).innerHTML = d.stops.map(st => '<span class="chip"><span>' + flag(st.iso) + '</span>' + esc(stopName(st)) + (st.city ? '' : ' <small style="color:var(--muted)">· ' + L('fWholeCountry') + '</small>') + '<button class="x" data-id="' + st.id + '" aria-label="' + L('del') + '">×</button></span>').join('');
      };
      const drawChips = () => {
        $('#fTrans', s).innerHTML = TRANS.map(k => '<button class="chip' + (d.transport.includes(k) ? ' on' : '') + '" data-k="' + k + '">' + ICON[k] + transLbl(k) + '</button>').join('');
        const w = $('#fWho', s);
        if (w) w.innerHTML = S.members.map(m => '<button class="chip' + (d.members.includes(m.id) ? ' on' : '') + '" data-m="' + m.id + '"><i style="background:' + m.color + '"></i>' + esc(memberName(m)) + '</button>').join('');
      };
      drawStops(); drawChips();
      $('#fStops', s).onclick = e => { const b = e.target.closest('.x'); if (b) { d.stops = d.stops.filter(x => x.id !== b.dataset.id); drawStops(); } };
      $('#fTrans', s).onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k; d.transport = d.transport.includes(k) ? d.transport.filter(x => x !== k) : [...d.transport, k]; drawChips(); };
      const w = $('#fWho', s); if (w) w.onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; const k = b.dataset.m; d.members = d.members.includes(k) ? d.members.filter(x => x !== k) : [...d.members, k]; drawChips(); };
      const res = $('#fResults', s), inp = $('#fSearch', s);
      let res_ = [];
      const addStop = st => {
        if (d.stops.some(x => x.iso === st.iso && ((x.city && st.city && x.city.en === st.city.en) || (!x.city && !st.city)))) return;
        if (st.city) d.stops = d.stops.filter(x => !(x.iso === st.iso && !x.city));
        d.stops.push(st); inp.value = ''; res.innerHTML = ''; drawStops();
      };
      const run = async () => {
        const q = inp.value.trim();
        if (!q) { res.innerHTML = ''; return; }
        if (!CITIES) { res.innerHTML = '<p style="padding:10px 4px">…</p>'; try { await loadCities(); } catch (e) {} if (inp.value.trim() !== q) return; }
        res_ = search(q);
        res.innerHTML = res_.map((r, i) => r.type === 'country'
          ? '<button data-i="' + i + '"><span class="flag">' + flag(r.iso) + '</span><span><b>' + esc(cName(r.iso)) + '</b><span>' + L('fWholeCountry') + ' · ' + esc(cAlt(r.iso)) + '</span></span></button>'
          : '<button data-i="' + i + '"><span class="flag">' + flag(r.iso) + '</span><span><b>' + esc(cityName(r.c)) + '</b><span>' + esc(cName(r.iso)) + (isEn() ? '' : ' · ' + esc(r.c.en)) + '</span></span></button>').join('') +
          '<button data-custom="1"><span class="flag plus">＋</span><span class="plus">' + esc(L('fCustom', q)) + '</span></button>';
      };
      let tm; inp.oninput = () => { clearTimeout(tm); tm = setTimeout(run, 90); };
      inp.onfocus = () => loadCities().catch(() => {});
      res.onclick = e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.custom) {
          const q = inp.value.trim();
          const opts = [...COUNTRIES.entries()].map(([iso]) => [iso, cName(iso)]).sort((a, b) => a[1].localeCompare(b[1], S.lang));
          const pre = d.stops.length ? d.stops[d.stops.length - 1].iso : '';
          res.innerHTML = '<div style="padding:8px 2px"><span style="font-size:13.5px;color:var(--muted)">' + L('fCustomCountry') + '</span><select class="inp" id="fCC" style="margin-top:6px"><option value="">' + L('fChooseCountry') + '</option>' +
            opts.map(([iso, n]) => '<option value="' + iso + '"' + (iso === pre ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select>' +
            '<button class="btn block-w" id="fCCAdd" style="margin-top:8px">' + L('add') + ' «' + esc(q) + '»</button></div>';
          $('#fCCAdd', s).onclick = () => { const iso = $('#fCC', s).value; if (!iso) return; addStop({ id: DB.uid(), iso, city: { en: q, ar: q, lat: null, lon: null }, custom: true }); };
          return;
        }
        const r = res_[+b.dataset.i]; if (!r) return;
        addStop(r.type === 'country' ? { id: DB.uid(), iso: r.iso, city: null } : { id: DB.uid(), iso: r.iso, city: { en: r.c.en, ar: r.c.ar, lat: r.c.lat, lon: r.c.lon } });
      };
      $('#fCancel', s).onclick = closeSheet;
      $('#fSave', s).onclick = async () => {
        d.title = $('#fTitle', s).value.trim();
        d.start = $('#fStart', s).value; d.end = $('#fEnd', s).value;
        if (!d.start) return toast(L('needStart'));
        if (d.end && d.end < d.start) return toast(L('badEnd'));
        if (!d.stops.length) { inp.focus(); return toast(L('needStop')); }
        const isNew = !d.id;
        const now = Date.now();
        const rec = Object.assign({}, d, { id: d.id || DB.uid(), createdAt: d.createdAt || now, updatedAt: now });
        try { await DB.put('trips', rec); } catch (e) { return toast(String(e && e.message || e)); }
        const i = TRIPS.findIndex(t => t.id === rec.id);
        if (i >= 0) TRIPS[i] = rec; else TRIPS.push(rec);
        closeSheet(); refresh(); toast(L('tripSaved')); askPersist();
        if (isNew) openTrip(rec.id); else if (curTrip === rec.id) openTrip(rec.id, true);
      };
    });
  }

  /* ---------- صفحة الرحلة ---------- */
  let curTrip = null, curMedia = [];
  async function openTrip(id, replace) {
    const t = tripById(id); if (!t) return;
    const page = $('#tripPage');
    if (!replace && page.hidden) history.pushState({ khuta: 'trip' }, '');
    curTrip = id;
    let media = [];
    try { media = (await DB.mediaOf(id)).filter(m => !m.deleted).sort((a, b) => (a.takenAt || '').localeCompare(b.takenAt || '') || a.createdAt - b.createdAt); } catch (e) {}
    curMedia = media.map(m => ({ id: m.id, takenAt: m.takenAt }));
    const isos = [...new Set(t.stops.map(s => s.iso))];
    const members = (t.members || []).map(memberById).filter(Boolean);
    const showWho = members.length && (S.members.length > 1 || S.members[0].name);
    let html = '<div class="thero' + (t.cover ? '' : ' noimg') + '"' + (t.cover ? '' : ' style="background:' + tripGrad(t) + '"') + '>' +
      (t.cover ? '<img alt="" data-mid="' + t.cover + '" data-kind="full">' : '<div class="flags">' + isos.slice(0, 4).map(flag).join('') + '</div>') +
      '<div class="shade"></div><div class="tbar"><button class="glass back" id="tBack" aria-label="' + L('back') + '">' + ICON.back + '</button><button class="glass" id="tEdit" aria-label="' + L('edit') + '">' + ICON.edit + '</button></div>' +
      '<div class="in"><h1>' + esc(displayTitle(t)) + '</h1><div class="meta"><span>' + fmtRange(t.start, t.end) + '</span>' + (t.end ? '<span>' + L('nNights', nights(t)) + '</span>' : '') +
      ((t.transport || []).length ? '<span>' + t.transport.map(transLbl).join(' · ') + '</span>' : '') + '</div></div></div>';
    html += '<div class="tcontent">';
    if (showWho) html += '<div class="who">' + members.map(m => '<span class="chip"><i style="background:' + m.color + '"></i>' + esc(memberName(m)) + '</span>').join('') + '</div>';
    html += '<div class="block"><h2>' + L('sStops') + '</h2><ul class="stops">' + t.stops.map(s => '<li><button data-stop="' + s.id + '"><span class="flag">' + flag(s.iso) + '</span><span class="nm"><b>' + esc(stopName(s)) + '</b><span>' + (s.city ? esc(cName(s.iso)) : L('fWholeCountry')) + '</span></span><span class="go">' + ICON.chev + '</span></button></li>').join('') + '</ul></div>';
    html += '<div class="block"><h2>' + L('sPhotos') + (media.length ? '<small>' + L('nPhotos', media.length) + '</small>' : '') + '</h2><div class="grid" id="tGrid"><button class="addp" id="tAddP">' + ICON.photo + L('addPhotos') + '</button>' +
      media.map((m, i) => '<button data-p="' + i + '"' + (m.id === t.cover ? ' class="cov"' : '') + '><img alt="" loading="lazy" data-mid="' + m.id + '"></button>').join('') + '</div></div>';
    const notes = (t.notes || []).slice().sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
    html += '<div class="block"><h2>' + L('sJournal') + '<button class="btn" id="tAddE" style="min-height:36px;padding:4px 14px;font-size:14px">' + ICON.plus + L('addEntry') + '</button></h2><div class="journal">' +
      (notes.length ? notes.map(n => '<button class="entry" data-e="' + n.id + '"><div class="d">' + fmtDate(n.date, { weekday: 'long', day: 'numeric', month: 'long' }) + '</div><div class="tx">' + esc(n.text) + '</div></button>').join('') : '<p class="note">' + L('journalEmpty') + '</p>') + '</div></div>';
    html += '<div class="row-actions"><button class="btn" id="tEdit2">' + ICON.edit + L('edit') + '</button><button class="btn danger" id="tDel">' + ICON.trash + L('del') + '</button></div></div>';
    page.innerHTML = html;
    if (page.hidden) { page.hidden = false; page.scrollTop = 0; }
    document.body.classList.add('in-page', 'no-fab'); document.body.style.overflow = 'hidden';
    Globe.pause(true);
    hydrate(page);
    $('#tBack').onclick = () => history.back();
    $('#tEdit').onclick = $('#tEdit2').onclick = () => openTripForm(tripById(id));
    $('#tDel').onclick = () => confirmSheet(L('delTripQ'), L('delTripNote'), L('del'), () => deleteTrip(id));
    $('#tAddP').onclick = () => { $('#photoInput').value = ''; $('#photoInput').click(); };
    $('#tGrid').onclick = e => { const b = e.target.closest('[data-p]'); if (b) openViewer(+b.dataset.p); };
    $('#tAddE').onclick = () => openEntry(null);
    $$('[data-e]', page).forEach(b => b.onclick = () => openEntry(b.dataset.e));
    $$('[data-stop]', page).forEach(b => b.onclick = () => {
      const s = t.stops.find(x => x.id === b.dataset.stop); if (!s) return;
      history.back();
      setTimeout(() => {
        show('map'); Globe.setSelected(s.iso);
        if (s.city && typeof s.city.lat === 'number') Globe.flyTo(s.city.lon, s.city.lat, Math.max(3, Globe.zoomForIso(s.iso))); else flyToIso(s.iso);
      }, 60);
    });
  }
  function closeTrip() {
    const page = $('#tripPage'); if (page.hidden) return;
    page.hidden = true; page.innerHTML = ''; curTrip = null;
    document.body.classList.remove('in-page', 'no-fab'); document.body.style.overflow = '';
    syncFab(); if (current === 'map') Globe.pause(false);
  }
  window.addEventListener('popstate', () => {
    if (!$('#viewer').hidden) { closeViewer(true); return; }
    closeTrip();
  });
  async function deleteTrip(id) {
    const now = Date.now();
    try {
      const media = await DB.mediaOf(id);
      await DB.putMany('media', media.map(m => ({ id: m.id, tripId: id, deleted: true, updatedAt: now })));
      media.forEach(m => dropURLs(m.id));
      await DB.put('trips', { id, deleted: true, updatedAt: now });
    } catch (e) { return toast(String(e && e.message || e)); }
    TRIPS = TRIPS.filter(t => t.id !== id);
    MEDIA = MEDIA.map(m => m.tripId === id ? Object.assign({}, m, { deleted: true }) : m);
    closeSheet(); history.back(); refresh(); toast(L('tripDeleted'));
  }
  async function touchTrip(t) { t.updatedAt = Date.now(); await DB.put('trips', t); }

  /* اليوميات */
  function openEntry(eid) {
    const t = tripById(curTrip); if (!t) return;
    t.notes = t.notes || [];
    const n = eid ? t.notes.find(x => x.id === eid) : null;
    const td = today();
    const defDate = n ? n.date : (td >= t.start && (!t.end || td <= t.end) ? td : (t.end || t.start));
    sheet('<h2>' + L('sJournal') + '</h2><label class="field"><span>' + L('entryDate') + '</span><input class="inp" type="date" id="eDate" value="' + defDate + '"></label>' +
      '<label class="field"><textarea class="inp" id="eText" placeholder="' + esc(L('entryPh')) + '">' + esc(n ? n.text : '') + '</textarea></label>' +
      '<div class="actions"><button class="btn primary" id="eSave">' + L('save') + '</button>' + (n ? '<button class="btn danger" id="eDel">' + L('del') + '</button>' : '<button class="btn ghost" id="eCancel">' + L('cancel') + '</button>') + '</div>', s => {
      if (!n) setTimeout(() => $('#eText', s).focus(), 250);
      const c = $('#eCancel', s); if (c) c.onclick = closeSheet;
      $('#eSave', s).onclick = async () => {
        const text = $('#eText', s).value.trim(); if (!text) return closeSheet();
        const date = $('#eDate', s).value || defDate, now = Date.now();
        if (n) Object.assign(n, { text, date, updatedAt: now }); else t.notes.push({ id: DB.uid(), date, text, createdAt: now, updatedAt: now });
        await touchTrip(t); closeSheet(); openTrip(t.id, true);
      };
      const del = $('#eDel', s); if (del) del.onclick = async () => { t.notes = t.notes.filter(x => x.id !== n.id); await touchTrip(t); closeSheet(); openTrip(t.id, true); };
    });
  }

  /* الصور */
  function loadImg(file) {
    return new Promise((res, rej) => {
      const u = URL.createObjectURL(file), im = new Image();
      im.onload = () => { res(im); setTimeout(() => URL.revokeObjectURL(u), 2000); };
      im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('img')); };
      im.decoding = 'async'; im.src = u;
    });
  }
  function shrink(img, max, q) {
    const w0 = img.naturalWidth, h0 = img.naturalHeight, s = Math.min(1, max / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * s)), h = Math.max(1, Math.round(h0 * s));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, w, h);
    return new Promise((res, rej) => c.toBlob(b => { c.width = c.height = 0; b ? res({ blob: b, w, h }) : rej(new Error('blob')); }, 'image/jpeg', q));
  }
  async function exifInfo(file) {
    try {
      const v = new DataView(await file.slice(0, 262144).arrayBuffer());
      if (v.getUint16(0) !== 0xFFD8) return {};
      let o = 2;
      while (o < v.byteLength - 4) {
        const m = v.getUint16(o); if ((m & 0xFF00) !== 0xFF00) break;
        const len = v.getUint16(o + 2);
        if (m === 0xFFE1 && v.getUint32(o + 4) === 0x45786966) return tiff(v, o + 10);
        o += 2 + len;
      }
    } catch (e) {}
    return {};
  }
  function tiff(v, t) {
    const le = v.getUint16(t) === 0x4949, u16 = p => v.getUint16(p, le), u32 = p => v.getUint32(p, le);
    const SZ = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
    const ifd = p => { const n = u16(p), o = {}; for (let i = 0; i < n; i++) { const e = p + 2 + i * 12; o[u16(e)] = { type: u16(e + 2), count: u32(e + 4), at: e + 8 }; } return o; };
    const off = e => (SZ[e.type] || 1) * e.count > 4 ? t + u32(e.at) : e.at;
    const str = e => { const p = off(e); let s = ''; for (let i = 0; i < e.count - 1; i++) s += String.fromCharCode(v.getUint8(p + i)); return s; };
    const rat = p => u32(p) / (u32(p + 4) || 1);
    const out = {}, i0 = ifd(t + u32(t + 4));
    const dt = s => { const m = /^(\d{4}):(\d\d):(\d\d)/.exec(s || ''); return m && m[1] > '1900' ? m[1] + '-' + m[2] + '-' + m[3] : null; };
    if (i0[0x8769]) { const ex = ifd(t + u32(i0[0x8769].at)); const e = ex[0x9003] || ex[0x9004]; if (e) out.date = dt(str(e)); }
    if (!out.date && i0[0x0132]) out.date = dt(str(i0[0x0132]));
    if (i0[0x8825]) {
      const g = ifd(t + u32(i0[0x8825].at));
      if (g[2] && g[4]) {
        const dms = e => { const p = off(e); return rat(p) + rat(p + 8) / 60 + rat(p + 16) / 3600; };
        let lat = dms(g[2]), lon = dms(g[4]);
        if (g[1] && String.fromCharCode(v.getUint8(g[1].at)) === 'S') lat = -lat;
        if (g[3] && String.fromCharCode(v.getUint8(g[3].at)) === 'W') lon = -lon;
        if (isFinite(lat) && isFinite(lon) && (lat || lon)) { out.lat = +lat.toFixed(5); out.lon = +lon.toFixed(5); }
      }
    }
    return out;
  }
  $('#photoInput').addEventListener('change', async e => {
    const files = [...e.target.files]; if (!files.length || !curTrip) return;
    const t = tripById(curTrip); if (!t) return;
    let ok = 0, fail = 0; const added = [];
    for (let i = 0; i < files.length; i++) {
      toast(L('compressing', i + 1, files.length), 60000);
      try {
        const f = files[i], ex = await exifInfo(f), img = await loadImg(f);
        const full = await shrink(img, 1600, 0.82), thumb = await shrink(img, 480, 0.75);
        const now = Date.now();
        const rec = { id: DB.uid(), tripId: t.id, full: full.blob, thumb: thumb.blob, w: full.w, h: full.h, takenAt: ex.date || null, lat: ex.lat == null ? null : ex.lat, lon: ex.lon == null ? null : ex.lon, createdAt: now + i, updatedAt: now };
        await DB.put('media', rec);
        MEDIA.push({ id: rec.id, tripId: t.id, deleted: false, takenAt: rec.takenAt });
        added.push(rec.id); ok++;
      } catch (err) { fail++; console.warn(err); }
    }
    if (added.length && !t.cover) { t.cover = added[0]; }
    if (added.length) await touchTrip(t);
    toast(fail ? L('photoFail') : L('photosAdded', ok));
    askPersist(); renderTrips(); openTrip(t.id, true);
  });

  /* عارض الصور */
  let vIdx = 0, vURL = '';
  async function openViewer(i) {
    const v = $('#viewer');
    if (v.hidden) history.pushState({ khuta: 'viewer' }, '');
    vIdx = i; v.hidden = false;
    const m = curMedia[i]; if (!m) return closeViewer();
    const t = tripById(curTrip);
    v.innerHTML = '<div class="vbar"><button class="glass" id="vClose" aria-label="' + L('close') + '">' + ICON.close + '</button><span class="num"><bdi dir="ltr">' + D((i + 1) + ' / ' + curMedia.length) + '</bdi>' + (m.takenAt ? ' · ' + fmtDate(m.takenAt) : '') + '</span><span style="width:42px"></span></div>' +
      '<div class="img" id="vImg"><img alt="" id="vPic"></div>' +
      (curMedia.length > 1 ? '<button class="nav prev" id="vPrev" aria-label="prev">' + ICON.back + '</button><button class="nav next" id="vNext" aria-label="next"><span style="display:inline-block;transform:scaleX(-1)">' + ICON.back + '</span></button>' : '') +
      '<div class="vfoot">' + (t && t.cover !== m.id ? '<button id="vCover">' + ICON.star + L('setCover') + '</button>' : '') + '<button id="vDel">' + ICON.trash + L('del') + '</button></div>';
    const u = await mediaURL(m.id, 'full'); if (u) $('#vPic').src = u;
    $('#vClose').onclick = () => history.back();
    const step = d => { const n = (vIdx + d + curMedia.length) % curMedia.length; openViewer(n); };
    const p = $('#vPrev'), nx = $('#vNext');
    if (p) { p.onclick = () => step(-1); nx.onclick = () => step(1); }
    const vc = $('#vCover'); if (vc) vc.onclick = async () => { t.cover = m.id; await touchTrip(t); toast(L('coverSet')); renderTrips(); openViewer(vIdx); };
    $('#vDel').onclick = () => confirmSheet(L('delPhotoQ'), '', L('del'), async () => {
      await DB.put('media', { id: m.id, tripId: curTrip, deleted: true, updatedAt: Date.now() });
      dropURLs(m.id);
      MEDIA = MEDIA.map(x => x.id === m.id ? Object.assign({}, x, { deleted: true }) : x);
      curMedia.splice(vIdx, 1);
      if (t.cover === m.id) t.cover = curMedia[0] ? curMedia[0].id : null;
      await touchTrip(t); closeSheet(); toast(L('photoDeleted'));
      renderTrips();
      if (!curMedia.length) history.back(); else openViewer(Math.min(vIdx, curMedia.length - 1));
    });
    let sx = null;
    const img = $('#vImg');
    img.ontouchstart = e => { sx = e.touches.length === 1 ? e.touches[0].clientX : null; };
    img.ontouchend = e => {
      if (sx === null || curMedia.length < 2) return;
      const dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) < 50) return;
      const rtl = document.dir === 'rtl';
      step((dx < 0) !== rtl ? 1 : -1);
    };
  }
  function closeViewer(fromPop) {
    const v = $('#viewer'); if (v.hidden) return;
    v.hidden = true; v.innerHTML = '';
    if (curTrip) openTrip(curTrip, true);
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if ($('#sheetBg').classList.contains('on')) closeSheet(); else if (!$('#viewer').hidden || !$('#tripPage').hidden) history.back(); }
    if (!$('#viewer').hidden && curMedia.length > 1 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      const fwd = (e.key === 'ArrowRight') !== (document.dir === 'rtl');
      openViewer((vIdx + (fwd ? 1 : -1) + curMedia.length) % curMedia.length);
    }
  });

  /* ---------- الجواز ---------- */
  let passFilter = 'all';
  const INKS = ['#2B6CD9', '#E5383B', '#1FA35C', '#7B2FF7', '#F2711C', '#0FA3B1', '#D6247A'];
  const hash = s => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  function stampSVG(iso, date, trans) {
    const h = hash(iso), shape = h % 4, ink = INKS[(h >>> 3) % INKS.length], rot = ((h >>> 7) % 25) - 12;
    const ar = (COUNTRIES.get(iso) || {}).a || iso, en = ((COUNTRIES.get(iso) || {}).e || iso).toUpperCase();
    const arSz = Math.max(15, Math.min(30, 210 / Math.max(3, ar.length))), enSz = Math.max(6.5, Math.min(13, (138 / Math.max(4, en.length) - 1.5) / 0.66));
    const d = toDate(date), dStr = D(String(d.getDate()).padStart(2, '0') + ' ' + ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][d.getMonth()] + ' ' + d.getFullYear());
    let frame;
    if (shape === 0) frame = '<circle cx="100" cy="100" r="86" stroke-width="5"/><circle cx="100" cy="100" r="76" stroke-width="1.6"/>';
    else if (shape === 1) frame = '<rect x="14" y="38" width="172" height="124" rx="16" stroke-width="5"/><rect x="23" y="47" width="154" height="106" rx="9" stroke-width="1.6"/>';
    else if (shape === 2) { const o = r => { let p = ''; for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; p += (i ? 'L' : 'M') + (100 + r * Math.cos(a)).toFixed(1) + ' ' + (100 + r * Math.sin(a)).toFixed(1); } return p + 'Z'; }; frame = '<path d="' + o(90) + '" stroke-width="5"/><path d="' + o(80) + '" stroke-width="1.6"/>'; }
    else frame = '<ellipse cx="100" cy="100" rx="92" ry="70" stroke-width="5"/><ellipse cx="100" cy="100" rx="82" ry="61" stroke-width="1.6"/>';
    const icon = ICON[trans] ? ICON[trans].replace('<svg ', '<svg x="88" y="' + (shape === 1 || shape === 3 ? 52 : 40) + '" width="24" height="24" ') : '';
    const top = shape === 1 || shape === 3 ? 86 : 80;
    return '<svg viewBox="0 0 200 200" aria-hidden="true"><g transform="rotate(' + rot + ' 100 100)" fill="none" stroke="' + ink + '" color="' + ink + '" filter="url(#inkWear)">' + frame + icon +
      '<text x="100" y="' + (top + arSz * 0.35) + '" text-anchor="middle" fill="' + ink + '" stroke="none" font-family="var(--display)" font-weight="700" font-size="' + arSz.toFixed(1) + '">' + esc(ar) + '</text>' +
      '<text x="100" y="' + (top + arSz * 0.35 + 20) + '" text-anchor="middle" fill="' + ink + '" stroke="none" font-family="Montserrat, system-ui, sans-serif" font-weight="500" letter-spacing="1.5" font-size="' + enSz.toFixed(1) + '" style="direction:ltr;unicode-bidi:plaintext">' + esc(en) + '</text>' +
      '<line x1="56" x2="144" y1="' + (top + arSz * 0.35 + 31) + '" y2="' + (top + arSz * 0.35 + 31) + '" stroke-width="1.2"/>' +
      '<text x="100" y="' + (top + arSz * 0.35 + 47) + '" text-anchor="middle" fill="' + ink + '" stroke="none" font-family="Montserrat, system-ui, sans-serif" font-weight="500" letter-spacing="1" font-size="11.5" style="direction:ltr;unicode-bidi:plaintext">' + dStr + '</text>' +
      '</g></svg>';
  }
  function renderPassport() {
    const trips = passFilter === 'all' ? TRIPS : TRIPS.filter(t => (t.members || []).includes(passFilter));
    const der = derive(trips);
    const list = [...der.countries.values()].sort((a, b) => a.first.localeCompare(b.first));
    let html = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="inkWear" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 2.25" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter></svg>';
    html += '<div class="pass-head"><svg class="emb" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="32" cy="32" r="22"/><path d="M10 32h44M32 10c6.5 6 9.5 13.2 9.5 22S38.5 48 32 54c-6.5-6-9.5-13.2-9.5-22S25.5 16 32 10z"/><path d="M14.5 21h35M14.5 43h35" stroke-dasharray="2 3"/><circle cx="32" cy="32" r="28" stroke-dasharray="1 3.2"/></svg>' +
      '<div><div class="t">' + L('passportTitle') + '</div><div class="s">' + L('passportSub') + '</div></div><div class="n"><b>' + N(list.length) + '</b><span>' + L('stamps') + '</span></div></div>';
    if (S.members.length > 1) html += '<div class="mfilter">' + [{ id: 'all' }].concat(S.members).map(m => '<button class="chip' + (passFilter === m.id ? ' on' : '') + '" data-m="' + m.id + '">' + (m.id === 'all' ? L('all') : '<i style="background:' + m.color + '"></i>' + esc(memberName(m))) + '</button>').join('') + '</div>';
    if (!list.length) html += '<div class="ppage blank">' + L('passEmpty') + '</div>';
    for (let p = 0; p * 6 < list.length; p++) {
      html += '<div class="ppage"><div class="stamps">' + list.slice(p * 6, p * 6 + 6).map(c => {
        const t = c.firstTrip;
        return '<button class="stamp" data-iso="' + c.iso + '" aria-label="' + esc(cName(c.iso)) + '">' + stampSVG(c.iso, c.first, (t.transport || [])[0]) + '</button>';
      }).join('') + '</div><div class="pno">' + L('page') + ' ' + N(p + 1) + '</div></div>';
    }
    $('#passport').innerHTML = html;
  }
  $('#passport').addEventListener('click', e => {
    const m = e.target.closest('[data-m]'); if (m) { passFilter = m.dataset.m; renderPassport(); return; }
    const s = e.target.closest('.stamp'); if (s) openCountry(s.dataset.iso, false);
  });

  /* ---------- الإعدادات ---------- */
  function seg(sel, val, fn) {
    const el = $(sel);
    $$('button', el).forEach(b => { b.classList.toggle('on', b.dataset.v === String(val)); b.onclick = () => fn(b.dataset.v); });
  }
  async function renderSettings() {
    seg('#setLang', S.lang, v => { S.lang = v; save(); applyLang(); refresh(); renderSettings(); });
    seg('#setTheme', S.theme, v => { S.theme = v; save(); applyTheme(); renderSettings(); });
    seg('#setDigits', S.digits, v => { S.digits = v; save(); applyLang(); refresh(); renderSettings(); });
    $('#setMembers').innerHTML = S.members.map(m => '<button data-m="' + m.id + '"><span class="lbl"><i style="background:' + m.color + '"></i>' + esc(memberName(m)) + '</span><span class="val">' + L('memberTrips', TRIPS.filter(t => (t.members || []).includes(m.id)).length) + '</span></button>').join('') +
      '<button id="addMember"><span class="lbl acc">' + L('addMember') + '</span><span class="val acc">' + ICON.plus.replace('<svg ', '<svg width="18" height="18" ') + '</span></button>';
    $('#homeVal').textContent = (isEn() ? S.home.en : S.home.ar || S.home.en) + ' ' + flag(S.home.iso);
    $('#lastBackupVal').textContent = S.lastBackup ? fmtDate(new Date(S.lastBackup).toISOString().slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' }) : L('never');
    $('#verVal').textContent = D('v' + VERSION);
    $('#aboutVer').textContent = (isEn() ? 'KHUTA ' : 'خُطى ') + D(VERSION);
    let note = L('dataNote');
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        $('#storageVal').textContent = D((est.usage / 1048576).toFixed(1)) + ' MB';
      }
      if (navigator.storage && navigator.storage.persisted) note += ' ' + ((await navigator.storage.persisted()) ? L('persistOn') : L('persistOff')) + '.';
    } catch (e) {}
    $('#dataNote').textContent = note;
  }
  $('#setMembers').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const m = b.dataset.m ? memberById(b.dataset.m) : null;
    sheet('<h2>' + (m ? esc(memberName(m)) : L('addMember')) + '</h2><label class="field"><span>' + L('memberName') + '</span><input class="inp" id="mName" maxlength="30" placeholder="' + esc(L('memberPh')) + '" value="' + esc(m ? m.name : '') + '"></label>' +
      '<div class="actions"><button class="btn primary" id="mSave">' + L('save') + '</button>' + (m && m.id !== 'me' ? '<button class="btn danger" id="mDel">' + L('del') + '</button>' : '<button class="btn ghost" id="mCancel">' + L('cancel') + '</button>') + '</div>', s => {
      setTimeout(() => $('#mName', s).focus(), 250);
      const c = $('#mCancel', s); if (c) c.onclick = closeSheet;
      $('#mSave', s).onclick = () => {
        const name = $('#mName', s).value.trim();
        if (m) m.name = name || (m.id === 'me' ? '' : m.name);
        else if (name) S.members.push({ id: DB.uid(), name, color: COLORS[S.members.length % COLORS.length] });
        save(); closeSheet(); renderSettings();
      };
      const d = $('#mDel', s); if (d) d.onclick = () => { S.members = S.members.filter(x => x.id !== m.id); if (passFilter === m.id) passFilter = 'all'; save(); closeSheet(); renderSettings(); };
    });
  });
  $('#setHome').onclick = () => {
    sheet('<h2>' + L('chooseHome') + '</h2><input class="inp" id="hSearch" autocomplete="off" placeholder="' + esc(L('fSearchPh')) + '"><div class="results" id="hRes"></div>', s => {
      const inp = $('#hSearch', s), res = $('#hRes', s); let r = [];
      setTimeout(() => inp.focus(), 250);
      loadCities().catch(() => {});
      let tm; inp.oninput = () => { clearTimeout(tm); tm = setTimeout(async () => {
        await loadCities().catch(() => {});
        r = search(inp.value, { citiesOnly: true });
        res.innerHTML = r.map((x, i) => '<button data-i="' + i + '"><span class="flag">' + flag(x.iso) + '</span><span><b>' + esc(cityName(x.c)) + '</b><span>' + esc(cName(x.iso)) + '</span></span></button>').join('');
      }, 90); };
      res.onclick = e => {
        const b = e.target.closest('[data-i]'); if (!b) return;
        const c = r[+b.dataset.i].c;
        S.home = { en: c.en, ar: c.ar, iso: c.iso, lat: c.lat, lon: c.lon }; save();
        closeSheet(); syncGlobe(); renderSettings(); toast(L('homeSet', cityName(c)));
      };
    });
  };

  /* ---------- النسخة الاحتياطية ---------- */
  let exporting = false;
  async function exportBackup() {
    if (exporting) return; exporting = true;
    toast(L('preparing'), 60000);
    try {
      const trips = await DB.all('trips'), media = await DB.all('media');
      const files = [], meta = [];
      for (const m of media) {
        const rest = Object.assign({}, m); delete rest.full; delete rest.thumb; meta.push(rest);
        if (!m.deleted && m.full) { files.push({ name: 'photos/' + m.id + '.jpg', data: m.full }); if (m.thumb) files.push({ name: 'thumbs/' + m.id + '.jpg', data: m.thumb }); }
      }
      const data = { app: 'khuta', format: 1, version: VERSION, exportedAt: new Date().toISOString(), settings: { home: S.home, members: S.members }, trips, media: meta };
      files.unshift({ name: 'data.json', data: JSON.stringify(data) });
      const blob = await DB.makeZip(files);
      const name = 'khuta-backup-' + today() + '.zip';
      const file = new File([blob], name, { type: 'application/zip' });
      toast(L('exported'));
      const mb = (blob.size / 1048576).toFixed(1);
      sheet('<h2>' + L('exportB') + '</h2><p class="num">' + esc(name) + ' · ' + D(mb) + ' MB</p><p>' + L('dataNote') + '</p><div class="actions"><button class="btn primary" id="bSave">' + L('save') + '</button><button class="btn ghost" id="bCancel">' + L('cancel') + '</button></div>', s => {
        $('#bCancel', s).onclick = closeSheet;
        $('#bSave', s).onclick = async () => {
          const mark = () => { S.lastBackup = Date.now(); save(); renderTrips(); renderSettings(); };
          if (navigator.canShare && isMobile() && navigator.canShare({ files: [file] })) {
            try { await navigator.share({ files: [file], title: name }); mark(); closeSheet(); return; }
            catch (e) { if (e && e.name === 'AbortError') return; }
          }
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
          document.body.appendChild(a); a.click();
          setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 8000);
          mark(); closeSheet();
        };
      });
    } catch (e) { toast(String(e && e.message || e)); }
    finally { exporting = false; }
  }
  $('#setExport').onclick = exportBackup;
  $('#setImport').onclick = () => { $('#importInput').value = ''; $('#importInput').click(); };
  $('#importInput').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    toast(L('importing'), 60000);
    try {
      const z = await DB.readZip(f);
      if (!z['data.json']) throw new Error('bad');
      const data = JSON.parse(await z['data.json'].text());
      if (data.app !== 'khuta' || !Array.isArray(data.trips)) throw new Error('bad');
      const localT = new Map((await DB.all('trips')).map(t => [t.id, t]));
      const putT = data.trips.filter(t => t && t.id && (!localT.has(t.id) || (t.updatedAt || 0) > (localT.get(t.id).updatedAt || 0)));
      if (putT.length) await DB.putMany('trips', putT);
      const localM = new Map((await DB.mediaIndex()).map(m => [m.id, m]));
      let nPhotos = 0;
      for (const m of data.media || []) {
        if (!m || !m.id) continue;
        if (localM.has(m.id)) { const loc = await DB.get('media', m.id); if (loc && (loc.updatedAt || 0) >= (m.updatedAt || 0)) continue; }
        let rec = Object.assign({}, m);
        if (!m.deleted) {
          const full = z['photos/' + m.id + '.jpg'], th = z['thumbs/' + m.id + '.jpg'];
          if (!full) continue;
          rec.full = new Blob([full], { type: 'image/jpeg' }); rec.thumb = new Blob([th || full], { type: 'image/jpeg' });
          nPhotos++;
        }
        await DB.put('media', rec);
      }
      if (data.settings) {
        const ids = new Set(S.members.map(m => m.id));
        for (const m of data.settings.members || []) {
          if (!ids.has(m.id)) S.members.push(m);
          else if (m.id === 'me' && m.name && !memberById('me').name) memberById('me').name = m.name;
        }
        if (data.settings.home && S.home.en === DEF.home.en && S.home.iso === DEF.home.iso) S.home = data.settings.home;
        save();
      }
      await loadData(); refresh(); renderSettings();
      toast(L('imported', N(putT.filter(t => !t.deleted).length), N(nPhotos)), 4000);
      askPersist();
    } catch (err) { console.warn(err); toast(L('badBackup')); }
  });

  /* ---------- النوافذ ---------- */
  let sheetClose = null;
  function sheet(html, bind, onClose) {
    const prev = sheetClose; sheetClose = null; if (prev) prev();
    const s = $('#sheet');
    s.innerHTML = '<div class="grip"></div>' + html;
    $('#sheetBg').classList.add('on'); s.scrollTop = 0;
    sheetClose = onClose || null;
    Globe.pause(true);
    if (bind) bind(s);
  }
  function closeSheet() {
    $('#sheetBg').classList.remove('on');
    const f = sheetClose; sheetClose = null; if (f) f();
    if (current === 'map' && $('#tripPage').hidden) Globe.pause(false);
  }
  $('#sheetBg').addEventListener('click', e => { if (e.target.id === 'sheetBg') closeSheet(); });
  function confirmSheet(title, note, okLbl, fn) {
    sheet('<h2>' + esc(title) + '</h2>' + (note ? '<p>' + esc(note) + '</p>' : '') + '<div class="actions"><button class="btn primary" id="okBtn" style="background:#C8402A;color:#fff">' + esc(okLbl) + '</button><button class="btn ghost" id="noBtn">' + L('cancel') + '</button></div>', s => {
      $('#okBtn', s).onclick = fn; $('#noBtn', s).onclick = closeSheet;
    });
  }

  /* ---------- التثبيت ---------- */
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; setTimeout(renderGate, 0); });
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobile = () => isIOS() || /android|mobi/i.test(navigator.userAgent);
  const inAppBrowser = () => /Instagram|FBAN|FBAV|FB_IAB|Snapchat|TikTok|musical_ly|Twitter|LinkedInApp|Line\//i.test(navigator.userAgent);
  const iosChrome = () => /CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent);
  const ua = navigator.userAgent;
  const deskChromium = () => !isMobile() && /Chrome|Chromium|Edg\//.test(ua) && !/OPR\/|Firefox/.test(ua);
  const deskSafari = () => !isMobile() && /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg\/|Firefox/.test(ua);
  const SHARE_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3E8FC4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  const INSTALL_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3E8FC4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 7.5v6M9.5 11l2.5 2.5 2.5-2.5"/></svg>';
  const DOTS_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="none" stroke="#3E8FC4" stroke-width="1.6"/><circle cx="7.5" cy="12" r="1.5" fill="#3E8FC4"/><circle cx="12" cy="12" r="1.5" fill="#3E8FC4"/><circle cx="16.5" cy="12" r="1.5" fill="#3E8FC4"/></svg>';
  const ADD_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3E8FC4" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  function renderGate() {
    const g = $('#gate'); if (!g || g.hidden) return;
    const ol = arr => '<ol class="steps">' + arr.map(x => '<li><span>' + x + '</span></li>').join('') + '</ol>';
    let steps = '', arrow = '';
    const btn = $('#gateInstall'), copy = $('#gateCopy');
    btn.hidden = true; copy.hidden = true;
    if (inAppBrowser()) { steps = ol(L('gateInApp')); copy.hidden = false; arrow = 'top'; }
    else if (isIOS() && iosChrome()) { steps = ol(L('gateIOSChrome', SHARE_ICON, ADD_ICON)); arrow = 'top'; }
    else if (isIOS()) { steps = ol(L('gateIOS', DOTS_ICON, SHARE_ICON, ADD_ICON)); arrow = 'bottom'; }
    else if (deskChromium()) { if (deferredPrompt) btn.hidden = false; steps = ol(L('gateDesk', INSTALL_ICON)); arrow = 'top'; }
    else if (deskSafari()) { steps = ol(L('gateMac')); }
    else if (deferredPrompt) { btn.hidden = false; }
    else { steps = ol(L('gateAndroid')); arrow = 'top'; }
    $('#gateSteps').innerHTML = steps;
    $('#gateSub').textContent = L(isMobile() ? 'gateSub' : 'gateSubDesk');
    const a = $('#gateArrow'); a.className = 'gate-arrow ' + arrow; a.hidden = !arrow;
  }
  function openGate() {
    if (isStandalone()) { sheet('<h2>' + L('instTitle') + '</h2><p>' + L('instDone') + '</p><div class="actions"><button class="btn" id="instOk">' + L('close') + '</button></div>', s => { $('#instOk', s).onclick = closeSheet; }); return; }
    closeSheet();
    $('#gate').hidden = false; document.body.classList.add('gated');
    renderGate();
  }
  function closeGate() {
    $('#gate').hidden = true; document.body.classList.remove('gated');
    try { sessionStorage.setItem('khuta-browse', '1'); } catch (e) {}
  }
  window.addEventListener('appinstalled', () => { $('#gate').hidden = true; document.body.classList.remove('gated'); });
  $('#gateSkip').onclick = closeGate;
  $('#gateInstall').onclick = () => { if (!deferredPrompt) return; deferredPrompt.prompt(); deferredPrompt.userChoice.finally(() => { deferredPrompt = null; renderGate(); }); };
  $('#gateCopy').onclick = () => {
    const url = location.href.split('#')[0];
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast(L('gateCopied'))).catch(() => toast(url));
  };
  $('#setInstall').onclick = openGate;

  /* ---------- التحديث ---------- */
  let reloading = false;
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) location.reload(); });
  }
  $('#setUpdate').onclick = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) throw new Error();
      await reg.update();
      if (reg.installing || reg.waiting) { reloading = true; toast(L('updating')); setTimeout(() => location.reload(), 3000); }
      else toast(L('upToDate'));
    } catch (e) { toast(L('updFail')); }
  };

  /* ---------- التنقل ---------- */
  let current = 'map';
  function syncFab() { document.body.classList.toggle('no-fab', current === 'settings' || !$('#tripPage').hidden); }
  function show(v) {
    current = v;
    $$('.tabs button').forEach(b => { b.classList.toggle('on', b.dataset.v === v); b.setAttribute('aria-current', b.dataset.v === v ? 'page' : 'false'); });
    $$('.view').forEach(s => s.classList.toggle('on', s.id === 'v-' + v));
    Globe.pause(v !== 'map');
    if (v === 'map') Globe.redraw();
    if (v === 'passport') renderPassport();
    if (v === 'settings') renderSettings();
    syncFab();
    window.scrollTo(0, 0);
  }
  $$('.tabs button').forEach(b => b.onclick = () => show(b.dataset.v));
  $('#fab').onclick = () => openTripForm();

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', S.theme);
    setTimeout(() => Globe.readColors(), 30);
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => Globe.readColors());
  function applyLang() {
    const d = document.documentElement;
    d.lang = S.lang; d.dir = isEn() ? 'ltr' : 'rtl';
    $$('[data-t]').forEach(el => { el.textContent = L(el.dataset.t); });
    $('#brandName').textContent = L('appName'); $('#brandSub').textContent = isEn() ? 'خُطى' : 'KHUTA';
    document.title = L('appName');
    $('#fab').setAttribute('aria-label', L('newTrip'));
    $('#recenter').setAttribute('aria-label', L('recenter'));
  }
  function refresh() {
    DER = derive(TRIPS);
    renderMap(); renderTrips();
    if (current === 'passport') renderPassport();
    if (current === 'settings') renderSettings();
  }

  /* ---------- البداية ---------- */
  async function boot() {
    applyLang();
    try {
      topo = await (await fetch('data/countries.json')).json();
      for (const g of topo.objects.c.geometries) if (!COUNTRIES.has(g.properties.i)) COUNTRIES.set(g.properties.i, g.properties);
      Globe.init($('#globe'), topo, { onTap: iso => { if (iso) openCountry(iso); else Globe.setSelected(null); }, center: [S.home.lon, S.home.lat] });
      $('#globeLoading').remove();
    } catch (e) { console.warn(e); $('#globeLoading').textContent = L('loadFail'); }
    await loadData();
    refresh();
    Globe.setSpin(true);
    syncFab();
    const idle = window.requestIdleCallback || (f => setTimeout(f, 1500));
    idle(() => loadCities().catch(() => {}));
    let browse = false; try { browse = sessionStorage.getItem('khuta-browse') === '1'; } catch (e) {}
    if (isMobile() && !isStandalone() && !browse) openGate();
  }
  boot();
})();
