"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group, PerspectiveCamera } from "three";
import { PaperSheet } from "../paper/PaperSheet";
import { frameState, smooth } from "../frameState";
import { COVER_FOV, HERO_DIST, PAPER_DIST, frustumAt, heroPlacement } from "../framing";
import { WORLD } from "../world";

/**
 * The bookend: the torn shards fly back in from behind the camera and lock
 * into a fresh sheet, and QwQ lands on it to wave goodbye.
 */
export function FinaleStage() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const aspect = size.width / size.height;
  const breakRef = useRef(1.7);
  const group = useRef<Group>(null);
  const sheet = frustumAt(camera, PAPER_DIST, aspect);
  const cover = frustumAt(camera, PAPER_DIST, aspect, COVER_FOV);
  const hero = heroPlacement(camera, aspect);
  const k = PAPER_DIST / HERO_DIST;

  useFrame(() => {
    const s = frameState.s;
    breakRef.current = (1 - smooth(5.5, 5.94, s)) * 1.7;
    if (group.current) group.current.visible = s > 4.7;
  });

  return (
    <group ref={group} position={[0, 0, WORLD.contact.z + HERO_DIST - PAPER_DIST]}>
      <PaperSheet
        width={cover.halfW * 2 * 1.08}
        height={cover.halfH * 2 * 1.08}
        focus={[hero.x * k, hero.y * k]}
        pxToWorld={(sheet.halfH * 2) / size.height}
        breakRef={breakRef}
        seed={23}
      />
    </group>
  );
}
