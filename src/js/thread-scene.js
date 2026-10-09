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

function makeDotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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

  // Luces cálidas, como luz natural de tarde.
  scene.add(new THREE.HemisphereLight(COLORS.arena, COLORS.pizarra, 1.1));
  const key = new THREE.DirectionalLight(0xfff1e4, 2.2);
  key.position.set(8, 14, 16);
  scene.add(key);
  const rim = new THREE.DirectionalLight(COLORS.durazno, 1.3);
  rim.position.set(-12, -4, -10);
  scene.add(rim);

  // ── El hilo ─────────────────────────────────────────────
  const { points, segments } = buildThreadPoints();
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal', 0.5);

  // Progreso (longitud de arco) en que empieza/termina cada símbolo.
  const DIV = 24;
  const lengths = curve.getLengths((points.length - 1) * DIV);
  const total = lengths[lengths.length - 1];
  const uAt = (index) => lengths[index * DIV] / total;
  const ranges = segments.map((s) => ({ ...s, start: uAt(s.start), end: uAt(s.end) }));
  const stops = chapterStops(ranges);

  const TUBULAR = isSmall ? 1700 : 3200;
  const RADIAL = isSmall ? 8 : 12;
  const RADIUS = 0.42;
  const tubeGeo = new THREE.TubeGeometry(curve, TUBULAR, RADIUS, RADIAL, false);
  const tubeMat = new THREE.MeshStandardMaterial({ color: COLORS.naranja, roughness: 0.42, metalness: 0.08 });
  scene.add(new THREE.Mesh(tubeGeo, tubeMat));
  const indexPerSegment = RADIAL * 6;
  tubeGeo.setDrawRange(0, 0);

  // Travesaño de la A (aparece al cerrar el monograma).
  const [b0, b1] = AG_BAR;
  const barGeo = new THREE.TubeGeometry(
    new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(b1[0] - b0[0], 0, 0)), 8, RADIUS * 0.9, RADIAL, false,
  );
  const bar = new THREE.Mesh(barGeo, tubeMat);
  bar.position.set(b0[0], b0[1], 0);
  bar.scale.set(0.0001, 1, 1);
  scene.add(bar);

  // La chispa: la punta viva del trazo.
  const dotTex = makeDotTexture();
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(RADIUS * 1.04, 24, 16),
    new THREE.MeshStandardMaterial({ color: COLORS.durazno, emissive: COLORS.naranja, emissiveIntensity: 1.4, roughness: 0.3 }),
  );
  scene.add(head);
  const headLight = new THREE.PointLight(COLORS.naranja, 30, 14, 2);
  scene.add(headLight);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: dotTex, color: COLORS.durazno, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  glow.scale.setScalar(3.6);
  scene.add(glow);

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
  scene.add(new THREE.Points(motesGeo, new THREE.PointsMaterial({
    size: 0.22, map: dotTex, vertexColors: true, transparent: true, opacity: 0.75,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  })));

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
    buildPoses();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;

    progress += (target - progress) * Math.min(1, dt * 4.5);
    const p = THREE.MathUtils.clamp(progress, 0, 1);

    tubeGeo.setDrawRange(0, Math.floor(p * TUBULAR) * indexPerSegment);

    const u = Math.max(0.0005, p);
    curve.getPointAt(u, tmpPos);
    head.position.copy(tmpPos);
    headLight.position.copy(tmpPos);
    glow.position.copy(tmpPos);
    glow.scale.setScalar(3.6 * (1 + Math.sin(elapsed * 3) * 0.08));
    head.visible = glow.visible = p < 0.995;

    // Halos: se encienden al cerrar cada símbolo y respiran suave.
    ranges.forEach((r, i) => {
      const on = THREE.MathUtils.smoothstep(p, r.end - 0.004, r.end + 0.012);
      halos[i].material.opacity = on * (0.22 + Math.sin(elapsed * 1.6 + i) * 0.05);
    });

    const ag = ranges[ranges.length - 1];
    const barT = THREE.MathUtils.smoothstep(p, ag.end - 0.01, Math.min(1, ag.end + 0.02));
    bar.visible = barT > 0.001;
    bar.scale.set(Math.max(0.0001, barT), 1, 1);

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
      renderer.dispose();
      tubeGeo.dispose();
      barGeo.dispose();
      motesGeo.dispose();
    },
  };
}
