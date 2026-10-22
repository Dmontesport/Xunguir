'use strict';

// Pestana Animais: lista, ficha, formulario, crías, venda, falecemento
X.vAnimais = (() => {
  const u = X.u, ui = X.ui, c = X.calc, D = X.datos;
  const t = (...a) => X.t(...a);
  const filtro = { q: '', especie: '', sexo: '', grupo: '' }; // grupo: '' todos, '_sen' sen grupo, ou id
  const abertos = { vendido: true, falecido: true };

  // ---------- Lista ----------
  function filtrar(lista) {
    const q = filtro.q.trim().toLowerCase();
    return lista.filter(a => (!filtro.especie || a.especieId === filtro.especie)
      && (!filtro.sexo || a.sexo === filtro.sexo)
      && (!filtro.grupo || (filtro.grupo === '_sen' ? !X.vGrupos.gruposVivos(a).length : X.vGrupos.estaEn(a, filtro.grupo)))
      && (!q || [a.nome, a.crotal, a.raza].some(v => (v || '').toLowerCase().includes(q))));
  }

  function chipsEstado(a) {
    const est = c.estado(a), cfg = D.config().avisos;
    let h = '';
    if (est === 'falecido') h += ui.chip(`† ${u.data(a.falecemento)}`, 'gris');
    if (est === 'vendido') h += ui.chip(u.esc(t('vendidoA', { quen: a.venda.comprador || '—' })) + (a.venda.prezo != null ? ' · ' + u.dinheiro(a.venda.prezo) : ''), 'gris');
    const r = c.repro(a);
    if (r) {
      if (r.estado === 'celo') h += ui.chip(t('enCelo'), 'vermello');
      else if (r.estado === 'proximo' && r.dias <= cfg.celo) h += ui.chip(t('celoEn', { en: u.enDias(r.dias) }), 'ambar');
      else if (r.estado === 'prenada') h += ui.chip(r.dias < 0 ? t('partoAtrasado') : t('prenadaParto', { en: u.enDias(r.dias) }), r.dias <= cfg.parto ? 'ambar' : 'azul');
    }
    return h;
  }

  function tarxeta(a) {
    const e = c.especie(a), est = c.estado(a), w = c.peso(a);
    const p = est === 'activo' && D.obter('parcelas', a.parcelaId);
    const gs = est === 'activo' ? X.vGrupos.gruposVivos(a) : [];
    const idade = u.idade(a.nacemento, a.falecemento || undefined);
    const chips = chipsEstado(a);
    const arrastre = est === 'activo' ? 'data-arrastrable data-soltar="animal"' : '';
    return `<article class="tarxeta-animal ${est}" data-accion="ver-animal" data-id="${a.id}" ${arrastre} tabindex="0">
      <div class="foto">${ui.foto(a)}
        ${est === 'vendido' ? `<span class="cinta">${t('vendido')}</span>` : ''}
        <span class="sexo s-${a.sexo}" title="${a.sexo === 'M' ? t('macho') : t('femia')}">${a.sexo === 'M' ? '♂' : '♀'}</span>
      </div>
      <div class="info">
        <div class="nome-fila"><h3>${u.esc(a.nome)}</h3>${a.crotal ? `<span class="crotal">${u.esc(a.crotal)}</span>` : ''}</div>
        <div class="sub">${c.icono(a)} ${u.esc(a.raza || e.nome)}${idade ? ` · ${idade}` : ''}</div>
        <div class="datos-mini">
          ${w != null ? `<span title="${t('pesoTeorico')}">⚖️ ${u.kg(w)}</span>` : ''}
          ${a.comidaDia ? `<span title="${t('comidaDia')}">🌾 ${u.kg(a.comidaDia)}</span>` : ''}
          ${p ? `<span title="${t('parcela')}">📍 ${u.esc(p.nome)}</span>` : ''}
          ${gs.length ? `<span title="${t('grupos')}">👥 ${u.esc(gs.map(g => g.nome).join(', '))}</span>` : ''}
        </div>
        ${chips ? `<div class="chips">${chips}</div>` : ''}
      </div>
    </article>`;
  }

  function render(main) {
    const todos = D.lista('animais');
    const av = c.avisos().filter(a => a.ref.tipo === 'animal');
    const vis = filtrar(todos);
    const g = { activo: [], vendido: [], falecido: [] };
    vis.forEach(a => g[c.estado(a)].push(a));
    g.activo.sort(u.porNome);
    g.vendido.sort((a, b) => (b.venda.data || '').localeCompare(a.venda.data || ''));
    g.falecido.sort((a, b) => (b.falecemento || '').localeCompare(a.falecemento || ''));

    const usadas = [...new Set(todos.map(a => a.especieId))].map(id => D.obter('especies', id)).filter(Boolean);
    const fChip = (campo, val, txt) => `<button class="filtro ${filtro[campo] === val ? 'activo' : ''}" data-accion="filtro-animais" data-campo="${campo}" data-valor="${val}">${txt}</button>`;
    const filtros = (usadas.length > 1 ? fChip('especie', '', t('todas')) + usadas.map(e => fChip('especie', e.id, `${e.icono} ${u.esc(e.nome)}`)).join('') + '<span class="sep"></span>' : '')
      + fChip('sexo', '', t('todos')) + fChip('sexo', 'F', '♀ ' + t('femias')) + fChip('sexo', 'M', '♂ ' + t('machos'));
    const grupos = D.lista('grupos').sort(u.porNome);
    if (filtro.grupo && filtro.grupo !== '_sen' && !D.obter('grupos', filtro.grupo)) filtro.grupo = '';
    const filtrosGrupo = (grupos.length ? fChip('grupo', '', t('todosGrupos')) + grupos.map(g => fChip('grupo', g.id, `👥 ${u.esc(g.nome)}`)
      .replace('<button ', `<button data-soltar="grupo" data-grupo="${g.id}" `)).join('')
      + fChip('grupo', '_sen', t('senGrupo')) : '')
      + `<button class="filtro xestionar" data-accion="grupos">👥 ${t('xestionarGrupos')}</button>`;

    const grella = l => `<div class="grella-animais">${l.map(tarxeta).join('')}</div>`;
    const grupo = (k, l, titulo) => l.length ? `<details class="grupo" data-grupo="${k}" ${abertos[k] ? 'open' : ''}>
        <summary><h2>${titulo} <span class="conta">${l.length}</span></h2></summary>${grella(l)}</details>` : '';

    let corpo;
    if (!todos.length) {
      corpo = `<div class="baleiro"><div class="baleiro-ic">🐄</div><p>${t('senAnimais')}</p>
        <button class="btn primario" data-accion="novo-animal">${ui.ic('plus')}<span>${t('novoAnimal')}</span></button></div>`;
    } else if (!vis.length) {
      corpo = `<div class="baleiro"><p>${t('senResultados')}</p></div>`;
    } else {
      corpo = (g.activo.length ? `<h2 class="titulo-grupo">${t('activos')} <span class="conta">${g.activo.length}</span></h2>${grella(g.activo)}` : '')
        + grupo('vendido', g.vendido, t('vendidos')) + grupo('falecido', g.falecido, t('falecidos'));
    }

    main.innerHTML = `${ui.tiraAvisos(av)}
      <div class="ferramentas">
        <label class="busca">${ui.ic('search')}<input type="search" id="buscaAnimais" placeholder="${t('buscarAnimal')}" value="${u.esc(filtro.q)}" data-input="busca-animais"></label>
        <button class="btn" data-accion="escanear-dib" title="${t('escanearDib')}">${ui.ic('scan')}<span>${t('escanearDib')}</span></button>
        <button class="btn primario" data-accion="novo-animal">${ui.ic('plus')}<span>${t('novoAnimal')}</span></button>
      </div>
      ${todos.length ? `<div class="filtros">${filtros}</div><div class="filtros">${filtrosGrupo}</div>` : ''}
      ${corpo}`;
    main.querySelectorAll('details.grupo').forEach(d => d.addEventListener('toggle', () => { abertos[d.dataset.grupo] = d.open; }));
  }

  // ---------- Ficha ----------
  const enlace = a => a ? `<button class="enlace" data-accion="ver-animal" data-id="${a.id}">${u.esc(a.nome)}${a.crotal ? ` <small>${u.esc(a.crotal)}</small>` : ''}</button>` : '—';
  const fila = (etq, val) => `<div class="fila"><dt>${etq}</dt><dd>${val}</dd></div>`;

  function textoRepro(a, r) {
    if (!r) return '';
    const e = c.especie(a);
    switch (r.estado) {
      case 'celo': return `<div class="estado-repro vermello">${t('enCeloAta', { data: u.data(r.ata) })}</div>`;
      case 'proximo': return `<div class="estado-repro ${r.dias <= D.config().avisos.celo ? 'ambar' : ''}">${t('proximoCelo', { data: u.data(r.data), en: u.enDias(r.dias) })}</div>`;
      case 'prenada': return `<div class="estado-repro ${r.dias < 0 ? 'vermello' : 'azul'}">${r.dias < 0
        ? t('partoAtrasadoDias', { dias: u.dias(-r.dias), data: u.data(r.parto) })
        : t('prenadaPartoData', { data: u.data(r.parto), en: u.enDias(r.dias) })}<small>${t('xestacionDe', { dias: e.xestacion })}</small></div>`;
      case 'nova': return `<div class="estado-repro">${t('aindaNova', { data: u.data(r.data) })}</div>`;
      default: return `<div class="estado-repro">${t('senDatosCelo')}</div>`;
    }
  }

  const NOMES_EVENTO = { celo: 'evCelo', cubricion: 'evCubricion', parto: 'evParto' };
  const RE_CROTAL = /^[A-Z]{2}\d{12}$/; // formato oficial: gárdase sen espazos e en maiúsculas

  function ficha(id) {
    const a = D.obter('animais', id);
    if (!a) return null;
    const e = c.especie(a), est = c.estado(a), activo = est === 'activo';
    const p = D.obter('parcelas', a.parcelaId);
    const grupos = X.vGrupos.gruposVivos(a);
    const nec = c.necesidades(a);
    const r = c.repro(a);
    const crias = D.lista('animais').filter(x => x.nai === a.id || x.pai === a.id).sort((x, y) => (y.nacemento || '').localeCompare(x.nacemento || ''));
    const pesaxes = [...(a.pesaxes || [])].sort((x, y) => y.data.localeCompare(x.data));
    const hist = [...(a.historial || [])].sort((x, y) => y.data.localeCompare(x.data)).slice(0, 10);
    const macho = D.obter('animais', a.cubricionMacho);

    const repro = a.sexo === 'F' ? `<section class="seccion"><h3>${t('reproducion')}</h3>
      ${textoRepro(a, r)}
      <dl class="datos">
        ${fila(t('ultimoCelo'), u.data(a.ultimoCelo))}
        ${fila(t('cubricion'), a.cubricion ? u.data(a.cubricion) + (macho ? ` · ${enlace(macho)}` : '') : '—')}
        ${fila(t('ultimoParto'), u.data(a.ultimoParto))}
      </dl>
      ${activo ? `<div class="botons">
        <button class="btn" data-accion="celo-hoxe" data-id="${a.id}">♀ ${t('celoHoxe')}</button>
        <button class="btn" data-accion="cubricion" data-id="${a.id}">${t('rexistrarCubricion')}</button>
        <button class="btn primario" data-accion="cria" data-id="${a.id}">🍼 ${t('rexistrarCria')}</button>
      </div>` : ''}
      ${hist.length ? `<ul class="historial">${hist.map(h => `<li><span>${u.data(h.data)}</span>${t(NOMES_EVENTO[h.tipo] || h.tipo)}${h.crias ? ` (${h.crias.length})` : ''}</li>`).join('')}</ul>` : ''}
    </section>` : '';

    const pesoSec = `<section class="seccion"><h3>${t('peso')}</h3>
      ${nec ? `<div class="peso-grande"><b>${u.kg(nec.peso)}</b><small>${t('pesoTeoricoEstimado')}</small></div>
        <dl class="datos">
          ${activo ? fila(t('gananciaActual'), `${nec.ganancia >= 0 ? '+' : '−'}${u.kg(Math.abs(nec.ganancia))}/${t('dia')}`) : ''}
          ${activo ? fila(t('comidaMantemento'), `${u.kg(nec.mant)}/${t('dia')}`) : ''}
          ${activo ? fila(t('comidaOptima'), `${u.kg(nec.optima)}/${t('dia')}`) : ''}
        </dl>
        ${activo && !a.comidaDia ? `<p class="nota">${t('notaSenComida')}</p>` : ''}`
        : `<p class="nota">${t('notaSenPeso')}</p>`}
      ${pesaxes.length ? `<h4>${t('pesaxesReais')}</h4><ul class="lista-simple">${pesaxes.map((px, i) => `<li><span>${u.data(px.data)}</span><b>${u.kg(px.kg)}</b>
        <button class="btn-icono peq" data-accion="borrar-pesaxe" data-id="${a.id}" data-data="${px.data}" data-kg="${px.kg}" aria-label="${t('borrar')}">${ui.ic('x')}</button></li>`).join('')}</ul>` : ''}
      ${activo ? `<div class="botons"><button class="btn" data-accion="pesaxe" data-id="${a.id}">⚖️ ${t('rexistrarPesaxe')}</button></div>` : ''}
    </section>`;

    const nai = D.obter('animais', a.nai), pai = D.obter('animais', a.pai);
    const familia = (nai || pai || crias.length) ? `<section class="seccion"><h3>${t('familia')}</h3>
      <dl class="datos">${fila(t('nai'), enlace(nai))}${fila(t('pai'), enlace(pai))}</dl>
      ${crias.length ? `<h4>${t('crias')} (${crias.length})</h4><div class="mini-animais">${crias.map(x => `<button class="mini-animal ${c.estado(x)}" data-accion="ver-animal" data-id="${x.id}">
        <span class="foto">${ui.foto(x)}</span><span>${u.esc(x.nome)}<small>${u.data(x.nacemento)}</small></span></button>`).join('')}</div>` : ''}
    </section>` : '';

    const estadoSec = est === 'vendido' ? `<section class="seccion aviso-estado"><h3>${t('vendido')}</h3><dl class="datos">
        ${fila(t('data'), u.data(a.venda.data))}${fila(t('comprador'), u.esc(a.venda.comprador || '—'))}${fila(t('prezo'), u.dinheiro(a.venda.prezo))}</dl></section>`
      : est === 'falecido' ? `<section class="seccion aviso-estado"><h3>${t('falecido')}</h3><dl class="datos">
        ${fila(t('data'), u.data(a.falecemento))}${a.causaMorte ? fila(t('causa'), u.esc(a.causaMorte)) : ''}</dl></section>` : '';

    return `${ui.cab(u.esc(a.nome))}
      <div class="modal-corpo ficha">
        <div class="ficha-top">
          <label class="foto grande ${est}" title="${t('cambiarFoto')}">${ui.foto(a)}
            <input type="file" accept="image/*" data-cambio="foto-animal" data-id="${a.id}" hidden>
            <span class="cambiar-foto">${ui.ic('camera')}</span>
          </label>
          <div class="ficha-resumo">
            <div class="sub">${a.crotal ? `<span class="crotal">${u.esc(a.crotal)}</span>` : ''} ${c.icono(a)} ${u.esc(e.nome)} · ${a.sexo === 'M' ? '♂ ' + t('macho') : '♀ ' + t('femia')}</div>
            <div class="chips">${chipsEstado(a)}</div>
            <dl class="datos">
              ${a.raza ? fila(t('raza'), u.esc(a.raza) + (a.razaCodigo ? ` <small>(${u.esc(a.razaCodigo)})</small>` : '')) : ''}
              ${fila(t('nacemento'), a.nacemento ? `${u.data(a.nacemento)} <small>(${u.idade(a.nacemento, a.falecemento || undefined)})</small>` : '—')}
              ${activo ? fila(t('parcela'), p ? `<button class="enlace" data-accion="ver-parcela" data-id="${p.id}">📍 ${u.esc(p.nome)}</button>` : t('senParcela')) : ''}
              ${grupos.length ? fila(t('grupos'), grupos.map(g => `<button class="enlace" data-accion="ver-grupo" data-id="${g.id}">👥 ${u.esc(g.nome)}</button>`).join('<br>')) : ''}
              ${fila(t('comidaDia'), a.comidaDia ? `${u.kg(a.comidaDia)}` : '—')}
            </dl>
          </div>
        </div>
        ${estadoSec}${repro}${pesoSec}${familia}
        ${a.notas ? `<section class="seccion"><h3>${t('notas')}</h3><p class="notas">${u.esc(a.notas)}</p></section>` : ''}
      </div>
      ${ui.pe(`
        <button class="btn perigo-texto" data-accion="borrar-animal" data-id="${a.id}">${ui.ic('trash')}<span>${t('eliminar')}</span></button>
        <span class="espazo"></span>
        ${est === 'activo' ? `<button class="btn" data-accion="falecemento" data-id="${a.id}">† ${t('falecido')}</button>
          <button class="btn" data-accion="venda" data-id="${a.id}">€ ${t('vender')}</button>`
        : `<button class="btn" data-accion="desfacer-estado" data-id="${a.id}">${est === 'vendido' ? t('desfacerVenda') : t('desfacerFalecemento')}</button>`}
        <button class="btn primario" data-accion="editar-animal" data-id="${a.id}">${ui.ic('edit')}<span>${t('editar')}</span></button>`)}`;
  }

  const verFicha = id => ui.modal.mostrar(() => ficha(id));

  // ---------- Formulario ----------
  function opcionsAnimais(filtroFn, excluir) {
    return [['', '—'], ...D.lista('animais').filter(x => x.id !== excluir && filtroFn(x)).sort(u.porNome)
      .map(x => [x.id, `${x.nome}${x.crotal ? ' · ' + x.crotal : ''}`])];
  }
  const opcionsParcelas = () => [['', t('senParcela')], ...D.lista('parcelas').filter(p => p.tipo !== 'forraxe').sort(u.porNome).map(p => [p.id, p.nome])];
  const opcionsEspecies = () => D.lista('especies').sort(u.porNome).map(e => [e.id, `${e.icono} ${e.nome}`]);

  // Nomes de raza coñecidos: os da táboa de códigos e os xa usados
  function nomesRazas() {
    const r = new Set(Object.values(D.config().razas || {}));
    D.lista('animais').forEach(a => a.raza && r.add(a.raza));
    return [...r].sort((x, y) => x.localeCompare(y));
  }

  // `a` sen id = animal novo (pode traer datos xa cubertos, p. ex. dun DIB)
  function formulario(a) {
    const novo = !a || !a.id;
    a = a || {};
    a = { sexo: 'F', especieId: (D.lista('especies')[0] || {}).id, ...a };
    const v = a.venda || {};
    const razas = D.config().razas || {};
    const axudaRaza = a.razaCodigo ? (razas[a.razaCodigo] ? t('codigoRaza', { cod: a.razaCodigo }) : t('razaDesconecida', { cod: a.razaCodigo })) : '';
    return `<form data-form="animal" data-id="${a.id || ''}" data-sexo="${a.sexo}" class="modal-form">
      ${ui.cab(novo ? t('novoAnimal') : t('editarAnimal'), !novo)}
      <div class="modal-corpo">
        <div class="form-foto">
          <label class="foto grande">${ui.foto(a)}<img class="previa" alt="" hidden>
            <input type="file" name="foto" accept="image/*" data-cambio="previa-foto" hidden>
            <span class="cambiar-foto">${ui.ic('camera')}</span></label>
          <div class="grella-campos">
            ${ui.campo(t('nome') + ' *', ui.entrada('nome', a.nome, 'required autofocus autocomplete="off"'))}
            ${ui.campo(t('crotal'), ui.entrada('crotal', a.crotal, 'autocomplete="off"'))}
          </div>
        </div>
        <div class="grella-campos">
          ${ui.campo(t('especie'), ui.selector('especieId', opcionsEspecies(), a.especieId, 'data-cambio="proposta-comida"'))}
          ${ui.campo(t('raza'), ui.entrada('raza', a.raza, 'list="listaRazas" autocomplete="off"')
            + `<datalist id="listaRazas">${nomesRazas().map(n => `<option value="${u.esc(n)}">`).join('')}</datalist>`
            + `<input type="hidden" name="razaCodigo" value="${u.esc(a.razaCodigo || '')}">`, axudaRaza)}
          ${ui.campo(t('sexo'), `<div class="segmentado">
            <label><input type="radio" name="sexo" value="F" ${a.sexo !== 'M' ? 'checked' : ''} data-cambio="sexo"><span>♀ ${t('femia')}</span></label>
            <label><input type="radio" name="sexo" value="M" ${a.sexo === 'M' ? 'checked' : ''} data-cambio="sexo"><span>♂ ${t('macho')}</span></label></div>`)}
          ${ui.campo(t('nacemento'), ui.dataInp('nacemento', a.nacemento, 'data-cambio="proposta-comida"'))}
          ${ui.campo(t('pesoNacemento') + ' (kg)', ui.numero('pesoNacemento', a.pesoNacemento, `placeholder="${t('segundoEspecie')}" data-cambio="proposta-comida"`))}
          ${ui.campo(t('comidaDia') + ' (kg)', ui.numero('comidaDia', a.comidaDia, `data-input="manual" ${a.comidaDia != null ? 'data-manual="1"' : ''}`),
            `${t('axudaComida')}<span class="proposta" data-proposta="comida"></span>`)}
          ${ui.campo(t('parcela'), ui.selector('parcelaId', opcionsParcelas(), a.parcelaId))}
          ${D.lista('grupos').length ? ui.campo(t('grupos'), `<div class="chips-check">${D.lista('grupos').sort(u.porNome).map(g =>
            `<label><input type="checkbox" name="grupos" value="${g.id}" ${X.vGrupos.estaEn(a, g.id) ? 'checked' : ''}><span>👥 ${u.esc(g.nome)}</span></label>`).join('')}</div>`) : ''}
          ${ui.campo(t('nai'), ui.selector('nai', opcionsAnimais(x => x.sexo === 'F', a.id), a.nai))}
          ${ui.campo(t('pai'), ui.selector('pai', opcionsAnimais(x => x.sexo === 'M', a.id), a.pai))}
        </div>
        <fieldset class="so-femia"><legend>${t('reproducion')}</legend><div class="grella-campos">
          ${ui.campo(t('ultimoCelo'), ui.dataInp('ultimoCelo', a.ultimoCelo))}
          ${ui.campo(t('ultimoParto'), ui.dataInp('ultimoParto', a.ultimoParto))}
          ${ui.campo(t('cubricion'), ui.dataInp('cubricion', a.cubricion), t('axudaCubricion'))}
          ${ui.campo(t('machoCubricion'), ui.selector('cubricionMacho', opcionsAnimais(x => x.sexo === 'M', a.id), a.cubricionMacho))}
        </div></fieldset>
        ${novo ? '' : `<fieldset><legend>${t('estado')}</legend><div class="grella-campos">
          ${ui.campo(t('dataFalecemento'), ui.dataInp('falecemento', a.falecemento))}
          ${ui.campo(t('causa'), ui.entrada('causaMorte', a.causaMorte))}
          ${ui.campo(t('dataVenda'), ui.dataInp('vendaData', v.data))}
          ${ui.campo(t('comprador'), ui.entrada('vendaComprador', v.comprador))}
          ${ui.campo(t('prezo') + ' (€)', ui.numero('vendaPrezo', v.prezo))}
        </div></fieldset>`}
        ${ui.campo(t('notas'), `<textarea name="notas" rows="3">${u.esc(a.notas || '')}</textarea>`)}
      </div>
      ${ui.pe(ui.btnCancelar() + ui.btnGardar())}
    </form>`;
  }

  function abrirFormulario(id, inicial) {
    const a = id ? D.obter('animais', id) : inicial || null;
    ui.modal.abrir(formulario(a), { volver: id ? () => verFicha(id) : null });
    proporComida(document.querySelector('form[data-form="animal"]'));
  }

  // Propón a comida/día segundo especie, sexo e idade. Só enche o campo
  // se está baleiro ou se o puxo a propia proposta (non se o escribiu o usuario).
  function proporComida(form) {
    const el = form.elements, inp = el.comidaDia, sp = form.querySelector('[data-proposta="comida"]');
    const prev = D.obter('animais', form.dataset.id) || {};
    const sexo = (form.querySelector('[name=sexo]:checked') || {}).value || 'F';
    // A icona (se non hai foto) segue á especie e ao sexo escollidos
    const ph = form.querySelector('.form-foto .ph');
    if (ph) { ph.textContent = c.icono({ especieId: el.especieId.value, sexo }); ph.className = `ph s-${sexo}`; }
    const p = c.comidaProposta({
      ...prev, especieId: el.especieId.value, sexo,
      nacemento: el.nacemento.value || null, pesoNacemento: u.num(el.pesoNacemento.value),
    });
    sp.textContent = p.mama ? ` · ${t('propostaMama', { data: u.data(p.ata) })}` : ` · ${t('propostaComida', { kg: u.kg(p.kg), peso: u.kg(p.peso) })}`;
    if (!inp.dataset.manual) inp.value = p.mama ? '' : p.kg;
  }
  X.cambios['proposta-comida'] = el => proporComida(el.form);

  // Engade ao historial os eventos reprodutivos que cambiaron
  function eventos(prev, a) {
    const hist = [...(a.historial || [])];
    for (const [campo, tipo] of [['ultimoCelo', 'celo'], ['cubricion', 'cubricion'], ['ultimoParto', 'parto']]) {
      const d = a[campo];
      if (d && d !== (prev || {})[campo] && !hist.some(h => h.tipo === tipo && h.data === d)) hist.push({ tipo, data: d });
    }
    return hist;
  }

  X.formularios.animal = async form => {
    const f = new FormData(form);
    const id = form.dataset.id || u.uid();
    const prev = D.obter('animais', id);
    const s = k => (f.get(k) || '').toString().trim() || null;
    const sexo = s('sexo') || 'F';
    const crotal = s('crotal') && RE_CROTAL.test(X.dib.normalizar(s('crotal'))) ? X.dib.normalizar(s('crotal')) : s('crotal');
    const dup = crotal && D.lista('animais').find(x => x.id !== id && X.dib.normalizar(x.crotal) === X.dib.normalizar(crotal));
    if (dup) { ui.toast(t('crotalDuplicado', { id: crotal, nome: dup.nome }), 'erro'); return; }

    // Raza: código pola táboa (busca polo nome) ou o lido do DIB; se o código era descoñecido, apréndeo
    const razas = D.config().razas || {}, raza = s('raza');
    const codLido = s('razaCodigo');
    const codPorNome = raza && Object.keys(razas).find(k => razas[k].toLowerCase() === raza.toLowerCase());
    const razaCodigo = codPorNome || (codLido && !razas[codLido] ? codLido : null);
    if (raza && razaCodigo && !razas[razaCodigo]) D.gardarConfig({ razas: { ...razas, [razaCodigo]: raza } });

    const a = {
      ...(prev || {}), id,
      nome: s('nome'), crotal, especieId: s('especieId'), sexo, raza, razaCodigo,
      nacemento: s('nacemento'), pesoNacemento: u.num(f.get('pesoNacemento')),
      comidaDia: u.num(f.get('comidaDia')), parcelaId: s('parcelaId'), grupos: f.getAll('grupos'),
      nai: s('nai'), pai: s('pai'), notas: s('notas'),
      ultimoCelo: sexo === 'F' ? s('ultimoCelo') : null,
      ultimoParto: sexo === 'F' ? s('ultimoParto') : null,
      cubricion: sexo === 'F' ? s('cubricion') : null,
      cubricionMacho: sexo === 'F' ? s('cubricionMacho') : null,
    };
    if (prev) {
      a.falecemento = s('falecemento');
      a.causaMorte = s('causaMorte');
      a.venda = s('vendaData') ? { data: s('vendaData'), comprador: s('vendaComprador'), prezo: u.num(f.get('vendaPrezo')) } : null;
    }
    const ficheiro = f.get('foto');
    if (ficheiro && ficheiro.size) a.foto = await X.fotos.engadir(id, ficheiro);
    a.historial = eventos(prev, a);
    delete a.grupoId; // formato antigo (un só grupo)
    D.gardarAnimal(a);
    ui.toast(t('gardado'), 'ok');
    verFicha(id);
  };

  X.cambios.sexo = el => { el.form.dataset.sexo = el.value; proporComida(el.form); };
  X.cambios['previa-foto'] = el => {
    const fx = el.files && el.files[0], img = el.parentElement.querySelector('img.previa');
    if (!fx || !img) return;
    img.src = URL.createObjectURL(fx);
    img.hidden = false;
  };
  X.cambios['foto-animal'] = async el => {
    const fx = el.files && el.files[0];
    const a = D.obter('animais', el.dataset.id);
    if (!fx || !a) return;
    try {
      const ruta = await X.fotos.engadir(a.id, fx);
      D.gardarAnimal({ ...a, foto: ruta });
      ui.toast(t('fotoGardada'), 'ok');
    } catch (e) { ui.toast(e.message, 'erro'); }
  };

  // ---------- Modais pequenos ----------
  function modalSimple(titulo, form, campos, id, txtGardar) {
    ui.modal.abrir(`<form data-form="${form}" data-id="${id}" class="modal-form peq">
      ${ui.cab(titulo, true)}<div class="modal-corpo"><div class="grella-campos">${campos}</div></div>
      ${ui.pe(ui.btnCancelar() + ui.btnGardar(txtGardar))}</form>`, { volver: () => verFicha(id) });
  }

  X.accions['cubricion'] = el => {
    const a = D.obter('animais', el.dataset.id);
    modalSimple(t('rexistrarCubricion'), 'cubricion', ui.campo(t('data'), ui.dataInp('data', u.hoxe(), 'required'))
      + ui.campo(t('machoCubricion'), ui.selector('macho', opcionsAnimais(x => x.sexo === 'M' && x.especieId === a.especieId && c.activo(x), a.id), a.cubricionMacho)), a.id);
  };
  X.formularios.cubricion = form => {
    const f = new FormData(form), a = D.obter('animais', form.dataset.id);
    const n = { ...a, cubricion: f.get('data'), cubricionMacho: f.get('macho') || null };
    n.historial = eventos(a, n);
    D.gardarAnimal(n);
    verFicha(a.id);
  };

  X.accions['celo-hoxe'] = el => {
    const a = D.obter('animais', el.dataset.id);
    const n = { ...a, ultimoCelo: u.hoxe() };
    n.historial = eventos(a, n);
    D.gardarAnimal(n);
    ui.toast(t('celoRexistrado', { nome: a.nome }), 'ok', { texto: t('desfacer'), fn: () => D.gardarAnimal(a) });
  };

  X.accions['pesaxe'] = el => modalSimple(t('rexistrarPesaxe'), 'pesaxe',
    ui.campo(t('data'), ui.dataInp('data', u.hoxe(), 'required')) + ui.campo(t('pesoKg'), ui.numero('kg', '', 'required autofocus')), el.dataset.id);
  X.formularios.pesaxe = form => {
    const f = new FormData(form), a = D.obter('animais', form.dataset.id);
    const pesaxes = [...(a.pesaxes || []).filter(p => p.data !== f.get('data')), { data: f.get('data'), kg: u.num(f.get('kg')) }];
    D.gardarAnimal({ ...a, pesaxes });
    verFicha(a.id);
  };
  X.accions['borrar-pesaxe'] = el => {
    const a = D.obter('animais', el.dataset.id);
    D.gardarAnimal({ ...a, pesaxes: (a.pesaxes || []).filter(p => !(p.data === el.dataset.data && String(p.kg) === el.dataset.kg)) });
  };

  X.accions['venda'] = el => modalSimple(t('marcarVendido'), 'venda',
    ui.campo(t('dataVenda'), ui.dataInp('data', u.hoxe(), 'required'))
    + ui.campo(t('comprador'), ui.entrada('comprador', '', 'autofocus'))
    + ui.campo(t('prezo') + ' (€)', ui.numero('prezo', '')), el.dataset.id, t('marcarVendido'));
  X.formularios.venda = form => {
    const f = new FormData(form), a = D.obter('animais', form.dataset.id);
    D.gardarAnimal({ ...a, venda: { data: f.get('data'), comprador: (f.get('comprador') || '').trim() || null, prezo: u.num(f.get('prezo')) } });
    verFicha(a.id);
  };

  X.accions['falecemento'] = el => modalSimple(t('marcarFalecido'), 'falecemento',
    ui.campo(t('dataFalecemento'), ui.dataInp('data', u.hoxe(), 'required'))
    + ui.campo(t('causa'), ui.entrada('causa', '')), el.dataset.id, t('marcarFalecido'));
  X.formularios.falecemento = form => {
    const f = new FormData(form), a = D.obter('animais', form.dataset.id);
    D.gardarAnimal({ ...a, falecemento: f.get('data'), causaMorte: (f.get('causa') || '').trim() || null });
    verFicha(a.id);
  };

  X.accions['desfacer-estado'] = async el => {
    const a = D.obter('animais', el.dataset.id);
    if (!await ui.confirmar(c.estado(a) === 'vendido' ? t('confDesfacerVenda') : t('confDesfacerFalecemento'))) return;
    D.gardarAnimal({ ...a, venda: null, falecemento: null, causaMorte: null });
  };

  X.accions['borrar-animal'] = async el => {
    const a = D.obter('animais', el.dataset.id);
    if (!await ui.confirmar(t('confBorrarAnimal', { nome: a.nome }), { aceptar: t('eliminar'), perigo: true })) return;
    D.lote(() => {
      D.gardarAnimal({ ...a, parcelaId: null }); // libera a parcela con cálculo correcto
      D.borrar('animais', a.id);
    });
    ui.modal.pechar();
    ui.toast(t('eliminado'));
  };

  // ---------- Crías ----------
  function filasCrias(n, e) {
    let h = '';
    for (let i = 0; i < n; i++) {
      h += `<div class="fila-cria"><span class="num">${i + 1}</span>
        ${ui.entrada(`nome${i}`, '', `placeholder="${t('nome')}" autocomplete="off"`)}
        ${ui.entrada(`crotal${i}`, '', `placeholder="${t('crotal')}" autocomplete="off"`)}
        ${ui.selector(`sexo${i}`, [['F', '♀'], ['M', '♂']], 'F')}
        ${ui.numero(`peso${i}`, '', `placeholder="${u.numero(e.pesoNac)} kg"`)}</div>`;
    }
    return h;
  }

  X.accions['cria'] = el => {
    const a = D.obter('animais', el.dataset.id), e = c.especie(a);
    ui.modal.abrir(`<form data-form="cria" data-id="${a.id}" class="modal-form">
      ${ui.cab(t('rexistrarCriaDe', { nome: u.esc(a.nome) }), true)}
      <div class="modal-corpo">
        <div class="grella-campos">
          ${ui.campo(t('dataParto'), ui.dataInp('data', u.hoxe(), 'required'))}
          ${ui.campo(t('numeroCrias'), ui.numero('n', 1, 'min="1" max="20" step="1" data-cambio="n-crias"'))}
          ${ui.campo(t('pai'), ui.selector('pai', opcionsAnimais(x => x.sexo === 'M', a.id), a.cubricionMacho))}
        </div>
        <h4>${t('crias')}</h4>
        <div class="filas-crias" data-especie="${a.especieId}">${filasCrias(1, e)}</div>
        <p class="nota">${t('notaCrias')}</p>
      </div>
      ${ui.pe(ui.btnCancelar() + ui.btnGardar(t('rexistrar')))}
    </form>`, { volver: () => verFicha(a.id) });
  };
  X.cambios['n-crias'] = el => {
    const n = Math.max(1, Math.min(20, parseInt(el.value, 10) || 1));
    const caixa = el.form.querySelector('.filas-crias');
    const a = D.obter('animais', el.form.dataset.id);
    caixa.innerHTML = filasCrias(n, c.especie(a));
  };
  X.formularios.cria = form => {
    const f = new FormData(form), nai = D.obter('animais', form.dataset.id);
    const data = f.get('data'), n = form.querySelectorAll('.fila-cria').length;
    const ids = [];
    D.lote(() => {
      for (let i = 0; i < n; i++) {
        const id = u.uid();
        ids.push(id);
        D.gardarAnimal({
          id, especieId: nai.especieId, nacemento: data,
          nome: (f.get(`nome${i}`) || '').trim() || `${t('cria')} ${nai.nome}${n > 1 ? ' ' + (i + 1) : ''}`,
          crotal: (f.get(`crotal${i}`) || '').trim() || null,
          sexo: f.get(`sexo${i}`) || 'F', pesoNacemento: u.num(f.get(`peso${i}`)),
          nai: nai.id, pai: f.get('pai') || null, parcelaId: nai.parcelaId || null, comidaDia: null,
        });
      }
      const hist = [...(nai.historial || []), { tipo: 'parto', data, crias: ids }];
      D.gardarAnimal({ ...nai, ultimoParto: data, cubricion: null, cubricionMacho: null, historial: hist });
    });
    ui.toast(X.tp('criasRexistradas', n), 'ok');
    verFicha(nai.id);
  };

  // ---------- Accións da lista ----------
  X.accions['ver-animal'] = el => verFicha(el.dataset.id);
  X.accions['novo-animal'] = () => abrirFormulario(null);
  X.accions['editar-animal'] = el => abrirFormulario(el.dataset.id);
  X.accions['filtro-animais'] = el => { filtro[el.dataset.campo] = el.dataset.valor; X.app.render(); };
  X.entradas['busca-animais'] = el => { filtro.q = el.value; X.app.render(); };

  return { render, verFicha, abrirFormulario, opcionsAnimais };
})();
