// js/home.js — défilement des témoignages (scroll-snap natif, les boutons ne font que scroller)

(function () {
  const track = document.getElementById('testiTrack');
  if (!track) return;

  document.querySelectorAll('[data-testi-dir]').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = track.querySelector('.testi');
      if (!card) return;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 16;
      const step = card.getBoundingClientRect().width + gap;
      track.scrollBy({ left: Number(btn.dataset.testiDir) * step, behavior: 'smooth' });
    });
  });
})();
