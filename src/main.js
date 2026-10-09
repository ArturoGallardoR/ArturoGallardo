import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/zilla-slab/400.css';
import '@fontsource/zilla-slab/600.css';
import 'lenis/dist/lenis.css';
import './styles/tokens.css';
import './styles/main.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

import { SITE } from './config.js';
import {
  LOCKUP_SYMBOL_D,
  LOCKUP_WORDMARK_D,
  SYMBOL_BAR_D,
  SYMBOL_D,
  SYMBOL_STROKE_D,
} from './js/brand.js';
import { initBooking, setInterest } from './js/booking.js';
import { initCursor } from './js/cursor.js';
import { initMyths, initWhatIf } from './js/education.js';

gsap.registerPlugin(ScrollTrigger, SplitText);
// En móviles la barra del navegador cambia el alto al hacer scroll: no recalcular los pins por eso.
ScrollTrigger.config({ ignoreMobileResize: true });
gsap.defaults({ ease: 'power3.out', duration: 0.9 });

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ── Marca: inyecta los trazos oficiales del logo ─────────────── */
function injectBrand() {
  $$('[data-symbol-fill]').forEach((p) => p.setAttribute('d', SYMBOL_D));
  $$('[data-symbol-stroke]').forEach((p) => p.setAttribute('d', SYMBOL_STROKE_D));
  $$('[data-symbol-bar]').forEach((p) => p.setAttribute('d', SYMBOL_BAR_D));
  $$('[data-lockup-symbol]').forEach((p) => p.setAttribute('d', LOCKUP_SYMBOL_D));
  $$('[data-lockup-wordmark]').forEach((p) => p.setAttribute('d', LOCKUP_WORDMARK_D));
  const SVG_NS = 'http://www.w3.org/2000/svg';
  $$('[data-mini-mark]').forEach((el) => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '-2 14 102 88');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', SYMBOL_D);
    svg.append(path);
    el.replaceChildren(svg);
  });
  const year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
  const legal = $('[data-legal]');
  if (legal) {
    const bits = [];
    if (SITE.legal.cedula) bits.push(document.createTextNode(`Cédula CNSF ${SITE.legal.cedula}`));
    if (SITE.legal.privacyUrl) {
      const a = document.createElement('a');
      a.href = SITE.legal.privacyUrl;
      a.textContent = 'Aviso de privacidad';
      bits.push(a);
    }
    legal.replaceChildren(...bits.flatMap((b, i) => (i ? [document.createTextNode(' · '), b] : [b])));
  }
}

/* ── Lenis + ScrollTrigger ────────────────────────────────────── */
let lenis = null;
function initScroll() {
  if (reducedMotion) return;
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true, anchors: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function scrollToTarget(target) {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
}

function initAnchors() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = $(id);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(el);
    history.replaceState(null, '', id);
  });
}

/* ── Menú móvil ───────────────────────────────────────────────── */
const menu = $('[data-menu]');
const toggle = $('[data-menu-toggle]');
function closeMenu() {
  if (!menu || menu.hidden) return;
  toggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('menu-open');
  gsap.to(menu, { autoAlpha: 0, duration: 0.3, onComplete: () => (menu.hidden = true) });
  lenis?.start();
}
function initMenu() {
  toggle?.addEventListener('click', () => {
    if (!menu.hidden) return closeMenu();
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    lenis?.stop();
    gsap.fromTo(menu, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 });
    gsap.from($$('a', menu), { y: 40, autoAlpha: 0, stagger: 0.06, duration: 0.6, delay: 0.05 });
  });
  window.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());
}

