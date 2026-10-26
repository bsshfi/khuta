/* خُطى — الكرة الأرضية (Canvas + d3-geo) بدون أي خدمة خرائط */
const Globe = (() => {
  const { geoOrthographic, geoPath, geoGraticule10, geoContains, geoDistance, feature, mesh } = KV;
  let canvas, ctx, wrap, W = 0, H = 0, dpr = 1, R0 = 100, k = 1;
  let rot = [-46.7, -20, 0];
  const proj = geoOrthographic().clipAngle(90).precision(0.6);
  let path, feats = [], byIso = new Map(), borders = null, grat = geoGraticule10();
  let states = new Map(), selected = null, home = null, dots = [];
  let C = {}, dirty = true, running = false, anim = null, vel = null, lastT = 0;
  let onTap = () => {}, spinOn = false, lastInteract = 0, paused = false;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const SPIN = 2.2, IDLE = 7000;

  function readColors() {
    const s = getComputedStyle(document.documentElement);
    const g = n => s.getPropertyValue(n).trim();
    C = { o1: g('--ocean-1'), o2: g('--ocean-2'), rim: g('--rim'), land: g('--land'), landLine: g('--land-line'),
      grat: g('--grat'), visited: g('--visited'), visitedLine: g('--visited-line'), sel: g('--sel'), homeLand: g('--home-land'),
      dot: g('--dot'), dotRing: g('--dot-ring'), halo: g('--halo') };
    dirty = true; tick();
  }

  function init(el, topo, opts) {
    wrap = el; onTap = opts.onTap || onTap;
    canvas = document.createElement('canvas'); canvas.className = 'globe-canvas';
    canvas.setAttribute('role', 'img');
    el.appendChild(canvas); ctx = canvas.getContext('2d');
    feats = feature(topo, topo.objects.c).features;
    feats.forEach(f => {
      f.b = KV.geoBounds(f);
      const arr = byIso.get(f.properties.i) || []; arr.push(f); byIso.set(f.properties.i, arr);
    });
    borders = mesh(topo, topo.objects.c);
    path = geoPath(proj, ctx);
    if (opts.center) rot = [-opts.center[0], -Math.max(-60, Math.min(60, opts.center[1])) * 0.7, 0];
    readColors();
    new ResizeObserver(resize).observe(el); resize();
    bind();
    lastInteract = performance.now();
  }

  function resize() {
    const r = wrap.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    R0 = Math.min(W, H) / 2 - 18;
    dirty = true; tick();
  }

  function setup() {
    proj.scale(R0 * k).translate([W / 2, H / 2]).rotate(rot);
  }

  function draw() {
    setup();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const r = R0 * k, cx = W / 2, cy = H / 2;
    // هالة الغلاف الجوي
    const halo = ctx.createRadialGradient(cx, cy, r * 0.96, cx, cy, r * 1.09);
    halo.addColorStop(0, C.halo); halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, r * 1.1, 0, 7); ctx.fill();
    // المحيط
    const og = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.42, r * 0.05, cx, cy, r);
    og.addColorStop(0, C.o1); og.addColorStop(1, C.o2);
    ctx.fillStyle = og; ctx.beginPath(); path({ type: 'Sphere' }); ctx.fill();
    // خطوط الطول والعرض
    ctx.beginPath(); path(grat); ctx.strokeStyle = C.grat; ctx.lineWidth = 0.6; ctx.stroke();
    // اليابسة
    ctx.beginPath();
    for (const f of feats) if (!states.has(f.properties.i)) path(f);
    ctx.fillStyle = C.land; ctx.fill();
    // البيت والدول المزارة
    // كل لون (قارة) في مسار واحد
    const groups = new Map();
    for (const [iso, st] of states) {
      const col = st === 'home' ? C.homeLand : st[0] === '#' ? st : C.visited;
      if (!groups.has(col)) groups.set(col, []);
      groups.get(col).push(iso);
    }
    for (const [col, isos] of groups) {
      ctx.beginPath();
      for (const iso of isos) { const arr = byIso.get(iso); if (arr) arr.forEach(f => path(f)); }
      ctx.fillStyle = col; ctx.fill();
    }
    if (selected && byIso.has(selected)) {
      ctx.beginPath(); byIso.get(selected).forEach(f => path(f));
      ctx.fillStyle = C.sel; ctx.fill();
    }
    // الحدود
    ctx.beginPath(); path(borders); ctx.strokeStyle = C.landLine; ctx.lineWidth = 0.55; ctx.stroke();
    if (selected && byIso.has(selected)) {
      ctx.beginPath(); byIso.get(selected).forEach(f => path(f));
      ctx.strokeStyle = C.visitedLine; ctx.lineWidth = 1.4; ctx.stroke();
    }
    // حافة الكرة
    ctx.beginPath(); path({ type: 'Sphere' }); ctx.strokeStyle = C.rim; ctx.lineWidth = 1; ctx.stroke();
    // المدن
    const center = [-rot[0], -rot[1]];
    const dr = Math.max(2.6, Math.min(5, 2.2 + k * 0.5));
    for (const d of dots) {
      if (geoDistance(d.c, center) > 1.53) continue;
      const p = proj(d.c); if (!p) continue;
      ctx.beginPath(); ctx.arc(p[0], p[1], dr, 0, 7);
      ctx.fillStyle = C.dot; ctx.fill(); ctx.lineWidth = 1.3; ctx.strokeStyle = C.dotRing; ctx.stroke();
    }
    // البيت
    if (home && geoDistance(home, center) < 1.53) {
      const p = proj(home);
      ctx.beginPath(); ctx.arc(p[0], p[1], dr + 4, 0, 7); ctx.fillStyle = C.halo; ctx.fill();
      ctx.beginPath(); ctx.arc(p[0], p[1], dr + 0.6, 0, 7); ctx.fillStyle = C.dotRing; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = C.visitedLine; ctx.stroke();
    }
    canvas.setAttribute('aria-label', 'globe');
  }

  function tick() {
    if (running) return;
    running = true; lastT = performance.now();
    requestAnimationFrame(frame);
  }
  function frame(t) {
    const dt = Math.min(64, t - lastT); lastT = t;
    let busy = false;
    if (anim) {
      const u = Math.min(1, (t - anim.t0) / anim.dur), e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      rot = [anim.r0[0] + (anim.r1[0] - anim.r0[0]) * e, anim.r0[1] + (anim.r1[1] - anim.r0[1]) * e, 0];
      k = anim.k0 + (anim.k1 - anim.k0) * e;
      dirty = true; busy = u < 1; if (!busy) anim = null;
    } else if (vel) {
      rot[0] += vel[0] * dt; rot[1] = clampLat(rot[1] + vel[1] * dt);
      const f = Math.pow(0.94, dt / 16); vel[0] *= f; vel[1] *= f;
      dirty = true; busy = Math.hypot(vel[0], vel[1]) > 0.002; if (!busy) vel = null;
    } else if (spinOn && !paused && !reduce.matches && !pointers.size && t - lastInteract > IDLE) {
      rot[0] += SPIN * dt / 1000; dirty = true; busy = true;
    } else if (spinOn && !paused && !reduce.matches) {
      busy = true; // ننتظر انتهاء فترة الخمول
    }
    if (dirty) { draw(); dirty = false; }
    if (busy && !document.hidden) requestAnimationFrame(frame); else running = false;
  }
  const clampLat = v => Math.max(-85, Math.min(85, v));

  /* ---------- اللمس ---------- */
  const pointers = new Map();
  let start = null, pinch = null, lastMove = null;
  function bind() {
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', e => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      anim = null; vel = null; lastInteract = performance.now();
      if (pointers.size === 1) { start = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false }; lastMove = { x: e.clientX, y: e.clientY, t: performance.now() }; }
      if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), k }; if (start) start.moved = true; }
    });
    canvas.addEventListener('pointermove', e => {
      if (!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      lastInteract = performance.now();
      if (pointers.size === 2 && pinch) {
        const [a, b] = [...pointers.values()];
        k = Math.max(0.8, Math.min(12, pinch.k * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d));
        dirty = true; tick(); return;
      }
      if (pointers.size !== 1) return;
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) start.moved = true;
      const deg = 180 / (Math.PI * R0 * k);
      const dx = e.clientX - prev[0], dy = e.clientY - prev[1];
      rot[0] += dx * deg; rot[1] = clampLat(rot[1] - dy * deg);
      const now = performance.now(), dtm = Math.max(1, now - lastMove.t);
      vel = null; lastMove.vx = (e.clientX - lastMove.x) * deg / dtm; lastMove.vy = -(e.clientY - lastMove.y) * deg / dtm;
      lastMove.x = e.clientX; lastMove.y = e.clientY; lastMove.t = now;
      dirty = true; tick();
    });
    const up = e => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 0 && start) {
        const dur = performance.now() - start.t;
        if (!start.moved && dur < 450) tapAt(e.clientX, e.clientY);
        else if (lastMove && performance.now() - lastMove.t < 60 && !reduce.matches && lastMove.vx !== undefined) {
          vel = [lastMove.vx, lastMove.vy]; tick();
        }
        start = null;
      }
      lastInteract = performance.now(); tick();
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', e => {
      e.preventDefault(); lastInteract = performance.now();
      k = Math.max(0.8, Math.min(12, k * Math.exp(-e.deltaY * 0.0016)));
      dirty = true; tick();
    }, { passive: false });
    canvas.addEventListener('dblclick', e => { e.preventDefault(); zoomTo(k < 2.5 ? k * 2.2 : 1); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { dirty = true; tick(); } });
    reduce.addEventListener && reduce.addEventListener('change', tick);
  }

  function hit(lonlat) {
    const [lon, lat] = lonlat;
    for (const f of feats) {
      const b = f.b, wraps = b[0][0] > b[1][0];
      if (lat < b[0][1] - .01 || lat > b[1][1] + .01) continue;
      if (!wraps && (lon < b[0][0] - .01 || lon > b[1][0] + .01)) continue;
      if (wraps && lon < b[0][0] && lon > b[1][0]) continue;
      if (geoContains(f, lonlat)) return f.properties.i;
    }
    return null;
  }
  function tapAt(x, y) {
    const r = canvas.getBoundingClientRect();
    const px = x - r.left, py = y - r.top;
    if (Math.hypot(px - W / 2, py - H / 2) > R0 * k) { onTap(null); return; }
    setup();
    const ll = proj.invert([px, py]);
    onTap(ll ? hit(ll) : null, ll);
  }

  function flyTo(lon, lat, kTo) {
    const r0 = rot.slice();
    let target = -lon;
    while (target - r0[0] > 180) target -= 360;
    while (target - r0[0] < -180) target += 360;
    const r1 = [target, clampLat(-lat), 0];
    const d = Math.hypot(r1[0] - r0[0], r1[1] - r0[1]);
    anim = { t0: performance.now(), dur: reduce.matches ? 1 : Math.max(500, Math.min(1400, d * 9)), r0, r1, k0: k, k1: kTo || k };
    vel = null; lastInteract = performance.now(); tick();
  }
  function zoomTo(kTo) { anim = { t0: performance.now(), dur: reduce.matches ? 1 : 450, r0: rot.slice(), r1: rot.slice(), k0: k, k1: kTo }; tick(); }
  function zoomForIso(iso) {
    const arr = byIso.get(iso); if (!arr) return 1.6;
    let best = arr[0], ext = 0;
    for (const f of arr) { const b = f.b; const w = (b[1][0] - b[0][0] + 360) % 360 || 1, h = b[1][1] - b[0][1]; if (w * h > ext) { ext = w * h; best = f; } }
    const b = best.b, w = Math.max((b[1][0] - b[0][0] + 360) % 360, b[1][1] - b[0][1], 0.5);
    return Math.max(1.2, Math.min(9, 55 / w));
  }

  return {
    init, readColors, flyTo, zoomTo, zoomForIso,
    setStates(m) { states = m; dirty = true; tick(); },
    setSelected(iso) { selected = iso; dirty = true; tick(); },
    setHome(ll) { home = ll; dirty = true; tick(); },
    setDots(arr) { dots = arr; dirty = true; tick(); },
    setSpin(on) { spinOn = on; lastInteract = performance.now(); tick(); },
    pause(p) { paused = p; if (!p) { lastInteract = performance.now(); dirty = true; tick(); } },
    redraw() { resize(); },
    get zoom() { return k; }
  };
})();
