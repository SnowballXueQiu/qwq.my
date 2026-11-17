"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { fitScale } from "../framing";

import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, CanvasTexture, Group } from "three";
import { emit } from "@/lib/fx";
import { createInkMaterial, Fill } from "../materials/inkMaterial";
import { KineticText } from "../text/KineticText";
import { cue, frameState, withOverview } from "../frameState";
import { WORLD } from "../world";

const PAGE_W = 2.6;
const PAGE_H = 3.5;

/** A post as its page in the scene shows it. */
export type WritingPage = { href: string; no: number; title: string; date: string; summary: string; tags: string[] };

// The cover is drawn on a canvas: red is ink, green marks the ink that's accent. Only the
// front face prints it (the back would read mirrored).
const pageHead = /* glsl */ `
uniform sampler2D uCover;
`;
const pagePrint = /* glsl */ `
  vec2 uv = (vRest.xy + vec2(${(PAGE_W / 2).toFixed(2)}, ${(PAGE_H / 2).toFixed(2)})) / vec2(${PAGE_W.toFixed(2)}, ${PAGE_H.toFixed(2)});
  vec4 cover = texture(uCover, uv) * step(0.015, vRest.z);
  printed = cover.r;
  accent = max(accent, cover.g);
`;

/** Cover size in canvas units (the page's aspect), drawn at SCALE for a sharper texture. */
const W = 624;
const H = 840;
const SCALE = 1.25;
const MARGIN = 44;
const INK = "#f00";
const RED = "#ff0";