/* ── Nav: se esconde al bajar, aparece al subir; cambia sobre fondos claros ── */
function initNav() {
  const nav = $('[data-nav]');
  let lastY = 0;
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      const goingDown = y > lastY;
      nav.classList.toggle('is-hidden', goingDown && y > 400 && !document.body.classList.contains('menu-open'));
      nav.classList.toggle('is-scrolled', y > 40);
      lastY = y;
    },
  });
  // Superficie bajo la barra: se mide en vivo (aguanta pins y cambios de alto).
  const probeY = () => nav.offsetHeight + 2;
  const sample = () => {
    const els = document.elementsFromPoint(window.innerWidth / 2, probeY());
    const surface = els.find((el) => !nav.contains(el) && el.closest('[data-surface]'))?.closest('[data-surface]');
    nav.classList.toggle('on-light', surface?.dataset.surface === 'light');
  };
  gsap.ticker.add(() => {
    if (window.scrollY !== sample.y) {
      sample.y = window.scrollY;
      sample();
    }
  });
}

/* ── Loader + entrada del hero ────────────────────────────────── */
function prepStroke(path) {
  const len = path.getTotalLength();
  gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
  return len;
}

function runIntro() {
  const loader = $('.loader');
  const words = $$('[data-hero-word]');
  const fades = $$('[data-hero-fade]');
  const video = $('[data-hero-video]');

  if (reducedMotion) {
    loader.remove();
    document.body.classList.add('is-ready');
    video?.pause();
    return Promise.resolve();
  }

  gsap.set(words, { yPercent: 115, rotate: 4 });
  gsap.set(fades, { autoAlpha: 0, y: 24 });
  gsap.set('[data-nav]', { autoAlpha: 0, y: -20 });
  gsap.set('.hero__media', { scale: 1.12 });

  const stroke = $('.loader__stroke');
  const bar = $('.loader__bar');
  prepStroke(stroke);
  prepStroke(bar);
  const counter = { v: 0 };
  const countEl = $('[data-loader-count]');

  const assetsReady = Promise.race([
    Promise.all([
      document.fonts.ready,
      new Promise((r) => (video && video.readyState < 3 ? video.addEventListener('canplay', r, { once: true }) : r())),
    ]),
    new Promise((r) => setTimeout(r, 3500)),
  ]);

  return new Promise((resolve) => {
    // 1) Dibujo del monograma + contador.
    const draw = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    draw.to(stroke, { strokeDashoffset: 0, duration: 1.5 }, 0.15)
      .to(bar, { strokeDashoffset: 0, duration: 0.5, ease: 'power3.out' }, 1.35)
      .to(counter, {
        v: 100,
        duration: 1.9,
        ease: 'power1.inOut',
        onUpdate: () => (countEl.textContent = Math.round(counter.v)),
      }, 0)
      .from('.loader__line', { autoAlpha: 0, y: 12, duration: 0.6, ease: 'power3.out' }, 0.6);

    // 2) Salida: telón hacia arriba y entrada del hero.
    const exit = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
    exit.to('.loader__mark', { scale: 0.86, autoAlpha: 0, duration: 0.6, ease: 'power3.in' }, 0)
      .to(['.loader__count', '.loader__line'], { autoAlpha: 0, y: -12, duration: 0.4, ease: 'power2.in' }, 0)
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.0, ease: 'expo.inOut' }, 0.35)
      .to('.hero__media', { scale: 1, duration: 2.2, ease: 'expo.out' }, 0.6)
      .to(words, { yPercent: 0, rotate: 0, duration: 1.3, stagger: 0.09, ease: 'expo.out' }, 0.75)
      .to(fades, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08 }, 1.0)
      .to('[data-nav]', { autoAlpha: 1, y: 0, duration: 0.9 }, 1.1)
      .add(() => {
        loader.remove();
        document.body.classList.add('is-ready');
        resolve();
      });

    Promise.all([assetsReady, new Promise((r) => draw.eventCallback('onComplete', r))]).then(() => {
      video?.play().catch(() => {});
      exit.play();
    });
  });
}

