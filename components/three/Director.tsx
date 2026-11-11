"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from "three";
import { on } from "@/lib/fx";
import { getSceneTime } from "@/lib/sceneClock";
import { pipelineTarget } from "./pipeline/InkPipeline";
import { frameState, smooth } from "./frameState";
import { buildCameraKeys } from "./world";

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
const scratchPos = new Vector3();
const scratchLook = new Vector3();

export function sampleCamera(s: number, pos: Vector3, target: Vector3) {
  let i = 0;
  while (i < KEYS.length - 2 && s > KEYS[i + 1].s) i++;
  const k0 = KEYS[i];
  const k1 = KEYS[i + 1];
  const t = smooth(k0.s, k1.s, s);
  pos.lerpVectors(a.set(...k0.pos), b.set(...k1.pos), t);
  target.lerpVectors(look.set(...k0.look), lookB.set(...k1.look), t);
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
    const s = getSceneTime();
    const now = state.clock.elapsedTime;

    frameState.s = s;
    frameState.depth = smooth(0.1, 0.36, s);
    frameState.breakAmount = smooth(0.3, 0.95, s) * 1.7;
    frameState.leap = smooth(0.4, 0.66, s);
    frameState.park = smooth(0.74, 1.0, s);
    frameState.finale = smooth(5.58, 5.96, s);

    sampleCamera(s, pos, target);
    frameState.cameraZ = pos.z;
    // Ease toward (or back from) the overview map.
    frameState.overview += ((fx.menu ? 1 : 0) - frameState.overview) * (1 - Math.exp(-Math.min(delta, 0.1) * 2.6));
    const o = smooth(0, 1, frameState.overview);
    if (o > 0.0005) {
      pos.lerp(scratchPos.copy(OVERVIEW_POS), o);
      target.lerp(scratchLook.copy(OVERVIEW_LOOK), o);
    }
    camera.position.copy(pos);
    camera.lookAt(target);
    if (camera instanceof PerspectiveCamera) {
      const far = 220 + o * 1200;
      if (Math.abs(camera.far - far) > 1) {
        camera.far = far;
        camera.updateProjectionMatrix();
      }
    }

    const dark = s > 0.62 && s < 5.78;
    pipelineTarget.invert = dark ? 1 : 0;
    pipelineTarget.bgInvert = s < 5.78 ? 1 : 0;

    for (const c of CUTS) {
      if (cut.last >= 0 && (cut.last - c) * (s - c) < 0) cut.at = now;
    }
    cut.last = s;
    const since = now - cut.at;
    const wall = performance.now();
    pipelineTarget.flash = since < 0.09 || wall < fx.flashUntil ? 1 : 0;
    pipelineTarget.glitch = Math.max(
      Math.max(0, 1 - since / 0.4) * 0.9,
      wall < fx.glitchUntil ? fx.glitchAmount : 0,
    );
  }, -1);

  return null;
}
