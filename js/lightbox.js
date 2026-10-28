// js/lightbox.js — agrandissement des captures au clic (page Analytics).
// Cible les jauges de la section Objectifs (.shot-grid img), les rend accessibles au
// clavier (Entrée / Espace) et les ouvre dans un <dialog> natif.
//   - À l'ouverture, l'image s'affiche à sa taille réelle (100 % = un pixel de
//     l'image pour un pixel d'écran, donc aucune perte de netteté), réduite
//     seulement si elle ne tient pas dans la fenêtre, en gardant ses proportions.
//   - Zoom : boutons − / +, touches − / +, Ctrl + molette, double-clic. Le bouton
//     du milieu bascule entre « taille réelle » et « ajusté à l'écran ». Au-delà
//     de l'écran, la zone défile (glisser ou barres de défilement).
//   - Fermeture : Échap, clic sur le fond, bouton Fermer. Flèches ← → pour
//     passer d'une image à l'autre. Les images masquées par le CSS (bandes
//     larges sur mobile) sont ignorées.

(function () {
  const all = Array.from(document.querySelectorAll('.shot-grid img'));
  if (!all.length) return;

  const STEP = 1.25, ZOOM_MIN = 0.25, ZOOM_MAX = 4;

  const svg = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
  const icon = {
    close: svg('M6 6l12 12M18 6 6 18'),
    prev:  svg('m15 6-6 6 6 6'),
    next:  svg('m9 6 6 6-6 6'),
    minus: svg('M5 12h14'),
    plus:  svg('M12 5v14M5 12h14')
  };

  const dlg = document.createElement('dialog');
  dlg.className = 'lightbox';
  dlg.setAttribute('aria-label', 'Image agrandie');
  dlg.innerHTML =
    '<button type="button" class="lb-btn lb-close" aria-label="Fermer">' + icon.close + '</button>' +
    '<button type="button" class="lb-btn lb-prev" aria-label="Image précédente">' + icon.prev + '</button>' +
    '<button type="button" class="lb-btn lb-next" aria-label="Image suivante">' + icon.next + '</button>' +
    '<figure>' +
      '<div class="lb-stage"><img alt=""></div>' +
      '<figcaption></figcaption>' +
      '<div class="lb-tools" role="group" aria-label="Zoom">' +
        '<button type="button" class="lb-btn lb-out" aria-label="Réduire">' + icon.minus + '</button>' +
        '<button type="button" class="lb-btn lb-fit" title="Taille réelle / ajuster à l’écran">100 %</button>' +
        '<button type="button" class="lb-btn lb-in" aria-label="Agrandir">' + icon.plus + '</button>' +
      '</div>' +
    '</figure>';
  document.body.appendChild(dlg);

  const stage = dlg.querySelector('.lb-stage');
  const lbImg = dlg.querySelector('img');
  const lbCap = dlg.querySelector('figcaption');
  const fitBtn = dlg.querySelector('.lb-fit');
  let list = [];
  let index = 0;
  let fit = 1;   // échelle qui ajuste l'image entière à la scène
  let zoom = 1;  // échelle affichée : 1 = taille réelle de l'image

  // Échelle « ajustée » : la plus grande qui fait tenir l'image entière dans la scène.
  function fitScale() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!lbImg.naturalWidth || !w || !h) return 1;
    return Math.min(w / lbImg.naturalWidth, h / lbImg.naturalHeight);
  }

  // Échelle par défaut : taille réelle, ou ajustée si l'image déborde de la scène.
  function defaultZoom() { return Math.min(1, fit); }

  function apply(keepCenter) {
    const s = zoom;
    const w = Math.round(lbImg.naturalWidth * s), h = Math.round(lbImg.naturalHeight * s);
    const oldW = lbImg.offsetWidth;
    const cx = stage.scrollLeft + stage.clientWidth / 2, cy = stage.scrollTop + stage.clientHeight / 2;
    lbImg.style.width = w + 'px';
    lbImg.style.height = h + 'px';
    if (keepCenter && oldW) {
      const r = w / oldW;
      stage.scrollLeft = cx * r - stage.clientWidth / 2;
      stage.scrollTop = cy * r - stage.clientHeight / 2;
    }
    fitBtn.textContent = Math.round(zoom * 100) + ' %';
    stage.classList.toggle('is-zoomed', zoom > 1.001);
  }

  function setZoom(z, keepCenter) {
    zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
    apply(keepCenter !== false);
  }

  function show(n) {
    index = (n + list.length) % list.length;
    const src = list[index];
    lbImg.removeAttribute('style');
    lbImg.alt = src.alt;
    lbCap.textContent = src.alt;
    // Changer src déclenche toujours « load », même depuis le cache : c'est lui qui ajuste.
    lbImg.src = src.currentSrc || src.src;
  }

  function onLoaded() {
    fit = fitScale();
    zoom = defaultZoom();
    apply(false);
  }
  lbImg.addEventListener('load', onLoaded);

  function open(img) {
    // Seules les images réellement affichées entrent dans la séquence.
    list = all.filter(i => i.getClientRects().length > 0);
    if (list.length < 2) dlg.setAttribute('data-single', ''); else dlg.removeAttribute('data-single');
    document.documentElement.classList.add('lb-open');
    dlg.showModal();
    show(Math.max(0, list.indexOf(img)));
    dlg.querySelector('.lb-close').focus();
  }

  all.forEach(img => {
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', (img.alt || 'Image') + ' (agrandir)');
    img.addEventListener('click', () => open(img));
    img.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
    });
  });

  dlg.querySelector('.lb-close').addEventListener('click', () => dlg.close());
  dlg.querySelector('.lb-prev').addEventListener('click', () => show(index - 1));
  dlg.querySelector('.lb-next').addEventListener('click', () => show(index + 1));
  dlg.querySelector('.lb-out').addEventListener('click', () => setZoom(zoom / STEP));
  dlg.querySelector('.lb-in').addEventListener('click', () => setZoom(zoom * STEP));
  // Bascule taille réelle ↔ ajusté à l'écran (utile quand l'image déborde ou est petite).
  const toggleFit = () => setZoom(Math.abs(zoom - 1) < 0.001 ? fit : 1);
  fitBtn.addEventListener('click', toggleFit);
  lbImg.addEventListener('dblclick', toggleFit);

  // Ctrl + molette (ou pincement sur pavé tactile) : zoom au lieu du zoom de page.
  stage.addEventListener('wheel', e => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom(e.deltaY < 0 ? zoom * STEP : zoom / STEP);
  }, { passive: false });

  // Glisser pour se déplacer dans une image plus grande que l'écran.
  let drag = null;
  stage.addEventListener('pointerdown', e => {
    if (!stage.classList.contains('is-zoomed') || e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, left: stage.scrollLeft, top: stage.scrollTop };
    stage.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    stage.scrollLeft = drag.left - (e.clientX - drag.x);
    stage.scrollTop = drag.top - (e.clientY - drag.y);
  });
  const endDrag = () => { drag = null; };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); }); // clic sur le fond
  dlg.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'ArrowRight') show(index + 1);
    else if (e.key === '+' || e.key === '=') setZoom(zoom * STEP);
    else if (e.key === '-') setZoom(zoom / STEP);
    else if (e.key === '0') setZoom(1);
    else return;
    e.preventDefault();
  });
  window.addEventListener('resize', () => {
    if (!dlg.open || !lbImg.naturalWidth) return;
    const wasDefault = Math.abs(zoom - defaultZoom()) < 0.001;
    fit = fitScale();
    if (wasDefault) zoom = defaultZoom();
    apply(false);
  });
  dlg.addEventListener('close', () => {
    document.documentElement.classList.remove('lb-open');
    lbImg.removeAttribute('src');
    lbImg.removeAttribute('style');
  });
})();
