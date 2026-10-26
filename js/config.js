'use strict';
window.X = window.X || {};

// Versión da app. Ao publicar unha versión nova, cambiala aquí e en version.json:
// os usuarios que teñan a app aberta verán o aviso "Hai unha versión nova".
X.VERSION = '2.0.5';

// Proxectos de Supabase. As claves "publishable" son públicas: poden ir na app.
// (A clave service_role NUNCA debe ir aquí.)
X.ENTORNOS = {
  app: { nome: 'app', url: 'https://zvjtbcjfuezaoxoihkch.supabase.co', clave: 'sb_publishable_bih5YLh2JN2nzw3_8H1_mw_AZMa5Zfo' },
  test: { nome: 'test', url: 'https://naztyuxboqybjnboifzo.supabase.co', clave: 'sb_publishable_uRQ4vpkVtKp1XjT8fOZu7g_3qkvafFA' },
};

// Test en local (localhost) ou se se abre con ?test=1 (lémbrase ata abrir con ?test=0)
X.entorno = (() => {
  const q = new URLSearchParams(location.search).get('test');
  if (q === '1') localStorage.setItem('xunguir.entornoTest', '1');
  if (q === '0') localStorage.removeItem('xunguir.entornoTest');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  return local || localStorage.getItem('xunguir.entornoTest') === '1' ? X.ENTORNOS.test : X.ENTORNOS.app;
})();

// Datos de quen ofrece a app, para o aviso legal e a política de privacidade.
// Cubrir antes de abrir a app a máis usuarios.
X.TITULAR = {
  nome: '[Nombre y apellidos o razón social]',
  nif: '[NIF]',
  correo: '[correo de contacto]',
  localidade: '[Localidad, provincia]',
};
