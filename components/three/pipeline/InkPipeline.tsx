"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  DepthTexture,
  GLSL3,
  HalfFloatType,
  LinearFilter,
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
import { postFragment } from "../shaders/post.glsl";

/** Layer for annotations drawn straight to screen after the ink composite. */
export const OVERLAY_LAYER = 1;

export type PipelineControls = {
  invert: number;
  bgInvert: number;
  glitch: number;
  /** 0 the drawing; 1–8 a single G-buffer channel or composite stage. */
  view?: number;
};

/** Mutable per-frame look; scenes write here, the pipeline eases toward it. */
export const pipelineTarget: PipelineControls = { invert: 0, bgInvert: 0, glitch: 0, view: 0 };

/** Set while another canvas (the year-in-review player) owns the shared shader clock. */
export const sitePipeline = { paused: false };

/** Lens/film effects after the ink pass; the director and click handlers write here. */
export const postFx = {
  aberration: 0,
  crt: 0,
  speed: 0,
  vignette: 0.35,
  shockX: 0.5,
  shockY: 0.5,
  /** Wall-clock ms of the last shockwave, or 0. */
  shockAt: 0,
};

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
        uGlitch: { value: 0 },
        uView: { value: 0 },
        uBoil: { value: 0.6 },
        uTime: sharedUniforms.uTime,
      },
    });
    const quadScene = new Scene();
    quadScene.add(new Mesh(new PlaneGeometry(2, 2), material));
    return { quadScene, quadCamera: new OrthographicCamera(-1, 1, 1, -1, 0, 1), material };
  }, [target]);


  const post = useMemo(() => {
    const rt = new WebGLRenderTarget(1, 1, { minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: true });
    const mat = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: compositeVertex,
      fragmentShader: postFragment,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tScene: { value: rt.texture },
        uResolution: { value: new Vector2(1, 1) },
        uDpr: { value: 1 },
        uTime: sharedUniforms.uTime,
        uAberration: { value: 0 },
        uCRT: { value: 0 },
        uSpeed: { value: 0 },
        uVignette: { value: 0.35 },
        uLine: { value: new Vector3(...srgb(palette.paper)) },
        uShockCenter: { value: new Vector2(0.5, 0.5) },
        uShockAge: { value: -1 },
        uAccent: { value: new Vector3(...srgb(palette.accent)) },
      },
    });
    const scene = new Scene();
    scene.add(new Mesh(new PlaneGeometry(2, 2), mat));
    return { rt, mat, scene };
  }, []);

  useEffect(
    () => () => {
      target.dispose();
      material.dispose();
      post.rt.dispose();
      post.mat.dispose();
    },
    [target, material, post],
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
      post.rt.setSize(w, h);
      u.uResolution.value.set(w, h);
      u.uDpr.value = dpr;
      post.mat.uniforms.uResolution.value.set(w, h);
      post.mat.uniforms.uDpr.value = dpr;
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
      u.uGlitch.value = controls.glitch;
    } else {
      // Paper ⇄ ink as a slow cross-fade (~0.8s), never a sudden full-frame swap.
      const k = 1 - Math.exp(-delta * 3);
      u.uInvert.value += (pipelineTarget.invert - u.uInvert.value) * k;
      u.uBgInvert.value += (pipelineTarget.bgInvert - u.uBgInvert.value) * k;
      u.uGlitch.value = pipelineTarget.glitch;
      u.uView.value = pipelineTarget.view ?? 0;
      u.uBoil.value = reducedMotion ? 0 : 0.35;
      // Keep the CSS world in step with the shader's notion of light and dark.
      const site = useSite.getState();
      if (Math.abs(site.tone - u.uInvert.value) > 0.01) site.setTone(u.uInvert.value);
    }

    camera.layers.set(0);
    gl.setRenderTarget(target);
    gl.setClearColor(0x000000, 0);
    gl.clear();
    gl.render(scene, camera);

    // Ink composite and overlays go into a film buffer so the lens pass bends both.
    gl.setRenderTarget(post.rt);
    gl.render(quadScene, quadCamera);
    gl.autoClear = false;
    gl.clearDepth();
    camera.layers.set(OVERLAY_LAYER);
    gl.render(scene, camera);
    camera.layers.set(0);
    gl.autoClear = true;

    const p = post.mat.uniforms;
    const fx = external ? { ...postFx, aberration: 0, crt: 0, speed: 0, shockAt: 0 } : postFx;
    p.uAberration.value = fx.aberration;
    p.uCRT.value = fx.crt;
    p.uSpeed.value = fx.speed;
    p.uVignette.value = fx.vignette;
    const inv = u.uInvert.value;
    const paperRGB = srgb(palette.paper);
    const inkRGB = srgb(palette.ink);
    p.uLine.value.set(
      inkRGB[0] + (paperRGB[0] - inkRGB[0]) * inv,
      inkRGB[1] + (paperRGB[1] - inkRGB[1]) * inv,
      inkRGB[2] + (paperRGB[2] - inkRGB[2]) * inv,
    );
    p.uShockCenter.value.set(fx.shockX, fx.shockY);
    p.uShockAge.value = fx.shockAt ? (performance.now() - fx.shockAt) / 1000 : -1;
    gl.setRenderTarget(null);
    gl.render(post.scene, quadCamera);
  }, 1);

  return null;
}
