'use strict';

// Lector de identificación do animal, con dous modos:
//  · Cámara: código de barras do DIB. O de abaixo do todo leva: ID/DDMMAAAA SS RRRR
//      ID = ES + 12 cifras (ou UELN de 15 caracteres nos equinos) · data de nacemento
//      SS = 01 macho, 02 femia · RRRR = código de raza
//  · Bastón: lector de crotais electrónicos emparellado por Bluetooth en modo teclado.
//      Escribe o número electrónico 724 + 12 cifras (724 = España), que equivale a ES + 12 cifras.
// A especie non vai no DIB: dedúcese da raza; no chip, "22"/"27" ao comezo indica bovino.
// A raza proponse coa última que se lle puxo a un animal lido desa especie.
X.dib = (() => {
  const ui = X.ui, D = X.datos;
  const t = (...a) => X.t(...a);
  const ZXING = 'https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js';
  const ID = '[A-Z]{2}\\d{12}|\\d{3}[A-Z0-9]{12}';
  const RE_ID = new RegExp(`^(?:${ID})$`);
  const RE_DIB = new RegExp(`^(${ID})\\/(\\d{2})(\\d{2})(\\d{4})(\\d{2})(\\d{2,6})$`);
  const CLAVE_ULTIMA = 'xunguir.especieDib';   // última especie dun animal lido
  const CLAVE_RAZAS = 'xunguir.ultimasRazas';  // { especieId: última raza posta a un animal lido }
  const CLAVE_MODO = 'xunguir.modoLector';     // 'camara' ou 'baston'

  const normalizar = s => String(s || '').toUpperCase().replace(/\s+/g, '');
  const existePorCrotal = id => D.lista('animais').find(a => normalizar(a.crotal) === id);

  function interpretar(texto) {
    const s = normalizar(texto);
    const m = RE_DIB.exec(s);
    if (m) {
      const [, id, dd, mm, aaaa, sx, raza] = m;
      const data = `${aaaa}-${mm}-${dd}`;
      const valida = +mm >= 1 && +mm <= 12 && +dd >= 1 && +dd <= 31 && !isNaN(Date.parse(data));
      return { id, nacemento: valida ? data : null, sexo: sx === '01' ? 'M' : sx === '02' ? 'F' : null, razaCodigo: raza, completo: true };
    }
    // Número electrónico de España (724 + 12 cifras), tal cal o escribe o bastón (pode levar espazos ou guións)
    const dix = s.replace(/[^0-9A-Z]/g, '');
    const e = /^724(\d{12})$/.exec(dix) || (/^\d+$/.test(dix) && /724(\d{12})$/.exec(dix));
    if (e) {
      // Se xa hai un animal gardado co número de 15 cifras (p. ex. un cabalo), respéctase
      const id = existePorCrotal(`724${e[1]}`) ? `724${e[1]}` : `ES${e[1]}`;
      return { id, completo: false, electronico: true, bovino: /^2[27]/.test(e[1]) };
    }
    if (RE_ID.test(dix)) return { id: dix, completo: false };
    return null;
  }

  // Entre varios códigos lidos, prefire o completo (o de abaixo do todo)
  function escoller(textos) {
    const rs = textos.map(interpretar).filter(Boolean);
    return rs.find(r => r.completo) || rs[0] || null;
  }

  // ---------- Descodificador de códigos de barras ----------
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
  let fluxo = null, sesion = 0, parcial = null, temporizadorBaston = null;

  const $m = s => document.querySelector(`#modal ${s}`);
  const modoGardado = () => localStorage.getItem(CLAVE_MODO) === 'baston' ? 'baston' : 'camara';

  function estado(msg, erro = false) {
    const el = $m('.escaner-estado');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('erro', erro);
  }

  function parar() {
    sesion++;
    clearTimeout(temporizadorBaston);
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

  const corpoCamara = () => `
    <div class="escaner"><video playsinline muted autoplay></video><div class="marco"></div>
      <div class="escaner-estado">${t('iniciandoCamara')}</div></div>
    <p class="nota">${t('axudaEscaner')}</p>
    <div class="dib-parcial" hidden></div>
    <div class="botons">
      <label class="btn">${ui.ic('camera')}<span>${t('lerDesdeFoto')}</span>
        <input type="file" accept="image/*" capture="environment" data-cambio="dib-foto" hidden></label>
    </div>`;

  // inputmode="none": o lector escribe aquí coma un teclado, sen que saia o teclado do móbil
  const corpoBaston = () => `
    <div class="baston" data-accion="enfocar-baston">
      <div class="baston-icona">📡</div>
      <p><b>${t('pasaBaston')}</b></p>
      <input class="baston-entrada" inputmode="none" autocomplete="off" autocapitalize="characters" spellcheck="false"
        data-input="baston" placeholder="${t('esperandoLectura')}" aria-label="${t('pasaBaston')}">
      <p class="nota">${t('axudaBaston')}</p>
    </div>`;

  async function abrir(modo = modoGardado()) {
    parar();
    parcial = null;
    localStorage.setItem(CLAVE_MODO, modo);
    const s = sesion;
    ui.modal.abrir(`${ui.cab(t('escanearDib'))}
      <div class="modal-corpo">
        <div class="segmentado modos-lector">
          <label><input type="radio" name="modoLector" value="camara" ${modo === 'camara' ? 'checked' : ''} data-cambio="modo-lector"><span>📷 ${t('modoCamara')}</span></label>
          <label><input type="radio" name="modoLector" value="baston" ${modo === 'baston' ? 'checked' : ''} data-cambio="modo-lector"><span>📡 ${t('modoBaston')}</span></label>
        </div>
        ${modo === 'baston' ? corpoBaston() : corpoCamara()}
        <form data-form="dib-manual" class="dib-manual">
          ${ui.entrada('codigo', '', `placeholder="${t('escribirCodigo')}" autocomplete="off" autocapitalize="characters" spellcheck="false"`)}
          <button class="btn" type="submit">${ui.ic('search')}<span>${t('buscar')}</span></button>
        </form>
      </div>`, { alPechar: parar });

    if (modo === 'baston') { enfocarBaston(); return; }

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

  // ---------- Bastón ----------
  function enfocarBaston() {
    const inp = $m('.baston-entrada');
    if (inp) inp.focus();
  }

  function lerBaston(inp) {
    clearTimeout(temporizadorBaston);
    const valor = inp.value.trim();
    if (!valor) return;
    const r = interpretar(valor);
    inp.value = '';
    if (!r) { ui.toast(t('codigoNonValido'), 'erro'); return; }
    atopado(r);
  }

  // O bastón escribe moi rápido e remata con Intro; se non manda Intro, lese ao parar de escribir
  X.entradas.baston = el => {
    clearTimeout(temporizadorBaston);
    temporizadorBaston = setTimeout(() => lerBaston(el), 400);
  };
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches && e.target.matches('.baston-entrada')) { e.preventDefault(); lerBaston(e.target); }
  });
  // Se o foco sae do campo do bastón (p. ex. un toque na pantalla), volve a el
  document.addEventListener('focusout', e => {
    if (!e.target.matches || !e.target.matches('.baston-entrada')) return;
    setTimeout(() => {
      const a = document.activeElement;
      if (!a || a === document.body || a.closest('.baston')) enfocarBaston();
    }, 50);
  });
  X.accions['enfocar-baston'] = () => enfocarBaston();
  X.cambios['modo-lector'] = el => abrir(el.value);

  // ---------- Especie e raza propostas ----------
  const ultimasRazas = () => { try { return JSON.parse(localStorage.getItem(CLAVE_RAZAS)) || {}; } catch { return {}; } };
  const ultimaRaza = especieId => ultimasRazas()[especieId] || null;

  // Especie: a da raza lida; se o chip di bovino, vacún; se non, a do último animal lido; se non, vacún
  function especieDe(r) {
    const porRaza = r.razaCodigo && X.razas.especieDaRaza(r.razaCodigo);
    if (porRaza) return { id: porRaza.id, segura: true };
    if (r.bovino) {
      const bov = D.obter('especies', 'vacun') || D.lista('especies').find(e => X.razas.codigoEspecie(e) === '02');
      if (bov) return { id: bov.id, segura: true };
    }
    const ultima = localStorage.getItem(CLAVE_ULTIMA);
    const id = D.obter('especies', ultima) ? ultima : D.obter('especies', 'vacun') ? 'vacun' : (D.lista('especies')[0] || {}).id;
    return { id, segura: false };
  }

  // Ao gardar un animal que veu dunha lectura, lembra a súa especie e a raza desa especie
  function lembrar(especieId, raza) {
    if (!especieId) return;
    localStorage.setItem(CLAVE_ULTIMA, especieId);
    if (raza) localStorage.setItem(CLAVE_RAZAS, JSON.stringify({ ...ultimasRazas(), [especieId]: raza }));
  }

  // Se o animal xa existe abre a súa ficha (completando datos baleiros); se non, o alta
  function procesar(r) {
    const lerOutro = { texto: t('lerOutro'), fn: () => abrir() };
    const existe = existePorCrotal(r.id);
    if (existe) {
      const cambios = {};
      if (r.nacemento && !existe.nacemento) cambios.nacemento = r.nacemento;
      if (r.razaCodigo && !existe.razaCodigo) cambios.razaCodigo = r.razaCodigo;
      if (r.razaCodigo && !existe.raza && X.razas.nome(r.razaCodigo)) cambios.raza = X.razas.nome(r.razaCodigo);
      if (Object.keys(cambios).length) {
        D.gardarAnimal({ ...existe, ...cambios });
        ui.toast(t('datosCompletados', { nome: existe.nome }), 'ok', lerOutro);
      } else ui.toast(t('animalAtopado', { nome: existe.nome }), 'ok', lerOutro);
      X.vAnimais.verFicha(existe.id);
      return;
    }
    const esp = especieDe(r);
    // Raza: a que trae o DIB; se non trae, a última que se lle puxo a esta especie
    const razaLida = r.razaCodigo ? X.razas.nome(r.razaCodigo) : null;
    const proposta = !r.razaCodigo ? ultimaRaza(esp.id) : null;
    X.vAnimais.abrirFormulario(null, {
      crotal: r.id, especieId: esp.id, sexo: r.sexo || 'F', nacemento: r.nacemento || null,
      razaCodigo: r.razaCodigo || null, raza: razaLida || proposta, razaProposta: !!proposta, deLectura: true,
    });
    if (!esp.segura) ui.toast(t('comprobaEspecie'), 'aviso');
    else if (!r.completo && !r.electronico) ui.toast(t('soNumero'), 'aviso');
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

  return { abrir, interpretar, normalizar, lembrar, ultimaRaza };
})();
