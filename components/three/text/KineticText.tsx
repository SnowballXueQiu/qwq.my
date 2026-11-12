"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { Euler, Group, Raycaster, Vector2, Vector3 } from "three";
import { impulsesSince } from "../interact/interaction";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { createInkMaterial } from "../materials/inkMaterial";
import { clamp01, withOverview } from "../frameState";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { useFont, type FontName } from "./typeface";

type Letter = {
  geometry: TextGeometry;
  home: Vector3;
  from: Vector3;
  fromRot: Euler;
  away: Vector3;
  awayRot: Euler;
  accent: boolean;
  /** Knock-about state: clicked letters fly off and spring back. */
  off: Vector3;
  vel: Vector3;
  wobble: Vector3;
  wobbleVel: Vector3;
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
  /** A preloaded typeface; skips the async load so letters exist on first render (video). */
  typeface?: Font;
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
  typeface,
  ...group
}: KineticTextProps) {
  const loaded = useFont(fontName);
  const font = typeface ?? loaded;
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
          off: new Vector3(),
          vel: new Vector3(),
          wobble: new Vector3(),
          wobbleVel: new Vector3(),
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

  const knock = useMemo(() => ({ ray: new Raycaster(), ndc: new Vector2(), seen: 0, local: new Vector3() }), []);

  useFrame((state, rawDt) => {
    const g = root.current;
    if (!g) return;
    const dt = Math.min(rawDt, 1 / 30);
    const p = withOverview(progress());
    g.visible = p > 0 && p < 2;
    const [blasts, seen] = impulsesSince(knock.seen);
    knock.seen = seen;
    if (!g.visible) return;

    // Clicks blast nearby letters outward on screen; a direct hit sends one flying.
    for (const b of blasts) {
      knock.ndc.set(b.x, b.y);
      knock.ray.setFromCamera(knock.ndc, state.camera);
      const hit = knock.ray.intersectObjects(g.children, false)[0];
      const inv = g.matrixWorld.clone().invert();
      g.children.forEach((child, i) => {
        const l = letters[i];
        if (!l) return;
        child.getWorldPosition(knock.local);
        knock.local.project(state.camera);
        const dx = knock.local.x - b.x;
        const dy = knock.local.y - b.y;
        const d = Math.hypot(dx, dy);
        const direct = hit?.object === child;
        if (!direct && d > 0.35) return;
        const f = direct ? 1 : (1 - d / 0.35) * 0.6;
        // Push in the camera plane away from the click, plus a kick away from the lens.
        knock.local.set(dx, dy, -0.6).normalize().transformDirection(state.camera.matrixWorld).transformDirection(inv);
        l.vel.addScaledVector(knock.local, 34 * size * f);
        l.wobbleVel.set((Math.random() - 0.5) * 30 * f, (Math.random() - 0.5) * 30 * f, (Math.random() - 0.5) * 24 * f);
      });
    }
    const n = Math.max(letters.length, 1);
    g.children.forEach((child, i) => {
      const l = letters[i];
      if (!l) return;
      const lag = (i / n) * 0.35;
      const a = easeOut(clamp01((p - lag) / 0.65));
      const out = clamp01((p - 1 - lag * 0.6) / 0.6);
      const o = out * out;
      // Springs: knocked letters overshoot and wobble back into the word.
      l.vel.addScaledVector(l.off, -60 * dt).multiplyScalar(Math.pow(0.02, dt));
      l.off.addScaledVector(l.vel, dt);
      l.wobbleVel.addScaledVector(l.wobble, -90 * dt).multiplyScalar(Math.pow(0.05, dt));
      l.wobble.addScaledVector(l.wobbleVel, dt);
      child.position.lerpVectors(l.from, l.home, a).addScaledVector(l.away, o).add(l.off);
      child.rotation.set(
        l.fromRot.x * (1 - a) + l.awayRot.x * o + l.wobble.x,
        l.fromRot.y * (1 - a) + l.awayRot.y * o + l.wobble.y,
        l.fromRot.z * (1 - a) + l.awayRot.z * o + l.wobble.z,
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
