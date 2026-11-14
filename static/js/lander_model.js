// Módulo de aterrizaje estilo CLPS (no a escala: ~100x para que se vea en una escena de 36 km).
// Partes: cuerpo octagonal con aislante térmico dorado (MLI), cubierta superior, motor principal,
// 4 patas con amortiguadores y puntales, propulsores RCS, paneles solares de cuerpo,
// arreglo solar vertical que sigue el azimut del Sol (típico en el polo), antena de alta ganancia
// con gimbal que apunta a la Tierra, mástil de cámaras y cargas útiles.
import * as THREE from 'three';

function canvasTexture(size, draw, { repeat = 1 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  return tex;
}

// Normal map de "papel aluminio arrugado" para el MLI dorado
function foilNormalMap() {
  return canvasTexture(256, (g, s) => {
    g.fillStyle = 'rgb(128,128,255)';
    g.fillRect(0, 0, s, s);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 260; i++) {
      const x = rnd() * s, y = rnd() * s, r = 10 + rnd() * 34;
      g.fillStyle = `rgb(${Math.round(128 + (rnd() - 0.5) * 120)},${Math.round(128 + (rnd() - 0.5) * 120)},235)`;
      g.beginPath();
      const n = 3 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + rnd();
        g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
    }
  }, { repeat: 2 });
}

function solarCellTexture() {
  const tex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#0b1530';
    g.fillRect(0, 0, s, s);
    const n = 8, cell = s / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = 26 + Math.floor(Math.random() * 14);
        g.fillStyle = `rgb(${v - 10},${v},${v + 40})`;
        g.fillRect(i * cell + 2, j * cell + 2, cell - 4, cell - 4);
        g.strokeStyle = 'rgba(180,190,210,0.35)';
        g.lineWidth = 1;
        for (let k = 1; k < 4; k++) {
          g.beginPath();
          g.moveTo(i * cell + 2, j * cell + (k * cell) / 4);
          g.lineTo(i * cell + cell - 2, j * cell + (k * cell) / 4);
          g.stroke();
        }
      }
    }
    g.strokeStyle = '#cbd5e1';
    g.lineWidth = 3;
    g.strokeRect(1, 1, s - 2, s - 2);
  });
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Cilindro entre dos puntos (puntales, tubos)
function strut(a, b, radius, material, radialSegs = 10) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, radialSegs), material);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

