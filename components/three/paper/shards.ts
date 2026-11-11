import { Delaunay } from "d3-delaunay";
import { BufferAttribute, BufferGeometry } from "three";

/** Small deterministic PRNG so the tear pattern is the same on every visit. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A sheet of paper pre-cut into Voronoi shards, as one non-indexed geometry.
 * Each vertex carries its shard's centre, a random triple and a delay (0 at
 * `focus`, 1 at the farthest corner) so the vertex shader can tear it apart.
 */
export function buildShardGeometry(
  width: number,
  height: number,
  focus: [number, number],
  { count = 170, thickness = 0.035, seed = 7 } = {},
) {
  const rand = mulberry32(seed);
  const hw = width / 2;
  const hh = height / 2;
  const points: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    if (i < count * 0.45) {
      // Finer shards around the focus, where the tear starts.
      const r = Math.sqrt(-2 * Math.log(Math.max(rand(), 1e-6))) * width * 0.1;
      const a = rand() * Math.PI * 2;
      points.push([
        Math.min(hw, Math.max(-hw, focus[0] + Math.cos(a) * r)),
        Math.min(hh, Math.max(-hh, focus[1] + Math.sin(a) * r)),
      ]);
    } else {
      points.push([(rand() * 2 - 1) * hw, (rand() * 2 - 1) * hh]);
    }
  }

  const voronoi = Delaunay.from(points).voronoi([-hw, -hh, hw, hh]);
  const maxDist = Math.max(
    ...[[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh]].map(([x, y]) => Math.hypot(x - focus[0], y - focus[1])),
  );

  const pos: number[] = [];
  const nrm: number[] = [];
  const center: number[] = [];
  const rnd: number[] = [];
  const delay: number[] = [];
  const zf = thickness / 2;

  for (let i = 0; i < points.length; i++) {
    const poly = voronoi.cellPolygon(i);
    if (!poly) continue;
    let verts = poly.slice(0, -1) as [number, number][];
    // Make the outline counter-clockwise in a y-up world so front faces face +z.
    const area = verts.reduce((acc, [x, y], k) => {
      const [nx, ny] = verts[(k + 1) % verts.length];
      return acc + x * ny - nx * y;
    }, 0);
    if (area < 0) verts = verts.reverse();

    const cx = verts.reduce((a, v) => a + v[0], 0) / verts.length;
    const cy = verts.reduce((a, v) => a + v[1], 0) / verts.length;
    const r = [rand(), rand(), rand()];
    const d = Math.min(1, Math.hypot(cx - focus[0], cy - focus[1]) / maxDist + rand() * 0.05);

    const push = (x: number, y: number, z: number, n: [number, number, number]) => {
      pos.push(x, y, z);
      nrm.push(...n);
      center.push(cx, cy, 0);
      rnd.push(...r);
      delay.push(d);
    };

    for (let k = 0; k < verts.length; k++) {
      const a = verts[k];
      const b = verts[(k + 1) % verts.length];
      push(cx, cy, zf, [0, 0, 1]);
      push(a[0], a[1], zf, [0, 0, 1]);
      push(b[0], b[1], zf, [0, 0, 1]);

      push(cx, cy, -zf, [0, 0, -1]);
      push(b[0], b[1], -zf, [0, 0, -1]);
      push(a[0], a[1], -zf, [0, 0, -1]);

      const ex = b[0] - a[0];
      const ey = b[1] - a[1];
      const len = Math.hypot(ex, ey) || 1;
      const n: [number, number, number] = [ey / len, -ex / len, 0];
      // Walls stop just short of the faces; if their rims sat exactly on the
      // seams they would z-fight the faces and the composite would ink them.
      const zw = zf * 0.85;
      push(a[0], a[1], -zw, n);
      push(b[0], b[1], -zw, n);
      push(b[0], b[1], zw, n);
      push(a[0], a[1], -zw, n);
      push(b[0], b[1], zw, n);
      push(a[0], a[1], zw, n);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(nrm), 3));
  geometry.setAttribute("aCenter", new BufferAttribute(new Float32Array(center), 3));
  geometry.setAttribute("aRand", new BufferAttribute(new Float32Array(rnd), 3));
  geometry.setAttribute("aDelay", new BufferAttribute(new Float32Array(delay), 1));
  geometry.computeBoundingSphere();
  return geometry;
}