/* ── Hero: parallax suave al hacer scroll ─────────────────────── */
function initHero() {
  if (reducedMotion) return;
  gsap.to('.hero__content', {
    yPercent: -18,
    autoAlpha: 0.2,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('.hero__video', {
    yPercent: 12,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  // Pausa el video cuando no se ve (ahorra batería).
  const video = $('[data-hero-video]');
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => (self.isActive ? video?.play().catch(() => {}) : video?.pause()),
  });
}

/* ── Marquee: velocidad reactiva al scroll ────────────────────── */
function initMarquee() {
  const track = $('[data-marquee]');
  if (!track || reducedMotion) return;
  const loop = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
  let boost = 1;
  ScrollTrigger.create({
    onUpdate: (self) => {
      const v = self.getVelocity();
      boost = gsap.utils.clamp(-5, 5, v / 300);
      const dir = self.direction;
      gsap.to(loop, { timeScale: (dir || 1) * Math.max(1, Math.abs(boost)), duration: 0.2, overwrite: true });
      gsap.to(loop, { timeScale: dir || 1, duration: 1.2, delay: 0.25, ease: 'power2.out' });
    },
  });
}

/* ── Textos: palabras que se encienden con el scroll ──────────── */
function initTextReveals() {
  $$('[data-split-reveal]').forEach((el) => {
    const split = SplitText.create(el, { type: 'words', wordsClass: 'w' });
    if (reducedMotion) return;
    // La sección se queda fija hasta que la última palabra se enciende.
    const section = el.closest('section');
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => `+=${Math.max(window.innerHeight * 1.4, split.words.length * 26)}`,
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
      },
    });
    tl.fromTo(split.words, { opacity: 0.14 }, { opacity: 1, ease: 'none', stagger: 0.08, duration: 0.3 })
      .to({}, { duration: 0.6 }); // pausa breve con el texto completo antes de soltar
  });

  $$('[data-reveal]').forEach((el) => {
    if (reducedMotion) return;
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'line',
      autoSplit: true,
      onSplit(self) {
        return gsap.from(self.lines, {
          yPercent: 110,
          duration: 1.1,
          stagger: 0.1,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        });
      },
    });
  });
}

/* ── El hilo (three.js) ───────────────────────────────────────── */
async function initThread() {
  const section = $('[data-thread]');
  const canvas = $('[data-thread-canvas]');
  const chapters = $$('[data-chapter]');
  const bar = $('[data-thread-progress]');
  if (!section) return;

  const { supportsWebGL, createThreadScene } = await import('./js/thread-scene.js');
  let scene = null;
  if (supportsWebGL()) {
    try {
      scene = createThreadScene(canvas, { reducedMotion });
      section.classList.add('has-webgl');
    } catch (err) {
      console.warn('[hilo] WebGL no disponible', err);
    }
  }
  // Se crea después de las demás animaciones: recalcular todo con el espacio del pin.
  // Este pin se crea después (import dinámico): ordenar por posición y recalcular.
  requestAnimationFrame(() => {
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  });

  if (reducedMotion) {
    chapters.forEach((c) => c.classList.add('is-static'));
    return;
  }

  const n = chapters.length;
  let current = -1;
  const setChapter = (i) => {
    if (i === current) return;
    const prev = chapters[current];
    const next = chapters[i];
    current = i;
    if (prev) gsap.to(prev, { autoAlpha: 0, y: -30, duration: 0.45, ease: 'power2.in', overwrite: true });
    if (next) {
      gsap.fromTo(next, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.8, delay: 0.15, ease: 'expo.out', overwrite: true });
      gsap.fromTo($$('.chapter__title, p, .btn, .chapter__num', next), { y: 30, autoAlpha: 0 }, {
        y: 0, autoAlpha: 1, stagger: 0.06, duration: 0.8, delay: 0.2, ease: 'expo.out', overwrite: true,
      });
    }
  };
  gsap.set(chapters, { autoAlpha: 0 });

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => `+=${window.innerHeight * 6.5}`,
    pin: '.thread__sticky',
    scrub: true,
    anticipatePin: 1,
    onUpdate: (self) => {
      const p = self.progress;
      scene?.setProgress(p * 1.02);
      if (bar) bar.style.transform = `scaleX(${p})`;
      // Cada capítulo aparece cuando el hilo empieza a dibujar su símbolo.
      setChapter(scene ? scene.chapterAt(p) : Math.min(n - 1, Math.floor(p * n)));
    },
    onEnter: () => setChapter(0),
  });
}

