"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { createInkMaterial, Fill } from "../materials/inkMaterial";
import { frameState } from "../frameState";
import { PLAZA_S, roadX } from "../world";

const ROAD_Y = -1.1;
const WHEEL_R = 0.42;
const WHEELBASE = 1.24;
const CRANK = 0.17;
const THIGH = 0.5;
const SHIN = 0.5;
/** How far ahead of the camera the pelican rides, and how far right of the centre line. */
const LEAD = 13;
const LANE = 0.55;

const UP = new Vector3(0, 1, 0);

/** Stretches a unit (Y-axis) cylinder mesh between two points. */
function limb(mesh: Mesh | null, a: Vector3, b: Vector3, scratch: { d: Vector3; q: Quaternion }) {
  if (!mesh) return;
  scratch.d.subVectors(b, a);
  const len = scratch.d.length();
  mesh.position.addVectors(a, b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, scratch.d.normalize());
  mesh.scale.set(1, Math.max(len, 1e-3), 1);
}

/** Two-bone IK in the bike's side plane: where the knee goes for a hip and a foot. */
function knee(hip: Vector3, foot: Vector3, out: Vector3) {
  const dx = foot.x - hip.x;
  const dy = foot.y - hip.y;
  const d = Math.min(Math.hypot(dx, dy), THIGH + SHIN - 1e-3);
  const a = Math.acos((THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d));
  const base = Math.atan2(dy, dx);
  // Knees point forward (+x).
  const ang = base + a;
  return out.set(hip.x + Math.cos(ang) * THIGH, hip.y + Math.sin(ang) * THIGH, foot.z);
}

/**
 * A pelican on a bicycle that stands in for you on the timeline road: it rides
 * ahead of the camera in whichever direction you scroll. Built forward along
 * +x; the rig turns it to follow the road.
 */
