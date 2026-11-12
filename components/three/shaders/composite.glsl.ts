import { noise } from "./noise.glsl";

export const compositeVertex = /* glsl */ `
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Turns the G-buffer into a drawing: Sobel ink lines from depth/normal/id,
 * screen-space halftone and hatching from tone, paper grain, and the
 * paper⇄ink inversion and the glitch used on scene cuts.
 */
export const compositeFragment = /* glsl */ `
precision highp float;
${noise}

uniform sampler2D tColor;   // r tone, g accent, b fill, a coverage
uniform sampler2D tNormal;  // xyz view normal, a object id
uniform sampler2D tDepth;
uniform vec2 uResolution;   // drawing-buffer pixels
uniform float uDpr;
uniform float uNear;
uniform float uFar;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec3 uAccent;
uniform float uInvert;      // 0 paper surfaces + ink lines, 1 the reverse
uniform float uBgInvert;    // background: 0 paper, 1 ink
uniform float uGlitch;      // horizontal slice displacement
uniform float uBoil;        // hand-drawn line jitter, in CSS px
uniform float uTime;
in vec2 vUv;
out vec4 fragColor;

float linearDepth(float d) {
  float z = d * 2.0 - 1.0;
  return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear));
}

float edgeSample(vec2 uv, vec4 c0, vec4 n0, float d0) {
  vec4 c = texture(tColor, uv);
  vec4 n = texture(tNormal, uv);
  float d = linearDepth(texture(tDepth, uv).r);
  float both = c.a * c0.a;
  float silhouette = abs(c.a - c0.a);
  float idEdge = step(0.003, abs(n.a - n0.a)) * both;
  float crease = (1.0 - dot(n.xyz * 2.0 - 1.0, n0.xyz * 2.0 - 1.0)) * both;
  float depthEdge = abs(d - d0) / max(min(d, d0), 0.001) * both;
  return max(max(silhouette, idEdge), max(smoothstep(0.3, 0.7, crease), smoothstep(0.015, 0.04, depthEdge)));
}

mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

float halftone(vec2 sp, float darkness) {
  vec2 p = rot(0.785398) * sp;
  vec2 g = fract(p / 5.0) - 0.5;
  float r = sqrt(clamp((darkness - 0.22) / 0.78, 0.0, 1.0)) * 0.6;
  float aa = 0.12;
  return (1.0 - smoothstep(r - aa, r + aa, length(g))) * step(0.001, r);
}

float hatch(vec2 sp, float darkness, float angle, float from) {
  float w = smoothstep(from, from + 0.25, darkness) * 0.38;
  vec2 p = rot(angle) * sp;
  float h = abs(fract(p.y / 4.5) - 0.5) * 2.0;
  return (1.0 - smoothstep(w - 0.18, w + 0.18, h)) * step(0.001, w);
}

void main() {
  vec2 px = 1.0 / uResolution;
  vec2 uv = vUv;
  float frame = floor(uTime * 12.0);

  if (uGlitch > 0.0) {
    float band = floor(uv.y * 28.0);
    float r = hash12(vec2(band, frame));
    if (r < uGlitch * 0.7) uv.x += (hash12(vec2(frame, band)) - 0.5) * 0.12 * uGlitch;
  }

  vec2 jitter = (vec2(vnoise(uv * 6.0 + frame * 1.37), vnoise(uv * 6.0 + frame * 2.11 + 19.0)) - 0.5)
    * 2.0 * uBoil * uDpr * px;
  vec2 suv = uv + jitter;

  vec4 c = texture(tColor, suv);
  vec4 n = texture(tNormal, suv);
  float d = linearDepth(texture(tDepth, suv).r);

  float edge = 0.0;
  float accentEdge = c.g;
  vec2 o1 = px * uDpr;            // inner creases: ~1 CSS px
  vec2 o2 = px * uDpr * 1.8;      // silhouettes read a little heavier
  vec2 dirs[4] = vec2[4](vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(0.7, 0.7), vec2(0.7, -0.7));
  for (int i = 0; i < 4; i++) {
    edge = max(edge, edgeSample(suv + dirs[i] * o1, c, n, d));
    edge = max(edge, edgeSample(suv - dirs[i] * o1, c, n, d));
    vec4 cs = texture(tColor, suv + dirs[i] * o2);
    vec4 cs2 = texture(tColor, suv - dirs[i] * o2);
    edge = max(edge, max(abs(cs.a - c.a), abs(cs2.a - c.a)));
    accentEdge = max(accentEdge, max(cs.g * cs.a, cs2.g * cs2.a));
  }

  vec3 surface = mix(uPaper, uInk, uInvert);
  vec3 line = mix(uInk, uPaper, uInvert);
  vec3 bg = mix(uPaper, uInk, uBgInvert);
  vec2 sp = gl_FragCoord.xy / uDpr;

  vec3 col = bg;
  if (c.a > 0.5) {
    float fill = c.b;
    vec3 mark = mix(line, uAccent, step(0.5, c.g));
    vec3 base = mix(surface, uAccent, c.g * 0.1);
    if (fill > 0.75) {
      col = mark;
    } else if (fill > 0.25) {
      // Flat paper: tone carries how much ink is printed on it. Below 0.42 the
      // paper ignores the inversion (a real sheet), above it follows the scene.
      bool sheet = fill < 0.42;
      vec3 paperCol = sheet ? mix(uPaper, uAccent, c.g * 0.1) : base;
      vec3 inkCol = sheet ? mix(uInk, uAccent, step(0.5, c.g)) : mark;
      col = mix(paperCol, inkCol, c.r);
    } else {
      float darkness = 1.0 - c.r;
      float ink = halftone(sp, darkness);
      ink = max(ink, hatch(sp, darkness, 0.785398, 0.55));
      ink = max(ink, hatch(sp, darkness, -0.785398, 0.78));
      col = mix(base, mark, ink);
    }
  }

  vec3 edgeCol = mix(line, uAccent, step(0.5, accentEdge));
  col = mix(col, edgeCol, clamp(edge, 0.0, 1.0));

  // Paper grain, re-seeded on the same 12fps clock as the line boil.
  col += (hash12(gl_FragCoord.xy + frame * 17.0) - 0.5) * 0.035;

  fragColor = vec4(col, 1.0);
}
`;
