import { SITE } from '../config.js';
import {
  buildCalConfig,
  contactLinks,
  resolveBooking,
  trackingFromSearch,
} from './booking-config.js';

const NS = 'primera-llamada';
const LOAD_TIMEOUT_MS = 15000;
const COMPACT_QUERY = '(max-width: 760px)';

// Paleta Enlace aplicada al Booker de Cal.com (modo claro sobre tarjeta blanca).
const CAL_THEME = {
  light: {
    'cal-brand': '#e77c46',
    'cal-brand-emphasis': '#c2612f',
    'cal-brand-text': '#071116',
    'cal-brand-subtle': '#fed6c3',
    'cal-text': '#2f404a',
    'cal-text-emphasis': '#2f404a',
    'cal-text-subtle': '#4b575f',
    'cal-text-muted': '#69757c',
    'cal-bg': '#ffffff',
    'cal-bg-emphasis': '#f1e1d1',
    'cal-bg-subtle': '#fbf4ee',
    'cal-bg-muted': '#fbf4ee',
    'cal-border': '#e7d7c7',
    'cal-border-subtle': '#efe3d7',
    'cal-border-emphasis': '#2f404a',
    'cal-border-booker': 'transparent',
    'cal-border-booker-width': '0px',
    radius: '0.75rem',
  },
};

let state = { interest: null, started: false, done: false };
let rerender = null; // lo define startCal; redibuja la agenda en el modo que toque
let els;

function $(sel) {
  return document.querySelector(sel);
}

function show(el, visible) {
  if (el) el.hidden = !visible;
}

function renderContacts(container, interest) {
  if (!container) return;
  container.replaceChildren();
  const links = contactLinks(SITE.contact, interest);
  for (const link of links) {
    const a = document.createElement('a');
    a.className = link.kind === 'whatsapp' ? 'btn btn--primary' : 'btn btn--ghost-dark';
    a.href = link.href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = link.label;
    container.append(a);
  }
  return links.length;
}

function fail(message) {
  if (state.done) return;
  show(els.loading, false);
  show(els.embed, false);
  if (message) els.fallbackMsg.textContent = message;
  const count = renderContacts(els.contacts, state.interest);
  if (!count) {
    els.fallbackMsg.textContent = import.meta.env.DEV
      ? `${message || ''} Configura la agenda y los contactos en src/config.js (ver README).`
      : 'La agenda estará disponible muy pronto.';
  }
  show(els.fallback, true);
}

function onBooked() {
  state.done = true;
  show(els.loading, false);
  show(els.embed, false);
  show(els.fallback, false);
  show(els.success, true);
  els.root.dispatchEvent(new CustomEvent('booking:success', { bubbles: true }));
  // Para medición (GA4 / GTM) si se agrega más adelante.
  window.dataLayer?.push({ event: 'booking_success', interest: state.interest || undefined });
}

/* Snippet oficial de Cal.com (embed.js), cargado solo cuando hace falta. */
function loadCal(embedScript) {
  (function (C, A, L) {
    const p = (a, ar) => a.q.push(ar);
    const d = C.document;
    C.Cal =
      C.Cal ||
      function () {
        const cal = C.Cal;
        const ar = arguments;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          const s = d.createElement('script');
          s.src = A;
          s.async = true;
          s.onerror = () => fail('No pudimos conectar con la agenda.');
          d.head.appendChild(s);
          cal.loaded = true;
        }
        if (ar[0] === L) {
          const api = function () {
            p(api, arguments);
          };
          const namespace = ar[1];
          api.q = api.q || [];
          if (typeof namespace === 'string') {
            cal.ns[namespace] = cal.ns[namespace] || api;
            p(cal.ns[namespace], ar);
            p(cal, ['initNamespace', namespace]);
          } else p(cal, ar);
          return;
        }
        p(cal, ar);
      };
  })(window, embedScript, 'init');
}

