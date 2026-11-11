"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  Object3D,
  OctahedronGeometry,
  TetrahedronGeometry,
} from "three";
import { createInkMaterial } from "../materials/inkMaterial";

const PER_KIND = 22;

/** Low-poly fragments drifting in the dark beyond the paper. */
export function DebrisField() {
  const kinds = useMemo(
    () => [
      new IcosahedronGeometry(1, 0),
      new TetrahedronGeometry(1.2, 0),
      new OctahedronGeometry(1, 0),
      new BoxGeometry(1.4, 0.3, 0.9),
    ],
    [],
  );
  const materials = useMemo(() => kinds.map(() => createInkMaterial()), [kinds]);
  const meshes = useRef<(InstancedMesh | null)[]>([]);
  const items = useMemo(() => {
    let seed = 11;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    return kinds.map(() =>
      Array.from({ length: PER_KIND }, () => {
        const angle = r() * Math.PI * 2;
        const radius = 4 + r() * 12;
        return {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius * 0.7,
          z: -16 - r() * 140,
          s: 0.25 + r() * 1.1,
          rx: r() * 6,
          ry: r() * 6,
          spin: (r() - 0.5) * 0.6,
        };
      }),
    );
  }, [kinds]);

  useEffect(
    () => () => {
      kinds.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
    [kinds, materials],
  );

  const dummy = useMemo(() => new Object3D(), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    items.forEach((list, k) => {
      const mesh = meshes.current[k];
      if (!mesh) return;
      list.forEach((it, i) => {
        dummy.position.set(it.x, it.y + Math.sin(t * 0.4 + i) * 0.3, it.z);
        dummy.rotation.set(it.rx + t * it.spin, it.ry + t * it.spin * 0.7, 0);
        dummy.scale.setScalar(it.s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <>
      {kinds.map((g, k) => (
        <instancedMesh
          key={k}
          ref={(m) => {
            meshes.current[k] = m;
          }}
          args={[g, materials[k], PER_KIND]}
          frustumCulled={false}
        />
      ))}
    </>
  );
}
