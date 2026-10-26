/* خُطى — التخزين على الجوال (IndexedDB) والنسخة الاحتياطية (ملف zip)
   كل سجل له معرّف ثابت و updatedAt، والمحذوف يبقى كعلامة (deleted) حتى تعمل المزامنة لاحقاً مع Google Drive
   بنفس شكل النسخة الاحتياطية: data.json + photos/<id>.jpg + thumbs/<id>.jpg */
const DB = (() => {
  const NAME = 'khuta', VER = 1;
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(NAME, VER);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('trips')) d.createObjectStore('trips', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('media')) d.createObjectStore('media', { keyPath: 'id' }).createIndex('trip', 'tripId');
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => { dbp = null; rej(r.error); };
    });
    return dbp;
  }
  function run(store, mode, fn) {
    return open().then(d => new Promise((res, rej) => {
      const t = d.transaction(store, mode), s = t.objectStore(store);
      let out; const r = fn(s);
      if (r && 'onsuccess' in r) r.onsuccess = () => { out = r.result; };
      t.oncomplete = () => res(out);
      t.onerror = t.onabort = () => rej(t.error);
    }));
  }
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10));

  /* ---------- zip بدون ضغط (الصور مضغوطة أصلاً) ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function dosTime(d) {
    return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
  }
  async function makeZip(files, onProgress) {
    const enc = new TextEncoder(), parts = [], central = [], now = dosTime(new Date());
    let offset = 0, i = 0;
    for (const f of files) {
      const nameB = enc.encode(f.name);
      const isStr = typeof f.data === 'string';
      const bytes = isStr ? enc.encode(f.data) : new Uint8Array(await f.data.arrayBuffer());
      const crc = crc32(bytes), size = bytes.length;
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, now.time, true); h.setUint16(12, now.date, true); h.setUint32(14, crc, true);
      h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, nameB.length, true); h.setUint16(28, 0, true);
      parts.push(h.buffer, nameB, isStr ? bytes : f.data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, now.time, true); c.setUint16(14, now.date, true); c.setUint32(16, crc, true); c.setUint32(20, size, true); c.setUint32(24, size, true);
      c.setUint16(28, nameB.length, true); c.setUint32(42, offset, true);
      central.push(c.buffer, nameB);
      offset += 30 + nameB.length + size;
      if (onProgress) onProgress(++i, files.length);
    }
    let cSize = 0; for (const p of central) cSize += p.byteLength;
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, cSize, true); e.setUint32(16, offset, true);
    return new Blob([...parts, ...central, e.buffer], { type: 'application/zip' });
  }
  async function readZip(file) {
    const tailLen = Math.min(file.size, 65557);
    const tail = new DataView(await file.slice(file.size - tailLen).arrayBuffer());
    let eocd = -1;
    for (let i = tailLen - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('not zip');
    const count = tail.getUint16(eocd + 10, true), cSize = tail.getUint32(eocd + 12, true), cOff = tail.getUint32(eocd + 16, true);
    const cd = new DataView(await file.slice(cOff, cOff + cSize).arrayBuffer());
    const dec = new TextDecoder(), out = {};
    let p = 0;
    for (let n = 0; n < count; n++) {
      if (cd.getUint32(p, true) !== 0x02014b50) break;
      const method = cd.getUint16(p + 10, true), size = cd.getUint32(p + 20, true);
      const nl = cd.getUint16(p + 28, true), el = cd.getUint16(p + 30, true), cl = cd.getUint16(p + 32, true);
      const lOff = cd.getUint32(p + 42, true);
      const name = dec.decode(new Uint8Array(cd.buffer, p + 46, nl));
      out[name] = { lOff, size, method };
      p += 46 + nl + el + cl;
    }
    for (const name in out) {
      const o = out[name];
      const lh = new DataView(await file.slice(o.lOff, o.lOff + 30).arrayBuffer());
      const start = o.lOff + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
      out[name] = o.method === 0 ? file.slice(start, start + o.size) : null;
    }
    return out;
  }

  return {
    uid,
    all: store => run(store, 'readonly', s => s.getAll()),
    get: (store, key) => run(store, 'readonly', s => s.get(key)),
    put: (store, val, key) => run(store, 'readwrite', s => key === undefined ? s.put(val) : s.put(val, key)),
    putMany: (store, vals) => run(store, 'readwrite', s => { vals.forEach(v => s.put(v)); }),
    mediaOf: tripId => run('media', 'readonly', s => s.index('trip').getAll(tripId)),
    // ميتاداتا الصور بدون فتح الملفات (لعدّها في القوائم)
    mediaIndex: () => open().then(d => new Promise((res, rej) => {
      const out = [], t = d.transaction('media', 'readonly');
      const req = t.objectStore('media').openCursor();
      req.onsuccess = () => { const c = req.result; if (!c) return; const v = c.value; out.push({ id: v.id, tripId: v.tripId, deleted: !!v.deleted, takenAt: v.takenAt }); c.continue(); };
      t.oncomplete = () => res(out); t.onerror = () => rej(t.error);
    })),
    makeZip, readZip
  };
})();