function startCal(resolved) {
  loadCal(resolved.embedScript);
  const Cal = window.Cal;
  Cal('init', NS, { origin: resolved.origin });
  const api = Cal.ns[NS];

  const timer = setTimeout(() => fail('La agenda está tardando más de lo normal.'), LOAD_TIMEOUT_MS);
  const ready = () => {
    clearTimeout(timer);
    show(els.loading, false);
    els.embed.classList.add('is-ready');
  };

  api('on', { action: 'linkReady', callback: ready });
  api('on', { action: 'bookerReady', callback: ready });
  api('on', { action: 'linkFailed', callback: () => { clearTimeout(timer); fail('No encontramos la agenda configurada.'); } });
  api('on', { action: 'bookingSuccessfulV2', callback: onBooked });
  api('on', { action: 'bookingSuccessful', callback: onBooked });

  api('ui', {
    theme: 'light',
    hideEventTypeDetails: false,
    layout: 'month_view',
    cssVarsPerTheme: CAL_THEME,
  });
  // En pantallas angostas Cal.com apila todos los horarios y el embed se vuelve
  // larguísimo: ahí mostramos un botón que abre la agenda en su propia ventana.
  // Se reevalúa al cambiar el tamaño (rotar el teléfono, redimensionar la ventana).
  const mq = window.matchMedia(COMPACT_QUERY);
  let mode = null;
  rerender = (force = false) => {
    if (state.done) return;
    const next = mq.matches ? 'compact' : 'inline';
    if (next === mode && !force) return;
    mode = next;
    const config = buildCalConfig({
      interest: state.interest,
      tracking: trackingFromSearch(window.location.search),
    });
    if (next === 'compact') {
      clearTimeout(timer);
      renderCompact(resolved, config);
      return;
    }
    els.root.classList.remove('is-compact');
    els.embed.classList.remove('is-ready');
    els.embed.replaceChildren();
    show(els.loading, true);
    api('inline', { elementOrSelector: '#agenda-embed', calLink: resolved.calLink, config });
  };
  rerender();
  mq.addEventListener('change', () => rerender());
}

function renderCompact(resolved, config) {
  show(els.loading, false);
  els.root.classList.add('is-compact');
  const wrap = document.createElement('div');
  wrap.className = 'booking__compact';
  const title = document.createElement('h3');
  title.textContent = 'Elige tu horario';
  const text = document.createElement('p');
  text.textContent = 'Se abre mi calendario con los horarios libres. Escoges día y hora, y listo.';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn--primary btn--lg';
  btn.textContent = 'Ver horarios disponibles';
  // Cal.com escucha clics en elementos con data-cal-link y abre su ventana.
  btn.dataset.calLink = resolved.calLink;
  btn.dataset.calNamespace = NS;
  btn.dataset.calConfig = JSON.stringify({ ...config, layout: 'month_view' });
  wrap.append(title, text, btn);
  els.embed.replaceChildren(wrap);
  els.embed.classList.add('is-ready');
}

function startGoogle(resolved) {
  const iframe = document.createElement('iframe');
  iframe.src = resolved.url;
  iframe.title = 'Agenda una llamada con Arturo Gallardo';
  iframe.loading = 'lazy';
  iframe.className = 'booking__iframe';
  const timer = setTimeout(() => fail('La agenda está tardando más de lo normal.'), LOAD_TIMEOUT_MS);
  iframe.addEventListener('load', () => {
    clearTimeout(timer);
    show(els.loading, false);
    els.embed.classList.add('is-ready');
  });
  els.embed.append(iframe);
}

function start() {
  if (state.started) return;
  state.started = true;
  const resolved = resolveBooking(SITE.booking);
  if (resolved.kind === 'cal') startCal(resolved);
  else if (resolved.kind === 'google') startGoogle(resolved);
  else fail(resolved.reason);
}

/** Guarda el plan que eligió el lead; si la agenda aún no carga, viaja como nota. */
export function setInterest(interest) {
  state.interest = interest;
  if (els?.interest) {
    els.interestLabel.textContent = interest;
    show(els.interest, true);
  }
  if (!els.fallback.hidden) renderContacts(els.contacts, interest);
  // En modo compacto el botón lleva el tema en su configuración: actualizarlo.
  if (els.root.classList.contains('is-compact')) rerender?.(true);
}

export function initBooking() {
  els = {
    root: $('[data-booking-root]'),
    loading: $('[data-booking-loading]'),
    embed: $('[data-booking-embed]'),
    fallback: $('[data-booking-fallback]'),
    fallbackMsg: $('[data-booking-fallback-msg]'),
    contacts: $('[data-booking-contacts]'),
    success: $('[data-booking-success]'),
    interest: $('[data-booking-interest]'),
    interestLabel: $('[data-booking-interest-label]'),
  };
  if (!els.root) return;

  // Carga diferida: el script de Cal.com solo se pide cuando la agenda se acerca.
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        start();
      }
    },
    { rootMargin: '900px 0px' },
  );
  io.observe(els.root);

  // Enlaces de respaldo en el footer.
  const footer = $('[data-footer-contacts]');
  if (footer) {
    for (const link of contactLinks(SITE.contact)) {
      const a = document.createElement('a');
      a.href = link.href;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = link.label;
      footer.append(a);
    }
  }
}
