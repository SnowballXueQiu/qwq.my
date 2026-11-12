"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CatmullRomCurve3, Group, Mesh, Plane, Raycaster, TubeGeometry, Vector2, Vector3 } from "three";
import { emit } from "@/lib/fx";
import { useSite } from "@/lib/store";
import { createInkMaterial, Fill } from "../materials/inkMaterial";
import { clamp01, frameState } from "../frameState";
import { UI_SELECTOR } from "./interaction";

const DRAW_Z = -0.45;
const MAX_STROKES = 40;
const MAX_POINTS = 320;

type Stroke = { points: Vector3[]; mesh: Mesh; dir: Vector3; spin: number };

/**
 * Draw on the hero sheet: hold and drag to ink a line (Shift for red pencil).
 * The strokes are real tubes; when the paper tears they leap at the camera too.
 */
export function PaperDoodles() {
  const camera = useThree((s) => s.camera);
  const group = useRef<Group>(null);
  const strokes = useRef<Stroke[]>([]);
  const mats = useMemo(
    () => ({ ink: createInkMaterial({ fill: Fill.ink }), red: createInkMaterial({ fill: Fill.ink, accent: 1 }) }),
    [],
  );
  useEffect(
    () => () => {
      mats.ink.dispose();
      mats.red.dispose();
      strokes.current.forEach((s) => s.mesh.geometry.dispose());
    },
    [mats],
  );

  useEffect(() => {
    const ray = new Raycaster();
    const ndc = new Vector2();
    const plane = new Plane(new Vector3(0, 0, 1), -DRAW_Z);
    const hit = new Vector3();
    let down: { x: number; y: number; red: boolean } | null = null;
    let current: Stroke | null = null;

    const canDraw = (e: PointerEvent) =>
      e.pointerType !== "touch" &&
      !useSite.getState().reading &&
      frameState.s < 0.28 &&
      frameState.game < 0.5 &&
      !(e.target as Element | null)?.closest(UI_SELECTOR);

    const project = (e: PointerEvent) => {
      ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.ray.intersectPlane(plane, hit) ? hit.clone() : null;
    };

    const rebuild = (s: Stroke) => {
      if (s.points.length < 2) return;
      const curve = new CatmullRomCurve3(s.points);
      s.mesh.geometry.dispose();
      s.mesh.geometry = new TubeGeometry(curve, Math.min(s.points.length * 3, 600), 0.055, 6, false);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || !canDraw(e)) return;
      down = { x: e.clientX, y: e.clientY, red: e.shiftKey };
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      if (!current) {
        // Only a real drag draws; a plain click stays a click (poking QwQ).
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) return;
        const start = project(e);
        if (!start || !group.current) return;
        if (strokes.current.length >= MAX_STROKES) {
          const old = strokes.current.shift()!;
          group.current.remove(old.mesh);
          old.mesh.geometry.dispose();
        }
        const mesh = new Mesh(new TubeGeometry(new CatmullRomCurve3([start, start.clone().add(new Vector3(0.01, 0, 0))]), 2, 0.055, 6), down.red ? mats.red : mats.ink);
        group.current.add(mesh);
        const a = Math.random() * Math.PI * 2;
        current = { points: [start], mesh, dir: new Vector3(Math.cos(a), Math.sin(a), 0), spin: (Math.random() - 0.5) * 3 };
        strokes.current.push(current);
        document.body.style.userSelect = "none";
        emit("sound", { name: "pen" });
      }
      const p = project(e);
      if (!p || current.points.length >= MAX_POINTS) return;
      if (p.distanceTo(current.points[current.points.length - 1]) < 0.07) return;
      current.points.push(p);
      rebuild(current);
    };
    const onUp = () => {
      down = null;
      current = null;
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [camera, mats]);

  // When the sheet tears, every doodle peels off and flies past the lens.
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const f = frameState;
    g.visible = f.s < 0.95 && f.game < 0.5;
    const e = clamp01(f.breakAmount / 1.3);
    const ease = e * e;
    strokes.current.forEach((s) => {
      s.mesh.position.set(s.dir.x * ease * 6, s.dir.y * ease * 6, ease * 15);
      s.mesh.rotation.set(ease * s.spin * 0.5, ease * s.spin * 0.3, ease * s.spin);
    });
  });

  return <group ref={group} />;
}
