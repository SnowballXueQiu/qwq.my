"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  DepthTexture,
  GLSL3,
  HalfFloatType,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from "three";
import { useSite } from "@/lib/store";
import { palette, srgb } from "@/lib/tokens";
import { sharedUniforms } from "../materials/inkMaterial";
import { compositeFragment, compositeVertex } from "../shaders/composite.glsl";

/** Layer for annotations drawn straight to screen after the ink composite. */
export const OVERLAY_LAYER = 1;

export type PipelineControls = {
  invert: number;
  bgInvert: number;
  flash: number;
  glitch: number;
};

/** Mutable per-frame look; scenes write here, the pipeline eases toward it. */
export const pipelineTarget: PipelineControls = { invert: 0, bgInvert: 0, flash: 0, glitch: 0 };

/** Set while another canvas (the year-in-review player) owns the shared shader clock. */
export const sitePipeline = { paused: false };

/**
 * Takes over rendering: scene → G-buffer (tone/accent/fill + normal/id + depth),
 * then a full-screen composite turns it into ink, then overlays render on top.
 */
export function InkPipeline({
  time,
  controls,
}: {
  /** Drive the shader clock from outside (video frames) instead of wall time. */
  time?: number;
  /** Fixed look for this canvas; when set, the site's director and CSS are left alone. */
  controls?: PipelineControls;
} = {}) {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const target = useMemo(() => {
    const t = new WebGLRenderTarget(1, 1, {
      count: 2,
      type: HalfFloatType,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      depthBuffer: true,
    });
    t.depthTexture = new DepthTexture(1, 1);
    return t;
  }, []);

  const { quadScene, quadCamera, material } = useMemo(() => {
    const material = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: compositeVertex,
      fragmentShader: compositeFragment,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tColor: { value: target.textures[0] },
        tNormal: { value: target.textures[1] },
        tDepth: { value: target.depthTexture },
        uResolution: { value: new Vector2(1, 1) },
        uDpr: { value: 1 },
        uNear: { value: 0.1 },
        uFar: { value: 200 },
        uPaper: { value: new Vector3(...srgb(palette.paper)) },
        uInk: { value: new Vector3(...srgb(palette.ink)) },
        uAccent: { value: new Vector3(...srgb(palette.accent)) },
        uInvert: { value: 0 },
        uBgInvert: { value: 0 },
        uFlash: { value: 0 },
        uGlitch: { value: 0 },
        uBoil: { value: 0.6 },
        uTime: sharedUniforms.uTime,
      },
    });
    const quadScene = new Scene();
    quadScene.add(new Mesh(new PlaneGeometry(2, 2), material));
    return { quadScene, quadCamera: new OrthographicCamera(-1, 1, 1, -1, 0, 1), material };
  }, [target]);


  useEffect(
    () => () => {
      target.dispose();
      material.dispose();
    },
    [target, material],
  );

  useFrame((state, delta) => {
    const { scene, camera } = state;
    const u = material.uniforms;
    // Size the G-buffer here rather than in an effect: a single-frame render
    // (video stills) can happen before effects run.
    const w = Math.max(1, Math.floor(size.width * dpr));
    const h = Math.max(1, Math.floor(size.height * dpr));
    if (target.width !== w || target.height !== h) {
      target.setSize(w, h);
      u.uResolution.value.set(w, h);
      u.uDpr.value = dpr;
    }
    const external = controls !== undefined;
    if (!external && sitePipeline.paused) return;
    if (time !== undefined) sharedUniforms.uTime.value = time;
    else sharedUniforms.uTime.value += Math.min(delta, 0.1);

    if (camera instanceof PerspectiveCamera) {
      u.uNear.value = camera.near;
      u.uFar.value = camera.far;
    }
    if (external) {
      u.uInvert.value = controls.invert;
      u.uBgInvert.value = controls.bgInvert;
      u.uFlash.value = controls.flash;
      u.uGlitch.value = controls.glitch;
    } else {
      const k = 1 - Math.exp(-delta * 10);
      u.uInvert.value += (pipelineTarget.invert - u.uInvert.value) * k;
      u.uBgInvert.value += (pipelineTarget.bgInvert - u.uBgInvert.value) * k;
      u.uFlash.value = pipelineTarget.flash;
      u.uGlitch.value = pipelineTarget.glitch;
      u.uBoil.value = reducedMotion ? 0 : 0.6;
      // Keep the CSS world in step with the shader's notion of light and dark.
      const site = useSite.getState();
      if (Math.abs(site.tone - u.uInvert.value) > 0.01) site.setTone(u.uInvert.value);
    }

    camera.layers.set(0);
    gl.setRenderTarget(target);
    gl.setClearColor(0x000000, 0);
    gl.clear();
    gl.render(scene, camera);

    gl.setRenderTarget(null);
    gl.render(quadScene, quadCamera);

    gl.autoClear = false;
    gl.clearDepth();
    camera.layers.set(OVERLAY_LAYER);
    gl.render(scene, camera);
    camera.layers.set(0);
    gl.autoClear = true;
  }, 1);

  return null;
}
