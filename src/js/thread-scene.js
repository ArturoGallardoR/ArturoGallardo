import * as THREE from 'three';
import { AG_BAR, buildThreadPoints, chapterAt, chapterStops } from './thread-path.js';

/*
 * "Un solo hilo": un trazo continuo que, capítulo a capítulo, dibuja
 * un corazón con pulso (salud), una casa con un corazón (familia),
 * un brote (futuro) y un coche (lo tuyo), y termina en el monograma AG.
 * El progreso (0→1) lo controla el scroll desde main.js.
 */

const COLORS = {
  pizarra: 0x2f404a,
  naranja: 0xe77c46,
  arena: 0xf1e1d1,
  durazno: 0xfeb797,
};

const smooth = (t) => t * t * (3 - 2 * t);

/** Textura radial suave; `stops` = [[posición, alfa], ...]. */
function makeGlowTexture(stops, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  for (const [at, a] of stops) grad.addColorStop(at, `rgba(255,255,255,${a})`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const BEAM_VERTEX = /* glsl */ `
  uniform float uWidth;     // radio en px de pantalla (CSS)
  uniform float uPxToWorld; // unidades de mundo por px a profundidad 1
  uniform float uBase;      // radio con que se construyó el tubo
  varying float vU;
  varying float vNdv;
  varying float vDepth;
  void main() {
    vec3 center = position - normal * uBase;
    float depth = -(modelViewMatrix * vec4(center, 1.0)).z;
    vec4 mv = modelViewMatrix * vec4(center + normal * (uWidth * uPxToWorld * depth), 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vNdv = abs(dot(n, normalize(-mv.xyz)));
    vU = uv.x;
    vDepth = depth;
    gl_Position = projectionMatrix * mv;
  }
`;

const BEAM_FRAGMENT = /* glsl */ `
  uniform float uProgress;  // hasta dónde va el trazo (0–1 de su longitud)
  uniform float uLength;    // longitud total en unidades de mundo
  uniform float uFalloff;   // qué tan concentrada está la luz al centro
  uniform float uIntensity;
  uniform float uHot;       // brillo extra cerca de la punta
  uniform float uHeat;      // 0 cuando el trazo ya terminó
  uniform float uShimmer;
  uniform float uTime;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec3 uColor;
  uniform vec3 uHotColor;
  varying float vU;
  varying float vNdv;
  varying float vDepth;
  void main() {
    float d = (uProgress - vU) * uLength; // distancia detrás de la punta
    if (d < 0.0) discard;
    // Perfil gaussiano a lo ancho: centro brillante, borde que se disuelve.
    float x2 = 1.0 - vNdv * vNdv;
    float e = exp(-uFalloff);
    float profile = (exp(-x2 * uFalloff) - e) / (1.0 - e);
    float hot = exp(-d / 6.0) * uHeat;
    float tip = smoothstep(0.0, 0.4, d);
    float pulse = 1.0 + uShimmer * sin(d * 0.8 + uTime * 2.2);
    float fog = 1.0 - smoothstep(uFogNear, uFogFar, vDepth);
    float a = profile * uIntensity * (1.0 + uHot * hot) * tip * pulse * fog;
    gl_FragColor = vec4(mix(uColor, uHotColor, hot), clamp(a, 0.0, 1.0));
    #include <colorspace_fragment>
  }
`;

function makeBeamMaterial({ width, falloff, intensity, hot, color, hotColor, length, base }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uWidth: { value: width },
      uPxToWorld: { value: 0.001 },
      uBase: { value: base },
      uProgress: { value: 0 },
      uLength: { value: length },
      uFalloff: { value: falloff },
      uIntensity: { value: intensity },
      uHot: { value: hot },
      uHeat: { value: 1 },
      uShimmer: { value: 0 },
      uTime: { value: 0 },
      uFogNear: { value: 40 },
      uFogFar: { value: 110 },
      uColor: { value: new THREE.Color(color) },
      uHotColor: { value: new THREE.Color(hotColor) },
    },
    vertexShader: BEAM_VERTEX,
    fragmentShader: BEAM_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

export function createThreadScene(canvas, { reducedMotion = false } = {}) {
  const isSmall = window.matchMedia('(max-width: 768px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isSmall, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(COLORS.pizarra, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(COLORS.pizarra, 24, 90);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300);

  const { points, segments } = buildThreadPoints();
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal', 0.5);

  // Progreso (longitud de arco) en que empieza/termina cada símbolo.
  const DIV = 24;
  const lengths = curve.getLengths((points.length - 1) * DIV);
  const total = lengths[lengths.length - 1];
  const uAt = (index) => lengths[index * DIV] / total;
  const ranges = segments.map((s) => ({ ...s, start: uAt(s.start), end: uAt(s.end) }));
  const stops = chapterStops(ranges);

  // ── El hilo: un haz de luz fino ─────────────────────────
  // Una sola geometría de tubo y dos materiales aditivos: un núcleo caliente
  // y un halo suave. El grosor se calcula en píxeles de pantalla dentro del
  // shader, así la línea se ve igual de fina de cerca y de lejos.
  const TUBULAR = isSmall ? 1700 : 3200;
  const RADIAL = isSmall ? 8 : 10;
  const BASE_RADIUS = 0.01;
  const tubeGeo = new THREE.TubeGeometry(curve, TUBULAR, BASE_RADIUS, RADIAL, false);

  const coreMat = makeBeamMaterial({
    width: 1.2, falloff: 2.2, intensity: 0.95, hot: 0.9,
    color: COLORS.durazno, hotColor: 0xfff6ec, length: total, base: BASE_RADIUS,
  });
  const glowMat = makeBeamMaterial({
    width: isSmall ? 8 : 11, falloff: 4, intensity: 0.5, hot: 0.8,
    color: COLORS.naranja, hotColor: COLORS.durazno, length: total, base: BASE_RADIUS,
  });
  const beamMats = [coreMat, glowMat];
  scene.add(new THREE.Mesh(tubeGeo, glowMat), new THREE.Mesh(tubeGeo, coreMat));

  // Travesaño de la A: se traza de izquierda a derecha al cerrar el monograma.
  const [b0, b1] = AG_BAR;
  const barLen = b1[0] - b0[0];
  const barGeo = new THREE.TubeGeometry(
    new THREE.LineCurve3(new THREE.Vector3(b0[0], b0[1], 0), new THREE.Vector3(b1[0], b1[1], 0)), 24, BASE_RADIUS, RADIAL, false,
  );
  const barCore = coreMat.clone();
  const barGlow = glowMat.clone();
  const barMats = [barCore, barGlow];
  for (const mat of barMats) mat.uniforms.uLength.value = barLen;
  const bar = new THREE.Group();
  bar.add(new THREE.Mesh(barGeo, barGlow), new THREE.Mesh(barGeo, barCore));
  scene.add(bar);

  // La chispa: la punta viva del trazo (núcleo, halo y un destello horizontal muy tenue).
  const dotTex = makeGlowTexture([[0, 1], [0.35, 0.55], [1, 0]], 128);
  const sparkTex = makeGlowTexture([[0, 1], [0.12, 0.8], [0.3, 0.18], [1, 0]]);
  const sprite = (map, color, opacity) => new THREE.Sprite(new THREE.SpriteMaterial({
    map, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }));
  const head = new THREE.Group();
  const spark = sprite(sparkTex, 0xfff3e6, 1);
  const glow = sprite(dotTex, COLORS.naranja, 0.45);
  const flare = sprite(sparkTex, COLORS.durazno, 0.22);
  head.add(glow, flare, spark);
  scene.add(head);

  // Halo detrás de cada símbolo terminado: se "enciende" al cerrarse el dibujo.
  const halos = ranges.map((r) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: dotTex, color: COLORS.naranja, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    s.position.set(r.center[0], r.center[1], r.center[2] - 2);
    s.scale.setScalar(r.id === 'ag' ? 14 : 16);
    scene.add(s);
    return s;
  });

  // ── Motas: vida suspendida en el aire ──────────────────
  const COUNT = isSmall ? 700 : 1500;
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  const cA = new THREE.Color(COLORS.arena);
  const cB = new THREE.Color(COLORS.durazno);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = -150 + Math.random() * 175;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 44;
    pos[i * 3 + 2] = -70 + Math.random() * 80;
    const c = Math.random() < 0.4 ? cB : cA;
    col.set([c.r, c.g, c.b], i * 3);
    seeds[i] = Math.random();
  }
  const motesGeo = new THREE.BufferGeometry();
  motesGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  motesGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const motesMat = new THREE.PointsMaterial({
    size: 0.22, map: dotTex, vertexColors: true, transparent: true, opacity: 0.75,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  scene.add(new THREE.Points(motesGeo, motesMat));

  // ── Cámara: encuadra cada símbolo de frente mientras se dibuja ──
  let poses = [];
  let distance = 18;
  function buildPoses() {
    const start = curve.getPointAt(0);
    poses = [{ u: 0, pos: start.clone().add(new THREE.Vector3(5, 3, 14)), look: start.clone() }];
    for (const r of ranges) {
      const c = new THREE.Vector3(...r.center);
      const d = r.id === 'ag' ? distance * 0.95 : distance;
      const pose = { pos: c.clone().add(new THREE.Vector3(0, 0.4, d)), look: c };
      const lead = Math.min(0.02, (r.end - r.start) * 0.25);
      poses.push({ u: Math.max(0.001, r.start - lead), ...pose });
      poses.push({ u: r.end, ...pose });
    }
    poses.push({ ...poses[poses.length - 1], u: 1 });
  }
  const tmpPos = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();
  const swingVec = new THREE.Vector3();
  function poseAt(u, outPos, outLook) {
    let i = 0;
    while (i < poses.length - 2 && u > poses[i + 1].u) i++;
    const a = poses[i];
    const b = poses[i + 1];
    const t = b.u > a.u ? smooth(THREE.MathUtils.clamp((u - a.u) / (b.u - a.u), 0, 1)) : 1;
    outPos.lerpVectors(a.pos, b.pos, t);
    outLook.lerpVectors(a.look, b.look, t);
    // En los traslados la cámara se eleva y se aleja un poco: un respiro entre capítulos.
    const moving = a.pos.distanceToSquared(b.pos) > 0.01;
    if (moving) outPos.add(swingVec.set(0, 3, 6).multiplyScalar(Math.sin(Math.PI * t)));
  }

  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  let target = reducedMotion ? 1 : 0;
  let progress = target;
  let visible = false;
  let raf = 0;
  let last = performance.now();
  let elapsed = 0;
  let pxToWorld = 0.001;
  // Con movimiento reducido la luz no titila ni respira.
  const breathe = reducedMotion ? 0 : 1;
  for (const mat of beamMats) mat.uniforms.uShimmer.value = 0.07 * breathe;

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // El encuadre se corre para dejar el texto libre: a la derecha en escritorio, arriba en móvil.
    const wide = camera.aspect > 1.1;
    if (wide) camera.setViewOffset(w, h, -w * 0.18, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.12, w, h);
    camera.updateProjectionMatrix();
    // Distancia para que el símbolo más ancho (≈ ±6.5u) quepa en la zona visible.
    const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const usable = wide ? 0.56 : 0.92;
    distance = THREE.MathUtils.clamp(6.8 / (halfTan * camera.aspect * usable), 16, 44);
    scene.fog.near = distance + 6;
    scene.fog.far = distance + 70;
    pxToWorld = (2 * halfTan) / h;
    for (const mat of [...beamMats, ...barMats]) {
      mat.uniforms.uPxToWorld.value = pxToWorld;
      mat.uniforms.uFogNear.value = scene.fog.near;
      mat.uniforms.uFogFar.value = scene.fog.far + 30;
    }
    buildPoses();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;

    progress += (target - progress) * Math.min(1, dt * 4.5);
    const p = THREE.MathUtils.clamp(progress, 0, 1);

    const done = THREE.MathUtils.smoothstep(p, 0.985, 0.998);
    for (const mat of beamMats) {
      mat.uniforms.uProgress.value = p;
      mat.uniforms.uHeat.value = 1 - done;
      mat.uniforms.uTime.value = elapsed;
    }

    const u = Math.max(0.0005, p);
    curve.getPointAt(u, head.position);
    head.visible = done < 0.999;

    // Halos: se encienden al cerrar cada símbolo y respiran suave.
    ranges.forEach((r, i) => {
      const on = THREE.MathUtils.smoothstep(p, r.end - 0.004, r.end + 0.012);
      halos[i].material.opacity = on * (0.16 + breathe * Math.sin(elapsed * 1.6 + i) * 0.04);
    });

    const ag = ranges[ranges.length - 1];
    const barT = THREE.MathUtils.smoothstep(p, ag.end - 0.01, Math.min(1, ag.end + 0.02));
    bar.visible = barT > 0.001;
    for (const mat of barMats) {
      mat.uniforms.uProgress.value = barT;
      mat.uniforms.uHeat.value = 1 - THREE.MathUtils.smoothstep(barT, 0.8, 1);
    }

    // Cámara.
    poseAt(p, tmpPos, tmpLook);
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    tmpPos.x += pointer.x * 1.2;
    tmpPos.y += pointer.y * 0.8;
    const k = Math.min(1, dt * 3.2);
    camPos.lerp(tmpPos, k);
    camLook.lerp(tmpLook, k);
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    // La chispa mide lo mismo en pantalla a cualquier distancia.
    if (head.visible) {
      const px = pxToWorld * camera.position.distanceTo(head.position);
      const flicker = 1 + breathe * Math.sin(elapsed * 3.1) * 0.06;
      const fade = 1 - done;
      spark.scale.setScalar(px * 22 * flicker * fade);
      glow.scale.setScalar(px * (isSmall ? 80 : 110) * flicker);
      flare.scale.set(px * (isSmall ? 110 : 170) * fade, px * 7, 1);
      glow.material.opacity = 0.45 * fade;
    }

    // Motas que suben, lentas.
    const arr = motesGeo.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      const iy = i * 3 + 1;
      arr[iy] += dt * (0.25 + seeds[i] * 0.6);
      arr[i * 3] += Math.sin(elapsed * 0.5 + seeds[i] * 10) * dt * 0.15;
      if (arr[iy] > 22) arr[iy] = -22;
    }
    motesGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    if (!visible) stop();
  }

  function startLoop() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  poseAt(target, camPos, camLook);

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) startLoop();
  });
  io.observe(canvas);

  const onPointer = (e) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = -(e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  requestAnimationFrame(frame);

  return {
    /** Índice del capítulo (0–4) que corresponde a un progreso. */
    chapterAt: (v) => chapterAt(v, stops),
    setProgress(v) {
      target = THREE.MathUtils.clamp(v, 0, 1);
    },
    dispose() {
      stop();
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onPointer);
      for (const geo of [tubeGeo, barGeo, motesGeo]) geo.dispose();
      for (const mat of [...beamMats, ...barMats, motesMat, spark.material, glow.material, flare.material, ...halos.map((h) => h.material)]) mat.dispose();
      dotTex.dispose();
      sparkTex.dispose();
      renderer.dispose();
    },
  };
}
