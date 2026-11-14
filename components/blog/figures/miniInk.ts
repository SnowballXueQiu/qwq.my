/**
 * A pocket version of the site's renderer, in plain JS, for the blog's
 * figures: a tiny ray-cast scene written into the same G-buffer channels, then
 * the same edge tests and the same halftone and hatching as composite.glsl.ts.
 */

export type GBuffer = {
  w: number;
  h: number;
  cov: Uint8Array;
  id: Uint8Array;
  depth: Float32Array;
  /** View-space normal, xyz interleaved. */
  normal: Float32Array;
};

type V = [number, number, number];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V): V => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// The cube's rotation (y then x), and its inverse to take rays into its space.
const ry = 0.7;
const rx = 0.45;
const toCube = (p: V): V => {
  const c1 = Math.cos(-ry), s1 = Math.sin(-ry), c2 = Math.cos(-rx), s2 = Math.sin(-rx);
  const x = p[0] * c1 + p[2] * s1;
  const z = -p[0] * s1 + p[2] * c1;
  return [x, p[1] * c2 - z * s2, p[1] * s2 + z * c2];
};
const fromCube = (p: V): V => {
  const c1 = Math.cos(ry), s1 = Math.sin(ry), c2 = Math.cos(rx), s2 = Math.sin(rx);
  const y = p[1] * c2 - p[2] * s2;
  const z = p[1] * s2 + p[2] * c2;
  return [p[0] * c1 + z * s1, y, -p[0] * s1 + z * c1];
};

const SPHERE = { c: [-0.62, 0.02, -3.2] as V, r: 0.62 };
const CUBE = { c: [0.6, 0.06, -3.55] as V, half: 0.5 };
const FLOOR_Y = -0.66;

/** Casts one ray per pixel: a sphere (id 1), a turned cube (id 2) and a floor (id 3). */
export function renderScene(w: number, h: number): GBuffer {
  const cov = new Uint8Array(w * h);
  const id = new Uint8Array(w * h);
  const depth = new Float32Array(w * h);
  const normal = new Float32Array(w * h * 3);
  const tanHalf = 0.42;
  const aspect = w / h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = ((x + 0.5) / w) * 2 - 1;
      const v = 1 - ((y + 0.5) / h) * 2;
      const d = norm([u * aspect * tanHalf, v * tanHalf + 0.06, -1]);
      let best = Infinity;
      let hitId = 0;
      let n: V = [0, 0, 1];
      // Sphere.
      const oc: V = [-SPHERE.c[0], -SPHERE.c[1], -SPHERE.c[2]];
      const b = dot(oc, d);
      const disc = b * b - (dot(oc, oc) - SPHERE.r * SPHERE.r);
      if (disc > 0) {
        const t = -b - Math.sqrt(disc);
        if (t > 0 && t < best) {
          best = t;
          hitId = 1;
          n = norm([d[0] * t - SPHERE.c[0], d[1] * t - SPHERE.c[1], d[2] * t - SPHERE.c[2]]);
        }
      }
      // Cube: slab test in its own space.
      const o = toCube([-CUBE.c[0], -CUBE.c[1], -CUBE.c[2]]);
      const dd = toCube(d);
      let tmin = -Infinity;
      let tmax = Infinity;
      let axis = 0;
      let sign = 1;
      for (let k = 0; k < 3; k++) {
        const inv = 1 / (dd[k] || 1e-9);
        let t1 = (-CUBE.half - o[k]) * inv;
        let t2 = (CUBE.half - o[k]) * inv;
        let s = -1;
        if (t1 > t2) {
          [t1, t2] = [t2, t1];
          s = 1;
        }
        if (t1 > tmin) {
          tmin = t1;
          axis = k;
          sign = s;
        }
        tmax = Math.min(tmax, t2);
      }
      if (tmin < tmax && tmin > 0 && tmin < best) {
        best = tmin;
        hitId = 2;
        const ln: V = [0, 0, 0];
        ln[axis] = sign;
        n = fromCube(ln);
      }
      // Floor, cut off at the sides and the back.
      if (d[1] < 0) {
        const t = FLOOR_Y / d[1];
        const px = d[0] * t;
        const pz = d[2] * t;
        if (t < best && Math.abs(px) < 2.4 && pz > -7.5) {
          best = t;
          hitId = 3;
          n = [0, 1, 0];
        }
      }
      const i = y * w + x;
      if (hitId) {
        cov[i] = 1;
        id[i] = hitId;
        depth[i] = -d[2] * best;
        normal[i * 3] = n[0];
        normal[i * 3 + 1] = n[1];
        normal[i * 3 + 2] = n[2];
      }
    }
  }
  return { w, h, cov, id, depth, normal };
}

