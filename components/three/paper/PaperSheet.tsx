"use client";

import { useEffect, useMemo } from "react";
import { createInkMaterial, Fill } from "../materials/inkMaterial";
import { buildShardGeometry } from "./shards";

const vertexHead = /* glsl */ `
in vec3 aCenter;
in vec3 aRand;
in float aDelay;
uniform float uBreak;

mat3 rotateAxis(vec3 axis, float angle) {
  float s = sin(angle), c = cos(angle), oc = 1.0 - c;
  return mat3(
    oc * axis.x * axis.x + c, oc * axis.x * axis.y + axis.z * s, oc * axis.z * axis.x - axis.y * s,
    oc * axis.x * axis.y - axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z + axis.x * s,
    oc * axis.z * axis.x + axis.y * s, oc * axis.y * axis.z - axis.x * s, oc * axis.z * axis.z + c);
}
`;

// Shards near the focus go first, so a hole opens and races outward.
const vertexTransform = /* glsl */ `
  float local = uBreak - aDelay * 0.6;
  // Untouched shards keep their exact rest positions; any float round-trip
  // here would open pinholes along the seams between neighbours.
  if (local > 0.0) {
    float lift = smoothstep(0.0, 0.12, local);
    float t = clamp((local - 0.06) / 0.5, 0.0, 1.0);
    float e = t * t;
    vec3 axis = normalize(aRand - 0.5 + vec3(0.0, 0.0, 0.001));
    mat3 R = rotateAxis(axis, e * (2.5 + aRand.x * 5.0) + lift * (aRand.y - 0.5) * 0.25);
    pos = aCenter + R * (pos - aCenter);
    nrm = R * nrm;
    vec3 away = normalize(vec3(aCenter.xy * 0.25, 1.0));
    pos += away * e * (16.0 + aRand.y * 18.0);
    pos.z += lift * (0.05 + aRand.z * 0.12);
  }
`;

const fragmentHead = /* glsl */ `
uniform float uGrid;
uniform float uGridLine;
`;

// The construction grid printed on the sheet travels with each shard.
const fragmentPrint = /* glsl */ `
  vec2 g = abs(fract(vRest.xy / uGrid + 0.5) - 0.5) * uGrid;
  float lineMask = 1.0 - smoothstep(uGridLine * 0.5, uGridLine * 1.5, min(g.x, g.y));
  printed = lineMask * 0.08;
`;

export function PaperSheet({
  width,
  height,
  focus,
  pxToWorld,
  breakRef,
  seed = 7,
}: {
  width: number;
  height: number;
  focus: [number, number];
  /** World units per CSS pixel at the sheet's depth, so the grid matches the DOM's 32px grid. */
  pxToWorld: number;
  breakRef: React.RefObject<number>;
  /** Changes the tear pattern. */
  seed?: number;
}) {
  // Rebuild only when the sheet size meaningfully changes, not on sub-pixel jitter.
  const w = Math.round(width * 10) / 10;
  const h = Math.round(height * 10) / 10;
  const fx = Math.round(focus[0] * 10) / 10;
  const fy = Math.round(focus[1] * 10) / 10;
  const geometry = useMemo(() => buildShardGeometry(w, h, [fx, fy], { seed }), [w, h, fx, fy, seed]);

  const material = useMemo(
    () =>
      createInkMaterial({
        fill: Fill.sheet,
        uniforms: {
          uBreak: { value: 0 },
          uGrid: { value: 32 },
          uGridLine: { value: 1 },
        },
        vertexHead,
        vertexTransform,
        fragmentHead,
        fragmentPrint,
      }),
    [],
  );

  useEffect(() => {
    material.uniforms.uGrid.value = 32 * pxToWorld;
    material.uniforms.uGridLine.value = pxToWorld;
  }, [material, pxToWorld]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      frustumCulled={false}
      onBeforeRender={() => {
        material.uniforms.uBreak.value = breakRef.current ?? 0;
      }}
    />
  );
}
