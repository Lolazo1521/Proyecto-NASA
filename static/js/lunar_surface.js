// Terreno local alrededor del sitio de alunizaje.
// - Malla polar (disco redondo) con más resolución cerca del lander.
// - Curvatura lunar real (caída = d² / 2R).
// - Cráteres simples procedurales (solo depresiones cerca del lander, para no inventar
//   horizonte que el backend no calculó) + detalle fino por shader.
// - Faldón lateral para que el disco se lea como un "corte" de la superficie lunar.
import * as THREE from 'three';
import { applyCraterDetail } from './lunar_shaders.js';

const MOON_RADIUS_M = 1737400.0;
const UNIT = 0.01; // 1 unidad 3D = 100 m

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function makeCraters(rand, patchR) {
  const craters = [];
  for (let i = 0; i < 140; i++) {
    // Distribución de tamaños tipo ley de potencias: muchos pequeños, pocos grandes
    const r = Math.min(1500, 110 / Math.pow(rand() + 1e-3, 1 / 1.7));
    const ang = rand() * Math.PI * 2;
    const dist = Math.sqrt(rand()) * patchR;
    if (dist < r + 650) continue; // zona despejada alrededor del lander
    if (dist + r > patchR) continue;
    const fresh = rand();
    craters.push({
      x: Math.sin(ang) * dist,
      z: -Math.cos(ang) * dist,
      r,
      depth: r * (0.10 + 0.28 * fresh),
      // Bordes elevados solo lejos del lander (cerca serían horizonte que el backend no ve)
      rim: r * 0.05 * fresh * smoothstep(3000, 7000, dist),
      fresh,
    });
  }
  return craters;
}

function craterOffset(craters, x, z) {
  let h = 0;
  let albedo = 0;
  for (const c of craters) {
    const dx = x - c.x;
    const dz = z - c.z;
    const d2 = (dx * dx + dz * dz) / (c.r * c.r);
    if (d2 > 9) continue;
    const d = Math.sqrt(d2);
    if (d < 1) {
      h += (d2 - 1) * c.depth + c.rim;
      albedo -= 0.035 * (1 - c.fresh);
    } else {
      h += c.rim * Math.exp(-(d - 1) * 3);
      if (c.fresh > 0.75) albedo += 0.09 * (c.fresh - 0.75) * 4 * Math.exp(-(d - 1) * 1.6);
    }
  }
  return { h, albedo };
}

/**
 * Construye el terreno local redondo y una malla simple para raycasting.
 * @returns {{ mesh: THREE.Mesh, rayMesh: THREE.Mesh, radiusUnits: number }}
 */