/** Half-Lambert tone, with the drawing's light from the upper left by default. */
export function toneAt(g: GBuffer, i: number, light: V) {
  const L = norm(light);
  const nl = g.normal[i * 3] * L[0] + g.normal[i * 3 + 1] * L[1] + g.normal[i * 3 + 2] * L[2];
  return Math.min(1, Math.max(0, Math.pow(nl * 0.5 + 0.5, 1.35)));
}

export type EdgeMaps = { silhouette: Float32Array; id: Float32Array; crease: Float32Array; depth: Float32Array };

/**
 * The composite's edge tests, each kept separately so a figure can switch them
 * on and off: compare every pixel with its 8 neighbours (1 px away; coverage
 * also 2 px away, so silhouettes read heavier) and keep the strongest difference.
 *
 * The depth thresholds are tuned for a full screen (~900 rows). A coarser
 * buffer has a bigger depth step between neighbouring pixels on a slanted
 * floor, so they scale up with it: the same picture the site would draw.
 */
export function edgeMaps(g: GBuffer): EdgeMaps {
  const k = Math.max(1, 900 / g.h);
  const { w, h } = g;
  const out = {
    silhouette: new Float32Array(w * h),
    id: new Float32Array(w * h),
    crease: new Float32Array(w * h),
    depth: new Float32Array(w * h),
  };
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const c0 = g.cov[i];
      for (const [dx, dy] of dirs) {
        for (const s of [1, -1]) {
          for (const r of [1, 2]) {
            const nx = x + dx * s * r;
            const ny = y + dy * s * r;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const j = ny * w + nx;
            const sil = Math.abs(g.cov[j] - c0);
            out.silhouette[i] = Math.max(out.silhouette[i], sil);
            if (r === 2) continue;
            const both = g.cov[j] * c0;
            if (!both) continue;
            if (g.id[j] !== g.id[i]) out.id[i] = 1;
            const cr = 1 - (g.normal[j * 3] * g.normal[i * 3] + g.normal[j * 3 + 1] * g.normal[i * 3 + 1] + g.normal[j * 3 + 2] * g.normal[i * 3 + 2]);
            out.crease[i] = Math.max(out.crease[i], smoothstep(0.3, 0.7, cr));
            const rel = Math.abs(g.depth[j] - g.depth[i]) / Math.max(Math.min(g.depth[j], g.depth[i]), 1e-3);
            out.depth[i] = Math.max(out.depth[i], smoothstep(0.015 * k, 0.04 * k, rel));
          }
        }
      }
    }
  }
  return out;
}

const rot = (x: number, y: number, a: number): [number, number] => [Math.cos(a) * x - Math.sin(a) * y, Math.sin(a) * x + Math.cos(a) * y];
const fract = (x: number) => x - Math.floor(x);

/** composite.glsl.ts' halftone: a 5px dot grid at 45°, dot area growing with darkness above 0.22. */
export function halftone(x: number, y: number, darkness: number) {
  const [px, py] = rot(x, y, Math.PI / 4);
  const gx = fract(px / 5) - 0.5;
  const gy = fract(py / 5) - 0.5;
  const r = Math.sqrt(Math.min(1, Math.max(0, (darkness - 0.22) / 0.78))) * 0.6;
  if (r <= 0.001) return 0;
  return 1 - smoothstep(r - 0.12, r + 0.12, Math.hypot(gx, gy));
}

/** composite.glsl.ts' hatching: 4.5px lines at `angle`, appearing from darkness `from` and thickening. */
export function hatch(x: number, y: number, darkness: number, angle: number, from: number) {
  const w = smoothstep(from, from + 0.25, darkness) * 0.38;
  if (w <= 0.001) return 0;
  const [, py] = rot(x, y, angle);
  const hh = Math.abs(fract(py / 4.5) - 0.5) * 2;
  return 1 - smoothstep(w - 0.18, w + 0.18, hh);
}

export const PAPER: V = [241, 237, 228];
export const INK: V = [20, 20, 20];
export const ACCENT: V = [232, 64, 42];
export const mixRGB = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
