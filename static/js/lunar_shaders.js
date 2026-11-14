// Detalle procedural de superficie lunar para MeshStandardMaterial.
// Añade en el fragment shader un campo de cráteres 3D (celular, 3 escalas) que:
//   - perturba la normal (relieve de cráteres sin tocar la geometría)
//   - modula el albedo (cráteres frescos con eyecta brillante + ruido de regolito)
// Usa la posición en espacio de objeto, así que no hay costuras ni distorsión en los polos.

const GLSL = /* glsl */ `
uniform float uCraterScale;
uniform float uCraterBump;
uniform float uCraterAlbedo;
uniform vec3 uCraterDensity;
uniform mat3 normalMatrix;   // three.js la asigna por objeto; aquí también se usa en el fragment
varying vec3 vCraterPos;

vec3 crHash33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}

float crNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = crHash33(i).x;
  float n100 = crHash33(i + vec3(1, 0, 0)).x;
  float n010 = crHash33(i + vec3(0, 1, 0)).x;
  float n110 = crHash33(i + vec3(1, 1, 0)).x;
  float n001 = crHash33(i + vec3(0, 0, 1)).x;
  float n101 = crHash33(i + vec3(1, 0, 1)).x;
  float n011 = crHash33(i + vec3(0, 1, 1)).x;
  float n111 = crHash33(i + vec3(1, 1, 1)).x;
  return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
             mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}

// Una capa de cráteres: cada celda puede tener un cráter con centro, radio y "frescura" aleatorios.
// Devuelve (altura, albedo) en unidades de celda y el gradiente ANALÍTICO de la altura
// (normales suaves, sin el "pixeleo" que dan las derivadas de pantalla).
vec2 craterLayer(vec3 p, float density, out vec3 grad) {
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  float h = 0.0;
  float a = 0.0;
  grad = vec3(0.0);
  for (int z = -1; z <= 1; z++)
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 r1 = crHash33(ip + g);
    vec3 r2 = crHash33(ip + g + 19.19);
    if (r2.x > density) continue;
    float rad = mix(0.15, 0.48, r2.y * r2.y);
    vec3 v = fp - (g + r1);              // del centro del cráter hasta p
    float len = length(v);
    float d = len / rad;
    if (d > 2.4) continue;
    float fresh = r2.z;
    float depth = mix(0.22, 0.55, fresh);
    float k = mix(2.5, 5.0, fresh);
    float rimE = exp(-pow((d - 1.0) * k, 2.0));
    float bowl = d < 1.0 ? (d * d - 1.0) * depth : 0.0;
    float dBowl = d < 1.0 ? 2.0 * d * depth : 0.0;
    float rim = rimE * 0.5 * depth;
    float dRim = rim * (-2.0 * (d - 1.0) * k * k);
    h += (bowl + rim) * rad;
    grad += (dBowl + dRim) * (v / max(len, 1e-5)); // rad * dh/dd * dd/dp, con dd/dp = v / (len * rad)
    if (fresh > 0.82) a += exp(-pow(max(d - 0.9, 0.0) * 1.4, 2.0)) * (fresh - 0.82) * 2.2;
    if (d < 1.0) a -= 0.05 * (1.0 - fresh);
  }
  return vec2(h, a);
}

// Cada capa se apaga antes de que sus cráteres midan menos de unos pocos pixeles (anti-aliasing).
float crFade(float fw, float freq) { return 1.0 - smoothstep(0.02, 0.09, fw * freq); }

// Suma de 3 escalas. Devuelve (altura, albedo); el gradiente total sale en "grad".
vec2 craterField(vec3 p, float fw, out vec3 grad) {
  vec2 s = vec2(0.0);
  vec3 gl;
  grad = vec3(0.0);
  float w1 = crFade(fw, 1.0);
  float w2 = crFade(fw, 2.7);
  float w3 = crFade(fw, 7.3);
  if (w1 > 0.0) { s += craterLayer(p, uCraterDensity.x, gl) * w1; grad += gl * w1; }
  if (w2 > 0.0) { s += craterLayer(p * 2.7 + 11.0, uCraterDensity.y, gl) * vec2(1.0 / 2.7, 0.7) * w2; grad += gl * w2; }
  if (w3 > 0.0) { s += craterLayer(p * 7.3 + 37.0, uCraterDensity.z, gl) * vec2(1.0 / 7.3, 0.5) * w3; grad += gl * w3; }
  float wn = crFade(fw, 16.0);
  s.y += (crNoise(p * 16.0) - 0.5) * 0.18 * wn + (crNoise(p * 1.3) - 0.5) * 0.12;
  return s;
}
`;

/**
 * Inyecta el detalle de cráteres en un MeshStandardMaterial.
 * @param {THREE.MeshStandardMaterial} material
 * @param {object} opts scale: celdas por unidad de objeto; bump: exageración del relieve; albedo: fuerza del color
 */
export function applyCraterDetail(material, { scale = 1, bump = 1, albedo = 0.6, density = [0.55, 0.6, 0.65] } = {}) {
  const uniforms = {
    uCraterDensity: { value: density },
    uCraterScale: { value: scale },
    uCraterBump: { value: bump },
    uCraterAlbedo: { value: albedo },
  };
  material.userData.craterUniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCraterPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCraterPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLSL)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 crP = vCraterPos * uCraterScale;
        float crFw = length(fwidth(crP));
        vec3 crGrad;
        vec2 crS = craterField(crP, crFw, crGrad);
        diffuseColor.rgb *= clamp(1.0 + uCraterAlbedo * crS.y, 0.45, 1.7);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          // Gradiente de altura (adimensional) a espacio de vista; se resta su parte tangente
          vec3 gView = normalMatrix * crGrad;
          normal = normalize(normal - uCraterBump * (gView - dot(gView, normal) * normal));
        }`);
  };
  material.customProgramCacheKey = () => 'lunar-crater-detail';
  return material;
}
