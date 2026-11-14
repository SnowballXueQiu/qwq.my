"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FLOW, beatTimes } from "@/components/three/world";
import { SHEET_LENGTH } from "@/lib/sheetLengths";
import { sheets } from "@/lib/sheets";
import { tr, type Lang } from "./Figure";

const NAMES = {
  zh: ["你好", "关于我", "技能", "项目", "经历", "文章", "联系"],
  en: ["hello", "about", "skills", "projects", "timeline", "writing", "contact"],
};
const VW = 640;
const X0 = 16;
const X1 = VW - 16;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * The home page as the scene clock sees it, with the site's real sheet lengths,
 * beats and flow. Drag along it, or let it play the way the page scrolls.
 */
export function SceneClock({ lang }: { lang: Lang }) {
  const lengths = sheets.map((id) => SHEET_LENGTH[id]);
  const tops = lengths.map((_, i) => lengths.slice(0, i).reduce((a, b) => a + b, 0));
  // The last viewport can't be scrolled past: the page ends when contact's bottom meets the screen's.
  const total = tops[6] + lengths[6] - 1;
  const toS = (y: number) => {
    let i = 6;
    while (i > 0 && y < tops[i]) i--;
    return i + Math.min((y - tops[i]) / lengths[i], 1);
  };
  const toY = (s: number) => tops[Math.floor(s)] + (s - Math.floor(s)) * lengths[Math.floor(s)];
  const px = (y: number) => X0 + (y / (tops[6] + lengths[6])) * (X1 - X0);
  const beats = useMemo(() => beatTimes().map(toY), []); // eslint-disable-line react-hooks/exhaustive-deps
  const flowStart = toY(FLOW.start);

  const [y, setY] = useState(0);
  const [auto, setAuto] = useState(true);
  const visible = useRef(false);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const observer = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Autoplay: glide beat to beat with a pause on each, then roll through the flow.
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const plan: { from: number; to: number; ms: number; ease: boolean }[] = [];
    for (let i = 0; i < beats.length - 1; i++) {
      plan.push({ from: beats[i], to: beats[i], ms: 500, ease: false });
      plan.push({ from: beats[i], to: beats[i + 1], ms: 700, ease: true });
    }
    plan.push({ from: flowStart, to: total, ms: 7000, ease: false }, { from: total, to: total, ms: 1200, ease: false });
    let k = 0;
    let t0 = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      if (!visible.current) t0 = now;
      const p = plan[k];
      const t = Math.min(1, (now - t0) / p.ms);
      setY(p.from + (p.to - p.from) * (p.ease ? easeInOut(t) : t));
      if (t >= 1) {
        k = (k + 1) % plan.length;
        t0 = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [auto, beats, flowStart, total]);

  const s = toS(y);
  const i = Math.floor(s);
  const names = NAMES[lang];
  return (
    <div>
      <svg ref={svg} viewBox={`0 0 ${VW} 132`} className="block w-full select-none">
        <defs>
          <pattern id="flowHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#e8402a" strokeWidth="1.2" />
          </pattern>
        </defs>
        {lengths.map((len, k) => (
          <g key={k}>
            <rect x={px(tops[k])} y={52} width={px(tops[k] + len) - px(tops[k])} height={36} fill={k === i ? "#141414" : "#f1ede4"} stroke="#141414" />
            <text x={px(tops[k]) + 4} y={74} className={`font-mono text-[10px] ${k === i ? "fill-[#f1ede4]" : "fill-[#141414]"}`}>
              {/* Short sheets only have room for their number. */}
              {String(k + 1).padStart(2, "0")} {px(tops[k] + len) - px(tops[k]) > 56 ? names[k] : ""}
            </text>
          </g>
        ))}
        <rect x={px(flowStart)} y={92} width={px(total) - px(flowStart)} height={8} fill="url(#flowHatch)" />
        <text x={px(flowStart)} y={114} className="fill-[#e8402a] font-mono text-[9px]">
          {tr(lang, "连续滚动 →", "continuous →")}
        </text>
        <text x={X0} y={114} className="fill-[#8a857c] font-mono text-[9px]">
          {tr(lang, "▼ 停靠点（一拍）", "▼ beats")}
        </text>
        {beats.map((b, k) => (
          <path key={k} d={`M${px(b)},48 l-3.5,-7 h7 z`} fill="#e8402a" />
        ))}
        <line x1={px(y)} x2={px(y)} y1={14} y2={96} stroke="#e8402a" strokeWidth={2} />
        <text x={Math.min(px(y) + 6, VW - 90)} y={24} className="fill-[#141414] font-mono text-[11px] font-bold">
          s = {s.toFixed(2)}
        </text>
      </svg>
      <div className="flex flex-wrap items-center gap-3 border-t border-ink px-3 py-2 font-mono text-[0.75rem]">
        <input
          type="range"
          min={0}
          max={total}
          step={0.01}
          value={y}
          onChange={(e) => {
            setAuto(false);
            setY(Number(e.target.value));
          }}
          className="flex-1"
          aria-label={tr(lang, "滚动位置", "scroll position")}
        />
        <button type="button" onClick={() => setAuto((v) => !v)} className="label border border-ink px-2 py-1">
          {auto ? "❚❚" : "▶"}
        </button>
      </div>
      <p className="border-t border-ink px-3 py-2 font-mono text-[0.75rem] text-ink-soft">
        {tr(
          lang,
          `滚过 ${y.toFixed(2)} 屏 → 第 ${i + 1} 张图纸「${names[i]}」（共 ${lengths[i].toFixed(2)} 屏）走了 ${Math.round((s - i) * 100)}% → s = ${i} + ${(s - i).toFixed(2)}`,
          `${y.toFixed(2)} screens down → sheet ${i + 1} "${names[i]}" (${lengths[i].toFixed(2)} screens long) is ${Math.round((s - i) * 100)}% through → s = ${i} + ${(s - i).toFixed(2)}`,
        )}
      </p>
    </div>
  );
}
