import gsap from 'gsap';

// Escenarios "¿Y si mañana…?". Los datos de "con un plan" vienen de las
// fichas públicas de GNP (Decide, Consolida, Profesional, Auto).
export const SCENARIOS = [
  {
    without: 'Pagas el hospital con tus ahorros, con la tarjeta o con un préstamo. A veces con las tres cosas.',
    with: 'Eliges hospital y médico. Tú cubres el deducible y el coaseguro que acordamos, y tu póliza paga el resto.',
    image: { name: 'cirugia', alt: 'Un médico platica con su paciente, que descansa en una cama de hospital.' },
  },
  {
    without: 'Tu familia tiene que resolver gastos, deudas y el día a día al mismo tiempo que te despide.',
    with: 'Tus beneficiarios reciben la suma asegurada, y hay un anticipo para cubrir los gastos funerarios.',
    image: { name: 'familia', alt: 'Una mamá y su hijo sonríen juntos en el sillón de la sala.' },
  },
  {
    without: 'Dependes de tu pensión, de tus hijos o de seguir trabajando aunque ya no quieras.',
    with: 'Tu ahorro te espera, en pesos actualizados con la inflación o en dólares. Y si todavía no lo necesitas, lo dejas ahí y sigue creciendo.',
    image: { name: 'vejez', alt: 'Una pareja de adultos mayores se toma de las manos frente a un muro amarillo en Mérida.' },
  },
  {
    without: 'La colegiatura llega de golpe y toca recortar gastos o pedir prestado.',
    with: 'El ahorro para su escuela ya está listo. Y si tú llegaras a faltar antes, tus beneficiarios reciben la suma asegurada.',
    image: { name: 'universidad', alt: 'Una joven con mochila y libros en un salón de la universidad.' },
  },
  {
    without: 'La reparación, los daños a terceros y el trámite corren por tu cuenta.',
    with: 'Tu póliza responde según las coberturas que elegiste, y no tienes que resolverlo solo.',
    image: { name: 'auto', alt: 'Dos coches chocados en un cruce peatonal; el conductor habla por teléfono con calma.' },
  },
];

export function initMyths({ reducedMotion }) {
  document.querySelectorAll('[data-myth]').forEach((card) => {
    const front = card.querySelector('.myth__front');
    const back = card.querySelector('.myth__back');
    back.setAttribute('aria-hidden', 'true');
    card.addEventListener('click', () => {
      const flipped = card.getAttribute('aria-pressed') !== 'true';
      card.setAttribute('aria-pressed', String(flipped));
      front.setAttribute('aria-hidden', String(flipped));
      back.setAttribute('aria-hidden', String(!flipped));
      gsap.to(card, {
        rotationY: flipped ? 180 : 0,
        duration: reducedMotion ? 0 : 0.9,
        ease: 'expo.out',
      });
    });
  });
}

const imgSet = (name) => ({
  src: `./img/escenarios/${name}-1600.webp`,
  srcset: `./img/escenarios/${name}-800.webp 800w, ./img/escenarios/${name}-1600.webp 1600w`,
});

const preloaded = new Set();
function preload(i) {
  const pic = SCENARIOS[i]?.image;
  if (!pic || preloaded.has(i)) return;
  preloaded.add(i);
  const img = new Image();
  img.sizes = document.querySelector('[data-whatif-img]')?.sizes || '100vw';
  Object.assign(img, imgSet(pic.name));
}

export function initWhatIf({ reducedMotion }) {
  const tabs = [...document.querySelectorAll('[data-whatif]')];
  const without = document.querySelector('[data-whatif-without]');
  const withPlan = document.querySelector('[data-whatif-with]');
  const media = document.querySelector('[data-whatif-media]');
  const veil = media?.querySelector('.whatif__veil');
  if (!tabs.length || !without || !withPlan) return;

  // Crossfade: la imagen nueva entra encima de la anterior y luego la sustituye.
  function swapImage(i, animate) {
    const current = media?.querySelector('[data-whatif-img]:last-of-type');
    const pic = SCENARIOS[i].image;
    if (!current || !pic) return;
    if (!animate) {
      Object.assign(current, imgSet(pic.name), { alt: pic.alt });
      return;
    }
    const next = current.cloneNode();
    Object.assign(next, imgSet(pic.name), { alt: pic.alt, loading: 'eager' });
    next.style.opacity = 0;
    current.after(next);
    const show = () => {
      const dropOlder = () => {
        while (next.previousElementSibling?.matches('[data-whatif-img]')) next.previousElementSibling.remove();
      };
      gsap.timeline({ onComplete: dropOlder })
        .to(next, { opacity: 1, duration: 0.9, ease: 'power2.out' })
        .fromTo(next, { scale: 1.06 }, { scale: 1, duration: 1.6, ease: 'expo.out' }, 0)
        .fromTo(veil, { '--veil': '100%' }, { '--veil': '0%', duration: 1.4, ease: 'expo.inOut' }, 0.1);
    };
    next.decode().then(show, show);
  }

  let current = -1;
  function select(i, animate = true) {
    if (i === current) return;
    current = i;
    tabs.forEach((t, idx) => {
      t.setAttribute('aria-selected', String(idx === i));
      t.tabIndex = idx === i ? 0 : -1;
    });
    const anim = animate && !reducedMotion;
    // En móvil las pestañas se desplazan en horizontal: centra la elegida.
    const strip = tabs[i].parentElement;
    const offset = tabs[i].getBoundingClientRect().left - strip.getBoundingClientRect().left;
    strip.scrollTo({ left: strip.scrollLeft + offset - (strip.clientWidth - tabs[i].offsetWidth) / 2, behavior: anim ? 'smooth' : 'auto' });
    swapImage(i, anim);
    preload((i + 1) % SCENARIOS.length);
    const apply = () => {
      without.textContent = SCENARIOS[i].without;
      withPlan.textContent = SCENARIOS[i].with;
    };
    if (!anim) return apply();
    gsap.timeline()
      .to([without, withPlan], { autoAlpha: 0, y: -14, duration: 0.25, ease: 'power2.in', stagger: 0.05 })
      .add(apply)
      .fromTo(without, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expo.out' })
      .fromTo(withPlan, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expo.out' }, '-=0.5')
      .fromTo('.whatif__divider svg', { rotate: -12, scale: 0.85 }, { rotate: 0, scale: 1, duration: 0.8, ease: 'back.out(2)' }, '<');
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('pointerenter', () => preload(i));
    tab.addEventListener('focus', () => preload(i));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
      select(next);
    });
  });
  select(0, false);
}
