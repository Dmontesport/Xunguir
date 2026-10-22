'use strict';

// Configuración: idioma, avisos, especies, GitHub e copias de seguridade
X.vConfig = (() => {
  const u = X.u, ui = X.ui, D = X.datos;
  const t = (...a) => X.t(...a);

  function estadoSync() {
    const s = X.sync.st;
    if (!X.gh.activo()) return `<p class="estado-sync gris">${ui.ic('cloudOff')} ${t('syncLocal')}</p>`;
    const txt = { ok: t('syncOk', { h: s.ultima ? s.ultima.toLocaleTimeString(X.lang === 'es' ? 'es-ES' : 'gl-ES', { hour: '2-digit', minute: '2-digit' }) : '' }), pendente: t('syncPendente'), sincronizando: t('syncEnCurso'), erro: t('syncErro', { msg: s.msg }), local: t('syncLocal') }[s.estado];
    return `<p class="estado-sync ${s.estado}">${ui.ic(s.estado === 'erro' ? 'alert' : 'cloud')} ${u.esc(txt)}</p>`;
  }

  function render(main) {
    const av = D.config().avisos, gh = X.gh.conf();
    const especies = D.lista('especies').sort(u.porNome);
    const usos = id => D.lista('animais').filter(a => a.especieId === id).length;

    main.innerHTML = `<div class="config">
      <h1>${t('configuracion')}</h1>

      <section class="tarxeta-config">
        <h2>${t('idioma')}</h2>
        <div class="segmentado">
          <label><input type="radio" name="lingua" value="gl" ${X.lang === 'gl' ? 'checked' : ''} data-cambio="lingua"><span>Galego</span></label>
          <label><input type="radio" name="lingua" value="es" ${X.lang === 'es' ? 'checked' : ''} data-cambio="lingua"><span>Castellano</span></label>
        </div>
      </section>

      <form class="tarxeta-config" data-form="avisos">
        <h2>${t('avisos')}</h2>
        <div class="grella-campos">
          ${ui.campo(t('cfgCelo'), ui.numero('celo', av.celo, 'step="1" required'), t('dias0'))}
          ${ui.campo(t('cfgParto'), ui.numero('parto', av.parto, 'step="1" required'), t('dias0'))}
          ${ui.campo(t('cfgComida'), ui.numero('comida', av.comida, 'step="1" required'), t('dias0'))}
          ${ui.campo(t('cfgColleita'), ui.numero('colleita', av.colleita, 'step="1" required'), t('dias0'))}
          ${ui.campo(t('cfgAlmacen'), ui.numero('almacenMin', av.almacenMin, 'step="1" required'), t('unidades'))}
        </div>
        <label class="check"><input type="checkbox" name="chea" ${av.chea ? 'checked' : ''}><span>${t('cfgChea')}</span></label>
        <div class="botons">${ui.btnGardar()}</div>
      </form>

      <form class="tarxeta-config" data-form="param-parcelas">
        <h2>${t('parcelas')}</h2>
        <p class="nota">${t('notaParamParcelas')}</p>
        <div class="grella-campos">
          ${ui.campo(t('cfgKgHa'), ui.numero('kgHa', D.config().parcelas.kgHa, 'required'), 'kg/ha')}
          ${ui.campo(t('cfgCrecHa'), ui.numero('crecHa', D.config().parcelas.crecHa, 'required'), `kg/ha/${t('dia')}`)}
        </div>
        <div class="botons">${ui.btnGardar()}</div>
      </form>

      <section class="tarxeta-config">
        <div class="seccion-cab"><h2>${t('especies')}</h2>
          <button class="btn" data-accion="nova-especie">${ui.ic('plus')}<span>${t('novaEspecie')}</span></button></div>
        <div class="taboa-scroll"><table class="taboa">
          <thead><tr><th></th><th>${t('nome')}</th><th>${t('ciclo')}</th><th>${t('xestacion')}</th><th>${t('pesoAdulto')} ♀/♂</th><th>${t('animais')}</th><th></th></tr></thead>
          <tbody>${especies.map(e => `<tr>
            <td class="ico">${e.icono}</td><td>${u.esc(e.nome)}</td><td>${e.ciclo} d</td><td>${e.xestacion} d</td>
            <td>${u.numero(e.pesoAdultoF, 0)} / ${u.numero(e.pesoAdultoM, 0)} kg</td><td>${usos(e.id)}</td>
            <td><button class="btn-icono peq" data-accion="editar-especie" data-id="${e.id}" aria-label="${t('editar')}">${ui.ic('edit')}</button></td></tr>`).join('')}</tbody>
        </table></div>
        <p class="nota">${t('notaEspecies')}</p>
      </section>

      <form class="tarxeta-config" data-form="github">
        <h2>${t('syncTitulo')}</h2>
        ${estadoSync()}
        <p class="nota">${t('syncAxuda')}</p>
        <div class="grella-campos">
          ${ui.campo(t('ghUsuario'), ui.entrada('owner', gh.owner, 'autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="usuario"'))}
          ${ui.campo(t('ghRepo'), ui.entrada('repo', gh.repo, 'autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="xunguir-datos"'))}
          ${ui.campo(t('ghRama'), ui.entrada('branch', gh.branch, 'autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="main"'), t('ghRamaAxuda'))}
          ${ui.campo(t('ghToken'), ui.entrada('token', gh.token, 'type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…"'), t('ghTokenAxuda'))}
        </div>
        <div class="botons">
          ${ui.btnGardar(t('gardarProbar'))}
          ${X.gh.activo() ? `<button type="button" class="btn" data-accion="sync">${ui.ic('refresh')}<span>${t('syncAgora')}</span></button>
            <button type="button" class="btn perigo-texto" data-accion="desconectar">${t('desconectar')}</button>` : ''}
        </div>
      </form>

      <section class="tarxeta-config">
        <h2>${t('copia')}</h2>
        <p class="nota">${t('copiaAxuda')}</p>
        <div class="botons">
          <button class="btn" data-accion="exportar">${ui.ic('download')}<span>${t('exportar')}</span></button>
          <label class="btn">${ui.ic('upload')}<span>${t('importar')}</span><input type="file" accept="application/json,.json" data-cambio="importar" hidden></label>
        </div>
      </section>

      <section class="tarxeta-config perigo">
        <h2>${t('esteDispositivo')}</h2>
        <p class="nota">${t('borrarLocalAxuda')}</p>
        <div class="botons"><button class="btn perigo-texto" data-accion="borrar-local">${ui.ic('trash')}<span>${t('borrarLocal')}</span></button></div>
      </section>
      <p class="version">Xunguir · v1.0</p>
    </div>`;
  }

  // ---------- Manexadores ----------
  X.cambios.lingua = el => {
    X.lang = el.value;
    localStorage.setItem('xunguir.lingua', X.lang);
    document.documentElement.lang = X.lang;
    X.app.render();
  };

  X.formularios.avisos = form => {
    const f = new FormData(form), n = k => Math.max(0, Math.round(u.num(f.get(k)) || 0));
    D.gardarConfig({ avisos: { celo: n('celo'), parto: n('parto'), comida: n('comida'), colleita: n('colleita'), almacenMin: n('almacenMin'), chea: f.get('chea') === 'on' } });
    ui.toast(t('gardado'), 'ok');
  };

  X.formularios['param-parcelas'] = form => {
    const f = new FormData(form);
    D.gardarConfig({ parcelas: { kgHa: Math.max(0, u.num(f.get('kgHa')) || 0), crecHa: Math.max(0, u.num(f.get('crecHa')) || 0) } });
    ui.toast(t('gardado'), 'ok');
  };

  X.formularios.github = async form => {
    const f = new FormData(form), s = k => (f.get(k) || '').toString().trim();
    const conf = { owner: s('owner'), repo: s('repo'), branch: s('branch'), token: s('token') };
    if (!conf.owner || !conf.repo || !conf.token) { ui.toast(t('ghFaltan'), 'erro'); return; }
    X.gh.gardarConf(conf);
    try {
      const r = await X.gh.probar();
      if (!r.escritura) { ui.toast(t('ghSenEscritura'), 'erro'); return; }
      ui.toast(r.privado ? t('ghOk', { repo: r.nome }) : t('ghOkPublico', { repo: r.nome }), r.privado ? 'ok' : 'aviso');
      D.marcarSucio();
      await X.sync.executar();
    } catch (e) {
      ui.toast(e.status === 401 ? t('ghTokenMal') : e.status === 404 ? t('ghNonAtopado') : e.message, 'erro');
    }
    X.app.render();
  };

  X.accions.desconectar = async () => {
    if (!await ui.confirmar(t('confDesconectar'), { aceptar: t('desconectar') })) return;
    X.gh.borrarConf();
    X.sync.programar();
    X.app.render();
  };

  X.accions.exportar = async () => {
    const e = D.estado();
    const rutas = e.animais.filter(a => !a.del && a.foto).map(a => a.foto);
    const copia = { xunguir: 1, exportado: new Date().toISOString(), datos: e, fotos: await X.fotos.exportar(rutas) };
    const blob = new Blob([JSON.stringify(copia)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `xunguir-copia-${u.hoxe()}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  X.cambios.importar = async el => {
    const fx = el.files && el.files[0];
    el.value = '';
    if (!fx) return;
    try {
      const copia = JSON.parse(await fx.text());
      if (!copia || !copia.datos || !Array.isArray(copia.datos.animais)) throw new Error(t('copiaNonValida'));
      if (!await ui.confirmar(t('confImportar', { n: copia.datos.animais.filter(a => !a.del).length }), { aceptar: t('importar') })) return;
      await X.fotos.importar(copia.fotos);
      D.substituir(D.fusionar(D.estado(), copia.datos));
      D.marcarSucio();
      X.sync.programar(500);
      ui.toast(t('importado'), 'ok');
    } catch (e) { ui.toast(e.message, 'erro'); }
  };

  X.accions['borrar-local'] = async () => {
    const aviso = D.sucio() && X.gh.activo() ? t('confBorrarLocalSucio') : X.gh.activo() ? t('confBorrarLocal') : t('confBorrarLocalSenSync');
    if (!await ui.confirmar(aviso, { aceptar: t('borrar'), perigo: true })) return;
    D.borrarLocal();
    await X.fotos.borrarTodo();
    location.reload();
  };

  // ---------- Especies ----------
  const CAMPOS_ESPECIE = [
    ['ciclo', 'ciclo', 'd', 'axCiclo'], ['duracionCelo', 'duracionCelo', 'd', 'axDuracionCelo'],
    ['xestacion', 'xestacion', 'd', ''], ['celoPostParto', 'celoPostParto', 'd', 'axCeloPostParto'],
    ['pubertade', 'pubertade', 'd', 'axPubertade'], ['destete', 'destete', 'd', 'axDestete'],
    ['pesoNac', 'pesoNacemento', 'kg', ''], ['pesoAdultoF', 'pesoAdultoF', 'kg', ''], ['pesoAdultoM', 'pesoAdultoM', 'kg', ''],
    ['mantemento', 'mantemento', '% PV', 'axMantemento'], ['conversion', 'conversion', 'kg/kg', 'axConversion'], ['k', 'velocidadeCrecemento', '', 'axK'],
  ];

  function formEspecie(e) {
    const novo = !e;
    e = e || { ...D.PRESETS[0], id: '', nome: '', icono: '🐾' };
    const usos = e.id ? D.lista('animais').filter(a => a.especieId === e.id).length : 0;
    ui.modal.abrir(`<form data-form="especie" data-id="${e.id}" class="modal-form">
      ${ui.cab(novo ? t('novaEspecie') : u.esc(e.nome))}
      <div class="modal-corpo"><div class="grella-campos">
        ${ui.campo(t('nome') + ' *', ui.entrada('nome', e.nome, 'required'))}
        ${ui.campo(t('icono'), ui.entrada('icono', e.icono, 'maxlength="4"'), t('axIcono'))}
        ${CAMPOS_ESPECIE.map(([k, etq, un, ax]) => ui.campo(`${t(etq)}${un ? ` (${un})` : ''}`, ui.numero(k, e[k], 'required'), ax ? t(ax) : '')).join('')}
      </div></div>
      ${ui.pe(`${!novo ? `<button type="button" class="btn perigo-texto" data-accion="borrar-especie" data-id="${e.id}" ${usos ? `disabled title="${t('especieEnUso')}"` : ''}>${ui.ic('trash')}<span>${t('eliminar')}</span></button>` : ''}
        <span class="espazo"></span><button type="button" class="btn" data-accion="pechar">${t('cancelar')}</button>${ui.btnGardar()}`)}
    </form>`);
  }

  X.accions['nova-especie'] = () => formEspecie(null);
  X.accions['editar-especie'] = el => formEspecie(D.obter('especies', el.dataset.id));
  X.formularios.especie = form => {
    const f = new FormData(form), id = form.dataset.id || u.uid(), prev = D.obter('especies', id) || {};
    const e = { ...prev, id, nome: (f.get('nome') || '').trim(), icono: (f.get('icono') || '').trim() || '🐾' };
    CAMPOS_ESPECIE.forEach(([k]) => { e[k] = u.num(f.get(k)) ?? prev[k]; });
    D.gardar('especies', e);
    ui.modal.pechar();
    ui.toast(t('gardado'), 'ok');
  };
  X.accions['borrar-especie'] = async el => {
    if (!await ui.confirmar(t('confBorrarEspecie'), { aceptar: t('eliminar'), perigo: true })) return;
    D.borrar('especies', el.dataset.id);
    ui.modal.pechar();
  };

  return { render };
})();