/* ── Mitos y escenarios: entrada ─────────────────────────────── */
function initMythsMotion() {
  if (reducedMotion) return;
  ScrollTrigger.batch('.myths__grid > li', {
    start: 'top 88%',
    once: true,
    onEnter: (batch) => gsap.fromTo(batch, { y: 60, rotationX: -18, autoAlpha: 0 }, {
      y: 0, rotationX: 0, autoAlpha: 1, stagger: 0.08, duration: 1.1, ease: 'expo.out',
    }),
  });
  gsap.from('.whatif__tabs button', {
    y: 24, autoAlpha: 0, stagger: 0.06, duration: 0.9, ease: 'expo.out',
    scrollTrigger: { trigger: '.whatif__tabs', start: 'top 88%', once: true },
  });
  gsap.from('.whatif__panel', {
    y: 60, autoAlpha: 0, duration: 1.2, ease: 'expo.out',
    scrollTrigger: { trigger: '.whatif__panel', start: 'top 90%', once: true },
  });
}

/* ── Planes: inclinación 3D + elegir tema de la llamada ───────── */
function initPlans() {
  const cards = $$('[data-plan]');
  if (!reducedMotion) {
    ScrollTrigger.batch(cards, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) => gsap.fromTo(batch, { y: 70, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.09, duration: 1.1, ease: 'expo.out' }),
    });
  }

  cards.forEach((card) => {
    if (finePointer && !reducedMotion) {
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3.out' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3.out' });
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        rx(-y * 10);
        ry(x * 12);
        card.style.setProperty('--mx', `${(x + 0.5) * 100}%`);
        card.style.setProperty('--my', `${(y + 0.5) * 100}%`);
      });
      card.addEventListener('pointerleave', () => {
        rx(0);
        ry(0);
      });
    }
    card.querySelector('.plan__cta')?.addEventListener('click', () => {
      setInterest(card.dataset.plan);
      scrollToTarget('#agenda');
    });
  });
}

/* ── Pasos: la línea se dibuja con el scroll ──────────────────── */
function initSteps() {
  const path = $('[data-steps-line]');
  const steps = $$('[data-step]');
  if (!path || reducedMotion) return;
  const len = prepStroke(path);
  const tl = gsap.timeline({
    scrollTrigger: { trigger: '.steps__wrap', start: 'top 75%', end: 'bottom 55%', scrub: 0.8 },
  });
  tl.to(path, { strokeDashoffset: 0, ease: 'none', duration: 1 }, 0);
  steps.forEach((s, i) => {
    tl.fromTo(s, { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.35, ease: 'power3.out' }, i * 0.28);
    tl.fromTo($('.step__num', s), { scale: 0.4 }, { scale: 1, duration: 0.35, ease: 'back.out(2)' }, i * 0.28 + 0.05);
  });
  void len;
}

