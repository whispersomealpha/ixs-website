// IXS site — shared interactivity

document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      toggle.textContent = links.classList.contains('open') ? '✕' : '☰';
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.textContent = '☰';
    }));
  }

  // Highlight active nav link
  const current = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === current || (current === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

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
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  // Animated stat counters
  const counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && counters.length) {
    const countIo = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = el.getAttribute('data-count');
        const numMatch = target.match(/[\d.]+/);
        if (!numMatch) { countIo.unobserve(el); return; }
        const num = parseFloat(numMatch[0]);
        const suffix = target.replace(numMatch[0], '');
        const prefix = target.slice(0, target.indexOf(numMatch[0]));
        let cur = 0;
        const steps = 36;
        const inc = num / steps;
        const isInt = Number.isInteger(num);
        const timer = setInterval(() => {
          cur += inc;
          if (cur >= num) {
            cur = num;
            clearInterval(timer);
          }
          el.textContent = prefix + (isInt ? Math.round(cur) : cur.toFixed(1)) + suffix.replace(prefix, '');
        }, 22);
        countIo.unobserve(el);
      });
    }, { threshold: 0.4 });
    counters.forEach(el => countIo.observe(el));
  }
});
