'use strict';

// Estado da aplicación e persistencia local (un estado por usuario).
// Cada rexistro leva `upd` (marca de tempo) e `del` (borrado) para poder combinar
// os cambios feitos en varios dispositivos: gaña o rexistro máis recente.
// `pendentes` garda que rexistros cambiaron aquí e aínda non se subiron ao servidor.
X.datos = (() => {
  const CLAVE_VELLA = 'xunguir.estado'; // versión anterior (sincronización con GitHub)
  const COLECCIONS = ['especies', 'animais', 'grupos', 'parcelas', 'lotes'];

  // Parámetros por especie. Comida en kg de materia seca/día.
  // mantemento: % do peso vivo que precisa comer para manter o peso
  // conversion: kg de comida extra por cada kg que gaña
  // k: velocidade da curva de crecemento (Gompertz)
  // codigoDib: código de especie (01 equinos, 02 bovino, 03 porcino, 04 ovino e caprino, 05 aves, 06 resto)
  const PRESETS = [
    { id: 'vacun', codigoDib: '02', icono: '🐄', nome: { gl: 'Vacún', es: 'Vacuno' }, ciclo: 21, duracionCelo: 1, xestacion: 283, celoPostParto: 45, pubertade: 450, destete: 180, pesoNac: 40, pesoAdultoF: 600, pesoAdultoM: 900, mantemento: 1.8, conversion: 7, k: 0.0045 },
    { id: 'ovino', codigoDib: '04', icono: '🐑', nome: { gl: 'Ovino', es: 'Ovino' }, ciclo: 17, duracionCelo: 2, xestacion: 150, celoPostParto: 45, pubertade: 240, destete: 90, pesoNac: 4, pesoAdultoF: 70, pesoAdultoM: 100, mantemento: 2, conversion: 6, k: 0.012 },
    { id: 'caprino', codigoDib: '04', icono: '🐐', nome: { gl: 'Caprino', es: 'Caprino' }, ciclo: 21, duracionCelo: 2, xestacion: 150, celoPostParto: 45, pubertade: 240, destete: 90, pesoNac: 3.5, pesoAdultoF: 60, pesoAdultoM: 80, mantemento: 2.2, conversion: 6, k: 0.011 },
    { id: 'porcino', codigoDib: '03', icono: '🐖', nome: { gl: 'Porcino', es: 'Porcino' }, ciclo: 21, duracionCelo: 2, xestacion: 114, celoPostParto: 30, pubertade: 200, destete: 28, pesoNac: 1.4, pesoAdultoF: 250, pesoAdultoM: 300, mantemento: 1, conversion: 3, k: 0.0102 },
    { id: 'equino', codigoDib: '01', icono: '🐎', nome: { gl: 'Equino', es: 'Equino' }, ciclo: 21, duracionCelo: 6, xestacion: 340, celoPostParto: 9, pubertade: 540, destete: 180, pesoNac: 50, pesoAdultoF: 500, pesoAdultoM: 550, mantemento: 1.5, conversion: 9, k: 0.005 },
    // Engadidas na versión 2.3.0 (ás explotacións que xa existían engádense ao abrir)
    // repro: false → sen celos nin partos (aves e abellas); crecemento: false → sen peso teórico (colmeas)
    { id: 'asno', codigoDib: '01', icono: '🫏', nome: { gl: 'Asno / burro', es: 'Asno / burro' }, ciclo: 23, duracionCelo: 6, xestacion: 365, celoPostParto: 9, pubertade: 730, destete: 180, pesoNac: 30, pesoAdultoF: 300, pesoAdultoM: 330, mantemento: 1.8, conversion: 9, k: 0.005 },
    { id: 'galina', codigoDib: '05', icono: '🐔', iconoM: '🐓', nome: { gl: 'Galiñas', es: 'Gallinas' }, repro: false, ciclo: 1, duracionCelo: 1, xestacion: 21, celoPostParto: 1, pubertade: 140, destete: 0, pesoNac: 0.04, pesoAdultoF: 2.2, pesoAdultoM: 3, mantemento: 5, conversion: 2.5, k: 0.035 },
    { id: 'pato', codigoDib: '05', icono: '🦆', nome: { gl: 'Patos', es: 'Patos' }, repro: false, ciclo: 1, duracionCelo: 1, xestacion: 28, celoPostParto: 1, pubertade: 180, destete: 0, pesoNac: 0.05, pesoAdultoF: 3, pesoAdultoM: 3.5, mantemento: 5, conversion: 3, k: 0.04 },
    { id: 'pavo', codigoDib: '05', icono: '🦃', nome: { gl: 'Pavos', es: 'Pavos' }, repro: false, ciclo: 1, duracionCelo: 1, xestacion: 28, celoPostParto: 1, pubertade: 210, destete: 0, pesoNac: 0.06, pesoAdultoF: 8, pesoAdultoM: 15, mantemento: 4, conversion: 3, k: 0.02 },
    { id: 'coello', codigoDib: '06', icono: '🐇', nome: { gl: 'Coellos', es: 'Conejos' }, ciclo: 16, duracionCelo: 2, xestacion: 31, celoPostParto: 11, pubertade: 150, destete: 30, pesoNac: 0.06, pesoAdultoF: 4.5, pesoAdultoM: 4.5, mantemento: 4, conversion: 3.5, k: 0.025 },
    { id: 'cervo', codigoDib: '06', icono: '🦌', nome: { gl: 'Cervos', es: 'Ciervos' }, ciclo: 18, duracionCelo: 1, xestacion: 233, celoPostParto: 120, pubertade: 480, destete: 120, pesoNac: 9, pesoAdultoF: 100, pesoAdultoM: 180, mantemento: 2.5, conversion: 7, k: 0.006 },
    { id: 'camelido', codigoDib: '06', icono: '🦙', nome: { gl: 'Alpacas e llamas', es: 'Alpacas y llamas' }, ciclo: 14, duracionCelo: 3, xestacion: 345, celoPostParto: 15, pubertade: 540, destete: 180, pesoNac: 8, pesoAdultoF: 65, pesoAdultoM: 75, mantemento: 1.8, conversion: 8, k: 0.006 },
    { id: 'abella', codigoDib: '06', icono: '🐝', nome: { gl: 'Abellas (colmeas)', es: 'Abejas (colmenas)' }, repro: false, crecemento: false, ciclo: 1, duracionCelo: 1, xestacion: 1, celoPostParto: 1, pubertade: 1, destete: 0, pesoNac: 1, pesoAdultoF: 1, pesoAdultoM: 1, mantemento: 0, conversion: 1, k: 0.01 },
    { id: 'can', codigoDib: '06', icono: '🐕', nome: { gl: 'Cans de traballo', es: 'Perros de trabajo' }, ciclo: 180, duracionCelo: 9, xestacion: 63, celoPostParto: 120, pubertade: 300, destete: 56, pesoNac: 0.4, pesoAdultoF: 25, pesoAdultoM: 30, mantemento: 3, conversion: 4, k: 0.012 },
  ];
  // Especies predefinidas que se engadiron despois de crear a explotación
  const PRESETS_V = 2;
  const AVISOS_DEF = { celo: 3, parto: 7, comida: 3, colleita: 7, almacenMin: 5, chea: true };
  // Valores por hectárea para propoñer capacidade e crecemento (kg de materia seca)
  const PARCELAS_DEF = { kgHa: 3000, crecHa: 30 };
  // Códigos de raza que aparecen no código de barras do DIB (estas son todas de bovino, especie 02).
  // Na configuración gárdanse como { código: { nome, dib } }
  const RAZAS_DEF = {
    '0000': 'Conxunto mestizo / Cruces', '0813': 'Salers',
    '1103': 'Asturiana de la Montaña (Casina)', '1105': 'Bruna dos Pirineos', '1108': 'Monchina',
    '1111': 'Frisona (Holstein)', '1112': 'Parda Alpina / Parda', '1113': 'Charolesa (Charolais)', '1114': 'Hereford',
    '1115': 'Jersey', '1116': 'Angus (Aberdeen Angus)', '1117': 'Limusina (Limousin)', '1118': 'Roja Danesa',
    '1119': 'Santa Gertrudis', '1120': 'Retinta', '1121': 'Avileña - Negra Ibérica', '1122': 'Rubia Galega',
    '1123': 'Morucha', '1125': 'Asturiana de los Valles', '1126': 'Pirenaica', '1127': 'Sayaguesa',
    '1128': 'Alistana - Sanabresa', '1130': 'Lidia (Toro de Lidia)', '1131': 'Tudanca', '1132': 'Cachena',
    '1133': 'Caldelá', '1134': 'Frieiresa', '1135': 'Limiá', '1136': 'Vianesa', '9902': 'Brahman', '9903': 'Cebú',
  };

  let estado = null;
  let uid = null;
  let pendentes = new Set();  // "coleccion:id" cambiados aquí sen subir
  let rev = 0;                // cambia con calquera modificación (para cachés)
  let enLote = 0, pendente = false;

  const clave = k => `xunguir.${k}.${uid}`;

  const novo = () => ({
    v: 1,
    config: { avisos: { ...AVISOS_DEF }, presetsV: PRESETS_V, upd: 0 },
    especies: PRESETS.map(p => ({ ...p, nome: p.nome[X.lang] || p.nome.gl, upd: 0 })),
    animais: [], parcelas: [], lotes: [],
  });

  function normalizar(e) {
    for (const c of COLECCIONS) if (!Array.isArray(e[c])) e[c] = [];
    e.config = e.config || { upd: 0 };
    e.config.avisos = { ...AVISOS_DEF, ...(e.config.avisos || {}) };
    e.config.parcelas = { ...PARCELAS_DEF, ...(e.config.parcelas || {}) };
    if (!e.config.razas) e.config.razas = Object.fromEntries(Object.entries(RAZAS_DEF).map(([k, nome]) => [k, { nome, dib: '02' }]));
    return e;
  }

  const lerJSON = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };

  function cargar(usuario) {
    uid = usuario;
    estado = lerJSON(clave('estado'));
    if (!estado || !estado.v) estado = novo();
    normalizar(estado);
    pendentes = new Set(lerJSON(clave('pendentes')) || []);
    rev++;
  }

  function persistir() {
    try {
      localStorage.setItem(clave('estado'), JSON.stringify(estado));
      localStorage.setItem(clave('pendentes'), JSON.stringify([...pendentes]));
    } catch { X.ui.toast(X.t('erroGardarLocal'), 'erro'); }
  }

  function cambiado() {
    rev++;
    persistir();
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
    pendentes.add(`${col}:${obj.id}`);
    if (enLote) pendente = true; else cambiado();
    return obj;
  }

  function borrar(col, id) {
    const i = estado[col].findIndex(x => x.id === id);
    if (i < 0) return;
    estado[col][i] = { id, del: true, upd: Date.now() };
    pendentes.add(`${col}:${id}`);
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
    pendentes.add('config:config');
    cambiado();
  }

  // Unha soa vez por explotación: engade as especies predefinidas novas que non teña
  // (se se borrou unha despois, non volve aparecer)
  function engadirEspeciesNovas() {
    if ((estado.config.presetsV || 1) >= PRESETS_V) return;
    lote(() => {
      for (const p of PRESETS) {
        if (!estado.especies.some(e => e.id === p.id)) gardar('especies', { ...p, nome: p.nome[X.lang] || p.nome.gl });
      }
      gardarConfig({ presetsV: PRESETS_V });
    });
  }

  // ---- Sincronización co servidor ----
  const separar = k => { const i = k.indexOf(':'); return [k.slice(0, i), k.slice(i + 1)]; };

  // Busca un rexistro por colección e id (con índices, para que vaia rápido con miles de rexistros)
  function buscador() {
    const indices = {};
    return (coleccion, id) => {
      if (coleccion === 'config') return estado.config;
      if (!estado[coleccion]) return null;
      if (!indices[coleccion]) indices[coleccion] = new Map(estado[coleccion].map(x => [x.id, x]));
      return indices[coleccion].get(id) || null;
    };
  }

  // Rexistros cambiados aquí, listos para subir
  function cambiosPendentes() {
    const buscar = buscador();
    return [...pendentes].map(k => {
      const [coleccion, id] = separar(k);
      const obj = buscar(coleccion, id);
      if (!obj) { pendentes.delete(k); return null; } // xa non existe: nada que subir
      return { coleccion, id, datos: obj, upd: obj.upd || 0, del: !!obj.del };
    }).filter(Boolean);
  }

  // Quita de pendentes os que se subiron (se non volveron cambiar mentres tanto)
  function confirmarSubidos(filas) {
    const buscar = buscador();
    for (const f of filas) {
      const actual = buscar(f.coleccion, f.id);
      if (!actual || (actual.upd || 0) === f.upd) pendentes.delete(`${f.coleccion}:${f.id}`);
    }
    persistir();
  }

  // Aplica o que chega do servidor: gaña o rexistro máis recente
  function aplicarRemotos(filas) {
    let cambios = 0;
    const posicions = {}; // coleccion → Map(id → posición), para non percorrer a lista en cada fila
    for (const f of filas) {
      if (f.coleccion === 'config') {
        if ((f.upd || 0) > (estado.config.upd || 0)) { estado.config = { ...f.datos, upd: f.upd }; cambios++; }
        continue;
      }
      const col = estado[f.coleccion];
      if (!col) continue;
      if (!posicions[f.coleccion]) posicions[f.coleccion] = new Map(col.map((x, j) => [x.id, j]));
      const pos = posicions[f.coleccion];
      const i = pos.has(f.id) ? pos.get(f.id) : -1;
      const local = i >= 0 ? col[i] : null;
      if (local && (local.upd || 0) >= (f.upd || 0)) continue;
      const novoRex = f.del ? { id: f.id, del: true, upd: f.upd } : { ...f.datos, id: f.id, upd: f.upd };
      if (i >= 0) col[i] = novoRex; else { pos.set(f.id, col.length); col.push(novoRex); }
      pendentes.delete(`${f.coleccion}:${f.id}`);
      cambios++;
    }
    if (cambios) { normalizar(estado); rev++; persistir(); X.app.render(); }
    return cambios;
  }

  const ultimaSync = () => localStorage.getItem(clave('ultimaSync'));
  const gardarUltimaSync = s => localStorage.setItem(clave('ultimaSync'), s);

  // Marca todo como pendente de subir (ao importar unha copia ou pasar datos da versión anterior)
  function marcarTodoPendente() {
    pendentes.add('config:config');
    for (const c of COLECCIONS) for (const x of estado[c]) pendentes.add(`${c}:${x.id}`);
    persistir();
  }

  // ---- Combinar con outra copia (importar) ----
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
    return normalizar(r);
  }

  function substituir(novoEstado) {
    estado = normalizar(novoEstado);
    rev++;
    persistir();
    X.app.render();
  }

  // Datos da versión anterior (antes das contas) gardados neste dispositivo
  const estadoVello = () => { const e = lerJSON(CLAVE_VELLA); return e && e.v ? normalizar(e) : null; };
  const arquivarVello = () => {
    localStorage.setItem(`${CLAVE_VELLA}.antigo`, localStorage.getItem(CLAVE_VELLA) || '');
    localStorage.removeItem(CLAVE_VELLA);
  };

  // Ao pechar sesión: borra os datos deste usuario do dispositivo
  function borrarLocal() {
    for (const k of ['estado', 'pendentes', 'ultimaSync']) localStorage.removeItem(clave(k));
    estado = null; uid = null; pendentes = new Set();
  }

  return {
    PRESETS, RAZAS_DEF, COLECCIONS, cargar, lista, obter, gardar, borrar, gardarAnimal, gardarConfig, lote, engadirEspeciesNovas,
    cambiosPendentes, confirmarSubidos, aplicarRemotos, ultimaSync, gardarUltimaSync, marcarTodoPendente,
    fusionar, substituir, estadoVello, arquivarVello, borrarLocal,
    nPendentes: () => pendentes.size, listo: () => !!estado,
    estado: () => estado, config: () => estado.config, rev: () => rev,
  };
})();

