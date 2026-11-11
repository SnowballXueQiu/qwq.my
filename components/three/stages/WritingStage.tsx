"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, Group } from "three";
import { posts } from "@/content/posts";
import { createInkMaterial, Fill } from "../materials/inkMaterial";
import { KineticText } from "../text/KineticText";
import { cue, frameState } from "../frameState";
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

/** A loose fan of pages, one per post, drifting like a stack someone just threw up in the air. */
export function WritingStage() {
  const count = Math.max(posts.length, 4);
  const pages = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const t = count > 1 ? i / (count - 1) : 0.5;
        const a = (t - 0.5) * 1.6;
        return {
          x: Math.sin(a) * 6,
          y: -0.6 + Math.cos(i * 1.7) * 0.6,
          z: -Math.cos(a) * 3,
          ry: -a * 0.8,
          rz: (i % 2 ? 1 : -1) * 0.12,
          seed: i * 3.1,
        };
      }),
    [count],
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
    const p = cue(frameState.s, 4.85, 5.2, 5.55, 5.8);
    g.visible = p > 0 && p < 2;
    const t = state.clock.elapsedTime;
    g.children.forEach((child, i) => {
      const page = pages[i];
      if (!page) return;
      const arrive = Math.min(Math.max(p, 0), 1);
      const leave = Math.max(p - 1, 0);
      child.position.set(page.x * arrive, page.y + (1 - arrive) * -8 + leave * 6, page.z + leave * 12);
      child.rotation.set(Math.sin(t * 0.8 + i) * 0.08 + (1 - arrive) * 1.2, page.ry + leave * (i - count / 2), page.rz + Math.sin(t * 0.6 + i * 2) * 0.05);
    });
  });

  return (
    <group position={[0, 0, WORLD.writing.z]}>
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
