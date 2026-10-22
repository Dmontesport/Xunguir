'use strict';

// Grupos de animais (p. ex. "Vacas paridas", "Xatos"): para filtralos e movelos xuntos de parcela.
// Un animal pode estar en varios grupos (campo `grupos`, lista de ids).
X.vGrupos = (() => {
  const u = X.u, ui = X.ui, c = X.calc, D = X.datos;
  const t = (...a) => X.t(...a);

  // Os animais gardados coa versión anterior teñen `grupoId` (un só grupo)
  const gruposDe = a => Array.isArray(a.grupos) ? a.grupos : (a.grupoId ? [a.grupoId] : []);
  const estaEn = (a, gid) => gruposDe(a).includes(gid);
  const conGrupos = (a, ids) => { const r = { ...a, grupos: [...new Set(ids)] }; delete r.grupoId; return r; };
  const gruposVivos = a => gruposDe(a).map(id => D.obter('grupos', id)).filter(Boolean);

  const membros = g => D.lista('animais').filter(a => estaEn(a, g.id) && c.activo(a)).sort(u.porNome);

  // Onde está o grupo: unha parcela, sen parcela ou repartido
  function ubicacion(g) {
    const ids = [...new Set(membros(g).map(a => (D.obter('parcelas', a.parcelaId) || {}).id || ''))];
    if (!ids.length) return '';
    if (ids.length > 1) return t('grupoRepartido');
    const p = D.obter('parcelas', ids[0]);
    return p ? `📍 ${u.esc(p.nome)}` : t('senParcela');
  }

  // ---------- Lista de grupos ----------
  function lista() {
    const gs = D.lista('grupos').sort(u.porNome);
    return `${ui.cab(t('grupos'))}
      <div class="modal-corpo">
        <p class="nota">${t('axudaGrupos')}</p>
        ${gs.length ? `<div class="lista-grupos">${gs.map(g => {
          const ub = ubicacion(g);
          return `<button class="fila-grupo" data-accion="ver-grupo" data-id="${g.id}">
            <b>👥 ${u.esc(g.nome)}</b><small>${X.tp('nAnimais', membros(g).length)}${ub ? ` · ${ub}` : ''}</small></button>`;
        }).join('')}</div>` : `<p class="baleiro peq">${t('senGrupos')}</p>`}
      </div>
      ${ui.pe(`<button class="btn primario" data-accion="novo-grupo">${ui.ic('plus')}<span>${t('novoGrupo')}</span></button>`)}`;
  }
  const verLista = () => ui.modal.mostrar(lista);

  // ---------- Ficha dun grupo ----------
  function ficha(id) {
    const g = D.obter('grupos', id);
    if (!g) return null;
    const an = membros(g), ub = ubicacion(g);
    const comida = an.reduce((s, a) => s + (+a.comidaDia || 0), 0);
    return `${ui.cab(`👥 ${u.esc(g.nome)}`, true)}
      <div class="modal-corpo ficha">
        <dl class="datos">
          <div class="fila"><dt>${t('animais')}</dt><dd>${an.length}</dd></div>
          ${ub ? `<div class="fila"><dt>${t('parcela')}</dt><dd>${ub}</dd></div>` : ''}
          <div class="fila"><dt>${t('comidaDia')}</dt><dd>${u.kg(comida)}</dd></div>
        </dl>
        <div class="botons">
          <button class="btn" data-accion="membros-grupo" data-id="${g.id}">${ui.ic('plus')}<span>${t('engadirAnimais')}</span></button>
          ${an.length ? `<button class="btn primario" data-accion="mover-grupo" data-id="${g.id}">📍 ${t('moverParcela')}</button>` : ''}
        </div>
        <section class="seccion"><h3>${t('animais')} (${an.length})</h3>
          ${an.length ? `<ul class="lista-animais">${an.map(a => `<li>
            <button class="mini-animal" data-accion="ver-animal" data-id="${a.id}"><span class="foto">${ui.foto(a)}</span>
              <span>${u.esc(a.nome)}<small>${a.crotal ? u.esc(a.crotal) : ''}</small></span></button>
            <button class="btn-icono peq" data-accion="quitar-do-grupo" data-id="${a.id}" data-grupo="${g.id}" aria-label="${t('quitar')}">${ui.ic('x')}</button></li>`).join('')}</ul>`
          : `<p class="nota">${t('senMembros')}</p>`}
        </section>
        ${g.notas ? `<section class="seccion"><h3>${t('notas')}</h3><p class="notas">${u.esc(g.notas)}</p></section>` : ''}
      </div>
      ${ui.pe(`<button class="btn perigo-texto" data-accion="borrar-grupo" data-id="${g.id}">${ui.ic('trash')}<span>${t('eliminar')}</span></button>
        <span class="espazo"></span>
        <button class="btn primario" data-accion="editar-grupo" data-id="${g.id}">${ui.ic('edit')}<span>${t('editar')}</span></button>`)}`;
  }
  const verFicha = id => ui.modal.mostrar(() => ficha(id), verLista);

  // ---------- Formulario ----------
  // `iniciais`: animais que entran no grupo novo (p. ex. ao soltar unha tarxeta enriba doutra)
  function formulario(g, iniciais = []) {
    const novo = !g;
    g = g || {};
    const nomes = iniciais.map(id => (D.obter('animais', id) || {}).nome).filter(Boolean);
    ui.modal.abrir(`<form data-form="grupo" data-id="${g.id || ''}" class="modal-form peq">
      ${ui.cab(novo ? t('novoGrupo') : t('editarGrupo'), !iniciais.length)}
      <div class="modal-corpo">
        ${nomes.length ? `<p class="nota">${t('grupoCon', { nomes: u.esc(nomes.join(', ')) })}</p>` : ''}
        ${iniciais.map(id => `<input type="hidden" name="membro" value="${id}">`).join('')}
        <div class="grella-campos">
          ${ui.campo(t('nome') + ' *', ui.entrada('nome', g.nome, `required autofocus autocomplete="off" placeholder="${t('exemploGrupo')}"`))}
        </div>
        ${ui.campo(t('notas'), `<textarea name="notas" rows="3">${u.esc(g.notas || '')}</textarea>`)}
      </div>
      ${ui.pe(`<button type="button" class="btn" data-accion="${iniciais.length ? 'pechar' : 'volver'}">${t('cancelar')}</button>` + ui.btnGardar())}</form>`,
    { volver: novo ? verLista : () => verFicha(g.id) });
  }

  X.formularios.grupo = form => {
    const f = new FormData(form), id = form.dataset.id || u.uid(), novo = !form.dataset.id;
    const iniciais = f.getAll('membro');
    D.lote(() => {
      D.gardar('grupos', { ...(D.obter('grupos', id) || {}), id, nome: (f.get('nome') || '').trim(), notas: (f.get('notas') || '').trim() || null });
      iniciais.forEach(aid => { const a = D.obter('animais', aid); if (a && !estaEn(a, id)) D.gardarAnimal(conGrupos(a, [...gruposDe(a), id])); });
    });
    if (novo && !iniciais.length) abrirMembros(id);
    else {
      if (iniciais.length) ui.toast(t('grupoCreado', { nome: (f.get('nome') || '').trim() }), 'ok');
      verFicha(id);
    }
  };

  // ---------- Engadir / quitar animais ----------
  function abrirMembros(id) {
    const g = D.obter('grupos', id);
    const an = D.lista('animais').filter(c.activo).sort(u.porNome);
    ui.modal.abrir(`<form data-form="membros-grupo" data-id="${g.id}" class="modal-form">
      ${ui.cab(t('membrosDe', { nome: u.esc(g.nome) }), true)}
      <div class="modal-corpo">${an.length ? `<div class="lista-check">${an.map(a => {
        const outros = gruposVivos(a).filter(x => x.id !== g.id);
        return `<label class="check-animal"><input type="checkbox" name="a" value="${a.id}" ${estaEn(a, g.id) ? 'checked' : ''}>
          <span class="foto">${ui.foto(a)}</span>
          <span class="txt"><b>${u.esc(a.nome)}</b><small>${a.crotal ? u.esc(a.crotal) : ''}${outros.length ? ` · 👥 ${u.esc(outros.map(x => x.nome).join(', '))}` : ''}</small></span></label>`;
      }).join('')}</div>` : `<p class="nota">${t('senAnimaisActivos')}</p>`}</div>
      ${ui.pe(ui.btnCancelar() + ui.btnGardar())}</form>`, { volver: () => verFicha(g.id) });
  }

  X.formularios['membros-grupo'] = form => {
    const id = form.dataset.id, sel = new Set(new FormData(form).getAll('a'));
    D.lote(() => {
      for (const a of D.lista('animais').filter(c.activo)) {
        if (sel.has(a.id) === estaEn(a, id)) continue;
        D.gardarAnimal(conGrupos(a, sel.has(a.id) ? [...gruposDe(a), id] : gruposDe(a).filter(x => x !== id)));
      }
    });
    verFicha(id);
  };

  // Engade un animal a un grupo (ao soltar a tarxeta enriba do grupo)
  function engadir(animalId, gid) {
    const a = D.obter('animais', animalId), g = D.obter('grupos', gid);
    if (!a || !g) return;
    if (estaEn(a, gid)) { ui.toast(t('xaNoGrupo', { nome: a.nome, grupo: g.nome })); return; }
    D.gardarAnimal(conGrupos(a, [...gruposDe(a), gid]));
    ui.toast(t('engadidoAoGrupo', { nome: a.nome, grupo: g.nome }), 'ok', { texto: t('desfacer'), fn: () => D.gardarAnimal(a) });
  }

  // ---------- Mover o grupo enteiro de parcela ----------
  X.accions['mover-grupo'] = el => {
    const g = D.obter('grupos', el.dataset.id);
    const ops = [['', t('senParcela')], ...D.lista('parcelas').filter(p => p.tipo !== 'forraxe').sort(u.porNome).map(p => [p.id, p.nome])];
    const actual = [...new Set(membros(g).map(a => a.parcelaId || ''))];
    ui.modal.abrir(`<form data-form="mover-grupo" data-id="${g.id}" class="modal-form peq">
      ${ui.cab(t('moverGrupoA', { nome: u.esc(g.nome) }), true)}
      <div class="modal-corpo"><div class="grella-campos">${ui.campo(t('parcela'), ui.selector('parcelaId', ops, actual.length === 1 ? actual[0] : ''))}</div>
        <p class="nota">${X.tp('moveranse', membros(g).length)}</p></div>
      ${ui.pe(ui.btnCancelar() + ui.btnGardar(t('mover')))}</form>`, { volver: () => verFicha(g.id) });
  };
  X.formularios['mover-grupo'] = form => {
    const g = D.obter('grupos', form.dataset.id), destino = new FormData(form).get('parcelaId') || null;
    D.lote(() => membros(g).forEach(a => { if ((a.parcelaId || null) !== destino) D.gardarAnimal({ ...a, parcelaId: destino }); }));
    const p = D.obter('parcelas', destino);
    ui.toast(t('grupoMovido', { nome: g.nome, parcela: p ? p.nome : t('senParcela') }), 'ok');
    verFicha(g.id);
  };

  // ---------- Outras accións ----------
  X.accions.grupos = () => verLista();
  X.accions['ver-grupo'] = el => verFicha(el.dataset.id);
  X.accions['novo-grupo'] = () => formulario(null);
  X.accions['editar-grupo'] = el => formulario(D.obter('grupos', el.dataset.id));
  X.accions['membros-grupo'] = el => abrirMembros(el.dataset.id);
  X.accions['quitar-do-grupo'] = el => {
    const a = D.obter('animais', el.dataset.id);
    D.gardarAnimal(conGrupos(a, gruposDe(a).filter(x => x !== el.dataset.grupo)));
  };
  X.accions['borrar-grupo'] = async el => {
    const g = D.obter('grupos', el.dataset.id);
    if (!await ui.confirmar(t('confBorrarGrupo', { nome: g.nome }), { aceptar: t('eliminar'), perigo: true })) return;
    D.lote(() => {
      D.lista('animais').filter(a => estaEn(a, g.id)).forEach(a => D.gardar('animais', conGrupos(a, gruposDe(a).filter(x => x !== g.id))));
      D.borrar('grupos', g.id);
    });
    verLista();
  };

  // Reparte unha lista de animais por grupos: [{ grupo, animais }]. Un animal pode saír en varios;
  // os que non teñen ningún grupo van ao final (grupo = null)
  function repartir(lista) {
    const gs = D.lista('grupos').sort(u.porNome);
    const r = gs.map(g => ({ grupo: g, animais: lista.filter(a => estaEn(a, g.id)) })).filter(b => b.animais.length);
    const sen = lista.filter(a => !gs.some(g => estaEn(a, g.id)));
    if (sen.length) r.push({ grupo: null, animais: sen });
    return r;
  }

  return { gruposDe, gruposVivos, estaEn, conGrupos, membros, repartir, engadir, novo: ids => formulario(null, ids), verFicha, verLista };
})();
