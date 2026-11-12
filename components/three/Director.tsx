"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from "three";
import { on } from "@/lib/fx";
import { getSceneTime } from "@/lib/sceneClock";
import { getScrollVelocity, prefersReducedMotion } from "@/lib/scroll";
import { useSite } from "@/lib/store";
import { pipelineTarget, postFx } from "./pipeline/InkPipeline";
import { frameState, smooth } from "./frameState";
import { BASE_FOV } from "./framing";
import { hudState } from "./hudState";
import { WORLD, roadX } from "./world";
import { buildCameraKeys } from "./world";
import { projects } from "@/content/projects";
import { timeline } from "@/content/timeline";

/** Camera keyframes along scene time. Between keys the camera eases. */
const KEYS = buildCameraKeys();

/** Moments where the edit hard-cuts: a one-frame inversion flash plus a glitch tail. */
const CUTS = [0.47, 2.0, 3.0, 4.0, 5.0, 5.78];

const a = new Vector3();
const b = new Vector3();
const look = new Vector3();
const lookB = new Vector3();

/** Overview map: high and off to the side, taking in the whole flight path. */
const OVERVIEW_POS = new Vector3(165, 195, 45);
const OVERVIEW_LOOK = new Vector3(0, -10, -185);
/** The debug-mode arena: empty sky far above the flight path. */
export const ARENA = new Vector3(0, 800, 0);
const ARENA_LOOK = new Vector3(0, 800, -100);
const scratchPos = new Vector3();
const scratchLook = new Vector3();

/** Camera position and target at scene time `s`; returns the dutch angle in degrees. */
export function sampleCamera(s: number, pos: Vector3, target: Vector3) {
  let i = 0;
  while (i < KEYS.length - 2 && s > KEYS[i + 1].s) i++;
  const k0 = KEYS[i];
  const k1 = KEYS[i + 1];
  const t = smooth(k0.s, k1.s, s);
  pos.lerpVectors(a.set(...k0.pos), b.set(...k1.pos), t);
  target.lerpVectors(look.set(...k0.look), lookB.set(...k1.look), t);
  return (k0.roll ?? 0) + ((k1.roll ?? 0) - (k0.roll ?? 0)) * t;
}

const parallax = { x: 0, y: 0 };
const anchorWorld = new Vector3();

/** What the active sheet's panel points at in the world, if anything. */
function anchorFor(s: number): { label: string } | null {
  const sheet = Math.floor(s);
  const f = s - sheet;
  if (sheet === 1) {
    anchorWorld.set(0, 1.1, WORLD.about.z);
    return { label: "REF 02-A · init(me)" };
  }
  if (sheet === 2) {
    anchorWorld.set(0, 0, WORLD.skills.start - (WORLD.skills.start - WORLD.skills.end) * f);
    return { label: "REF 03-T · tunnel axis" };
  }
  if (sheet === 3) {
    const i = Math.min(projects.length - 1, Math.floor(f * projects.length));
    const side = i % 2 === 0 ? 1 : -1;
    anchorWorld.set(side * WORLD.projects.side, 0, WORLD.projects.start - WORLD.projects.spacing * i);
    return { label: `REF 04-${String(i + 1).padStart(2, "0")} · ${projects[i].title}` };
  }
  if (sheet === 4) {
    const i = Math.min(timeline.length - 1, Math.floor(f * timeline.length));
    const { start, end } = WORLD.timeline;
    const z = start - ((i + 0.5) / timeline.length) * (start - end);
    anchorWorld.set(roadX(z) + (i % 2 === 0 ? -3 : 3), 2.5, z);
    return { label: `REF 05-${String(i + 1).padStart(2, "0")} · ${timeline[i].date}` };
  }
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
      fx: { flashUntil: 0, glitchUntil: 0, glitchAmount: 0, menu: false },
    }),
    [],
  );

  useEffect(() => {
    const offs = [
      on("flash", ({ duration = 0.12 }) => {
        fx.flashUntil = performance.now() + duration * 1000;
      }),
      on("menu", ({ open }) => {
        fx.menu = open;
        fx.flashUntil = performance.now() + 90;
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
    frameState.leap = reading ? 1 : smooth(0.4, 0.66, s);
    frameState.park = reading ? 1 : smooth(0.74, 1.0, s);
    frameState.finale = reading ? 0 : smooth(5.58, 5.96, s);

    const calm = prefersReducedMotion();
    let roll = sampleCamera(s, pos, target);
    frameState.cameraZ = pos.z;

    // Speed: Lenis velocity, smoothed, as a 0–1 magnitude.
    const v = calm ? 0 : getScrollVelocity();
    frameState.velocity += (v - frameState.velocity) * Math.min(delta * 8, 1);
    frameState.speed = Math.min(Math.abs(frameState.velocity) / 40, 1);
    const sinceCut = state.clock.elapsedTime - cut.at;
    frameState.sinceCut = sinceCut;
    const punch = calm ? 0 : sinceCut < 0.8 ? Math.exp(-sinceCut * 5.5) : 0;

    // Hand-held: the pointer nudges the camera, cuts shake it, speed leans it.
    parallax.x += (state.pointer.x - parallax.x) * Math.min(delta * 3, 1);
    parallax.y += (state.pointer.y - parallax.y) * Math.min(delta * 3, 1);
    const free = calm ? 0 : 1 - Math.max(frameState.overview, frameState.game);
    const t = state.clock.elapsedTime;
    pos.x += (parallax.x * 0.55 + Math.sin(t * 47) * punch * 0.3) * free;
    pos.y += (parallax.y * 0.35 + Math.cos(t * 53) * punch * 0.3) * free;
    roll += (frameState.velocity * 0.12 + Math.sin(t * 31) * punch * 2) * free;
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
      const fov = BASE_FOV + frameState.speed * 10 * free - punch * 9;
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

    // Lens and film.
    const transit = o > 0.03 && o < 0.97 ? 0.6 : 0;
    postFx.speed = calm ? 0 : smooth(0.2, 1, frameState.speed) * free;
    postFx.aberration = calm ? 0 : frameState.speed * 0.6 + punch * 0.8 + pipelineTarget.glitch * 0.7;
    postFx.crt = calm ? 0 : Math.max(punch * 0.9, transit, pipelineTarget.glitch * 0.6);
    postFx.vignette = 0.35 + frameState.speed * 0.3;

    // The game always plays in the dark arena, whatever sheet it was launched from.
    const inGame = frameState.game > 0.5;
    const dark = (s > 0.62 && s < 5.78) || inGame;
    pipelineTarget.invert = dark ? 1 : 0;
    pipelineTarget.bgInvert = s < 5.78 || inGame ? 1 : 0;

    for (const c of CUTS) {
      if (cut.last >= 0 && (cut.last - c) * (s - c) < 0) cut.at = now;
    }
    cut.last = s;
    const since = now - cut.at;
    const wall = performance.now();
    // No strobing for people who asked the OS for less motion.
    if (prefersReducedMotion()) {
      pipelineTarget.flash = 0;
      pipelineTarget.glitch = 0;
      return;
    }
    pipelineTarget.flash = since < 0.09 || wall < fx.flashUntil ? 1 : 0;
    pipelineTarget.glitch = Math.max(
      Math.max(0, 1 - since / 0.4) * 0.9,
      wall < fx.glitchUntil ? fx.glitchAmount : 0,
    );
  }, -1);

  return null;
}