export function buildDetailedLander({ envMap = null } = {}) {
  const std = (o) => new THREE.MeshStandardMaterial({ envMap, envMapIntensity: 0.9, ...o });
  const M = {
    gold: std({ color: 0xd9a21b, metalness: 1.0, roughness: 0.3, normalMap: foilNormalMap(), normalScale: new THREE.Vector2(0.7, 0.7) }),
    silverFoil: std({ color: 0xcfd6de, metalness: 1.0, roughness: 0.25, normalMap: foilNormalMap(), normalScale: new THREE.Vector2(0.5, 0.5) }),
    silver: std({ color: 0xc7ced8, metalness: 0.9, roughness: 0.3 }),
    white: std({ color: 0xf1f5f9, metalness: 0.0, roughness: 0.55, envMapIntensity: 0.4 }),
    dark: std({ color: 0x2b3442, metalness: 0.6, roughness: 0.45 }),
    black: std({ color: 0x0b0f17, metalness: 0.3, roughness: 0.5 }),
    nozzle: std({ color: 0x5b6472, metalness: 0.9, roughness: 0.35, side: THREE.DoubleSide }),
    nozzleInner: std({ color: 0x3a2a1c, metalness: 0.6, roughness: 0.6, side: THREE.BackSide }),
    solar: std({ map: solarCellTexture(), metalness: 0.5, roughness: 0.2, envMapIntensity: 1.2 }),
    panelBack: std({ color: 0xe2e8f0, metalness: 0.2, roughness: 0.6, envMapIntensity: 0.3 }),
    accent: std({ color: 0x0ea5e9, metalness: 0.3, roughness: 0.4, emissive: 0x0ea5e9, emissiveIntensity: 0.6 }),
    lens: std({ color: 0x111827, metalness: 0.9, roughness: 0.05 }),
  };

  const lander = new THREE.Group();
  lander.name = 'lander';

  // --- Cuerpo octagonal con MLI dorado ---
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 1.5, 8), M.gold);
  body.position.y = 1.75;
  lander.add(body);

  // Marcos de las aristas del octágono
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const p = new THREE.Vector3(Math.sin(a) * 1.46, 0, Math.cos(a) * 1.46);
    lander.add(strut(p.clone().setY(1.0), p.clone().setY(2.5), 0.035, M.silver, 6));
  }

  const bottomPlate = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.32, 0.2, 8), M.dark);
  bottomPlate.position.y = 0.92;
  lander.add(bottomPlate);

  const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.12, 8), M.white);
  deck.position.y = 2.56;
  lander.add(deck);
  const deckRim = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.04, 6, 8), M.silver);
  deckRim.rotation.x = Math.PI / 2;
  deckRim.rotation.z = Math.PI / 8;
  deckRim.position.y = 2.62;
  lander.add(deckRim);

  // Paneles en caras del octágono: 3 solares de cuerpo + 1 radiador blanco
  const faceAngle = (k) => (k / 8) * Math.PI * 2 + Math.PI / 8;
  const apothem = 1.45 * Math.cos(Math.PI / 8) + 0.02;
  [1, 3, 5].forEach(k => {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.2), M.solar);
    const a = faceAngle(k);
    panel.position.set(Math.sin(a) * apothem, 1.75, Math.cos(a) * apothem);
    panel.rotation.y = a;
    lander.add(panel);
  });
  {
    const a = faceAngle(7);
    const rad = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.2, 0.04), M.white);
    rad.position.set(Math.sin(a) * apothem, 1.75, Math.cos(a) * apothem);
    rad.rotation.y = a;
    lander.add(rad);
    for (let i = 0; i < 5; i++) { // aletas del radiador
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.025, 0.06), M.silver);
      fin.position.set(Math.sin(a) * (apothem + 0.04), 1.3 + i * 0.22, Math.cos(a) * (apothem + 0.04));
      fin.rotation.y = a;
      lander.add(fin);
    }
  }

  // --- Motor principal (tobera) ---
  const bellPts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    bellPts.push(new THREE.Vector2(0.17 + 0.42 * Math.pow(t, 1.6), 0.86 - 0.46 * t));
  }
  const bell = new THREE.Mesh(new THREE.LatheGeometry(bellPts, 32), M.nozzle);
  lander.add(bell);
  const bellInner = new THREE.Mesh(new THREE.LatheGeometry(bellPts.map(v => new THREE.Vector2(v.x * 0.97, v.y)), 32), M.nozzleInner);
  lander.add(bellInner);
  const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.14, 20), M.dark);
  throat.position.y = 0.88;
  lander.add(throat);

  // --- Patas de aterrizaje ---
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const s = Math.sin(a), c = Math.cos(a);
    const hip = new THREE.Vector3(s * 1.3, 1.35, c * 1.3);
    const foot = new THREE.Vector3(s * 2.6, 0.16, c * 2.6);
    const knee = hip.clone().lerp(foot, 0.58);

    lander.add(strut(hip, foot, 0.075, M.silver));
    // Amortiguador (tramo superior más grueso)
    lander.add(strut(hip, hip.clone().lerp(foot, 0.38), 0.12, M.gold, 12));
    // Puntales secundarios hacia la base del cuerpo
    [-0.42, 0.42].forEach(off => {
      const base = new THREE.Vector3(Math.sin(a + off) * 1.38, 0.95, Math.cos(a + off) * 1.38);
      lander.add(strut(base, knee, 0.04, M.dark, 8));
    });
    // Pie (footpad) con sensor de contacto
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.1, 24), M.silver);
    pad.position.set(foot.x, 0.07, foot.z);
    lander.add(pad);
    const probe = strut(new THREE.Vector3(foot.x, 0.07, foot.z), new THREE.Vector3(foot.x, -0.35, foot.z), 0.015, M.dark, 6);
    lander.add(probe);
  }

  // --- Propulsores RCS en 4 esquinas ---
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    const pod = new THREE.Group();
    pod.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.22), M.dark));
    [[0, 0, 1], [1, 0, 0], [-1, 0, 0], [0, -1, 0]].forEach(([x, y, z]) => {
      const n = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 10, 1, true), M.nozzle);
      n.position.set(x * 0.15, y * 0.15, z * 0.15);
      n.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(x, y, z));
      pod.add(n);
    });
    pod.position.set(Math.sin(a) * 1.6, 2.36, Math.cos(a) * 1.6);
    pod.rotation.y = a;
    lander.add(pod);
  }

  // --- Cargas útiles sobre la cubierta ---
  const payloads = [
    { size: [0.5, 0.35, 0.4], pos: [0.55, 2.8, 0.7], mat: M.silverFoil },
    { size: [0.35, 0.28, 0.35], pos: [-0.2, 2.76, 0.95], mat: M.white },
    { size: [0.45, 0.22, 0.3], pos: [0.9, 2.73, -0.35], mat: M.gold },
    { size: [0.3, 0.45, 0.3], pos: [-0.95, 2.84, -0.55], mat: M.dark },
  ];
  payloads.forEach(({ size, pos, mat }) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
    b.position.set(...pos);
    lander.add(b);
  });
  // Luz de estado
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), M.accent);
  beacon.position.set(-0.95, 3.1, -0.55);
  lander.add(beacon);

  // --- Mástil de cámaras ---
  lander.add(strut(new THREE.Vector3(0.95, 2.62, 0.35), new THREE.Vector3(0.95, 3.55, 0.35), 0.04, M.silver, 8));
  const camHead = new THREE.Group();
  camHead.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.18), M.white));
  [-0.09, 0.09].forEach(x => {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 14), M.lens);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(x, 0, 0.12);
    camHead.add(lens);
  });
  camHead.position.set(0.95, 3.62, 0.35);
  lander.add(camHead);

  // --- Arreglo solar vertical con seguimiento de azimut ---
  lander.add(strut(new THREE.Vector3(0, 2.62, 0), new THREE.Vector3(0, 4.95, 0), 0.07, M.silver, 12));
  const panelPivot = new THREE.Group();
  panelPivot.position.set(0, 4.25, 0);
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.06, 0.06), M.silver);
  panelPivot.add(yoke);
  [-1, 1].forEach(side => {
    const front = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 1.15), M.solar);
    front.position.set(side * 0.98, 0, 0.02);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 1.15), M.panelBack);
    back.position.set(side * 0.98, 0, -0.005);
    back.rotation.y = Math.PI;
    panelPivot.add(front, back);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.02), M.silver);
    frame.position.set(side * 0.98, 0, 0.0);
    frame.scale.set(1, 1, 0.5);
    panelPivot.add(frame);
  });
  const gimbalHub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.22, 16), M.dark);
  panelPivot.add(gimbalHub);
  lander.add(panelPivot);

  // --- Antena de alta ganancia (HGA) con gimbal ---
  const hgaBase = new THREE.Vector3(-0.75, 2.62, 0.55);
  lander.add(strut(hgaBase, hgaBase.clone().setY(3.55), 0.05, M.silver, 10));
  const gimbal = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), M.dark);
  gimbal.position.set(hgaBase.x, 3.6, hgaBase.z);
  lander.add(gimbal);

  const dishPivot = new THREE.Group();
  dishPivot.position.set(hgaBase.x, 3.72, hgaBase.z);
  const f = 0.32, R = 0.72;
  const parab = [];
  for (let i = 0; i <= 16; i++) {
    const r = (i / 16) * R;
    parab.push(new THREE.Vector2(r, (r * r) / (4 * f)));
  }
  const dishGeo = new THREE.LatheGeometry(parab, 40);
  dishGeo.rotateX(Math.PI / 2); // eje del paraboloide → +Z (lookAt apunta +Z a la Tierra)
  const dish = new THREE.Mesh(dishGeo, std({ color: 0xf8fafc, metalness: 0.25, roughness: 0.35, side: THREE.DoubleSide }));
  dishPivot.add(dish);
  const rimZ = (R * R) / (4 * f);
  for (let k = 0; k < 3; k++) { // trípode del alimentador
    const a = (k / 3) * Math.PI * 2;
    dishPivot.add(strut(new THREE.Vector3(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95, rimZ), new THREE.Vector3(0, 0, f), 0.015, M.silver, 6));
  }
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.14, 12), M.gold);
  feed.rotation.x = Math.PI / 2;
  feed.position.z = f;
  dishPivot.add(feed);
  lander.add(dishPivot);

  lander.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return { group: lander, dishPivot, panelPivot };
}
