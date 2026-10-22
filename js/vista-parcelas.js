'use strict';

// Pestana Parcelas: pastos, silo/alpacas e almacén
X.vParcelas = (() => {
  const u = X.u, ui = X.ui, c = X.calc, D = X.datos;
  const t = (...a) => X.t(...a);
  const TIPOS_UNIDADE = () => [t('alpaca'), t('bolaSilo'), t('rolo'), t('paquete')];

  // ---------- Representación ----------
  function nivel(p) {
    const cap = c.capacidade(p), s = c.stock(p);
    const pct = isFinite(cap) ? Math.max(0, Math.min(100, s / cap * 100)) : (s > 0 ? 60 : 0);
    const pr = p.tipo === 'forraxe' ? null : c.prevision(p);
    let cls = pct < 20 ? 'baixo' : pct < 50 ? 'medio' : 'alto';
    if (pr && pr.tipo === 'baixa' && pr.dias <= D.config().avisos.comida) cls = 'baixo';
    return { pct, cls, s, cap, pr };
  }

  const avatar = a => `<span class="avatar" title="${u.esc(a.nome)}">${ui.foto(a)}</span>`;

  function campoVisual(p, grande = false) {
    const n = nivel(p), an = p.tipo === 'forraxe' ? [] : c.animaisParcela(p), max = grande ? 14 : 7;
    return `<div class="campo-visual ${p.tipo === 'forraxe' ? 'forraxe' : ''} ${n.cls} ${grande ? 'grande' : ''}" style="--nivel:${n.pct.toFixed(1)}%">
      <div class="herba"></div>
      ${an.length ? `<div class="rabano">${an.slice(0, max).map(avatar).join('')}${an.length > max ? `<span class="avatar mais">+${an.length - max}</span>` : ''}</div>` : ''}
      ${isFinite(n.cap) ? `<span class="pct">${Math.round(n.pct)}%</span>` : ''}
    </div>`;
  }

  function textoPrevision(pr) {
    if (!pr) return '';
    if (pr.tipo === 'baixa') return pr.s <= 0
      ? `<span class="vermello">${t('senComida')}</span>`
      : t('comidaParaAta', { dias: pr.dias < 1 ? t('menosDunDia') : u.dias(Math.floor(pr.dias)), data: u.data(u.sumar(u.hoxe(), Math.floor(pr.dias))) });
    if (pr.tipo === 'enche') return t('encheEn', { en: u.enDias(Math.ceil(pr.dias)) });
    if (pr.tipo === 'chea') return t('cheaPerde', { kg: u.kg(pr.b) });
    return t('estable');
  }

  const signo = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + u.kg(Math.abs(n));

  function tarxetaPasto(p) {
    const n = nivel(p), cons = c.consumo(p), b = (+p.crecemento || 0) - cons;
    return `<article class="tarxeta-parcela" data-accion="ver-parcela" data-id="${p.id}" tabindex="0">
      ${campoVisual(p)}
      <div class="info">
        <div class="nome-fila"><h3>${u.esc(p.nome)}</h3>${p.superficie ? `<span class="sub">${u.numero(p.superficie, 2)} ha</span>` : ''}</div>
        <div class="stock"><b>${u.kg(n.s)}</b>${isFinite(n.cap) ? ` / ${u.kg(n.cap)}` : ''}</div>
        <div class="balance"><span class="pos">+${u.kg(+p.crecemento || 0)}</span> <span class="neg">−${u.kg(cons)}</span> = <b class="${b < 0 ? 'neg' : 'pos'}">${signo(b)}/${t('dia')}</b></div>
        <div class="prev">${textoPrevision(n.pr)}</div>
      </div>
    </article>`;
  }

  function tarxetaForraxe(p) {
    const s = c.stock(p), unid = p.kgUnidade ? s / p.kgUnidade : null;
    const d = p.dataColleita ? u.entre(u.hoxe(), p.dataColleita) : null;
    return `<article class="tarxeta-parcela" data-accion="ver-parcela" data-id="${p.id}" tabindex="0">
      ${campoVisual(p)}
      <div class="info">
        <div class="nome-fila"><h3>${u.esc(p.nome)}</h3>${p.superficie ? `<span class="sub">${u.numero(p.superficie, 2)} ha</span>` : ''}</div>
        <div class="stock"><b>${u.kg(s)}</b> ${t('acumulado')}${unid != null ? ` · ≈ ${u.numero(unid, 0)} ${u.esc(p.tipoUnidade || t('alpaca'))}` : ''}</div>
        <div class="balance"><span class="pos">+${u.kg(+p.crecemento || 0)}/${t('dia')}</span></div>
        <div class="prev">${d == null ? t('senDataColleita') : `<span class="${d < 0 ? 'vermello' : d <= D.config().avisos.colleita ? 'ambar' : ''}">${t('colleitaPrevista', { data: u.data(p.dataColleita), en: d < 0 ? t('atrasada') : u.enDias(d) })}</span>`}</div>
        <div class="botons"><button class="btn peq" data-accion="colleitar" data-id="${p.id}">🌾 ${t('colleitar')}</button></div>
      </div>
    </article>`;
  }

  function iconasAlpacas(l) {
    const tot = +l.unidades || 0, rest = c.restantes(l);
    if (tot > 60) return `<div class="alpacas"><span class="alpaca"></span> × ${rest}</div>`;
    let h = '';
    for (let i = 0; i < tot; i++) h += `<span class="alpaca ${i < rest ? '' : 'gastada'}"></span>`;
    return `<div class="alpacas">${h}</div>`;
  }

  function filaLote(l) {
    const p = D.obter('parcelas', l.parcelaId), rest = c.restantes(l);
    return `<div class="lote ${rest ? '' : 'esgotado'}">
      <button class="lote-info" data-accion="ver-lote" data-id="${l.id}">
        <b>${u.esc(l.tipo || t('alpaca'))}</b>
        <small>${p ? u.esc(p.nome) : l.parcelaId ? '—' : t('comprado')} · ${u.data(l.data)}${l.kgUnidade ? ` · ${u.kg(l.kgUnidade)}/u` : ''}</small>
      </button>
      ${iconasAlpacas(l)}
      <div class="lote-num"><b>${rest}</b>/${l.unidades}</div>
      <div class="lote-acc">
        <button class="btn peq" data-accion="gastar" data-id="${l.id}" ${rest ? '' : 'disabled'}>−1</button>
        <button class="btn peq" data-accion="gastar-varias" data-id="${l.id}" ${rest ? '' : 'disabled'}>${t('gastar')}…</button>
      </div>
    </div>`;
  }

  function seccionAlmacen() {
    const lotes = D.lista('lotes').sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    const activos = lotes.filter(l => c.restantes(l) > 0), esgotados = lotes.filter(l => !c.restantes(l));
    const tot = {};
    activos.forEach(l => { const k = l.tipo || t('alpaca'); tot[k] = (tot[k] || 0) + c.restantes(l); });
    return `<section class="seccion-parcelas" id="almacen">
      <div class="seccion-cab"><h2>🏚️ ${t('almacen')}</h2>
        <button class="btn" data-accion="novo-lote">${ui.ic('plus')}<span>${t('engadirLote')}</span></button></div>
      ${Object.keys(tot).length ? `<div class="totais">${Object.entries(tot).map(([k, n]) => `<div class="total"><b>${n}</b><span>${u.esc(k)}</span></div>`).join('')}</div>` : ''}
      ${activos.length ? `<div class="lotes">${activos.map(filaLote).join('')}</div>` : `<p class="nota">${t('almacenBaleiro')}</p>`}
      ${esgotados.length ? `<details class="grupo"><summary><h3>${t('esgotados')} <span class="conta">${esgotados.length}</span></h3></summary><div class="lotes">${esgotados.map(filaLote).join('')}</div></details>` : ''}
    </section>`;
  }

  function render(main) {
    const parcelas = D.lista('parcelas').sort(u.porNome);
    const pastos = parcelas.filter(p => p.tipo !== 'forraxe'), forraxes = parcelas.filter(p => p.tipo === 'forraxe');
    const av = c.avisos().filter(a => a.ref.tipo !== 'animal');
    const activos = D.lista('animais').filter(c.activo);
    const senParcela = activos.filter(a => !D.obter('parcelas', a.parcelaId)).length;
    const crec = pastos.reduce((s, p) => s + (+p.crecemento || 0), 0), cons = pastos.reduce((s, p) => s + c.consumo(p), 0);

    const resumo = pastos.length ? `<div class="resumo">
      <div><b>${pastos.length}</b><span>${t('pastos')}</span></div>
      <div><b>${activos.length - senParcela}</b><span>${t('animaisAsignados')}</span></div>
      ${senParcela ? `<div class="ambar"><b>${senParcela}</b><span>${t('senParcela')}</span></div>` : ''}
      <div><b class="${crec - cons < 0 ? 'neg' : 'pos'}">${signo(crec - cons)}</b><span>${t('balanceTotalDia')}</span></div>
    </div>` : '';

    main.innerHTML = `${ui.tiraAvisos(av)}${resumo}
      <section class="seccion-parcelas">
        <div class="seccion-cab"><h2>🌿 ${t('pastos')}</h2>
          <button class="btn primario" data-accion="nova-parcela" data-tipo="pasto">${ui.ic('plus')}<span>${t('novaParcela')}</span></button></div>
        ${pastos.length ? `<div class="grella-parcelas">${pastos.map(tarxetaPasto).join('')}</div>` : `<div class="baleiro peq"><p>${t('senPastos')}</p></div>`}
      </section>
      <section class="seccion-parcelas">
        <div class="seccion-cab"><h2>🌾 ${t('tipoForraxe')}</h2>
          <button class="btn" data-accion="nova-parcela" data-tipo="forraxe">${ui.ic('plus')}<span>${t('novaParcela')}</span></button></div>
        ${forraxes.length ? `<div class="grella-parcelas">${forraxes.map(tarxetaForraxe).join('')}</div>` : `<p class="nota">${t('senForraxe')}</p>`}
      </section>
      ${seccionAlmacen()}`;
  }

  // ---------- Ficha da parcela ----------
  const fila = (etq, val) => `<div class="fila"><dt>${etq}</dt><dd>${val}</dd></div>`;

  function ficha(id) {
    const p = D.obter('parcelas', id);
    if (!p) return null;
    const forraxe = p.tipo === 'forraxe', n = nivel(p);
    let corpo;
    if (forraxe) {
      const lotes = D.lista('lotes').filter(l => l.parcelaId === p.id).sort((a, b) => b.data.localeCompare(a.data));
      corpo = `<dl class="datos">
          ${fila(t('tipo'), t('tipoForraxe'))}
          ${p.superficie ? fila(t('superficie'), `${u.numero(p.superficie, 2)} ha`) : ''}
          ${fila(t('acumuladoEtq'), `<b>${u.kg(n.s)}</b>${p.kgUnidade ? ` (≈ ${u.numero(n.s / p.kgUnidade, 0)} ${u.esc(p.tipoUnidade || t('alpaca'))})` : ''}`)}
          ${fila(t('crecemento'), `${u.kg(+p.crecemento || 0)}/${t('dia')}`)}
          ${fila(t('ultimaColleita'), u.data(p.ultimaColleita))}
          ${fila(t('proximaColleita'), p.dataColleita ? `${u.data(p.dataColleita)} (${u.entre(u.hoxe(), p.dataColleita) < 0 ? t('atrasada') : u.enDias(u.entre(u.hoxe(), p.dataColleita))})` : '—')}
        </dl>
        <div class="botons"><button class="btn primario" data-accion="colleitar" data-id="${p.id}">🌾 ${t('marcarColleitada')}</button>
          <button class="btn" data-accion="axustar-stock" data-id="${p.id}">${t('axustarStock')}</button></div>
        <section class="seccion"><h3>${t('colleitas')}</h3>
          ${lotes.length ? `<div class="lotes">${lotes.map(filaLote).join('')}</div>` : `<p class="nota">${t('senColleitas')}</p>`}</section>`;
    } else {
      const an = c.animaisParcela(p).sort(u.porNome), cons = c.consumo(p), b = (+p.crecemento || 0) - cons;
      corpo = `<dl class="datos">
          ${p.superficie ? fila(t('superficie'), `${u.numero(p.superficie, 2)} ha`) : ''}
          ${fila(t('stockActual'), `<b>${u.kg(n.s)}</b>${isFinite(n.cap) ? ` / ${u.kg(n.cap)}` : ''}`)}
          ${fila(t('crecemento'), `+${u.kg(+p.crecemento || 0)}/${t('dia')}`)}
          ${fila(t('consumo'), `−${u.kg(cons)}/${t('dia')}`)}
          ${fila(t('balance'), `<b class="${b < 0 ? 'neg' : 'pos'}">${signo(b)}/${t('dia')}</b>`)}
          ${fila(t('prevision'), textoPrevision(n.pr))}
        </dl>
        <div class="botons"><button class="btn" data-accion="axustar-stock" data-id="${p.id}">${t('axustarStock')}</button></div>
        <section class="seccion"><h3>${t('animaisAsignados')} (${an.length})</h3>
          ${an.length ? X.vGrupos.repartir(an).map(b => `
            ${b.grupo ? `<div class="cab-grupo"><button class="enlace" data-accion="ver-grupo" data-id="${b.grupo.id}">👥 ${u.esc(b.grupo.nome)}</button>
              <small>${X.tp('nAnimais', b.animais.length)}</small><span class="espazo"></span>
              <button class="btn peq" data-accion="quitar-grupo-parcela" data-id="${p.id}" data-grupo="${b.grupo.id}">${ui.ic('x')}<span>${t('quitarGrupo')}</span></button></div>`
            : X.vGrupos.repartir(an).length > 1 ? `<div class="cab-grupo"><small>${t('senGrupo')}</small></div>` : ''}
            <ul class="lista-animais">${b.animais.map(a => `<li>
            <button class="mini-animal" data-accion="ver-animal" data-id="${a.id}"><span class="foto">${ui.foto(a)}</span>
              <span>${u.esc(a.nome)}<small>${a.comidaDia ? u.kg(a.comidaDia) + '/' + t('dia') : t('senComidaDefinida')}</small></span></button>
            <button class="btn-icono peq" data-accion="quitar-animal" data-id="${a.id}" aria-label="${t('quitar')}">${ui.ic('x')}</button></li>`).join('')}</ul>`).join('')
          : `<p class="nota">${t('senAnimaisParcela')}</p>`}
          <div class="botons"><button class="btn primario" data-accion="asignar" data-id="${p.id}">${ui.ic('plus')}<span>${t('asignarAnimais')}</span></button></div>
        </section>`;
    }
    return `${ui.cab(u.esc(p.nome))}
      <div class="modal-corpo ficha">${campoVisual(p, true)}${corpo}
        ${p.notas ? `<section class="seccion"><h3>${t('notas')}</h3><p class="notas">${u.esc(p.notas)}</p></section>` : ''}</div>
      ${ui.pe(`<button class="btn perigo-texto" data-accion="borrar-parcela" data-id="${p.id}">${ui.ic('trash')}<span>${t('eliminar')}</span></button>
        <span class="espazo"></span>
        <button class="btn primario" data-accion="editar-parcela" data-id="${p.id}">${ui.ic('edit')}<span>${t('editar')}</span></button>`)}`;
  }

  const verFicha = id => ui.modal.mostrar(() => ficha(id));

  // ---------- Formulario ----------
  function formulario(p, tipo) {
    const novo = !p;
    p = p || { tipo: tipo || 'pasto' };
    const stockAct = novo ? '' : Math.round(c.stock(p) * 10) / 10;
    return `<form data-form="parcela" data-id="${p.id || ''}" data-tipo="${p.tipo}" class="modal-form">
      ${ui.cab(novo ? t('novaParcela') : t('editarParcela'), !novo)}
      <div class="modal-corpo">
        <div class="grella-campos">
          ${ui.campo(t('nome') + ' *', ui.entrada('nome', p.nome, 'required autofocus autocomplete="off"'))}
          ${ui.campo(t('tipo'), `<div class="segmentado">
            <label><input type="radio" name="tipo" value="pasto" ${p.tipo !== 'forraxe' ? 'checked' : ''} data-cambio="tipo-parcela"><span>🌿 ${t('tipoPasto')}</span></label>
            <label><input type="radio" name="tipo" value="forraxe" ${p.tipo === 'forraxe' ? 'checked' : ''} data-cambio="tipo-parcela"><span>🌾 ${t('tipoForraxe')}</span></label></div>`,
            `<span class="so-forraxe">${t('axudaForraxe')}</span>`)}
          ${ui.campo(t('superficie') + ' (ha)', ui.numero('superficie', p.superficie, 'data-input="superficie-parcela"'))}
          ${ui.campo(t('capacidade') + ' (kg)', ui.numero('capacidade', p.capacidade, `data-input="manual" ${p.capacidade != null ? 'data-manual="1"' : ''}`),
            `${t('axudaCapacidade')}<span class="proposta" data-proposta="capacidade"></span>`)}
          ${ui.campo(t('crecemento') + ' (kg/' + t('dia') + ')', ui.numero('crecemento', p.crecemento, `data-input="manual" ${p.crecemento != null ? 'data-manual="1"' : ''}`),
            `${t('axudaCrecemento')}<span class="proposta" data-proposta="crecemento"></span>`)}
          ${ui.campo(t('stockActual') + ' (kg)', ui.numero('stock', stockAct, `placeholder="${novo ? t('igualCapacidade') : ''}"`), t('axudaStock'))}
        </div>
        <fieldset class="so-forraxe"><legend>${t('tipoForraxe')}</legend><div class="grella-campos">
          ${ui.campo(t('proximaColleita'), ui.dataInp('dataColleita', p.dataColleita))}
          ${ui.campo(t('tipoUnidade'), ui.entrada('tipoUnidade', p.tipoUnidade || t('alpaca'), 'list="tiposUnidade"') + `<datalist id="tiposUnidade">${TIPOS_UNIDADE().map(x => `<option value="${x}">`).join('')}</datalist>`)}
          ${ui.campo(t('kgUnidade'), ui.numero('kgUnidade', p.kgUnidade), t('axudaKgUnidade'))}
        </div></fieldset>
        ${ui.campo(t('notas'), `<textarea name="notas" rows="3">${u.esc(p.notas || '')}</textarea>`)}
      </div>
      ${ui.pe(ui.btnCancelar() + ui.btnGardar())}
    </form>`;
  }

  X.cambios['tipo-parcela'] = el => { el.form.dataset.tipo = el.value; };

  // Propón capacidade e crecemento segundo as hectáreas (valores por ha en Configuración).
  // Só enche os campos que o usuario non escribiu a man.
  function proporParcela(form, encher) {
    const cfg = D.config().parcelas, ha = u.num(form.elements.superficie.value);
    const propostas = { capacidade: Math.round(ha * cfg.kgHa / 10) * 10, crecemento: Math.round(ha * cfg.crecHa * 10) / 10 };
    for (const [campo, v] of Object.entries(propostas)) {
      const inp = form.elements[campo], sp = form.querySelector(`[data-proposta="${campo}"]`);
      sp.textContent = ha ? ` · ${t('propostaHa', { v: u.kg(v), ha: u.numero(ha, 2) })}` : '';
      if (encher && ha && !inp.dataset.manual) inp.value = v;
    }
  }
  X.entradas['superficie-parcela'] = el => proporParcela(el.form, true);

  X.formularios.parcela = form => {
    const f = new FormData(form), id = form.dataset.id || u.uid(), prev = D.obter('parcelas', id);
    const s = k => (f.get(k) || '').toString().trim() || null;
    const tipo = s('tipo') || 'pasto';
    const cap = u.num(f.get('capacidade'));
    let stock = u.num(f.get('stock'));
    if (stock == null) stock = prev ? c.stock(prev) : (tipo === 'forraxe' ? 0 : cap || 0);
    if (cap) stock = Math.min(stock, cap);
    // Ao pasala a Silo/Alpacas, os animais (activos ou non) quedan sen parcela
    const an = prev && tipo === 'forraxe' ? D.lista('animais').filter(a => a.parcelaId === id) : [];
    const p = {
      ...(prev || {}), id, nome: s('nome'), tipo,
      superficie: u.num(f.get('superficie')), capacidade: cap, crecemento: u.num(f.get('crecemento')),
      stock, stockData: u.hoxe(), notas: s('notas'),
      dataColleita: tipo === 'forraxe' ? s('dataColleita') : null,
      tipoUnidade: tipo === 'forraxe' ? s('tipoUnidade') : null,
      kgUnidade: tipo === 'forraxe' ? u.num(f.get('kgUnidade')) : null,
    };
    D.lote(() => {
      an.forEach(a => D.gardar('animais', { ...a, parcelaId: null }));
      D.gardar('parcelas', p);
    });
    const nActivos = an.filter(c.activo).length;
    ui.toast(nActivos ? X.tp('animaisDesligados', nActivos) : t('gardado'), 'ok');
    verFicha(id);
  };

  // ---------- Accións ----------
  X.accions['ver-parcela'] = el => verFicha(el.dataset.id);
  X.accions['nova-parcela'] = el => ui.modal.abrir(formulario(null, el.dataset.tipo));
  X.accions['editar-parcela'] = el => {
    ui.modal.abrir(formulario(D.obter('parcelas', el.dataset.id)), { volver: () => verFicha(el.dataset.id) });
    proporParcela(document.querySelector('form[data-form="parcela"]'), false);
  };

  X.accions['borrar-parcela'] = async el => {
    const p = D.obter('parcelas', el.dataset.id);
    if (!await ui.confirmar(t('confBorrarParcela', { nome: p.nome }), { aceptar: t('eliminar'), perigo: true })) return;
    D.lote(() => {
      D.lista('animais').filter(a => a.parcelaId === p.id).forEach(a => D.gardar('animais', { ...a, parcelaId: null }));
      D.borrar('parcelas', p.id);
    });
    ui.modal.pechar();
    ui.toast(t('eliminado'));
  };

  X.accions['quitar-animal'] = el => {
    const a = D.obter('animais', el.dataset.id);
    D.gardarAnimal({ ...a, parcelaId: null });
  };

  X.accions['axustar-stock'] = el => {
    const p = D.obter('parcelas', el.dataset.id);
    ui.modal.abrir(`<form data-form="axustar-stock" data-id="${p.id}" class="modal-form peq">
      ${ui.cab(t('axustarStock'), true)}
      <div class="modal-corpo"><p class="nota">${t('axudaAxuste')}</p><div class="grella-campos">
        ${ui.campo(t('stockActual') + ' (kg)', ui.numero('stock', Math.round(c.stock(p)), 'required autofocus'), isFinite(c.capacidade(p)) ? t('maximo', { kg: u.kg(p.capacidade) }) : '')}
      </div></div>
      ${ui.pe(ui.btnCancelar() + ui.btnGardar())}</form>`, { volver: () => verFicha(p.id) });
  };
  X.formularios['axustar-stock'] = form => {
    const p = D.obter('parcelas', form.dataset.id);
    const s = Math.min(c.capacidade(p), Math.max(0, u.num(new FormData(form).get('stock')) || 0));
    D.gardar('parcelas', { ...p, stock: s, stockData: u.hoxe() });
    verFicha(p.id);
  };

  // Asignar animais (lista con caixas de verificación)
  X.accions['asignar'] = el => {
    const p = D.obter('parcelas', el.dataset.id);
    const an = D.lista('animais').filter(c.activo).sort(u.porNome);
    const filaAnimal = a => {
      const outra = a.parcelaId && a.parcelaId !== p.id && D.obter('parcelas', a.parcelaId);
      return `<label class="check-animal"><input type="checkbox" name="a" value="${a.id}" ${a.parcelaId === p.id ? 'checked' : ''} data-cambio="check-animal">
        <span class="foto">${ui.foto(a)}</span>
        <span class="txt"><b>${u.esc(a.nome)}</b><small>${a.crotal ? u.esc(a.crotal) + ' · ' : ''}${a.comidaDia ? u.kg(a.comidaDia) + '/' + t('dia') : t('senComidaDefinida')}${outra ? ` · 📍 ${u.esc(outra.nome)}` : ''}</small></span></label>`;
    };
    // Cada grupo leva unha caixa que marca/desmarca todos os seus animais
    const bloques = X.vGrupos.repartir(an).map(b => `<div class="bloque-grupo">
      ${b.grupo ? `<label class="check-grupo"><input type="checkbox" data-cambio="check-grupo">
        <span>👥 <b>${u.esc(b.grupo.nome)}</b> <small>${X.tp('nAnimais', b.animais.length)} · ${t('grupoEnteiro')}</small></span></label>`
        : `<h4>${t('senGrupo')}</h4>`}
      <div class="lista-check">${b.animais.map(filaAnimal).join('')}</div></div>`).join('');
    ui.modal.abrir(`<form data-form="asignar" data-id="${p.id}" class="modal-form">
      ${ui.cab(t('asignarA', { nome: u.esc(p.nome) }), true)}
      <div class="modal-corpo">${an.length ? bloques : `<p class="nota">${t('senAnimaisActivos')}</p>`}</div>
      ${ui.pe(ui.btnCancelar() + ui.btnGardar())}</form>`, { volver: () => verFicha(p.id) });
    document.querySelectorAll('#modal .bloque-grupo').forEach(sincronizarGrupo);
  };

  // Estado da caixa do grupo: marcada (todos), a medias (algúns) ou baleira
  function sincronizarGrupo(bloque) {
    const g = bloque.querySelector('[data-cambio="check-grupo"]');
    if (!g) return;
    const caixas = [...bloque.querySelectorAll('input[name=a]')], n = caixas.filter(i => i.checked).length;
    g.checked = n === caixas.length;
    g.indeterminate = n > 0 && n < caixas.length;
  }
  X.cambios['check-grupo'] = el => {
    el.closest('.bloque-grupo').querySelectorAll('input[name=a]').forEach(i => { i.checked = el.checked; });
  };
  X.cambios['check-animal'] = el => sincronizarGrupo(el.closest('.bloque-grupo'));

  X.accions['quitar-grupo-parcela'] = el => {
    const p = D.obter('parcelas', el.dataset.id);
    D.lote(() => c.animaisParcela(p).filter(a => a.grupoId === el.dataset.grupo).forEach(a => D.gardarAnimal({ ...a, parcelaId: null })));
  };
  X.formularios.asignar = form => {
    const p = D.obter('parcelas', form.dataset.id);
    const sel = new Set(new FormData(form).getAll('a'));
    D.lote(() => {
      for (const a of D.lista('animais').filter(c.activo)) {
        const nova = sel.has(a.id) ? p.id : (a.parcelaId === p.id ? null : a.parcelaId);
        if (nova !== (a.parcelaId || null)) D.gardarAnimal({ ...a, parcelaId: nova });
      }
    });
    verFicha(p.id);
  };

  // Colleita: crea un lote no almacén e pon o acumulado a cero
  X.accions['colleitar'] = el => {
    const p = D.obter('parcelas', el.dataset.id), s = c.stock(p);
    ui.modal.abrir(`<form data-form="colleita" data-id="${p.id}" class="modal-form peq">
      ${ui.cab(t('colleitaDe', { nome: u.esc(p.nome) }), true)}
      <div class="modal-corpo"><p class="nota">${t('acumuladoEstimado', { kg: u.kg(s) })}</p><div class="grella-campos">
        ${ui.campo(t('data'), ui.dataInp('data', u.hoxe(), 'required'))}
        ${ui.campo(t('unidades') + ' *', ui.numero('unidades', p.kgUnidade ? Math.round(s / p.kgUnidade) : '', 'required step="1" min="1" autofocus'))}
        ${ui.campo(t('tipoUnidade'), ui.entrada('tipo', p.tipoUnidade || t('alpaca'), 'list="tiposUnidade2"') + `<datalist id="tiposUnidade2">${TIPOS_UNIDADE().map(x => `<option value="${x}">`).join('')}</datalist>`)}
        ${ui.campo(t('kgUnidade'), ui.numero('kgUnidade', p.kgUnidade))}
        ${ui.campo(t('proximaColleita'), ui.dataInp('proxima', ''))}
      </div></div>
      ${ui.pe(ui.btnCancelar() + ui.btnGardar(t('marcarColleitada')))}</form>`, { volver: () => verFicha(p.id) });
  };
  X.formularios.colleita = form => {
    const f = new FormData(form), p = D.obter('parcelas', form.dataset.id);
    const data = f.get('data'), tipo = (f.get('tipo') || '').trim() || t('alpaca'), kgU = u.num(f.get('kgUnidade'));
    D.lote(() => {
      D.gardar('lotes', { id: u.uid(), parcelaId: p.id, data, tipo, unidades: Math.round(u.num(f.get('unidades')) || 0), kgUnidade: kgU, consumos: [] });
      D.gardar('parcelas', { ...p, stock: 0, stockData: data > u.hoxe() ? u.hoxe() : data, ultimaColleita: data, dataColleita: f.get('proxima') || null, tipoUnidade: tipo, kgUnidade: kgU || p.kgUnidade || null });
    });
    ui.toast(t('colleitaRexistrada'), 'ok');
    verFicha(p.id);
  };

  // ---------- Almacén ----------
  function formLote(l) {
    const novo = !l;
    l = l || { data: u.hoxe(), tipo: t('alpaca') };
    return `<form data-form="lote" data-id="${l.id || ''}" class="modal-form peq">
      ${ui.cab(novo ? t('engadirLote') : t('editarLote'), !novo)}
      <div class="modal-corpo"><div class="grella-campos">
        ${ui.campo(t('data'), ui.dataInp('data', l.data, 'required'))}
        ${ui.campo(t('tipoUnidade'), ui.entrada('tipo', l.tipo, 'list="tiposUnidade3" required') + `<datalist id="tiposUnidade3">${TIPOS_UNIDADE().map(x => `<option value="${x}">`).join('')}</datalist>`)}
        ${ui.campo(t('unidades') + ' *', ui.numero('unidades', l.unidades, 'required step="1" min="0"'))}
        ${ui.campo(t('kgUnidade'), ui.numero('kgUnidade', l.kgUnidade))}
        ${novo ? '' : ui.campo(t('orixe'), ui.selector('parcelaId', [['', t('comprado')], ...D.lista('parcelas').filter(p => p.tipo === 'forraxe').map(p => [p.id, p.nome])], l.parcelaId))}
        ${ui.campo(t('notas'), ui.entrada('notas', l.notas))}
      </div></div>
      ${ui.pe(ui.btnCancelar() + ui.btnGardar())}</form>`;
  }

  function fichaLote(id) {
    const l = D.obter('lotes', id);
    if (!l) return null;
    const p = D.obter('parcelas', l.parcelaId);
    const cons = [...(l.consumos || [])].map((x, i) => ({ ...x, i })).sort((a, b) => b.data.localeCompare(a.data));
    return `${ui.cab(u.esc(l.tipo || t('alpaca')))}
      <div class="modal-corpo ficha">
        <dl class="datos">
          ${fila(t('orixe'), p ? u.esc(p.nome) : l.parcelaId ? '—' : t('comprado'))}
          ${fila(t('data'), u.data(l.data))}
          ${fila(t('restantes'), `<b>${c.restantes(l)}</b> / ${l.unidades}`)}
          ${l.kgUnidade ? fila(t('kgUnidade'), u.kg(l.kgUnidade)) : ''}
          ${l.notas ? fila(t('notas'), u.esc(l.notas)) : ''}
        </dl>
        ${iconasAlpacas(l)}
        <div class="botons">
          <button class="btn" data-accion="gastar" data-id="${l.id}" ${c.restantes(l) ? '' : 'disabled'}>−1</button>
          <button class="btn" data-accion="gastar-varias" data-id="${l.id}" ${c.restantes(l) ? '' : 'disabled'}>${t('gastar')}…</button>
        </div>
        <section class="seccion"><h3>${t('consumos')}</h3>
          ${cons.length ? `<ul class="lista-simple">${cons.map(x => `<li><span>${u.data(x.data)}</span><b>−${x.n}</b>
            <button class="btn-icono peq" data-accion="borrar-consumo" data-id="${l.id}" data-i="${x.i}" aria-label="${t('borrar')}">${ui.ic('x')}</button></li>`).join('')}</ul>`
          : `<p class="nota">${t('senConsumos')}</p>`}
        </section>
      </div>
      ${ui.pe(`<button class="btn perigo-texto" data-accion="borrar-lote" data-id="${l.id}">${ui.ic('trash')}<span>${t('eliminar')}</span></button>
        <span class="espazo"></span>
        <button class="btn primario" data-accion="editar-lote" data-id="${l.id}">${ui.ic('edit')}<span>${t('editar')}</span></button>`)}`;
  }

  const verLote = id => ui.modal.mostrar(() => fichaLote(id));

  function gastar(l, n, data = u.hoxe()) {
    n = Math.min(n, c.restantes(l));
    if (n <= 0) return;
    D.gardar('lotes', { ...l, consumos: [...(l.consumos || []), { data, n }] });
    ui.toast(t('gastadas', { n, tipo: l.tipo || t('alpaca') }), 'ok', { texto: t('desfacer'), fn: () => D.gardar('lotes', l) });
  }

  X.accions['ver-lote'] = el => verLote(el.dataset.id);
  X.accions['novo-lote'] = () => ui.modal.abrir(formLote(null));
  X.accions['editar-lote'] = el => ui.modal.abrir(formLote(D.obter('lotes', el.dataset.id)), { volver: () => verLote(el.dataset.id) });
  X.formularios.lote = form => {
    const f = new FormData(form), id = form.dataset.id || u.uid(), prev = D.obter('lotes', id);
    D.gardar('lotes', {
      consumos: [], ...(prev || {}), id, data: f.get('data'), tipo: (f.get('tipo') || '').trim(),
      unidades: Math.round(u.num(f.get('unidades')) || 0), kgUnidade: u.num(f.get('kgUnidade')),
      parcelaId: prev ? (f.get('parcelaId') || null) : null, notas: (f.get('notas') || '').trim() || null,
    });
    verLote(id);
  };
  X.accions['borrar-lote'] = async el => {
    if (!await ui.confirmar(t('confBorrarLote'), { aceptar: t('eliminar'), perigo: true })) return;
    D.borrar('lotes', el.dataset.id);
    ui.modal.pechar();
  };
  X.accions['gastar'] = el => gastar(D.obter('lotes', el.dataset.id), 1);
  X.accions['gastar-varias'] = el => {
    const l = D.obter('lotes', el.dataset.id);
    const volverA = ui.modal.vista ? ui.modal.vista : null;
    ui.modal.abrir(`<form data-form="gastar" data-id="${l.id}" class="modal-form peq">
      ${ui.cab(t('gastarDe', { tipo: u.esc(l.tipo || t('alpaca')) }), !!volverA)}
      <div class="modal-corpo"><p class="nota">${t('quedan', { n: c.restantes(l) })}</p><div class="grella-campos">
        ${ui.campo(t('cantidade'), ui.numero('n', 1, `required step="1" min="1" max="${c.restantes(l)}" autofocus`))}
        ${ui.campo(t('data'), ui.dataInp('data', u.hoxe(), 'required'))}
      </div></div>
      ${ui.pe(`<button type="button" class="btn" data-accion="${volverA ? 'volver' : 'pechar'}">${t('cancelar')}</button>` + ui.btnGardar(t('gastar')))}</form>`,
    { volver: volverA ? () => ui.modal.mostrar(volverA) : null });
  };
  X.formularios.gastar = form => {
    const f = new FormData(form), l = D.obter('lotes', form.dataset.id);
    const volver = ui.modal.volver;
    gastar(l, Math.round(u.num(f.get('n')) || 0), f.get('data'));
    if (volver) volver(); else ui.modal.pechar();
  };
  X.accions['borrar-consumo'] = el => {
    const l = D.obter('lotes', el.dataset.id), i = +el.dataset.i;
    D.gardar('lotes', { ...l, consumos: (l.consumos || []).filter((_, j) => j !== i) });
  };

  return { render, verFicha, verLote };
})();