/** Lines that fit `width`: CJK breaks between any two characters, other text between words. */
function wrap(g: CanvasRenderingContext2D, text: string, width: number) {
  const tokens = text.match(/[　-鿿＀-￯]|[^\s　-鿿＀-￯]+\s*|\s+/g) ?? [];
  const lines: string[] = [];
  let line = "";
  for (const token of tokens) {
    if (line && g.measureText(line + token).width > width) {
      lines.push(line.trimEnd());
      line = token.trimStart();
    } else {
      line += token;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

/** Cuts `lines` to `max`, ending the last one with an ellipsis if anything was cut. */
function clamp(g: CanvasRenderingContext2D, lines: string[], max: number, width: number) {
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  let last = kept[max - 1];
  while (last && g.measureText(`${last}…`).width > width) last = last.slice(0, -1);
  kept[max - 1] = `${last.trimEnd()}…`;
  return kept;
}

/** The post's front page, typeset like the blog: number and date, title, tags, summary. */
function drawCover(canvas: HTMLCanvasElement, page: WritingPage) {
  const css = getComputedStyle(document.documentElement);
  const display = `${css.getPropertyValue("--font-archivo").trim() || "sans-serif"}, "PingFang SC", "Noto Sans SC", sans-serif`;
  const mono = `${css.getPropertyValue("--font-jetbrains").trim() || "monospace"}, monospace`;
  const g = canvas.getContext("2d")!;
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  g.fillStyle = "#000";
  g.fillRect(0, 0, W, H);
  const width = W - MARGIN * 2;
  g.textBaseline = "alphabetic";

  g.font = `500 26px ${mono}`;
  g.fillStyle = RED;
  g.fillText(`BLOG-${String(page.no).padStart(3, "0")}`, MARGIN, 76);
  g.fillStyle = INK;
  g.textAlign = "right";
  g.fillText(page.date, W - MARGIN, 76);
  g.textAlign = "left";
  g.fillRect(MARGIN, 98, width, 3);

  // The largest title size that fits in four lines.
  let size = 84;
  let title: string[] = [];
  for (; size >= 48; size -= 6) {
    g.font = `900 ${size}px ${display}`;
    title = wrap(g, page.title, width);
    if (title.length <= 4) break;
  }
  title = clamp(g, title, 4, width);
  let y = 112 + size;
  for (const line of title) {
    g.fillText(line, MARGIN, y);
    y += size * 1.04;
  }

  y += 18;
  g.font = `500 24px ${mono}`;
  let x = MARGIN;
  for (const tag of page.tags) {
    g.fillStyle = RED;
    g.fillText("#", x, y);
    g.fillStyle = INK;
    g.fillText(tag, x + g.measureText("# ").width, y);
    x += g.measureText(`# ${tag}`).width + 26;
  }

  y += 30;
  g.fillRect(MARGIN, y, width, 2);
  g.font = `400 27px ${display}`;
  const rest = Math.floor((H - 120 - y) / 42);
  y += 48;
  for (const line of clamp(g, wrap(g, page.summary, width), Math.max(rest, 0), width)) {
    g.fillText(line, MARGIN, y);
    y += 42;
  }

  g.fillRect(MARGIN, H - 92, width, 2);
  g.font = `500 24px ${mono}`;
  g.fillStyle = RED;
  g.textAlign = "right";
  g.fillText("READ →", W - MARGIN, H - 52);
  g.textAlign = "left";
}

/** Depth between neighbouring pages. Every page stays parallel to the others (they only
 *  turn within their own plane, plus a small shared wobble), so this gap keeps them from
 *  ever passing through each other. */
const LAYER = 0.42;

/**
 * The newest posts as a fanned hand of pages, newest on the left, drifting like a stack
 * someone just threw up in the air. Each page carries its post's front page; pointing at
 * one lifts it, clicking opens the post.
 */
export function WritingStage({ pages: posts }: { pages: WritingPage[] }) {
  const fit = useThree((s) => fitScale(s.size.width / s.size.height));
  const anisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const count = posts.length;
  const pages = useMemo(
    () =>
      posts.map((post, i) => {
        const k = i - (count - 1) / 2;
        return { post, x: k * 2.45, y: -0.4 - k * k * 0.16, z: 1 - Math.abs(k) * LAYER, rz: -k * 0.09 };
      }),
    [posts, count],
  );
  const geometry = useMemo(() => new BoxGeometry(PAGE_W, PAGE_H, 0.04), []);
  const covers = useMemo(
    () =>
      pages.map(() => {
        const canvas = document.createElement("canvas");
        canvas.width = W * SCALE;
        canvas.height = H * SCALE;
        const texture = new CanvasTexture(canvas);
        texture.anisotropy = anisotropy;
        return { canvas, texture };
      }),
    [pages, anisotropy],
  );
  const materials = useMemo(
    () =>
      covers.map(({ texture }) =>
        createInkMaterial({
          fill: Fill.sheet,
          uniforms: { uCover: { value: texture } },
          fragmentHead: pageHead,
          fragmentPrint: pagePrint,
        }),
      ),
    [covers],
  );
  useEffect(() => {
    let live = true;
    // Typeset once the site's fonts are in; until then the pages are blank paper.
    document.fonts.ready.then(() => {
      if (!live) return;
      covers.forEach(({ canvas, texture }, i) => {
        drawCover(canvas, pages[i].post);
        texture.needsUpdate = true;
      });
    });
    return () => {
      live = false;
    };
  }, [covers, pages]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => covers.forEach(({ texture }) => texture.dispose()), [covers]);
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  const group = useRef<Group>(null);
  /** Whether the hand has landed: only then can a page be pointed at. */
  const settled = useRef(false);
  const hovered = useRef(-1);
  const lift = useRef<number[]>([]);
  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const p = withOverview(cue(frameState.s, 4.85, 5.2, 5.55, 5.8));
    g.visible = p > 0 && p < 2;
    settled.current = p > 0.75 && p < 1.25;
    if (!settled.current && hovered.current >= 0) {
      hovered.current = -1;
      delete document.documentElement.dataset.cursorLabel;
    }
    const t = state.clock.elapsedTime;
    const arrive = Math.min(Math.max(p, 0), 1);
    const leave = Math.max(p - 1, 0);
    // The whole hand sways and tips as one, so the pages stay parallel.
    g.rotation.set(Math.sin(t * 0.5) * 0.05 + (1 - arrive) * 1.2, Math.sin(t * 0.3) * 0.18, 0);
    g.children.forEach((child, i) => {
      const page = pages[i];
      if (!page) return;
      const up = (lift.current[i] ?? 0) + ((hovered.current === i ? 1 : 0) - (lift.current[i] ?? 0)) * Math.min(dt * 8, 1);
      lift.current[i] = up;
      // Leaving, they spread apart before they turn, so they never cut into each other.
      // A page pointed at rises toward you, clear of its neighbours.
      child.position.set(page.x * arrive * (1 + leave * 2), page.y + (1 - arrive) * -8 + leave * 6 + up * 0.35, page.z + leave * 12 + up * LAYER * 2.2);
      child.rotation.set(0, 0, (page.rz + Math.sin(t * 0.6 + i * 2) * 0.04) * (1 - up * 0.8) + leave * (i - (count - 1) / 2) * 0.6);
      child.scale.setScalar(1 + up * 0.06);
    });
  });

  return (
    <group position={[0, 0, WORLD.writing.z]} scale={fit}>
      <KineticText
        text="print(thoughts);"
        size={1.9}
        depth={0.5}
        position={[0, 3.4, -1]}
        accent={(_, c) => "();".includes(c)}
        seed={77}
        progress={() => cue(frameState.s, 4.9, 5.22, 5.5, 5.72)}
      />
      <group ref={group}>
        {pages.map((page, i) => (
          <mesh
            key={page.post.href}
            geometry={geometry}
            material={materials[i]}
            onPointerOver={(e) => {
              if (!settled.current) return;
              e.stopPropagation();
              hovered.current = i;
              document.documentElement.dataset.cursorLabel = "READ";
            }}
            onPointerOut={() => {
              if (hovered.current !== i) return;
              hovered.current = -1;
              delete document.documentElement.dataset.cursorLabel;
            }}
            onClick={(e) => {
              if (!settled.current) return;
              e.stopPropagation();
              emit("go", { href: page.post.href });
            }}
          />
        ))}
      </group>
    </group>
  );
}
