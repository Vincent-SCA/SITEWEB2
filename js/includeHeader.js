// js/includeHeader.js
// Injecte components/header.html, marque la page courante et gère le menu mobile.
// Exécuté dès le chargement (script placé juste après #header-placeholder) :
// le placeholder réserve déjà la hauteur en CSS, donc pas de saut de mise en page.

(function () {
  const placeholder = document.getElementById('header-placeholder');
  if (!placeholder) return;

  fetch('/components/header.html')
    .then(r => r.text())
    .then(html => {
      placeholder.innerHTML = html;
      markCurrentPage();
      initMenu();
    })
    .catch(err => console.error('Header load error:', err));

  function markCurrentPage() {
    // Les URL propres (/cadealer2) et les .html (/cadealer2.html) pointent sur le même lien.
    const path = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
    document.querySelectorAll('#siteNav a').forEach(a => {
      const href = a.getAttribute('href').replace(/\/$/, '') || '/';
      if (href === path) a.setAttribute('aria-current', 'page');
    });
  }

  function initMenu() {
    const header = document.getElementById('siteHeader');
    const btn = document.getElementById('menuBtn');
    if (!header || !btn) return;

    const setOpen = open => {
      header.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    };

    btn.addEventListener('click', () => setOpen(!header.classList.contains('open')));
    document.querySelectorAll('#siteNav a').forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 960) setOpen(false); });
  }
})();
