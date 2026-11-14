"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { tr, type Lang } from "./Figure";
import { ACCENT, INK, PAPER, edgeMaps, mixRGB, renderScene, toneAt } from "./miniInk";

const W = 128;
const H = 72;
const TESTS = [
  { key: "silhouette", zh: "轮廓", en: "Silhouette", hint: ["有东西和没东西的交界", "where something meets nothing"] },
  { key: "id", zh: "物体 id", en: "Object id", hint: ["两个物体挨在一起", "two objects touching"] },
  { key: "crease", zh: "折痕", en: "Crease", hint: ["法线夹角大：立方体的棱", "normals turn sharply: the cube's edges"] },
  { key: "depth", zh: "深度", en: "Depth", hint: ["前后断开：球挡在地板前", "a jump in depth: the sphere in front of the floor"] },
] as const;
type TestKey = (typeof TESTS)[number]["key"];
const BASES = ["tone", "depth", "normal", "id"] as const;

/**
 * The composite's edge detection at pixel scale: a ray-cast scene written into
 * a G-buffer, then the four tests that ink a line, each drawn its own way.
 */
export function EdgeLab({ lang }: { lang: Lang }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [on, setOn] = useState<Record<TestKey, boolean>>({ silhouette: true, id: true, crease: true, depth: true });
  const [base, setBase] = useState<(typeof BASES)[number]>("tone");
  const [probe, setProbe] = useState<number | null>(null);
  const g = useMemo(() => renderScene(W, H), []);
  const maps = useMemo(() => edgeMaps(g), [g]);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      const x = i % W;
      const y = Math.floor(i / W);
      // The buffer underneath, faded so the lines read on top of it.
      let c = PAPER;
      if (g.cov[i]) {
        if (base === "tone") c = mixRGB(INK, PAPER, toneAt(g, i, [-0.55, 0.7, 0.55]));
        if (base === "depth") c = mixRGB(INK, PAPER, Math.min(1, Math.max(0, (g.depth[i] - 2.4) / 4.5)));
        if (base === "normal") c = [(g.normal[i * 3] * 0.5 + 0.5) * 255, (g.normal[i * 3 + 1] * 0.5 + 0.5) * 255, (g.normal[i * 3 + 2] * 0.5 + 0.5) * 255];
        if (base === "id") c = ([[0, 0, 0], [205, 196, 160], [160, 186, 205], [200, 200, 196]] as const)[g.id[i]] as [number, number, number];
        c = mixRGB(PAPER, c, 0.45);
      }
      // Each test inks its own way: silhouettes solid, ids vermilion, creases grey, depth jumps dotted.
      if (on.crease && maps.crease[i] > 0.5) c = [138, 133, 124];
      if (on.depth && maps.depth[i] > 0.5 && (x + y) % 2 === 0) c = INK;
      if (on.id && maps.id[i] > 0.5) c = ACCENT;
      if (on.silhouette && maps.silhouette[i] > 0.5) c = INK;
      img.data.set([c[0], c[1], c[2], 255], i * 4);
    }
    ctx.putImageData(img, 0, 0);
    if (probe !== null) {
      ctx.strokeStyle = "#e8402a";
      ctx.lineWidth = 1;
      ctx.strokeRect((probe % W) - 1.5, Math.floor(probe / W) - 1.5, 3, 3);
    }
  }, [g, maps, on, base, probe]);

  const pick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * W);
    const y = Math.floor(((e.clientY - r.top) / r.height) * H);
    if (x >= 0 && y >= 0 && x < W && y < H) setProbe(y * W + x);
  };
  const p = probe;
  return (
    <div>
      <canvas
        ref={canvas}
        width={W}
        height={H}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setProbe(null)}
        className="block w-full cursor-crosshair touch-none"
        style={{ imageRendering: "pixelated", aspectRatio: `${W} / ${H}` }}
      />
      <div className="grid grid-cols-2 gap-px border-t border-ink bg-ink sm:grid-cols-4">
        {TESTS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setOn((o) => ({ ...o, [t.key]: !o[t.key] }))}
            className={`flex items-start gap-2 px-2.5 py-2 text-left transition-colors ${on[t.key] ? "bg-paper" : "bg-paper/60 opacity-50"}`}
          >
            <Swatch k={t.key} />
            <span>
              <span className="label block text-ink">{tr(lang, t.zh, t.en)}</span>
              <span className="block text-[0.72rem] leading-snug text-ink-soft">{lang === "zh" ? t.hint[0] : t.hint[1]}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink px-3 py-2 font-mono text-[0.72rem] text-ink-soft">
        <span>{tr(lang, "底图", "Under")}:</span>
        {BASES.map((b) => (
          <button key={b} type="button" onClick={() => setBase(b)} className={b === base ? "text-accent underline" : "hover:text-ink"}>
            {b}
          </button>
        ))}
        <span className="ml-auto">
          {p !== null && g.cov[p]
            ? `id ${g.id[p]} · depth ${g.depth[p].toFixed(2)} · n (${[0, 1, 2].map((k) => g.normal[p * 3 + k].toFixed(2)).join(", ")}) · ${TESTS.map((t) => `${tr(lang, t.zh, t.en)} ${maps[t.key][p].toFixed(2)}`).join(" · ")}`
            : tr(lang, "把指针移到图上看每个像素", "point at the image to read a pixel")}
        </span>
      </div>
    </div>
  );
}

function Swatch({ k }: { k: TestKey }) {
  const style: React.CSSProperties =
    k === "silhouette"
      ? { background: "#141414" }
      : k === "id"
        ? { background: "#e8402a" }
        : k === "crease"
          ? { background: "#8a857c" }
          : { backgroundImage: "repeating-conic-gradient(#141414 0 25%, transparent 0 50%)", backgroundSize: "4px 4px" };
  return <span className="mt-0.5 size-3 shrink-0 border border-ink" style={style} />;
}
