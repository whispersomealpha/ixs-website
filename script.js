// IXS single-page site — shared interactivity
// (Menu/tab wiring can hook into the section IDs already on the page:
//  #overview #credibility #timeline #how-it-works #buildout #partnerships #ecosystem #tokenomics #footer)

document.addEventListener('DOMContentLoaded', () => {
  // Scroll reveal
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }
});
