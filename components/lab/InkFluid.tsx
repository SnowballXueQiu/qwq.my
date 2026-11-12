"use client";

import { useEffect, useRef } from "react";
import { bindTex, pingPong, program, quad, target } from "./gl";

const H = "#version 300 es\nprecision highp float;\nin vec2 vUv;\nout vec4 o;\n";

const ADVECT = `${H}
uniform sampler2D uVelocity, uSource;
uniform vec2 uTexel;
uniform float uDt, uDissipation;
void main() {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uTexel;
  o = uDissipation * texture(uSource, coord);
}`;

const SPLAT = `${H}
uniform sampler2D uTarget;
uniform vec2 uPoint;
uniform vec3 uColor;
uniform float uRadius, uAspect;
void main() {
  vec2 p = vUv - uPoint;
  p.x *= uAspect;
  o = vec4(texture(uTarget, vUv).xyz + exp(-dot(p, p) / uRadius) * uColor, 1.0);
}`;

const CURL = `${H}
uniform sampler2D uVelocity;
uniform vec2 uTexel;
void main() {
  float l = texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
  float r = texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
  float b = texture(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
  float t = texture(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
  o = vec4(0.5 * (r - l - t + b), 0.0, 0.0, 1.0);
}`;

const VORTICITY = `${H}
uniform sampler2D uVelocity, uCurl;
uniform vec2 uTexel;
uniform float uCurlStrength, uDt;
void main() {
  float l = texture(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
  float b = texture(uCurl, vUv - vec2(0.0, uTexel.y)).x;
  float t = texture(uCurl, vUv + vec2(0.0, uTexel.y)).x;
  float c = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(t) - abs(b), abs(r) - abs(l));
  force /= length(force) + 1e-4;
  force *= uCurlStrength * c;
  force.y *= -1.0;
  o = vec4(texture(uVelocity, vUv).xy + force * uDt, 0.0, 1.0);
}`;

const DIVERGENCE = `${H}
uniform sampler2D uVelocity;
uniform vec2 uTexel;
void main() {
  float l = texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
  float b = texture(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
  float t = texture(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
  o = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
}`;

const PRESSURE = `${H}
uniform sampler2D uPressure, uDivergence;
uniform vec2 uTexel;
void main() {
  float l = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float b = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float t = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  o = vec4((l + r + b + t - texture(uDivergence, vUv).x) * 0.25, 0.0, 0.0, 1.0);
}`;

const GRADIENT = `${H}
uniform sampler2D uPressure, uVelocity;
uniform vec2 uTexel;
void main() {
  float l = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float b = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float t = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  o = vec4(texture(uVelocity, vUv).xy - vec2(r - l, t - b), 0.0, 1.0);
}`;

// Dye .r is ink, .g is red pencil. Drawn as halftone on paper, like the site.
const DISPLAY = `${H}
uniform sampler2D uDye, uVelocity;
uniform vec2 uRes;
uniform float uDpr;
void main() {
  vec4 d = texture(uDye, vUv);
  float ink = clamp(d.r, 0.0, 1.0);
  float red = clamp(d.g, 0.0, 1.0);
  vec2 sp = gl_FragCoord.xy / uDpr;
  mat2 rot = mat2(0.7071, -0.7071, 0.7071, 0.7071);
  vec2 g = fract(rot * sp / 6.0) - 0.5;
  float r = sqrt(max(ink, red)) * 0.62;
  float dot_ = 1.0 - smoothstep(r - 0.08, r + 0.08, length(g));
  float solid = smoothstep(0.75, 0.95, max(ink, red));
  float mark = max(dot_, solid);
  vec3 paper = vec3(0.945, 0.929, 0.894);
  vec3 inkC = vec3(0.078);
  vec3 accent = vec3(0.91, 0.25, 0.165);
  vec3 col = mix(paper, red > ink ? accent : inkC, mark);
  float speed = length(texture(uVelocity, vUv).xy);
  col = mix(col, accent, smoothstep(0.6, 2.4, speed) * mark * 0.6);
  o = vec4(col, 1.0);
}`;

