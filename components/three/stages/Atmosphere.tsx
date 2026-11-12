"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  CatmullRomCurve3,
  Group,
  InstancedMesh,
  Mesh,
  Object3D,
  PlaneGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { createInkMaterial, Fill } from "../materials/inkMaterial";
import { KineticText } from "../text/KineticText";
import { frameState } from "../frameState";
import { WORLD, roadX } from "../world";

const FLOOR_Y = -6;
const GRID = 4;

// World-space grid lines that fade into the distance; the plane follows the camera.
const floorHead = /* glsl */ `
uniform vec2 uOffset;
uniform float uGrid;
`;
const floorPrint = /* glsl */ `
  vec2 w = vRest.xy + uOffset;
  vec2 g = abs(fract(w / uGrid + 0.5) - 0.5) * uGrid;
  float minor = 1.0 - smoothstep(0.02, 0.06, min(g.x, g.y));
  vec2 G = abs(fract(w / (uGrid * 5.0) + 0.5) - 0.5) * uGrid * 5.0;
  float major = 1.0 - smoothstep(0.03, 0.1, min(G.x, G.y));
  float fade = 1.0 - smoothstep(20.0, 120.0, length(vRest.xy));
  printed = max(minor * 0.35, major * 0.8) * fade;
`;

/** An endless drafting grid under the flight path. */
function FloorGrid() {
  const mesh = useRef<Mesh>(null);
  const geometry = useMemo(() => new PlaneGeometry(260, 260), []);
  const material = useMemo(
    () =>
      createInkMaterial({
        fill: Fill.paper,
        uniforms: { uOffset: { value: [0, 0] }, uGrid: { value: GRID } },
        fragmentHead: floorHead,
        fragmentPrint: floorPrint,
      }),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ camera }) => {
    const m = mesh.current;
    if (!m) return;
    const f = frameState;
    m.visible = f.s > 0.8 && f.s < 5.75 && f.overview < 0.3 && f.game < 0.5;
    // Snap to the grid so the lines stay put while the plane slides along.
    const x = Math.round(camera.position.x / (GRID * 5)) * GRID * 5;
    const z = Math.round(camera.position.z / (GRID * 5)) * GRID * 5;
    m.position.set(x, FLOOR_Y, z);
    // The plane is rotated flat, so local y is world -z.
    material.uniforms.uOffset.value = [x, -z];
  });

  return <mesh ref={mesh} geometry={geometry} material={material} rotation={[-Math.PI / 2, 0, 0]} />;
}

const BITS = 150;

/** Specks of data streaming past the lens; they stretch into streaks with speed. */
function DataStream() {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => new BoxGeometry(0.06, 0.06, 0.06), []);
  const material = useMemo(() => createInkMaterial({ fill: Fill.ink }), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  const bits = useMemo(() => {
    let s = 91;
    const r = () => (s = (s * 48271) % 2147483647) / 2147483647;
    return Array.from({ length: BITS }, () => {
      const a = r() * Math.PI * 2;
      const rad = 2.5 + r() * 9;
      return { x: Math.cos(a) * rad, y: Math.sin(a) * rad * 0.7, z: -r() * 90, k: 0.6 + r() * 0.8 };
    });
  }, []);
  const dummy = useMemo(() => new Object3D(), []);

  useFrame(({ camera }, dt) => {
    const m = mesh.current;
    if (!m) return;
    const f = frameState;
    m.visible = f.s > 0.62 && f.s < 5.75 && f.overview < 0.3;
    if (!m.visible) return;
    const flow = (5 + f.speed * 90) * Math.min(dt, 0.05);
    camera.updateMatrixWorld();
    bits.forEach((b, i) => {
      b.z += flow * b.k;
      if (b.z > 2) b.z -= 92;
      // Positions are relative to the camera, laid along its view direction.
      dummy.position.set(b.x, b.y, b.z);
      dummy.position.applyMatrix4(camera.matrixWorld);
      dummy.quaternion.copy(camera.quaternion);
      dummy.scale.set(1, 1, 1 + f.speed * 60 * b.k);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, BITS]} frustumCulled={false} />;
}

/** An accent signal line running beside the road, wobbling like a scope trace. */
function SignalTrace() {
  const { start, end } = WORLD.timeline;
  const geometry = useMemo(() => {
    const pts: Vector3[] = [];
    for (let i = 0; i <= 160; i++) {
      const z = start + 10 - ((start - end + 30) * i) / 160;
      pts.push(new Vector3(roadX(z) - 5.2, 3.2 + Math.sin(i * 0.9) * 0.5 * Math.sin(i * 0.13), z));
    }
    return new TubeGeometry(new CatmullRomCurve3(pts), 480, 0.06, 6, false);
  }, [start, end]);
  const material = useMemo(() => createInkMaterial({ fill: Fill.ink, accent: 1 }), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geometry} material={material} />;
}

/** Giant scene numbers standing far behind each set piece, like stage flats. */
function BackdropNumerals() {
  const group = useRef<Group>(null);
  const items = useMemo(
    () => [
      { n: "02", pos: [14, 4, WORLD.about.z - 34] as const, from: 0.8, to: 2.1 },
      { n: "04", pos: [18, 8, WORLD.projects.start - WORLD.projects.spacing * (WORLD.projects.count - 1) - 40] as const, from: 2.9, to: 4.1 },
      { n: "05", pos: [-20, 6, WORLD.timeline.end - 40] as const, from: 3.9, to: 5.1 },
      { n: "06", pos: [16, 7, WORLD.writing.z - 36] as const, from: 4.8, to: 5.75 },
    ],
    [],
  );
  return (
    <group ref={group}>
      {items.map((it, i) => (
        <KineticText
          key={it.n}
          text={it.n}
          size={22}
          depth={1.5}
          position={it.pos as unknown as [number, number, number]}
          rotation={[0, (i % 2 ? 1 : -1) * 0.35, 0]}
          scatter={40}
          seed={300 + i}
          accent={() => i % 2 === 1}
          progress={() => {
            const s = frameState.s;
            if (s < it.from || s > it.to) return -1;
            return Math.min((s - it.from) / 0.25, 1);
          }}
        />
      ))}
    </group>
  );
}

/** Everything that fills the air between set pieces. */
export function Atmosphere() {
  return (
    <>
      <FloorGrid />
      <DataStream />
      <SignalTrace />
      <BackdropNumerals />
    </>
  );
}
