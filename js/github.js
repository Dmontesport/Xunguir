'use strict';

// Acceso ao repositorio privado de datos en GitHub (API de contidos)
X.gh = (() => {
  const CLAVE = 'xunguir.github';
  const FICHEIRO = 'xunguir.json';

  const conf = () => { try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch { return {}; } };
  const gardarConf = c => localStorage.setItem(CLAVE, JSON.stringify(c));
  const borrarConf = () => localStorage.removeItem(CLAVE);
  const activo = () => { const c = conf(); return !!(c.owner && c.repo && c.token); };

  const ruta = r => r.split('/').map(encodeURIComponent).join('/');
  const ref = () => { const b = conf().branch; return b ? `?ref=${encodeURIComponent(b)}` : ''; };

  async function api(camiño, { method = 'GET', body, accept } = {}) {
    const c = conf();
    const url = `https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}${camiño}`;
    const headers = {
      Authorization: `Bearer ${c.token}`,
      Accept: accept || 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (body) headers['Content-Type'] = 'application/json';
    return fetch(url, { method, headers, cache: 'no-store', body: body ? JSON.stringify(body) : undefined });
  }

  async function erro(res) {
    let msg = res.statusText;
    try { msg = (await res.json()).message || msg; } catch { /* sen corpo */ }
    const e = new Error(`GitHub ${res.status}: ${msg}`);
    e.status = res.status;
    return e;
  }

  function b64enc(texto) {
    const bytes = new TextEncoder().encode(texto);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  const b64dec = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)));

  const blobB64 = blob => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });

  async function lerDatos() {
    const res = await api(`/contents/${FICHEIRO}${ref()}`);
    if (res.status === 404) return { datos: null, sha: null };
    if (!res.ok) throw await erro(res);
    const j = await res.json();
    let texto;
    if (j.content) texto = b64dec(j.content);
    else { // ficheiros de máis de 1 MB non traen o contido
      const r2 = await api(`/contents/${FICHEIRO}${ref()}`, { accept: 'application/vnd.github.raw' });
      if (!r2.ok) throw await erro(r2);
      texto = await r2.text();
    }
    return { datos: JSON.parse(texto), sha: j.sha };
  }

  async function escribirDatos(datos, sha) {
    const c = conf();
    const body = { message: `Xunguir: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, content: b64enc(JSON.stringify(datos, null, 1)) };
    if (sha) body.sha = sha;
    if (c.branch) body.branch = c.branch;
    const res = await api(`/contents/${FICHEIRO}`, { method: 'PUT', body });
    if (res.status === 409 || res.status === 422) { const e = new Error('conflito'); e.conflito = true; throw e; }
    if (!res.ok) throw await erro(res);
    return (await res.json()).content.sha;
  }

  async function subirFoto(r, blob) {
    const c = conf();
    const body = { message: `Xunguir: foto ${r}`, content: await blobB64(blob) };
    if (c.branch) body.branch = c.branch;
    const res = await api(`/contents/${ruta(r)}`, { method: 'PUT', body });
    if (res.status === 422) return; // xa existe
    if (!res.ok) throw await erro(res);
  }

  async function baixarFoto(r) {
    const res = await api(`/contents/${ruta(r)}${ref()}`, { accept: 'application/vnd.github.raw' });
    if (!res.ok) throw await erro(res);
    return res.blob();
  }

  async function probar() {
    const res = await api('');
    if (!res.ok) throw await erro(res);
    const j = await res.json();
    return { privado: j.private, escritura: !!(j.permissions && j.permissions.push), nome: j.full_name };
  }

  return { conf, gardarConf, borrarConf, activo, lerDatos, escribirDatos, subirFoto, baixarFoto, probar };
})();

// Sincronización: le o remoto, fusiona co local e sobe o resultado se fai falta
X.sync = (() => {
  const st = { estado: 'local', msg: '', ultima: null };
  let timer = null, enCurso = false, repetir = false;

  function set(estado, msg = '') {
    st.estado = estado;
    st.msg = msg;
    if (estado === 'ok') st.ultima = new Date();
    if (X.app && X.app.renderSync) X.app.renderSync();
  }

  function programar(ms = 2500) {
    clearTimeout(timer);
    if (!X.gh.activo()) { set('local'); return; }
    set('pendente');
    timer = setTimeout(executar, ms);
  }

  const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  async function executar() {
    clearTimeout(timer);
    if (!X.gh.activo()) { set('local'); return; }
    if (enCurso) { repetir = true; return; }
    enCurso = true;
    set('sincronizando');
    try {
      let feito = false;
      for (let intento = 0; intento < 3 && !feito; intento++) {
        const { datos: remoto, sha } = await X.gh.lerDatos();
        const local = X.datos.ordenar(X.datos.estado());
        const fus = remoto ? X.datos.fusionar(local, remoto) : X.datos.fusionar(local, {});
        if (!igual(fus, local)) X.datos.substituir(fus);
        const v0 = X.datos.version();
        if (!remoto || !igual(fus, X.datos.ordenar(remoto))) {
          try { await X.gh.escribirDatos(fus, sha); }
          catch (e) { if (e.conflito) continue; throw e; }
        }
        if (X.datos.version() === v0) X.datos.limparSucio(); else repetir = true;
        feito = true;
      }
      if (!feito) throw new Error(X.t('syncConflito'));
      await X.fotos.subirPendentes();
      set('ok');
    } catch (e) {
      console.error(e);
      set(navigator.onLine === false ? 'pendente' : 'erro', e.message);
    } finally {
      enCurso = false;
      if (repetir) { repetir = false; programar(); }
    }
  }

  return { st, programar, executar };
})();
