"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, Group, IcosahedronGeometry, SphereGeometry, TorusGeometry, BoxGeometry } from "three";
import { createInkMaterial, Fill } from "../materials/inkMaterial";
import { frameState } from "../frameState";

// Wireframe by barycentric distance: every triangle edge is printed as a line,
// but the globe stays solid, so the back half is hidden like a real drawing.
const wireHead = /* glsl */ `
in vec3 aBary;
out vec3 vBary;
`;
const wireTransform = /* glsl */ `
  vBary = aBary;
`;
const wireFragHead = /* glsl */ `
in vec3 vBary;
`;
const wirePrint = /* glsl */ `
  vec3 d = fwidth(vBary);
  vec3 a = smoothstep(vec3(0.0), d * 1.4, vBary);
  printed = (1.0 - min(min(a.x, a.y), a.z)) * 0.9;
`;

/** Unit vector for a latitude/longitude, in the globe's frame. */
function latLon(lat: number, lon: number, r: number): [number, number, number] {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return [Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r];
}

/** A faceted wire globe with a pin where I am, and a satellite on a tilted orbit. */
export function Globe({ lat = 35, lon = 105, radius = 3.2, ...group }: { lat?: number; lon?: number; radius?: number } & React.ComponentProps<"group">) {
  const spin = useRef<Group>(null);
  const orbit = useRef<Group>(null);
  const geo = useMemo(() => {
    // Polyhedron geometries are already non-indexed: one vertex per triangle corner.
    const sphere = new IcosahedronGeometry(radius, 3);
    const n = sphere.attributes.position.count;
    const bary = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) bary[i * 3 + (i % 3)] = 1;
    sphere.setAttribute("aBary", new BufferAttribute(bary, 3));
    return {
      sphere,
      head: new SphereGeometry(0.28, 14, 10),
      ring: new TorusGeometry(radius * 1.6, 0.03, 6, 120),
      sat: new BoxGeometry(0.5, 0.18, 0.18),
      panel: new BoxGeometry(0.9, 0.04, 0.4),
    };
  }, [radius]);
  const mats = useMemo(
    () => ({
      wire: createInkMaterial({
        fill: Fill.paper,
        vertexHead: wireHead,
        vertexTransform: wireTransform,
        fragmentHead: wireFragHead,
        fragmentPrint: wirePrint,
      }),
      accent: createInkMaterial({ accent: 1 }),
      line: createInkMaterial({ fill: Fill.ink }),
      body: createInkMaterial(),
    }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
    [geo, mats],
  );

  const root = useRef<Group>(null);
  useFrame((_, dt) => {
    // Only once we've flown in; from the hero it would sit right behind QwQ's eye.
    if (root.current) root.current.visible = frameState.s > 0.85 && frameState.s < 2.2;
    if (spin.current) spin.current.rotation.y += dt * 0.25;
    if (orbit.current) orbit.current.rotation.y += dt * 0.8;
  });

  const out = latLon(lat, lon, radius + 0.35);
  return (
    <group ref={root} {...group}>
      <group ref={spin} rotation={[0.35, 0, 0]}>
        <mesh geometry={geo.sphere} material={mats.wire} />
        <mesh geometry={geo.head} material={mats.accent} position={out} />
      </group>
      <group rotation={[0.5, 0, 0.25]}>
        <mesh geometry={geo.ring} material={mats.line} rotation={[Math.PI / 2, 0, 0]} />
        <group ref={orbit}>
          <group position={[radius * 1.6, 0, 0]}>
            <mesh geometry={geo.sat} material={mats.body} />
            <mesh geometry={geo.panel} material={mats.body} position={[0, 0, 0.42]} />
            <mesh geometry={geo.panel} material={mats.body} position={[0, 0, -0.42]} />
          </group>
        </group>
      </group>
    </group>
  );
}
