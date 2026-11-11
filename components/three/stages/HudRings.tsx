"use client";

import { useEffect, useMemo } from "react";
import { TorusGeometry } from "three";
import { createInkMaterial, Fill } from "../materials/inkMaterial";

/** Thin rings strung along z: the ribs of a tunnel, drawn as single ink lines. */
export function HudRings({ from, to, radius, step = 7 }: { from: number; to: number; radius: number; step?: number }) {
  const geometry = useMemo(() => new TorusGeometry(radius, 0.035, 6, 96), [radius]);
  const material = useMemo(() => createInkMaterial({ fill: Fill.ink }), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  const zs: number[] = [];
  for (let z = from; z >= to; z -= step) zs.push(z);
  return (
    <group>
      {zs.map((z, i) => (
        <mesh key={z} geometry={geometry} material={material} position={[0, 0, z]} scale={[1, 0.62, 1]} rotation={[0, 0, i * 0.3]} />
      ))}
    </group>
  );
}
