"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, PlaneGeometry } from "three";
import { skillGroups } from "@/content/skills";
import { createInkMaterial, Fill } from "../materials/inkMaterial";
import { KineticText } from "../text/KineticText";
import { clamp01, frameState, withOverview } from "../frameState";
import { WORLD } from "../world";

const PLATE_W = 10.5;
const PLATE_H = 8;

// A dark card with a header rule, corner ticks and a faint dot grid: the
// station's own page, which also hides the debris behind it.
const plateHead = /* glsl */ `
uniform float uActive;
`;
const platePrint = /* glsl */ `
  vec2 p = vRest.xy;
  vec2 e = abs(p) - vec2(${(PLATE_W / 2 - 0.25).toFixed(2)}, ${(PLATE_H / 2 - 0.25).toFixed(2)});
  float border = 1.0 - smoothstep(0.0, 0.03, abs(max(e.x, e.y)));
  float rule = (1.0 - smoothstep(0.0, 0.025, abs(p.y - ${(PLATE_H / 2 - 1.9).toFixed(2)}))) * step(abs(p.x), ${(PLATE_W / 2 - 0.25).toFixed(2)});
  vec2 g = fract(p * 1.25) - 0.5;
  float dots = (1.0 - smoothstep(0.03, 0.06, length(g))) * 0.18;
  printed = max(max(border, rule * (0.5 + uActive * 0.5)), dots);
`;

function Station({ index }: { index: number }) {
  const group = skillGroups[index];
  const z = WORLD.skills.start - WORLD.skills.spacing * index;
  const root = useRef<Group>(null);
  const { geometry, material } = useMemo(
    () => ({
      geometry: new PlaneGeometry(PLATE_W, PLATE_H),
      material: createInkMaterial({
        fill: Fill.paper,
        uniforms: { uActive: { value: 0 } },
        fragmentHead: plateHead,
        fragmentPrint: platePrint,
      }),
    }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // Arrive as the camera approaches; leave sideways rather than into the lens.
  const cue = () => {
    const s = frameState.s;
    if (s < 1.85 || s > 3.15) return -1;
    const camZ = frameState.cameraZ;
    const arrive = clamp01((z + 34 - camZ) / 14);
    const leave = clamp01((z + 4 - camZ) / 6);
    return leave > 0 ? 1 + leave : arrive;
  };

  useFrame(() => {
    const g = root.current;
    if (!g) return;
    const p = withOverview(cue());
    g.visible = p > 0 && p < 2;
    const rise = Math.min(Math.max(p, 0), 1);
    const out = Math.max(p - 1, 0);
    g.position.set(5.2 + out * 9, (1 - rise) * -3, z);
    g.rotation.y = -0.12 - out * 0.8;
    material.uniforms.uActive.value = rise;
  });

  const cols = group.items.length > 4 ? 2 : 1;
  const perCol = Math.ceil(group.items.length / cols);
  const left = -PLATE_W / 2 + 0.7;
  return (
    <group ref={root}>
      <mesh geometry={geometry} material={material} position={[0, 0, -0.35]} />
      <KineticText
        text={group.code}
        size={1.25}
        depth={0.35}
        align="left"
        position={[left, PLATE_H / 2 - 1.15, 0]}
        accent={() => true}
        scatter={7}
        seed={index * 7 + 1}
        progress={cue}
      />
      <KineticText
        font="mono"
        text={`03.${index + 1} / ${String(group.items.length).padStart(2, "0")}`}
        size={0.32}
        depth={0.08}
        align="right"
        position={[PLATE_W / 2 - 0.6, PLATE_H / 2 - 0.85, 0]}
        scatter={4}
        seed={index * 7 + 2}
        progress={cue}
      />
      {group.items.map((item, i) => {
        const col = Math.floor(i / perCol);
        const row = i % perCol;
        return (
          <KineticText
            key={item}
            text={item}
            size={0.78}
            depth={0.22}
            align="left"
            position={[left + col * (PLATE_W / 2 - 0.2), PLATE_H / 2 - 2.9 - row * 1.15, 0]}
            scatter={6}
            seed={index * 31 + i + 5}
            progress={() => cue() - i * 0.04}
          />
        );
      })}
    </group>
  );
}

/** One station per skill group, laid out like index cards along the path. */
export function SkillsStage() {
  return (
    <group>
      {skillGroups.map((g, i) => (
        <Station key={g.id} index={i} />
      ))}
    </group>
  );
}
