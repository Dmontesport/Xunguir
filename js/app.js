'use strict';

// Arranque, cabeceira, navegación e delegación de eventos
X.app = (() => {
  const u = X.u, ui = X.ui;
  const t = (...a) => X.t(...a);
  const $ = s => document.querySelector(s);
  const VISTAS = { animais: () => X.vAnimais, parcelas: () => X.vParcelas, mercado: () => X.vMercado, config: () => X.vConfig };
  let vista = 'animais', listo = false;

  function cabeceira() {
    const av = X.calc.avisos().filter(a => a.nivel !== 'info');
    const nAn = av.filter(a => a.ref.tipo === 'animal').length, nPa = av.length - nAn;
    const ins = n => n ? `<span class="insignia">${n}</span>` : '';
    $('#barra').innerHTML = `
      <a class="marca" href="#animais">${ui.logo()}<span>Xunguir</span></a>
      <div class="navegacion">
        <nav class="pestanas">
          <a href="#animais" class="${vista === 'animais' ? 'activa' : ''}">${t('animais')}${ins(nAn)}</a>
          <a href="#parcelas" class="${vista === 'parcelas' ? 'activa' : ''}">${t('parcelas')}${ins(nPa)}</a>
        </nav>
        <a href="#mercado" class="boton-mercado ${vista === 'mercado' ? 'activa' : ''}">⚖️ <span>${t('mercado')}</span></a>
      </div>
      <div class="accions">
        <button class="btn-icono" id="btnSync" data-accion="sync"></button>
        <button class="btn-icono" id="btnAvisos" data-accion="avisos" aria-label="${t('avisos')}" title="${t('avisos')}">${ui.ic('bell')}${ins(av.length)}</button>
        <a class="btn-icono ${vista === 'config' ? 'activa' : ''}" href="#config" aria-label="${t('configuracion')}" title="${t('configuracion')}">${ui.ic('sliders')}</a>
      </div>`;
    renderSync();
  }

  function renderSync() {
    const b = $('#btnSync');
    if (!b) return;
    const s = X.sync.st;
    const hora = s.ultima ? s.ultima.toLocaleTimeString(X.lang === 'es' ? 'es-ES' : 'gl-ES', { hour: '2-digit', minute: '2-digit' }) : '';
    const m = {
      local: ['cloudOff', t('syncLocal')], pendente: ['cloud', t('syncPendente')], sincronizando: ['refresh', s.msg || t('syncEnCurso')],
      ok: ['cloudOk', t('syncOk', { h: hora })], erro: ['alert', t('syncErro', { msg: s.msg })],
    }[s.estado] || ['cloud', ''];
    b.className = `btn-icono sync-${s.estado}`;
    b.innerHTML = ui.ic(m[0]) + (s.progreso ? `<span class="sync-progreso">${u.esc(s.progreso)}</span>` : '');
    b.title = m[1];
    b.setAttribute('aria-label', m[1]);
  }

  function panelAvisos() {
    const p = $('#panelAvisos'), av = X.calc.avisos();
    p.innerHTML = `<div class="panel-cab"><h3>${t('avisos')}</h3><a href="#config" class="enlace" data-accion="pechar-panel">${t('configurar')}</a></div>
      ${av.length ? `<div class="panel-lista">${av.map(ui.botonAviso).join('')}</div>` : `<p class="todo-ben">${ui.ic('check')} ${t('todoEnOrde')}</p>`}`;
  }

  // Mentres está aberto o selector de ficheiros (importar copia, foto…) non se redebuxa:
  // ao volver á app redebuxaríase e o ficheiro chegaría a un campo que xa non está na pantalla.
  let ficheiroAberto = false, renderPendente = false, temporizadorFicheiro = null;
  function pecharFicheiro() {
    clearTimeout(temporizadorFicheiro);
    if (!ficheiroAberto) return;
    ficheiroAberto = false;
    if (renderPendente) { renderPendente = false; setTimeout(render, 0); }
  }
  document.addEventListener('click', e => {
    if (e.target.matches && e.target.matches('input[type=file]')) ficheiroAberto = true;
  }, true);
  document.addEventListener('change', e => { if (e.target.type === 'file') setTimeout(pecharFicheiro, 0); }, true);
  document.addEventListener('cancel', e => { if (e.target.type === 'file') pecharFicheiro(); }, true);
  // Se o navegador non avisa ao cancelar, libérase un tempo despois de volver á app
  // (xeneroso: se o ficheiro está en Drive, o móbil descárgao antes de entregalo)
  window.addEventListener('focus', () => {
    if (ficheiroAberto) { clearTimeout(temporizadorFicheiro); temporizadorFicheiro = setTimeout(pecharFicheiro, 20000); }
  });

  function render() {
    if (!listo) return;
    if (ficheiroAberto) { renderPendente = true; return; }
    // Conservar o foco (p. ex. no buscador) entre renderizados
    const act = document.activeElement, idFoco = act && act.id && $('#vista').contains(act) ? act.id : null;
    const sel = idFoco && act.selectionStart != null ? [act.selectionStart, act.selectionEnd] : null;
    cabeceira();
    const v = (VISTAS[vista] || VISTAS.animais)();
    v.render($('#vista'));
    X.fotos.hidratar($('#vista'));
    X.fotos.hidratar($('#barra'));
    ui.modal.refrescar();
    if (!$('#panelAvisos').hidden) panelAvisos();
    if (idFoco) {
      const el = document.getElementById(idFoco);
      if (el) { el.focus(); if (sel) try { el.setSelectionRange(sel[0], sel[1]); } catch { /* tipo sen selección */ } }
    }
  }

  function navegar() {
    const h = location.hash.slice(1);
    // Sen pestana na dirección, a de inicio do perfil: tratantes no Mercado, granxeiros en Animais
    const nova = VISTAS[h] ? h : X.nube.perfil() === 'tratante' ? 'mercado' : 'animais';
    if (nova !== vista) window.scrollTo(0, 0);
    vista = nova;
    // O Mercado leva o seu propio color, para que se note que non é a xestión da explotación
    document.body.classList.toggle('modo-mercado', vista === 'mercado');
    $('#panelAvisos').hidden = true;
    render();
  }

  // ---- Accións xerais ----
  X.accions.pechar = () => ui.modal.pechar();
  X.accions.volver = () => { const v = ui.modal.volver; if (v) v(); else ui.modal.pechar(); };
  X.accions.avisos = () => {
    const p = $('#panelAvisos');
    p.hidden = !p.hidden;
    if (!p.hidden) panelAvisos();
  };
  X.accions['pechar-panel'] = el => { $('#panelAvisos').hidden = true; location.hash = el.getAttribute('href'); };
  X.accions.sync = () => {
    if (!X.nube.sesion()) { location.hash = '#config'; return; }
    X.sync.executar();
  };
  X.accions['ir-aviso'] = el => {
    $('#panelAvisos').hidden = true;
    const { tipo, id } = el.dataset;
    if (tipo === 'animal') X.vAnimais.verFicha(id);
    else if (tipo === 'parcela') X.vParcelas.verFicha(id);
    else if (tipo === 'lote') X.vParcelas.verLote(id);
    else if (tipo === 'almacen') {
      ui.modal.pechar();
      if (vista !== 'parcelas') location.hash = '#parcelas';
      setTimeout(() => { const s = $('#almacen'); if (s) s.scrollIntoView({ behavior: 'smooth' }); }, 50);
    }
  };

  function eventos() {
    document.addEventListener('click', e => {
      const panel = $('#panelAvisos');
      if (!panel.hidden && !e.target.closest('#panelAvisos, #btnAvisos')) panel.hidden = true;
      const el = e.target.closest('[data-accion]');
      if (!el || el.disabled) return;
      const fn = X.accions[el.dataset.accion];
      if (!fn) return;
      e.preventDefault();
      fn(el, e);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.matches('article[data-accion], [role=button][data-accion]')) e.target.click();
    });
    document.addEventListener('submit', async e => {
      const f = e.target.closest('form[data-form]');
      if (!f) return;
      e.preventDefault();
      const fn = X.formularios[f.dataset.form];
      if (!fn) return;
      const b = f.querySelector('[type=submit]');
      if (b) b.disabled = true;
      try { await fn(f, e); }
      catch (err) { console.error(err); ui.toast(err.message, 'erro'); }
      finally { if (b) b.disabled = false; }
    });
    document.addEventListener('change', e => {
      const el = e.target.closest('[data-cambio]');
      if (el && X.cambios[el.dataset.cambio]) X.cambios[el.dataset.cambio](el, e);
    });
    document.addEventListener('input', e => {
      const el = e.target.closest('[data-input]');
      if (el && X.entradas[el.dataset.input]) X.entradas[el.dataset.input](el, e);
    });

    const modal = $('#modal');
    modal.addEventListener('click', e => { if (e.target === modal) ui.modal.pechar(); });
    modal.addEventListener('close', () => { ui.modal.limpar(); ui.modal.vista = null; ui.modal.volver = null; });

    // Deslizar co dedo entre Animais e Parcelas (só esas dúas pestanas)
    const PESTANAS_DESLIZAR = ['animais', 'parcelas'];
    let toque = null;
    $('#vista').addEventListener('touchstart', e => {
      const t0 = e.touches[0];
      // Non cando hai máis dun dedo, nin en zonas que xa se desprazan de lado ou en campos de texto
      if (e.touches.length !== 1 || !PESTANAS_DESLIZAR.includes(vista)
        || e.target.closest('.filtros, .tira-avisos, .taboa-scroll, .alpacas, input, textarea, select')) { toque = null; return; }
      toque = { x: t0.clientX, y: t0.clientY, t: Date.now() };
    }, { passive: true });
    $('#vista').addEventListener('touchend', e => {
      if (!toque || document.body.classList.contains('modo-arrastre') || $('#modal').open) { toque = null; return; }
      const t1 = e.changedTouches[0], dx = t1.clientX - toque.x, dy = t1.clientY - toque.y, ms = Date.now() - toque.t;
      toque = null;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2 || ms > 700) return;
      const i = PESTANAS_DESLIZAR.indexOf(vista), seguinte = PESTANAS_DESLIZAR[i + (dx < 0 ? 1 : -1)];
      if (!seguinte) return;
      $('#vista').dataset.entrada = dx < 0 ? 'dereita' : 'esquerda';
      location.hash = '#' + seguinte;
    }, { passive: true });
    $('#vista').addEventListener('animationend', () => { delete $('#vista').dataset.entrada; });

    window.addEventListener('hashchange', navegar);
    window.addEventListener('online', () => X.sync.executar());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') { render(); X.sync.executar(); }
    });
    setInterval(() => { if (document.visibilityState === 'visible') X.sync.executar(); }, 120000);
  }

  // ---- Aviso de versión nova ----
  // Compara a versión desta app con version.json do servidor (ao abrir, ao volver á app e cada 30 min)
  let versionAvisada = false;
  async function comprobarVersion() {
    if (versionAvisada || !location.protocol.startsWith('http')) return;
    try {
      const v = (await (await fetch('version.json', { cache: 'no-store' })).json()).version;
      if (v && v !== X.VERSION) {
        versionAvisada = true;
        const b = $('#avisoVersion');
        b.innerHTML = `<span>${t('novaVersion', { v: u.esc(v) })}</span><button class="btn peq primario" data-accion="actualizar">${t('actualizar')}</button>`;
        b.hidden = false;
      }
    } catch { /* sen conexión */ }
  }
  // Actualizar: novo service worker e caché do modo sen conexión baleira (os datos non se tocan),
  // e recargar. index.html pide cada ficheiro con ?v=versión, así que non se usan copias vellas.
  X.accions.actualizar = async el => {
    el.disabled = true;
    try {
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
    } catch { /* sen service worker */ }
    try { for (const k of await caches.keys()) await caches.delete(k); } catch { /* sen caché */ }
    location.reload();
  };

  async function iniciar() {
    X.lang = localStorage.getItem('xunguir.lingua') || 'gl';
    document.documentElement.lang = X.lang;
    eventos();
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* sen modo sen conexión */ });
    }

    // 1. Sesión: a gardada, ou a que trae unha ligazón de invitación/recuperación; se non, pantalla de acceso.
    //    Sen conexión, segue co último usuario deste dispositivo.
    const enlace = X.nube.enlace;
    let sesion = await X.nube.iniciar();
    const offline = !sesion && navigator.onLine === false && X.nube.uidSenConexion();
    if (!sesion && !offline) {
      await X.acceso.entrar(enlace.erro ? t('enlaceCaducado') : null);
      sesion = X.nube.sesion();
    } else if (sesion && (enlace.tipo === 'invite' || enlace.tipo === 'recovery')) {
      await X.acceso.pedirContrasinal(enlace.tipo);
    }

    // 2. Textos legais aceptados na versión actual
    if (!await X.legal.aceptado().catch(() => !!offline)) await X.acceso.aceptar();

    // 3. A primeira vez: granxeiro ou tratante (decide a pestana coa que se abre)
    if (!X.nube.perfil()) await X.acceso.pedirPerfil();
    X.acceso.pecharPantalla();

    // 4. Datos deste usuario
    X.datos.cargar(X.nube.uid() || X.nube.uidSenConexion());
    X.datos.engadirEspeciesNovas();
    listo = true;
    navegar();
    X.sync.executar();
    await X.acceso.migrar();

    comprobarVersion();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') comprobarVersion(); });
    setInterval(comprobarVersion, 30 * 60000);
  }

  document.addEventListener('DOMContentLoaded', iniciar);

  return { render, renderSync };
})();
