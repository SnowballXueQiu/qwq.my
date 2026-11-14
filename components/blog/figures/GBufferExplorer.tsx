"use client";

import { useEffect, useRef, useState } from "react";
import { tr, type Lang } from "./Figure";

const BASE = "/blog/how-qwq-my-is-built/gbuffer-";

const LAYERS = [
  { id: "tone", zh: "明暗", en: "Tone", note: ["gColor.r：半兰伯特光照，光从左上来。越亮越白。", "gColor.r: half-Lambert light from the upper left. Brighter is whiter."] },
  { id: "accent", zh: "强调色", en: "Accent", note: ["gColor.g：这个表面用不用朱红。", "gColor.g: whether the surface is vermilion."] },
  { id: "fill", zh: "填充", en: "Fill", note: ["gColor.b：网点排线、纸、实墨三种画法。", "gColor.b: shaded, paper or solid ink."] },
  { id: "normal", zh: "法线", en: "Normals", note: ["gNormal.xyz：视空间法线，xyz 直接当 rgb 看。", "gNormal.xyz: view-space normals, shown as rgb."] },
  { id: "id", zh: "物体 id", en: "Object id", note: ["gNormal.a：每种材质一个编号，这里随便给个颜色。", "gNormal.a: one number per material, coloured at random here."] },
  { id: "depth", zh: "深度", en: "Depth", note: ["深度缓冲，取对数显示，红线是每 0.2 单位一条等深线。", "The depth buffer on a log scale; red contours every 0.2 units."] },
  { id: "lines", zh: "墨线", en: "Lines", note: ["合成第一步：只看边缘检测画出的墨线。", "Composite, step one: just the ink lines from edge detection."] },
  { id: "dots", zh: "网点", en: "Dots", note: ["合成第二步：明暗变成网点和两层排线。", "Composite, step two: tone turned into dots and two layers of hatching."] },
] as const;

/**
 * One real frame of the site, layer by layer. Drag the divider: the finished
 * drawing on the left, the chosen layer on the right.
 */
export function GBufferExplorer({ lang }: { lang: Lang }) {
  const [layer, setLayer] = useState(0);
  const [split, setSplit] = useState(0.5);
  const [auto, setAuto] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const visible = useRef(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => visible.current && setLayer((l) => (l + 1) % LAYERS.length), 2600);
    return () => window.clearInterval(id);
  }, [auto]);

  const drag = (e: React.PointerEvent) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setSplit(Math.min(0.98, Math.max(0.02, (e.clientX - r.left) / r.width)));
  };
  const current = LAYERS[layer];
  return (
    <div>
      <div
        ref={box}
        className="relative aspect-[16/10] w-full cursor-ew-resize touch-none select-none overflow-hidden bg-ink"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setAuto(false);
          drag(e);
        }}
        onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && drag(e)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static captures, sized by the box */}
        <img src={`${BASE}final.webp`} alt="" className="absolute inset-0 size-full object-cover" draggable={false} />
        {LAYERS.map((l, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- static captures, sized by the box
          <img
            key={l.id}
            src={`${BASE}${l.id}.webp`}
            alt={tr(lang, l.zh, l.en)}
            loading="lazy"
            draggable={false}
            className="absolute inset-0 size-full object-cover transition-opacity duration-500"
            style={{ opacity: i === layer ? 1 : 0, clipPath: `inset(0 0 0 ${split * 100}%)` }}
          />
        ))}
        <div className="pointer-events-none absolute inset-y-0 w-px bg-accent" style={{ left: `${split * 100}%` }}>
          <span className="label absolute top-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent px-1.5 py-0.5 text-paper">⇆</span>
        </div>
        <span className="label pointer-events-none absolute left-2 top-2 bg-paper px-1.5 py-0.5 text-ink">{tr(lang, "成片", "Final")}</span>
        <span className="label pointer-events-none absolute right-2 top-2 bg-accent px-1.5 py-0.5 text-paper">{tr(lang, current.zh, current.en)}</span>
      </div>
      <div className="flex flex-wrap gap-px border-t border-ink bg-ink">
        {LAYERS.map((l, i) => (
          <button
            key={l.id}
            type="button"
            onClick={() => {
              setAuto(false);
              setLayer(i);
            }}
            className={`label flex-1 px-2 py-1.5 transition-colors ${i === layer ? "bg-accent text-paper" : "bg-paper text-ink hover:text-accent"}`}
          >
            {tr(lang, l.zh, l.en)}
          </button>
        ))}
      </div>
      <p className="border-t border-ink px-3 py-2 font-mono text-[0.8rem] leading-relaxed text-ink-soft">{lang === "zh" ? current.note[0] : current.note[1]}</p>
    </div>
  );
}
