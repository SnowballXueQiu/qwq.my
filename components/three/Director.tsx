"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from "three";
import { on } from "@/lib/fx";
import { getSceneTime } from "@/lib/sceneClock";
import { itemAt } from "@/lib/sheetLengths";
import { getScrollVelocity, prefersReducedMotion } from "@/lib/scroll";
import { play, setAmbientSpeed } from "@/lib/sound";
import { useSite } from "@/lib/store";
import { pipelineTarget, postFx } from "./pipeline/InkPipeline";
import { frameState, smooth } from "./frameState";
import { BASE_FOV } from "./framing";
import { hudState } from "./hudState";
import { MAP_S, WORLD, buildCameraKeys, type CameraKey } from "./world";
import { projects } from "@/content/projects";
import { skillGroups } from "@/content/skills";

/**
 * Monotone cubic (Fritsch–Carlson) tangents for one channel of the keys:
 * velocity is continuous through every key, nothing overshoots, and where two
 * keys hold the same value (a stop) the camera really stands still.
 */
function monotoneTangents(xs: number[], ys: number[]) {
  const n = xs.length;
  const d = Array.from({ length: n - 1 }, (_, i) => (ys[i + 1] - ys[i]) / Math.max(xs[i + 1] - xs[i], 1e-6));
  const m = Array.from({ length: n }, (_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const h = Math.hypot(a, b);
    if (h > 3) {
      m[i] = (3 / h) * a * d[i];
      m[i + 1] = (3 / h) * b * d[i];
    }
  }
  // The film starts and ends at rest.
  m[0] = 0;
  m[n - 1] = 0;
  return m;
}

/** Camera keyframes along scene time, joined by a monotone cubic. Returns a sampler. */
function cameraSpline(keys: CameraKey[]) {
  const xs = keys.map((k) => k.s);
  const channels = [
    ...[0, 1, 2].map((c) => keys.map((k) => k.pos[c])),
    ...[0, 1, 2].map((c) => keys.map((k) => k.look[c])),
    keys.map((k) => k.roll ?? 0),
  ];
  const tangents = channels.map((ys) => monotoneTangents(xs, ys));
  const out = new Array<number>(channels.length);
  /** Camera position and target at scene time `s`; returns the dutch angle in degrees. */
  return (s: number, pos: Vector3, target: Vector3) => {
    const x = Math.min(Math.max(s, xs[0]), xs[xs.length - 1]);
    let i = 0;
    while (i < xs.length - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i] || 1e-6;
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    for (let c = 0; c < channels.length; c++) {
      const y = channels[c];
      const m = tangents[c];
      out[c] = h00 * y[i] + h10 * h * m[i] + h01 * y[i + 1] + h11 * h * m[i + 1];
    }
    pos.set(out[0], out[1], out[2]);
    target.set(out[3], out[4], out[5]);
    return out[6];
  };
}

export const sampleCamera = cameraSpline(buildCameraKeys());
const sampleCameraPortrait = cameraSpline(buildCameraKeys(true));

/** Moments where the edit cuts: a gentle push-in and a short glitch tail (no full-frame flashes: photosensitive-safe). */
const CUTS = [0.47, 2.0, 3.0, 4.0, 5.0, 5.78];

/** Overview map: high and off to the side, taking in the whole flight path. */
const OVERVIEW_POS = new Vector3(165, 195, 45);
const OVERVIEW_LOOK = new Vector3(0, -10, -185);
/** The debug-mode arena: empty sky far above the flight path. */
export const ARENA = new Vector3(0, 800, 0);
const ARENA_LOOK = new Vector3(0, 800, -100);
const scratchPos = new Vector3();
const scratchLook = new Vector3();

const parallax = { x: 0, y: 0 };
const anchorWorld = new Vector3();

/** What the active sheet's panel points at in the world, if anything. */
function anchorFor(s: number): { label: string } | null {
  const sheet = Math.floor(s);
  const f = s - sheet;
  if (sheet === 1) {
    if (s >= MAP_S.arrive) return null; // the map labels itself
    anchorWorld.set(0, 1.1, WORLD.about.z);
    return { label: "REF 02-A · init(me)" };
  }
  if (sheet === 2) {
    const i = itemAt("skills", f, skillGroups.length);
    anchorWorld.set(0.4, 2.6, WORLD.skills.start - WORLD.skills.spacing * i);
    return { label: `REF 03-${String(i + 1).padStart(2, "0")} · ${skillGroups[i].code}` };
  }
  if (sheet === 3) {
    const i = itemAt("projects", f, projects.length);
    const side = i % 2 === 0 ? 1 : -1;
    anchorWorld.set(side * WORLD.projects.side, 0, WORLD.projects.start - WORLD.projects.spacing * i);
    return { label: `REF 04-${String(i + 1).padStart(2, "0")} · ${projects[i].title}` };
  }
  // The timeline's roadside signs label themselves; a leader line would only cover them.
  return null;
}

/** Turns scroll into camera motion, hero choreography and the scene's light/dark. */
export function Director() {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);

  // The camera joins the scene so things can ride along with it (the mascot companion).
  useEffect(() => {
    scene.add(camera);
    return () => {
      scene.remove(camera);
    };
  }, [scene, camera]);

  const { cut, pos, target, fx } = useMemo(
    () => ({
      cut: { last: -1, at: -10 },
      pos: new Vector3(),
      target: new Vector3(),
      // Effects requested from outside the canvas, as wall-clock deadlines.
      fx: { glitchUntil: 0, glitchAmount: 0, menu: false, partyUntil: 0 },
    }),
    [],
  );

  useEffect(() => {
    const offs = [
      on("party", ({ seconds }) => {
        fx.partyUntil = performance.now() + seconds * 1000;
      }),
      on("menu", ({ open }) => {
        fx.menu = open;
        play("whoosh", 1.4);
      }),
      on("glitch", ({ duration = 0.6, amount = 1 }) => {
        fx.glitchUntil = performance.now() + duration * 1000;
        fx.glitchAmount = amount;
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [fx]);

  useFrame((state, delta) => {
    // Reading pages keep the sheet whole and park QwQ in the corner to read along.
    const reading = useSite.getState().reading;
    const s = reading ? 0 : getSceneTime();
    const now = state.clock.elapsedTime;

    frameState.s = s;
    frameState.depth = reading ? 1 : smooth(0.1, 0.36, s);
    frameState.breakAmount = reading ? 0 : smooth(0.3, 0.95, s) * 1.7;
    frameState.leap = reading ? 1 : smooth(0.38, 0.58, s);
    frameState.park = reading ? 1 : smooth(0.8, 1.0, s);
    frameState.finale = reading ? 0 : smooth(5.58, 5.96, s);

    const calm = prefersReducedMotion();
    let roll = (state.size.width < state.size.height ? sampleCameraPortrait : sampleCamera)(s, pos, target);
    frameState.cameraZ = pos.z;

    // Speed: Lenis velocity, smoothed, as a 0–1 magnitude.
    const v = calm ? 0 : getScrollVelocity();
    frameState.velocity += (v - frameState.velocity) * Math.min(delta * 4, 1);
    frameState.speed = Math.min(Math.abs(frameState.velocity) / 40, 1);
    const sinceCut = state.clock.elapsedTime - cut.at;
    frameState.sinceCut = sinceCut;
    // A gentle push-in after each cut (eases out over ~0.8s).
    const punch = calm ? 0 : sinceCut < 1.2 ? Math.pow(1 - sinceCut / 1.2, 3) : 0;

    // Hand-held: the pointer nudges the camera, cuts shake it, speed leans it.
    parallax.x += (state.pointer.x - parallax.x) * Math.min(delta * 3, 1);
    parallax.y += (state.pointer.y - parallax.y) * Math.min(delta * 3, 1);
    const free = calm ? 0 : 1 - Math.max(frameState.overview, frameState.game);
    const t = state.clock.elapsedTime;
    pos.x += parallax.x * 0.55 * free;
    pos.y += parallax.y * 0.35 * free;
    roll += frameState.velocity * 0.04 * free;
    // Ease toward (or back from) the overview map.
    frameState.overview += ((fx.menu ? 1 : 0) - frameState.overview) * (1 - Math.exp(-Math.min(delta, 0.1) * 2.6));
    const o = smooth(0, 1, frameState.overview);
    if (o > 0.0005) {
      pos.lerp(scratchPos.copy(OVERVIEW_POS), o);
      target.lerp(scratchLook.copy(OVERVIEW_LOOK), o);
    }
    const g = smooth(0, 1, frameState.game);
    if (g > 0.0005) {
      pos.lerp(scratchPos.copy(ARENA), g);
      target.lerp(scratchLook.copy(ARENA_LOOK), g);
    }
    camera.position.copy(pos);
    camera.lookAt(target);
    camera.rotateZ(((roll * (1 - Math.max(o, g))) * Math.PI) / 180);
    if (camera instanceof PerspectiveCamera) {
      // Warp wider with speed; punch in on every cut.
      const fov = BASE_FOV + frameState.speed * 6 * free - punch * 3;
      const far = 220 + o * 1200;
      if (Math.abs(camera.far - far) > 1 || Math.abs(camera.fov - fov) > 0.01) {
        camera.far = far;
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    }

    // Publish readouts for the DOM HUD.
    const h = hudState;
    h.cam.x = camera.position.x;
    h.cam.y = camera.position.y;
    h.cam.z = camera.position.z;
    h.cam.fov = camera instanceof PerspectiveCamera ? camera.fov : BASE_FOV;
    h.cam.roll = roll % 360;
    h.cam.yaw = (Math.atan2(target.x - pos.x, -(target.z - pos.z)) * 180) / Math.PI;
    h.fps += (1 / Math.max(delta, 1e-3) - h.fps) * 0.05;
    h.frame++;
    h.velocity = frameState.velocity;
    h.speed = frameState.speed;
    h.sinceCut = sinceCut;
    h.toyTime = !reading && s > 0.52 && s < 0.8 && free > 0.5;
    const anchor = free > 0.5 ? anchorFor(s) : null;
    if (anchor) {
      anchorWorld.project(camera);
      h.anchor.visible = anchorWorld.z < 1 && Math.abs(anchorWorld.x) < 1.2 && Math.abs(anchorWorld.y) < 1.2;
      h.anchor.x = ((anchorWorld.x + 1) / 2) * state.size.width;
      h.anchor.y = ((1 - anchorWorld.y) / 2) * state.size.height;
      h.anchor.label = anchor.label;
    } else {
      h.anchor.visible = false;
    }

    // Party: everything on the beat.
    const partying = performance.now() < fx.partyUntil;
    frameState.party += ((partying ? 1 : 0) - frameState.party) * Math.min(delta * 4, 1);
    // A smooth sway, not a strobe.
    const beat = partying ? 0.5 + 0.5 * Math.sin(t * 2.4) : 0;

    // Lens and film.
    const transit = o > 0.03 && o < 0.97 ? 0.6 : 0;
    postFx.speed = calm ? 0 : smooth(0.2, 1, frameState.speed) * free;
    postFx.aberration = calm ? 0 : frameState.speed * 0.6 + punch * 0.8 + pipelineTarget.glitch * 0.7 + beat * 0.5;
    postFx.crt = calm ? 0 : Math.max(punch * 0.9, transit, pipelineTarget.glitch * 0.6);
    postFx.vignette = 0.35 + frameState.speed * 0.3;

    // The game always plays in the dark arena, whatever sheet it was launched from.
    const inGame = frameState.game > 0.5;
    const dark = (s > 0.62 && s < 5.78) || inGame;
    pipelineTarget.invert = dark ? 1 : 0;
    pipelineTarget.bgInvert = s < 5.78 || inGame ? 1 : 0;

    for (const c of CUTS) {
      if (cut.last >= 0 && (cut.last - c) * (s - c) < 0) {
        cut.at = now;
        play("whoosh");
      }
    }
    // The sheet starts to give way.
    if (cut.last >= 0 && cut.last < 0.32 && s >= 0.32) play("tear");
    setAmbientSpeed(frameState.speed);
    cut.last = s;
    const since = now - cut.at;
    const wall = performance.now();
    // No strobing for people who asked the OS for less motion.
    if (prefersReducedMotion()) {
      pipelineTarget.glitch = 0;
      return;
    }
    pipelineTarget.glitch = Math.max(Math.max(0, 1 - since / 0.3) * 0.35, wall < fx.glitchUntil ? fx.glitchAmount : 0);
  }, -1);

  return null;
}
