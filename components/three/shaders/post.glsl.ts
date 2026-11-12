import { noise } from "./noise.glsl";

/**
 * Lens and film after the ink composite: CRT barrel + scanlines, radial RGB
 * split, warp-speed streaks, an ink shockwave ripple and a vignette.
 */
export const postFragment = /* glsl */ `
precision highp float;
${noise}

uniform sampler2D tScene;
uniform vec2 uResolution;
uniform float uDpr;
uniform float uTime;
uniform float uAberration;  // 0–1
uniform float uCRT;         // 0–1 barrel + scanlines
uniform float uSpeed;       // 0–1 warp streaks
uniform float uVignette;
uniform vec3 uLine;         // streak colour (follows paper/ink inversion)
uniform vec2 uShockCenter;  // uv
uniform float uShockAge;    // seconds since the click, <0 = none
uniform vec3 uAccent;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec2 uv = vUv;
  vec2 c = uv - 0.5;
  c.x *= uResolution.x / uResolution.y;

  // Ink shockwave: a ring pushing pixels outward from where you clicked.
  float shockRing = 0.0;
  if (uShockAge >= 0.0 && uShockAge < 1.2) {
    vec2 d = uv - uShockCenter;
    d.x *= uResolution.x / uResolution.y;
    float dist = length(d);
    float radius = 1.0 - pow(1.0 - uShockAge / 1.2, 3.0);
    float fade = 1.0 - uShockAge / 1.2;
    float ring = exp(-pow((dist - radius * 0.9) * 18.0, 2.0)) * fade;
    uv -= normalize(d + 1e-5) * ring * 0.07 * vec2(uResolution.y / uResolution.x, 1.0);
    shockRing = exp(-pow((dist - radius * 0.9) * 140.0, 2.0)) * fade;
  }

  // Barrel distortion that bulges with the CRT amount.
  vec2 bc = uv - 0.5;
  float r2 = dot(bc, bc);
  uv = 0.5 + bc * (1.0 + uCRT * (0.16 * r2 - 0.03));

  vec2 split = (uv - 0.5) * (uAberration * 0.018 + uSpeed * 0.01);
  vec3 col = vec3(
    texture(tScene, uv + split).r,
    texture(tScene, uv).g,
    texture(tScene, uv - split).b);

  // Warp streaks radiating from the vanishing point.
  if (uSpeed > 0.01) {
    float ang = atan(c.y, c.x);
    float lane = floor((ang + 3.14159) * 60.0);
    float flick = floor(uTime * 18.0);
    float pick = step(0.78, hash12(vec2(lane, flick)));
    float len = length(c);
    float reach = mix(0.9, 0.25, hash12(vec2(lane, flick + 7.0)) * uSpeed);
    float streak = pick * smoothstep(reach, reach + 0.25, len) * (1.0 - smoothstep(0.98, 1.2, len));
    float thin = 1.0 - smoothstep(0.0, 0.35, abs(fract((ang + 3.14159) * 60.0) - 0.5) * 2.0);
    col = mix(col, uLine, streak * thin * min(uSpeed * 1.4, 1.0));
  }

  // Scanlines and a soft roll bar while the tube is "on".
  float scan = 0.5 + 0.5 * sin(gl_FragCoord.y / uDpr * 3.14159);
  float roll = smoothstep(0.0, 0.1, 0.1 - abs(fract(vUv.y * 0.7 - uTime * 0.6) - 0.5));
  col *= 1.0 - uCRT * (0.22 * scan - roll * 0.15);

  col = mix(col, uAccent, shockRing);
  col *= 1.0 - uVignette * smoothstep(0.45, 1.05, length(c));
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) col = vec3(0.0);
  fragColor = vec4(col, 1.0);
}
`;
