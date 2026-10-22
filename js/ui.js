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
  };
  const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  const logo = () => `<svg class="logo" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#3f7d3a"/><path d="M8 28Q32 14 56 28" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M14 26v10a6.5 6.5 0 0 0 13 0V23M37 23v13a6.5 6.5 0 0 0 13 0V26" fill="none" stroke="#f1dca4" stroke-width="4.5" stroke-linecap="round"/></svg>`;

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
    abrir(html, { vista = null, volver = null } = {}) {
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
    const e = X.calc.especie(a);
    const src = a.foto ? X.fotos.src(a.foto) : '';
    return `<span class="ph" aria-hidden="true">${e.icono}</span>${a.foto ? `<img data-foto="${u.esc(a.foto)}" ${src ? `src="${src}"` : ''} alt="">` : ''}`;
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

  return { ic, logo, toast, modal, confirmar, cab, campo, entrada, numero, dataInp, selector, pe, btnGardar, btnCancelar, foto, chip, tiraAvisos, botonAviso };
})();
