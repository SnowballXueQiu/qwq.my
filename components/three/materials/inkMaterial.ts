import { GLSL3, ShaderMaterial, Vector3 } from "three";
import { noise } from "../shaders/noise.glsl";

/** Uniforms shared by every ink material; the pipeline advances them once per frame. */
export const sharedUniforms = {
  uTime: { value: 0 },
  // A camera-relative light from the upper left, like a drawing's conventional light.
  uLightDir: { value: new Vector3(-0.55, 0.7, 0.55).normalize() },
};

/** How the composite pass fills a surface. */
export const Fill = { shaded: 0, paper: 0.5, ink: 1 } as const;

let nextObjectId = 1;

export type InkMaterialOptions = {
  fill?: number;
  accent?: number;
  /** Amplitude of the liquid surface wobble, in object units. */
  wobble?: number;
  wobbleFrequency?: number;
  /** Lifts or sinks the light so a surface reads lighter or darker. */
  toneBias?: number;
};

const vertexShader = /* glsl */ `
${noise}
uniform float uTime;
uniform float uWobble;
uniform float uWobbleFreq;
out vec3 vViewNormal;
out vec3 vObjPos;

vec3 displace(vec3 p, vec3 n) {
  float w = snoise(p * uWobbleFreq + vec3(0.0, uTime * 0.55, uTime * 0.2));
  return p + n * w * uWobble;
}

void main() {
  vec3 pos = position;
  vec3 nrm = normal;
  if (uWobble > 0.0) {
    // Re-derive the normal from two displaced neighbours so shading follows the wobble.
    vec3 helper = abs(nrm.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 t = normalize(cross(nrm, helper));
    vec3 b = cross(nrm, t);
    float e = 0.02;
    vec3 p0 = displace(pos, nrm);
    vec3 pt = displace(pos + t * e, nrm);
    vec3 pb = displace(pos + b * e, nrm);
    pos = p0;
    nrm = normalize(cross(pt - p0, pb - p0));
  }
  vObjPos = pos;
  vec4 mv = vec4(pos, 1.0);
  #ifdef USE_INSTANCING
    mv = instanceMatrix * mv;
    nrm = mat3(instanceMatrix) * nrm;
  #endif
  mv = modelViewMatrix * mv;
  vViewNormal = normalize(normalMatrix * nrm);
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
${noise}
layout(location = 0) out vec4 gColor;
layout(location = 1) out vec4 gNormal;

uniform vec3 uLightDir;
uniform float uAccent;
uniform float uFill;
uniform float uObjectId;
uniform float uToneBias;
uniform float uDissolve;
uniform float uDissolveScale;
in vec3 vViewNormal;
in vec3 vObjPos;

void main() {
  float accent = uAccent;
  if (uDissolve > 0.0) {
    // Erase along a noise field; the fresh edge is redrawn in accent "red pencil".
    float n = snoise(vObjPos * uDissolveScale) * 0.5 + 0.5;
    float edge = n - uDissolve * 1.08;
    if (edge < 0.0) discard;
    accent = max(accent, 1.0 - smoothstep(0.0, 0.05, edge));
  }
  vec3 n = normalize(vViewNormal);
  if (!gl_FrontFacing) n = -n;
  float halfLambert = dot(n, uLightDir) * 0.5 + 0.5;
  float tone = clamp(pow(halfLambert, 1.35) + uToneBias, 0.0, 1.0);
  gColor = vec4(tone, accent, uFill, 1.0);
  gNormal = vec4(n * 0.5 + 0.5, uObjectId);
}
`;

/** A G-buffer material: writes tone/accent/fill and normal/object-id for the ink composite. */
export function createInkMaterial(options: InkMaterialOptions = {}) {
  const id = nextObjectId++;
  return new ShaderMaterial({
    glslVersion: GLSL3,
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: sharedUniforms.uTime,
      uLightDir: sharedUniforms.uLightDir,
      uWobble: { value: options.wobble ?? 0 },
      uWobbleFreq: { value: options.wobbleFrequency ?? 1.2 },
      uAccent: { value: options.accent ?? 0 },
      uFill: { value: options.fill ?? Fill.shaded },
      // Distinct ids let the composite draw lines where two objects touch at equal depth.
      uObjectId: { value: ((id * 37) % 251) / 255 },
      uToneBias: { value: options.toneBias ?? 0 },
      uDissolve: { value: 0 },
      uDissolveScale: { value: 1.6 },
    },
  });
}

export type InkMaterial = ReturnType<typeof createInkMaterial>;
