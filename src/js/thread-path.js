// Geometría del "hilo": un solo trazo que dibuja un símbolo por capítulo
// y termina en el monograma AG. Datos puros (arrays), sin three.js, para poder probarlos.

export const SYMBOL_SCALE = 3.1;

const TAU = Math.PI * 2;

function line(out, [x0, y0], [x1, y1], n) {
  for (let i = 1; i <= n; i++) out.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
}
function arc(out, cx, cy, r, a0, a1, n) {
  for (let i = 1; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
}
function heart(out, cx, cy, s, n) {
  // Curva clásica del corazón, empezando y terminando en la punta inferior.
  for (let i = 1; i <= n; i++) {
    if (2 * i === n) continue; // sin el punto exacto de la hendidura: la luz la dobla redondeada, sin quiebre
    const t = Math.PI + (TAU * i) / n;
    const x = (16 * Math.sin(t) ** 3) / 17;
    const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17;
    out.push([cx + x * s, cy + (y + 1) * s - s]);
  }
}
function ecg(out, x0, base) {
  for (const [dx, y] of [[0.12, 0], [0.22, 0.45], [0.34, -0.55], [0.46, 0], [0.6, 0]]) out.push([x0 + dx, base + y]);
}

/** Salud: pulso cardiaco que se convierte en corazón y vuelve a latir. */
export function healthShape() {
  const p = [[-2.6, -1]];
  line(p, [-2.6, -1], [-1.9, -1], 4);
  ecg(p, -1.9, -1);
  line(p, [-1.3, -1], [0, -1], 6);
  heart(p, 0, -1 + 1, 1, 72); // punta del corazón en (0,-1)
  line(p, [0, -1], [0.7, -1], 4);
  ecg(p, 0.7, -1);
  line(p, [1.3, -1], [2.6, -1], 6);
  return p;
}

/** Familia: una casa y, adentro, un corazón. */
export function familyShape() {
  const p = [[-2.3, -1]];
  line(p, [-2.3, -1], [-1, -1], 6);
  line(p, [-1, -1], [-1, 0.15], 6);
  line(p, [-1, 0.15], [-1.3, 0.15], 2);
  line(p, [-1.3, 0.15], [0, 1.3], 10);
  line(p, [0, 1.3], [1.3, 0.15], 10);
  line(p, [1.3, 0.15], [1, 0.15], 2);
  line(p, [1, 0.15], [1, -1], 6);
  line(p, [1, -1], [0, -1], 6);
  line(p, [0, -1], [0, -0.72], 2);
  heart(p, 0, -0.72 + 0.4, 0.4, 48); // punta en (0,-0.72)
  line(p, [0, -0.72], [0, -1], 2);
  line(p, [0, -1], [2.3, -1], 12);
  return p;
}

/** Futuro: un brote que crece con dos hojas. */
export function futureShape() {
  const p = [[-2.3, -1]];
  line(p, [-2.3, -1], [0, -1], 10);
  for (const pt of [
    [0.04, -0.7], [0.02, -0.35], [0, -0.15],
    // hoja izquierda
    [-0.3, -0.02], [-0.72, 0.1], [-1.05, 0.38], [-0.78, 0.52], [-0.42, 0.38], [-0.14, 0.12], [0, 0.02],
    [0.02, 0.3], [0, 0.55],
    // hoja derecha
    [0.32, 0.68], [0.78, 0.84], [1.12, 1.2], [0.72, 1.3], [0.36, 1.1], [0.1, 0.82], [0, 0.66],
    [0.01, 1.0], [0.04, 1.35],
    // sigue creciendo hacia el siguiente capítulo
    [0.4, 1.85], [1.3, 2.1], [2.3, 1.9],
  ]) p.push(pt);
  return p;
}

/** Lo tuyo: un coche (con sus ruedas) sobre el camino. */
export function belongingsShape() {
  const p = [[-2.4, -0.6]];
  line(p, [-2.4, -0.6], [-1.27, -0.6], 5);
  arc(p, -0.95, -0.6, 0.32, Math.PI, Math.PI * 3, 28); // rueda trasera
  arc(p, -0.95, -0.6, 0.44, Math.PI, 0, 14); // salpicadera
  line(p, [-0.51, -0.6], [0.63, -0.6], 5);
  arc(p, 0.95, -0.6, 0.32, Math.PI, Math.PI * 3, 28); // rueda delantera
  arc(p, 0.95, -0.6, 0.44, Math.PI, 0, 14);
  for (const pt of [
    [1.8, -0.6], [1.9, -0.18], [1.75, 0.02], [1.05, 0.14], // cofre
    [0.62, 0.64], [-0.5, 0.68], // parabrisas y techo
    [-1.1, 0.2], [-1.75, 0.1], [-1.88, -0.3], [-1.7, -0.62], // cajuela
    // el camino
    [-1.4, -1.15], [0, -1.35], [1.4, -1.3], [2.5, -1.15],
  ]) p.push(pt);
  return p;
}

// Monograma AG (unidades del SVG 0–100), eje central del trazo. No redibujar: viene del logo.
export const AG_SCALE = 0.075;
const AG_CENTER = [49, 62];
const ag = (ux, uy) => [(ux - AG_CENTER[0]) * AG_SCALE, -(uy - AG_CENTER[1]) * AG_SCALE];

export function monogramShape() {
  const u = [[7, 100]];
  line(u, [7, 100], [7, 44], 10);
  for (let i = 1; i <= 22; i++) { const a = Math.PI - (Math.PI * i) / 22; u.push([28 + 21 * Math.cos(a), 44 - 21 * Math.sin(a)]); }
  line(u, [49, 44], [49, 72], 6);
  for (let i = 1; i <= 22; i++) { const a = Math.PI - (Math.PI * i) / 22; u.push([70 + 21 * Math.cos(a), 72 + 21 * Math.sin(a)]); }
  line(u, [91, 72], [91, 65], 2);
  line(u, [91, 65], [70, 65], 5);
  return u.map(([x, y]) => ag(x, y));
}
export const AG_BAR = [ag(7, 66), ag(49, 66)];

export const CHAPTERS = [
  { id: 'salud', center: [-96, 2, -36], shape: healthShape },
  { id: 'familia', center: [-70, -2, -26], shape: familyShape },
  { id: 'futuro', center: [-46, 3, -16], shape: futureShape },
  { id: 'lo-tuyo', center: [-22, -1, -8], shape: belongingsShape, scale: 2.5 }, // el coche es más ancho
];

/**
 * Construye todos los puntos del hilo y marca dónde empieza y termina
 * cada símbolo (índices en el arreglo de puntos).
 */
export function buildThreadPoints() {
  const points = [[-132, 12, -52], [-120, -5, -46], [-112, 4, -42]];
  const segments = [];
  let swing = 1;

  CHAPTERS.forEach((ch, i) => {
    const local = ch.shape();
    const [cx, cy, cz] = ch.center;
    const k = ch.scale ?? SYMBOL_SCALE;
    const world = local.map(([x, y]) => [cx + x * k, cy + y * k, cz]);
    if (i > 0) {
      // Conector: una curva amplia que sale del plano y regresa (vida, no línea recta).
      const a = points[points.length - 1];
      const b = world[0];
      points.push([(a[0] * 2 + b[0]) / 3, (a[1] * 2 + b[1]) / 3 + 7 * swing, (a[2] * 2 + b[2]) / 3 + 6]);
      points.push([(a[0] + b[0] * 2) / 3, (a[1] + b[1] * 2) / 3 - 4 * swing, (a[2] + b[2] * 2) / 3 + 3]);
      swing *= -1;
    }
    const start = points.length;
    points.push(...world);
    segments.push({ id: ch.id, start, end: points.length - 1, center: ch.center });
  });

  // Del camino del coche al pie de la A.
  points.push([-8, -7, -3], [-6, -8, 1.5], [-2.94, -6.5, 1.2]);
  const agStart = points.length;
  points.push(...monogramShape().map(([x, y]) => [x, y, 0]));
  segments.push({ id: 'ag', start: agStart, end: points.length - 1, center: [0, 0, 0] });

  return { points, segments };
}

/**
 * Qué capítulo mostrar para un progreso u ∈ [0,1].
 * `stops` = progreso donde empieza cada capítulo (ascendente, el primero en 0).
 */
export function chapterAt(u, stops) {
  let idx = 0;
  for (let i = 0; i < stops.length; i++) if (u >= stops[i]) idx = i;
  return idx;
}

/** Puntos de cambio de capítulo: a medio camino entre un símbolo y el siguiente. */
export function chapterStops(ranges) {
  return ranges.map((r, i) => (i === 0 ? 0 : (ranges[i - 1].end + r.start) / 2));
}
