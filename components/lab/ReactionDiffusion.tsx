"use client";

import { useEffect, useRef } from "react";
import { bindTex, pingPong, program, quad } from "./gl";

const H = "#version 300 es\nprecision highp float;\nin vec2 vUv;\nout vec4 o;\n";

// Gray–Scott: chemical A feeds in, B eats A and decays. .r = A, .g = B.
const STEP = `${H}
uniform sampler2D uState;
uniform vec2 uTexel;
uniform float uFeed, uKill;
uniform vec3 uSeed; // xy in uv, z radius (0 = none)
uniform float uAspect;
void main() {
  vec2 c = texture(uState, vUv).rg;
  vec2 lap = -c;
  lap += 0.2 * (texture(uState, vUv + vec2(uTexel.x, 0.0)).rg + texture(uState, vUv - vec2(uTexel.x, 0.0)).rg
              + texture(uState, vUv + vec2(0.0, uTexel.y)).rg + texture(uState, vUv - vec2(0.0, uTexel.y)).rg);
  lap += 0.05 * (texture(uState, vUv + uTexel).rg + texture(uState, vUv - uTexel).rg
              + texture(uState, vUv + vec2(uTexel.x, -uTexel.y)).rg + texture(uState, vUv - vec2(uTexel.x, -uTexel.y)).rg);
  float a = c.r, b = c.g;
  float reaction = a * b * b;
  a += 1.0 * lap.r - reaction + uFeed * (1.0 - a);
  b += 0.5 * lap.g + reaction - (uKill + uFeed) * b;
  if (uSeed.z > 0.0) {
    vec2 d = vUv - uSeed.xy;
    d.x *= uAspect;
    if (length(d) < uSeed.z) b = 1.0;
  }
  o = vec4(clamp(a, 0.0, 1.0), clamp(b, 0.0, 1.0), 0.0, 1.0);
}`;

const INIT = `${H}
uniform float uSeedRand;
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeedRand) * 43758.5453); }
void main() {
  vec2 cell = floor(vUv * 14.0);
  float b = h(cell) > 0.9 && length(fract(vUv * 14.0) - 0.5) < 0.25 ? 1.0 : 0.0;
  o = vec4(1.0, b, 0.0, 1.0);
}`;

// Contour the B field like an engraving: hatched bands, ink edges, accent on fronts.
const DISPLAY = `${H}
uniform sampler2D uState;
uniform vec2 uTexel;
uniform float uDpr;
void main() {
  float b = texture(uState, vUv).g;
  float bx = texture(uState, vUv + vec2(uTexel.x, 0.0)).g - texture(uState, vUv - vec2(uTexel.x, 0.0)).g;
  float by = texture(uState, vUv + vec2(0.0, uTexel.y)).g - texture(uState, vUv - vec2(0.0, uTexel.y)).g;
  float edge = smoothstep(0.05, 0.12, length(vec2(bx, by)));
  vec2 sp = gl_FragCoord.xy / uDpr;
  float hatch = step(0.5, fract((sp.x + sp.y) / 4.0));
  float fill = smoothstep(0.18, 0.3, b);
  vec3 paper = vec3(0.945, 0.929, 0.894);
  vec3 ink = vec3(0.078);
  vec3 accent = vec3(0.91, 0.25, 0.165);
  vec3 col = mix(paper, ink, fill * mix(0.55, 1.0, hatch));
  col = mix(col, accent, edge * (1.0 - fill * 0.6));
  o = vec4(col, 1.0);
}`;

export const RD_PRESETS = {
  coral: { feed: 0.0545, kill: 0.062 },
  maze: { feed: 0.029, kill: 0.057 },
  spots: { feed: 0.035, kill: 0.065 },
  waves: { feed: 0.014, kill: 0.054 },
} as const;
export type RdPreset = keyof typeof RD_PRESETS;

/** Click to seed; patterns grow like coral, mazes or fingerprints. */
export function ReactionDiffusion({ preset, resetKey, paused }: { preset: RdPreset; resetKey: number; paused?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ preset, paused });
  useEffect(() => {
    live.current = { preset, paused };
  }, [preset, paused]);

  useEffect(() => {
    const el = canvas.current;
    const gl = el?.getContext("webgl2", { antialias: false, alpha: false });
    if (!el || !gl || !gl.getExtension("EXT_color_buffer_float")) return;
    const dpr = Math.min(devicePixelRatio, 2);
    el.width = Math.floor(el.clientWidth * dpr);
    el.height = Math.floor(el.clientHeight * dpr);
    const aspect = el.width / el.height;
    const W = 360;
    const Hh = Math.round(W / aspect);
    const draw = quad(gl);
    const P = { step: program(gl, STEP), init: program(gl, INIT), show: program(gl, DISPLAY) };
    const state = pingPong(gl, W, Hh, true);

    gl.useProgram(P.init.p);
    gl.uniform1f(P.init.u("uSeedRand"), resetKey * 1.37);
    draw(state.write);
    state.swap();

    const seeds: [number, number][] = [];
    let dragging = false;
    const add = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      seeds.push([(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height]);
    };
    const down = (e: PointerEvent) => {
      dragging = true;
      add(e);
    };
    const move = (e: PointerEvent) => dragging && add(e);
    const up = () => (dragging = false);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (live.current.paused) return;
      const { feed, kill } = RD_PRESETS[live.current.preset];
      gl.useProgram(P.step.p);
      gl.uniform2f(P.step.u("uTexel"), 1 / W, 1 / Hh);
      gl.uniform1f(P.step.u("uFeed"), feed);
      gl.uniform1f(P.step.u("uKill"), kill);
      gl.uniform1f(P.step.u("uAspect"), aspect);
      for (let i = 0; i < 14; i++) {
        const seed = i === 0 ? seeds.shift() : undefined;
        gl.uniform3f(P.step.u("uSeed"), seed?.[0] ?? 0, seed?.[1] ?? 0, seed ? 0.018 : 0);
        bindTex(gl, P.step.u("uState"), state.read.tex, 0);
        draw(state.write);
        state.swap();
      }
      gl.useProgram(P.show.p);
      gl.uniform2f(P.show.u("uTexel"), 1 / W, 1 / Hh);
      gl.uniform1f(P.show.u("uDpr"), dpr);
      bindTex(gl, P.show.u("uState"), state.read.tex, 0);
      draw(null);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      // Don't lose the context here: StrictMode remounts reuse this same canvas.
    };
  }, [resetKey]);

  return <canvas ref={canvas} className="block h-full w-full touch-none" data-cursor="SEED" />;
}