// Códigos do DIB: especie de cada animal (01–06) e táboa de razas (código → nome e especie)
X.razas = (() => {
  const D = X.datos;
  const CODIGOS_ESPECIE = ['01', '02', '03', '04', '05', '06'];
  const DIB_PRESET = Object.fromEntries(D.PRESETS.map(p => [p.id, p.codigoDib]));

  // Código DIB dunha especie (as gardadas antes desta versión non o teñen)
  const codigoEspecie = e => (e && (e.codigoDib || DIB_PRESET[e.id])) || '06';

  // A versión anterior gardaba só o nome; as razas da táboa inicial son de bovino
  function info(cod) {
    const v = (D.config().razas || {})[cod];
    if (!v) return null;
    return typeof v === 'string' ? { nome: v, dib: D.RAZAS_DEF[cod] ? '02' : null } : v;
  }
  const lista = () => Object.keys(D.config().razas || {}).sort().map(cod => ({ cod, ...info(cod) }));
  const nome = cod => (info(cod) || {}).nome || null;
  const codigoPorNome = n => n ? (lista().find(r => r.nome.toLowerCase() === n.toLowerCase()) || {}).cod || null : null;

  // Especie que corresponde a un código de raza. O código DIB 04 é común a ovino e caprino,
  // así que primeiro mírase a especie exacta coa que se aprendeu a raza e a dos animais que xa a teñen
  function especieDaRaza(cod) {
    const r = info(cod);
    if (!r) return null;
    const exacta = r.especie && D.obter('especies', r.especie);
    if (exacta) return exacta;
    const conta = {};
    D.lista('animais').filter(a => a.razaCodigo === cod).forEach(a => { conta[a.especieId] = (conta[a.especieId] || 0) + 1; });
    const masUsada = Object.keys(conta).sort((a, b) => conta[b] - conta[a]).map(id => D.obter('especies', id)).find(Boolean);
    if (masUsada) return masUsada;
    return r.dib ? D.lista('especies').sort(X.u.porNome).find(e => codigoEspecie(e) === r.dib) || null : null;
  }

  function gardar(cod, nomeRaza, dib, especieId) {
    const razas = { ...(D.config().razas || {}) };
    razas[cod] = { nome: nomeRaza, dib: dib || null, especie: especieId || null };
    D.gardarConfig({ razas });
  }

  return { CODIGOS_ESPECIE, codigoEspecie, info, lista, nome, codigoPorNome, especieDaRaza, gardar };
})();
