"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import {
  BoxGeometry,
  BufferGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  Object3D,
  TetrahedronGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { emit } from "@/lib/fx";
import { GAME_LENGTH, useGame } from "@/lib/game";
import { createInkMaterial, Fill } from "../materials/inkMaterial";
import { frameState } from "../frameState";
import { ARENA } from "../Director";
import { HudRings } from "../stages/HudRings";

const SLOTS = 22;
const SHARDS = 180;
const SPAWN_Z = -72;
const REACH_Z = -3.2;

type Bug = {
  alive: boolean;
  t: number;
  duration: number;
  from: Vector3;
  to: Vector3;
  wobble: number;
  phase: number;
  golden: boolean;
};

type Shard = { life: number; pos: Vector3; vel: Vector3; spin: Vector3; rot: Vector3 };

function buildBugGeometry() {
  const body = new IcosahedronGeometry(1, 1).scale(0.55, 0.36, 0.82);
  const head = new IcosahedronGeometry(0.3, 0).translate(0, 0.05, 0.9);
  const antennaL = new BoxGeometry(0.04, 0.04, 0.7).rotateY(0.45).rotateX(-0.5).translate(-0.2, 0.32, 1.25);
  const antennaR = new BoxGeometry(0.04, 0.04, 0.7).rotateY(-0.45).rotateX(-0.5).translate(0.2, 0.32, 1.25);
  const strip = (g: BufferGeometry) => {
    g.deleteAttribute("uv");
    return g.index ? g.toNonIndexed() : g;
  };
  const shell = mergeGeometries([body, head, antennaL, antennaR].map(strip))!;
  const legs = (side: number) =>
    mergeGeometries(
      [-0.45, 0, 0.45].map((z, i) =>
        strip(new BoxGeometry(0.85, 0.06, 0.06).rotateZ(side * -0.35).rotateY(side * (i - 1) * 0.35).translate(side * 0.75, -0.18, z)),
      ),
    )!;
  return { shell, legsL: legs(-1), legsR: legs(1) };
}

/** Launches up to `count` idle shards from a point in a little explosion. */
function burstShards(shards: Shard[], at: Vector3, count: number) {
  let made = 0;
  for (const s of shards) {
    if (s.life > 0) continue;
    s.life = 0.7 + Math.random() * 0.3;
    s.pos.copy(at);
    s.vel.set((Math.random() - 0.5) * 14, (Math.random() - 0.3) * 12, (Math.random() - 0.2) * 10);
    s.spin.set(Math.random() * 12, Math.random() * 12, Math.random() * 12);
    if (++made >= count) break;
  }
}

/** Wakes an idle slot as a new bug; later in the round they come faster. */
function spawnBug(bugs: Bug[], difficulty: number) {
  const slot = bugs.find((b) => !b.alive);
  if (!slot) return;
  slot.alive = true;
  slot.t = 0;
  slot.golden = Math.random() < 0.08;
  slot.duration = (5.2 - difficulty * 2.8) * (slot.golden ? 0.7 : 1);
  slot.from.set((Math.random() - 0.5) * 26, (Math.random() - 0.5) * 14, SPAWN_Z);
  slot.to.set((Math.random() - 0.5) * 3.5, (Math.random() - 0.5) * 2, REACH_Z);
  slot.wobble = 2 + Math.random() * 4;
  slot.phase = Math.random() * Math.PI * 2;
}

const nextSpawnDelay = (difficulty: number) => 1.15 - difficulty * 0.8 + Math.random() * 0.3;

/**
 * Debug mode: low-poly bugs crawl out of the depth toward the lens. Squash
 * them before they reach you. Lives in camera space so it plays anywhere.
 */
