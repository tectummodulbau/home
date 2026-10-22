/**
 * Bewegung der Seite — ein Skript, keine Bibliothek.
 *
 *  - .reveal            Einblenden beim Scrollen (Stagger über --i)
 *  - [data-stage]       Scroll-Bühne: setzt --p (0…1), steuert .iso-item[data-at]
 *                       und [data-range]-Beschriftungen
 *  - [data-count]       Zahlen zählen hoch, sobald sichtbar
 *  - [data-tilt]        Parallax auf Zeigerbewegung (nur feine Zeiger)
 *  - #scroll-progress   Lesefortschritt
 *  - #sticky-cta        mobile CTA-Leiste, ausgeblendet im Hero und am Formular
 *
 * Mit prefers-reduced-motion springt alles direkt in den Endzustand.
 */

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/* ---------- Reveal ---------- */
function initReveal() {
  const els = document.querySelectorAll<HTMLElement>('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
  );
  els.forEach((el) => io.observe(el));
}

/* ---------- Zähler ---------- */
function initCounters() {
  const els = document.querySelectorAll<HTMLElement>('[data-count]');
  const fmt = (n: number, el: HTMLElement) =>
    n.toLocaleString('de-DE', { maximumFractionDigits: +(el.dataset.decimals ?? 0), minimumFractionDigits: +(el.dataset.decimals ?? 0) });
  const run = (el: HTMLElement) => {
    const to = parseFloat(el.dataset.count ?? '0');
    if (reduce) {
      el.textContent = fmt(to, el);
      return;
    }
    const t0 = performance.now();
    const dur = 1400;
    const tick = (now: number) => {
      const t = clamp((now - t0) / dur);
      el.textContent = fmt(to * ease(t), el);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (!('IntersectionObserver' in window)) {
    els.forEach(run);
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        run(e.target as HTMLElement);
        io.unobserve(e.target);
      }
    },
    { threshold: 0.6 },
  );
  els.forEach((el) => io.observe(el));
}

/* ---------- Scroll-Bühnen ---------- */
interface Stage {
  el: HTMLElement;
  items: { el: SVGElement; a: number; b: number }[];
  ranges: { el: HTMLElement; a: number; b: number }[];
}

function initStages() {
  const stages: Stage[] = [...document.querySelectorAll<HTMLElement>('[data-stage]')].map((el) => ({
    el,
    items: [...el.querySelectorAll<SVGElement>('.iso-item[data-at]')].map((n) => {
      const [a, b] = (n.dataset.at ?? '0,1').split(',').map(Number);
      return { el: n, a, b };
    }),
    ranges: [...el.querySelectorAll<HTMLElement>('[data-range]')].map((n) => {
      const [a, b] = (n.dataset.range ?? '0,1').split(',').map(Number);
      return { el: n, a, b };
    }),
  }));
  if (!stages.length) return;

  const paint = (s: Stage, p: number) => {
    s.el.style.setProperty('--p', p.toFixed(4));
    for (const it of s.items) {
      const k = ease(clamp((p - it.a) / (it.b - it.a)));
      (it.el as unknown as HTMLElement).style.setProperty('--k', k.toFixed(3));
    }
    let active = -1;
    s.ranges.forEach((r, i) => {
      const on = p >= r.a && p < r.b + (i === s.ranges.length - 1 ? 0.01 : 0);
      r.el.classList.toggle('is-on', on);
      r.el.classList.toggle('is-past', p >= r.b);
      if (on) active = i;
    });
    s.el.dataset.step = String(active);
  };

  if (reduce) {
    stages.forEach((s) => {
      s.el.classList.add('is-static');
      paint(s, 1);
    });
    return;
  }

  // Zielwert aus der Scrollposition, angezeigter Wert läuft gedämpft hinterher:
  // grobe Touch-Scroll-Schritte (iOS meldet Scroll-Events sprunghaft) werden so
  // zu einer weichen Bewegung.
  const state = stages.map(() => ({ target: 0, shown: 0, init: false }));
  let running = false;

  const frame = () => {
    let busy = false;
    stages.forEach((s, i) => {
      const st = state[i];
      const diff = st.target - st.shown;
      if (Math.abs(diff) < 0.0004) {
        if (st.shown !== st.target) {
          st.shown = st.target;
          paint(s, st.shown);
        }
        return;
      }
      st.shown += diff * 0.16;
      paint(s, st.shown);
      busy = true;
    });
    if (busy) requestAnimationFrame(frame);
    else running = false;
  };

  const update = () => {
    const vh = innerHeight;
    stages.forEach((s, i) => {
      const r = s.el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      const st = state[i];
      st.target = clamp(-r.top / Math.max(1, r.height - vh));
      if (!st.init) {
        st.init = true;
        st.shown = st.target;
        paint(s, st.shown);
      }
    });
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  };
  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();
}

/* ---------- Parallax ---------- */
function initTilt() {
  if (reduce || !matchMedia('(pointer: fine)').matches) return;
  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--px', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      el.style.setProperty('--py', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--px', '0');
      el.style.setProperty('--py', '0');
    });
  });
}

/* ---------- Fortschritt & Sticky-CTA ---------- */
function initChrome() {
  const bar = document.getElementById('scroll-progress');
  const cta = document.getElementById('sticky-cta');
  const form = document.getElementById('anfrage');
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? clamp(scrollY / max) : 0})`;
    if (cta) {
      const inForm = form ? form.getBoundingClientRect().top < innerHeight * 0.6 : false;
      cta.classList.toggle('is-visible', scrollY > innerHeight * 0.7 && !inForm);
    }
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
}

initReveal();
initCounters();
initStages();
initTilt();
initChrome();
