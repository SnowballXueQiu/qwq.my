import {
  BufferGeometry,
  CapsuleGeometry,
  CatmullRomCurve3,
  LatheGeometry,
  QuadraticBezierCurve3,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type Curve,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Kaomoji glyph geometry for the mascot, in "eye units" (eye ring radius = 1).
 * Strokes are tubes with spherical caps so every glyph reads as one drawn line.
 */

const v = (x: number, y: number, z = 0) => new Vector3(x, y, z);

function stroke(curve: Curve<Vector3>, radius: number, segments = 48, closed = false) {
  const tube = new TubeGeometry(curve, segments, radius, 12, closed);
  if (closed) return tube;
  const a = new SphereGeometry(radius, 12, 10).translate(...curve.getPoint(0).toArray());
  const b = new SphereGeometry(radius, 12, 10).translate(...curve.getPoint(1).toArray());
  // Tube has an index; spheres do too — merge needs matching attributes.
  return mergeGeometries([tube, a, b]) as BufferGeometry;
}

const polyline = (points: Vector3[], tension = 0.5) => new CatmullRomCurve3(points, false, "catmullrom", tension);

export const STROKE = 0.27;

export function createGlyphs() {
  const ring = new TorusGeometry(1, STROKE, 20, 72);
  const tail = stroke(new QuadraticBezierCurve3(v(0.7, -0.7), v(0.95, -1.18), v(1.4, -1.34)), STROKE * 0.92, 24);
  // Small, glossy pupils read as cute; big dark ones read as eyeballs.
  const pupil = new SphereGeometry(0.29, 28, 20).scale(1, 1.08, 0.55);
  const highlight = new SphereGeometry(0.1, 12, 10);
  const sparkle = new SphereGeometry(0.045, 8, 6);
  const blush = new SphereGeometry(0.26, 20, 12).scale(1, 0.45, 0.2);

  const caretPoints = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI * (0.92 - (i / 8) * 0.84);
    return v(Math.cos(a) * 0.82, Math.sin(a) * 0.82 - 0.38);
  });
  const caret = stroke(polyline(caretPoints), STROKE, 40);

  const dash = new CapsuleGeometry(STROKE, 1.5, 8, 16).rotateZ(Math.PI / 2);

  const chevron = stroke(
    polyline([v(-0.55, 0.62), v(0.3, 0.12), v(0.58, 0), v(0.3, -0.12), v(-0.55, -0.62)], 0.2),
    STROKE,
    40,
  );

  const spiralPoints = Array.from({ length: 64 }, (_, i) => {
    const t = i / 63;
    const a = t * Math.PI * 2 * 2.3;
    const r = 0.12 + t * 0.78;
    return v(Math.cos(a) * r, Math.sin(a) * r);
  });
  const spiral = stroke(polyline(spiralPoints), STROKE * 0.6, 160);

  const mouthW = stroke(
    polyline([v(-0.66, 0.12), v(-0.48, -0.26), v(-0.3, -0.38), v(-0.12, -0.2), v(0, -0.06), v(0.12, -0.2), v(0.3, -0.38), v(0.48, -0.26), v(0.66, 0.12)]),
    0.16,
    64,
  );
  const mouthOmega = stroke(
    polyline([v(-0.78, 0.18), v(-0.66, -0.3), v(-0.38, -0.46), v(-0.12, -0.3), v(0, -0.1), v(0.12, -0.3), v(0.38, -0.46), v(0.66, -0.3), v(0.78, 0.18)]),
    0.17,
    72,
  );
  // QAQ: a small pouting frown, drawn with the same pen as the w.
  const frownPoints = Array.from({ length: 9 }, (_, i) => {
    const x = -0.46 + (i / 8) * 0.92;
    return v(x, -0.12 - 0.3 * (x / 0.46) ** 2 + 0.16);
  });
  const mouthFrown = stroke(polyline(frownPoints), 0.15, 40);
  // Worried brows, inner ends raised (placed and tilted per side by the face).
  const brow = stroke(new QuadraticBezierCurve3(v(-0.42, 0), v(0, 0.12), v(0.42, 0)), STROKE * 0.62, 24);

  // A waving "ﾉ" hand, pivoting from its lower end.
  const hand = stroke(polyline([v(0, 0), v(0.12, 0.5), v(0.42, 0.95), v(0.7, 1.15)]), STROKE * 0.9, 32);

  // A teardrop: round below, drawn to a point on top.
  const tear = new LatheGeometry(
    Array.from({ length: 17 }, (_, i) => {
      const t = Math.PI - (i / 16) * Math.PI;
      return new Vector2(Math.max(Math.sin(t) * Math.sin(t / 2) ** 1.3 * 0.2, 0.0001), Math.cos(t) * 0.26);
    }),
    18,
  ).scale(1, 1, 0.6);
  const zee = stroke(polyline([v(-0.3, 0.3), v(0.3, 0.3), v(-0.3, -0.3), v(0.3, -0.3)], 0.05), 0.08, 40);

  return { ring, tail, pupil, highlight, sparkle, blush, caret, dash, chevron, spiral, mouthW, mouthOmega, mouthFrown, brow, hand, tear, zee };
}

export type Glyphs = ReturnType<typeof createGlyphs>;