export function BugGame() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const geo = useMemo(() => ({ ...buildBugGeometry(), shard: new TetrahedronGeometry(0.22, 0) }), []);
  const mats = useMemo(
    () => ({
      shell: createInkMaterial(),
      golden: createInkMaterial({ accent: 1 }),
      legs: createInkMaterial({ fill: Fill.ink }),
      shard: createInkMaterial({ accent: 1 }),
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

  const bugs = useRef<Bug[]>(
    Array.from({ length: SLOTS }, () => ({
      alive: false,
      t: 0,
      duration: 4,
      from: new Vector3(),
      to: new Vector3(),
      wobble: 0,
      phase: 0,
      golden: false,
    })),
  );
  const shards = useRef<Shard[]>(
    Array.from({ length: SHARDS }, () => ({ life: 0, pos: new Vector3(), vel: new Vector3(), spin: new Vector3(), rot: new Vector3() })),
  );
  const groups = useRef<(Group | null)[]>([]);
  const shells = useRef<(Mesh | null)[]>([]);
  const shardMesh = useRef<InstancedMesh>(null);
  const root = useRef<Group>(null);
  const arena = useRef<Group>(null);
  const clock = useRef({ spawnIn: 0.4, elapsed: 0 });
  const tmp = useMemo(() => ({ v: new Vector3(), w: new Vector3(), dummy: new Object3D() }), []);

  const positionAt = (bug: Bug, u: number, out: Vector3) => {
    out.lerpVectors(bug.from, bug.to, u * u * 0.4 + u * 0.6);
    const sway = Math.sin(u * Math.PI * 3 + bug.phase) * bug.wobble * (1 - u);
    out.x += sway;
    out.y += Math.cos(u * Math.PI * 2 + bug.phase) * bug.wobble * 0.5 * (1 - u);
    return out;
  };

  const squash = (i: number) => {
    const game = useGame.getState();
    const bug = bugs.current[i];
    if (game.status !== "playing" || !bug.alive) return;
    bug.alive = false;
    const g = groups.current[i];
    if (!g) return;
    g.getWorldPosition(tmp.w);
    burstShards(shards.current, g.position.clone(), bug.golden ? 26 : 14);
    const points = game.hit(bug.golden ? 50 : 10);
    const { combo } = useGame.getState();
    tmp.v.copy(tmp.w).project(camera);
    emit("hit", {
      x: ((tmp.v.x + 1) / 2) * size.width,
      y: ((1 - tmp.v.y) / 2) * size.height,
      points,
      combo,
    });
    if (combo >= 3) emit("face", { expression: "^w^", duration: 0.8 });
    else emit("face", { expression: ">w<", duration: 0.5 });
  };

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const game = useGame.getState();
    const active = game.status !== "idle";
    frameState.game += ((active ? 1 : 0) - frameState.game) * Math.min(dt * 5, 1);
    if (root.current) root.current.visible = active;
    if (arena.current) arena.current.visible = frameState.game > 0.02;
    if (!active || game.status === "countdown") {
      bugs.current.forEach((b) => (b.alive = false));
      clock.current = { spawnIn: 0.4, elapsed: 0 };
      if (!active) return;
    }
    if (game.status === "over") bugs.current.forEach((b) => (b.alive = false));

    if (game.status === "playing") {
      game.tick(dt);
      const c = clock.current;
      c.elapsed += dt;
      const difficulty = Math.min(c.elapsed / GAME_LENGTH, 1);
      c.spawnIn -= dt;
      if (c.spawnIn <= 0) {
        c.spawnIn = nextSpawnDelay(difficulty);
        spawnBug(bugs.current, difficulty);
      }
    }

    const t = state.clock.elapsedTime;
    bugs.current.forEach((bug, i) => {
      const g = groups.current[i];
      if (!g) return;
      g.visible = bug.alive;
      if (!bug.alive) return;
      if (game.status === "playing") bug.t += dt;
      const u = Math.min(bug.t / bug.duration, 1);
      positionAt(bug, u, g.position);
      // Face along the path; lookAt wants world space and the bugs live in camera space.
      positionAt(bug, Math.min(u + 0.02, 1), tmp.v);
      if (tmp.v.distanceToSquared(g.position) < 1e-6) tmp.v.z += 1;
      g.lookAt(camera.localToWorld(tmp.v));
      g.scale.setScalar(bug.golden ? 1.15 : 1);
      const legL = g.children[1];
      const legR = g.children[2];
      legL.rotation.x = Math.sin(t * 22 + i) * 0.35;
      legR.rotation.x = -Math.sin(t * 22 + i) * 0.35;
      const shell = shells.current[i];
      if (shell) shell.material = bug.golden ? mats.golden : mats.shell;
      if (u >= 1 && game.status === "playing") {
        bug.alive = false;
        game.miss();
        emit("glitch", { duration: 0.35, amount: 0.9 });
        emit("flash", { duration: 0.08 });
        emit("face", { expression: "QAQ", duration: 1.2 });
      }
    });

    const mesh = shardMesh.current;
    if (mesh) {
      shards.current.forEach((s, i) => {
        if (s.life > 0) {
          s.life -= dt;
          s.vel.y -= 18 * dt;
          s.pos.addScaledVector(s.vel, dt);
          s.rot.addScaledVector(s.spin, dt);
        }
        tmp.dummy.position.copy(s.pos);
        tmp.dummy.rotation.set(s.rot.x, s.rot.y, s.rot.z);
        tmp.dummy.scale.setScalar(s.life > 0 ? Math.min(s.life * 3, 1) : 0.0001);
        tmp.dummy.updateMatrix();
        mesh.setMatrixAt(i, tmp.dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  const bugsInCamera = (
    <group ref={root} visible={false}>
      {Array.from({ length: SLOTS }, (_, i) => (
        <group
          key={i}
          ref={(g) => {
            groups.current[i] = g;
          }}
          visible={false}
          onPointerDown={(e) => {
            // Dead bugs keep their (invisible) hit spheres; let clicks pass through them.
            if (!bugs.current[i].alive) return;
            e.stopPropagation();
            squash(i);
          }}
        >
          <mesh
            ref={(m) => {
              shells.current[i] = m;
            }}
            geometry={geo.shell}
            material={mats.shell}
          />
          <mesh geometry={geo.legsL} material={mats.legs} />
          <mesh geometry={geo.legsR} material={mats.legs} />
          {/* Generous invisible hit area: bugs are small and fast. */}
          <mesh scale={1.5}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshBasicMaterial visible={false} />
          </mesh>
        </group>
      ))}
      <instancedMesh ref={shardMesh} args={[geo.shard, mats.shard, SHARDS]} frustumCulled={false} />
    </group>
  );

  return (
    <>
      {/* A ribbed tunnel in the arena so depth reads while bugs approach. */}
      <group ref={arena} position={ARENA.toArray()} visible={false}>
        <HudRings from={-8} to={-110} radius={16} step={9} />
      </group>
      {createPortal(bugsInCamera, camera)}
    </>
  );
}
