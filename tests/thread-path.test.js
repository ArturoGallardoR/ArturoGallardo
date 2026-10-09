import { describe, expect, it } from 'vitest';
import { buildThreadPoints, chapterAt, chapterStops, monogramShape } from '../src/js/thread-path.js';

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], (a[2] ?? 0) - (b[2] ?? 0));

describe('el hilo', () => {
  const { points, segments } = buildThreadPoints();

  it('dibuja los símbolos en el orden de los capítulos de la página y cierra con el logo', () => {
    expect(segments.map((s) => s.id)).toEqual(['salud', 'familia', 'futuro', 'lo-tuyo', 'ag']);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].start).toBeGreaterThan(segments[i - 1].end);
    }
  });

  it('es un solo trazo: dentro de cada símbolo no hay saltos que rompan el dibujo', () => {
    for (const seg of segments) {
      for (let i = seg.start + 1; i <= seg.end; i++) {
        expect(dist(points[i - 1], points[i]), `${seg.id} punto ${i}`).toBeLessThan(4.5); // el pico del pulso mide ~3.1; un error de captura salta decenas
      }
    }
  });

  it('termina sobre el eje del monograma: pie de la A → brazo de la G', () => {
    const mono = monogramShape();
    // Unidades del SVG del logo: (7,100) y (70,65), centro óptico (49,62), escala 0.075.
    expect(mono[0][0]).toBeCloseTo(-3.15, 5);
    expect(mono[0][1]).toBeCloseTo(-2.85, 5);
    expect(mono.at(-1)[0]).toBeCloseTo(1.575, 5);
    expect(mono.at(-1)[1]).toBeCloseTo(-0.225, 5);
  });
});

describe('cambio de capítulo con el scroll', () => {
  const ranges = [
    { start: 0.05, end: 0.2 },
    { start: 0.3, end: 0.45 },
    { start: 0.55, end: 0.7 },
    { start: 0.75, end: 0.85 },
    { start: 0.9, end: 1 },
  ];
  const stops = chapterStops(ranges);

  it('muestra el primer capítulo desde el inicio y cambia entre un dibujo y el siguiente', () => {
    expect(chapterAt(0, stops)).toBe(0);
    expect(chapterAt(0.2, stops)).toBe(0); // aún terminando el corazón
    expect(chapterAt(0.3, stops)).toBe(1); // ya empezó la casa
    expect(chapterAt(0.6, stops)).toBe(2);
  });

  it('llega al cierre (logo) al final del recorrido', () => {
    expect(chapterAt(1, stops)).toBe(4);
    expect(chapterAt(0.86, stops)).toBe(3);
  });
});
