// Lógica pura de la agenda: sin DOM, para poder probarla.

const CAL_HOSTS = new Set(['cal.com', 'www.cal.com', 'app.cal.com', 'cal.eu', 'app.cal.eu']);
const GOOGLE_PREFIXES = [
  'https://calendar.app.google/',
  'https://calendar.google.com/calendar/appointments/',
];
const TRACKING_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];

/**
 * Normaliza lo que el usuario pegue en config ("usuario/evento", la URL completa,
 * con o sin query) a un calLink "usuario/evento". Devuelve null si no es válido.
 */
export function normalizeCalLink(input) {
  if (typeof input !== 'string') return null;
  let raw = input.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw) || /^(www\.|app\.)?cal\.(com|eu)\//i.test(raw)) {
    let url;
    try {
      url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    } catch {
      return null;
    }
    if (!CAL_HOSTS.has(url.hostname.toLowerCase())) return null;
    raw = url.pathname;
  } else {
    raw = raw.split(/[?#]/)[0];
  }

  const parts = raw.split('/').filter(Boolean);
  if (parts.length === 0 || parts.length > 3) return null;
  if (!parts.every((p) => /^[A-Za-z0-9._-]+$/.test(p))) return null;
  return parts.join('/');
}

/** Acepta solo páginas de reservas públicas de Google y fuerza la vista embebible. */
export function normalizeGoogleUrl(input) {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  if (!GOOGLE_PREFIXES.some((p) => raw.startsWith(p))) return null;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.pathname.replace(/\/+$/, '').split('/').filter(Boolean).length < 1) return null;
  url.searchParams.set('gv', 'true');
  return url.toString();
}

/**
 * Decide qué agenda mostrar. Si el proveedor elegido no está configurado,
 * usa el otro si sí lo está; si ninguno, devuelve { kind: 'none' }.
 */
export function resolveBooking(booking = {}) {
  const cal = () => {
    const calLink = normalizeCalLink(booking.cal?.link);
    if (!calLink) return null;
    const origin = (booking.cal?.origin || 'https://app.cal.com').replace(/\/+$/, '');
    return { kind: 'cal', calLink, origin, embedScript: `${origin}/embed/embed.js` };
  };
  const google = () => {
    const url = normalizeGoogleUrl(booking.google?.url);
    return url ? { kind: 'google', url } : null;
  };

  const order = booking.provider === 'google' ? [google, cal] : [cal, google];
  for (const pick of order) {
    const result = pick();
    if (result) return result;
  }
  return { kind: 'none', reason: 'Agenda sin configurar: agrega booking.cal.link o booking.google.url en src/config.js' };
}

/** Extrae parámetros de campaña de la URL para atribuir cada cita a su origen. */
export function trackingFromSearch(search = '') {
  const params = new URLSearchParams(search);
  const out = {};
  for (const key of TRACKING_KEYS) {
    const value = params.get(key);
    if (value) out[key] = value.slice(0, 200);
  }
  return out;
}

/** Config que recibe el embed inline de Cal.com (prefill + atribución). */
export function buildCalConfig({ interest, tracking = {}, timeZone } = {}) {
  const config = { layout: 'month_view', theme: 'light', ...tracking };
  if (timeZone) config.timeZone = timeZone;
  if (interest) {
    config.notes = `Me interesa: ${interest}`;
    config['metadata[interes]'] = interest;
  }
  for (const [key, value] of Object.entries(tracking)) {
    config[`metadata[${key}]`] = value;
  }
  return config;
}

/** Enlaces de contacto de respaldo (WhatsApp / correo) con mensaje prellenado. */
export function contactLinks({ whatsapp, email } = {}, interest) {
  const message = interest
    ? `Hola Arturo, me gustaría agendar una llamada sobre: ${interest}.`
    : 'Hola Arturo, me gustaría agendar una llamada de 15 minutos.';
  const links = [];
  const digits = String(whatsapp || '').replace(/\D/g, '');
  if (digits.length >= 10) {
    links.push({ kind: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/${digits}?text=${encodeURIComponent(message)}` });
  }
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    links.push({
      kind: 'email',
      label: 'Correo',
      href: `mailto:${email}?subject=${encodeURIComponent('Agendar asesoría')}&body=${encodeURIComponent(message)}`,
    });
  }
  return links;
}

/**
 * Fecha de la cita para el mensaje de confirmación, en español de México:
 * "jueves 15 de octubre a las 10:30 am". Devuelve null si la fecha no es válida.
 */
export function formatBookingWhen(iso, { timeZone, locale = 'es-MX' } = {}) {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return null;
  const opts = timeZone ? { timeZone } : {};
  const day = new Intl.DateTimeFormat(locale, { ...opts, weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  const parts = new Intl.DateTimeFormat(locale, { ...opts, hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(date);
  const hm = parts.filter((p) => p.type === 'hour' || p.type === 'minute' || p.type === 'literal').map((p) => p.value).join('').trim();
  const period = parts.find((p) => p.type === 'dayPeriod')?.value ?? '';
  // Marca: am/pm en minúsculas y sin puntos ("10:30 am").
  const ampm = /p/i.test(period) ? 'pm' : 'am';
  return `${day.replace(',', '')} a las ${hm.replace(/\s+$/, '')} ${ampm}`;
}
