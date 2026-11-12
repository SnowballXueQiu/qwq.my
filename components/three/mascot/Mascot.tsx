"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, InstancedMesh, Mesh, Object3D, Plane, Raycaster, Vector2, Vector3 } from "three";
import type { Expression } from "@/lib/store";
import { createInkMaterial, Fill, type InkMaterial } from "../materials/inkMaterial";
import { createGlyphs } from "./glyphs";
import { useMascotBrain } from "./useMascotBrain";

type EyeKind = "Q" | "O" | ">" | "<" | "^" | "-" | "@";
type MouthKind = "w" | "ω" | "A";

const FACES: Record<Expression, { l: EyeKind; r: EyeKind; mouth: MouthKind; wave?: boolean }> = {
  QwQ: { l: "Q", r: "Q", mouth: "w" },
  OwO: { l: "O", r: "O", mouth: "w" },
  ">w<": { l: ">", r: "<", mouth: "w" },
  QAQ: { l: "Q", r: "Q", mouth: "A" },
  "@w@": { l: "@", r: "@", mouth: "w" },
  "-w-": { l: "-", r: "-", mouth: "w" },
  "^w^": { l: "^", r: "^", mouth: "ω", wave: true },
};

/** Which glyph parts each eye kind shows. */
const EYE_PARTS: Record<EyeKind, string[]> = {
  Q: ["ring", "tail", "pupil"],
  O: ["ring", "pupil"],
  ">": ["chevron"],
  "<": ["chevron"],
  "^": ["caret"],
  "-": ["dash"],
  "@": ["spiral"],
};

export const EYE_X = 2.12;
export const EYE_Y = 0.3;
const PUPIL_TRAVEL = 0.3;
const TEARS = 14;

class Spring {
  value = 0;
  velocity = 0;
  step(target: number, dt: number, k = 190, c = 14) {
    this.velocity += ((target - this.value) * k - this.velocity * c) * dt;
    this.value += this.velocity * dt;
    return this.value;
  }
}

export type MascotHandle = {
  /** 0 = flat line drawing on paper, 1 = full volume. */
  depth: number;
  materials: InkMaterial[];
};

/**
 * The QwQ mascot. Pupils follow the pointer, the face switches between kaomoji,
 * and `handle.depth` flattens it into a drawing on the paper.
 */
