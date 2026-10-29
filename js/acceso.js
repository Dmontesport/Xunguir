'use strict';

// Pantallas antes de entrar na app: acceso, crear/cambiar contrasinal, aceptación dos
// textos legais e paso dos datos da versión anterior á conta.
X.acceso = (() => {
  const ui = X.ui, u = X.u;
  const t = (...a) => X.t(...a);
  let seguinte = null; // resolve a pantalla que está esperando

  function pantalla(html) {
    let el = document.getElementById('pantallaAcceso');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pantallaAcceso';
      el.className = 'pantalla-acceso';
      document.body.append(el);
    }
    document.body.classList.add('sen-sesion');
    el.innerHTML = `<div class="acceso-caixa">
      <div class="acceso-marca">${ui.logo()}<h1>Xunguir</h1>${X.nube.entorno === 'test' ? `<span class="chip ambar">${t('probas')}</span>` : ''}</div>
      ${html}
      <div class="acceso-lingua">
        ${[['gl', 'Galego'], ['es', 'Castellano']].map(([l, nome]) =>
          `<button class="enlace ${X.lang === l ? 'activa' : ''}" data-accion="lingua-acceso" data-lingua="${l}">${ui.bandeira(l)}<span>${nome}</span></button>`).join('')}
      </div></div>`;
    const f = el.querySelector('[autofocus]');
    if (f) f.focus();
  }

  function pecharPantalla() {
    const el = document.getElementById('pantallaAcceso');
    if (el) el.remove();
    document.body.classList.remove('sen-sesion');
  }

  function rematar() {
    const r = seguinte;
    seguinte = null;
    if (r) r();
  }

  // ---------- Entrar ----------
  let erroInicial = null, ultimaPantalla = null;

  function htmlEntrar() {
    return `<form data-form="entrar" class="acceso-form">
      <p class="acceso-erro" ${erroInicial ? '' : 'hidden'}>${u.esc(erroInicial || '')}</p>
      ${ui.campo(t('correo'), ui.entrada('correo', localStorage.getItem('xunguir.ultimoCorreo') || '', 'type="email" required autocomplete="username" autofocus'))}
      ${ui.campo(t('contrasinal'), ui.entrada('contrasinal', '', 'type="password" required autocomplete="current-password"'))}
      <button class="btn primario" type="submit">${t('entrar')}</button>
      <button type="button" class="enlace" data-accion="esquecin">${t('esquecinContrasinal')}</button>
    </form>
    <p class="nota">${t('soInvitacion')}</p>`;
  }

  function entrar(erro) {
    erroInicial = erro || null;
    return new Promise(res => { seguinte = res; ultimaPantalla = htmlEntrar; pantalla(htmlEntrar()); });
  }

  X.formularios.entrar = async form => {
    const f = new FormData(form), correo = String(f.get('correo')).trim();
    const erro = form.querySelector('.acceso-erro');
    try {
      await X.nube.entrar(correo, String(f.get('contrasinal')));
      localStorage.setItem('xunguir.ultimoCorreo', correo);
      rematar();
    } catch (e) {
      erro.textContent = e.message;
      erro.hidden = false;
    }
  };

  X.accions.esquecin = async () => {
    const correo = (document.querySelector('#pantallaAcceso [name=correo]') || {}).value;
    if (!correo) { ui.toast(t('ponCorreo'), 'erro'); return; }
    try {
      await X.nube.recuperar(correo.trim());
      ui.toast(t('enviadoRecuperar'), 'ok');
    } catch (e) { ui.toast(e.message, 'erro'); }
  };

  // ---------- Contrasinal (ao aceptar unha invitación ou recuperalo) ----------
  function htmlContrasinal(tipo) {
    return `<h2>${tipo === 'invite' ? t('benvida') : t('novoContrasinal')}</h2>
      ${tipo === 'invite' ? `<p>${t('creaContrasinal')}</p>` : ''}
      <form data-form="contrasinal" class="acceso-form">
        ${ui.campo(t('contrasinal'), ui.entrada('c1', '', 'type="password" required minlength="8" autocomplete="new-password" autofocus'), t('minimo8'))}
        ${ui.campo(t('repetirContrasinal'), ui.entrada('c2', '', 'type="password" required minlength="8" autocomplete="new-password"'))}
        <button class="btn primario" type="submit">${t('gardar')}</button>
      </form>`;
  }

  function pedirContrasinal(tipo) {
    return new Promise(res => { seguinte = res; ultimaPantalla = () => htmlContrasinal(tipo); pantalla(htmlContrasinal(tipo)); });
  }

  X.formularios.contrasinal = async form => {
    const f = new FormData(form);
    if (f.get('c1') !== f.get('c2')) { ui.toast(t('contrasinaisDistintos'), 'erro'); return; }
    try {
      await X.nube.cambiarContrasinal(String(f.get('c1')));
      ui.toast(t('contrasinalGardado'), 'ok');
      rematar();
    } catch (e) { ui.toast(e.message, 'erro'); }
  };

  // ---------- Aceptar os textos legais ----------
  function htmlAceptar() {
    const lig = doc => `<button type="button" class="enlace" data-accion="ver-legal" data-doc="${doc}">${t('legal_' + doc)}</button>`;
    return `<h2>${t('antesDeEmpezar')}</h2>
      <ul class="acceso-lista">
        <li>${t('resumoBeta')}</li>
        <li>${t('resumoEstimacions')}</li>
        <li>${t('resumoDatos')}</li>
      </ul>
      <p class="acceso-ligazons">${lig('termos')} · ${lig('privacidade')} · ${lig('aviso')}</p>
      <form data-form="aceptar" class="acceso-form">
        <label class="check"><input type="checkbox" name="ok" required><span>${t('aceptoTermos')}</span></label>
        <button class="btn primario" type="submit">${t('aceptarEntrar')}</button>
      </form>
      <button type="button" class="enlace" data-accion="sair-acceso">${t('pecharSesion')}</button>`;
  }

  function aceptar() {
    return new Promise(res => { seguinte = res; ultimaPantalla = htmlAceptar; pantalla(htmlAceptar()); });
  }

  X.formularios.aceptar = async () => {
    try { await X.legal.aceptar(); rematar(); }
    catch (e) { ui.toast(e.message, 'erro'); }
  };

  // ---------- Perfil (só a primeira vez; despois cámbiase en Configuración) ----------
  function htmlPerfil() {
    return `<h2>${t('queEres')}</h2>
      <p>${t('axudaPerfil')}</p>
      <div class="opcions-perfil">
        <button type="button" class="opcion-perfil" data-accion="escoller-perfil" data-perfil="granxeiro">
          <span class="opcion-ic">👨‍🌾</span><b>${t('perfil_granxeiro')}</b><small>${t('axudaGranxeiro')}</small></button>
        <button type="button" class="opcion-perfil" data-accion="escoller-perfil" data-perfil="tratante">
          <span class="opcion-ic">🤝</span><b>${t('perfil_tratante')}</b><small>${t('axudaTratante')}</small></button>
      </div>`;
  }

  function pedirPerfil() {
    return new Promise(res => { seguinte = res; ultimaPantalla = htmlPerfil; pantalla(htmlPerfil()); });
  }

  X.accions['escoller-perfil'] = async el => {
    el.disabled = true;
    // Sen conexión queda gardado neste dispositivo e súbese á conta máis tarde
    try { await X.nube.gardarPerfil(el.dataset.perfil); } catch { /* xa se subirá */ }
    rematar();
  };

  X.accions['sair-acceso'] = async () => { await X.nube.sair(); location.reload(); };

  X.accions['lingua-acceso'] = el => {
    X.lang = el.dataset.lingua;
    localStorage.setItem('xunguir.lingua', X.lang);
    document.documentElement.lang = X.lang;
    if (ultimaPantalla) pantalla(ultimaPantalla());
  };

  // ---------- Datos da versión anterior ----------
  async function migrar() {
    const vello = X.datos.estadoVello();
    if (!vello) return;
    const nAn = vello.animais.filter(a => !a.del).length, nPa = vello.parcelas.filter(p => !p.del).length;
    if (!nAn && !nPa) { X.datos.arquivarVello(); return; }
    if (!await ui.confirmar(t('migrarPregunta', { animais: nAn, parcelas: nPa }), { aceptar: t('pasarAConta') })) return;
    X.datos.substituir(X.datos.fusionar(X.datos.estado(), vello));
    X.datos.marcarTodoPendente();
    ui.toast(t('migrando'));
    // As fotos: as que estean neste dispositivo ou no repositorio de GitHub da versión anterior
    for (const a of vello.animais) {
      if (a.foto && await X.fotos.traerDeGitHub(a.foto)) await X.fotos.marcarPendente(a.foto);
    }
    X.datos.arquivarVello();
    X.gh.borrarConf();
    ui.toast(t('migrado'), 'ok');
    X.sync.executar();
  }

  return { entrar, pedirContrasinal, aceptar, pedirPerfil, pecharPantalla, migrar };
})();