export function PelicanRider() {
  const rig = useRef<Group>(null);
  const wheels = [useRef<Group>(null), useRef<Group>(null)];
  const crank = useRef<Group>(null);
  const head = useRef<Group>(null);
  const legs = useRef<(Mesh | null)[]>([]);

  const geo = useMemo(() => {
    const neck = new TubeGeometry(
      new CatmullRomCurve3([new Vector3(0.18, 0.12, 0), new Vector3(0.32, 0.4, 0), new Vector3(0.22, 0.66, 0), new Vector3(0.34, 0.86, 0)]),
      24,
      0.075,
      8,
    );
    return {
      tyre: new TorusGeometry(WHEEL_R, 0.035, 8, 40),
      spoke: new BoxGeometry(0.016, WHEEL_R * 2, 0.016),
      hub: new CylinderGeometry(0.05, 0.05, 0.08, 10).rotateX(Math.PI / 2),
      tube: new CylinderGeometry(0.024, 0.024, 1, 8),
      crankArm: new BoxGeometry(0.03, CRANK, 0.03),
      pedal: new BoxGeometry(0.12, 0.025, 0.06),
      seat: new BoxGeometry(0.22, 0.05, 0.1),
      bar: new CylinderGeometry(0.022, 0.022, 0.44, 8).rotateX(Math.PI / 2),
      body: new SphereGeometry(0.42, 24, 16).scale(1.15, 0.78, 0.8),
      tail: new ConeGeometry(0.16, 0.36, 10).rotateZ(Math.PI / 2),
      neck,
      skull: new SphereGeometry(0.15, 18, 12).scale(1.1, 1, 0.95),
      bill: new ConeGeometry(0.06, 0.78, 10).rotateZ(-Math.PI / 2).scale(1, 1, 0.7),
      pouch: new SphereGeometry(0.2, 16, 10).scale(1.9, 0.75, 0.55),
      eye: new SphereGeometry(0.03, 8, 6),
      wing: new SphereGeometry(0.3, 16, 10).scale(1.3, 0.38, 0.12),
      leg: new CylinderGeometry(0.026, 0.026, 1, 8),
      foot: new ConeGeometry(0.09, 0.16, 3).rotateZ(-Math.PI / 2).scale(1, 0.4, 1),
    };
  }, []);
  const mats = useMemo(
    () => ({
      feather: createInkMaterial({ toneBias: 0.28 }),
      wingtip: createInkMaterial({ toneBias: -0.05 }),
      orange: createInkMaterial({ accent: 1, toneBias: 0.1 }),
      frame: createInkMaterial({ fill: Fill.ink }),
      ink: createInkMaterial({ fill: Fill.ink }),
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

  // Fixed points on the bike, in its side plane (x forward, y up, z right).
  const P = useMemo(() => {
    const rear = new Vector3(-WHEELBASE / 2, WHEEL_R, 0);
    const front = new Vector3(WHEELBASE / 2, WHEEL_R, 0);
    const bb = new Vector3(-0.06, WHEEL_R - 0.04, 0);
    const seat = new Vector3(-0.28, 1.0, 0);
    const head = new Vector3(0.42, 0.98, 0);
    const bars = new Vector3(0.46, 1.1, 0);
    return { rear, front, bb, seat, head, bars, hip: new Vector3(-0.22, 1.1, 0) };
  }, []);

  const scratch = useMemo(
    () => ({ d: new Vector3(), q: new Quaternion(), foot: new Vector3(), knee: new Vector3(), hip: new Vector3(), pos: new Vector3(), last: new Vector3() }),
    [],
  );
  const state = useRef({ wheelAngle: 0, lastCamZ: null as number | null, wantDir: -1, facing: -1, speed: 0 });

  useFrame(({ clock }, rawDt) => {
    const g = rig.current;
    if (!g) return;
    const dt = Math.min(rawDt, 1 / 30);
    const s = frameState.s;
    g.visible = s > 3.92 && s < PLAZA_S.street && frameState.overview < 0.3 && frameState.game < 0.5;
    if (!g.visible) {
      state.current.lastCamZ = null;
      return;
    }

    // The pelican is you: it rides a little ahead of the camera, in the
    // direction you're scrolling, and stands on the pedals when you stop.
    const st = state.current;
    const camZ = frameState.cameraZ;
    const camDz = st.lastCamZ === null ? 0 : camZ - st.lastCamZ;
    st.lastCamZ = camZ;
    // Heading: -1 when the camera moves down the road (scrolling on), +1 when it backs up.
    if (Math.abs(camDz) > 0.002) st.wantDir = camDz < 0 ? -1 : 1;
    // Turn around smoothly (a U-turn in its own lane) when the direction flips.
    st.facing += (st.wantDir - st.facing) * Math.min(dt * 5, 1);
    const z = camZ - LEAD;
    const x = roadX(z);
    const dx = roadX(z - 1) - x;
    const n = Math.hypot(dx, 1);
    // Forward heading along the road is (dx, -1); flip it when riding back.
    const turn = (1 - st.facing) / 2; // 0 = riding on, 1 = riding back
    const heading = Math.atan2(1, dx) + turn * Math.PI;
    g.position.set(x + (1 / n) * LANE, ROAD_Y, z + (dx / n) * LANE);
    g.rotation.set(0, heading, Math.sin(clock.elapsedTime * 1.6) * 0.02 * (1 - Math.min(st.speed, 1)));
    g.scale.setScalar(0.85);

    // Wheels and cranks turn with the distance the camera (= you) actually covered.
    const travelled = Math.abs(camDz);
    st.speed += (travelled / Math.max(dt, 1e-3) - st.speed) * Math.min(dt * 6, 1);
    st.wheelAngle -= travelled / WHEEL_R;
    const wa = st.wheelAngle;
    wheels.forEach((w) => w.current && (w.current.rotation.z = wa));
    const ca = wa * 0.55;
    if (crank.current) crank.current.rotation.z = ca;

    // Legs: hip fixed above the saddle, feet on the pedals, knees by IK.
    [0, 1].forEach((side) => {
      const ang = ca + side * Math.PI;
      const zSide = side ? -0.13 : 0.13;
      scratch.foot.set(P.bb.x + Math.sin(-ang) * CRANK, P.bb.y - Math.cos(-ang) * CRANK, zSide);
      scratch.hip.set(P.hip.x, P.hip.y, zSide * 0.8);
      knee(scratch.hip, scratch.foot, scratch.knee);
      limb(legs.current[side * 3], scratch.hip, scratch.knee, scratch);
      limb(legs.current[side * 3 + 1], scratch.knee, scratch.foot, scratch);
      const foot = legs.current[side * 3 + 2];
      foot?.position.copy(scratch.foot).add(new Vector3(0.05, 0.02, 0));
    });

    // A little head bob in time with the pedalling.
    if (head.current) head.current.rotation.z = Math.sin(ca * 2) * 0.06 + (st.speed < 0.2 ? Math.sin(clock.elapsedTime * 1.3) * 0.05 : 0);
  });

  const frameTube = (a: Vector3, b: Vector3, key: string) => {
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const d = b.clone().sub(a);
    const q = new Quaternion().setFromUnitVectors(UP, d.clone().normalize());
    return <mesh key={key} geometry={geo.tube} material={mats.frame} position={mid} quaternion={q} scale={[1, d.length(), 1]} />;
  };

  const wheel = (i: number, at: Vector3) => (
    <group key={i} position={at}>
      <group ref={wheels[i]}>
        <mesh geometry={geo.tyre} material={mats.ink} />
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} geometry={geo.spoke} material={mats.frame} rotation={[0, 0, (k * Math.PI) / 4]} />
        ))}
        <mesh geometry={geo.hub} material={mats.frame} />
      </group>
    </group>
  );

  return (
    <group ref={rig} visible={false}>
      {/* Bicycle */}
      {wheel(0, P.rear)}
      {wheel(1, P.front)}
      {frameTube(P.rear, P.bb, "chainstay")}
      {frameTube(P.rear, P.seat, "seatstay")}
      {frameTube(P.bb, P.seat.clone().add(new Vector3(0.02, -0.05, 0)), "seattube")}
      {frameTube(P.bb, P.head, "downtube")}
      {frameTube(P.seat.clone().add(new Vector3(0.04, -0.06, 0)), P.head, "toptube")}
      {frameTube(P.front, P.bars, "fork")}
      <mesh geometry={geo.bar} material={mats.frame} position={P.bars} />
      <mesh geometry={geo.seat} material={mats.ink} position={P.seat.clone().add(new Vector3(0, 0.03, 0))} />
      <group ref={crank} position={P.bb}>
        {[0, 1].map((side) => (
          <group key={side} rotation={[0, 0, side * Math.PI]}>
            <mesh geometry={geo.crankArm} material={mats.frame} position={[0, -CRANK / 2, side ? -0.1 : 0.1]} />
          </group>
        ))}
      </group>

      {/* Pelican */}
      <group position={[-0.16, 1.32, 0]} rotation={[0, 0, -0.18]}>
        <mesh geometry={geo.body} material={mats.feather} />
        <mesh geometry={geo.tail} material={mats.feather} position={[-0.52, 0.04, 0]} />
        {[1, -1].map((side) => (
          <mesh
            key={side}
            geometry={geo.wing}
            material={mats.wingtip}
            // Wings reach forward to hold the handlebars.
            position={[0.2, -0.02, side * 0.3]}
            rotation={[side * 0.25, side * 0.12, -0.35]}
          />
        ))}
        <mesh geometry={geo.neck} material={mats.feather} />
        <group ref={head} position={[0.36, 0.92, 0]}>
          <mesh geometry={geo.skull} material={mats.feather} />
          {[1, -1].map((side) => (
            <mesh key={side} geometry={geo.eye} material={mats.ink} position={[0.06, 0.05, side * 0.12]} />
          ))}
          <mesh geometry={geo.bill} material={mats.orange} position={[0.46, -0.05, 0]} rotation={[0, 0, -0.12]} />
          <mesh geometry={geo.pouch} material={mats.orange} position={[0.4, -0.16, 0]} rotation={[0, 0, -0.14]} />
        </group>
      </group>
      {[0, 1].map((side) => (
        <group key={side}>
          <mesh
            ref={(m) => {
              legs.current[side * 3] = m;
            }}
            geometry={geo.leg}
            material={mats.orange}
          />
          <mesh
            ref={(m) => {
              legs.current[side * 3 + 1] = m;
            }}
            geometry={geo.leg}
            material={mats.orange}
          />
          <mesh
            ref={(m) => {
              legs.current[side * 3 + 2] = m;
            }}
            geometry={geo.foot}
            material={mats.orange}
          />
        </group>
      ))}
    </group>
  );
}
