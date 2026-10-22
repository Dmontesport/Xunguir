'use strict';

// Lector do DIB (Documento de Identificación Bovina).
// O código de barras de abaixo do todo leva: ID/DDMMAAAA SS RRRR
//   ID = ES + 12 cifras · data de nacemento · SS = 01 macho, 02 femia · RRRR = código de raza
// Usa o lector do propio navegador (Chrome en Android) e, se non o hai, a librería ZXing.
X.dib = (() => {
  const ui = X.ui, D = X.datos;
  const t = (...a) => X.t(...a);
  const ZXING = 'https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js';
  const RE_ID = /^[A-Z]{2}\d{12}$/;
  const RE_DIB = /^([A-Z]{2}\d{12})\/(\d{2})(\d{2})(\d{4})(\d{2})(\d{4})$/;

  const normalizar = s => String(s || '').toUpperCase().replace(/\s+/g, '');

  function interpretar(texto) {
    const s = normalizar(texto);
    const m = RE_DIB.exec(s);
    if (m) {
      const [, id, dd, mm, aaaa, sx, raza] = m;
      const data = `${aaaa}-${mm}-${dd}`;
      const valida = +mm >= 1 && +mm <= 12 && +dd >= 1 && +dd <= 31 && !isNaN(Date.parse(data));
      return { id, nacemento: valida ? data : null, sexo: sx === '01' ? 'M' : sx === '02' ? 'F' : null, razaCodigo: raza, completo: true };
    }
    if (RE_ID.test(s)) return { id: s, completo: false };
    return null;
  }

  // Entre varios códigos lidos, prefire o completo (o de abaixo do todo)
  function escoller(textos) {
    const rs = textos.map(interpretar).filter(Boolean);
    return rs.find(r => r.completo) || rs[0] || null;
  }

  // ---------- Descodificador ----------
  let detectorP = null;

  const cargarZXing = () => window.ZXing ? Promise.resolve() : new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = ZXING;
    s.onload = res;
    s.onerror = () => rej(new Error(t('erroLector')));
    document.head.append(s);
  });

  // Devolve unha función (canvas) => [textos lidos]
  function detector() {
    return detectorP || (detectorP = (async () => {
      if ('BarcodeDetector' in window) {
        try {
          const formatos = await window.BarcodeDetector.getSupportedFormats();
          if (formatos.includes('code_128')) {
            const d = new window.BarcodeDetector({ formats: ['code_128'] });
            return async cv => (await d.detect(cv)).map(b => b.rawValue);
          }
        } catch { /* sen lector nativo */ }
      }
      await cargarZXing();
      const Z = window.ZXing, hints = new Map();
      hints.set(Z.DecodeHintType.TRY_HARDER, true);
      hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.CODE_128]);
      const lector = new Z.MultiFormatReader();
      lector.setHints(hints);
      return async cv => {
        try { return [lector.decodeWithState(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(cv)))).getText()]; }
        catch { return []; }
      };
    })().catch(e => { detectorP = null; throw e; }));
  }

  // Copia (un anaco de) a imaxe ou o vídeo nun canvas. recorte = [x, y, ancho, alto] en fraccións
  function fotograma(fonte, w, h, recorte = [0, 0, 1, 1], maxAncho = 1600) {
    const [rx, ry, rw, rh] = recorte;
    const sw = rw * w, sh = rh * h, esc = Math.min(2, maxAncho / sw);
    const cv = document.createElement('canvas');
    cv.width = Math.round(sw * esc);
    cv.height = Math.round(sh * esc);
    cv.getContext('2d').drawImage(fonte, rx * w, ry * h, sw, sh, 0, 0, cv.width, cv.height);
    return cv;
  }

  // ---------- Pantalla do lector ----------
  let fluxo = null, sesion = 0, parcial = null;

  const $m = s => document.querySelector(`#modal ${s}`);

  function estado(msg, erro = false) {
    const el = $m('.escaner-estado');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('erro', erro);
  }

  function parar() {
    sesion++;
    if (fluxo) { fluxo.getTracks().forEach(p => p.stop()); fluxo = null; }
  }

  function mostrarParcial(r) {
    parcial = r;
    const el = $m('.dib-parcial');
    if (!el) return;
    el.hidden = false;
    el.innerHTML = `<span>${t('atopadoNumero', { id: r.id })}</span>
      <button class="btn peq" data-accion="dib-usar" data-codigo="${r.id}">${t('usarNumero')}</button>`;
  }

  async function abrir() {
    parar();
    parcial = null;
    const s = sesion;
    ui.modal.abrir(`${ui.cab(t('escanearDib'))}
      <div class="modal-corpo">
        <div class="escaner"><video playsinline muted autoplay></video><div class="marco"></div>
          <div class="escaner-estado">${t('iniciandoCamara')}</div></div>
        <p class="nota">${t('axudaEscaner')}</p>
        <div class="dib-parcial" hidden></div>
        <div class="botons">
          <label class="btn">${ui.ic('camera')}<span>${t('lerDesdeFoto')}</span>
            <input type="file" accept="image/*" capture="environment" data-cambio="dib-foto" hidden></label>
        </div>
        <form data-form="dib-manual" class="dib-manual">
          ${ui.entrada('codigo', '', `placeholder="${t('escribirCodigo')}" autocomplete="off" autocapitalize="characters" spellcheck="false"`)}
          <button class="btn" type="submit">${ui.ic('search')}<span>${t('buscar')}</span></button>
        </form>
      </div>`, { alPechar: parar });

    try {
      const det = await detector();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error(t('senCamara'));
      const f = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
      if (s !== sesion) { f.getTracks().forEach(p => p.stop()); return; } // pechouse mentres tanto
      fluxo = f;
      const video = $m('video');
      video.srcObject = f;
      await video.play();
      estado(t('apuntaCodigo'));
      bucle(video, det, s);
    } catch (e) {
      if (s !== sesion) return;
      estado(e.name === 'NotAllowedError' ? t('senPermisoCamara') : e.name === 'NotFoundError' ? t('senCamara') : e.message, true);
    }
  }

  async function bucle(video, det, s) {
    let franxa = false;
    while (s === sesion) {
      if (video.readyState >= 2 && video.videoWidth) {
        // Alterna o fotograma enteiro coa franxa central (onde está o marco)
        const cv = fotograma(video, video.videoWidth, video.videoHeight, franxa ? [0, 0.3, 1, 0.4] : [0, 0, 1, 1]);
        franxa = !franxa;
        const r = escoller(await det(cv));
        if (s !== sesion) return;
        if (r && r.completo) { atopado(r); return; }
        if (r && (!parcial || parcial.id !== r.id)) mostrarParcial(r);
      }
      await new Promise(res => setTimeout(res, 150));
    }
  }

  function atopado(r) {
    parar();
    if (navigator.vibrate) navigator.vibrate(80);
    procesar(r);
  }

  // Se o animal xa existe abre a súa ficha (completando datos baleiros); se non, o alta
  function procesar(r) {
    const razas = D.config().razas || {};
    const existe = D.lista('animais').find(a => normalizar(a.crotal) === r.id);
    if (existe) {
      const cambios = {};
      if (r.nacemento && !existe.nacemento) cambios.nacemento = r.nacemento;
      if (r.razaCodigo && !existe.razaCodigo) cambios.razaCodigo = r.razaCodigo;
      if (r.razaCodigo && !existe.raza && razas[r.razaCodigo]) cambios.raza = razas[r.razaCodigo];
      if (Object.keys(cambios).length) {
        D.gardarAnimal({ ...existe, ...cambios });
        ui.toast(t('datosCompletados', { nome: existe.nome }), 'ok');
      } else ui.toast(t('animalAtopado', { nome: existe.nome }), 'ok');
      X.vAnimais.verFicha(existe.id);
      return;
    }
    const especieId = D.obter('especies', 'vacun') ? 'vacun' : (D.lista('especies')[0] || {}).id;
    X.vAnimais.abrirFormulario(null, {
      crotal: r.id, especieId, sexo: r.sexo || 'F', nacemento: r.nacemento || null,
      razaCodigo: r.razaCodigo || null, raza: (r.razaCodigo && razas[r.razaCodigo]) || null,
    });
    if (!r.completo) ui.toast(t('soNumero'), 'aviso');
  }

  // ---------- Manexadores ----------
  X.accions['escanear-dib'] = () => abrir();
  X.accions['dib-usar'] = el => { parar(); procesar(interpretar(el.dataset.codigo)); };

  X.formularios['dib-manual'] = form => {
    const r = interpretar(new FormData(form).get('codigo'));
    if (!r) { ui.toast(t('codigoNonValido'), 'erro'); return; }
    parar();
    procesar(r);
  };

  // Foto: proba a imaxe enteira e, se non, por franxas horizontais
  X.cambios['dib-foto'] = async el => {
    const fx = el.files && el.files[0];
    el.value = '';
    if (!fx) return;
    estado(t('lendoFoto'));
    try {
      const det = await detector();
      const img = await createImageBitmap(fx, { imageOrientation: 'from-image' });
      const w = img.width, h = img.height, textos = [...await det(fotograma(img, w, h, undefined, 2400))];
      for (let y = 0; y < 0.95 && !(escoller(textos) || {}).completo; y += 0.06) {
        textos.push(...await det(fotograma(img, w, h, [0, y, 1, Math.min(0.14, 1 - y)], 2400)));
      }
      const r = escoller(textos);
      if (!r) { estado(t('nonSeLeu'), true); return; }
      if (r.completo) atopado(r);
      else { mostrarParcial(r); estado(t('apuntaCodigo')); }
    } catch (e) { estado(e.message, true); }
  };

  return { abrir, interpretar, normalizar };
})();
