import { useEffect, useState } from "react";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { AbsoluteFill, Easing, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { projects } from "@/content/projects";
import type { YearData } from "@/content/year/2026";
import type { Locale } from "@/lib/i18n";
import { InkPipeline } from "@/components/three/pipeline/InkPipeline";
import { KineticText } from "@/components/three/text/KineticText";
import { loadFont, setFontUrlResolver } from "@/components/three/text/typeface";
import { C, FONT, halftone } from "./theme";
import { QwQFace } from "./QwQFace";

/** A tiny seeded hash, so "random" glyphs are identical in every render. */
const hash = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};
const GLYPHS = "▚▞▙▟▛▜░▒▓01";

/** Decodes `text` from block glyphs between `start` and `start + duration` frames. */
function scramble(text: string, frame: number, start: number, duration: number) {
  const t = interpolate(frame, [start, start + duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shown = Math.floor(t * text.length);
  return [...text]
    .map((ch, i) => (i < shown || ch === " " ? ch : GLYPHS[Math.floor(hash(i * 31 + Math.floor(frame / 2)) * GLYPHS.length)]))
    .join("");
}

const fill = (bg: string): React.CSSProperties => ({ background: bg, color: bg === C.ink ? C.paper : C.ink });

export function Boot({ locale }: { locale: Locale }) {
  const frame = useCurrentFrame();
  const lines = [
    "> qwq render --year 2026",
    locale === "zh" ? "[ ok ] 载入回忆 ............ 365 天" : "[ ok ] loading memories ...... 365 days",
    locale === "zh" ? "[ ok ] 整理高光 ............ 4" : "[ ok ] compiling highlights .. 4",
    "[ ok ] waking QwQ ........... (◉w◉)",
  ];
  if (frame < 54) {
    return (
      <AbsoluteFill style={{ ...fill(C.ink), padding: 140, justifyContent: "flex-end", fontFamily: FONT.mono, fontSize: 34 }}>
        {lines.slice(0, Math.floor(frame / 12) + 1).map((l, i) => (
          <div key={i} style={{ color: i === 0 ? C.accent : undefined, marginTop: 10 }}>
            {l}
          </div>
        ))}
      </AbsoluteFill>
    );
  }
  const f = frame - 54;
  const draw = interpolate(f, [0, 34], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const look: [number, number] = [Math.sin(f / 9) * 0.9, Math.cos(f / 13) * 0.4];
  const blink = f > 50 && f < 56 ? 1 : 0;
  return (
    <AbsoluteFill style={{ ...fill(C.paper), alignItems: "center", justifyContent: "center", ...gridPaper }}>
      <QwQFace width={900} draw={draw} look={look} blink={blink} />
    </AbsoluteFill>
  );
}

const gridPaper: React.CSSProperties = {
  backgroundImage: `linear-gradient(rgba(20,20,20,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(20,20,20,0.06) 1px, transparent 1px)`,
  backgroundSize: "48px 48px",
};

/** "2026" as extruded kinetic type through the site's own ink pipeline. */
export function BigYear({ year }: { year: number }) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // The canvas only mounts once both typefaces are in hand, so its first frame
  // already has every letter (Remotion advances R3F only on frame changes).
  const [fonts, setFonts] = useState<{ display: Font; mono: Font } | null>(null);
  const [handle] = useState(() => delayRender("Loading 3D typefaces"));
  useEffect(() => {
    setFontUrlResolver((p) => staticFile(p));
    Promise.all([loadFont("display"), loadFont("mono")])
      .then(([display, mono]) => setFonts({ display, mono }))
      .finally(() => continueRender(handle));
  }, [handle]);

  const progress = () =>
    frame < 60
      ? interpolate(frame, [0, 60], [0, 1])
      : frame < 140
        ? 1
        : interpolate(frame, [140, 175], [1, 2], { extrapolateRight: "clamp" });

  if (!fonts) return <AbsoluteFill style={{ background: C.ink }} />;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <ThreeCanvas width={width} height={height} camera={{ fov: 35, position: [0, 0, 14], near: 0.1, far: 200 }} flat>
        <InkPipeline time={frame / fps} controls={{ invert: 1, bgInvert: 1, flash: frame >= 140 && frame < 142 ? 1 : 0, glitch: 0 }} />
        <KineticText typeface={fonts.display} text={String(year)} size={4.4} depth={1.4} position={[0, 0.5, 0]} accent={(i) => i === 3} progress={progress} />
        <KineticText
          font="mono"
          typeface={fonts.mono}
          text={`init(year: ${year});`}
          size={0.55}
          depth={0.14}
          position={[0, -3.1, 1]}
          seed={5}
          accent={(_, c) => "();:".includes(c)}
          progress={() => progress() - 0.15}
        />
      </ThreeCanvas>
    </AbsoluteFill>
  );
}

/** Each number grows along an engineering dimension line, arrows and all. */
export function Stats({ data, locale }: { data: YearData; locale: Locale }) {
  const frame = useCurrentFrame();
  const max = Math.max(...data.stats.map((s) => Math.log10(s.value + 1)));
  return (
    <AbsoluteFill style={{ ...fill(C.paper), ...gridPaper, padding: "110px 160px", fontFamily: FONT.mono }}>
      <div style={{ color: C.accent, fontSize: 26, letterSpacing: 4 }}>{"// stats.dwg"}</div>
      {data.stats.map((stat, i) => {
        const t = interpolate(frame - i * 14, [0, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
        const len = (Math.log10(stat.value + 1) / max) * 1100 * t;
        return (
          <div key={stat.key} style={{ marginTop: 52, opacity: t > 0 ? 1 : 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
              <span style={{ fontFamily: FONT.display, fontSize: 120, lineHeight: 0.9 }}>{Math.round(stat.value * t).toLocaleString()}</span>
              <span style={{ fontSize: 30 }}>{stat.label[locale]}</span>
            </div>
            <svg width={1200} height={30} style={{ marginTop: 10, overflow: "visible" }}>
              <line x1={0} y1={0} x2={0} y2={30} stroke={C.ink} strokeWidth={2} />
              <line x1={len} y1={0} x2={len} y2={30} stroke={C.ink} strokeWidth={2} />
              <line x1={4} y1={15} x2={Math.max(len - 4, 4)} y2={15} stroke={C.accent} strokeWidth={3} />
              <path d={`M4 15 l14 -7 v14 z`} fill={C.accent} />
              <path d={`M${len - 4} 15 l-14 -7 v14 z`} fill={C.accent} opacity={len > 30 ? 1 : 0} />
            </svg>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/** The contribution calendar fills in column by column; the busiest days burn accent. */
export function Heatmap({ data, locale }: { data: YearData; locale: Locale }) {
  const frame = useCurrentFrame();
  const cells = data.contributions;
  const peak = Math.max(...cells);
  const top = [...cells].sort((a, b) => b - a)[6];
  const total = cells.reduce((a, b) => a + b, 0);
  const shown = Math.floor(interpolate(frame, [0, 80], [0, 53], { extrapolateRight: "clamp" }));
  return (
    <AbsoluteFill style={{ ...fill(C.ink), alignItems: "center", justifyContent: "center", fontFamily: FONT.mono }}>
      <div style={{ fontSize: 30, color: C.accent, alignSelf: "flex-start", marginLeft: 150 }}>while (alive) {"{ commit(); }"}</div>
      <div style={{ display: "grid", gridTemplateRows: "repeat(7, 26px)", gridAutoFlow: "column", gridAutoColumns: "26px", gap: 5, marginTop: 50 }}>
        {cells.slice(0, 53 * 7).map((v, i) => {
          const col = Math.floor(i / 7);
          const k = v / peak;
          return (
            <div
              key={i}
              style={{
                border: `1px solid rgba(241,237,228,${col < shown ? 0.35 : 0.08})`,
                ...(col < shown && v > 0 ? halftone(v >= top ? C.accent : C.paper, 6, 0.6 + k * 2.6) : {}),
              }}
            />
          );
        })}
      </div>
      <div style={{ marginTop: 50, fontSize: 34 }}>
        {Math.round(total * Math.min(shown / 53, 1)).toLocaleString()} {locale === "zh" ? "次贡献" : "contributions"}
      </div>
    </AbsoluteFill>
  );
}

/** This year's projects boot up like CRTs, titles decoding in. */
export function Projects({ year, locale }: { year: number; locale: Locale }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const list = (projects.filter((p) => p.year === year).length ? projects.filter((p) => p.year === year) : projects).slice(0, 4);
  return (
    <AbsoluteFill style={{ ...fill(C.paper), ...gridPaper, padding: "110px 140px", fontFamily: FONT.mono }}>
      <div style={{ color: C.accent, fontSize: 26, letterSpacing: 4 }}>{"// render(projects)"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 50 }}>
        {list.map((p, i) => {
          const s = spring({ frame: frame - i * 10, fps, config: { damping: 14 } });
          return (
            <div
              key={p.slug}
              style={{
                transform: `translateX(${(1 - s) * 400}px)`,
                opacity: s,
                border: `3px solid ${C.ink}`,
                background: C.ink,
                color: C.paper,
                padding: 34,
                boxShadow: `12px 12px 0 ${C.accent}`,
                backgroundImage: "repeating-linear-gradient(0deg, rgba(241,237,228,0.06) 0 2px, transparent 2px 6px)",
              }}
            >
              <div style={{ color: C.accent, fontSize: 22 }}>
                P-{String(i + 1).padStart(2, "0")} / {p.year}
              </div>
              <div style={{ fontFamily: FONT.display, fontSize: 76, marginTop: 10 }}>{scramble(p.title, frame, i * 10 + 6, 22)}</div>
              <div style={{ fontSize: 24, opacity: 0.7, marginTop: 10 }}>{p.summary[locale]}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

export function Highlights({ data, locale }: { data: YearData; locale: Locale }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ ...fill(C.ink), padding: "140px 160px", fontFamily: FONT.mono, fontSize: 46 }}>
      <div style={{ color: C.accent, fontSize: 26, letterSpacing: 4 }}>{"// git log --oneline 2026"}</div>
      {data.highlights.map((h, i) => {
        const start = 10 + i * 30;
        const text = h[locale];
        const shown = Math.floor(interpolate(frame, [start, start + 20], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
        return (
          <div key={i} style={{ marginTop: 44, opacity: frame >= start ? 1 : 0 }}>
            <span style={{ color: C.accent }}>{frame > start + 22 ? "[✓] " : "[ ] "}</span>
            {[...text].slice(0, shown).join("")}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

export function Outro({ locale }: { locale: Locale }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ ...fill(C.paper), ...gridPaper, alignItems: "center", justifyContent: "center", gap: 40 }}>
      <div style={{ transform: `scale(${0.6 + s * 0.4})` }}>
        <QwQFace width={720} eyes="^" mouth="ω" wave={Math.sin(frame / 3) * 25} />
      </div>
      <div style={{ fontFamily: FONT.display, fontSize: 150, lineHeight: 0.9, letterSpacing: -4 }}>
        {locale === "zh" ? "2027 见" : "See you in 2027"}
      </div>
      <div style={{ fontFamily: FONT.mono, fontSize: 32, color: C.accent }}>qwq.my</div>
    </AbsoluteFill>
  );
}

/** Two frames of full inversion on every hard cut. */
export function CutFlash() {
  const frame = useCurrentFrame();
  return frame < 2 ? <AbsoluteFill style={{ background: C.paper, mixBlendMode: "difference" }} /> : null;
}
