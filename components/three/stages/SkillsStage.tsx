"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { skills } from "@/content/skills";
import { KineticText } from "../text/KineticText";
import { clamp01, frameState } from "../frameState";
import { WORLD } from "../world";
import { HudRings } from "./HudRings";

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/**
 * A tunnel of skills. Each name assembles as the camera approaches and
 * shatters past the lens as you fly through it.
 */
export function SkillsStage() {
  const { start, end, radius } = WORLD.skills;
  const placed = useMemo(
    () =>
      skills.map((skill, i) => {
        const t = skills.length > 1 ? i / (skills.length - 1) : 0;
        const angle = i * GOLDEN + 0.6;
        return {
          name: skill.name,
          z: start - (start - end) * t,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius * 0.62,
          tilt: angle,
          strong: skill.level >= 5,
        };
      }),
    [start, end, radius],
  );

  const rings = useRef<Group>(null);
  useFrame(() => {
    if (rings.current) rings.current.visible = frameState.s > 1.85 && frameState.s < 3.3;
  });

  return (
    <group>
      <group ref={rings}>
        <HudRings from={start + 6} to={end - 14} radius={radius + 2.5} />
      </group>
      {placed.map((p, i) => (
        <KineticText
          key={p.name}
          text={p.name}
          size={1.5}
          depth={0.5}
          scatter={10}
          seed={i + 3}
          position={[p.x, p.y, p.z]}
          // Turn each word a little toward the tunnel's axis so it reads from inside.
          rotation={[Math.sin(p.tilt) * 0.35, -Math.cos(p.tilt) * 0.45, 0]}
          accent={() => p.strong}
          progress={() => {
            // Driven by camera depth rather than scroll so words meet you as you arrive.
            if (frameState.s < 1.9 || frameState.s > 3.2) return -1;
            const camZ = frameState.cameraZ;
            const arrive = clamp01((p.z + 46 - camZ) / 22);
            const leave = clamp01((p.z + 5 - camZ) / 7);
            return leave > 0 ? 1 + leave : arrive;
          }}
        />
      ))}
    </group>
  );
}
