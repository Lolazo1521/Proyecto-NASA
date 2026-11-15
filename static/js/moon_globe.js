// Vista global: la Luna completa como esfera, iluminada con la dirección REAL del Sol del paso
// seleccionado (se ve el terminador moverse), con el sitio marcado y la dirección de la Tierra.
// Se usa de dos formas: recuadro (inset) en la esquina del visor local y modo pantalla completa.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { applyCraterDetail } from './lunar_shaders.js';

const DEG = Math.PI / 180;
const t = (key, vars) => (window.I18N ? window.I18N.t(key, vars) : key);

// Marco selenográfico de la escena: +X = (lat 0, lon 0) cara visible, +Y = Polo Norte,
// -Z = lon +90° E. Coincide con el mapeo UV de THREE.SphereGeometry.
export function lonLatToVec3(latDeg, lonDeg, r = 1) {
  const la = latDeg * DEG, lo = lonDeg * DEG;
  return new THREE.Vector3(r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo));
}

// Base local Este-Norte-Arriba del sitio en el marco selenográfico
export function enuBasis(latDeg, lonDeg) {
  const la = latDeg * DEG, lo = lonDeg * DEG;
  const up = lonLatToVec3(latDeg, lonDeg);
  const east = new THREE.Vector3(-Math.sin(lo), 0, -Math.cos(lo));
  const north = new THREE.Vector3(-Math.sin(la) * Math.cos(lo), Math.cos(la), Math.sin(la) * Math.sin(lo));
  return { up, east, north };
}

// Convierte acimut/elevación topocéntricos (Horizons) a una dirección en el marco de la Luna
export function azElToSeleno(azDeg, elDeg, basis) {
  const az = azDeg * DEG, el = elDeg * DEG;
  return new THREE.Vector3()
    .addScaledVector(basis.east, Math.cos(el) * Math.sin(az))
    .addScaledVector(basis.north, Math.cos(el) * Math.cos(az))
    .addScaledVector(basis.up, Math.sin(el))
    .normalize();
}

// Mares principales (lat, lon, radio en grados, oscuridad). Posiciones aproximadas reales.
const MARIA = [
  [35, -55, 12, 0.8], [20, -58, 14, 0.85], [5, -55, 12, 0.8], [-5, -45, 9, 0.75], [10, -40, 8, 0.8], [25, -42, 8, 0.8], [42, -48, 7, 0.7], // Oceanus Procellarum
  [33, -16, 11, 0.9], [40, -25, 6, 0.85], [44, -31.5, 3.5, 0.8],  // Imbrium + Sinus Iridum
  [28, 17.5, 8, 0.9],                    // Serenitatis
  [8.5, 31.4, 9, 0.9], [15, 25, 5, 0.85], // Tranquillitatis
  [17, 59, 6, 0.95],                     // Crisium
  [-7.8, 51.3, 7, 0.8],                  // Fecunditatis
  [-15.2, 35.5, 4.5, 0.85],              // Nectaris
  [-21.3, -16.6, 8, 0.75],               // Nubium
  [-24.4, -38.6, 4.5, 0.85],             // Humorum
  [-10, -23, 4, 0.7], [7.5, -30.9, 5, 0.7], [13.3, 3.6, 3.5, 0.75], [2.4, 1.7, 2.5, 0.6], // Cognitum, Insularum, Vaporum, Medii
  [57, -30, 4, 0.6], [56, -10, 4, 0.65], [56, 10, 4, 0.65], [57, 30, 4, 0.6], // Frigoris
  [27.3, 147.9, 3.5, 0.8],               // Moscoviense (cara oculta)
  [-19.4, -92.8, 3.5, 0.75],             // Orientale
  [-38.9, 93, 5, 0.5], [1.3, 87.5, 3.5, 0.7], [13.3, 86.1, 3, 0.6], // Australe, Smythii, Marginis
  [-43, 166, 6, 0.35], [-36, -151, 4, 0.4], // Ingenii / Apollo (dentro de SPA)
];
const RAY_CRATERS = [
  [-43.3, -11.2, 1.0], [9.6, -20.1, 0.8], [8.1, -38, 0.5], [23.7, -47.4, 0.7], [36, 103, 0.6], [-9, 40, 0.3],
];

