import gsap from 'gsap';

/*
 * Puntero de marca: un punto naranja y un anillo que lo sigue con inercia.
 * - Sobre enlaces/botones el anillo crece.
 * - Con [data-cursor="Texto"] muestra una etiqueta (p. ej. "Agendar").
 * - Cambia de tinta según la superficie (Pizarra ↔ Arena) para mantener contraste.
 * Solo se activa con puntero fino (mouse/trackpad).
 */
export function initCursor() {
  const root = document.querySelector('.cursor');
  if (!root) return;
  const dot = root.querySelector('.cursor__dot');
  const ring = root.querySelector('.cursor__ring');
  const label = root.querySelector('.cursor__label');

  document.documentElement.classList.add('has-cursor');

  gsap.set([dot, ring], { xPercent: -50, yPercent: -50, x: -100, y: -100 });
  const dotX = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3.out' });
  const dotY = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3.out' });
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3.out' });
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3.out' });

  let mode = '';
  let surface = '';
  let pending = null;

  function setMode(next, text) {
    if (next === mode && label.textContent === (text || '')) return;
    mode = next;
    root.dataset.mode = next;
    label.textContent = text || '';
  }

  function inspect(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return;
    const s = el.closest('[data-surface]')?.dataset.surface || 'light';
    if (s !== surface) {
      surface = s;
      root.dataset.surface = s;
    }
    const labelled = el.closest('[data-cursor]');
    if (labelled) return setMode('label', labelled.dataset.cursor);
    if (el.closest('a, button, summary, [role="button"], input, label')) return setMode('hover');
    if (el.closest('iframe')) return setMode('hidden');
    setMode('');
  }

  window.addEventListener(
    'pointermove',
    (e) => {
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
      root.classList.add('is-visible');
      if (!pending) {
        pending = requestAnimationFrame(() => {
          pending = null;
          inspect(e.clientX, e.clientY);
        });
      }
    },
    { passive: true },
  );

  // Al hacer scroll el elemento bajo el puntero cambia aunque el mouse no se mueva.
  let lastX = -100;
  let lastY = -100;
  window.addEventListener('pointermove', (e) => ((lastX = e.clientX), (lastY = e.clientY)), { passive: true });
  window.addEventListener('scroll', () => inspect(lastX, lastY), { passive: true });

  document.addEventListener('pointerdown', () => gsap.to(ring, { scale: 0.82, duration: 0.15 }));
  document.addEventListener('pointerup', () => gsap.to(ring, { scale: 1, duration: 0.45, ease: 'elastic.out(1, 0.4)' }));
  document.addEventListener('mouseleave', () => root.classList.remove('is-visible'));
  // Sobre el iframe de la agenda el navegador deja de enviar eventos: ocultamos el puntero propio.
  window.addEventListener('blur', () => root.classList.remove('is-visible'));
}
