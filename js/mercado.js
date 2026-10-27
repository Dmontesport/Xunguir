'use strict';

// Mercado: anuncios de animais que ven todos os usuarios.
// Está separado da xestión: os anuncios non son os rexistros da explotación (son unha copia
// cos datos que o vendedor quere mostrar) e só se publican desde esta pestana.
X.vMercado = (() => {
  const u = X.u, ui = X.ui, D = X.datos;
  const t = (...a) => X.t(...a);
  const sb = () => X.nube.cliente();
  const POR_PAXINA = 30, MAX_FOTOS = 5, DIAS_CADUCA = 60;

  const ESPECIES = { vacun: '🐄', ovino: '🐑', caprino: '🐐', porcino: '🐖', equino: '🐎', aves: '🐔', outra: '🐾' };
  const DIB_A_ESPECIE = { '01': 'equino', '02': 'vacun', '03': 'porcino', '04': 'ovino', '05': 'aves', '06': 'outra' };
  const CARACTERISTICAS = ['carne', 'leite', 'vida', 'reproducion', 'prenada', 'adsg', 'saneamento', 'electronico', 'dib', 'ecoloxico', 'castrado'];
  const PROVINCIAS = ['A Coruña', 'Lugo', 'Ourense', 'Pontevedra', 'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila',
    'Badajoz', 'Barcelona', 'Burgos', 'Cáceres', 'Cádiz', 'Cantabria', 'Castellón', 'Ceuta', 'Ciudad Real', 'Córdoba', 'Cuenca',
    'Girona', 'Granada', 'Guadalajara', 'Gipuzkoa', 'Huelva', 'Huesca', 'Illes Balears', 'Jaén', 'La Rioja', 'Las Palmas', 'León',
    'Lleida', 'Madrid', 'Málaga', 'Melilla', 'Murcia', 'Navarra', 'Palencia', 'Salamanca', 'Santa Cruz de Tenerife', 'Segovia',
    'Sevilla', 'Soria', 'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid', 'Bizkaia', 'Zamora', 'Zaragoza'];

  const FILTROS_BALEIROS = () => ({ q: '', provincia: '', concello: '', especie: '', raza: '', sexo: '', prezoMin: '', prezoMax: '', idadeMax: '', caracteristicas: [] });
  const st = {
    pestana: 'buscar', filtros: FILTROS_BALEIROS(), orde: 'recentes',
    anuncios: [], meus: [], porId: new Map(), cargando: false, erro: null, mais: false, clave: null, claveMeus: null,
    eu: lerPosicion(),
  };

  // ---------- Utilidades ----------
  function lerPosicion() { try { return JSON.parse(localStorage.getItem('xunguir.posicion')); } catch { return null; } }
  const lembrado = k => { try { return localStorage.getItem(`xunguir.mercado.${k}`) || ''; } catch { return ''; } };
  const lembrar = (k, v) => { try { localStorage.setItem(`xunguir.mercado.${k}`, v || ''); } catch { /* sen almacenamento */ } };

  const urlFoto = ruta => sb().storage.from('mercado').getPublicUrl(ruta).data.publicUrl;
  const nomeEspecie = e => t('esp_' + (ESPECIES[e] ? e : 'outra'));
  const destacado = a => a.destacado_ata && new Date(a.destacado_ata) > new Date();
  const propio = a => a.vendedor === X.nube.uid();

  function distancia(a) {
    if (!st.eu || a.lat == null || a.lon == null) return null;
    const rad = x => x * Math.PI / 180, R = 6371;
    const dLat = rad(a.lat - st.eu.lat), dLon = rad(a.lon - st.eu.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(st.eu.lat)) * Math.cos(rad(a.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function textoPrezo(a) {
    if (a.prezo_tipo === 'convir' || a.prezo == null) return t('aConvir');
    const p = (+a.prezo).toLocaleString(X.lang === 'es' ? 'es-ES' : 'gl-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: a.prezo % 1 ? 2 : 0 });
    if (a.prezo_tipo === 'lote') return `${p} · ${t('oLote')}`;
    return a.cantidade > 1 ? `${p} / ${t('animal')}` : p;
  }

  const textoSexo = s => s === 'F' ? `♀ ${t('femia')}` : s === 'M' ? `♂ ${t('macho')}` : s === 'mixto' ? `⚥ ${t('mixto')}` : '';

  // Posición aproximada do concello (OpenStreetMap). Só se envía "concello, provincia", nunca datos persoais.
  async function xeocodificar(concello, provincia) {
    if (!concello) return null;
    try {
      const q = encodeURIComponent(`${concello}, ${provincia}, España`);
      const r = await X.nube.limite(fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=es&q=${q}`), 7000);
      const j = await r.json();
      return j && j[0] ? { lat: Math.round(+j[0].lat * 100) / 100, lon: Math.round(+j[0].lon * 100) / 100 } : null;
    } catch { return null; }
  }

  // ---------- Cargar anuncios ----------
  const limpar = s => String(s || '').replace(/[,()%*\\]/g, ' ').trim();

  async function cargar(engadir = false) {
    if (!X.nube.sesion()) { st.erro = t('mercadoSenConexion'); X.app.render(); return; }
    st.cargando = true; st.erro = null;
    if (!engadir) X.app.render();
    const f = st.filtros;
    try {
      let q = sb().from('anuncios').select('*').eq('estado', 'activo').gt('caduca', new Date().toISOString());
      if (f.especie) q = q.eq('especie', f.especie);
      if (f.sexo) q = q.eq('sexo', f.sexo);
      if (f.provincia) q = q.eq('provincia', f.provincia);
      if (f.concello) q = q.ilike('concello', `%${limpar(f.concello)}%`);
      if (f.raza) q = q.ilike('raza', `%${limpar(f.raza)}%`);
      if (f.prezoMin !== '') q = q.gte('prezo', +f.prezoMin);
      if (f.prezoMax !== '') q = q.lte('prezo', +f.prezoMax);
      if (f.idadeMax !== '') q = q.gte('nacemento', u.sumar(u.hoxe(), -Math.round(+f.idadeMax * 30.44)));
      if (f.caracteristicas.length) q = q.contains('caracteristicas', f.caracteristicas);
      if (limpar(f.q)) { const x = limpar(f.q); q = q.or(`titulo.ilike.%${x}%,raza.ilike.%${x}%,descricion.ilike.%${x}%,concello.ilike.%${x}%`); }
      // Por proximidade ordénase aquí, cunha tanda máis grande
      if (st.orde === 'prezoAsc') q = q.order('prezo', { ascending: true, nullsFirst: false });
      else if (st.orde === 'prezoDesc') q = q.order('prezo', { ascending: false, nullsFirst: false });
      q = q.order('creado', { ascending: false });
      const desde = engadir ? st.anuncios.length : 0, cantos = st.orde === 'preto' ? 200 : POR_PAXINA;
      const { data, error } = await X.nube.limite(q.range(desde, desde + cantos - 1));
      if (error) throw error;
      data.forEach(a => st.porId.set(a.id, a));
      st.anuncios = engadir ? [...st.anuncios, ...data] : data;
      st.mais = st.orde !== 'preto' && data.length === cantos;
    } catch (e) {
      st.erro = /relation|schema cache|does not exist/i.test(e.message || '') ? t('mercadoSenTaboas') : e.message;
    } finally {
      st.cargando = false;
      X.app.render();
    }
  }

  async function cargarMeus() {
    if (!X.nube.sesion()) return;
    st.cargando = true;
    try {
      const { data, error } = await X.nube.limite(sb().from('anuncios').select('*').eq('vendedor', X.nube.uid()).order('creado', { ascending: false }));
      if (error) throw error;
      data.forEach(a => st.porId.set(a.id, a));
      st.meus = data;
    } catch (e) { st.erro = e.message; }
    finally { st.cargando = false; X.app.render(); }
  }

  const claveBusca = () => JSON.stringify([st.filtros, st.orde]);
  function refrescar() { st.clave = null; st.claveMeus = null; X.app.render(); }

  // ---------- Listado ----------
  // Destacados (premium) primeiro; por proximidade, o máis preto antes
  function ordenados() {
    let l = [...st.anuncios];
    if (st.orde === 'preto') l.sort((a, b) => (distancia(a) ?? 1e9) - (distancia(b) ?? 1e9));
    return l.sort((a, b) => (destacado(b) ? 1 : 0) - (destacado(a) ? 1 : 0));
  }

  function tarxeta(a) {
    const km = distancia(a), foto = a.fotos && a.fotos[0];
    const meta = [ESPECIES[a.especie] ? `${ESPECIES[a.especie]} ${u.esc(a.raza || nomeEspecie(a.especie))}` : u.esc(a.raza || ''),
      textoSexo(a.sexo), a.nacemento ? u.idade(a.nacemento) : '', a.cantidade > 1 ? X.tp('nAnimais', a.cantidade) : ''].filter(Boolean).join(' · ');
    return `<article class="tarxeta-anuncio ${destacado(a) ? 'destacado' : ''} ${a.estado !== 'activo' ? 'inactivo' : ''}" data-accion="ver-anuncio" data-id="${a.id}" tabindex="0">
      <div class="anuncio-foto">${foto ? `<img src="${u.esc(urlFoto(foto))}" alt="" loading="lazy" draggable="false">` : `<span class="ph">${ESPECIES[a.especie] || '🐾'}</span>`}
        ${destacado(a) ? `<span class="selo-destacado">★ ${t('destacado')}</span>` : ''}
        ${a.estado !== 'activo' ? `<span class="cinta">${t('estadoAnuncio_' + a.estado)}</span>` : ''}
        ${a.fotos && a.fotos.length > 1 ? `<span class="n-fotos">📷 ${a.fotos.length}</span>` : ''}</div>
      <div class="info">
        <div class="prezo-anuncio">${textoPrezo(a)}</div>
        <h3>${u.esc(a.titulo)}</h3>
        <div class="sub">${meta}</div>
        <div class="lugar">📍 ${u.esc([a.concello, a.provincia].filter(Boolean).join(', '))}${km != null ? ` · ${t('aKm', { km: Math.round(km) })}` : ''}</div>
      </div>
    </article>`;
  }

  function chipsFiltros() {
    const f = st.filtros, c = [];
    const chip = (campo, txt) => c.push(`<button class="filtro activo" data-accion="quitar-filtro-mercado" data-campo="${campo}">${txt} ✕</button>`);
    if (f.especie) chip('especie', `${ESPECIES[f.especie]} ${nomeEspecie(f.especie)}`);
    if (f.raza) chip('raza', u.esc(f.raza));
    if (f.sexo) chip('sexo', textoSexo(f.sexo));
    if (f.provincia) chip('provincia', `📍 ${u.esc(f.provincia)}`);
    if (f.concello) chip('concello', `📍 ${u.esc(f.concello)}`);
    if (f.prezoMin !== '' || f.prezoMax !== '') chip('prezo', `€ ${f.prezoMin || 0} – ${f.prezoMax || '∞'}`);
    if (f.idadeMax !== '') chip('idadeMax', t('ataMeses', { n: f.idadeMax }));
    f.caracteristicas.forEach(k => c.push(`<button class="filtro activo" data-accion="quitar-caracteristica-mercado" data-valor="${k}">${t('car_' + k)} ✕</button>`));
    return c.join('');
  }

  function render(main) {
    // Cargar só cando cambia a busca ou se entra na pestana (non en cada redebuxado)
    if (st.pestana === 'buscar' && st.clave !== claveBusca() && !st.cargando) { st.clave = claveBusca(); cargar(); }
    if (st.pestana === 'meus' && st.claveMeus !== 'ok' && !st.cargando) { st.claveMeus = 'ok'; cargarMeus(); }

    const nFiltros = Object.entries(st.filtros).filter(([k, v]) => k !== 'q' && (Array.isArray(v) ? v.length : v !== '')).length;
    const lista = st.pestana === 'buscar' ? ordenados() : st.meus;
    let corpo;
    if (st.erro) corpo = `<div class="baleiro"><p>${u.esc(st.erro)}</p><button class="btn" data-accion="recargar-mercado">${ui.ic('refresh')}<span>${t('tentarDeNovo')}</span></button></div>`;
    else if (st.cargando && !lista.length) corpo = `<div class="baleiro"><p>${t('cargandoAnuncios')}</p></div>`;
    else if (!lista.length) corpo = st.pestana === 'buscar'
      ? `<div class="baleiro"><div class="baleiro-ic">🏪</div><p>${nFiltros || st.filtros.q ? t('senAnunciosFiltro') : t('senAnuncios')}</p></div>`
      : `<div class="baleiro"><div class="baleiro-ic">📣</div><p>${t('senMeusAnuncios')}</p>
          <button class="btn primario" data-accion="publicar-anuncio">${ui.ic('plus')}<span>${t('publicarAnuncio')}</span></button></div>`;
    else corpo = `<div class="grella-anuncios">${lista.map(tarxeta).join('')}</div>
      ${st.pestana === 'buscar' && st.mais ? `<div class="botons centro"><button class="btn" data-accion="mais-anuncios" ${st.cargando ? 'disabled' : ''}>${t('cargarMais')}</button></div>` : ''}`;

    main.innerHTML = `<div class="mercado">
      <div class="mercado-cab">
        <h1>🏪 ${t('mercado')}</h1>
        <button class="btn primario" data-accion="publicar-anuncio">${ui.ic('plus')}<span>${t('publicarAnuncio')}</span></button>
      </div>
      <div class="segmentado subpestanas">
        <label><input type="radio" name="pestanaMercado" value="buscar" ${st.pestana === 'buscar' ? 'checked' : ''} data-cambio="pestana-mercado"><span>${ui.ic('search')} ${t('buscar')}</span></label>
        <label><input type="radio" name="pestanaMercado" value="meus" ${st.pestana === 'meus' ? 'checked' : ''} data-cambio="pestana-mercado"><span>📣 ${t('meusAnuncios')}</span></label>
      </div>
      ${st.pestana === 'buscar' ? `
        <form class="ferramentas" data-form="busca-mercado">
          <label class="busca">${ui.ic('search')}<input type="search" name="q" id="buscaMercado" value="${u.esc(st.filtros.q)}" placeholder="${t('buscarMercado')}" enterkeyhint="search"></label>
          <button type="button" class="btn" data-accion="filtros-mercado">⚙ <span>${t('filtros')}</span>${nFiltros ? ` <span class="insignia">${nFiltros}</span>` : ''}</button>
        </form>
        <div class="filtros">
          ${ui.selector('orde', [['recentes', t('ordeRecentes')], ['prezoAsc', t('ordePrezoAsc')], ['prezoDesc', t('ordePrezoDesc')], ['preto', t('ordePreto')]], st.orde, 'data-cambio="orde-mercado" class="selector-orde"')}
          ${chipsFiltros()}
        </div>` : ''}
      ${corpo}
    </div>`;
  }

  // ---------- Ficha dun anuncio ----------
  const fila = (etq, val) => val ? `<div class="fila"><dt>${etq}</dt><dd>${val}</dd></div>` : '';

  function ligazonWhatsapp(a) {
    let n = String(a.telefono || '').replace(/[^\d+]/g, '');
    if (n.startsWith('+')) n = n.slice(1); else if (n.length === 9) n = '34' + n;
    return `https://wa.me/${n}?text=${encodeURIComponent(t('mensaxeWhatsapp', { titulo: a.titulo }))}`;
  }

  function ficha(id) {
    const a = st.porId.get(id);
    if (!a) return null;
    const km = distancia(a), meu = propio(a);
    const caducaEn = Math.ceil((new Date(a.caduca) - new Date()) / 864e5);
    return `${ui.cab(u.esc(a.titulo))}
      <div class="modal-corpo ficha ficha-anuncio">
        ${a.fotos && a.fotos.length ? `<div class="carrusel">${a.fotos.map(f => `<img src="${u.esc(urlFoto(f))}" alt="" loading="lazy">`).join('')}</div>`
          : `<div class="anuncio-foto grande"><span class="ph">${ESPECIES[a.especie] || '🐾'}</span></div>`}
        <div class="prezo-anuncio grande">${textoPrezo(a)}</div>
        ${destacado(a) ? `<span class="selo-destacado estatico">★ ${t('destacado')}</span>` : ''}
        ${a.estado !== 'activo' ? `<p class="estado-repro ambar">${t('estadoAnuncio_' + a.estado)}</p>` : ''}
        ${a.caracteristicas && a.caracteristicas.length ? `<div class="chips">${a.caracteristicas.map(k => ui.chip(t('car_' + k), 'azul')).join('')}</div>` : ''}
        <dl class="datos">
          ${fila(t('especie'), `${ESPECIES[a.especie] || ''} ${nomeEspecie(a.especie)}`)}
          ${fila(t('raza'), u.esc(a.raza || ''))}
          ${fila(t('sexo'), textoSexo(a.sexo))}
          ${fila(t('idade'), a.nacemento ? `${u.idade(a.nacemento)} <small>(${u.data(a.nacemento)})</small>` : '')}
          ${fila(t('pesoAprox'), a.peso ? u.kg(+a.peso) : '')}
          ${fila(t('cantidade'), a.cantidade > 1 ? X.tp('nAnimais', a.cantidade) : '')}
          ${fila(t('ubicacion'), `${u.esc([a.concello, a.provincia].filter(Boolean).join(', '))}${km != null ? ` <small>(${t('aKm', { km: Math.round(km) })})</small>` : ''}`)}
          ${fila(t('vendedor'), u.esc(a.vendedor_nome || ''))}
          ${fila(t('publicado'), u.data(a.creado.slice(0, 10)))}
        </dl>
        ${a.descricion ? `<section class="seccion"><h3>${t('descricion')}</h3><p class="notas">${u.esc(a.descricion)}</p></section>` : ''}
        ${!meu && a.telefono && a.estado === 'activo' ? `<div class="botons contacto">
          <a class="btn primario" href="tel:${u.esc(String(a.telefono).replace(/[^\d+]/g, ''))}">📞 ${t('chamar')}</a>
          ${a.whatsapp ? `<a class="btn whatsapp" href="${u.esc(ligazonWhatsapp(a))}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}
        </div>` : ''}
        ${meu ? `<p class="nota">${caducaEn > 0 ? t('caducaEn', { en: u.enDias(caducaEn) }) : t('caducado')}</p>` : ''}
        <p class="nota">${t('avisoMercado')}</p>
      </div>
      ${ui.pe(meu ? `
          <button class="btn perigo-texto" data-accion="borrar-anuncio" data-id="${a.id}">${ui.ic('trash')}<span>${t('eliminar')}</span></button>
          <span class="espazo"></span>
          ${a.estado === 'activo' ? `<button class="btn" data-accion="estado-anuncio" data-id="${a.id}" data-estado="vendido">✓ ${t('marcarVendidoAnuncio')}</button>
            <button class="btn" data-accion="estado-anuncio" data-id="${a.id}" data-estado="retirado">${t('retirar')}</button>` : ''}
          ${a.estado !== 'oculto' && (a.estado !== 'activo' || caducaEn < 15) ? `<button class="btn" data-accion="renovar-anuncio" data-id="${a.id}">↻ ${t('reactivar')}</button>` : ''}
          <button class="btn primario" data-accion="editar-anuncio" data-id="${a.id}">${ui.ic('edit')}<span>${t('editar')}</span></button>`
        : `<button class="btn perigo-texto" data-accion="denunciar-anuncio" data-id="${a.id}">⚑ <span>${t('denunciar')}</span></button>`)}`;
  }

  const verFicha = id => ui.modal.mostrar(() => ficha(id));

  // ---------- Formulario (publicar / editar) ----------
  let fotosForm = []; // [{ ruta } ou { blob, url }]

  function htmlFotos() {
    return `${fotosForm.map((f, i) => `<div class="miniatura-foto"><img src="${u.esc(f.url || urlFoto(f.ruta))}" alt="">
        <button type="button" class="btn-icono peq" data-accion="anuncio-quitar-foto" data-i="${i}" aria-label="${t('quitar')}">${ui.ic('x')}</button></div>`).join('')}
      ${fotosForm.length < MAX_FOTOS ? `<label class="miniatura-foto engadir">${ui.ic('camera')}<span>${t('engadirFoto')}</span>
        <input type="file" accept="image/*" multiple data-cambio="anuncio-fotos" hidden></label>` : ''}`;
  }
  const pintarFotos = () => { const c = document.querySelector('#modal .fotos-anuncio'); if (c) c.innerHTML = htmlFotos(); };

  function formulario(a) {
    const novo = !a;
    a = a || {
      especie: 'vacun', sexo: 'F', cantidade: 1, prezo_tipo: 'unidade', caracteristicas: [], whatsapp: true,
      provincia: lembrado('provincia') || 'Ourense', concello: lembrado('concello'), telefono: lembrado('telefono'), vendedor_nome: lembrado('nome'),
    };
    fotosForm = (a.fotos || []).map(ruta => ({ ruta }));
    const meus = D.listo() ? D.lista('animais').filter(X.calc.activo).sort(u.porNome) : [];
    return `<form data-form="anuncio" data-id="${a.id || ''}" class="modal-form form-anuncio">
      ${ui.cab(novo ? t('publicarAnuncio') : t('editarAnuncio'), !novo)}
      <div class="modal-corpo">
        ${novo && meus.length ? `<div class="desde-animal">${ui.campo(t('partirDunAnimal'),
          ui.selector('animal', [['', t('ningunDesdeCero')], ...meus.map(x => [x.id, `${x.nome}${x.crotal ? ' · ' + x.crotal : ''}`])], '', 'data-cambio="anuncio-dun-animal"'),
          t('axudaPartirAnimal'))}</div>` : ''}
        ${ui.campo(t('tituloAnuncio') + ' *', ui.entrada('titulo', a.titulo, `required minlength="3" maxlength="120" placeholder="${t('exemploTitulo')}"`))}
        <h4>${t('fotos')} <small>(${t('ataN', { n: MAX_FOTOS })})</small></h4>
        <div class="fotos-anuncio">${htmlFotos()}</div>
        <div class="grella-campos">
          ${ui.campo(t('especie') + ' *', ui.selector('especie', Object.keys(ESPECIES).map(e => [e, `${ESPECIES[e]} ${nomeEspecie(e)}`]), a.especie))}
          ${ui.campo(t('raza'), ui.entrada('raza', a.raza, 'list="razasMercado" autocomplete="off"') + `<datalist id="razasMercado">${X.razas.lista().map(r => `<option value="${u.esc(r.nome)}">`).join('')}</datalist>`)}
          ${ui.campo(t('sexo'), ui.selector('sexo', [['F', `♀ ${t('femia')}`], ['M', `♂ ${t('macho')}`], ['mixto', `⚥ ${t('mixto')}`]], a.sexo))}
          ${ui.campo(t('nacemento'), ui.dataInp('nacemento', a.nacemento))}
          ${ui.campo(t('pesoAprox') + ' (kg)', ui.numero('peso', a.peso))}
          ${ui.campo(t('cantidade'), ui.numero('cantidade', a.cantidade, 'step="1" min="1" required'))}
          ${ui.campo(t('prezo') + ' (€)', ui.numero('prezo', a.prezo))}
          ${ui.campo(t('tipoPrezo'), ui.selector('prezo_tipo', [['unidade', t('porAnimal')], ['lote', t('polLote')], ['convir', t('aConvir')]], a.prezo_tipo))}
        </div>
        ${ui.campo(t('caracteristicas'), `<div class="chips-check">${CARACTERISTICAS.map(k =>
          `<label><input type="checkbox" name="caracteristicas" value="${k}" ${(a.caracteristicas || []).includes(k) ? 'checked' : ''}><span>${t('car_' + k)}</span></label>`).join('')}</div>`)}
        ${ui.campo(t('descricion'), `<textarea name="descricion" rows="4" maxlength="3000">${u.esc(a.descricion || '')}</textarea>`)}
        <fieldset><legend>${t('ubicacionContacto')}</legend><div class="grella-campos">
          ${ui.campo(t('provincia') + ' *', ui.selector('provincia', PROVINCIAS.map(p => [p, p]), a.provincia, 'required'))}
          ${ui.campo(t('concello'), ui.entrada('concello', a.concello, 'autocomplete="off"'), t('axudaConcello'))}
          ${ui.campo(t('telefono') + ' *', ui.entrada('telefono', a.telefono, 'type="tel" required autocomplete="tel" inputmode="tel"'))}
          ${ui.campo(t('nomeVendedor'), ui.entrada('vendedor_nome', a.vendedor_nome, 'autocomplete="name"'), t('axudaNomeVendedor'))}
        </div>
        <label class="check"><input type="checkbox" name="whatsapp" ${a.whatsapp !== false ? 'checked' : ''}><span>${t('aceptoWhatsapp')}</span></label>
        <p class="nota">${t('avisoTelefonoVisible')}</p></fieldset>
      </div>
      ${ui.pe(ui.btnCancelar() + ui.btnGardar(novo ? t('publicar') : t('gardar')))}
    </form>`;
  }

  const abrirFormulario = a => ui.modal.abrir(formulario(a), { volver: a ? () => verFicha(a.id) : null });

  // Partir dun animal propio: copia os datos que interesan (a ficha da xestión non se toca)
  X.cambios['anuncio-dun-animal'] = async el => {
    const a = D.obter('animais', el.value), f = el.form;
    if (!a) return;
    const e = X.calc.especie(a);
    const especie = ESPECIES[a.especieId] ? a.especieId : DIB_A_ESPECIE[X.razas.codigoEspecie(e)] || 'outra';
    const w = X.calc.peso(a);
    f.elements.especie.value = especie;
    f.elements.raza.value = a.raza || '';
    f.elements.sexo.value = a.sexo || 'F';
    f.elements.nacemento.value = a.nacemento || '';
    f.elements.peso.value = w ? Math.round(w) : '';
    f.elements.cantidade.value = 1;
    if (!f.elements.titulo.value) f.elements.titulo.value = [a.raza || e.nome, a.sexo === 'M' ? t('macho') : t('femia'), a.nacemento ? u.idade(a.nacemento) : ''].filter(Boolean).join(' · ');
    if (a.prenada || (X.calc.repro(a) || {}).estado === 'prenada') {
      const c = f.querySelector('[name=caracteristicas][value=prenada]');
      if (c) c.checked = true;
    }
    if (a.foto && fotosForm.length < MAX_FOTOS) {
      try {
        const url = await X.fotos.url(a.foto);
        if (url) { const blob = await (await fetch(url)).blob(); fotosForm.unshift({ blob, url: URL.createObjectURL(blob) }); fotosForm = fotosForm.slice(0, MAX_FOTOS); pintarFotos(); }
      } catch { /* sen foto */ }
    }
  };

  X.cambios['anuncio-fotos'] = async el => {
    const ficheiros = [...(el.files || [])].slice(0, MAX_FOTOS - fotosForm.length);
    el.value = '';
    for (const fx of ficheiros) {
      try { const blob = await X.fotos.comprimir(fx); fotosForm.push({ blob, url: URL.createObjectURL(blob) }); }
      catch (e) { ui.toast(e.message, 'erro'); }
    }
    pintarFotos();
  };
  X.accions['anuncio-quitar-foto'] = el => { fotosForm.splice(+el.dataset.i, 1); pintarFotos(); };

  const novoUuid = () => crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });

  X.formularios.anuncio = async form => {
    if (!X.nube.sesion()) { ui.toast(t('mercadoSenConexion'), 'erro'); return; }
    const f = new FormData(form), s = k => String(f.get(k) || '').trim();
    const prev = form.dataset.id ? st.porId.get(form.dataset.id) : null;
    const id = prev ? prev.id : novoUuid(), uid = X.nube.uid();
    ui.toast(t('publicando'));

    // Fotos: sube as novas e borra as que se quitaron
    const fotos = [];
    for (const [i, fo] of fotosForm.entries()) {
      if (fo.ruta) { fotos.push(fo.ruta); continue; }
      const ruta = `${uid}/${id}/${Date.now().toString(36)}-${i}.jpg`;
      const { error } = await X.nube.limite(sb().storage.from('mercado').upload(ruta, new Blob([fo.blob], { type: 'image/jpeg' }), { contentType: 'image/jpeg', upsert: true }), 60000);
      if (error) throw error;
      fotos.push(ruta);
    }
    const quitadas = (prev && prev.fotos || []).filter(r => !fotos.includes(r));
    if (quitadas.length) sb().storage.from('mercado').remove(quitadas).catch(() => {});

    const provincia = s('provincia'), concello = s('concello');
    const pos = prev && prev.provincia === provincia && prev.concello === concello && prev.lat != null
      ? { lat: prev.lat, lon: prev.lon } : await xeocodificar(concello, provincia);
    const rexistro = {
      id, titulo: s('titulo'), especie: s('especie'), raza: s('raza') || null, sexo: s('sexo') || null,
      nacemento: s('nacemento') || null, peso: u.num(f.get('peso')), cantidade: Math.max(1, Math.round(u.num(f.get('cantidade')) || 1)),
      prezo: s('prezo_tipo') === 'convir' ? null : u.num(f.get('prezo')), prezo_tipo: s('prezo_tipo'),
      caracteristicas: f.getAll('caracteristicas'), descricion: s('descricion') || null,
      provincia, concello: concello || null, lat: pos ? pos.lat : null, lon: pos ? pos.lon : null,
      telefono: s('telefono'), whatsapp: f.get('whatsapp') === 'on', vendedor_nome: s('vendedor_nome') || null, fotos,
    };
    const { data, error } = await X.nube.limite(prev
      ? sb().from('anuncios').update(rexistro).eq('id', id).select().single()
      : sb().from('anuncios').insert(rexistro).select().single());
    if (error) throw error;
    ['provincia', 'concello', 'telefono'].forEach(k => lembrar(k, rexistro[k]));
    lembrar('nome', rexistro.vendedor_nome);
    st.porId.set(id, data);
    refrescar();
    ui.toast(prev ? t('gardado') : t('anuncioPublicado'), 'ok');
    verFicha(id);
  };

  // ---------- Accións do anuncio ----------
  async function cambiar(id, cambios, msg) {
    const { data, error } = await X.nube.limite(sb().from('anuncios').update(cambios).eq('id', id).select().single());
    if (error) { ui.toast(error.message, 'erro'); return; }
    st.porId.set(id, data);
    refrescar();
    if (msg) ui.toast(msg, 'ok');
  }

  X.accions['ver-anuncio'] = el => verFicha(el.dataset.id);
  X.accions['publicar-anuncio'] = () => abrirFormulario(null);
  X.accions['editar-anuncio'] = el => abrirFormulario(st.porId.get(el.dataset.id));
  X.accions['estado-anuncio'] = el => cambiar(el.dataset.id, { estado: el.dataset.estado },
    el.dataset.estado === 'vendido' ? t('anuncioVendido') : t('anuncioRetirado'));
  X.accions['renovar-anuncio'] = el => cambiar(el.dataset.id,
    { estado: 'activo', caduca: new Date(Date.now() + DIAS_CADUCA * 864e5).toISOString() }, t('anuncioRenovado'));
  X.accions['borrar-anuncio'] = async el => {
    const a = st.porId.get(el.dataset.id);
    if (!await ui.confirmar(t('confBorrarAnuncio'), { aceptar: t('eliminar'), perigo: true })) return;
    const { error } = await sb().from('anuncios').delete().eq('id', a.id);
    if (error) { ui.toast(error.message, 'erro'); return; }
    if (a.fotos && a.fotos.length) sb().storage.from('mercado').remove(a.fotos).catch(() => {});
    st.porId.delete(a.id);
    ui.modal.pechar();
    refrescar();
  };

  X.accions['denunciar-anuncio'] = el => ui.modal.abrir(`<form data-form="denuncia" data-id="${el.dataset.id}" class="modal-form peq">
    ${ui.cab(t('denunciarAnuncio'), true)}
    <div class="modal-corpo"><p class="nota">${t('axudaDenuncia')}</p>
      ${ui.campo(t('motivo'), `<textarea name="motivo" rows="4" required minlength="3" maxlength="1000" autofocus></textarea>`)}</div>
    ${ui.pe(ui.btnCancelar() + ui.btnGardar(t('enviar')))}</form>`, { volver: () => verFicha(el.dataset.id) });
  X.formularios.denuncia = async form => {
    const { error } = await sb().from('denuncias').insert({ anuncio: form.dataset.id, motivo: String(new FormData(form).get('motivo')).trim() });
    ui.toast(error ? (error.code === '23505' ? t('xaDenunciado') : error.message) : t('denunciaEnviada'), error && error.code !== '23505' ? 'erro' : 'ok');
    verFicha(form.dataset.id);
  };

  // ---------- Busca e filtros ----------
  X.cambios['pestana-mercado'] = el => { st.pestana = el.value; st.erro = null; X.app.render(); };
  X.formularios['busca-mercado'] = form => { st.filtros.q = String(new FormData(form).get('q') || ''); X.app.render(); };
  X.cambios['orde-mercado'] = el => {
    st.orde = el.value;
    if (st.orde === 'preto' && !st.eu) pedirPosicion();
    X.app.render();
  };
  X.accions['recargar-mercado'] = () => refrescar();
  X.accions['mais-anuncios'] = () => cargar(true);
  X.accions['quitar-filtro-mercado'] = el => {
    const c = el.dataset.campo;
    if (c === 'prezo') { st.filtros.prezoMin = ''; st.filtros.prezoMax = ''; } else st.filtros[c] = '';
    X.app.render();
  };
  X.accions['quitar-caracteristica-mercado'] = el => {
    st.filtros.caracteristicas = st.filtros.caracteristicas.filter(k => k !== el.dataset.valor);
    X.app.render();
  };

  function pedirPosicion() {
    if (!navigator.geolocation) { ui.toast(t('senUbicacion'), 'erro'); return; }
    navigator.geolocation.getCurrentPosition(p => {
      // redondeada (~1 km): abonda para ordenar e non se garda en ningún servidor
      st.eu = { lat: Math.round(p.coords.latitude * 100) / 100, lon: Math.round(p.coords.longitude * 100) / 100 };
      try { localStorage.setItem('xunguir.posicion', JSON.stringify(st.eu)); } catch { /* sen almacenamento */ }
      X.app.render();
    }, () => ui.toast(t('senUbicacion'), 'erro'), { enableHighAccuracy: false, timeout: 15000, maximumAge: 3600000 });
  }

  X.accions['filtros-mercado'] = () => {
    const f = st.filtros;
    ui.modal.abrir(`<form data-form="filtros-mercado" class="modal-form">
      ${ui.cab(t('filtros'))}
      <div class="modal-corpo"><div class="grella-campos">
        ${ui.campo(t('especie'), ui.selector('especie', [['', t('todas')], ...Object.keys(ESPECIES).map(e => [e, `${ESPECIES[e]} ${nomeEspecie(e)}`])], f.especie))}
        ${ui.campo(t('raza'), ui.entrada('raza', f.raza, 'list="razasFiltro" autocomplete="off"') + `<datalist id="razasFiltro">${X.razas.lista().map(r => `<option value="${u.esc(r.nome)}">`).join('')}</datalist>`)}
        ${ui.campo(t('sexo'), ui.selector('sexo', [['', t('todos')], ['F', `♀ ${t('femias')}`], ['M', `♂ ${t('machos')}`], ['mixto', `⚥ ${t('mixto')}`]], f.sexo))}
        ${ui.campo(t('idadeMaxima') + ` (${t('mesesUnidade')})`, ui.numero('idadeMax', f.idadeMax, 'step="1"'))}
        ${ui.campo(t('prezoMinimo') + ' (€)', ui.numero('prezoMin', f.prezoMin))}
        ${ui.campo(t('prezoMaximo') + ' (€)', ui.numero('prezoMax', f.prezoMax))}
        ${ui.campo(t('provincia'), ui.selector('provincia', [['', t('todas')], ...PROVINCIAS.map(p => [p, p])], f.provincia))}
        ${ui.campo(t('concello'), ui.entrada('concello', f.concello, 'autocomplete="off"'))}
      </div>
      ${ui.campo(t('caracteristicas'), `<div class="chips-check">${CARACTERISTICAS.map(k =>
        `<label><input type="checkbox" name="caracteristicas" value="${k}" ${f.caracteristicas.includes(k) ? 'checked' : ''}><span>${t('car_' + k)}</span></label>`).join('')}</div>`)}
      </div>
      ${ui.pe(`<button type="button" class="btn" data-accion="limpar-filtros-mercado">${t('limparFiltros')}</button><span class="espazo"></span>${ui.btnGardar(t('aplicar'))}`)}
    </form>`);
  };
  X.formularios['filtros-mercado'] = form => {
    const f = new FormData(form), s = k => String(f.get(k) || '').trim();
    st.filtros = { ...st.filtros, especie: s('especie'), raza: s('raza'), sexo: s('sexo'), idadeMax: s('idadeMax'),
      prezoMin: s('prezoMin'), prezoMax: s('prezoMax'), provincia: s('provincia'), concello: s('concello'), caracteristicas: f.getAll('caracteristicas') };
    ui.modal.pechar();
    X.app.render();
  };
  X.accions['limpar-filtros-mercado'] = () => { st.filtros = { ...FILTROS_BALEIROS(), q: st.filtros.q }; ui.modal.pechar(); X.app.render(); };

  return { render };
})();
