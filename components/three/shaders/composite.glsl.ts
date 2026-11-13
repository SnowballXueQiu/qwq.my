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
uniform float uView;        // 0 the drawing; 1–8 one G-buffer channel or stage (terminal: gbuffer)
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
  // Glitch bands re-roll quickly; nothing else in the frame is stepped, so motion stays fluid.
  float frame = floor(uTime * 30.0);

  if (uGlitch > 0.0) {
    float band = floor(uv.y * 28.0);
    float r = hash12(vec2(band, frame));
    if (r < uGlitch * 0.7) uv.x += (hash12(vec2(frame, band)) - 0.5) * 0.12 * uGlitch;
  }

  // A slow, continuous wobble in the line work (was a 12fps "boil", which read as stutter).
  vec2 jitter = (vec2(vnoise(uv * 6.0 + uTime * 0.6), vnoise(uv * 6.0 + uTime * 0.45 + 19.0)) - 0.5)
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

    // Paper grain is part of the paper: fixed, not re-seeded every few frames.
  col += (hash12(gl_FragCoord.xy) - 0.5) * 0.03;

  // What the composite reads, one channel at a time (the terminal's \`gbuffer\` command).
  int view = int(uView + 0.5);
  if (view > 0) {
    bool on = c.a > 0.5;
    vec3 v = uPaper;
    if (view == 1 && on) v = mix(uInk, uPaper, c.r);                       // tone
    if (view == 2 && on) v = mix(vec3(0.82, 0.8, 0.76), uAccent, step(0.5, c.g)); // accent
    if (view == 3 && on) v = mix(uPaper * 0.85, uInk, c.b);                // fill
    if (view == 4 && on) v = n.xyz;                                         // normals
    if (view == 5 && on) v = 0.35 + 0.6 * vec3(hash12(vec2(n.a * 251.0, 1.0)), hash12(vec2(n.a * 251.0, 7.0)), hash12(vec2(n.a * 251.0, 13.0))); // ids
    if (view == 6 && on) {                                                  // depth: log scale + a contour every 0.2 units
      v = mix(uInk, uPaper, clamp(log(d / 4.0) / log(16.0), 0.0, 1.0));
      v = mix(v, uAccent, smoothstep(0.86, 1.0, fract(d * 5.0)) * 0.55);
    }
    if (view == 7) v = mix(uPaper, uInk, clamp(edge, 0.0, 1.0));            // lines only
    if (view == 8 && on && c.b < 0.25) {                                    // dots and hatching only
      float dk = 1.0 - c.r;
      float ink = max(halftone(sp, dk), max(hatch(sp, dk, 0.785398, 0.55), hatch(sp, dk, -0.785398, 0.78)));
      v = mix(uPaper, uInk, ink);
    }
    col = v;
  }

  fragColor = vec4(col, 1.0);
}
`;
