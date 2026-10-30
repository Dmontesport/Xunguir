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
      version: '2.5.0', data: '2026-10-30',
      gl: [
        ['🎨', 'Novo aspecto do Mercado', 'Cores novas sacadas da súa icona (carbón e ámbar) e unha icona propia no botón.'],
        ['🏷️', 'Anuncios máis grandes', 'Cada anuncio ocupa agora todo o ancho: a foto á esquerda, os datos á dereita e o prezo nunha etiqueta sobre a foto.'],
        ['✨', 'Nova entrada', 'Ao abrir Xunguir, o logo debúxase e voa ao seu sitio.'],
        ['🌍', 'Catro idiomas máis', 'Euskera, catalán, valenciano e asturiano. Escólleo en Configuración → Idioma.'],
      ],
      es: [
        ['🎨', 'Nuevo aspecto del Mercado', 'Colores nuevos sacados de su icono (carbón y ámbar) y un icono propio en el botón.'],
        ['🏷️', 'Anuncios más grandes', 'Cada anuncio ocupa ahora todo el ancho: la foto a la izquierda, los datos a la derecha y el precio en una etiqueta sobre la foto.'],
        ['✨', 'Nueva entrada', 'Al abrir Xunguir, el logo se dibuja y vuela a su sitio.'],
        ['🌍', 'Cuatro idiomas más', 'Euskera, catalán, valenciano y asturiano. Elígelo en Configuración → Idioma.'],
      ],
      eu: [
        ['🎨', 'Merkatuaren itxura berria', 'Kolore berriak, haren ikonotik hartuak (ikatza eta anbarra), eta ikono propioa botoian.'],
        ['🏷️', 'Iragarki handiagoak', 'Iragarki bakoitzak zabalera osoa hartzen du orain: argazkia ezkerrean, datuak eskuinean eta prezioa argazkiaren gaineko etiketa batean.'],
        ['✨', 'Sarrera berria', 'Xunguir irekitzean, logoa marraztu eta bere lekura hegan doa.'],
        ['🌍', 'Lau hizkuntza gehiago', 'Euskara, katalana, valentziera eta asturiera. Aukeratu Ezarpenak → Hizkuntza atalean.'],
      ],
      ca: [
        ['🎨', 'Nou aspecte del Mercat', 'Colors nous trets de la seva icona (carbó i ambre) i una icona pròpia al botó.'],
        ['🏷️', 'Anuncis més grans', 'Ara cada anunci ocupa tota l’amplada: la foto a l’esquerra, les dades a la dreta i el preu en una etiqueta sobre la foto.'],
        ['✨', 'Entrada nova', 'En obrir Xunguir, el logotip es dibuixa i vola al seu lloc.'],
        ['🌍', 'Quatre idiomes més', 'Basc, català, valencià i asturià. Tria’l a Configuració → Idioma.'],
      ],
      ast: [
        ['🎨', 'Aspeutu nuevu del Mercáu', 'Colores nuevos sacaos del so iconu (carbón y ámbar) y un iconu propiu nel botón.'],
        ['🏷️', 'Anuncios más grandes', 'Cada anunciu ocupa agora tol anchu: la semeya a la izquierda, los datos a la drecha y el preciu nuna etiqueta enriba de la semeya.'],
        ['✨', 'Entrada nueva', 'Al abrir Xunguir, el logu dibúxase y vuela al so sitiu.'],
        ['🌍', 'Cuatro llingües más', 'Vascu, catalán, valencianu y asturianu. Escuéyila en Configuración → Llingua.'],
      ],
      va: [
        ['🎨', 'Nou aspecte del Mercat', 'Colors nous trets de la seua icona (carbó i ambre) i una icona pròpia en el botó.'],
        ['🏷️', 'Anuncis més grans', 'Cada anunci ocupa ara tota l’amplària: la foto a l’esquerra, les dades a la dreta i el preu en una etiqueta damunt de la foto.'],
        ['✨', 'Nova entrada', 'En obrir Xunguir, el logo es dibuixa i vola al seu lloc.'],
        ['🌍', 'Quatre idiomes més', 'Basc, català, valencià i asturià. Tria’l en Configuració → Idioma.'],
      ],
    },
    {
      version: '2.4.0', data: '2026-10-29',
      gl: [
        ['🏚️', 'Vende o teu almacén no Mercado', 'Agora tamén podes anunciar alpacas, rolos, microsilos, silo e sacos. Arriba do Mercado escolle «Todo», «Animais» ou «Almacén».'],
        ['📦', 'Desde un lote', 'Ao publicar, podes partir dun lote do teu almacén e cóllense o tipo, o contido e o que queda. Cando o marques como vendido, pregúntache se o queres quitar do almacén.'],
        ['🌍', 'Todo no teu idioma', 'Os nomes das especies (Vacún/Vacuno, Galiñas/Gallinas…) cambian agora co idioma, salvo as que renomeases ti.'],
        ['🏳️', 'Bandeiras', 'Ao escoller o idioma aparecen as bandeiras de Galicia e de España para que sexa máis claro.'],
      ],
      es: [
        ['🏚️', 'Vende tu almacén en el Mercado', 'Ahora también puedes anunciar alpacas, rollos, microsilos, silo y sacos. Arriba del Mercado elige «Todo», «Animales» o «Almacén».'],
        ['📦', 'Desde un lote', 'Al publicar, puedes partir de un lote de tu almacén y se cogen el tipo, el contenido y lo que queda. Cuando lo marques como vendido, te pregunta si quieres quitarlo del almacén.'],
        ['🌍', 'Todo en tu idioma', 'Los nombres de las especies (Vacún/Vacuno, Galiñas/Gallinas…) cambian ahora con el idioma, salvo las que hayas renombrado tú.'],
        ['🏳️', 'Banderas', 'Al elegir el idioma aparecen las banderas de Galicia y de España para que sea más claro.'],
      ],
    },
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
    // Directamente na caixa da ventá (como as fichas): só así o corpo se despraza co dedo
    ui.modal.abrir(`${ui.cab(titulo)}
      <div class="modal-corpo novidades">${lista.map(n => `<section>
        ${lista.length > 1 || !titulo.includes(n.version) ? `<h3 class="novidades-version">${t('versionData', { v: n.version, data: u.data(n.data) })}</h3>` : ''}
        <ul class="lista-novidades">${X.enLingua(n).map(([ic, tit, txt]) =>
          `<li><span class="novidade-ic">${ic}</span><div><b>${u.esc(tit)}</b><p>${u.esc(txt)}</p></div></li>`).join('')}</ul></section>`).join('')}
      </div>
      ${ui.pe(`<span class="espazo"></span><button class="btn primario" data-accion="pechar">${t('entendido')}</button>`)}`);
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
      // Primeira vez con este aviso: quen xa usaba a app vén dunha versión anterior á 2.3.0 → todas
      const nova = await contaNova();
      if (nova === null) return;
      lista = nova ? [] : publicadas();
    }
    // Se mentres tanto abriu algo, non se lle interrompe: amósanse a próxima vez
    if (lista.length && document.getElementById('modal').open) return;
    X.nube.gardarPreferencia('novidades', X.VERSION).catch(() => { /* subirase máis tarde */ });
    if (lista.length) mostrar(lista, lista.length === 1 ? t('novidadesVersion', { v: lista[0].version }) : t('novidades'));
  }

  X.accions['ver-novidades'] = () => mostrar(publicadas(), t('novidades'));

  return { comprobar, LISTA };
})();
