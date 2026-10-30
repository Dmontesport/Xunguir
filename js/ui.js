'use strict';

// Rexistros de manexadores: data-accion (clic), data-form (envío), data-cambio (change), data-input (input)
X.accions = {};
X.formularios = {};
X.cambios = {};
X.entradas = {};

// Compoñentes comúns da interface
X.ui = (() => {
  const u = X.u;
  const $ = s => document.querySelector(s);

  const P = {
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    cloudOff: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><path d="m3 3 18 18"/>',
    cloudOk: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><path d="m9 13.5 2 2 4-4"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    minus: '<path d="M5 12h14"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 7v10M12 7v10M16 7v10"/>',
  };
  const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  const logo = () => `<svg class="logo" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#3f7d3a"/><path d="M8 28Q32 14 56 28" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M14 26v10a6.5 6.5 0 0 0 13 0V23M37 23v13a6.5 6.5 0 0 0 13 0V26" fill="none" stroke="#f1dca4" stroke-width="4.5" stroke-linecap="round"/></svg>`;

  // Bandeiras dos idiomas (en SVG: Windows non debuxa as bandeiras emoji e Galicia non ten)
  // Icona do Mercado (chama co %, de icons/deal-hot-sale-svgrepo-com.svg) nunha soa cor:
  // o % vai calado (evenodd), así vese o fondo e serve en claro, escuro e no botón activo
  const iconaMercado = (cls = '') => `<svg class="ic-mercado ${cls}" viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M58,35c0,14.82-11.18,26-26,26C16.45,61,6,50.55,6,35A53,53,0,0,1,8.08,19.45,2,2,0,0,1,10,18h0a2,2,0,0,1,1.9,1.37C12,19.6,12.65,21,15,21c4.84,0,5-9.9,5-10a2,2,0,0,1,2.89-1.79A9,9,0,0,0,27,10c2.44,0,4.06-2.39,5-4.46a18.58,18.58,0,0,0,1-3A2,2,0,0,1,35,1h0A2,2,0,0,1,37,2.67C37.68,6.91,40.86,19,46,19c4.12,0,5-3.9,5-4.34A2,2,0,0,1,52.82,13a2,2,0,0,1,2,1.28C58,22.64,58,31.94,58,35Z
    M42.41,30.41,32,40.82l-8.59,8.59a2,2,0,0,1-2.82-2.82L32,35.18l7.59-7.59a2,2,0,0,1,2.82,2.82Z
    M24.5,37A5.5,5.5,0,1,0,19,31.5,5.51,5.51,0,0,0,24.5,37Zm0-7A1.5,1.5,0,1,1,23,31.5,1.5,1.5,0,0,1,24.5,30Z
    M38.5,40A5.5,5.5,0,1,0,44,45.5,5.51,5.51,0,0,0,38.5,40Zm0,7A1.5,1.5,0,1,1,40,45.5,1.5,1.5,0,0,1,38.5,47Z"/></svg>`;

  const BANDEIRAS = {
    gl: '<rect width="30" height="20" fill="#fff"/><path d="M0 0L30 20" stroke="#0d94d2" stroke-width="5.5"/>',
    es: '<rect width="30" height="20" fill="#c60b1e"/><rect y="5" width="30" height="10" fill="#ffc400"/>',
    // Ikurriña
    eu: '<rect width="30" height="20" fill="#d52b1e"/><path d="M0 0L30 20M30 0L0 20" stroke="#009b48" stroke-width="3.2"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="3.2"/>',
    // Senyera
    ca: '<rect width="30" height="20" fill="#fcdd09"/><path d="M0 3.33h30M0 7.78h30M0 12.22h30M0 16.67h30" stroke="#da121a" stroke-width="2.22"/>',
    // Senyera coa franxa azul e a coroa (simplificada)
    va: '<rect width="30" height="20" fill="#fcdd09"/><path d="M0 3.33h30M0 7.78h30M0 12.22h30M0 16.67h30" stroke="#da121a" stroke-width="2.22"/><rect width="8" height="20" fill="#0072ce"/><path d="M1.6 9.5l1 -2.6 1.4 1.6 1.4 -1.6 1 2.6z" fill="#fcdd09"/>',
    // Cruz da Victoria sobre azul (simplificada)
    ast: '<rect width="30" height="20" fill="#0066b3"/><path d="M15 3.5v13M10.8 7.6h8.4" stroke="#fdd116" stroke-width="2"/><path d="M13.8 16.5h2.4M10.8 6.4v2.4M19.2 6.4v2.4" stroke="#fdd116" stroke-width="1.2"/>',
  };
  const bandeira = lingua => `<svg class="bandeira" viewBox="0 0 30 20" aria-hidden="true"><clipPath id="bd-${lingua}"><rect width="30" height="20" rx="2.5"/></clipPath><g clip-path="url(#bd-${lingua})">${BANDEIRAS[lingua]}</g></svg>`;

  // ---- Toasts ----
  function toast(msg, tipo = '', accion = null) {
    const el = document.createElement('div');
    el.className = `toast ${tipo}`;
    el.innerHTML = `<span>${u.esc(msg)}</span>`;
    if (accion) {
      const b = document.createElement('button');
      b.textContent = accion.texto;
      b.onclick = () => { accion.fn(); el.remove(); };
      el.append(b);
    }
    $('#toasts').append(el);
    const ms = accion ? 6000 : 3000;
    setTimeout(() => el.classList.add('sae'), ms);
    setTimeout(() => el.remove(), ms + 400);
  }

  // ---- Modal ----
  // `vista` é unha función que devolve o HTML (para refrescalo cando cambian os datos).
  // Os formularios non levan vista para non perder o que se está a escribir.
  const modal = {
    vista: null,
    volver: null,
    alPechar: null, // p. ex. apagar a cámara ao saír do lector
    limpar() {
      const f = this.alPechar;
      this.alPechar = null;
      if (f) f();
    },
    abrir(html, { vista = null, volver = null, alPechar = null } = {}) {
      this.limpar();
      this.alPechar = alPechar;
      const d = $('#modal');
      d.innerHTML = `<div class="modal-caixa">${html}</div>`;
      this.vista = vista;
      this.volver = volver;
      if (!d.open) d.showModal();
      d.querySelector('.modal-corpo') && (d.querySelector('.modal-corpo').scrollTop = 0);
      X.fotos.hidratar(d);
      const f = d.querySelector('[autofocus]');
      if (f) f.focus();
    },
    mostrar(fnVista, volver = null) {
      const html = fnVista();
      if (html) this.abrir(html, { vista: fnVista, volver });
    },
    pechar() {
      this.limpar();
      const d = $('#modal');
      if (d.open) d.close();
      this.vista = null;
      this.volver = null;
    },
    refrescar() {
      const d = $('#modal');
      if (!this.vista || !d.open) return;
      const html = this.vista();
      if (!html) { this.pechar(); return; }
      const corpo = d.querySelector('.modal-corpo'), sc = corpo ? corpo.scrollTop : 0;
      d.innerHTML = `<div class="modal-caixa">${html}</div>`;
      const c2 = d.querySelector('.modal-corpo');
      if (c2) c2.scrollTop = sc;
      X.fotos.hidratar(d);
    },
  };

  // ---- Confirmación (substitúe a confirm(), que algúns navegadores bloquean) ----
  function confirmar(msg, { aceptar = X.t('aceptar'), perigo = false } = {}) {
    return new Promise(res => {
      const d = $('#confirmar');
      d.innerHTML = `<div class="confirmar-caixa"><p>${u.esc(msg)}</p><div class="botons">
        <button type="button" class="btn" value="non">${X.t('cancelar')}</button>
        <button type="button" class="btn ${perigo ? 'perigo' : 'primario'}" value="si">${aceptar}</button></div></div>`;
      const fin = v => { d.close(); res(v); };
      d.querySelectorAll('button').forEach(b => { b.onclick = e => { e.stopPropagation(); fin(b.value === 'si'); }; });
      d.oncancel = e => { e.preventDefault(); fin(false); };
      d.showModal();
      d.querySelector('button[value=si]').focus();
    });
  }

  // Marca un campo como escrito a man para que as propostas automáticas non o sobrescriban
  X.entradas.manual = el => { el.dataset.manual = el.value ? '1' : ''; };

  // ---- Axudantes de formulario ----
  const cab = (titulo, atras = false) => `<div class="modal-cab">
    ${atras ? `<button type="button" class="btn-icono" data-accion="volver" aria-label="${X.t('volver')}">${ic('back')}</button>` : ''}
    <h2>${titulo}</h2>
    <button type="button" class="btn-icono" data-accion="pechar" aria-label="${X.t('pechar')}">${ic('x')}</button></div>`;

  const campo = (etq, control, axuda = '', cls = '') =>
    `<label class="campo ${cls}"><span class="etq">${etq}</span>${control}${axuda ? `<small class="axuda">${axuda}</small>` : ''}</label>`;
  const entrada = (name, val, attrs = '') => `<input name="${name}" value="${u.esc(val ?? '')}" ${attrs}>`;
  const numero = (name, val, attrs = '') => entrada(name, val, `type="number" inputmode="decimal" step="any" min="0" ${attrs}`);
  const dataInp = (name, val, attrs = '') => entrada(name, val, `type="date" ${attrs}`);
  const selector = (name, opts, val, attrs = '') => `<select name="${name}" ${attrs}>${opts.map(([v, l]) =>
    `<option value="${u.esc(v)}" ${String(v) === String(val ?? '') ? 'selected' : ''}>${u.esc(l)}</option>`).join('')}</select>`;
  const pe = (botons) => `<div class="modal-pe">${botons}</div>`;
  const btnGardar = (txt) => `<button type="submit" class="btn primario">${ic('check')}<span>${txt || X.t('gardar')}</span></button>`;
  const btnCancelar = () => `<button type="button" class="btn" data-accion="volver">${X.t('cancelar')}</button>`;

  // Foto dun animal (ou o emoji da especie se non ten)
  function foto(a) {
    const src = a.foto ? X.fotos.src(a.foto) : '';
    return `<span class="ph s-${a.sexo === 'M' ? 'M' : 'F'}" aria-hidden="true">${X.calc.icono(a)}</span>${a.foto ? `<img data-foto="${u.esc(a.foto)}" ${src ? `src="${src}"` : ''} alt="" draggable="false">` : ''}`;
  }

  const chip = (txt, cls = '') => `<span class="chip ${cls}">${txt}</span>`;

  // Lista de avisos dunha pestana, en forma de tira
  function tiraAvisos(lista, max = 4) {
    if (!lista.length) return '';
    const vis = lista.slice(0, max);
    return `<div class="tira-avisos">${vis.map(botonAviso).join('')}${lista.length > max
      ? `<button class="aviso mais" data-accion="avisos">+${lista.length - max}</button>` : ''}</div>`;
  }

  const botonAviso = a => `<button class="aviso nivel-${a.nivel}" data-accion="ir-aviso" data-tipo="${a.ref.tipo}" data-id="${a.ref.id || ''}">
    <span class="punto"></span><span class="txt"><b>${u.esc(a.texto)}</b>${a.detalle ? `<small>${u.esc(a.detalle)}</small>` : ''}</span></button>`;

  return { ic, logo, iconaMercado, bandeira, toast, modal, confirmar, cab, campo, entrada, numero, dataInp, selector, pe, btnGardar, btnCancelar, foto, chip, tiraAvisos, botonAviso };
})();
