'use strict';

// Novidades de cada versión: amósanse unha vez por conta, a primeira vez que se abre a app
// despois de actualizar. Ao publicar unha versión con cambios que lle importen ao usuario,
// engadir unha entrada AO PRINCIPIO da lista (as versións só con arranxos pequenos non levan).
X.novidades = (() => {
  const ui = X.ui, u = X.u;
  const t = (...a) => X.t(...a);

  // [icona, título, texto]
  const LISTA = [
    {
      version: '2.3.0', data: '2026-10-29',
      gl: [
        ['🔁', 'Gasto diario do almacén', 'Na ficha de cada pasto podes indicar o que gasta cada día do almacén (p. ex. 3 alpacas de «Herba 2025»). Descóntase só, conta como comida da parcela e avisa antes de que se esgote.'],
        ['🏚️', 'Sacos no almacén', 'Novo tipo de lote «Sacos» (penso, minerais…) e un campo «Contido» para saber que hai en cada lote.'],
        ['🐾', 'Máis especies', 'Asnos e burros (á parte dos cabalos), galiñas, patos, pavos, coellos, cervos, alpacas e llamas, abellas e cans de traballo. Xa os tes en Configuración → Especies.'],
        ['🏷️', 'Características segundo a especie', 'Nos anuncios do Mercado, as características cambian coa especie: domado e montado nos cabalos, poñedora nas galiñas, enxame nas abellas…'],
        ['📷', 'Fotos dos anuncios', 'Dentro dun anuncio, as fotos xa se ven enteiras no seu recadro. Pasa o dedo para ver as seguintes.'],
        ['⚖️', 'Nova icona do Mercado', 'O botón do Mercado leva agora unha balanza.'],
        ['👨‍🌾', 'Granxeiro ou tratante', 'Xunguir ábrese en Animais ou no Mercado segundo o teu perfil. Cámbialo cando queiras en Configuración → Perfil.'],
      ],
      es: [
        ['🔁', 'Gasto diario del almacén', 'En la ficha de cada pasto puedes indicar lo que gasta cada día del almacén (p. ej. 3 alpacas de «Herba 2025»). Se descuenta solo, cuenta como comida de la parcela y avisa antes de que se agote.'],
        ['🏚️', 'Sacos en el almacén', 'Nuevo tipo de lote «Sacos» (pienso, minerales…) y un campo «Contenido» para saber qué hay en cada lote.'],
        ['🐾', 'Más especies', 'Asnos y burros (aparte de los caballos), gallinas, patos, pavos, conejos, ciervos, alpacas y llamas, abejas y perros de trabajo. Ya los tienes en Configuración → Especies.'],
        ['🏷️', 'Características según la especie', 'En los anuncios del Mercado, las características cambian con la especie: domado y montado en los caballos, ponedora en las gallinas, enjambre en las abejas…'],
        ['📷', 'Fotos de los anuncios', 'Dentro de un anuncio, las fotos ya se ven enteras en su recuadro. Desliza el dedo para ver las siguientes.'],
        ['⚖️', 'Nuevo icono del Mercado', 'El botón del Mercado lleva ahora una balanza.'],
        ['👨‍🌾', 'Granjero o tratante', 'Xunguir se abre en Animales o en el Mercado según tu perfil. Cámbialo cuando quieras en Configuración → Perfil.'],
      ],
    },
  ];

  // Compara versións "2.10.0" > "2.3.0"
  function comparar(a, b) {
    const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
    return 0;
  }
  const publicadas = () => LISTA.filter(n => comparar(n.version, X.VERSION) <= 0);

  function mostrar(lista, titulo) {
    ui.modal.abrir(`<div class="modal-form peq novidades">
      ${ui.cab(titulo)}
      <div class="modal-corpo">${lista.map(n => `<section>
        ${lista.length > 1 || !titulo.includes(n.version) ? `<h3 class="novidades-version">${t('versionData', { v: n.version, data: u.data(n.data) })}</h3>` : ''}
        <ul class="lista-novidades">${(n[X.lang] || n.gl).map(([ic, tit, txt]) =>
          `<li><span class="novidade-ic">${ic}</span><div><b>${u.esc(tit)}</b><p>${u.esc(txt)}</p></div></li>`).join('')}</ul></section>`).join('')}
      </div>
      ${ui.pe(`<span class="espazo"></span><button class="btn primario" data-accion="pechar">${t('entendido')}</button>`)}
    </div>`);
  }

  // Conta nova (sen ningún dato na explotación): non se lle amosan novidades.
  // null = non se sabe (sen conexión), mellor decidilo outro día
  async function contaNova() {
    if (['animais', 'parcelas', 'lotes'].some(c => X.datos.lista(c).length)) return false;
    try {
      const { data, error } = await X.nube.limite(X.nube.cliente().from('rexistros').select('id').limit(1), 8000);
      if (error) throw error;
      return !data.length;
    } catch { return null; }
  }

  // Ao abrir a app: as novidades das versións que aínda non viu
  async function comprobar() {
    const vista = X.nube.preferencia('novidades');
    if (vista === X.VERSION) return;
    let lista;
    if (vista) lista = publicadas().filter(n => comparar(n.version, vista) > 0);
    else {
      // Primeira vez con este aviso: a quen xa usaba a app amósaselle só a última versión
      const nova = await contaNova();
      if (nova === null) return;
      lista = nova ? [] : publicadas().slice(0, 1);
    }
    // Se mentres tanto abriu algo, non se lle interrompe: amósanse a próxima vez
    if (lista.length && document.getElementById('modal').open) return;
    X.nube.gardarPreferencia('novidades', X.VERSION).catch(() => { /* subirase máis tarde */ });
    if (lista.length) mostrar(lista, lista.length === 1 ? t('novidadesVersion', { v: lista[0].version }) : t('novidades'));
  }

  X.accions['ver-novidades'] = () => mostrar(publicadas(), t('novidades'));

  return { comprobar, LISTA };
})();