export function Mascot({ handle }: { handle?: React.RefObject<MascotHandle | null> }) {
  const glyphs = useMemo(() => createGlyphs(), []);
  const mats = useMemo(
    () => ({
      stroke: createInkMaterial({ wobble: 0.035, wobbleFrequency: 1.4 }),
      pupil: createInkMaterial({ fill: Fill.ink }),
      highlight: createInkMaterial({ fill: Fill.paper }),
      mouthFill: createInkMaterial({ fill: Fill.ink }),
      tear: createInkMaterial({ fill: Fill.ink, accent: 1 }),
    }),
    [],
  );

  const root = useRef<Group>(null);
  const face = useRef<Group>(null);
  const eyes = [useRef<Group>(null), useRef<Group>(null)];
  const pupils = [useRef<Group>(null), useRef<Group>(null)];
  const mouth = useRef<Group>(null);
  const tears = useRef<InstancedMesh>(null);
  const zees = useRef<Group>(null);
  const hand = useRef<Group>(null);
  const hitArea = useRef<Mesh>(null);
  const camera = useThree((s) => s.camera);


  const brain = useMascotBrain();

  // Pokes are picked with our own ray: R3F's press events don't reach camera-space portals here.
  useEffect(() => {
    const ray = new Raycaster();
    const ndc = new Vector2();
    const onDown = (e: PointerEvent) => {
      const mesh = hitArea.current;
      if (!mesh || !root.current?.visible) return;
      ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.intersectObject(mesh, false).length) {
        brain.poke();
        squash.current.velocity -= 7;
      }
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [camera, brain]);
  const springs = useRef(new Map<Object3D, Spring>());
  const squash = useRef(new Spring());
  const tilt = useRef({ x: 0, y: 0 });
  const tearState = useRef(
    Array.from({ length: TEARS }, () => ({ alive: false, x: 0, y: 0, vy: 0, life: 0 })),
  );
  const tearClock = useRef(0);
  const helpers = useMemo(
    () => ({ ray: new Raycaster(), plane: new Plane(new Vector3(0, 0, 1), 0), hit: new Vector3(), tmp: new Vector3(), dummy: new Object3D() }),
    [],
  );

  useEffect(() => {
    if (handle) handle.current = { depth: 1, materials: Object.values(mats) };
  }, [handle, mats]);

  useEffect(
    () => () => {
      Object.values(glyphs).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
    [glyphs, mats],
  );

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 30);
    const expression = brain.think();
    const spec = FACES[expression];
    const t = state.clock.elapsedTime;

    // Pop glyph parts in and out with a little overshoot.
    const animate = (obj: Object3D | null | undefined, active: boolean, base = 1) => {
      if (!obj) return;
      let s = springs.current.get(obj);
      if (!s) {
        s = new Spring();
        s.value = active ? 1 : 0;
        springs.current.set(obj, s);
      }
      const v = Math.max(0, s.step(active ? 1 : 0, dt));
      obj.scale.setScalar(v * base);
      obj.visible = v > 0.01;
    };

    eyes.forEach((eye, i) => {
      const g = eye.current;
      if (!g) return;
      const kind = i === 0 ? spec.l : spec.r;
      const parts = EYE_PARTS[kind];
      for (const child of g.children) {
        const part = child.userData.part as string | undefined;
        if (!part) continue;
        const pupilScale = part === "pupil" && kind === "O" ? 1.25 : 1;
        animate(child, parts.includes(part), pupilScale);
        if (part === "chevron") child.rotation.z = kind === "<" ? Math.PI : 0;
        if (part === "spiral") child.rotation.z -= dt * 7 * (i === 0 ? 1 : -1);
      }
    });
    mouth.current?.children.forEach((child) => {
      animate(child, child.userData.part === spec.mouth);
    });

    // Pupils look at where the pointer meets a plane just in front of the face.
    const { ray, plane, hit, tmp } = helpers;
    ray.setFromCamera(state.pointer, state.camera);
    face.current?.getWorldPosition(tmp);
    plane.constant = -(tmp.z + 2.5);
    if (ray.ray.intersectPlane(plane, hit)) {
      eyes.forEach((eye, i) => {
        const pupil = pupils[i].current;
        if (!eye.current || !pupil) return;
        const local = eye.current.worldToLocal(tmp.copy(hit));
        const len = Math.hypot(local.x, local.y) || 1;
        const reach = Math.min(len * 0.22, PUPIL_TRAVEL);
        pupil.position.x += ((local.x / len) * reach - pupil.position.x) * 0.2;
        pupil.position.y += ((local.y / len) * reach - pupil.position.y) * 0.2;
      });
    }

    // Head turns toward the pointer, breathes, and squashes when poked.
    tilt.current.y += (state.pointer.x * 0.38 - tilt.current.y) * 0.06;
    tilt.current.x += (-state.pointer.y * 0.26 - tilt.current.x) * 0.06;
    const sq = squash.current.step(0, dt, 260, 9);
    if (face.current) {
      face.current.rotation.set(tilt.current.x, tilt.current.y, Math.sin(t * 0.7) * 0.03);
      const breath = Math.sin(t * 1.7) * 0.015;
      const depth = handle?.current?.depth ?? 1;
      face.current.scale.set(1 - sq * 0.14, 1 + sq * 0.22 + breath, Math.max(depth, 0.02));
    }

    // Tears drip from the Q tails while crying.
    const tm = tears.current;
    if (tm) {
      tearClock.current -= dt;
      if (expression === "QAQ" && tearClock.current <= 0) {
        tearClock.current = 0.16;
        const slot = tearState.current.find((d) => !d.alive);
        if (slot) {
          const side = Math.random() < 0.5 ? -1 : 1;
          Object.assign(slot, { alive: true, x: side * EYE_X + 1.4, y: EYE_Y - 1.35, vy: 0, life: 0 });
        }
      }
      tearState.current.forEach((d, i) => {
        const dummy = helpers.dummy;
        if (d.alive) {
          d.life += dt;
          d.vy -= 9 * dt;
          d.y += d.vy * dt;
          if (d.life > 1.4) d.alive = false;
        }
        const s = d.alive ? Math.min(d.life * 6, 1) * (1 - Math.max(0, d.life - 1.1) / 0.3) : 0;
        dummy.position.set(d.x, d.y, 0.3);
        dummy.scale.setScalar(Math.max(s, 0.0001));
        dummy.updateMatrix();
        tm.setMatrixAt(i, dummy.matrix);
      });
      tm.instanceMatrix.needsUpdate = true;
    }

    // ^w^ﾉ waves.
    if (hand.current) {
      animate(hand.current, Boolean(spec.wave));
      hand.current.rotation.z = -0.3 + Math.sin(t * 9) * 0.45;
    }

    // Sleepy z's drift up from the right eye.
    zees.current?.children.forEach((z, i) => {
      const phase = (t * 0.45 + i / 3) % 1;
      animate(z, expression === "-w-", 0.6 + i * 0.25);
      z.position.set(EYE_X + 1.2 + phase * 0.9, EYE_Y + 0.8 + phase * 2.2, 0);
    });
  });

  const eyeChildren = (
    <>
      <mesh userData={{ part: "ring" }} geometry={glyphs.ring} material={mats.stroke} />
      <mesh userData={{ part: "tail" }} geometry={glyphs.tail} material={mats.stroke} />
      <group userData={{ part: "chevron" }}>
        <mesh geometry={glyphs.chevron} material={mats.stroke} />
      </group>
      <mesh userData={{ part: "caret" }} geometry={glyphs.caret} material={mats.stroke} />
      <mesh userData={{ part: "dash" }} geometry={glyphs.dash} material={mats.stroke} />
      <mesh userData={{ part: "spiral" }} geometry={glyphs.spiral} material={mats.stroke} />
    </>
  );

  return (
    <group ref={root}>
      <group ref={face}>
        {[-1, 1].map((side, i) => (
          <group key={side} ref={eyes[i]} position={[side * EYE_X, EYE_Y, 0]}>
            {eyeChildren}
            <group userData={{ part: "pupil" }}>
              <group ref={pupils[i]} position={[0, 0, 0.12]}>
                <mesh geometry={glyphs.pupil} material={mats.pupil} />
                <mesh geometry={glyphs.highlight} material={mats.highlight} position={[-0.14, 0.16, 0.2]} />
              </group>
            </group>
          </group>
        ))}
        <group ref={mouth} position={[0, -0.12, 0]}>
          <mesh userData={{ part: "w" }} geometry={glyphs.mouthW} material={mats.stroke} />
          <mesh userData={{ part: "ω" }} geometry={glyphs.mouthOmega} material={mats.stroke} />
          <group userData={{ part: "A" }}>
            <mesh geometry={glyphs.mouthA} material={mats.stroke} />
            <mesh geometry={glyphs.mouthAFill} material={mats.mouthFill} />
          </group>
        </group>
        <group ref={hand} position={[EYE_X + 1.7, EYE_Y - 0.9, 0]}>
          <mesh geometry={glyphs.hand} material={mats.stroke} />
        </group>
        <instancedMesh ref={tears} args={[glyphs.tear, mats.tear, TEARS]} frustumCulled={false} />
        <group ref={zees}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} geometry={glyphs.zee} material={mats.stroke} />
          ))}
        </group>
        {/* Invisible hit area so the whole face is hoverable and pokeable. */}
        <mesh
          ref={hitArea}
          scale={[3.6, 1.7, 1]}
          onPointerOver={() => brain.setHovered(true)}
          onPointerOut={() => brain.setHovered(false)}
        >
          <sphereGeometry args={[1, 16, 12]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      </group>
    </group>
  );
}

