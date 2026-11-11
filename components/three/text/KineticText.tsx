"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { Group, Vector3, Euler } from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { createInkMaterial } from "../materials/inkMaterial";
import { clamp01, withOverview } from "../frameState";
import { useFont, type FontName } from "./typeface";

type Letter = {
  geometry: TextGeometry;
  home: Vector3;
  from: Vector3;
  fromRot: Euler;
  away: Vector3;
  awayRot: Euler;
  accent: boolean;
};

export type KineticTextProps = Omit<ThreeElements["group"], "children"> & {
  text: string;
  font?: FontName;
  size?: number;
  depth?: number;
  /**
   * Called every frame. <0 hidden, 0→1 letters fly in and lock, 1→2 they
   * burst toward the camera and are gone.
   */
  progress: () => number;
  /** Which characters (by index) are drawn in the accent colour. */
  accent?: (index: number, char: string) => boolean;
  align?: "left" | "center" | "right";
  /** How far the letters are scattered before they assemble. */
  scatter?: number;
  seed?: number;
};

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Extruded type where every letter is its own mesh: they converge from a
 * scattered cloud into the word, hold, then shatter outward past the lens.
 */
export function KineticText({
  text,
  font: fontName = "display",
  size = 1,
  depth = 0.35,
  progress,
  accent,
  align = "center",
  scatter = 14,
  seed = 1,
  ...group
}: KineticTextProps) {
  const font = useFont(fontName);
  const root = useRef<Group>(null);

  const materials = useMemo(
    () => ({ base: createInkMaterial(), accent: createInkMaterial({ accent: 1 }) }),
    [],
  );

  const letters = useMemo<Letter[]>(() => {
    if (!font) return [];
    let s = seed * 9973;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const scale = size / font.data.resolution;
    const out: Letter[] = [];
    let pen = 0;
    [...text].forEach((ch, i) => {
      const glyph = font.data.glyphs[ch] ?? font.data.glyphs["?"];
      const advance = (glyph?.ha ?? font.data.resolution * 0.5) * scale;
      if (ch.trim()) {
        const geometry = new TextGeometry(ch, {
          font,
          size,
          depth,
          curveSegments: 5,
          bevelEnabled: true,
          bevelThickness: depth * 0.12,
          bevelSize: size * 0.012,
          bevelSegments: 1,
        });
        geometry.computeBoundingBox();
        const box = geometry.boundingBox!;
        const c = new Vector3();
        box.getCenter(c);
        geometry.translate(-c.x, -c.y, -c.z);
        const home = new Vector3(pen + c.x, c.y, 0);
        const dir = new Vector3(r() - 0.5, r() - 0.5, r() * 0.6 + 0.4).normalize();
        out.push({
          geometry,
          home,
          from: new Vector3((r() - 0.5) * scatter, (r() - 0.5) * scatter * 0.6, -r() * scatter * 1.6 - 2),
          fromRot: new Euler((r() - 0.5) * 6, (r() - 0.5) * 6, (r() - 0.5) * 6),
          away: dir.multiplyScalar(18 + r() * 22),
          awayRot: new Euler((r() - 0.5) * 9, (r() - 0.5) * 9, (r() - 0.5) * 9),
          accent: accent?.(i, ch) ?? false,
        });
      }
      pen += advance;
    });
    const shift = align === "center" ? -pen / 2 : align === "right" ? -pen : 0;
    out.forEach((l) => (l.home.x += shift));
    return out;
    // `accent` is a render-time predicate; letters only rebuild when the text or font changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [font, text, size, depth, align, scatter, seed]);

  useEffect(() => () => letters.forEach((l) => l.geometry.dispose()), [letters]);
  useEffect(
    () => () => {
      materials.base.dispose();
      materials.accent.dispose();
    },
    [materials],
  );

  useFrame(() => {
    const g = root.current;
    if (!g) return;
    const p = withOverview(progress());
    g.visible = p > 0 && p < 2;
    if (!g.visible) return;
    const n = Math.max(letters.length, 1);
    g.children.forEach((child, i) => {
      const l = letters[i];
      if (!l) return;
      const lag = (i / n) * 0.35;
      const a = easeOut(clamp01((p - lag) / 0.65));
      const out = clamp01((p - 1 - lag * 0.6) / 0.6);
      const o = out * out;
      child.position.lerpVectors(l.from, l.home, a).addScaledVector(l.away, o);
      child.rotation.set(
        l.fromRot.x * (1 - a) + l.awayRot.x * o,
        l.fromRot.y * (1 - a) + l.awayRot.y * o,
        l.fromRot.z * (1 - a) + l.awayRot.z * o,
      );
      child.visible = a > 0.001 && out < 1;
    });
  });

  return (
    <group ref={root} {...group}>
      {letters.map((l, i) => (
        <mesh key={i} geometry={l.geometry} material={l.accent ? materials.accent : materials.base} />
      ))}
    </group>
  );
}