export function buildLocalTerrain(terrainData, site) {
  const N = terrainData.grid_size;
  const scaleM = terrainData.pixel_scale_m;
  const elev = terrainData.elevations;
  const halfM = ((N - 1) / 2) * scaleM;
  const patchR = halfM * 0.995;

  // Muestreo bilineal del DEM (fila 0 = Norte = -Z, columna 0 = Oeste = -X)
  const sampleDEM = (xM, zM) => {
    const c = Math.min(N - 1.001, Math.max(0, xM / scaleM + (N - 1) / 2));
    const r = Math.min(N - 1.001, Math.max(0, zM / scaleM + (N - 1) / 2));
    const c0 = Math.floor(c), r0 = Math.floor(r);
    const fc = c - c0, fr = r - r0;
    const a = elev[r0][c0], b = elev[r0][c0 + 1];
    const d = elev[r0 + 1][c0], e = elev[r0 + 1][c0 + 1];
    return (a * (1 - fc) + b * fc) * (1 - fr) + (d * (1 - fc) + e * fc) * fr;
  };

  const seed = Math.floor(Math.abs(site.lat * 1000) * 7919 + Math.abs(site.lon * 1000) * 104729);
  const rand = mulberry32(seed);
  const craters = makeCraters(rand, patchR);

  const RINGS = 150;
  const SEGS = 360;
  const positions = [];
  const colors = [];
  const indices = [];
  const surfaceY = (xM, zM, rawM, extraM) => {
    const drop = (xM * xM + zM * zM) / (2 * MOON_RADIUS_M);
    return (rawM + extraM - drop) * UNIT;
  };
  const shadeFor = (rawM, albedo, xM, zM) => {
    const n = Math.sin(xM * 0.0021 + 1.7) * Math.cos(zM * 0.0017 - 0.4) * 0.03
            + Math.sin(xM * 0.00045 - zM * 0.0006) * 0.04;
    const s = THREE.MathUtils.clamp(0.43 + (rawM / 1800) * 0.12 + albedo + n, 0.22, 0.72);
    return [s, s * 0.985, s * 0.96]; // regolito gris con un toque cálido
  };

  // Centro
  positions.push(0, 0, 0);
  colors.push(...shadeFor(sampleDEM(0, 0), 0, 0, 0));

  let minEdgeY = Infinity;
  const ringRadius = (i) => patchR * Math.pow(i / RINGS, 1.35);
  for (let i = 1; i <= RINGS; i++) {
    const r = ringRadius(i);
    for (let s = 0; s < SEGS; s++) {
      const th = (s / SEGS) * Math.PI * 2;
      const xM = Math.sin(th) * r;
      const zM = -Math.cos(th) * r;
      const raw = sampleDEM(xM, zM);
      const cr = craterOffset(craters, xM, zM);
      const y = surfaceY(xM, zM, raw, cr.h);
      positions.push(xM * UNIT, y, zM * UNIT);
      colors.push(...shadeFor(raw, cr.albedo, xM, zM));
      if (i === RINGS) minEdgeY = Math.min(minEdgeY, y);
    }
  }
  const idx = (i, s) => (i === 0 ? 0 : 1 + (i - 1) * SEGS + (s % SEGS));
  for (let s = 0; s < SEGS; s++) indices.push(0, idx(1, s + 1), idx(1, s));
  for (let i = 1; i < RINGS; i++) {
    for (let s = 0; s < SEGS; s++) {
      indices.push(idx(i, s), idx(i, s + 1), idx(i + 1, s));
      indices.push(idx(i, s + 1), idx(i + 1, s + 1), idx(i + 1, s));
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = applyCraterDetail(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.97, metalness: 0.0,
  }), { scale: 1 / 8, bump: 0.8, albedo: 0.35, density: [0.3, 0.35, 0.4] });

  const surface = new THREE.Mesh(geo, mat);
  surface.receiveShadow = true;
  surface.castShadow = true;

  // Faldón: pared exterior del disco (vértices propios para que no mezcle normales)
  const skirtPos = [];
  const skirtCol = [];
  const skirtIdx = [];
  const bottomY = minEdgeY - 22;
  const base = 1 + (RINGS - 1) * SEGS;
  for (let s = 0; s < SEGS; s++) {
    const k = (base + s) * 3;
    const x = positions[k], y = positions[k + 1], z = positions[k + 2];
    skirtPos.push(x, y, z, x, bottomY, z);
    skirtCol.push(0.30, 0.29, 0.28, 0.10, 0.10, 0.11);
  }
  for (let s = 0; s < SEGS; s++) {
    const t0 = 2 * s, b0 = 2 * s + 1;
    const t1 = 2 * ((s + 1) % SEGS), b1 = t1 + 1;
    skirtIdx.push(t0, t1, b0, t1, b1, b0);
  }
  const skirtGeo = new THREE.BufferGeometry();
  skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(skirtPos, 3));
  skirtGeo.setAttribute('color', new THREE.Float32BufferAttribute(skirtCol, 3));
  skirtGeo.setIndex(skirtIdx);
  skirtGeo.computeVertexNormals();
  const skirt = new THREE.Mesh(skirtGeo, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1, metalness: 0,
  }));
  skirt.receiveShadow = true;

  const group = new THREE.Group();
  group.add(surface, skirt);
  group.userData.surface = surface;

  // Malla de raycast: la rejilla original del backend (sin cráteres decorativos)
  const N1 = N - 1;
  const rayGeo = new THREE.PlaneGeometry(N1 * scaleM * UNIT, N1 * scaleM * UNIT, N1, N1);
  rayGeo.rotateX(-Math.PI / 2);
  const p = rayGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const row = Math.floor(i / N), col = i % N;
    const xM = (col - N1 / 2) * scaleM, zM = (row - N1 / 2) * scaleM;
    p.setY(i, surfaceY(xM, zM, elev[row][col], 0));
  }
  rayGeo.computeBoundingSphere();
  const rayMesh = new THREE.Mesh(rayGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));

  return { mesh: group, rayMesh, radiusUnits: patchR * UNIT };
}

export function disposeTerrain(t) {
  if (!t) return;
  t.mesh.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
  t.rayMesh.geometry.dispose();
  t.rayMesh.material.dispose();
}
