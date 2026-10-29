'use strict';

// Cálculos: peso teórico, ciclo reprodutivo, comida das parcelas, almacén e avisos
X.calc = (() => {
  const u = X.u, t = (...a) => X.t(...a);
  const XENERICA = { id: '', nome: '?', icono: '🐾', ciclo: 21, duracionCelo: 1, xestacion: 150, celoPostParto: 45, pubertade: 365, destete: 90, pesoNac: 10, pesoAdultoF: 100, pesoAdultoM: 120, mantemento: 2, conversion: 6, k: 0.006 };

  const especie = a => X.datos.obter('especies', a.especieId) || XENERICA;
  // Icona do macho para as especies que aínda non a teñen gardada
  const ICONOS_M = { vacun: '🐂', ovino: '🐏', caprino: '🐐', porcino: '🐗', equino: '🐴' };
  const icono = a => {
    const e = especie(a);
    return a.sexo === 'M' ? (e.iconoM || ICONOS_M[e.id] || e.icono) : e.icono;
  };
  const estado = a => a.falecemento ? 'falecido' : (a.venda && a.venda.data) ? 'vendido' : 'activo';
  const activo = a => estado(a) === 'activo';
  const dataFin = a => a.falecemento || (a.venda && a.venda.data) || u.hoxe();
  const pesoAdulto = (a, e) => (a.sexo === 'M' ? e.pesoAdultoM : e.pesoAdultoF) || e.pesoAdultoF || 100;
  const potencial = (w, A, e) => w < A ? e.k * w * Math.log(A / w) : 0;

  // ---- Peso teórico ----
  // Simula día a día desde a última pesaxe real (ou desde o nacemento).
  // Mentres mama medra ao ritmo da curva da especie; despois, o que lle permita a comida:
  // (comida − mantemento) / conversión, sen superar a curva. Sen comida definida suponse suficiente.
  function peso(a, ata) {
    ata = ata || dataFin(a);
    const e = especie(a), A = pesoAdulto(a, e);
    if (e.crecemento === false) return null;
    const pes = (a.pesaxes || []).filter(p => p.data <= ata).sort((x, y) => x.data < y.data ? -1 : 1);
    let ini = pes.length ? pes[pes.length - 1] : null;
    if (!ini && a.nacemento && a.nacemento <= ata) ini = { data: a.nacemento, kg: a.pesoNacemento || e.pesoNac };
    if (!ini) return null;
    let w = +ini.kg;
    const d0 = u.dia(ini.data), d1 = Math.min(u.dia(ata), d0 + 365 * 30);
    const dNac = a.nacemento ? u.dia(a.nacemento) : -Infinity;
    const comida = +a.comidaDia || 0;
    const minimo = Math.max(e.pesoNac || 1, A * 0.35);
    for (let d = d0; d < d1; d++) {
      let g = potencial(w, A, e);
      if (comida > 0 && d - dNac >= e.destete) {
        g = Math.min(g, (comida - w * e.mantemento / 100) / e.conversion);
        if (g < 0) g = Math.max(g, -w * 0.004);
      }
      const nw = w + g;
      w = g < 0 ? Math.max(nw, Math.min(w, minimo)) : nw;
    }
    return w;
  }

  function necesidades(a) {
    const w = peso(a);
    if (w == null) return null;
    const e = especie(a);
    const mant = w * e.mantemento / 100;
    const pot = potencial(w, pesoAdulto(a, e), e);
    const comida = +a.comidaDia || 0;
    const ganancia = comida > 0 ? Math.min(pot, (comida - mant) / e.conversion) : pot;
    return { peso: w, mant, optima: mant + pot * e.conversion, ganancia, adulto: w >= pesoAdulto(a, e) * 0.99 };
  }

  // Comida/día recomendada para un animal novo: a que lle permite medrar ao ritmo
  // da curva (ou só manterse, se xa é adulto). Mentres mama non se propón.
  function comidaProposta(a) {
    const e = especie(a), A = pesoAdulto(a, e);
    if (e.crecemento === false) return null;
    if (a.nacemento && u.entre(a.nacemento, u.hoxe()) < e.destete) return { mama: true, ata: u.sumar(a.nacemento, e.destete) };
    const w = peso({ ...a, comidaDia: null }) ?? A;
    const kg = w * e.mantemento / 100 + potencial(w, A, e) * e.conversion;
    return { kg: Math.round(kg * 10) / 10, peso: w };
  }

  // ---- Reprodución ----
  function repro(a, hoxe = u.hoxe()) {
    if (a.sexo !== 'F' || !activo(a)) return null;
    const e = especie(a);
    if (e.repro === false) return null;
    const pariuDespois = a.ultimoParto && a.ultimoParto >= a.cubricion;
    const celoDespois = a.ultimoCelo && a.ultimoCelo > a.cubricion;
    if (a.cubricion && !pariuDespois && !celoDespois) {
      const parto = u.sumar(a.cubricion, e.xestacion);
      return { estado: 'prenada', parto, dias: u.entre(hoxe, parto) };
    }
    let base = null;
    if (a.ultimoCelo && (!a.ultimoParto || a.ultimoCelo >= a.ultimoParto)) base = a.ultimoCelo;
    else if (a.ultimoParto) base = u.sumar(a.ultimoParto, e.celoPostParto);
    if (!base) {
      if (a.nacemento) {
        const pub = u.sumar(a.nacemento, e.pubertade);
        if (pub > hoxe) return { estado: 'nova', data: pub, dias: u.entre(hoxe, pub) };
      }
      return { estado: 'sendatos' };
    }
    const hd = u.dia(hoxe), dur = Math.max(1, +e.duracionCelo || 1), ciclo = Math.max(1, +e.ciclo || 21);
    let ini = u.dia(base);
    if (ini + dur - 1 < hd) ini += Math.ceil((hd - (ini + dur - 1)) / ciclo) * ciclo;
    if (ini <= hd) return { estado: 'celo', ata: u.deDia(ini + dur - 1), dias: 0 };
    return { estado: 'proximo', data: u.deDia(ini), dias: ini - hd };
  }

  // ---- Almacén ----
  // Tipos de lote: 'alpaca' (cadrada), 'rolo', 'microsilo' (rolo envolto en plástico branco) e 'saco'
  // contan unidades; 'silo' conta kg.
  // Os lotes antigos tiñan o tipo en texto libre ("Alpaca", "Bóla de silo", "Rolo"…)
  const TIPOS_LOTE = ['alpaca', 'rolo', 'microsilo', 'saco', 'silo'];
  const tipoLote = l => TIPOS_LOTE.includes(l.tipo) ? l.tipo
    : /saco/i.test(l.tipo || '') ? 'saco' : /bóla|bola|silo/i.test(l.tipo || '') ? 'microsilo' : /rol/i.test(l.tipo || '') ? 'rolo' : 'alpaca';
  const totalLote = l => tipoLote(l) === 'silo' ? (+l.kg || 0) : (+l.unidades || 0);
  // Gastado a man (e o gasto diario xa pechado, que se apunta como consumo)
  const gastadas = l => (l.consumos || []).reduce((s, c) => s + (+c.n || 0), 0);
  const kgPorUnidade = l => tipoLote(l) === 'silo' ? 1 : (+l.kgUnidade || 0);

  // Gasto diario: cada parcela pode levar unha cantidade fixa ao día dun lote
  // (lote.gastos = [{ parcelaId, n }]). Non se apunta día a día: calcúlase desde lote.gastoDesde,
  // e cando cambian os gastos péchase o acumulado como un consumo e empeza de novo.
  const gastosLote = l => (l.gastos || []).filter(g => +g.n > 0 && X.datos.obter('parcelas', g.parcelaId));
  const gastoDia = l => gastosLote(l).reduce((s, g) => s + +g.n, 0);
  const senDiario = l => Math.max(0, totalLote(l) - gastadas(l));
  function gastoAutomatico(l, ata = u.hoxe()) {
    const r = gastoDia(l);
    if (!r || !l.gastoDesde) return 0;
    return Math.min(senDiario(l), r * Math.max(0, u.entre(l.gastoDesde, ata)));
  }
  const restantes = l => Math.max(0, senDiario(l) - gastoAutomatico(l));
  // Días que lle quedan ao lote co gasto diario actual
  const diasLote = l => { const r = gastoDia(l); return r > 0 ? restantes(l) / r : Infinity; };
  // Día (número de día) no que se esgota co gasto diario
  const finLote = l => { const r = gastoDia(l); return r > 0 && l.gastoDesde ? u.dia(l.gastoDesde) + senDiario(l) / r : null; };
  // Lotes que dan de comer a unha parcela, coa cantidade diaria
  const lotesParcela = p => X.datos.lista('lotes').map(l => ({ l, n: gastosLote(l).filter(g => g.parcelaId === p.id).reduce((s, g) => s + +g.n, 0) })).filter(x => x.n > 0);

  // ---- Parcelas ----
  const animaisParcela = p => X.datos.lista('animais').filter(a => a.parcelaId === p.id && activo(a));
  const consumo = p => p.tipo === 'forraxe' ? 0 : animaisParcela(p).reduce((s, a) => s + (+a.comidaDia || 0), 0);
  // kg/día que achega hoxe o almacén (os lotes esgotados xa non dan)
  const aporte = p => p.tipo === 'forraxe' ? 0 : lotesParcela(p).reduce((s, x) => s + (restantes(x.l) > 0 ? x.n * kgPorUnidade(x.l) : 0), 0);
  const balance = p => (+p.crecemento || 0) + aporte(p) - consumo(p);
  const capacidade = p => +p.capacidade > 0 ? +p.capacidade : Infinity;

  // kg achegados polo almacén entre dúas datas (o lote pode esgotarse polo medio)
  function aporteEntre(p, desde, ata) {
    const d0 = u.dia(desde), d1 = u.dia(ata);
    return lotesParcela(p).reduce((s, { l, n }) => {
      const ini = Math.max(d0, l.gastoDesde ? u.dia(l.gastoDesde) : d1), fin = Math.min(d1, finLote(l) ?? d1);
      return s + (fin > ini ? (fin - ini) * n * kgPorUnidade(l) : 0);
    }, 0);
  }

  function stock(p, ata = u.hoxe()) {
    const d = p.stockData ? Math.max(0, u.entre(p.stockData, ata)) : 0;
    if (p.tipo === 'forraxe') return Math.min(capacidade(p), Math.max(0, (+p.stock || 0) + d * (+p.crecemento || 0)));
    const ritmo = (+p.crecemento || 0) - consumo(p);
    const extra = p.stockData ? aporteEntre(p, p.stockData, ata) : 0;
    return Math.min(capacidade(p), Math.max(0, (+p.stock || 0) + d * ritmo + extra));
  }

  function prevision(p) {
    const s = stock(p), b = balance(p), cap = capacidade(p);
    // Cando se esgote un lote do almacén, o balance baixa: vaise tramo a tramo
    let dia = 0, sx = s, bx = b;
    const cortes = lotesParcela(p).filter(x => restantes(x.l) > 0)
      .map(x => ({ dias: diasLote(x.l), kg: x.n * kgPorUnidade(x.l) })).filter(x => x.kg > 0).sort((a, z) => a.dias - z.dias);
    for (const tr of cortes) {
      if (bx < 0 && sx + bx * (tr.dias - dia) <= 0) break;
      sx = Math.min(cap, Math.max(0, sx + bx * (tr.dias - dia)));
      dia = tr.dias; bx -= tr.kg;
    }
    if (bx < 0) return { tipo: 'baixa', dias: dia + sx / -bx, s, b };
    if (b > 0) return s < cap ? { tipo: 'enche', dias: (cap - s) / b, s, b } : { tipo: 'chea', s, b };
    return { tipo: 'estable', s, b };
  }

  const checkpoint = p => ({ ...p, stock: stock(p), stockData: u.hoxe() });

  // ---- Avisos ----
  let cache = { k: null, r: [] };
  const ORDE = { alto: 0, medio: 1, info: 2 };

  function avisos() {
    const k = `${X.datos.rev()}|${u.hoxe()}|${X.lang}`;
    if (cache.k === k) return cache.r;
    const cfg = X.datos.config().avisos, hoxe = u.hoxe(), r = [];

    for (const a of X.datos.lista('animais')) {
      const rp = repro(a, hoxe);
      if (!rp) continue;
      const ref = { tipo: 'animal', id: a.id }, nome = a.nome;
      if (rp.estado === 'celo') {
        r.push({ nivel: 'alto', ref, orde: 0, texto: t('avCelo', { nome }), detalle: t('ataData', { data: u.data(rp.ata) }) });
      } else if (rp.estado === 'proximo' && rp.dias <= cfg.celo) {
        r.push({ nivel: 'medio', ref, orde: rp.dias, texto: t('avCeloEn', { nome, en: u.enDias(rp.dias) }), detalle: u.data(rp.data) });
      } else if (rp.estado === 'prenada') {
        if (rp.dias < 0) r.push({ nivel: 'alto', ref, orde: rp.dias, texto: t('avPartoAtrasado', { nome, dias: u.dias(-rp.dias) }), detalle: t('previsto', { data: u.data(rp.parto) }) });
        else if (rp.dias <= cfg.parto) r.push({ nivel: rp.dias <= 1 ? 'alto' : 'medio', ref, orde: rp.dias, texto: t('avPartoEn', { nome, en: u.enDias(rp.dias) }), detalle: u.data(rp.parto) });
      }
    }

    for (const p of X.datos.lista('parcelas')) {
      const ref = { tipo: 'parcela', id: p.id }, nome = p.nome;
      if (p.tipo === 'forraxe') {
        if (p.dataColleita) {
          const d = u.entre(hoxe, p.dataColleita);
          if (d < 0) r.push({ nivel: 'alto', ref, orde: d, texto: t('avColleitaAtrasada', { nome, dias: u.dias(-d) }), detalle: u.data(p.dataColleita) });
          else if (d <= cfg.colleita) r.push({ nivel: 'medio', ref, orde: d, texto: t('avColleitaEn', { nome, en: u.enDias(d) }), detalle: u.data(p.dataColleita) });
        }
        continue;
      }
      const pr = prevision(p);
      if (pr.tipo === 'baixa') {
        if (pr.s <= 0) r.push({ nivel: 'alto', ref, orde: -1, texto: t('avSenComida', { nome }), detalle: t('consumoDia', { kg: u.kg(-pr.b) }) });
        else if (pr.dias <= cfg.comida) r.push({ nivel: pr.dias <= 1 ? 'alto' : 'medio', ref, orde: pr.dias, texto: t('avComidaPara', { nome, dias: pr.dias < 1 ? t('menosDunDia') : u.dias(Math.floor(pr.dias)) }), detalle: u.kg(pr.s) });
      } else if (pr.tipo === 'chea' && cfg.chea && isFinite(capacidade(p))) {
        r.push({ nivel: 'info', ref, orde: 99, texto: t('avChea', { nome }), detalle: t('perdeDia', { kg: u.kg(pr.b) }) });
      }
    }

    // O mínimo do almacén cóntase en unidades (alpacas e rolos); o silo vai en kg
    const lotes = X.datos.lista('lotes').filter(l => tipoLote(l) !== 'silo');
    if (lotes.length) {
      const tot = lotes.reduce((s, l) => s + restantes(l), 0);
      if (tot < cfg.almacenMin) r.push({ nivel: tot === 0 ? 'alto' : 'medio', ref: { tipo: 'almacen' }, orde: tot, texto: t('avAlmacen', { n: u.numero(tot, 1) }), detalle: t('minimo', { n: cfg.almacenMin }) });
    }

    // Lotes con gasto diario: cando se van esgotar (co mesmo marxe que a comida das parcelas)
    for (const l of X.datos.lista('lotes')) {
      if (!gastoDia(l)) continue;
      const nome = l.nome || t(tipoLote(l)), ref = { tipo: 'lote', id: l.id };
      const parcelas = gastosLote(l).map(g => X.datos.obter('parcelas', g.parcelaId).nome).join(', ');
      const d = diasLote(l);
      if (restantes(l) <= 0) r.push({ nivel: 'alto', ref, orde: -1, texto: t('avLoteEsgotado', { nome }), detalle: parcelas });
      else if (d <= cfg.comida) r.push({ nivel: d <= 1 ? 'alto' : 'medio', ref, orde: d, texto: t('avLoteDias', { nome, dias: d < 1 ? t('menosDunDia') : u.dias(Math.floor(d)) }), detalle: parcelas });
    }

    r.sort((a, b) => ORDE[a.nivel] - ORDE[b.nivel] || a.orde - b.orde);
    cache = { k, r };
    return r;
  }

  return {
    especie, icono, estado, activo, peso, necesidades, comidaProposta, repro,
    animaisParcela, consumo, aporte, balance, capacidade, stock, prevision, checkpoint,
    TIPOS_LOTE, tipoLote, totalLote, gastadas, kgPorUnidade, gastosLote, gastoDia, gastoAutomatico, restantes, diasLote, lotesParcela, avisos,
  };
})();