function makeMoonAlbedoTexture(W = 2048, H = 1024) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const toXY = (lat, lon) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];
  let seed = 12345;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  g.fillStyle = 'rgb(150,147,141)';
  g.fillRect(0, 0, W, H);

  // Blob suave con estiramiento horizontal por proyección equirectangular y repetición en el borde
  const blob = (lat, lon, rDeg, rgba) => {
    const [x, y] = toXY(lat, lon);
    const ry = (rDeg / 180) * H;
    const sx = 1 / Math.max(Math.cos(lat * DEG), 0.12);
    [-W, 0, W].forEach(off => {
      g.save();
      g.translate(x + off, y);
      g.scale(sx, 1);
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, ry);
      grad.addColorStop(0, rgba(1));
      grad.addColorStop(0.65, rgba(0.85));
      grad.addColorStop(1, rgba(0));
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, 0, ry, 0, Math.PI * 2);
      g.fill();
      g.restore();
    });
  };

  // Variación de brillo a gran escala en las tierras altas
  for (let i = 0; i < 260; i++) {
    const lat = Math.asin(2 * rnd() - 1) / DEG, lon = rnd() * 360 - 180;
    const v = rnd() < 0.5 ? 150 : 200;
    blob(lat, lon, 4 + rnd() * 14, k => `rgba(${v},${v - 3},${v - 8},${0.18 * k})`);
  }
  // Cuenca Polo Sur–Aitken (ligeramente más oscura)
  blob(-53, -169, 32, k => `rgba(120,116,112,${0.35 * k})`);

  // Mares: varios sub-blobs para bordes irregulares
  MARIA.forEach(([lat, lon, r, dark]) => {
    for (let k = 0; k < 14; k++) {
      const dl = (rnd() - 0.5) * r * 1.0, dn = (rnd() - 0.5) * r * 1.2;
      blob(lat + dl, lon + dn, r * (0.35 + rnd() * 0.45), a => `rgba(84,82,79,${0.32 * dark * a})`);
    }
  });

  // Cráteres de rayos (Tycho, Copérnico, Kepler, Aristarco, Giordano Bruno...)
  RAY_CRATERS.forEach(([lat, lon, s]) => {
    const [x, y] = toXY(lat, lon);
    const sx = 1 / Math.max(Math.cos(lat * DEG), 0.2);
    g.save();
    g.translate(x, y);
    g.scale(sx, 1);
    g.strokeStyle = `rgba(225,222,215,${0.035 * s + 0.02})`;
    for (let k = 0; k < 40; k++) {
      const a = rnd() * Math.PI * 2, len = (4 + rnd() * 20) * s * (H / 180);
      g.lineWidth = 0.6 + rnd() * 1.6;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      g.stroke();
    }
    g.restore();
    blob(lat, lon, 0.8 * s + 0.4, a => `rgba(235,233,228,${0.6 * a})`);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeEarthTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#1d4ed8';
  g.fillRect(0, 0, 512, 256);
  let seed = 99;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#3f7d3a';
  for (let i = 0; i < 26; i++) { // "continentes"
    g.beginPath();
    g.ellipse(rnd() * 512, 50 + rnd() * 156, 15 + rnd() * 50, 10 + rnd() * 35, rnd() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 70; i++) { // nubes
    g.beginPath();
    g.ellipse(rnd() * 512, rnd() * 256, 10 + rnd() * 40, 3 + rnd() * 8, rnd() * 0.6, 0, Math.PI * 2);
    g.fill();
  }
  g.fillRect(0, 0, 512, 14);
  g.fillRect(0, 242, 512, 14);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glowTexture(rgb) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(0.2, `rgba(${rgb},0.6)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function arrowMesh(color, length = 0.42) {
  const grp = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, length * 0.8, 8), mat);
  shaft.position.y = length * 0.4;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.022, length * 0.2, 14), mat);
  head.position.y = length * 0.9;
  grp.add(shaft, head);
  return grp; // apunta a +Y local
}

function label(html, cls) {
  const d = document.createElement('div');
  d.className = cls;
  d.innerHTML = html;
  const o = new CSS2DObject(d);
  o.center.set(0.5, 1.2);
  return o;
}

export class MoonGlobe {
  constructor({ container, domElement }) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02040a);
    this.active = false;

    // Estrellas
    const starGeo = new THREE.BufferGeometry();
    const sp = [];
    for (let i = 0; i < 2500; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(60);
      sp.push(v.x, v.y, v.z);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcbd5e1, size: 1.1, sizeAttenuation: false })));

    // Luna
    const moonMat = applyCraterDetail(new THREE.MeshStandardMaterial({
      map: makeMoonAlbedoTexture(), roughness: 1.0, metalness: 0.0,
    }), { scale: 5.0, bump: 1.4, albedo: 0.45, density: [0.8, 0.85, 0.9] });
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(1, 256, 128), moonMat);
    this.scene.add(this.moon);

    // Luces: Sol (dirección real), luz de Tierra (earthshine) y un mínimo ambiental
    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 2.1);
    this.earthshine = new THREE.DirectionalLight(0x9fbfff, 0.12);
    this.scene.add(this.sunLight, this.earthshine, new THREE.AmbientLight(0xffffff, 0.02));

    // Retícula de latitud/longitud (solo pantalla completa)
    this.grid = new THREE.Group();
    const gridMat = new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.35 });
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts = [];
      for (let lon = -180; lon <= 180; lon += 3) pts.push(lonLatToVec3(lat, lon, 1.002));
      this.grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    for (let lon = -180; lon < 180; lon += 30) {
      const pts = [];
      for (let lat = -90; lat <= 90; lat += 3) pts.push(lonLatToVec3(lat, lon, 1.002));
      this.grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    // Círculo polar sur (-80°), zona de interés de Artemis
    const polarPts = [];
    for (let lon = -180; lon <= 180; lon += 2) polarPts.push(lonLatToVec3(-80, lon, 1.003));
    this.grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(polarPts),
      new THREE.LineDashedMaterial({ color: 0x38bdf8, dashSize: 0.02, gapSize: 0.015, transparent: true, opacity: 0.6 })));
    this.grid.children[this.grid.children.length - 1].computeLineDistances();
    this.scene.add(this.grid);

    // Marcador del sitio
    this.site = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.028, 32),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide, depthTest: false, transparent: true }));
    ring.renderOrder = 5;
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 8), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
    pin.position.y = 0.045;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.013, 16, 10), new THREE.MeshBasicMaterial({ color: 0xfb7185 }));
    head.position.y = 0.09;
    ring.rotation.x = -Math.PI / 2;
    this.siteLabel = label('', 'globe-label site');
    this.siteLabel.position.y = 0.1;
    this.site.add(ring, pin, head, this.siteLabel);
    this.scene.add(this.site);

    // Flechas desde el sitio hacia Sol y Tierra
    this.sunArrow = arrowMesh(0xfbbf24);
    this.earthArrow = arrowMesh(0x38bdf8);
    this.scene.add(this.sunArrow, this.earthArrow);

    // Sol (resplandor lejano) y Tierra (esfera fuera de escala)
    this.sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('255,220,120'), blending: THREE.AdditiveBlending, depthWrite: false }));
    this.sunGlow.scale.setScalar(2.2);
    this.sunLabel = label(t('globe.sun'), 'globe-label sun');
    this.sunGlow.add(this.sunLabel);
    this.earth = new THREE.Mesh(new THREE.SphereGeometry(0.1, 48, 24),
      new THREE.MeshStandardMaterial({ map: makeEarthTexture(), roughness: 0.7, emissive: 0x0b1e4a, emissiveIntensity: 0.4 }));
    this.earthLabel = label(t('globe.earth'), 'globe-label earth');
    this.earthLabel.position.y = 0.13;
    this.earth.add(this.earthLabel);
    this.scene.add(this.sunGlow, this.earth);

    // Cámaras: pantalla completa (con controles) e inset (fija, mira al sitio)
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.01, 200);
    this.camera.position.set(2.2, 1.2, 2.6);
    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = 1.25;
    this.controls.maxDistance = 9;
    this.controls.enabled = false;
    this.insetCamera = new THREE.PerspectiveCamera(30, 1, 0.01, 200);

    // Etiquetas HTML propias de esta vista
    this.labelRenderer = new CSS2DRenderer();
    Object.assign(this.labelRenderer.domElement.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none', display: 'none' });
    container.insertBefore(this.labelRenderer.domElement, container.firstChild);
    this.resize(container.clientWidth, container.clientHeight);
  }

  setSite(site) {
    this.basis = enuBasis(site.lat, site.lon);
    const up = this.basis.up;
    this.site.position.copy(up);
    this.site.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    this.siteData = site;
    this.setSiteLabel(site.name);
    this.sunArrow.position.copy(up);
    this.earthArrow.position.copy(up);

    // Inset: mira al sitio desde "arriba" pero inclinado hacia la cara visible, Norte arriba
    const view = up.clone().multiplyScalar(0.8).add(new THREE.Vector3(0.6, 0, 0)).normalize();
    this.insetCamera.position.copy(view.multiplyScalar(3.3));
    this.insetCamera.up.set(0, 1, 0);
    this.insetCamera.lookAt(0, 0, 0);

    // Pantalla completa: arranca mirando al sitio
    const start = up.clone().add(new THREE.Vector3(0.6, 0, 0)).normalize().multiplyScalar(4.6);
    this.camera.position.copy(start);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  // Nombre del sitio ya traducido (lo decide index.html)
  setSiteLabel(name) {
    if (!this.siteData) return;
    const s = this.siteData;
    this.siteLabel.element.innerHTML = `📍 ${name}<br><span style="opacity:.65">${s.lat.toFixed(2)}°, ${s.lon.toFixed(2)}°</span>`;
  }

  refreshLabels() {
    this.sunLabel.element.innerHTML = t('globe.sun');
    this.earthLabel.element.innerHTML = t('globe.earth');
  }

  update(step) {
    if (!this.basis) return;
    const sunDir = azElToSeleno(step.sun.az, step.sun.el, this.basis);
    const earthDir = azElToSeleno(step.earth.az, step.earth.el, this.basis);
    this.sunLight.position.copy(sunDir).multiplyScalar(10);
    this.earthshine.position.copy(earthDir).multiplyScalar(10);
    this.sunGlow.position.copy(sunDir).multiplyScalar(14);
    this.earth.position.copy(earthDir).multiplyScalar(3.3);
    this.earth.lookAt(0, 0, 0);
    const Y = new THREE.Vector3(0, 1, 0);
    this.sunArrow.quaternion.setFromUnitVectors(Y, sunDir);
    this.earthArrow.quaternion.setFromUnitVectors(Y, earthDir);
    this.sunArrow.children.forEach(m => m.material.color.setHex(step.sun.visible ? 0xfbbf24 : 0x92400e));
    this.earthArrow.children.forEach(m => m.material.color.setHex(step.earth.visible ? 0x38bdf8 : 0xf43f5e));
  }

  setActive(on) {
    this.active = on;
    this.controls.enabled = on;
    this.grid.visible = on;
    this.labelRenderer.domElement.style.display = on ? '' : 'none';
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.labelRenderer.setSize(w, h);
  }

  renderFull(renderer) {
    this.controls.update();
    renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  renderInset(renderer, x, y, size) {
    const prevGrid = this.grid.visible;
    this.grid.visible = false;
    renderer.setScissorTest(true);
    renderer.setScissor(x, y, size, size);
    renderer.setViewport(x, y, size, size);
    renderer.render(this.scene, this.insetCamera);
    renderer.setScissorTest(false);
    this.grid.visible = prevGrid;
  }
}