/** Stir the ink: a GPU stable-fluids solver drawn as halftone on paper. */
export function InkFluid({ paused }: { paused?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const el = canvas.current;
    const gl = el?.getContext("webgl2", { antialias: false, alpha: false });
    if (!el || !gl || !gl.getExtension("EXT_color_buffer_float")) return;

    const dpr = Math.min(devicePixelRatio, 2);
    const resize = () => {
      el.width = Math.floor(el.clientWidth * dpr);
      el.height = Math.floor(el.clientHeight * dpr);
    };
    resize();
    const aspect = () => el.width / el.height;
    const simW = 160;
    const simH = Math.round(simW / aspect());
    const dyeW = 720;
    const dyeH = Math.round(dyeW / aspect());

    const draw = quad(gl);
    const P = {
      advect: program(gl, ADVECT),
      splat: program(gl, SPLAT),
      curl: program(gl, CURL),
      vort: program(gl, VORTICITY),
      div: program(gl, DIVERGENCE),
      pres: program(gl, PRESSURE),
      grad: program(gl, GRADIENT),
      show: program(gl, DISPLAY),
    };
    const velocity = pingPong(gl, simW, simH);
    const dye = pingPong(gl, dyeW, dyeH);
    const pressure = pingPong(gl, simW, simH, false);
    const divergence = target(gl, simW, simH, false);
    const curl = target(gl, simW, simH, false);
    const simTexel = [1 / simW, 1 / simH] as const;

    const splat = (x: number, y: number, dx: number, dy: number, red: boolean) => {
      gl.useProgram(P.splat.p);
      gl.uniform2f(P.splat.u("uPoint"), x, y);
      gl.uniform1f(P.splat.u("uAspect"), aspect());
      gl.uniform1f(P.splat.u("uRadius"), 0.0012);
      bindTex(gl, P.splat.u("uTarget"), velocity.read.tex, 0);
      gl.uniform3f(P.splat.u("uColor"), dx, dy, 0);
      draw(velocity.write);
      velocity.swap();
      bindTex(gl, P.splat.u("uTarget"), dye.read.tex, 0);
      gl.uniform1f(P.splat.u("uRadius"), 0.0032);
      gl.uniform3f(P.splat.u("uColor"), red ? 0 : 1.6, red ? 1.6 : 0, 0);
      draw(dye.write);
      dye.swap();
    };

    // A few strokes so the sheet isn't blank.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      splat(0.5 + Math.cos(a) * 0.2, 0.5 + Math.sin(a) * 0.2, -Math.sin(a) * 600, Math.cos(a) * 600, i % 3 === 0);
    }

    let last: { x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) {
        last = null;
        return;
      }
      if (last) splat(x, y, (x - last.x) * 6000, (y - last.y) * 6000, e.shiftKey || e.buttons === 1);
      last = { x, y };
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", () => (last = null));

    let raf = 0;
    let prev = performance.now();
    const step = () => {
      raf = requestAnimationFrame(step);
      const now = performance.now();
      const dt = Math.min((now - prev) / 1000, 1 / 30);
      prev = now;
      if (pausedRef.current) return;

      gl.useProgram(P.curl.p);
      gl.uniform2f(P.curl.u("uTexel"), ...simTexel);
      bindTex(gl, P.curl.u("uVelocity"), velocity.read.tex, 0);
      draw(curl);

      gl.useProgram(P.vort.p);
      gl.uniform2f(P.vort.u("uTexel"), ...simTexel);
      gl.uniform1f(P.vort.u("uCurlStrength"), 28);
      gl.uniform1f(P.vort.u("uDt"), dt);
      bindTex(gl, P.vort.u("uVelocity"), velocity.read.tex, 0);
      bindTex(gl, P.vort.u("uCurl"), curl.tex, 1);
      draw(velocity.write);
      velocity.swap();

      gl.useProgram(P.div.p);
      gl.uniform2f(P.div.u("uTexel"), ...simTexel);
      bindTex(gl, P.div.u("uVelocity"), velocity.read.tex, 0);
      draw(divergence);

      gl.useProgram(P.pres.p);
      gl.uniform2f(P.pres.u("uTexel"), ...simTexel);
      bindTex(gl, P.pres.u("uDivergence"), divergence.tex, 1);
      for (let i = 0; i < 20; i++) {
        bindTex(gl, P.pres.u("uPressure"), pressure.read.tex, 0);
        draw(pressure.write);
        pressure.swap();
      }

      gl.useProgram(P.grad.p);
      gl.uniform2f(P.grad.u("uTexel"), ...simTexel);
      bindTex(gl, P.grad.u("uPressure"), pressure.read.tex, 0);
      bindTex(gl, P.grad.u("uVelocity"), velocity.read.tex, 1);
      draw(velocity.write);
      velocity.swap();

      gl.useProgram(P.advect.p);
      gl.uniform2f(P.advect.u("uTexel"), ...simTexel);
      gl.uniform1f(P.advect.u("uDt"), dt);
      gl.uniform1f(P.advect.u("uDissipation"), 0.995);
      bindTex(gl, P.advect.u("uVelocity"), velocity.read.tex, 0);
      bindTex(gl, P.advect.u("uSource"), velocity.read.tex, 1);
      draw(velocity.write);
      velocity.swap();
      gl.uniform1f(P.advect.u("uDissipation"), 0.997);
      bindTex(gl, P.advect.u("uVelocity"), velocity.read.tex, 0);
      bindTex(gl, P.advect.u("uSource"), dye.read.tex, 1);
      draw(dye.write);
      dye.swap();

      gl.useProgram(P.show.p);
      gl.uniform2f(P.show.u("uRes"), el.width, el.height);
      gl.uniform1f(P.show.u("uDpr"), dpr);
      bindTex(gl, P.show.u("uDye"), dye.read.tex, 0);
      bindTex(gl, P.show.u("uVelocity"), velocity.read.tex, 1);
      draw(null);
    };
    raf = requestAnimationFrame(step);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      // Don't lose the context here: StrictMode remounts reuse this same canvas.
    };
  }, []);

  return <canvas ref={canvas} className="block h-full w-full touch-none" data-cursor="STIR" />;
}
