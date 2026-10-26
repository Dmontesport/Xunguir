'use strict';

// Configuración: conta, idioma, avisos, especies, razas, copias e textos legais
X.vConfig = (() => {
  const u = X.u, ui = X.ui, D = X.datos;
  const t = (...a) => X.t(...a);

  function estadoSync() {
    const s = X.sync.st;
    if (!X.nube.sesion()) return `<p class="estado-sync pendente">${ui.ic('cloudOff')} ${t('senConexionConta')}</p>`;
    const txt = { ok: t('syncOk', { h: s.ultima ? s.ultima.toLocaleTimeString(X.lang === 'es' ? 'es-ES' : 'gl-ES', { hour: '2-digit', minute: '2-digit' }) : '' }), pendente: t('syncPendente'), sincronizando: t('syncEnCurso'), erro: t('syncErro', { msg: s.msg }), local: t('syncLocal') }[s.estado];
    return `<p class="estado-sync ${s.estado}">${ui.ic(s.estado === 'erro' ? 'alert' : 'cloud')} ${u.esc(txt)}</p>`;
  }

  function render(main) {
    const av = D.config().avisos;
    const especies = D.lista('especies').sort(u.porNome);
    const usos = id => D.lista('animais').filter(a => a.especieId === id).length;
    const correo = X.nube.correo() || localStorage.getItem('xunguir.ultimoCorreo') || '';

    main.innerHTML = `<div class="config">
      <h1>${t('configuracion')}</h1>

      <section class="tarxeta-config">
        <h2>${t('minaConta')}${X.nube.entorno === 'test' ? ` <span class="chip ambar">${t('probas')}</span>` : ''}</h2>
        <p class="conta-correo">${ui.ic('cloud')} <b>${u.esc(correo)}</b></p>
        ${estadoSync()}
        <div class="botons">
          <button type="button" class="btn" data-accion="sync">${ui.ic('refresh')}<span>${t('syncAgora')}</span></button>
          <button type="button" class="btn" data-accion="cambiar-contrasinal">${t('cambiarContrasinal')}</button>
          <button type="button" class="btn" data-accion="pechar-sesion">${t('pecharSesion')}</button>
        </div>
      </section>

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
          <thead><tr><th></th><th>${t('nome')}</th><th>${t('codigoDib')}</th><th>${t('ciclo')}</th><th>${t('xestacion')}</th><th>${t('pesoAdulto')} ♀/♂</th><th>${t('animais')}</th><th></th></tr></thead>
          <tbody>${especies.map(e => `<tr>
            <td class="ico">${e.icono} ${X.calc.icono({ especieId: e.id, sexo: 'M' })}</td><td>${u.esc(e.nome)}</td>
            <td title="${u.esc(t('dib' + X.razas.codigoEspecie(e)))}"><span class="crotal">${X.razas.codigoEspecie(e)}</span></td><td>${e.ciclo} d</td><td>${e.xestacion} d</td>
            <td>${u.numero(e.pesoAdultoF, 0)} / ${u.numero(e.pesoAdultoM, 0)} kg</td><td>${usos(e.id)}</td>
            <td><button class="btn-icono peq" data-accion="editar-especie" data-id="${e.id}" aria-label="${t('editar')}">${ui.ic('edit')}</button></td></tr>`).join('')}</tbody>
        </table></div>
        <p class="nota">${t('notaEspecies')}</p>
      </section>

      <form class="tarxeta-config" data-form="razas">
        <h2>${t('razas')}</h2>
        <p class="nota">${t('notaRazas')}</p>
        <textarea name="razas" rows="10" spellcheck="false" class="mono">${u.esc(X.razas.lista()
          .map(r => `${r.cod} = ${r.nome}${r.dib ? ` [${r.dib}]` : ''}`).join('\n'))}</textarea>
        <p class="nota">${X.razas.CODIGOS_ESPECIE.map(k => `<b>${k}</b> ${u.esc(t('dib' + k))}`).join(' · ')}</p>
        <div class="botons">${ui.btnGardar()}</div>
      </form>

      <section class="tarxeta-config">
        <h2>${t('copia')}</h2>
        <p class="nota">${t('copiaAxuda')}</p>
        <div class="botons">
          <button class="btn" data-accion="exportar">${ui.ic('download')}<span>${t('exportar')}</span></button>
          <label class="btn">${ui.ic('upload')}<span>${t('importar')}</span><input type="file" data-cambio="importar" hidden></label>
        </div>
      </section>

      <section class="tarxeta-config">
        <h2>${t('legal')}</h2>
        <div class="botons">
          ${['termos', 'privacidade', 'aviso'].map(d => `<button class="btn" data-accion="ver-legal" data-doc="${d}">${t('legal_' + d)}</button>`).join('')}
        </div>
      </section>

      <section class="tarxeta-config perigo">
        <h2>${t('borrarConta')}</h2>
        <p class="nota">${t('borrarContaAxuda')}</p>
        <div class="botons"><button class="btn perigo-texto" data-accion="borrar-conta">${ui.ic('trash')}<span>${t('borrarConta')}</span></button></div>
      </section>
      <p class="version">Xunguir · v${X.VERSION}${X.nube.entorno === 'test' ? ` · ${t('probas')}` : ''}</p>
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

  // Unha raza por liña: "1122 = Rubia Galega [02]" (entre corchetes, o código de especie)
  X.formularios.razas = form => {
    const razas = {}, mal = [];
    String(new FormData(form).get('razas') || '').split('\n').forEach(l => {
      if (!l.trim()) return;
      const m = /^\s*(\d{2,6})\s*[=:\-–—]\s*(.+?)\s*(?:\[\s*(0[1-6])\s*\])?\s*$/.exec(l);
      if (!m) { mal.push(l.trim()); return; }
      // conserva a especie exacta aprendida se non cambiou o código de especie
      const ant = X.razas.info(m[1]), dib = m[3] || null;
      razas[m[1]] = { nome: m[2], dib, especie: ant && ant.dib === dib ? ant.especie || null : null };
    });
    if (mal.length) { ui.toast(t('razasMal', { linea: mal[0] }), 'erro'); return; }
    D.gardarConfig({ razas });
    ui.toast(t('gardado'), 'ok');
  };

  X.formularios['param-parcelas'] = form => {
    const f = new FormData(form);
    D.gardarConfig({ parcelas: { kgHa: Math.max(0, u.num(f.get('kgHa')) || 0), crecHa: Math.max(0, u.num(f.get('crecHa')) || 0) } });
    ui.toast(t('gardado'), 'ok');
  };

  // ---------- Conta ----------
  X.accions['cambiar-contrasinal'] = () => ui.modal.abrir(`<form data-form="cambiar-contrasinal" class="modal-form peq">
    ${ui.cab(t('cambiarContrasinal'))}
    <div class="modal-corpo"><div class="grella-campos">
      ${ui.campo(t('contrasinal'), ui.entrada('c1', '', 'type="password" required minlength="8" autocomplete="new-password" autofocus'), t('minimo8'))}
      ${ui.campo(t('repetirContrasinal'), ui.entrada('c2', '', 'type="password" required minlength="8" autocomplete="new-password"'))}
    </div></div>
    ${ui.pe(`<button type="button" class="btn" data-accion="pechar">${t('cancelar')}</button>${ui.btnGardar()}`)}</form>`);
  X.formularios['cambiar-contrasinal'] = async form => {
    const f = new FormData(form);
    if (f.get('c1') !== f.get('c2')) { ui.toast(t('contrasinaisDistintos'), 'erro'); return; }
    await X.nube.cambiarContrasinal(String(f.get('c1')));
    ui.modal.pechar();
    ui.toast(t('contrasinalGardado'), 'ok');
  };

  // Pechar sesión: primeiro intenta subir o pendente; os datos deste usuario bórranse do dispositivo
  X.accions['pechar-sesion'] = async () => {
    if (D.nPendentes() && navigator.onLine !== false) await X.sync.executar();
    const msg = D.nPendentes() ? t('confSairPendentes', { n: D.nPendentes() }) : t('confSair');
    if (!await ui.confirmar(msg, { aceptar: t('pecharSesion'), perigo: D.nPendentes() > 0 })) return;
    D.borrarLocal();
    await X.fotos.borrarTodo();
    await X.nube.sair();
    location.hash = '';
    location.reload();
  };

  X.accions['borrar-conta'] = async () => {
    if (!await ui.confirmar(t('confBorrarConta'), { aceptar: t('borrarConta'), perigo: true })) return;
    if (!await ui.confirmar(t('confBorrarConta2'), { aceptar: t('borrarDefinitivamente'), perigo: true })) return;
    try {
      await X.nube.borrarConta();
      D.borrarLocal();
      await X.fotos.borrarTodo();
      location.hash = '';
      location.reload();
    } catch (e) { ui.toast(e.message, 'erro'); }
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
    if (!fx) return;
    ui.toast(t('lendoCopia'));
    try {
      const texto = await fx.text();
      el.value = '';
      let copia = null;
      try { copia = JSON.parse(texto); } catch { /* non é JSON */ }
      if (!copia || !copia.datos || !Array.isArray(copia.datos.animais)) throw new Error(t('copiaNonValida'));
      if (!await ui.confirmar(t('confImportar', { n: copia.datos.animais.filter(a => !a.del).length }), { aceptar: t('importar') })) return;
      await X.fotos.importar(copia.fotos);
      D.substituir(D.fusionar(D.estado(), copia.datos));
      D.marcarTodoPendente();
      X.sync.programar(500);
      ui.toast(t('importado'), 'ok');
    } catch (e) { el.value = ''; ui.toast(e.message, 'erro'); }
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
        ${ui.campo(t('iconoFemia'), ui.entrada('icono', e.icono, 'maxlength="4"'), t('axIcono'))}
        ${ui.campo(t('iconoMacho'), ui.entrada('iconoM', e.id ? X.calc.icono({ especieId: e.id, sexo: 'M' }) : e.iconoM, 'maxlength="4"'), t('axIcono'))}
        ${ui.campo(t('codigoDib'), ui.selector('codigoDib', X.razas.CODIGOS_ESPECIE.map(k => [k, `${k} · ${t('dib' + k)}`]), e.id ? X.razas.codigoEspecie(e) : '06'), t('axCodigoDib'))}
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
    const icono = (f.get('icono') || '').trim() || '🐾';
    const e = { ...prev, id, nome: (f.get('nome') || '').trim(), icono, iconoM: (f.get('iconoM') || '').trim() || icono, codigoDib: f.get('codigoDib') || '06' };
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
