'use strict';

// Conexión con Supabase: contas de usuario, rexistros da explotación e fotos.
// Unha conta = unha explotación: os datos van co identificador do usuario.
X.nube = (() => {
  const t = (...a) => X.t(...a);
  const cfg = X.entorno;

  // Antes de crear o cliente: as ligazóns de invitación ou de recuperar o contrasinal
  // chegan con "#...type=invite|recovery" (ou cun erro se caducaron)
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const enlace = {
    tipo: hash.get('type'),                                  // 'invite', 'recovery', 'signup'…
    erro: hash.get('error_description') || hash.get('error') || null,
  };

  const sb = window.supabase.createClient(cfg.url, cfg.clave, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: `xunguir-auth-${cfg.nome}` },
  });

  let sesion = null;
  const CLAVE_UID = `xunguir.uid.${cfg.nome}`;

  // Se unha petición non responde (cobertura moi mala), mellor dar erro e reintentar que quedar esperando
  const limite = (promesa, ms = 30000) => Promise.race([
    promesa, new Promise((_, rej) => setTimeout(() => rej(new Error(t('tempoEsgotado'))), ms)),
  ]);

  async function iniciar() {
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      sesion = data.session;
    } catch { sesion = null; }
    sb.auth.onAuthStateChange((evento, s) => { sesion = s; });
    if (sesion) localStorage.setItem(CLAVE_UID, sesion.user.id);
    // Limpa os restos da ligazón (tokens ou erros) da barra de enderezos
    if (location.hash.includes('access_token') || location.hash.includes('error')) history.replaceState(null, '', location.pathname + location.search);
    return sesion;
  }

  // Sen conexión e sen poder renovar a sesión: seguir co último usuario deste dispositivo
  const uidSenConexion = () => localStorage.getItem(CLAVE_UID);

  async function entrar(correo, contrasinal) {
    const { data, error } = await sb.auth.signInWithPassword({ email: correo, password: contrasinal });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? t('erroCredenciais') : error.message);
    sesion = data.session;
    localStorage.setItem(CLAVE_UID, sesion.user.id);
    return sesion;
  }

  async function sair() {
    try { await sb.auth.signOut(); } catch { /* sen conexión: bórrase igual en local */ }
    sesion = null;
    localStorage.removeItem(CLAVE_UID);
  }

  const redireccion = () => location.origin + location.pathname;

  async function recuperar(correo) {
    const { error } = await sb.auth.resetPasswordForEmail(correo, { redirectTo: redireccion() });
    if (error) throw error;
  }

  async function cambiarContrasinal(contrasinal) {
    const { error } = await sb.auth.updateUser({ password: contrasinal });
    if (error) throw error;
  }

  async function borrarConta() {
    // Primeiro as fotos (o almacenamento non se borra en cascada) e logo a conta
    const uid = sesion.user.id;
    const { data: lista } = await sb.storage.from('fotos').list(`${uid}/fotos`, { limit: 1000 });
    if (lista && lista.length) await sb.storage.from('fotos').remove(lista.map(f => `${uid}/fotos/${f.name}`));
    const { error } = await sb.rpc('borrar_conta');
    if (error) throw error;
    await sair();
  }

  // ---------- Aceptación dos textos legais ----------
  async function aceptacions(version) {
    const { data, error } = await sb.from('aceptacions').select('documento').eq('version', version);
    if (error) throw error;
    return data.map(d => d.documento);
  }

  async function aceptar(documentos, version) {
    const { error } = await sb.from('aceptacions').upsert(documentos.map(documento => ({ usuario: sesion.user.id, documento, version })));
    if (error) throw error;
  }

  // ---------- Rexistros ----------
  async function subir(filas) {
    const uid = sesion.user.id;
    for (let i = 0; i < filas.length; i += 200) {
      const anaco = filas.slice(i, i + 200);
      const { error } = await limite(sb.from('rexistros').upsert(anaco.map(f => ({ explotacion: uid, ...f })), { onConflict: 'explotacion,coleccion,id' }));
      if (error) throw error;
      X.datos.confirmarSubidos(anaco);
    }
  }

  // Descarga o que cambiou no servidor desde a última vez (con 5 s de marxe
  // para non perder escrituras que se confirmaron case ao mesmo tempo)
  async function baixar() {
    const ultima = X.datos.ultimaSync();
    let desde = ultima ? new Date(new Date(ultima).getTime() - 5000).toISOString() : null, primeira = true;
    for (;;) {
      let q = sb.from('rexistros').select('coleccion,id,datos,upd,del,servidor')
        .eq('explotacion', sesion.user.id).order('servidor', { ascending: true }).limit(1000);
      if (desde) q = primeira ? q.gte('servidor', desde) : q.gt('servidor', desde);
      const { data, error } = await limite(q);
      if (error) throw error;
      X.datos.aplicarRemotos(data);
      if (data.length) { desde = data[data.length - 1].servidor; X.datos.gardarUltimaSync(desde); }
      if (data.length < 1000) break;
      primeira = false;
    }
  }

  // ---------- Fotos (cartafol do usuario no depósito "fotos") ----------
  const camiño = ruta => `${sesion.user.id}/${ruta}`;

  async function subirFoto(ruta, blob) {
    const { error } = await limite(sb.storage.from('fotos').upload(camiño(ruta), blob, { upsert: true, contentType: blob.type || 'image/jpeg' }), 60000);
    if (error) throw error;
  }

  async function baixarFoto(ruta) {
    const { data, error } = await limite(sb.storage.from('fotos').download(camiño(ruta)));
    if (error) throw error;
    return data;
  }

  async function borrarFoto(ruta) {
    await sb.storage.from('fotos').remove([camiño(ruta)]);
  }

  return {
    iniciar, entrar, sair, recuperar, cambiarContrasinal, borrarConta, aceptacions, aceptar,
    subir, baixar, subirFoto, baixarFoto, borrarFoto, uidSenConexion,
    enlace, entorno: cfg.nome,
    sesion: () => sesion, uid: () => sesion && sesion.user.id, correo: () => sesion && sesion.user.email,
  };
})();

