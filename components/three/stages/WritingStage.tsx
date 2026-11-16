"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { fitScale } from "../framing";

import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, Group } from "three";
import { createInkMaterial, Fill } from "../materials/inkMaterial";
import { KineticText } from "../text/KineticText";
import { cue, frameState, withOverview } from "../frameState";
import { WORLD } from "../world";

const PAGE_W = 2.6;
const PAGE_H = 3.5;

// Fake typesetting: a title bar, then ragged lines of text.
const pageHead = /* glsl */ `
uniform float uSeed;
uniform float uLift;
`;
const pagePrint = /* glsl */ `
  vec2 p = vRest.xy + vec2(${(PAGE_W / 2).toFixed(2)}, ${(PAGE_H / 2).toFixed(2)});
  float row = floor((${PAGE_H.toFixed(2)} - p.y) / 0.16);
  float inRow = step(0.06, fract((${PAGE_H.toFixed(2)} - p.y) / 0.16));
  float len = 0.55 + hash12(vec2(row, uSeed)) * 0.4;
  float margin = step(0.25, p.x) * step(p.x, 0.25 + (${PAGE_W.toFixed(2)} - 0.5) * len);
  float body = step(4.0, row) * step(row, 19.0) * inRow * margin;
  float title = step(1.0, row) * step(row, 2.0) * step(0.25, p.x) * step(p.x, ${(PAGE_W * 0.7).toFixed(2)});
  float rule = (1.0 - smoothstep(0.0, 0.015, abs(p.y - ${(PAGE_H - 0.58).toFixed(2)}))) * step(0.25, p.x) * step(p.x, ${(PAGE_W - 0.25).toFixed(2)});
  printed = max(body * 0.55, max(title, rule));
`;

/** How many pages: a stand-in for "the writing", not one per post. */
const COUNT = 5;
/** Depth between neighbouring pages. Every page stays parallel to the others (they only
 *  turn within their own plane, plus a small shared wobble), so this gap keeps them from
 *  ever passing through each other. */
const LAYER = 0.42;

/** A fanned hand of pages, drifting like a stack someone just threw up in the air. */
export function WritingStage() {
  const fit = useThree((s) => fitScale(s.size.width / s.size.height));
  const pages = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const k = i - (COUNT - 1) / 2;
        return {
          x: k * 2.45,
          y: -0.4 - k * k * 0.16,
          z: 1 - Math.abs(k) * LAYER,
          rz: -k * 0.09,
          seed: i * 3.1,
        };
      }),
    [],
  );
  const geometry = useMemo(() => new BoxGeometry(PAGE_W, PAGE_H, 0.04), []);
  const materials = useMemo(
    () =>
      pages.map((p) =>
        createInkMaterial({
          fill: Fill.sheet,
          uniforms: { uSeed: { value: p.seed }, uLift: { value: 0 } },
          fragmentHead: pageHead,
          fragmentPrint: pagePrint,
        }),
      ),
    [pages],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  const group = useRef<Group>(null);
  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const p = withOverview(cue(frameState.s, 4.85, 5.2, 5.55, 5.8));
    g.visible = p > 0 && p < 2;
    const t = state.clock.elapsedTime;
    const arrive = Math.min(Math.max(p, 0), 1);
    const leave = Math.max(p - 1, 0);
    // The whole hand sways and tips as one, so the pages stay parallel.
    g.rotation.set(Math.sin(t * 0.5) * 0.05 + (1 - arrive) * 1.2, Math.sin(t * 0.3) * 0.18, 0);
    g.children.forEach((child, i) => {
      const page = pages[i];
      if (!page) return;
      // Leaving, they spread apart before they turn, so they never cut into each other.
      child.position.set(page.x * arrive * (1 + leave * 2), page.y + (1 - arrive) * -8 + leave * 6, page.z + leave * 12);
      child.rotation.set(0, 0, page.rz + Math.sin(t * 0.6 + i * 2) * 0.04 + leave * (i - (COUNT - 1) / 2) * 0.6);
    });
  });

  return (
    <group position={[0, 0, WORLD.writing.z]} scale={fit}>
      <KineticText
        text="print(thoughts);"
        size={1.9}
        depth={0.5}
        position={[0, 3.4, -1]}
        accent={(_, c) => "();".includes(c)}
        seed={77}
        progress={() => cue(frameState.s, 4.9, 5.22, 5.5, 5.72)}
      />
      <group ref={group}>
        {pages.map((p, i) => (
          <mesh key={i} geometry={geometry} material={materials[i]} />
        ))}
      </group>
    </group>
  );
}
