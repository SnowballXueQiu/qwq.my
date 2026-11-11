import {
  BufferGeometry,
  CapsuleGeometry,
  CatmullRomCurve3,
  QuadraticBezierCurve3,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
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
  const pupil = new SphereGeometry(0.4, 28, 20).scale(1, 1, 0.55);
  const highlight = new SphereGeometry(0.12, 12, 10);

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
  const mouthA = new TubeGeometry(
    new CatmullRomCurve3([v(0, 0.3), v(0.3, -0.12), v(0.42, -0.42), v(0, -0.5), v(-0.42, -0.42), v(-0.3, -0.12)], true, "catmullrom", 0.4),
    64,
    0.15,
    12,
    true,
  );
  const shape = new Shape();
  shape.moveTo(0, 0.3);
  shape.bezierCurveTo(0.32, -0.08, 0.5, -0.46, 0, -0.5);
  shape.bezierCurveTo(-0.5, -0.46, -0.32, -0.08, 0, 0.3);
  const mouthAFill = new ShapeGeometry(shape, 24).translate(0, 0, -0.05);

  const tear = new SphereGeometry(0.16, 14, 12).scale(1, 1.4, 1);
  const zee = stroke(polyline([v(-0.3, 0.3), v(0.3, 0.3), v(-0.3, -0.3), v(0.3, -0.3)], 0.05), 0.08, 40);

  return { ring, tail, pupil, highlight, caret, dash, chevron, spiral, mouthW, mouthOmega, mouthA, mouthAFill, tear, zee };
}

export type Glyphs = ReturnType<typeof createGlyphs>;
