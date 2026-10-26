// js/includeFooter.js
// Injecte components/footer.html et insère l'année courante.

(function () {
  const placeholder = document.getElementById('footer-placeholder');
  if (!placeholder) return;

  fetch('/components/footer.html')
    .then(r => r.text())
    .then(html => {
      placeholder.innerHTML = html;
      const y = document.getElementById('currentYear');
      if (y) y.textContent = new Date().getFullYear();
    })
    .catch(err => console.error('Footer load error:', err));
})();
