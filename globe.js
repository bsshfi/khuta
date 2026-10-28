/* خُطى — الكرة الأرضية
   طبقتان: صورة الأرض الحقيقية (WebGL، صورة ناسا Blue Marble) وفوقها الحدود والدول المزارة والمدن وخطوط الرحلات (Canvas + d3-geo).
   إذا ما اشتغل WebGL ترجع الكرة للرسم المسطّح الملوّن. */
const Globe = (() => {
  const { geoOrthographic, geoPath, geoGraticule10, geoContains, geoDistance, feature, mesh } = KV;
  let wrap, glc, gl = null, gl2 = false, prog, uni = {}, texReady = false;
  let canvas, ctx, W = 0, H = 0, dpr = 1, R0 = 100, k = 1;
  let rot = [-46.7, -20, 0];
  const proj = geoOrthographic().clipAngle(90).precision(0.6);
  let path, feats = [], byIso = new Map(), borders = null, grat = geoGraticule10();
  let states = new Map(), selected = null, home = null, dots = [], arcs = [];
  let C = {}, dirty = true, running = false, anim = null, vel = null, lastT = 0;
  let onTap = () => {}, spinOn = false, lastInteract = 0, paused = false;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const SPIN = 2.2, IDLE = 7000;
  let sc = 1; // تكبير الخطوط والنقاط عند رسم صورة المشاركة

  function readColors() {
    const s = getComputedStyle(document.documentElement);
    const g = n => s.getPropertyValue(n).trim();
    C = { o1: g('--ocean-1'), o2: g('--ocean-2'), rim: g('--rim'), land: g('--land'), landLine: g('--land-line'),
      grat: g('--grat'), visited: g('--visited'), visitedLine: g('--visited-line'), sel: g('--sel'), homeLand: g('--home-land'),
      dot: g('--dot'), dotRing: g('--dot-ring'), halo: g('--halo') };
    dirty = true; tick();
  }

  /* ---------- WebGL ---------- */
  const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const VS3 = '#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const BODY = `
    vec2 p=(gl_FragCoord.xy-uC)/uR;
    float r2=dot(p,p);
    if(r2>1.0){ OUT=vec4(0.); return; }
    float z=sqrt(1.0-r2);
    float lr=atan(p.x,z), pr=asin(clamp(p.y,-1.,1.));
    float cp=cos(pr), x=cos(lr)*cp, y=sin(lr)*cp, zz=sin(pr);
    float cd=cos(uRot.y), sd=sin(uRot.y);
    float lon=atan(y, x*cd+zz*sd)-uRot.x;
    float lat=asin(clamp(zz*cd-x*sd,-1.,1.));
    vec2 uv=vec2(fract((lon+PI)/(2.*PI)), (PI*.5-lat)/PI);
    SAMPLE
    vec3 n=vec3(p,z);
    vec3 L=normalize(vec3(-.45,.6,.75));
    float dif=max(dot(n,L),0.);
    vec3 col=c*(.68+.5*dif);
    float ocean=smoothstep(.05,.25,c.b-max(c.r,c.g)*.85);
    vec3 h=normalize(L+vec3(0.,0.,1.));
    col+=vec3(1.)*pow(max(dot(n,h),0.),60.)*.35*ocean;
    float rim=pow(1.-z,2.6);
    col=mix(col,vec3(.62,.86,1.),rim*.7);
    float edge=clamp((1.-sqrt(r2))*uR,0.,1.);
    OUT=vec4(col*edge,edge);`;
  const FS1 = 'precision highp float;uniform sampler2D uTex;uniform vec2 uC;uniform float uR;uniform vec2 uRot;const float PI=3.14159265;void main(){' +
    BODY.replace(/OUT/g, 'gl_FragColor').replace('SAMPLE', 'vec3 c=texture2D(uTex,uv).rgb;') + '}';
  const FS3 = '#version 300 es\nprecision highp float;uniform sampler2D uTex;uniform vec2 uC;uniform float uR;uniform vec2 uRot;out vec4 o;const float PI=3.14159265;void main(){' +
    BODY.replace(/OUT/g, 'o').replace('SAMPLE', `vec2 uv2=vec2(fract(uv.x+.5),uv.y);
    vec2 dx=dFdx(uv),dy=dFdy(uv),dx2=dFdx(uv2),dy2=dFdy(uv2);
    if(abs(dx2.x)<abs(dx.x))dx.x=dx2.x; if(abs(dy2.x)<abs(dy.x))dy.x=dy2.x;
    vec3 c=textureGrad(uTex,uv,dx,dy).rgb;`) + '}';

  function setupGL() {
    try {
      const opt = { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: false };
      gl = glc.getContext('webgl2', opt); gl2 = !!gl;
      if (!gl) gl = glc.getContext('webgl', opt) || glc.getContext('experimental-webgl', opt);
      if (!gl) return false;
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, gl2 ? VS3 : VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, gl2 ? FS3 : FS1));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ['uTex', 'uC', 'uR', 'uRot'].forEach(n => { uni[n] = gl.getUniformLocation(prog, n); });
      glc.addEventListener('webglcontextlost', e => { e.preventDefault(); texReady = false; dirty = true; tick(); });
      return true;
    } catch (e) { console.warn('webgl', e); gl = null; return false; }
  }
  function loadTexture(url) {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        let src = img;
        const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        if (img.width > max) { const c = document.createElement('canvas'); c.width = max; c.height = max / 2; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); src = c; }
        const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl2 ? gl.REPEAT : gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        if (gl2) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
        else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.uniform1i(uni.uTex, 0);
        texReady = true; wrap.classList.add('real'); dirty = true; tick();
      } catch (e) { console.warn('texture', e); }
    };
    img.src = url;
  }
  function drawGL() {
    gl.viewport(0, 0, glc.width, glc.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uni.uC, glc.width / 2, glc.height / 2);
    gl.uniform1f(uni.uR, R0 * k * dpr);
    gl.uniform2f(uni.uRot, rot[0] * Math.PI / 180, rot[1] * Math.PI / 180);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function init(el, topo, opts) {
    wrap = el; onTap = opts.onTap || onTap;
    glc = document.createElement('canvas'); glc.className = 'globe-gl'; glc.setAttribute('aria-hidden', 'true');
    canvas = document.createElement('canvas'); canvas.className = 'globe-canvas';
    canvas.setAttribute('role', 'img');
    el.appendChild(glc); el.appendChild(canvas); ctx = canvas.getContext('2d');
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
    if (opts.texture && setupGL()) loadTexture(opts.texture);
    bind();
    lastInteract = performance.now();
  }

  function resize() {
    const r = wrap.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    W = r.width; H = r.height;
    for (const c of [canvas, glc]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); c.style.width = W + 'px'; c.style.height = H + 'px'; }
    R0 = Math.min(W, H) / 2 - 22;
    dirty = true; tick();
  }

  function setup() { proj.scale(R0 * k).translate([W / 2, H / 2]).rotate(rot); }

  function draw() {
    setup();
    const real = gl && texReady;
    if (real) drawGL();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const r = R0 * k, cx = W / 2, cy = H / 2;
    // الغلاف الجوي
    const halo = ctx.createRadialGradient(cx, cy, r * 0.97, cx, cy, r * 1.12);
    halo.addColorStop(0, real ? 'rgba(170,225,255,.75)' : C.halo); halo.addColorStop(1, 'rgba(170,225,255,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, r * 1.13, 0, 7); ctx.arc(cx, cy, r * 0.97, 0, 7, true); ctx.fill('evenodd');
    if (!real) {
      const og = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.42, r * 0.05, cx, cy, r);
      og.addColorStop(0, C.o1); og.addColorStop(1, C.o2);
      ctx.fillStyle = og; ctx.beginPath(); path({ type: 'Sphere' }); ctx.fill();
      ctx.beginPath(); for (const f of feats) if (!states.has(f.properties.i)) path(f);
      ctx.fillStyle = C.land; ctx.fill();
    }
    // خطوط الطول والعرض
    ctx.beginPath(); path(grat); ctx.strokeStyle = real ? 'rgba(255,255,255,.09)' : C.grat; ctx.lineWidth = 0.6; ctx.stroke();
    // الدول المزارة بلون القارة، والبيت
    const groups = new Map();
    for (const [iso, st] of states) {
      const col = st === 'home' ? 'home' : st[0] === '#' ? st : C.visited;
      if (!groups.has(col)) groups.set(col, []);
      groups.get(col).push(iso);
    }
    for (const [col, isos] of groups) {
      ctx.beginPath();
      for (const iso of isos) { const arr = byIso.get(iso); if (arr) arr.forEach(f => path(f)); }
      if (col === 'home') {
        if (real) { ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fill(); ctx.setLineDash([3 * sc, 3 * sc]); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.2 * sc; ctx.stroke(); ctx.setLineDash([]); }
        else { ctx.fillStyle = C.homeLand; ctx.fill(); }
      } else {
        ctx.globalAlpha = real ? 0.62 : 1; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
        if (real) { ctx.strokeStyle = col; ctx.lineWidth = 1.6 * sc; ctx.stroke(); }
      }
    }
    // الحدود
    ctx.beginPath(); path(borders); ctx.strokeStyle = real ? 'rgba(255,255,255,.42)' : C.landLine; ctx.lineWidth = 0.55 * sc; ctx.stroke();
    if (selected && byIso.has(selected)) {
      ctx.beginPath(); byIso.get(selected).forEach(f => path(f));
      ctx.fillStyle = real ? 'rgba(255,210,90,.45)' : C.sel; ctx.fill();
      ctx.strokeStyle = real ? '#fff' : C.visitedLine; ctx.lineWidth = 1.8; ctx.stroke();
    }
    if (!real) { ctx.beginPath(); path({ type: 'Sphere' }); ctx.strokeStyle = C.rim; ctx.lineWidth = 1; ctx.stroke(); }
    // خطوط الرحلات: من مدينة الانطلاق إلى كل وجهة
    if (arcs.length) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(0,40,90,.35)'; ctx.shadowBlur = 4 * sc;
      // الرحلات السابقة: نقاط بيضاء — القادمة: خط متقطع ذهبي
      ctx.setLineDash([0.1, 5.5 * sc]); ctx.lineWidth = 2.6 * sc; ctx.strokeStyle = 'rgba(255,255,255,.95)';
      ctx.beginPath(); for (const a of arcs) if (Array.isArray(a)) path({ type: 'LineString', coordinates: a }); ctx.stroke();
      if (arcs.some(a => !Array.isArray(a))) {
        ctx.setLineDash([7 * sc, 6 * sc]); ctx.lineWidth = 2.4 * sc; ctx.strokeStyle = '#FFD25A';
        ctx.beginPath(); for (const a of arcs) if (!Array.isArray(a)) path({ type: 'LineString', coordinates: a.c }); ctx.stroke();
      }
      ctx.restore();
    }
    // المدن
    const center = [-rot[0], -rot[1]];
    const dr = Math.max(3, Math.min(5.5, 2.6 + k * 0.5)) * sc;
    for (const d of dots) {
      if (geoDistance(d.c, center) > 1.53) continue;
      const p = proj(d.c); if (!p) continue;
      const col = d.col || C.visited;
      if (d.p) { // مدينة رحلة قادمة: حلقة فارغة
        ctx.beginPath(); ctx.arc(p[0], p[1], dr + 1 * sc, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fill();
        ctx.lineWidth = 2.2 * sc; ctx.strokeStyle = '#FFD25A'; ctx.stroke(); continue;
      }
      ctx.beginPath(); ctx.arc(p[0], p[1], dr + 5 * sc, 0, 7); ctx.fillStyle = col; ctx.globalAlpha = 0.3; ctx.fill(); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(p[0], p[1], dr + 1.5 * sc, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(p[0], p[1], dr - 0.6 * sc, 0, 7); ctx.fillStyle = col; ctx.fill();
    }
    // البيت
    if (home && geoDistance(home, center) < 1.53) {
      const p = proj(home);
      ctx.beginPath(); ctx.arc(p[0], p[1], dr + 7 * sc, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
      ctx.beginPath(); ctx.arc(p[0], p[1], dr + 2.5 * sc, 0, 7); ctx.fillStyle = '#12304F'; ctx.fill();
      ctx.lineWidth = 2.2 * sc; ctx.strokeStyle = '#fff'; ctx.stroke();
    }
    canvas.setAttribute('aria-label', 'globe');
  }

  function tick() {
    if (running || !canvas) return;
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
      busy = true;
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

  /* صورة ثابتة للكرة بأي حجم (لبطاقات المشاركة) */
  function snapshot(o) {
    const sv = { W, H, R0, k, rot: rot.slice(), dpr, ctx, sc, states, arcs, dots, home, selected };
    const size = o.size;
    const out = document.createElement('canvas'); out.width = out.height = size;
    const oc = out.getContext('2d');
    W = H = size; dpr = 1; R0 = size / 2; k = o.k || 1; sc = o.scale || 1;
    rot = [-o.center[0], -Math.max(-80, Math.min(80, o.center[1])), 0];
    if (o.data) { states = o.data.states; arcs = o.data.arcs; dots = o.data.dots; home = o.data.home; }
    selected = null;
    const real = gl && texReady;
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = size;
    try {
      if (real) { glc.width = glc.height = size; }
      ctx = tmp.getContext('2d'); path = geoPath(proj, ctx);
      draw();
      if (real) oc.drawImage(glc, 0, 0);
      oc.drawImage(tmp, 0, 0);
    } finally {
      ({ W, H, R0, k, dpr, ctx, sc, states, arcs, dots, home, selected } = sv); rot = sv.rot;
      path = geoPath(proj, ctx);
      resize();
    }
    return out;
  }

  return {
    init, readColors, flyTo, zoomTo, zoomForIso, snapshot,
    get real() { return !!(gl && texReady); },
    get data() { return { states, arcs, dots, home }; },
    setStates(m) { states = m; dirty = true; tick(); },
    setSelected(iso) { selected = iso; dirty = true; tick(); },
    setHome(ll) { home = ll; dirty = true; tick(); },
    setDots(arr) { dots = arr; dirty = true; tick(); },
    setArcs(arr) { arcs = arr; dirty = true; tick(); },
    setSpin(on) { spinOn = on; lastInteract = performance.now(); tick(); },
    pause(p) { paused = p; if (!p) { lastInteract = performance.now(); dirty = true; tick(); } },
    redraw() { resize(); },
    get zoom() { return k; }
  };
})();
