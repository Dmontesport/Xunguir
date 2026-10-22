'use strict';

// Fotos: compresión no navegador, caché en IndexedDB e subida a GitHub
X.fotos = (() => {
  let dbp = null;
  const urls = new Map(), descargas = new Map();

  const db = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('xunguir', 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('fotos');
      r.result.createObjectStore('pendentes');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));

  async function op(store, modo, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const tx = d.transaction(store, modo);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => res(req && req.result);
      tx.onerror = () => rej(tx.error);
    });
  }
  const ler = k => op('fotos', 'readonly', s => s.get(k)).catch(() => null);
  const escribir = (k, v) => op('fotos', 'readwrite', s => s.put(v, k));

  async function comprimir(ficheiro, max = 1000, calidade = 0.8) {
    let img;
    try { img = await createImageBitmap(ficheiro, { imageOrientation: 'from-image' }); }
    catch {
      img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej(new Error(X.t('erroFoto')));
        i.src = URL.createObjectURL(ficheiro);
      });
    }
    const f = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * f);
    c.height = Math.round(img.height * f);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return new Promise(res => c.toBlob(res, 'image/jpeg', calidade));
  }

  // Garda a foto en local, márcaa para subir e devolve a súa ruta
  async function engadir(idAnimal, ficheiro) {
    const blob = await comprimir(ficheiro);
    const r = `fotos/${idAnimal}-${Date.now().toString(36)}.jpg`;
    await escribir(r, blob);
    await op('pendentes', 'readwrite', s => s.put(1, r));
    urls.set(r, URL.createObjectURL(blob));
    return r;
  }

  async function subirPendentes() {
    if (!X.gh.activo()) return;
    const lista = await op('pendentes', 'readonly', s => s.getAllKeys());
    for (const r of lista || []) {
      const blob = await ler(r);
      if (blob) await X.gh.subirFoto(r, blob);
      await op('pendentes', 'readwrite', s => s.delete(r));
    }
  }

  async function url(r) {
    if (urls.has(r)) return urls.get(r);
    let blob = await ler(r);
    if (!blob && X.gh.activo()) {
      if (!descargas.has(r)) descargas.set(r, X.gh.baixarFoto(r));
      try { blob = await descargas.get(r); await escribir(r, blob); }
      catch { descargas.delete(r); return null; }
    }
    if (!blob) return null;
    const u = URL.createObjectURL(blob);
    urls.set(r, u);
    return u;
  }

  const src = r => urls.get(r) || '';

  function hidratar(raiz) {
    raiz.querySelectorAll('img[data-foto]:not([src])').forEach(async img => {
      const u = await url(img.dataset.foto);
      if (u) img.src = u;
    });
  }

  const aDataURL = blob => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });

  // Para a copia de seguridade: { ruta: dataURL }
  async function exportar(rutas) {
    const r = {};
    for (const k of rutas) { const b = await ler(k); if (b) r[k] = await aDataURL(b); }
    return r;
  }

  async function importar(mapa) {
    for (const [k, d] of Object.entries(mapa || {})) {
      const blob = await (await fetch(d)).blob();
      await escribir(k, blob);
      await op('pendentes', 'readwrite', s => s.put(1, k));
    }
  }

  async function borrarTodo() {
    const d = await db().catch(() => null);
    if (d) d.close();
    dbp = null;
    await new Promise(res => { const r = indexedDB.deleteDatabase('xunguir'); r.onsuccess = r.onerror = r.onblocked = () => res(); });
  }

  return { engadir, subirPendentes, url, src, hidratar, exportar, importar, borrarTodo };
})();
