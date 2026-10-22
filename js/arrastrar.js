'use strict';

// Arrastrar tarxetas de animais:
//  · enriba dun grupo → engádeo ao grupo
//  · enriba doutro animal → crea un grupo novo cos dous (pregunta o nome)
//  · enriba de "Novo grupo" → crea un grupo só con el
// No móbil empeza cun toque longo; co rato, ao mover un pouco co botón premido.
X.arrastre = (() => {
  const ui = X.ui, D = X.datos;
  const t = (...a) => X.t(...a);
  const TOQUE_LONGO = 380, LIMIAR = 8;

  let e = null;            // arrastre en curso
  let bloquearClic = false;

  const $ = s => document.querySelector(s);

  function barra() {
    const gs = D.lista('grupos').sort(X.u.porNome);
    const b = $('#barraSoltar');
    b.innerHTML = `<p>${t('axudaArrastre')}</p><div class="destinos">
      ${gs.map(g => `<span class="destino" data-soltar="grupo" data-grupo="${g.id}">👥 ${X.u.esc(g.nome)} <small>${X.vGrupos.membros(g).length}</small></span>`).join('')}
      <span class="destino novo" data-soltar="novo">${ui.ic('plus')} ${t('novoGrupo')}</span></div>`;
    b.hidden = false;
  }

  function iniciar(x, y) {
    clearTimeout(e.timer);
    const a = D.obter('animais', e.id);
    if (!a) { cancelar(); return; }
    e.activo = true;
    if (navigator.vibrate) navigator.vibrate(30);
    const f = document.createElement('div');
    f.className = 'fantasma-arrastre';
    f.innerHTML = `<span class="avatar">${ui.foto(a)}</span><b>${X.u.esc(a.nome)}</b>`;
    document.body.append(f);
    X.fotos.hidratar(f);
    e.fantasma = f;
    e.card.classList.add('arrastrando');
    document.body.classList.add('modo-arrastre');
    barra();
    mover(x, y);
    e.raf = requestAnimationFrame(autoScroll);
  }

  function destino(x, y) {
    const el = document.elementFromPoint(x, y);
    const d = el && el.closest('[data-soltar]');
    return d && d !== e.card ? d : null;
  }

  function mover(x, y) {
    e.x = x; e.y = y;
    e.fantasma.style.transform = `translate(${x - 24}px, ${y - 24}px)`;
    const d = destino(x, y);
    if (d !== e.sobre) {
      if (e.sobre) e.sobre.classList.remove('sobre');
      if (d) d.classList.add('sobre');
      e.sobre = d;
    }
  }

  // Despraza a páxina ao achegarse aos bordos, para chegar a tarxetas fóra da pantalla
  function autoScroll() {
    if (!e || !e.activo) return;
    const arriba = $('#barra').getBoundingClientRect().bottom + 40;
    const abaixo = $('#barraSoltar').getBoundingClientRect().top - 30;
    if (e.y < arriba) window.scrollBy(0, -Math.min(18, (arriba - e.y) / 2));
    else if (e.y > abaixo && e.y < abaixo + 30) window.scrollBy(0, Math.min(18, (e.y - abaixo) / 2 + 4));
    e.raf = requestAnimationFrame(autoScroll);
  }

  function rematar() {
    if (!e) return;
    clearTimeout(e.timer);
    cancelAnimationFrame(e.raf);
    if (e.fantasma) e.fantasma.remove();
    if (e.sobre) e.sobre.classList.remove('sobre');
    if (e.card) e.card.classList.remove('arrastrando');
    document.body.classList.remove('modo-arrastre');
    $('#barraSoltar').hidden = true;
    e = null;
  }
  const cancelar = rematar;

  function soltar(x, y) {
    const d = destino(x, y), id = e.id;
    rematar();
    // O clic que vén despois de soltar non debe abrir a ficha
    bloquearClic = true;
    setTimeout(() => { bloquearClic = false; }, 400);
    if (!d) return;
    if (d.dataset.soltar === 'grupo') X.vGrupos.engadir(id, d.dataset.grupo);
    else if (d.dataset.soltar === 'animal' && d.dataset.id !== id) X.vGrupos.novo([id, d.dataset.id]);
    else if (d.dataset.soltar === 'novo') X.vGrupos.novo([id]);
  }

  document.addEventListener('pointerdown', ev => {
    const card = ev.target.closest('.tarxeta-animal[data-arrastrable]');
    if (!card || ev.button > 0 || e) return;
    e = { id: card.dataset.id, card, x0: ev.clientX, y0: ev.clientY, x: ev.clientX, y: ev.clientY, rato: ev.pointerType === 'mouse', activo: false };
    if (!e.rato) e.timer = setTimeout(() => e && iniciar(e.x, e.y), TOQUE_LONGO);
  });

  document.addEventListener('pointermove', ev => {
    if (!e) return;
    if (!e.activo) {
      const d = Math.hypot(ev.clientX - e.x0, ev.clientY - e.y0);
      e.x = ev.clientX; e.y = ev.clientY;
      if (d <= LIMIAR) return;
      if (e.rato && ev.buttons === 1) iniciar(ev.clientX, ev.clientY);
      else cancelar(); // no móbil, moverse antes do toque longo é desprazar a páxina
      return;
    }
    mover(ev.clientX, ev.clientY);
  });

  document.addEventListener('pointerup', ev => {
    if (!e) return;
    if (e.activo) soltar(ev.clientX, ev.clientY); else cancelar();
  });
  document.addEventListener('pointercancel', () => cancelar());

  // Mentres se arrastra co dedo, que a páxina non se desprace nin saia o menú do toque longo
  document.addEventListener('touchmove', ev => { if (e && e.activo) ev.preventDefault(); }, { passive: false });
  document.addEventListener('contextmenu', ev => { if (e || ev.target.closest('.tarxeta-animal[data-arrastrable]')) ev.preventDefault(); });
  document.addEventListener('click', ev => {
    if (bloquearClic) { ev.stopPropagation(); ev.preventDefault(); bloquearClic = false; }
  }, true);

  return { cancelar };
})();
