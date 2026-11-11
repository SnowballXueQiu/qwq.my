"use client";

import { useEffect, useMemo } from "react";
import { BoxGeometry, BufferAttribute, BufferGeometry, DoubleSide, OctahedronGeometry } from "three";
import { timeline } from "@/content/timeline";
import { createInkMaterial, Fill } from "../materials/inkMaterial";
import { KineticText } from "../text/KineticText";
import { clamp01, frameState } from "../frameState";
import { WORLD, roadX } from "../world";

const ROAD_Y = -1.1;
const ROAD_W = 3.2;

/** A flat ribbon following roadX(z), with a lateral coordinate for printing lane marks. */
function buildRoad(from: number, to: number, samples = 240) {
  const pos: number[] = [];
  const lat: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const z = from + (to - from) * (i / samples);
    const x = roadX(z);
    const dx = roadX(z - 0.5) - x;
    const len = Math.hypot(dx, 0.5);
    // Perpendicular to the travel direction (dx, -0.5) in the xz-plane.
    const lx = 0.5 / len;
    const lz = dx / len;
    for (const side of [-1, 1]) {
      pos.push(x + lx * side * (ROAD_W / 2), ROAD_Y, z + lz * side * (ROAD_W / 2));
      lat.push(side);
    }
    if (i < samples) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("aLat", new BufferAttribute(new Float32Array(lat), 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Edge lines, a dashed centre line and ruler ticks every few units: a road drawn like a scale bar.
const roadVertexHead = /* glsl */ `
in float aLat;
out float vLat;
`;
const roadTransform = /* glsl */ `
  vLat = aLat;
`;
const roadFragmentHead = /* glsl */ `
in float vLat;
`;
const roadPrint = /* glsl */ `
  float a = abs(vLat);
  float edge = smoothstep(0.86, 0.9, a) * (1.0 - smoothstep(0.96, 1.0, a));
  float dash = step(0.45, fract(vRest.z * 0.22)) * (1.0 - smoothstep(0.025, 0.05, a));
  float dTick = abs(fract(vRest.z * 0.5 + 0.5) - 0.5) * 2.0;
  float tick = (1.0 - smoothstep(0.03, 0.06, dTick)) * smoothstep(0.62, 0.66, a);
  float dMajor = abs(fract(vRest.z / 12.0 + 0.5) - 0.5) * 12.0;
  float major = 1.0 - smoothstep(0.05, 0.1, dMajor);
  printed = max(max(edge, dash), max(tick * 0.8, major * 0.7));
`;

function Milestone({ index }: { index: number }) {
  const event = timeline[index];
  const { start, end } = WORLD.timeline;
  const z = start - ((index + 0.5) / timeline.length) * (start - end);
  const side = index % 2 === 0 ? -1 : 1;
  const x = roadX(z) + side * (ROAD_W / 2 + 1.4);

  const { post, gem, postMat, gemMat } = useMemo(
    () => ({
      post: new BoxGeometry(0.09, 3.4, 0.09),
      gem: new OctahedronGeometry(0.38, 0),
      postMat: createInkMaterial({ fill: Fill.ink }),
      gemMat: createInkMaterial({ accent: 1 }),
    }),
    [],
  );
  useEffect(
    () => () => {
      post.dispose();
      gem.dispose();
      postMat.dispose();
      gemMat.dispose();
    },
    [post, gem, postMat, gemMat],
  );

  const near = () => {
    const s = frameState.s;
    if (s < 3.8 || s > 5.3) return -1;
    const camZ = frameState.cameraZ;
    const arrive = clamp01((z + 30 - camZ) / 14);
    const leave = clamp01((z - 1 - camZ) / 6);
    return leave > 0 ? 1 + leave : arrive;
  };

  return (
    <group position={[x, ROAD_Y, z]}>
      <mesh geometry={post} material={postMat} position={[0, 1.7, 0]} />
      <mesh geometry={gem} material={gemMat} position={[0, 3.6, 0]} rotation={[0, index, 0]} />
      <KineticText
        font="mono"
        text={event.date.replace("-", ".")}
        size={0.62}
        depth={0.14}
        align={side < 0 ? "right" : "left"}
        position={[side * -0.35, 2.6, 0]}
        rotation={[0, -side * 0.5, 0]}
        scatter={6}
        seed={index + 80}
        accent={(i) => i >= 5}
        progress={near}
      />
    </group>
  );
}

/** The timeline as a ruler-marked road the camera rides, milestones planted along its verge. */
export function TimelineStage() {
  const { start, end } = WORLD.timeline;
  const road = useMemo(() => buildRoad(start + 16, end - 30), [start, end]);
  const roadMat = useMemo(() => {
    const m = createInkMaterial({
      fill: Fill.paper,
      vertexHead: roadVertexHead,
      vertexTransform: roadTransform,
      fragmentHead: roadFragmentHead,
      fragmentPrint: roadPrint,
    });
    m.side = DoubleSide;
    return m;
  }, []);
  useEffect(() => () => road.dispose(), [road]);
  useEffect(() => () => roadMat.dispose(), [roadMat]);

  return (
    <group>
      <mesh geometry={road} material={roadMat} />
      {timeline.map((e, i) => (
        <Milestone key={e.date + e.title.en} index={i} />
      ))}
      <KineticText
        text="while (alive) {"
        size={2.2}
        depth={0.6}
        position={[roadX(start), 2.2, start - 2]}
        accent={(_, c) => "(){".includes(c)}
        seed={91}
        progress={() => {
          const camZ = frameState.cameraZ;
          if (frameState.s < 3.7 || frameState.s > 5.2) return -1;
          return clamp01((start + 36 - camZ) / 16) + clamp01((start - 1 - camZ) / 6);
        }}
      />
    </group>
  );
}
