"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  OctahedronGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { TimelineKind } from "@/content/timeline";
import { createInkMaterial, Fill } from "../materials/inkMaterial";

/** One set of geometry and materials for every marker on the road. */
export function useMarkerKit() {
  const kit = useMemo(() => {
    const flag = new Shape();
    flag.moveTo(0, 0);
    flag.lineTo(1.1, -0.32);
    flag.lineTo(0, -0.66);
    flag.closePath();
    const cup = [
      new Vector2(0, 0),
      new Vector2(0.18, 0),
      new Vector2(0.42, 0.2),
      new Vector2(0.5, 0.62),
      new Vector2(0.46, 0.64),
      new Vector2(0.38, 0.24),
      new Vector2(0, 0.08),
    ];
    return {
      geo: {
        gem: new OctahedronGeometry(0.38, 0),
        flag: new ExtrudeGeometry(flag, { depth: 0.05, bevelEnabled: false }),
        caseBody: new RoundedBoxGeometry(0.92, 0.62, 0.3, 3, 0.06),
        caseHandle: new TorusGeometry(0.16, 0.04, 8, 16, Math.PI),
        cup: new LatheGeometry(cup, 24),
        cupHandle: new TorusGeometry(0.14, 0.035, 8, 16, Math.PI),
        stem: new CylinderGeometry(0.05, 0.08, 0.28, 12),
        base: new BoxGeometry(0.44, 0.14, 0.44),
        board: new BoxGeometry(1.05, 0.05, 1.05),
        cap: new CylinderGeometry(0.34, 0.38, 0.26, 20),
        tassel: new SphereGeometry(0.07, 10, 8),
        sheet: new BoxGeometry(0.78, 0.025, 1.0),
      },
      mat: {
        body: createInkMaterial({ toneBias: 0.08 }),
        accent: createInkMaterial({ accent: 1, toneBias: 0.08 }),
        ink: createInkMaterial({ fill: Fill.ink }),
        sheet: createInkMaterial({ fill: Fill.sheet }),
      },
    };
  }, []);
  useEffect(
    () => () => {
      Object.values(kit.geo).forEach((g) => g.dispose());
      Object.values(kit.mat).forEach((m) => m.dispose());
    },
    [kit],
  );
  return kit;
}

export type MarkerKit = ReturnType<typeof useMarkerKit>;

/** The little model that tops a milestone post, chosen by what kind of event it was. */
export function MilestoneMarker({ kind, kit, seed }: { kind: TimelineKind; kit: MarkerKit; seed: number }) {
  const spin = useRef<Group>(null);
  useFrame((state, dt) => {
    const g = spin.current;
    if (!g) return;
    g.rotation.y += dt * 0.6;
    g.position.y = Math.sin(state.clock.elapsedTime * 1.4 + seed) * 0.08;
  });
  const { geo, mat } = kit;

  let model: React.ReactNode;
  switch (kind) {
    case "found":
      model = <mesh geometry={geo.flag} material={mat.accent} position={[0.05, 0.4, -0.025]} />;
      break;
    case "work":
      model = (
        <group position={[0, 0.25, 0]}>
          <mesh geometry={geo.caseBody} material={mat.body} />
          <mesh geometry={geo.caseHandle} material={mat.ink} position={[0, 0.31, 0]} />
          <mesh geometry={geo.base} material={mat.accent} position={[0, 0.05, 0.13]} scale={[0.4, 0.4, 0.2]} />
        </group>
      );
      break;
    case "award":
      model = (
        <group position={[0, -0.1, 0]}>
          <mesh geometry={geo.base} material={mat.ink} position={[0, 0.07, 0]} />
          <mesh geometry={geo.stem} material={mat.accent} position={[0, 0.28, 0]} />
          <mesh geometry={geo.cup} material={mat.accent} position={[0, 0.4, 0]} />
          <mesh geometry={geo.cupHandle} material={mat.accent} position={[-0.47, 0.82, 0]} rotation={[0, 0, Math.PI / 2]} />
          <mesh geometry={geo.cupHandle} material={mat.accent} position={[0.47, 0.82, 0]} rotation={[0, 0, -Math.PI / 2]} />
        </group>
      );
      break;
    case "school":
      model = (
        <group position={[0, 0.15, 0]}>
          <mesh geometry={geo.cap} material={mat.body} />
          <mesh geometry={geo.board} material={mat.ink} position={[0, 0.15, 0]} rotation={[0, Math.PI / 4, 0]} />
          <mesh geometry={geo.tassel} material={mat.accent} position={[0.5, -0.05, 0.1]} />
        </group>
      );
      break;
    case "teach":
      model = (
        <group position={[0, 0.1, 0]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh
              key={i}
              geometry={geo.sheet}
              material={mat.sheet}
              position={[i * 0.03, i * 0.045, -i * 0.02]}
              rotation={[0, i * 0.12 - 0.15, 0]}
            />
          ))}
          <mesh geometry={geo.stem} material={mat.accent} position={[0.2, 0.25, 0.1]} rotation={[0, 0, 1.2]} scale={[0.6, 2.2, 0.6]} />
        </group>
      );
      break;
    default:
      model = <mesh geometry={geo.gem} material={mat.accent} />;
  }
  return <group ref={spin}>{model}</group>;
}
