"use client";

import { useRef } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { Group, PerspectiveCamera, Vector3 } from "three";
import { EYE_X, EYE_Y, Mascot, type MascotHandle } from "../mascot/Mascot";
import { hudState } from "../hudState";
import { PaperSheet } from "../paper/PaperSheet";
import { frameState, mix } from "../frameState";
import { COVER_FOV, HERO_DIST, PAPER_DIST, frustumAt, heroPlacement } from "../framing";

/**
 * The opening: a line drawing of QwQ on a sheet of paper. Scrolling gives it
 * volume, tears the sheet open, the mascot leaps at the camera, then parks in
 * the corner as a companion for the rest of the ride.
 */
export function HeroStage() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const aspect = size.width / size.height;
  const rig = useRef<Group>(null);
  const mascot = useRef<MascotHandle | null>(null);
  const breakRef = useRef(0);
  const paper = useRef<Group>(null);

  const hero = heroPlacement(camera, aspect);
  const sheet = frustumAt(camera, PAPER_DIST, aspect);
  const cover = frustumAt(camera, PAPER_DIST, aspect, COVER_FOV);
  const k = PAPER_DIST / HERO_DIST;

  const probe = useRef({ c: new Vector3(), e: new Vector3() });

  useFrame((state) => {
    const f = frameState;
    breakRef.current = f.breakAmount;
    if (mascot.current) {
      mascot.current.depth = Math.max(f.depth, 0.02);
      // A flat drawing has no shading yet; light arrives with the volume.
      for (const m of mascot.current.materials) m.uniforms.uToneBias.value = (1 - f.depth) * 0.5;
    }
    if (paper.current) paper.current.visible = f.s < 1.3 && f.game < 0.5;

    const g = rig.current;
    if (!g) return;
    const portrait = aspect < 1;
    // During the game QwQ watches from the corner, whatever the scroll says.
    const park = Math.max(f.park, f.game);
    const leap = Math.max(f.leap, f.game);
    const finale = f.finale * (1 - f.game);
    const near = frustumAt(camera, 11, aspect);
    const corner = frustumAt(camera, 9, aspect);
    // hero → leap (toward the lens) → park (companion corner) → finale (centre stage)
    // Hop forward to centre stage among the toys — not into the lens.
    let x = mix(hero.x, 0, leap);
    let y = mix(hero.y, near.halfH * 0.12, leap);
    let z = mix(-HERO_DIST, -11, leap);
    let s = mix(hero.scale, hero.scale * 0.72, leap);
    x = mix(x, corner.halfW * (portrait ? 0.62 : 0.82), park);
    y = mix(y, -corner.halfH * (portrait ? 0.62 : 0.42), park);
    z = mix(z, -9, park);
    s = mix(s, hero.scale * (portrait ? 0.3 : 0.24), park);
    // Land exactly where it started: the last sheet mirrors the first.
    x = mix(x, hero.x, finale);
    y = mix(y, hero.y, finale);
    z = mix(z, -HERO_DIST, finale);
    s = mix(s, hero.scale, finale);
    g.position.set(x, y, z);
    g.scale.setScalar(s);
    // A little spin as it bursts through.
    g.rotation.z = Math.sin(leap * Math.PI) * 0.12 * (1 - park);

    // Where the eyes are on screen, so the HUD can dimension the drawing.
    hudState.eyesVisible = f.s < 0.42 && f.game < 0.5 && !portrait;
    if (hudState.eyesVisible) {
      g.updateWorldMatrix(true, false);
      const { c, e } = probe.current;
      [-1, 1].forEach((side, i) => {
        c.set(side * EYE_X, EYE_Y, 0);
        g.localToWorld(c);
        e.set(side * EYE_X + 1.27, EYE_Y, 0);
        g.localToWorld(e);
        c.project(state.camera);
        e.project(state.camera);
        const w = state.size.width;
        const h = state.size.height;
        const eye = hudState.eyes[i];
        eye.x = ((c.x + 1) / 2) * w;
        eye.y = ((1 - c.y) / 2) * h;
        eye.r = Math.abs(((e.x - c.x) / 2) * w);
      });
    }
  });

  return (
    <>
      <group ref={paper} position={[0, 0, HERO_DIST - PAPER_DIST]}>
        <PaperSheet
          width={cover.halfW * 2 * 1.08}
          height={cover.halfH * 2 * 1.08}
          focus={[hero.x * k, hero.y * k]}
          pxToWorld={(sheet.halfH * 2) / size.height}
          breakRef={breakRef}
        />
      </group>
      {createPortal(
        <group ref={rig}>
          <Mascot handle={mascot} />
        </group>,
        camera,
      )}
    </>
  );
}
