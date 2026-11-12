"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  IcosahedronGeometry,
  Vector3,
  InstancedMesh,
  Object3D,
  OctahedronGeometry,
  TetrahedronGeometry,
} from "three";
import { createInkMaterial } from "../materials/inkMaterial";
import { WORLD } from "../world";
import { frameState } from "../frameState";
import { impulsesSince, pointer } from "../interact/interaction";

const PER_KIND = 48;
// Debris spans the whole flight, from just past the paper to the finale.
const NEAR = -16;
const FAR = WORLD.contact.z + 20;

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
        const radius = 5 + r() * 13;
        return {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius * 0.7,
          z: NEAR + (FAR - NEAR) * r(),
          s: 0.25 + r() * 1.1,
          rx: r() * 6,
          ry: r() * 6,
          spin: (r() - 0.5) * 0.6,
          // Displacement from pointer pushes and shockwaves, sprung back to rest.
          off: new Vector3(),
          vel: new Vector3(),
          extraSpin: 0,
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
  const scratch = useMemo(() => ({ p: new Vector3(), right: new Vector3(), up: new Vector3(), seen: 0 }), []);
  useFrame((state, rawDt) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(rawDt, 1 / 30);
    const { camera } = state;
    const { p, right, up } = scratch;
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    const [blasts, seen] = impulsesSince(scratch.seen);
    scratch.seen = seen;
    const aspect = state.size.width / state.size.height;
    // Party mode paints the debris red and makes it dance.
    materials.forEach((m) => (m.uniforms.uAccent.value = frameState.party > 0.5 ? 1 : 0));
    const dance = frameState.party;
    items.forEach((list, k) => {
      const mesh = meshes.current[k];
      if (!mesh) return;
      list.forEach((it, i) => {
        p.set(it.x, it.y + Math.sin(t * 0.4 + i) * 0.3, it.z).add(it.off);
        // Screen-space distance to the pointer decides who gets shoved.
        const q = p.clone().project(camera);
        if (q.z < 1) {
          const dx = (q.x - pointer.x) * aspect;
          const dy = q.y - pointer.y;
          const d = Math.hypot(dx, dy) || 1e-3;
          const near = it.z > camera.position.z - 70;
          if (pointer.inside && d < 0.22 && near) {
            const f = (1 - d / 0.22) * 40 * dt;
            it.vel.addScaledVector(right, (dx / d) * f).addScaledVector(up, (dy / d) * f);
          }
          for (const b of blasts) {
            const bx = (q.x - b.x) * aspect;
            const by = q.y - b.y;
            const bd = Math.hypot(bx, by) || 1e-3;
            if (bd < 0.6 && near) {
              const f = (1 - bd / 0.6) * 26 * b.strength;
              it.vel.addScaledVector(right, (bx / bd) * f).addScaledVector(up, (by / bd) * f);
              it.vel.z += f * 0.4;
              it.extraSpin += f * 0.6;
            }
          }
        }
        // Spring home with a little overshoot.
        it.vel.addScaledVector(it.off, -18 * dt).multiplyScalar(Math.pow(0.04, dt));
        it.off.addScaledVector(it.vel, dt);
        it.extraSpin *= Math.pow(0.2, dt);
        it.rx += it.extraSpin * dt;
        dummy.position.copy(p);
        dummy.rotation.set(it.rx + t * it.spin * (1 + dance * 8), it.ry + t * it.spin * 0.7, 0);
        if (dance > 0.01) dummy.position.y += Math.abs(Math.sin(t * 7 + i)) * dance * 1.2;
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