// Sincronización: sube o que cambiou aquí, baixa o que cambiou noutros dispositivos e as fotos
X.sync = (() => {
  const st = { estado: 'local', msg: '', ultima: null, progreso: null };
  let timer = null, enCurso = false, repetir = false;

  function set(estado, msg = '', progreso = null) {
    st.estado = estado;
    st.msg = msg;
    st.progreso = progreso;
    if (estado === 'ok') st.ultima = new Date();
    if (X.app && X.app.renderSync) X.app.renderSync();
  }

  function programar(ms = 2500) {
    clearTimeout(timer);
    if (!X.nube.sesion()) { set(X.datos.listo() && X.datos.nPendentes() ? 'pendente' : 'local'); return; }
    set('pendente');
    timer = setTimeout(executar, ms);
  }

  async function executar() {
    clearTimeout(timer);
    if (!X.nube.sesion() || !X.datos.listo()) { set(X.datos.listo() && X.datos.nPendentes() ? 'pendente' : 'local'); return; }
    if (enCurso) { repetir = true; return; }
    enCurso = true;
    set('sincronizando');
    try {
      await X.nube.subir(X.datos.cambiosPendentes());
      await X.nube.baixar();
      await X.fotos.subirPendentes((n, tot) => set('sincronizando', X.t('subindoFotos', { n, tot }), `${n}/${tot}`));
      if (X.datos.nPendentes()) repetir = true;
      set('ok');
    } catch (e) {
      console.error(e);
      set(navigator.onLine === false ? 'pendente' : 'erro', e.message);
      timer = setTimeout(executar, 30000); // reintento
    } finally {
      enCurso = false;
      if (repetir) { repetir = false; programar(); }
    }
  }

  return { st, programar, executar };
})();
