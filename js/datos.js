'use strict';

// Estado da aplicación, persistencia local e fusión con GitHub.
// Cada rexistro leva `upd` (marca de tempo) e `del` (borrado) para poder fusionar
// os cambios feitos en varios dispositivos: gaña o rexistro máis recente.
X.datos = (() => {
  const CLAVE = 'xunguir.estado', CLAVE_SUCIO = 'xunguir.sucio';
  const COLECCIONS = ['especies', 'animais', 'parcelas', 'lotes'];

  // Parámetros por especie. Comida en kg de materia seca/día.
  // mantemento: % do peso vivo que precisa comer para manter o peso
  // conversion: kg de comida extra por cada kg que gaña
  // k: velocidade da curva de crecemento (Gompertz)
  const PRESETS = [
    { id: 'vacun', icono: '🐄', nome: { gl: 'Vacún', es: 'Vacuno' }, ciclo: 21, duracionCelo: 1, xestacion: 283, celoPostParto: 45, pubertade: 450, destete: 180, pesoNac: 40, pesoAdultoF: 600, pesoAdultoM: 900, mantemento: 1.8, conversion: 7, k: 0.0045 },
    { id: 'ovino', icono: '🐑', nome: { gl: 'Ovino', es: 'Ovino' }, ciclo: 17, duracionCelo: 2, xestacion: 150, celoPostParto: 45, pubertade: 240, destete: 90, pesoNac: 4, pesoAdultoF: 70, pesoAdultoM: 100, mantemento: 2, conversion: 6, k: 0.012 },
    { id: 'caprino', icono: '🐐', nome: { gl: 'Caprino', es: 'Caprino' }, ciclo: 21, duracionCelo: 2, xestacion: 150, celoPostParto: 45, pubertade: 240, destete: 90, pesoNac: 3.5, pesoAdultoF: 60, pesoAdultoM: 80, mantemento: 2.2, conversion: 6, k: 0.011 },
    { id: 'porcino', icono: '🐖', nome: { gl: 'Porcino', es: 'Porcino' }, ciclo: 21, duracionCelo: 2, xestacion: 114, celoPostParto: 30, pubertade: 200, destete: 28, pesoNac: 1.4, pesoAdultoF: 250, pesoAdultoM: 300, mantemento: 1, conversion: 3, k: 0.0102 },
    { id: 'equino', icono: '🐎', nome: { gl: 'Equino', es: 'Equino' }, ciclo: 21, duracionCelo: 6, xestacion: 340, celoPostParto: 9, pubertade: 540, destete: 180, pesoNac: 50, pesoAdultoF: 500, pesoAdultoM: 550, mantemento: 1.5, conversion: 9, k: 0.005 },
  ];
  const AVISOS_DEF = { celo: 3, parto: 7, comida: 3, colleita: 7, almacenMin: 5, chea: true };
  // Valores por hectárea para propoñer capacidade e crecemento (kg de materia seca)
  const PARCELAS_DEF = { kgHa: 3000, crecHa: 30 };

  let estado = null;
  let rev = 0;      // cambia con calquera modificación (para cachés)
  let version = 0;  // cambia só con modificacións locais (para a sincronización)
  let enLote = 0, pendente = false;

  const novo = () => ({
    v: 1,
    config: { avisos: { ...AVISOS_DEF }, upd: 0 },
    especies: PRESETS.map(p => ({ ...p, nome: p.nome[X.lang] || p.nome.gl, upd: 0 })),
    animais: [], parcelas: [], lotes: [],
  });

  function normalizar(e) {
    for (const c of COLECCIONS) if (!Array.isArray(e[c])) e[c] = [];
    e.config = e.config || { upd: 0 };
    e.config.avisos = { ...AVISOS_DEF, ...(e.config.avisos || {}) };
    e.config.parcelas = { ...PARCELAS_DEF, ...(e.config.parcelas || {}) };
    return e;
  }

  function cargar() {
    try { estado = JSON.parse(localStorage.getItem(CLAVE)); } catch { estado = null; }
    if (!estado || !estado.v) estado = novo();
    normalizar(estado);
  }

  function persistir() {
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); }
    catch { X.ui.toast(X.t('erroGardarLocal'), 'erro'); }
  }

  function cambiado() {
    rev++; version++;
    persistir();
    localStorage.setItem(CLAVE_SUCIO, '1');
    X.sync.programar();
    X.app.render();
  }

  // Agrupa varias modificacións nun só gardado/render
  function lote(fn) {
    enLote++;
    try { return fn(); }
    finally { if (--enLote === 0 && pendente) { pendente = false; cambiado(); } }
  }

  const lista = col => estado[col].filter(x => !x.del);
  const obter = (col, id) => id ? estado[col].find(x => x.id === id && !x.del) : undefined;

  function gardar(col, obj) {
    obj = { ...obj, upd: Date.now() };
    const i = estado[col].findIndex(x => x.id === obj.id);
    if (i >= 0) estado[col][i] = obj; else estado[col].push(obj);
    if (enLote) pendente = true; else cambiado();
    return obj;
  }

  function borrar(col, id) {
    const i = estado[col].findIndex(x => x.id === id);
    if (i < 0) return;
    estado[col][i] = { id, del: true, upd: Date.now() };
    if (enLote) pendente = true; else cambiado();
  }

  // Antes de cambiar animais ou comida dunha parcela, "fotografamos" o seu stock
  // para que o cálculo dos días pasados se faga coa situación anterior.
  function gardarAnimal(a) {
    return lote(() => {
      const prev = obter('animais', a.id);
      const clave = x => x ? [x.parcelaId || '', +x.comidaDia || 0, x.falecemento || '', (x.venda && x.venda.data) || ''].join('|') : '';
      if (clave(prev) !== clave(a)) {
        for (const id of new Set([prev && prev.parcelaId, a.parcelaId].filter(Boolean))) {
          const p = obter('parcelas', id);
          if (p) gardar('parcelas', X.calc.checkpoint(p));
        }
      }
      return gardar('animais', a);
    });
  }

  function gardarConfig(cfg) {
    estado.config = { ...estado.config, ...cfg, upd: Date.now() };
    cambiado();
  }

  // ---- Fusión entre dispositivos ----
  function ordenar(e) {
    const r = { v: 1, config: e.config };
    for (const c of COLECCIONS) r[c] = [...(e[c] || [])].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    return r;
  }

  // En caso de empate gaña `b` (o remoto), para non entrar nun bucle de subidas
  function fusionar(a, b) {
    const r = { v: 1 };
    const updA = (a.config && a.config.upd) || 0, updB = (b.config && b.config.upd) || 0;
    r.config = b.config && updB >= updA ? b.config : a.config;
    for (const c of COLECCIONS) {
      const m = new Map();
      for (const x of a[c] || []) m.set(x.id, x);
      for (const x of b[c] || []) {
        const y = m.get(x.id);
        if (!y || (x.upd || 0) >= (y.upd || 0)) m.set(x.id, x);
      }
      r[c] = [...m.values()];
    }
    return normalizar(ordenar(r));
  }

  // Substitúe o estado polo resultado dunha sincronización (non marca cambios locais)
  function substituir(novoEstado) {
    estado = normalizar(novoEstado);
    rev++;
    persistir();
    X.app.render();
  }

  const sucio = () => localStorage.getItem(CLAVE_SUCIO) === '1';
  const limparSucio = () => localStorage.removeItem(CLAVE_SUCIO);
  const marcarSucio = () => localStorage.setItem(CLAVE_SUCIO, '1');

  function borrarLocal() {
    localStorage.removeItem(CLAVE);
    localStorage.removeItem(CLAVE_SUCIO);
  }

  return {
    PRESETS, cargar, lista, obter, gardar, borrar, gardarAnimal, gardarConfig, lote,
    fusionar, ordenar, substituir, sucio, limparSucio, marcarSucio, borrarLocal,
    estado: () => estado, config: () => estado.config, rev: () => rev, version: () => version,
  };
})();
