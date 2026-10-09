import gsap from 'gsap';

// Escenarios "¿Y si mañana…?". Los datos de "con un plan" vienen de las
// fichas públicas de GNP (Decide, Consolida, Profesional, Auto).
export const SCENARIOS = [
  {
    without: 'Pagas el hospital con tus ahorros, con la tarjeta o con un préstamo. A veces con las tres cosas.',
    with: 'Eliges hospital y médico. Tú cubres el deducible y el coaseguro que acordamos, y tu póliza paga el resto.',
  },
  {
    without: 'Tu familia tiene que resolver gastos, deudas y el día a día al mismo tiempo que te despide.',
    with: 'Tus beneficiarios reciben la suma asegurada, y hay un anticipo para cubrir los gastos funerarios.',
  },
  {
    without: 'Dependes de tu pensión, de tus hijos o de seguir trabajando aunque ya no quieras.',
    with: 'Recibes el ahorro que planeaste, en pesos actualizados con la inflación o en dólares.',
  },
  {
    without: 'La colegiatura llega de golpe y toca recortar gastos o pedir prestado.',
    with: 'El ahorro para su escuela ya está listo. Y si tú llegaras a faltar antes, tus beneficiarios reciben la suma asegurada.',
  },
  {
    without: 'La reparación, los daños a terceros y el trámite corren por tu cuenta.',
    with: 'Tu póliza responde según las coberturas que elegiste, y no tienes que resolverlo solo.',
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

export function initWhatIf({ reducedMotion }) {
  const tabs = [...document.querySelectorAll('[data-whatif]')];
  const without = document.querySelector('[data-whatif-without]');
  const withPlan = document.querySelector('[data-whatif-with]');
  if (!tabs.length || !without || !withPlan) return;

  let current = -1;
  function select(i, animate = true) {
    if (i === current) return;
    current = i;
    tabs.forEach((t, idx) => {
      t.setAttribute('aria-selected', String(idx === i));
      t.tabIndex = idx === i ? 0 : -1;
    });
    const apply = () => {
      without.textContent = SCENARIOS[i].without;
      withPlan.textContent = SCENARIOS[i].with;
    };
    if (!animate || reducedMotion) return apply();
    gsap.timeline()
      .to([without, withPlan], { autoAlpha: 0, y: -14, duration: 0.25, ease: 'power2.in', stagger: 0.05 })
      .add(apply)
      .fromTo(without, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expo.out' })
      .fromTo(withPlan, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expo.out' }, '-=0.5')
      .fromTo('.whatif__divider svg', { rotate: -12, scale: 0.85 }, { rotate: 0, scale: 1, duration: 0.8, ease: 'back.out(2)' }, '<');
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
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
