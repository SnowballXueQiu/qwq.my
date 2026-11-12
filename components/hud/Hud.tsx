"use client";

import { useEffect, useMemo, useRef } from "react";
import { hudState } from "@/components/three/hudState";
import { compositeFragment } from "@/components/three/shaders/composite.glsl";
import { postFragment } from "@/components/three/shaders/post.glsl";
import { prng } from "@/lib/prng";
import { sheets } from "@/lib/sheets";
import { useSite } from "@/lib/store";

const pad = (n: number, width = 3, digits = 2) => {
  const sign = n < 0 ? "-" : "+";
  return sign + Math.abs(n).toFixed(digits).padStart(width + digits + 1, "0");
};

/** Deterministic 0/1 noise for the ticker band (SSR-safe). */
const BINARY = (() => {
  const r = prng(233);
  return Array.from({ length: 240 }, () => (r() > 0.5 ? "1" : "0")).join("");
})();

/**
 * The instrument layer over the 3D world: live camera readouts, a streaming
 * column of the shaders that draw the page, an oscilloscope of scroll speed,
 * a roll dial, focus brackets that kick on cuts, a leader line from the
 * active panel to what it describes, and dimension lines on the paper.
 */
export function Hud() {
  const readA = useRef<HTMLDivElement>(null);
  const readB = useRef<HTMLDivElement>(null);
  const code = useRef<HTMLPreElement>(null);
  const scope = useRef<HTMLCanvasElement>(null);
  const dial = useRef<SVGGElement>(null);
  const dialText = useRef<HTMLDivElement>(null);
  const brackets = useRef<HTMLDivElement>(null);
  const leader = useRef<SVGSVGElement>(null);
  const dims = useRef<SVGSVGElement>(null);

  const source = useMemo(() => {
    const lines = (compositeFragment + postFragment).split("\n").filter((l) => l.trim());
    return lines.concat(lines).join("\n");
  }, []);

  useEffect(() => {
    let frame = 0;
    let codeY = 0;
    const history = new Float32Array(160);
    let head = 0;

    const loop = () => {
      frame = requestAnimationFrame(loop);
      const h = hudState;
      const site = useSite.getState();
      const home = !site.reading;

      if (readA.current) {
        readA.current.textContent = `CAM  X${pad(h.cam.x)}  Y${pad(h.cam.y)}  Z${pad(h.cam.z)}  FOV ${h.cam.fov.toFixed(1)}  ROLL ${pad(((h.cam.roll + 540) % 360) - 180, 3, 1)}°`;
      }
      if (readB.current) {
        const bars = "▮".repeat(Math.round(h.speed * 8)).padEnd(8, "▯");
        readB.current.textContent = `VEL ${pad(h.velocity, 2, 1)}  SPD ${bars}  FPS ${Math.round(h.fps).toString().padStart(3, "0")}  FRM ${String(h.frame).padStart(6, "0")}  ${site.expression}`;
      }

      // The source column drifts, and races when you scroll. Paper stays clean.
      if (code.current) {
        code.current.parentElement!.style.opacity = home && !h.eyesVisible && site.tone > 0.5 ? "1" : "0";
        codeY = (codeY + 0.25 + Math.abs(h.velocity) * 0.6) % (code.current.scrollHeight / 2 || 1);
        code.current.style.transform = `translate3d(0, ${-codeY}px, 0)`;
      }

      // Oscilloscope: scroll velocity over the last few seconds, over a carrier.
      history[head] = h.velocity;
      head = (head + 1) % history.length;
      const cv = scope.current;
      const ctx = cv?.getContext("2d");
      if (cv && ctx) {
        const { width: w, height: hh } = cv;
        const ink = getComputedStyle(cv).color;
        ctx.clearRect(0, 0, w, hh);
        ctx.strokeStyle = ink;
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 1;
        for (let x = 0; x <= w; x += w / 8) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, hh);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < history.length; i++) {
          const v = history[(head + i) % history.length];
          const carrier = Math.sin((i + h.frame) * 0.35) * (0.08 + h.speed * 0.4);
          const y = hh / 2 - (v / 40 + carrier) * (hh / 2.4);
          const x = (i / (history.length - 1)) * w;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }

      if (dial.current) dial.current.setAttribute("transform", `rotate(${-h.cam.roll} 32 32)`);
      if (dialText.current) dialText.current.textContent = `YAW ${pad(h.cam.yaw, 3, 1)}`;

      if (brackets.current) {
        const kick = h.sinceCut < 0.5 ? 1 - h.sinceCut / 0.5 : 0;
        brackets.current.style.transform = `translate(-50%, -50%) scale(${1 + kick * 0.6 + h.speed * 0.25})`;
        brackets.current.style.opacity = String(0.35 + kick * 0.65);
      }

      // Leader line from the active panel's corner to its subject in 3D.
      const svg = leader.current;
      if (svg) {
        const sheet = sheets[site.sheet];
        const panel = home ? document.querySelector<HTMLElement>(`[data-sheet="${sheet}"] [data-panel]`) : null;
        const r = panel?.getBoundingClientRect();
        const show = Boolean(h.anchor.visible && r && r.width > 0 && r.bottom > 0 && r.top < innerHeight);
        svg.style.opacity = show ? "1" : "0";
        if (show && r) {
          const sx = r.right;
          const sy = r.top;
          const ex = h.anchor.x;
          const ey = h.anchor.y;
          const mx = sx + Math.max(40, (ex - sx) * 0.35);
          const [line, dot, ring, label] = Array.from(svg.children) as SVGElement[];
          line.setAttribute("points", `${sx},${sy} ${mx},${sy} ${mx + (ex - mx) * 0.5},${ey} ${ex},${ey}`);
          dot.setAttribute("cx", String(ex));
          dot.setAttribute("cy", String(ey));
          ring.setAttribute("cx", String(ex));
          ring.setAttribute("cy", String(ey));
          ring.setAttribute("r", String(10 + Math.sin(h.frame * 0.1) * 3));
          label.setAttribute("x", String(ex + 16));
          label.setAttribute("y", String(ey - 12));
          label.textContent = h.anchor.label;
        }
      }

      // On the paper: dimension the drawing of QwQ like a technical drawing.
      const d = dims.current;
      if (d) {
        d.style.opacity = home && h.eyesVisible ? "1" : "0";
        if (home && h.eyesVisible) {
          const [a, b] = h.eyes;
          const top = Math.min(a.y, b.y) - a.r - 46;
          const [cc, ccL, ccR, ccText, dia, diaText, rad, radText] = Array.from(d.children) as SVGElement[];
          cc.setAttribute("d", `M${a.x} ${top} H${b.x}`);
          ccL.setAttribute("d", `M${a.x} ${top - 8} V${a.y - a.r - 6}`);
          ccR.setAttribute("d", `M${b.x} ${top - 8} V${b.y - b.r - 6}`);
          ccText.setAttribute("x", String((a.x + b.x) / 2));
          ccText.setAttribute("y", String(top - 8));
          ccText.textContent = `C–C ${Math.round(b.x - a.x)}`;
          const by = a.y + a.r + 34;
          dia.setAttribute("d", `M${a.x - a.r} ${by} H${a.x + a.r} M${a.x - a.r} ${by - 8} V${by + 8} M${a.x + a.r} ${by - 8} V${by + 8}`);
          diaText.setAttribute("x", String(a.x));
          diaText.setAttribute("y", String(by + 22));
          diaText.textContent = `Ø ${Math.round(a.r * 2)}`;
          const ang = -0.8;
          rad.setAttribute("d", `M${b.x} ${b.y} L${b.x + Math.cos(ang) * b.r * 1.5} ${b.y + Math.sin(ang) * b.r * 1.5} h 46`);
          radText.setAttribute("x", String(b.x + Math.cos(ang) * b.r * 1.5 + 50));
          radText.setAttribute("y", String(b.y + Math.sin(ang) * b.r * 1.5 + 4));
          radText.textContent = `R ${Math.round(b.r)} · EYE-R`;
        }
      }
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const inset = "calc(var(--frame-inset) + var(--frame-gutter) + 12px)";
  return (
    <div aria-hidden className="hud pointer-events-none fixed inset-0 z-30 text-ink">
      {/* Binary ticker under the header. */}
      <div
        className="absolute overflow-hidden whitespace-nowrap font-mono text-[9px] leading-none opacity-40"
        style={{ top: "calc(var(--frame-inset) + var(--frame-gutter) + 46px)", left: inset, right: inset }}
      >
        <div className="inline-block animate-[ticker_40s_linear_infinite]">
          {BINARY}
          {BINARY}
        </div>
      </div>

      <div className="absolute hidden space-y-1 font-mono text-[9px] tracking-[0.08em] md:block" style={{ top: "calc(var(--frame-inset) + var(--frame-gutter) + 62px)", left: inset }}>
        <div ref={readA} />
        <div ref={readB} className="text-ink-soft" />
      </div>

      {/* The shaders drawing this page, streaming past. */}
      <div
        className="absolute hidden w-[230px] overflow-hidden transition-opacity duration-500 lg:block"
        style={{
          top: "22vh",
          height: "50vh",
          right: inset,
          maskImage: "linear-gradient(transparent, black 20%, black 80%, transparent)",
        }}
      >
        <pre ref={code} className="whitespace-pre font-mono text-[8px] leading-[11px] opacity-20">
          {source}
        </pre>
      </div>

      <canvas
        ref={scope}
        width={220}
        height={46}
        className="absolute hidden md:block"
        style={{ left: inset, bottom: "calc(var(--frame-inset) + var(--frame-gutter) + 52px)" }}
      />

      <div className="absolute hidden flex-col items-center gap-1 md:flex" style={{ right: "calc(var(--frame-inset) + var(--frame-gutter) + 356px)", bottom: "calc(var(--frame-inset) + var(--frame-gutter) + 52px)" }}>
        <svg width={64} height={64} viewBox="0 0 64 64" fill="none" stroke="currentColor">
          <circle cx={32} cy={32} r={29} strokeWidth={1} opacity={0.5} />
          <g ref={dial}>
            {Array.from({ length: 36 }, (_, i) => (
              <line key={i} x1={32} y1={4} x2={32} y2={i % 9 === 0 ? 12 : 8} strokeWidth={i % 9 === 0 ? 1.5 : 1} transform={`rotate(${i * 10} 32 32)`} />
            ))}
            <line x1={32} y1={32} x2={32} y2={10} stroke="var(--accent)" strokeWidth={2} />
          </g>
          <circle cx={32} cy={32} r={2} fill="currentColor" />
        </svg>
        <div ref={dialText} className="font-mono text-[8px]" />
      </div>

      {/* Focus brackets around the frame's centre. */}
      <div ref={brackets} className="absolute left-1/2 top-1/2 h-24 w-40">
        {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "bottom-0 left-0 border-b border-l", "bottom-0 right-0 border-b border-r"].map((c) => (
          <span key={c} className={`absolute size-4 border-ink ${c}`} />
        ))}
        <span className="absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2 bg-accent" />
        <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-y-1/2 bg-accent" />
      </div>

      <svg ref={leader} className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-300" fill="none">
        <polyline stroke="var(--accent)" strokeWidth={1} strokeDasharray="4 3" />
        <circle r={3} fill="var(--accent)" />
        <circle stroke="var(--accent)" strokeWidth={1} />
        <text className="font-mono" fontSize={10} fill="currentColor" />
      </svg>

      <svg ref={dims} className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-500" fill="none" stroke="currentColor" strokeWidth={1}>
        <path markerStart="url(#arrow)" markerEnd="url(#arrow)" />
        <path strokeDasharray="2 3" />
        <path strokeDasharray="2 3" />
        <text className="font-mono" fontSize={11} fill="var(--accent)" stroke="none" textAnchor="middle" />
        <path />
        <text className="font-mono" fontSize={11} fill="var(--accent)" stroke="none" textAnchor="middle" />
        <path />
        <text className="font-mono" fontSize={11} fill="var(--accent)" stroke="none" />
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M0 2 L10 5 L0 8 z" fill="currentColor" stroke="none" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
