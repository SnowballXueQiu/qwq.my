"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, Group, PlaneGeometry } from "three";
import { projects } from "@/content/projects";
import { createInkMaterial, Fill } from "../materials/inkMaterial";
import { KineticText } from "../text/KineticText";
import { clamp01, frameState } from "../frameState";
import { WORLD } from "../world";

const SCREEN_W = 5.6;
const SCREEN_H = 3.3;

// A CRT face: scanlines, a bezel line and a slow rolling bar, printed in "ink".
const screenHead = /* glsl */ `
uniform float uHover;
uniform float uSeed;
`;
const screenPrint = /* glsl */ `
  vec2 p = vRest.xy;
  float scan = step(0.5, fract(p.y * 9.0)) * 0.12;
  vec2 edge = abs(p) - vec2(${(SCREEN_W / 2 - 0.18).toFixed(2)}, ${(SCREEN_H / 2 - 0.18).toFixed(2)});
  float bezel = 1.0 - smoothstep(0.0, 0.03, abs(max(edge.x, edge.y)));
  float roll = smoothstep(0.0, 0.25, 0.25 - abs(fract(p.y * 0.18 - uTime * 0.25 + uSeed) - 0.5));
  float noiseBand = step(0.82 - uHover * 0.5, hash12(vec2(floor(p.y * 24.0), floor(uTime * 14.0) + uSeed)));
  printed = max(max(scan + roll * 0.25, bezel), noiseBand * 0.6 * (0.2 + uHover));
`;

function Monolith({ index }: { index: number }) {
  const project = projects[index];
  const side = index % 2 === 0 ? 1 : -1;
  const z = WORLD.projects.start - WORLD.projects.spacing * index;
  const group = useRef<Group>(null);
  const hover = useRef(0);
  const hovered = useRef(false);

  const { slab, screen, slabMat, screenMat } = useMemo(
    () => ({
      slab: new BoxGeometry(SCREEN_W + 0.5, SCREEN_H + 0.5, 0.6),
      screen: new PlaneGeometry(SCREEN_W, SCREEN_H),
      slabMat: createInkMaterial(),
      screenMat: createInkMaterial({
        fill: Fill.paper,
        uniforms: { uHover: { value: 0 }, uSeed: { value: index * 1.7 } },
        fragmentHead: screenHead,
        fragmentPrint: screenPrint,
      }),
    }),
    [index],
  );
  useEffect(
    () => () => {
      slab.dispose();
      screen.dispose();
      slabMat.dispose();
      screenMat.dispose();
    },
    [slab, screen, slabMat, screenMat],
  );

  // Cues keyed to how close the camera is, so each screen boots as you arrive.
  const near = () => {
    const s = frameState.s;
    if (s < 2.7 || s > 4.3) return -1;
    const camZ = frameState.cameraZ;
    const arrive = clamp01((z + 34 - camZ) / 16);
    const leave = clamp01((z - 2 - camZ) / 8);
    return leave > 0 ? 1 + leave : arrive;
  };

  useFrame((_, dt) => {
    hover.current += ((hovered.current ? 1 : 0) - hover.current) * Math.min(dt * 8, 1);
    screenMat.uniforms.uHover.value = hover.current;
    const g = group.current;
    if (!g) return;
    const p = near();
    g.visible = p > 0 && p < 2;
    // Rise out of the floor on arrival, lean toward the camera on hover.
    const rise = Math.min(Math.max(p, 0), 1);
    g.position.y = -6 * Math.pow(1 - rise, 3);
    g.rotation.y = -side * (0.42 - hover.current * 0.2);
  });

  const open = () => {
    const href = project.href ?? project.repo;
    if (href) window.open(href, "_blank", "noopener");
  };

  return (
    <group ref={group} position={[side * WORLD.projects.side, 0, z]}>
      <mesh geometry={slab} material={slabMat} position={[0, 0, -0.32]} />
      <mesh
        geometry={screen}
        material={screenMat}
        onPointerOver={(e) => {
          e.stopPropagation();
          hovered.current = true;
          document.documentElement.dataset.cursorLabel = "OPEN";
        }}
        onPointerOut={() => {
          hovered.current = false;
          delete document.documentElement.dataset.cursorLabel;
        }}
        onClick={(e) => {
          e.stopPropagation();
          open();
        }}
      />
      <KineticText
        text={project.title}
        size={0.82}
        depth={0.22}
        position={[0, 0.25, 0.25]}
        scatter={8}
        seed={index + 20}
        progress={near}
      />
      <KineticText
        font="mono"
        text={`P-${String(index + 1).padStart(2, "0")} / ${project.year}`}
        size={0.26}
        depth={0.06}
        position={[0, -0.95, 0.2]}
        scatter={5}
        seed={index + 40}
        accent={(i) => i < 4}
        progress={near}
      />
      <KineticText
        text={String(index + 1).padStart(2, "0")}
        size={3.6}
        depth={0.9}
        position={[side * -(SCREEN_W / 2 + 1.6), 1.4, -0.4]}
        scatter={12}
        seed={index + 60}
        accent={() => true}
        progress={near}
      />
    </group>
  );
}

/** A corridor of monolith screens, alternating sides; the camera weaves between them. */
export function ProjectsStage() {
  return (
    <group>
      {projects.map((p, i) => (
        <Monolith key={p.slug} index={i} />
      ))}
    </group>
  );
}