/* ── Sobre mí: parallax ───────────────────────────────────────── */
function initParallax() {
  if (reducedMotion) return;
  $$('[data-parallax]').forEach((el) => {
    const amount = Number(el.dataset.parallax) || 8;
    gsap.fromTo(el, { yPercent: -amount }, {
      yPercent: amount,
      ease: 'none',
      scrollTrigger: { trigger: el.closest('[data-parallax-wrap]'), start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
  gsap.from('.values li', {
    y: 40, autoAlpha: 0, stagger: 0.1, duration: 1, ease: 'expo.out',
    scrollTrigger: { trigger: '.values', start: 'top 85%', once: true },
  });
}

/* ── Agenda: entrada + celebración al reservar ────────────────── */
function initBookingMotion() {
  if (!reducedMotion) {
    gsap.from('.booking__list li', {
      x: -30, autoAlpha: 0, stagger: 0.08, duration: 0.9, ease: 'expo.out',
      scrollTrigger: { trigger: '.booking__list', start: 'top 85%', once: true },
    });
    gsap.from('.booking__card', {
      y: 80, autoAlpha: 0, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: '.booking__card', start: 'top 90%', once: true },
    });
    const loading = $('.booking__loading path');
    if (loading) {
      const len = prepStroke(loading);
      gsap.to(loading, { strokeDashoffset: -len, duration: 2.2, ease: 'power2.inOut', repeat: -1 });
    }
  }
  document.addEventListener('booking:success', () => {
    const path = $('.booking__success path');
    if (path && !reducedMotion) {
      prepStroke(path);
      gsap.to(path, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' });
      gsap.from('.booking__success h3, .booking__success p', { y: 20, autoAlpha: 0, stagger: 0.1, delay: 0.5 });
    }
    ScrollTrigger.refresh();
  });

  // El iframe de Cal.com cambia de alto: mantener ScrollTrigger y Lenis al día.
  const embed = $('[data-booking-embed]');
  if (embed) {
    const ro = new ResizeObserver(() => {
      ScrollTrigger.refresh();
      lenis?.resize();
    });
    ro.observe(embed);
  }
}

/* ── FAQ: acordeón animado ────────────────────────────────────── */
function initFaq() {
  $$('[data-faq]').forEach((item) => {
    const summary = $('summary', item);
    const body = $('.faq__body', item);
    summary.addEventListener('click', (e) => {
      if (reducedMotion) return;
      e.preventDefault();
      if (item.open) {
        gsap.to(body, {
          height: 0, autoAlpha: 0, duration: 0.45, ease: 'power3.inOut',
          onComplete: () => { item.open = false; gsap.set(body, { clearProps: 'all' }); ScrollTrigger.refresh(); },
        });
        item.classList.remove('is-open');
      } else {
        item.open = true;
        item.classList.add('is-open');
        gsap.fromTo(body, { height: 0, autoAlpha: 0 }, {
          height: 'auto', autoAlpha: 1, duration: 0.6, ease: 'expo.out',
          onComplete: () => { gsap.set(body, { clearProps: 'height' }); ScrollTrigger.refresh(); },
        });
      }
    });
  });
}

/* ── Footer: gran titular ─────────────────────────────────────── */
function initFooter() {
  if (reducedMotion) return;
  gsap.from('.footer__big span', {
    yPercent: 100,
    stagger: 0.1,
    duration: 1.3,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.footer', start: 'top 80%', once: true },
  });
}

/* ── Botones magnéticos ───────────────────────────────────────── */
function initMagnetic() {
  if (!finePointer || reducedMotion) return;
  $$('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.4);
    });
    el.addEventListener('pointerleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}

/* ── Arranque ─────────────────────────────────────────────────── */
injectBrand();
initScroll();
initAnchors();
initMenu();
initBooking();
if (finePointer && !reducedMotion) initCursor();

runIntro().then(() => {
  ScrollTrigger.refresh();
});

initNav();
initHero();
initMarquee();
initTextReveals();
initThread();
initMyths({ reducedMotion });
initWhatIf({ reducedMotion });
initMythsMotion();
initPlans();
initSteps();
initParallax();
initBookingMotion();
initFaq();
initFooter();
initMagnetic();

// Recalcular cuando las fuentes cambian métricas.
document.fonts.ready.then(() => ScrollTrigger.refresh());

if (location.hash && $(location.hash)) {
  window.addEventListener('load', () => setTimeout(() => scrollToTarget(location.hash), 2600), { once: true });
}
