'use strict';
// Service worker: garda os ficheiros da app para que abra sen conexión.
// Os datos van por outro camiño (dispositivo + Supabase), non se cachean aquí.
const CACHE = 'xunguir-2.0.3';
const FICHEIROS = [
  './', 'index.html', 'manifest.webmanifest', 'css/estilos.css',
  'js/i18n.js', 'js/config.js', 'js/util.js', 'js/datos.js', 'js/calculos.js', 'js/vendor/supabase.js',
  'js/github.js', 'js/nube.js', 'js/fotos.js', 'js/ui.js', 'js/legal.js', 'js/acceso.js', 'js/vista-animais.js', 'js/escaner.js', 'js/grupos.js', 'js/arrastrar.js', 'js/vista-parcelas.js', 'js/vista-config.js', 'js/app.js',
  'icons/icono.svg', 'icons/icono-192.png', 'icons/icono-512.png',
];

self.addEventListener('install', e => {
  // cache: 'reload' → descarga do servidor, non da caché do navegador
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHEIROS.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Primeiro a rede (para ter sempre a última versión) e, se non hai, a caché.
// 'no-cache' fai que o navegador pregunte sempre ao servidor se o ficheiro cambiou
// (GitHub Pages deixa gardar os ficheiros 10 minutos e as actualizacións tardarían en chegar).
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(new Request(e.request, { cache: 'no-cache' }))
      .then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
