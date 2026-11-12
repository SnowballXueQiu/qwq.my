"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  DoubleSide,
  ConeGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { emit } from "@/lib/fx";
import { play } from "@/lib/sound";
import { createInkMaterial, Fill } from "../materials/inkMaterial";
import { KineticText } from "../text/KineticText";
import { clamp01, frameState } from "../frameState";
import { HERO_DIST, PAPER_DIST, heroPlacement } from "../framing";
import { claimPointer } from "../interact/interaction";

/** Seconds since this toy was last poked (large when never). */
type Age = () => number;

const easeOutBack = (t: number) => {
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

/* ---------- materials shared by every toy ---------- */

function useToyMaterials() {
  const mats = useMemo(
    () => ({
      body: createInkMaterial({ toneBias: 0.1 }),
      accent: createInkMaterial({ accent: 1, toneBias: 0.1 }),
      ink: createInkMaterial({ fill: Fill.ink }),
      paper: createInkMaterial({ fill: Fill.sheet }),
    }),
    [],
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  return mats;
}
type Mats = ReturnType<typeof useToyMaterials>;

/* ---------- the toys themselves ---------- */

function Duck({ mats, age }: { mats: Mats; age: Age }) {
  const g = useRef<Group>(null);
  const geo = useMemo(
    () => ({
      body: new SphereGeometry(0.62, 28, 20).scale(1.25, 0.82, 0.95),
      head: new SphereGeometry(0.4, 24, 18),
      beak: new SphereGeometry(0.2, 16, 12).scale(1.5, 0.45, 1),
      eye: new SphereGeometry(0.06, 10, 8),
      tail: new ConeGeometry(0.22, 0.4, 12).rotateZ(Math.PI / 2 + 0.6),
    }),
    [],
  );
  useEffect(() => () => Object.values(geo).forEach((x) => x.dispose()), [geo]);
  useFrame(() => {
    const a = age();
    if (!g.current) return;
    // Quack: squash, hop, settle.
    const k = a < 0.6 ? Math.sin((a / 0.6) * Math.PI) : 0;
    g.current.position.y = k * 0.7;
    g.current.scale.set(1 + (a < 0.12 ? (0.12 - a) * 2.5 : 0), 1 - (a < 0.12 ? (0.12 - a) * 3 : 0) + k * 0.1, 1);
    g.current.rotation.z = Math.sin(a * 20) * 0.2 * Math.max(0, 1 - a * 2);
  });
  return (
    <group ref={g}>
      <mesh geometry={geo.body} material={mats.body} />
      <mesh geometry={geo.tail} material={mats.body} position={[-0.78, 0.22, 0]} />
      <mesh geometry={geo.head} material={mats.body} position={[0.5, 0.62, 0]} />
      <mesh geometry={geo.beak} material={mats.accent} position={[0.92, 0.56, 0]} />
      <mesh geometry={geo.eye} material={mats.ink} position={[0.76, 0.74, 0.25]} />
      <mesh geometry={geo.eye} material={mats.ink} position={[0.76, 0.74, -0.25]} />
    </group>
  );
}

/** One keycap with a legend; `press` animates it down and back. */
function Keycap({ mats, legend, press, accent }: { mats: Mats; legend: string; press: Age; accent?: boolean }) {
  const g = useRef<Group>(null);
  const geo = useMemo(
    () => ({
      skirt: new RoundedBoxGeometry(0.92, 0.42, 0.92, 4, 0.1),
      top: new RoundedBoxGeometry(0.72, 0.14, 0.72, 4, 0.06),
    }),
    [],
  );
  useEffect(() => () => Object.values(geo).forEach((x) => x.dispose()), [geo]);
  useFrame(() => {
    const a = press();
    if (g.current) g.current.position.y = a < 0.25 ? -Math.sin((a / 0.25) * Math.PI) * 0.16 : 0;
  });
  return (
    <group ref={g}>
      <mesh geometry={geo.skirt} material={accent ? mats.accent : mats.body} />
      <mesh geometry={geo.top} material={accent ? mats.accent : mats.body} position={[0, 0.25, 0]} />
      <KineticText
        font="mono"
        text={legend}
        size={0.38}
        depth={0.06}
        position={[0, 0.34, 0.02]}
        rotation={[-Math.PI / 2, 0, 0]}
        progress={() => 1}
      />
    </group>
  );
}

function Mug({ mats, age }: { mats: Mats; age: Age }) {
  const g = useRef<Group>(null);
  const steam = useRef<Group>(null);
  const geo = useMemo(() => {
    const profile = [
      new Vector2(0, -0.55),
      new Vector2(0.5, -0.55),
      new Vector2(0.55, -0.45),
      new Vector2(0.58, 0.5),
      new Vector2(0.5, 0.5),
      new Vector2(0.47, -0.42),
      new Vector2(0, -0.42),
    ];
    const wisp = (o: number) =>
      new TubeGeometry(
        new CatmullRomCurve3([0, 1, 2, 3, 4].map((i) => new Vector3(Math.sin(i * 1.4 + o) * 0.12, i * 0.22, 0))),
        24,
        0.035,
        6,
      );
    return {
      cup: new LatheGeometry(profile, 28),
      coffee: new CylinderGeometry(0.47, 0.47, 0.02, 24),
      handle: new TorusGeometry(0.24, 0.07, 10, 20, Math.PI * 1.2).rotateZ(-Math.PI * 0.6),
      wisps: [wisp(0), wisp(2)],
    };
  }, []);
  useEffect(
    () => () => {
      geo.cup.dispose();
      geo.coffee.dispose();
      geo.handle.dispose();
      geo.wisps.forEach((w) => w.dispose());
    },
    [geo],
  );
  useFrame((state) => {
    const a = age();
    if (g.current) g.current.rotation.y = a < 1 ? (1 - Math.pow(1 - a, 3)) * Math.PI * 2 : 0;
    const t = state.clock.elapsedTime;
    steam.current?.children.forEach((c, i) => {
      const phase = (t * 0.5 + i * 0.5) % 1;
      c.position.y = 0.6 + phase * 0.5;
      c.scale.setScalar((1 - phase) * (a < 1.2 ? 1.6 : 1));
    });
  });
  return (
    <group ref={g}>
      <mesh geometry={geo.cup} material={mats.body} />
      <mesh geometry={geo.coffee} material={mats.ink} position={[0, 0.38, 0]} />
      <mesh geometry={geo.handle} material={mats.body} position={[0.6, 0, 0]} />
      <group ref={steam}>
        {geo.wisps.map((w, i) => (
          <mesh key={i} geometry={w} material={mats.ink} position={[(i - 0.5) * 0.25, 0.6, 0]} />
        ))}
      </group>
    </group>
  );
}

function PaperPlane({ age }: { age: Age }) {
  const g = useRef<Group>(null);
  const sheet = useMemo(() => {
    const m = createInkMaterial({ fill: Fill.sheet });
    m.side = DoubleSide;
    return m;
  }, []);
  useEffect(() => () => sheet.dispose(), [sheet]);
  const geometry = useMemo(() => {
    // Two wings and a keel, folded from one sheet.
    const v = [
      [1.1, 0, 0], [-0.7, 0, 0.62], [-0.7, 0.02, 0],
      [1.1, 0, 0], [-0.7, 0.02, 0], [-0.7, 0, -0.62],
      [1.1, 0, 0], [-0.7, 0.02, 0], [-0.7, -0.28, 0],
    ].flat();
    const b = new BufferGeometry();
    b.setAttribute("position", new BufferAttribute(new Float32Array(v), 3));
    b.computeVertexNormals();
    return b;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    const a = age();
    if (!g.current) return;
    // Loop-the-loop.
    const k = a < 1.1 ? a / 1.1 : 1;
    const ang = k * Math.PI * 2;
    g.current.position.set(Math.sin(ang) * 0.6, (1 - Math.cos(ang)) * 0.8, 0);
    g.current.rotation.z = a < 1.1 ? ang : 0;
  });
  return (
    <group ref={g}>
      <mesh geometry={geometry} material={sheet} />
    </group>
  );
}

function Floppy({ mats, age }: { mats: Mats; age: Age }) {
  const g = useRef<Group>(null);
  const geo = useMemo(
    () => ({
      shell: new RoundedBoxGeometry(1.2, 1.2, 0.12, 2, 0.04),
      shutter: new BoxGeometry(0.62, 0.42, 0.14),
      label: new PlaneGeometry(0.86, 0.5),
    }),
    [],
  );
  useEffect(() => () => Object.values(geo).forEach((x) => x.dispose()), [geo]);
  useFrame(() => {
    const a = age();
    if (g.current) g.current.rotation.y = a < 0.8 ? (1 - Math.pow(1 - a / 0.8, 3)) * Math.PI : 0;
  });
  return (
    <group ref={g}>
      <mesh geometry={geo.shell} material={mats.body} />
      <mesh geometry={geo.shutter} material={mats.ink} position={[0.05, 0.36, 0]} />
      <mesh geometry={geo.label} material={mats.paper} position={[0, -0.26, 0.065]} />
      <KineticText font="mono" text="QWQ.SYS" size={0.12} depth={0.02} position={[0, -0.24, 0.08]} progress={() => 1} />
    </group>
  );
}

function PuzzleCube({ mats, age }: { mats: Mats; age: Age }) {
  const top = useRef<Group>(null);
  const turns = useRef({ count: 0, prevAge: -1 });
  const geo = useMemo(() => new RoundedBoxGeometry(0.46, 0.46, 0.46, 3, 0.07), []);
  useEffect(() => () => geo.dispose(), [geo]);
  const cells = useMemo(() => [-0.25, 0.25].flatMap((x) => [-0.25, 0.25].map((z) => [x, z] as const)), []);
  useFrame(() => {
    const a = age();
    const t = turns.current;
    // Each poke resets the age; count them, and ease the newest quarter turn in.
    if (a < t.prevAge) t.count++;
    t.prevAge = a;
    const k = a < 0.4 ? 1 - Math.pow(1 - a / 0.4, 3) : 1;
    if (top.current) top.current.rotation.y = t.count > 0 ? ((t.count - 1 + k) * Math.PI) / 2 : 0;
  });
  return (
    <group>
      {cells.map(([x, z], i) => (
        <mesh key={`b${i}`} geometry={geo} material={(i % 3 === 0 ? mats.accent : mats.body)} position={[x, -0.25, z]} />
      ))}
      <group ref={top}>
        {cells.map(([x, z], i) => (
          <mesh key={`t${i}`} geometry={geo} material={(i % 2 === 0 ? mats.body : mats.accent)} position={[x, 0.25, z]} />
        ))}
      </group>
    </group>
  );
}

/* ---------- the shelf: layout, burst, hover, drag, poke ---------- */

type ToySpec = {
  id: string;
  anchor: [number, number, number];
  rest: [number, number, number];
  scale: number;
  sound: string;
};

const SPECS: ToySpec[] = [
  { id: "duck", anchor: [-3.7, 1.5, 4], rest: [0.1, 0.6, 0], scale: 0.9, sound: "quack" },
  { id: "keys", anchor: [3.4, 1.7, 4], rest: [0.7, -0.4, 0], scale: 0.85, sound: "key" },
  { id: "mug", anchor: [-4.1, -1.6, 4.4], rest: [0.2, 0.5, 0], scale: 0.85, sound: "pop" },
  { id: "plane", anchor: [3.9, -1.3, 4.4], rest: [0.4, -0.5, 0.15], scale: 0.9, sound: "whoosh" },
  { id: "floppy", anchor: [-1.5, -2.3, 5], rest: [0.3, 0.4, 0], scale: 0.85, sound: "tick" },
  { id: "cube", anchor: [1.6, -2.4, 5], rest: [0.5, 0.6, 0], scale: 0.9, sound: "key" },
];

/**
 * When the sheet tears, six little desk toys burst out of the hole and hang
 * around QwQ until the camera flies on. Poke them; drag to spin them.
 */
export function Toys() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const mats = useToyMaterials();
  const groups = useRef<(Group | null)[]>([]);
  const pokedAt = useRef<number[]>(SPECS.map(() => -99));
  const keyPressed = useRef<number[]>([-99, -99, -99]);
  const spin = useRef(SPECS.map(() => ({ angle: 0, vel: 0, hover: 0, hovered: false })));
  const grab = useRef<{ index: number; x: number; moved: boolean; key?: number } | null>(null);
  const typed = useRef<string[]>([]);
  const clock = useRef(0);

  // Origin of the burst: the tear's focus, just behind the sheet.
  const hero = heroPlacement(camera, size.width / size.height);
  const k = PAPER_DIST / HERO_DIST;
  const origin = useMemo(() => new Vector3(hero.x * k, hero.y * k, -1.6), [hero.x, hero.y, k]);

  const poke = (index: number, key?: number) => {
    pokedAt.current[index] = clock.current;
    const spec = SPECS[index];
    play(spec.sound);
    if (spec.id === "keys" && key !== undefined) {
      keyPressed.current[key] = clock.current;
      typed.current = [...typed.current, "QWQ"[key]].slice(-3);
      if (typed.current.join("") === "QWQ") {
        typed.current = [];
        emit("party", { seconds: 4 });
        emit("face", { expression: "^w^", duration: 4 });
        play("party");
      }
    } else {
      emit("face", { expression: index % 2 ? "OwO" : ">w<", duration: 0.8 });
    }
  };

  useEffect(() => {
    // Our own picking, in the capture phase so a toy claims the press before
    // the world's shockwave or QwQ's poke see it.
    const ray = new Raycaster();
    const ndc = new Vector2();
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || frameState.s < 0.4 || frameState.s > 1.05) return;
      const live = groups.current.filter((g): g is Group => Boolean(g?.visible));
      if (!live.length) return;
      ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(live, true)[0];
      if (!hit) return;
      let index = -1;
      let key: number | undefined;
      for (let o: Object3D | null = hit.object; o; o = o.parent) {
        if (key === undefined && typeof o.userData.key === "number") key = o.userData.key;
        if (typeof o.userData.toy === "number") {
          index = o.userData.toy;
          break;
        }
      }
      if (index < 0) return;
      claimPointer();
      grab.current = { index, x: e.clientX, moved: false, key };
    };
    window.addEventListener("pointerdown", onDown, { capture: true });
    const onMove = (e: PointerEvent) => {
      const g = grab.current;
      if (!g) return;
      const dx = e.clientX - g.x;
      if (Math.abs(dx) > 4) g.moved = true;
      spin.current[g.index].vel = dx * 0.6;
      g.x = e.clientX;
    };
    const onUp = () => {
      const g = grab.current;
      if (g && !g.moved) poke(g.index, g.key);
      grab.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointerdown", onDown, { capture: true });
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [camera]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    clock.current += dt;
    const s = frameState.s;
    const t = state.clock.elapsedTime;
    SPECS.forEach((spec, i) => {
      const g = groups.current[i];
      if (!g) return;
      const b = clamp01((s - 0.36 - i * 0.025) / 0.16);
      g.visible = b > 0 && s < 1.05 && frameState.game < 0.5 && frameState.overview < 0.3;
      if (!g.visible) return;
      const e = easeOutBack(b);
      g.position.lerpVectors(origin, new Vector3(...spec.anchor), e);
      g.position.y += Math.sin(t * 1.3 + i * 1.7) * 0.08 * b;
      const sp = spin.current[i];
      sp.vel *= Math.pow(0.08, dt);
      sp.angle += sp.vel * dt;
      sp.hover += ((sp.hovered ? 1 : 0) - sp.hover) * Math.min(dt * 10, 1);
      g.rotation.set(spec.rest[0] + (1 - b) * 4, spec.rest[1] + sp.angle + (1 - b) * 6 + Math.sin(t * 0.6 + i) * 0.15, spec.rest[2]);
      g.scale.setScalar(spec.scale * (0.25 + 0.75 * b) * (1 + sp.hover * 0.08));
    });
  });

  const handlers = (index: number) => ({
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      spin.current[index].hovered = true;
      document.documentElement.dataset.cursorLabel = "POKE";
    },
    onPointerOut: () => {
      spin.current[index].hovered = false;
      delete document.documentElement.dataset.cursorLabel;
    },
  });

  const age = (i: number) => () => clock.current - pokedAt.current[i];
  const keyAge = (k: number) => () => clock.current - keyPressed.current[k];

  const bodies = [
    <Duck key="duck" mats={mats} age={age(0)} />,
    <group key="keys">
      {["Q", "W", "Q"].map((legend, kIndex) => (
        <group key={kIndex} position={[(kIndex - 1) * 1.02, 0, 0]} userData={{ key: kIndex }}>
          <Keycap mats={mats} legend={legend} press={keyAge(kIndex)} accent={kIndex === 1} />
        </group>
      ))}
    </group>,
    <Mug key="mug" mats={mats} age={age(2)} />,
    <PaperPlane key="plane" age={age(3)} />,
    <Floppy key="floppy" mats={mats} age={age(4)} />,
    <PuzzleCube key="cube" mats={mats} age={age(5)} />,
  ];

  return (
    <group>
      {SPECS.map((spec, i) => (
        <group
          key={spec.id}
          ref={(g) => {
            groups.current[i] = g;
          }}
          visible={false}
          userData={{ toy: i }}
          {...handlers(i)}
        >
          {bodies[i]}
        </group>
      ))}
    </group>
  );
}
