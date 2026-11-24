/**
 * The promo, section by section. Every scene runs in its own Sequence, so
 * frames here are local to the section (see edit.ts for where each starts).
 */
import type { ReactNode } from "react";
import { AbsoluteFill, Img, Sequence, useCurrentFrame } from "remotion";
import { QwQFace } from "../YearInReview/QwQFace";
import {
  BigCursor,
  C,
  Caption,
  DrawStrokes,
  FONT,
  Footage,
  GlitchCut,
  Grain,
  Paper,
  PenGlyph,
  Red,
  SheetTag,
  Slam,
  TrackedCursor,
  capsule,
  clamp01,
  easeIn,
  easeInOut,
  easeOut,
  ellipse,
  footageSrc,
  lerp,
  pop,
  ramp,
  rect,
  roundRect,
  textStrokes,
  type Pt,
  type Stroke,
} from "./kit";

/** Cut list helper: back-to-back clips of `len` frames each. */
function Cuts({ clips }: { clips: { len: number; node: ReactNode }[] }) {
  let at = 0;
  return (
    <>
      {clips.map((c, i) => {
        const from = at;
        at += c.len;
        return (
          <Sequence key={i} from={from} durationInFrames={c.len}>
            {c.node}
          </Sequence>
        );
      })}
    </>
  );
}

const Dim = ({ amount }: { amount: number }) => <AbsoluteFill style={{ background: `rgba(20,20,20,${amount})` }} />;

/** hero_wake: QwQ is fast asleep from about frame 10 of the take. */
const WAKE_FROM = 20;
/** hero_doodle_tear: the sheet shatters at take frame ~418; holding 62 frames puts that on the drop. */
export const TEAR_DELAY = 62;

// ── A · Hook ────────────────────────────────────────────────────────────────
export function Hook() {
  const f = useCurrentFrame();
  const shots: [string, number][] = [
    ["tour", 2290],
    ["tour", 180],
    ["tour", 430],
    ["tour", 1150],
  ];
  return (
    <AbsoluteFill style={{ background: C.dark }}>
      <Cuts
        clips={[
          ...shots.map(([shot, start]) => ({ len: 60, node: <Footage shot={shot} start={start} /> })),
          { len: 80, node: <Footage shot="hero_wake" start={540} /> },
          { len: 80, node: <Footage shot="hero_doodle_tear" start={400} /> },
          { len: 80, node: <Footage shot="tour" start={1640} /> },
        ]}
      />
      <Dim amount={f < 240 ? 0.42 : 0.2} />
      {[60, 120, 180, 240, 320, 400].map((a) => (
        <GlitchCut key={a} at={a} len={6} />
      ))}
      <Slam at={6} out={228} size={110} y={420}>
        这是一个
      </Slam>
      <Slam at={34} out={228} size={210} y={590} bg={C.accent} rot={-3}>
        个人网站
      </Slam>
      <Slam at={244} out={312} size={190} x={1340} y={300} rot={-4} bg={C.ink}>
        它会哭
      </Slam>
      <Slam at={324} out={392} size={230} x={620} y={560} rot={3} bg={C.accent}>
        会碎
      </Slam>
      <Slam at={404} out={472} size={180} y={500} rot={-2} bg={C.ink}>
        还能开车
      </Slam>
      <HookCounter />
    </AbsoluteFill>
  );
}

/** A little "REC"-style timecode in the corner, so the montage reads as footage. */
function HookCounter() {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", right: 70, bottom: 120, fontFamily: FONT.mono, fontSize: 22, color: C.paper, letterSpacing: "0.12em", opacity: 0.85 }}>
      <span style={{ color: C.accent }}>● </span>qwq.my · {String(Math.floor(f / 60)).padStart(2, "0")}:{String(f % 60).padStart(2, "0")}
    </div>
  );
}

// ── B · The pen draws the site ──────────────────────────────────────────────
/** Geometry of the real hero sheet (CSS px), traced from the capture. */
const HERO = {
  eyeL: [965, 1228, 423] as const,
  eyeR: [1458, 1722, 415] as const,
  w: [
    [1268, 448],
    [1303, 516],
    [1340, 468],
    [1377, 516],
    [1414, 448],
  ] as Pt[],
  blushL: [1082, 578],
  blushR: [1614, 568],
};

function sheetFrameStrokes(): Stroke[] {
  const s: Stroke[] = [
    { pts: rect(12, 12, 1896, 1056), width: 3 },
    { pts: rect(30, 30, 1860, 1020), width: 3 },
    { pts: [[30, 74], [1890, 74]], width: 2 },
  ];
  for (let i = 1; i < 8; i++) {
    const x = 30 + (1860 / 8) * i;
    s.push({ pts: [[x, 12], [x, 30]], width: 2 }, { pts: [[x, 1050], [x, 1068]], width: 2 });
  }
  for (let i = 1; i < 6; i++) {
    const y = 30 + (1020 / 6) * i;
    s.push({ pts: [[12, y], [30, y]], width: 2 }, { pts: [[1890, y], [1908, y]], width: 2 });
  }
  // Title block, bottom right.
  s.push({ pts: rect(1552, 942, 338, 108), width: 3 }, { pts: [[1552, 982], [1890, 982]], width: 2 }, { pts: [[1690, 942], [1690, 982]], width: 2 }, { pts: [[1826, 942], [1826, 1050]], width: 2 });
  return s;
}

function faceStrokes(): Stroke[] {
  return [
    { pts: capsule(HERO.eyeL[0] + 35, HERO.eyeL[1] - 35, HERO.eyeL[2], 35), width: 5 },
    { pts: capsule(HERO.eyeR[0] + 35, HERO.eyeR[1] - 35, HERO.eyeR[2], 35), width: 5 },
    { pts: HERO.w, width: 30 },
    { pts: ellipse(HERO.blushL[0], HERO.blushL[1], 31, 15, 40), color: C.accent, width: 4, fill: C.accent },
    { pts: ellipse(HERO.blushR[0], HERO.blushR[1], 31, 15, 40), color: C.accent, width: 4, fill: C.accent },
    // Dimension lines, as on the real sheet.
    { pts: [[1097, 210], [1097, 234]], color: C.accent, width: 2 },
    { pts: [[1097, 222], [1590, 222]], color: C.accent, width: 2 },
    { pts: [[1590, 210], [1590, 234]], color: C.accent, width: 2 },
    { pts: [[950, 590], [950, 614]], color: C.accent, width: 2 },
    { pts: [[950, 602], [1245, 602]], color: C.accent, width: 2 },
    { pts: [[1245, 590], [1245, 614]], color: C.accent, width: 2 },
  ];
}

export function Draw() {
  const f = useCurrentFrame();
  const frame = sheetFrameStrokes();
  const face = faceStrokes();
  const title = textStrokes("qwq.my", 120, 820, 300, "display", 6).strokes.map((pts) => ({ pts, width: 4 }));
  const pFrame = ramp(f, 6, 170, (t) => t);
  const pFace = ramp(f, 180, 400, (t) => t);
  const pTitle = ramp(f, 400, 540, (t) => t);
  const real = ramp(f, 560, 640, easeInOut);
  // The pen only shows on the stroke being drawn right now.
  const active = f < 172 ? "frame" : f < 402 ? "face" : f < 542 ? "title" : "none";
  // Eases in from a touch close to exactly 1:1, so the cut to the real page is seamless.
  const zoom = 1.05 - 0.05 * ramp(f, 0, 640);
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        <Paper />
        <DrawStrokes strokes={frame} progress={pFrame} pen={active === "frame"} />
        <DrawStrokes strokes={face} progress={pFace} pen={active === "face"} />
        {/* The w is drawn thick in ink, then hollowed out with paper, like the site's outlined glyph. */}
        {pFace > 0.45 && (
          <svg viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
            <polyline points={HERO.w.map((p) => p.join(",")).join(" ")} fill="none" stroke={C.paper} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" opacity={clamp01((pFace - 0.45) * 8)} />
          </svg>
        )}
        <DrawStrokes strokes={title} progress={pTitle} pen={active === "title"} penScale={1.1} />
        {/* Zz, small and late. */}
        <div style={{ position: "absolute", left: 1740, top: 150, fontFamily: FONT.display, fontSize: 96, color: C.ink, opacity: ramp(f, 380, 410), transform: `rotate(-12deg) translateY(${Math.sin(f / 20) * 6}px)` }}>
          z<span style={{ fontSize: 64 }}>z</span>
        </div>
        <AbsoluteFill style={{ opacity: real }}>
          {/* Frame 20: fast asleep (the first frames are still nodding off). */}
          <Footage shot="hero_wake" hold={WAKE_FROM} />
        </AbsoluteFill>
      </AbsoluteFill>
      <Grain opacity={0.08 * (1 - real)} />
      <Caption zh="一切，从一张图纸开始" en="It all starts on a sheet of paper" start={20} end={200} />
      <Caption zh={<>我想要一个……<Red>能玩的</Red>个人网站</>} en="I wanted a personal site you can actually play with" start={230} end={440} />
      <Caption zh={<>于是有了它：<Red>qwq.my</Red></>} en="So I made one: qwq.my" start={460} end={700} />
    </AbsoluteFill>
  );
}

// ── C · Wake QwQ up ─────────────────────────────────────────────────────────
export function Wake() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <AbsoluteFill style={{ transform: `scale(${1 + 0.06 * ramp(f, 400, 580)}) translate(${-30 * ramp(f, 400, 580)}px, ${8 * ramp(f, 400, 580)}px)`, transformOrigin: "1340px 470px" }}>
        <Footage shot="hero_wake" start={WAKE_FROM} />
        <TrackedCursor shot="hero_wake" start={WAKE_FROM} size={1.15} />
      </AbsoluteFill>
      <Caption zh="它在睡觉。" en="It's asleep." start={10} end={125} />
      <Caption zh={<>鼠标一靠近，它就<Red>醒了</Red>，眼睛还会跟着你转</>} en="Come closer: it wakes up, and its eyes follow you" start={130} end={300} />
      <Caption zh="戳它一下——" en="Poke it" start={305} end={420} />
      <Caption zh={<>连戳五下……它真的会<Red>哭</Red></>} en="Poke it five times... and it actually cries" start={428} end={710} />
      <Slam at={540} out={700} size={150} x={560} y={300} rot={-6} color={C.paper} bg={C.accent}>
        QwQ
      </Slam>
    </AbsoluteFill>
  );
}

// ── D · Doodle, then tear ───────────────────────────────────────────────────
export function Tear() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.dark }}>
      {/* Held for TEAR_DELAY frames, so the sheet shatters right on the drop (section end). */}
      <Footage shot="hero_doodle_tear" delay={TEAR_DELAY} />
      {f < 232 + TEAR_DELAY && <TrackedCursor shot="hero_doodle_tear" delay={TEAR_DELAY} pen size={1.1} />}
      <Caption zh={<>还能直接在图纸上<Red>画画</Red>（按住 Shift 换红笔）</>} en="Draw right on the sheet. Hold Shift for red ink" start={12} end={265} />
      <Caption zh="画太快，它看晕了 @_@" en="Draw too fast and it gets dizzy" start={272} end={372} />
      <Caption zh="然后，往下滚——" en="Now, scroll down" start={380} end={472} />
      <ScrollHint start={380} end={472} />
    </AbsoluteFill>
  );
}

function ScrollHint({ start, end }: { start: number; end: number }) {
  const f = useCurrentFrame();
  if (f < start || f > end) return null;
  const o = ramp(f, start, start + 10) * (1 - ramp(f, end - 8, end));
  const bob = Math.sin((f - start) / 6) * 14;
  return (
    <div style={{ position: "absolute", left: 1700, top: 760 + bob, fontFamily: FONT.mono, fontSize: 120, color: C.accent, opacity: o, fontWeight: 700 }}>
      ↓
    </div>
  );
}

// ── E · Take it apart ───────────────────────────────────────────────────────
const LAYERS: { shot: string; layer?: string; clip?: string; zh: string; en: string }[] = [
  { shot: "pano_normal", zh: "法线", en: "NORMALS" },
  { shot: "pano_depth", zh: "深度", en: "DEPTH" },
  { shot: "pano_lines", zh: "墨线 · Sobel 描边", en: "INK LINES" },
  { shot: "pano_dots", zh: "网点 · 半调排线", en: "HALFTONE" },
  { shot: "pano_world", zh: "成片 · Three.js 场景", en: "3D WORLD" },
  // The content layer is the project card, which never moves: cut it out of the full take.
  { shot: "pano", clip: "inset(700px 1445px 48px 40px)", zh: "网页文字 · HTML", en: "CONTENT" },
  { shot: "pano_frame", zh: "图纸框 · HUD", en: "FRAME" },
];

export function Pano() {
  const f = useCurrentFrame();
  const t = f - 120; // exploded-view clock; the pano shot starts here
  const open = ramp(t, 60, 200) * (1 - ramp(t, 860, 1000));
  const rotX = 56 * open;
  const rotZ = -18 * open + 26 * ramp(t, 200, 860, (x) => x) * open;
  const scale = 1 - 0.48 * open;
  const gap = 150 * open;
  return (
    <AbsoluteFill style={{ background: C.dark }}>
      <Sequence durationInFrames={120}>
        <Footage shot="hero_doodle_tear" start={480 - TEAR_DELAY} />
        <Slam at={14} out={110} size={200} color={C.paper} bg={C.accent} rot={-3}>
          拆开看看
        </Slam>
      </Sequence>
      <Sequence from={120}>
        <Paper dark />
        <AbsoluteFill style={{ perspective: 2600, perspectiveOrigin: "50% 40%" }}>
          <AbsoluteFill style={{ transformStyle: "preserve-3d", transform: `translate(${170 * open}px, ${-30 * open}px) scale(${scale}) rotateX(${rotX}deg) rotateZ(${rotZ}deg)` }}>
            {LAYERS.map((l, i) => {
              // While the caption names the shader passes, each one rises above the stack in turn, so it is seen whole.
              const lift = i < 4 ? ramp(t, 436 + i * 62, 454 + i * 62, easeOut) * (1 - ramp(t, 482 + i * 62, 498 + i * 62)) : 0;
              const z = (i - 3) * gap + (4.6 - (i - 3)) * gap * lift;
              // Below the finished world, the passes only show while the stack is open.
              const show = i >= 4 ? 1 : clamp01(open * 1.4);
              return (
                <div
                  key={l.shot + (l.layer ?? "")}
                  style={{
                    position: "absolute",
                    inset: 0,
                    transform: `translateZ(${z}px)`,
                    transformStyle: "preserve-3d",
                    opacity: show,
                    outline: open > 0.02 ? `${3 / Math.max(scale, 0.5)}px solid ${i >= 5 ? C.accent : "rgba(241,237,228,0.55)"}` : "none",
                    background: i >= 5 && open > 0.02 ? `rgba(232,64,42,${0.05 * open})` : undefined,
                  }}
                >
                  {l.clip ? (
                    <AbsoluteFill style={{ clipPath: l.clip }}>
                      <PanoLayer shot={l.shot} t={t} />
                    </AbsoluteFill>
                  ) : (
                    <PanoLayer shot={l.shot} layer={l.layer} t={t} />
                  )}
                  <LayerLabel i={i} zh={l.zh} en={l.en} open={open} t={t} tilt={rotX} />
                </div>
              );
            })}
          </AbsoluteFill>
        </AbsoluteFill>
        {/* Flat, the stack is just the page: show the full-resolution take, fading as it opens. */}
        {open < 0.15 && (
          <AbsoluteFill style={{ opacity: 1 - open / 0.15 }}>
            <PanoLayer shot="pano" t={t} />
          </AbsoluteFill>
        )}
        <Grain opacity={0.05} />
        <Sequence from={0}>
          <Caption zh={<>你看到的每一帧，其实是<Red>七层</Red>叠出来的</>} en="Every frame you see is seven layers stacked up" start={200} end={420} />
          <Caption zh="3D 部分：Three.js + GLSL 着色器，法线、深度、墨线、网点" en="3D: Three.js + GLSL shaders. Normals, depth, ink lines, halftone" start={430} end={680} />
          <Caption zh="最上面盖一层真正的网页文字：能选中、能点、能被搜到" en="Real HTML on top: selectable, clickable, searchable" start={690} end={940} />
          <StackChips start={960} end={1078} />
        </Sequence>
      </Sequence>
    </AbsoluteFill>
  );
}

function PanoLayer({ shot, layer, t }: { shot: string; layer?: string; t: number }) {
  return <Img src={footageSrc(shot, Math.max(0, t), layer ?? "full")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
}

/** A tab on the edge of each layer, written in as the stack opens. */
function LayerLabel({ i, zh, en, open, t, tilt }: { i: number; zh: string; en: string; open: number; t: number; tilt: number }) {
  const shown = ramp(t, 210 + i * 26, 240 + i * 26, easeOut) * open;
  if (shown <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: -40,
        top: 40,
        // Stood up off the plane, like a flag, so it faces the camera instead of lying squashed.
        transform: `translateX(-100%) rotateX(${-tilt}deg)`,
        transformOrigin: "100% 100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        opacity: shown,
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ background: i >= 5 ? C.accent : C.paper, color: i >= 5 ? C.paper : C.ink, padding: "10px 22px", fontFamily: FONT.cjk, fontWeight: 900, fontSize: 64, clipPath: `inset(0 ${(1 - shown) * 100}% 0 0)` }}>
        {zh}
        <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 30, marginLeft: 18, opacity: 0.6 }}>L{i + 1} · {en}</span>
      </div>
      <div style={{ width: 40 * shown, height: 4, background: i >= 5 ? C.accent : C.paper }} />
    </div>
  );
}

function StackChips({ start, end }: { start: number; end: number }) {
  const f = useCurrentFrame();
  if (f < start || f > end) return null;
  const items = ["Next.js 16", "React 19", "Three.js", "React Three Fiber", "GLSL", "GSAP", "Lenis", "Remotion"];
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 110, display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap", padding: "0 200px" }}>
      {items.map((it, i) => {
        const p = pop(f, start + i * 5, 14);
        return (
          <div key={it} style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 30, letterSpacing: "0.06em", color: C.ink, background: C.paper, border: `3px solid ${C.ink}`, padding: "10px 20px", transform: `scale(${p}) rotate(${(i % 2 ? 1 : -1) * 2}deg)`, opacity: clamp01((f - start - i * 5) / 4) * (1 - ramp(f, end - 8, end)), boxShadow: `6px 6px 0 ${C.accent}` }}>
            {it}
          </div>
        );
      })}
    </div>
  );
}

// ── F · The tour ────────────────────────────────────────────────────────────
export function Tour() {
  return (
    <AbsoluteFill style={{ background: C.dark }}>
      <Footage shot="tour" />
      {[480, 960, 1440, 1920, 2400, 2700].map((a) => (
        <GlitchCut key={a} at={a} len={5} />
      ))}
      <SheetTag no="02" zh="关于我" en="ABOUT" start={8} end={230} />
      <Caption zh={<>关于我：一行 <Red>init(me);</Red> 把自己初始化</>} en="About me: one line, init(me);" start={30} end={240} />
      <Caption zh="去过的地方，在 3D 地图上一个个亮起来" en="Places I've been, lit up on a 3D map" start={255} end={470} />

      <SheetTag no="03" zh="技能" en="SKILLS" start={488} end={700} />
      <Caption zh="技能" en="Skills" start={500} end={720} />
      <Caption zh={<>从 TypeScript 到 Rust，再到 <Red>LLM</Red></>} en="From TypeScript to Rust to LLMs" start={730} end={950} />

      <SheetTag no="04" zh="项目" en="PROJECTS" start={968} end={1180} />
      <Caption zh="项目：一块块会闪的屏幕" en="Projects on flickering screens" start={980} end={1200} />
      <Caption zh="sb.h、苦力怕论坛问卷、Rust 语言圣经……" en="sb.h, the KLPBBS survey, the Rust course..." start={1210} end={1430} />

      <SheetTag no="05" zh="经历" en="TIMELINE" start={1448} end={1660} />
      <Caption zh="经历是一条路，鹈鹕骑着车带你一站站开过去" en="My timeline is a road. A pelican rides you through it" start={1460} end={1905} />

      <Caption zh={<>路的尽头：我近一年的 <Red>GitHub 贡献</Red></>} en="At the end of the road: my GitHub year" start={1930} end={2150} />
      <Caption zh="每一天就是一栋楼，数据实时" en="Every day is a tower. Live data" start={2160} end={2395} />

      <SheetTag no="06" zh="文章" en="WRITING" start={2408} end={2640} />
      <Caption zh="文章" en="Writing" start={2420} end={2660} />
      <SheetTag no="07" zh="联系" en="CONTACT" start={2702} end={2878} />
      <Caption zh="最后，碎掉的图纸又拼了回来" en="And in the end, the sheet comes back together" start={2700} end={2875} />
    </AbsoluteFill>
  );
}

// ── G · Desktop and phone ───────────────────────────────────────────────────
const SCREEN = { x: 150, y: 190, w: 1100, h: 619 };
const PHONE = { x: 1430, y: 150, w: 330, h: 714 };

export function Dual() {
  const f = useCurrentFrame();
  const monitor: Stroke[] = [
    { pts: roundRect(SCREEN.x - 22, SCREEN.y - 22, SCREEN.w + 44, SCREEN.h + 44, 18), width: 5 },
    { pts: [[640, SCREEN.y + SCREEN.h + 22], [610, 900], [790, 900], [760, SCREEN.y + SCREEN.h + 22]], width: 5 },
    { pts: [[520, 902], [880, 902]], width: 6 },
  ];
  const phone: Stroke[] = [
    { pts: roundRect(PHONE.x - 16, PHONE.y - 16, PHONE.w + 32, PHONE.h + 32, 46), width: 5 },
    { pts: capsule(PHONE.x + PHONE.w / 2 - 40, PHONE.x + PHONE.w / 2 + 40, PHONE.y + 22, 10), width: 4, fill: C.ink },
  ];
  const on = ramp(f, 70, 110);
  const local = Math.max(0, f - 80);
  return (
    <AbsoluteFill>
      <Paper />
      <div style={{ position: "absolute", left: SCREEN.x, top: SCREEN.y, width: SCREEN.w, height: SCREEN.h, overflow: "hidden", opacity: on, background: C.dark }}>
        <Footage shot="dual_desk" hold={local} />
      </div>
      <div style={{ position: "absolute", left: PHONE.x, top: PHONE.y, width: PHONE.w, height: PHONE.h, overflow: "hidden", opacity: on, borderRadius: 32, background: C.dark }}>
        <Footage shot="dual_phone" hold={local} />
      </div>
      <DrawStrokes strokes={monitor} progress={ramp(f, 0, 70, (t) => t)} />
      <DrawStrokes strokes={phone} progress={ramp(f, 30, 95, (t) => t)} />
      <DeviceTag x={SCREEN.x - 22} y={SCREEN.y - 70} text="DESKTOP · 1920 × 1080" start={90} />
      <DeviceTag x={PHONE.x - 16} y={PHONE.y - 70 + 20} text="MOBILE · 390 × 844" start={110} />
      <Grain opacity={0.06} />
      <Caption zh="电脑上，它是一部用滚轮播放的电影" en="On desktop: a film you play with your scroll wheel" start={120} end={460} y={935} />
      <Caption zh={<>手机上，换了一整套布局，<Red>一样能玩</Red></>} en="On phones: a whole layout of its own, just as playable" start={480} end={950} y={935} />
    </AbsoluteFill>
  );
}

function DeviceTag({ x, y, text, start }: { x: number; y: number; text: string; start: number }) {
  const f = useCurrentFrame();
  const t = ramp(f, start, start + 14, easeOut);
  return (
    <div style={{ position: "absolute", left: x, top: y, fontFamily: FONT.mono, fontWeight: 700, fontSize: 24, letterSpacing: "0.12em", color: C.accent, opacity: t, clipPath: `inset(0 ${(1 - t) * 100}% 0 0)` }}>
      ┌ {text}
    </div>
  );
}

// ── H · Two languages ───────────────────────────────────────────────────────
export function Lang() {
  const f = useCurrentFrame();
  const x = lerp(f, [0, 40, 150, 260, 370, 470], [1920, 1920, 960, 960, 0, 0]) as number;
  const eased = x;
  return (
    <AbsoluteFill style={{ background: C.dark }}>
      <Footage shot="bi_en" />
      <AbsoluteFill style={{ clipPath: `inset(0 ${1920 - eased}px 0 0)` }}>
        <Footage shot="bi_zh" />
      </AbsoluteFill>
      {eased > 2 && eased < 1918 && (
        <svg viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
          <line x1={eased} y1={0} x2={eased} y2={1080} stroke={C.accent} strokeWidth={6} />
          <PenGlyph x={eased} y={540 + Math.sin(f / 9) * 140} tilt={20} />
        </svg>
      )}
      <LangChip x={Math.max(60, eased - 250)} text="中文" visible={eased > 300} />
      <LangChip x={Math.min(1700, eased + 50)} text="English" visible={eased < 1620} />
      <Caption zh={<>中文 / English，右上角<Red>一键切换</Red></>} en="Chinese and English, one click in the corner" start={30} end={470} />
    </AbsoluteFill>
  );
}

function LangChip({ x, text, visible }: { x: number; text: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <div style={{ position: "absolute", left: x, top: 120, fontFamily: FONT.cjk, fontWeight: 900, fontSize: 44, background: C.paper, color: C.ink, padding: "6px 22px", border: `4px solid ${C.ink}`, boxShadow: `6px 6px 0 ${C.accent}` }}>
      {text}
    </div>
  );
}

// ── I · Easter eggs ─────────────────────────────────────────────────────────
/** The real crash comes ~160 frames after Enter (the deletions scroll first): run those at 4× so it lands early in the silent bar. */
const CRASH_AT = 400;
function TerminalClip() {
  const f = useCurrentFrame();
  const src = f < 360 ? f : f < CRASH_AT ? 360 + (f - 360) * 4 : Math.min(559, 520 + (f - CRASH_AT));
  return <Footage shot="egg_terminal" hold={src} />;
}

export function Eggs() {
  const f = useCurrentFrame();
  const shake = f >= CRASH_AT && f < CRASH_AT + 20 ? Math.sin(f * 3) * (CRASH_AT + 20 - f) * 1.6 : 0;
  return (
    <AbsoluteFill style={{ background: C.dark }}>
      <AbsoluteFill style={{ transform: `translateX(${shake}px)` }}>
        <Cuts
          clips={[
            { len: 480, node: <TerminalClip /> },
            { len: 240, node: <Footage shot="egg_overview" start={40} /> },
            { len: 240, node: <Footage shot="egg_game" start={40} /> },
          ]}
        />
      </AbsoluteFill>
      <GlitchCut at={CRASH_AT} len={10} />
      <GlitchCut at={480} len={6} />
      <GlitchCut at={720} len={6} />
      <Caption zh={<>右上角的 <Red>&gt;_</Red> ，是一个真的终端</>} en="That >_ in the corner is a real terminal" start={10} end={190} />
      <Caption zh="查系统信息、让 QwQ 换表情……" en="System info, new faces for QwQ..." start={195} end={300} />
      <Caption zh={<>那如果输入 <Red>sudo rm -rf /</Red> 呢？</>} en="And what if you type sudo rm -rf / ?" start={305} end={396} />
      <Slam at={CRASH_AT + 12} out={474} size={120} y={860} rot={-3} bg={C.ink}>
        （它真的会崩）
      </Slam>
      <Caption zh={<>点「<Red>全景</Red>」，整个世界一次看完</>} en="Hit Overview: the whole world at once" start={492} end={712} />
      <Caption zh={<>还藏了一个<Red>抓 bug</Red> 小游戏</>} en="And a hidden bug-squashing game" start={732} end={955} />
    </AbsoluteFill>
  );
}

// ── J · Star, follow ────────────────────────────────────────────────────────
/** Where GitHub's buttons are in the captured stills (CSS px of the 1920×1080 page). */
export const GH = {
  star: { x: 1484, y: 188, w: 84, h: 28 },
  follow: { x: 352, y: 491, w: 296, h: 31 },
  /** "…求求求求一个免费的star🌟！！" in the repo's About. */
  plea: [
    [[1438, 346], [1568, 346]],
    [[1296, 370], [1392, 370]],
  ] as Pt[][],
};

function BrowserWindow({ children, progress }: { children: ReactNode; progress: number }) {
  const W = { x: 160, y: 110, w: 1600, h: 900 + 40 };
  const strokes: Stroke[] = [
    { pts: roundRect(W.x, W.y, W.w, W.h, 16), width: 5 },
    { pts: [[W.x, W.y + 40], [W.x + W.w, W.y + 40]], width: 4 },
  ];
  const on = ramp(progress, 0.7, 1);
  return (
    <>
      <div style={{ position: "absolute", left: W.x, top: W.y + 40, width: W.w, height: 900, overflow: "hidden", opacity: on, background: "#fff" }}>{children}</div>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", left: W.x + 22 + i * 30, top: W.y + 12, width: 16, height: 16, borderRadius: 8, border: `3px solid ${C.ink}`, background: i === 0 ? C.accent : "transparent", opacity: on }} />
      ))}
      <DrawStrokes strokes={strokes} progress={progress} />
    </>
  );
}

/** A GitHub still inside the browser window, zoomed toward `focus` with a cursor clicking `target`. */
function GithubScene({ shot, target, clickAt, label, start, underline }: { shot: string; target: { x: number; y: number; w: number; h: number }; clickAt: number; label: { before: string; after: string }; start: number; underline?: Pt[][] }) {
  const f = useCurrentFrame() - start;
  const zoom = 1 + 0.9 * ramp(f, 140, 300);
  const fx = target.x + target.w / 2;
  const fy = target.y + target.h / 2;
  // The window shows the page at 1600/1920 scale.
  const k = 1600 / 1920;
  const cursorFrom: Pt = [1500, 1000];
  const tx = 160 + fx * k;
  const ty = 150 + fy * k;
  const mt = ramp(f, 170, clickAt - 10);
  const cx = cursorFrom[0] + (tx - cursorFrom[0]) * mt;
  const cy = cursorFrom[1] + (ty - cursorFrom[1]) * mt;
  const down = f >= clickAt && f < clickAt + 8;
  const clicked = f >= clickAt;
  const bump = clicked ? pop(f, clickAt, 16) : 0;
  return (
    <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${tx}px ${ty}px` }}>
      <BrowserWindow progress={ramp(f, 0, 80, (t) => t)}>
        <Img src={footageSrc(shot, 0)} style={{ width: 1600, height: 900, objectFit: "cover", objectPosition: "top" }} />
        {/* After the click, the button flips to its pressed state, drawn on top of the still. */}
        {clicked && (
          <div
            style={{
              position: "absolute",
              left: target.x * k - 6,
              top: target.y * k - 6,
              width: target.w * k + 12,
              height: target.h * k + 12,
              background: C.accent,
              color: "#fff",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Noto Sans CJK SC', sans-serif",
              fontWeight: 700,
              fontSize: 15,
              transform: `scale(${0.6 + 0.4 * bump})`,
            }}
          >
            {label.after}
          </div>
        )}
      </BrowserWindow>
      {underline && (
        <DrawStrokes
          strokes={underline.map((line) => ({ pts: line.map(([x, y]) => [160 + x * k, 150 + y * k] as Pt), color: C.accent, width: 5 }))}
          progress={ramp(f, 70, 125, (t) => t)}
          pen={f > 70 && f < 125}
          penScale={0.6}
        />
      )}
      {f > 90 && <BigCursor x={cx} y={cy} down={down} clickAge={f >= clickAt ? f - clickAt : undefined} size={0.7} />}
      {f > 120 && !clicked && <Ring x={tx} y={ty} f={f - 120} />}
    </AbsoluteFill>
  );
}

/** A red pen circle drawn around a target. */
function Ring({ x, y, f }: { x: number; y: number; f: number }) {
  const pts = ellipse(x, y, 120, 48, 60, -2.4).map(([px, py], i) => [px + Math.sin(i) * 2, py + Math.cos(i * 1.3) * 2] as Pt);
  return <DrawStrokes strokes={[{ pts, color: C.accent, width: 6 }]} progress={ramp(f, 0, 30, (t) => t)} pen={f < 30} penScale={0.7} />;
}

export function Cta() {
  return (
    <AbsoluteFill>
      <Paper />
      <Sequence durationInFrames={130}>
        <Slam at={6} size={150} y={470} rot={-2} color={C.paper} bg={C.ink}>
          代码<span style={{ color: C.accent }}>全部开源</span>
        </Slam>
        <Slam at={30} size={44} y={640} rot={0} color={C.ink} style={{ fontFamily: FONT.mono, fontWeight: 700 }}>
          github.com/SnowballXueQiu/qwq.my
        </Slam>
      </Sequence>
      <Sequence from={120} durationInFrames={600}>
        <GithubScene shot="gh_repo" target={GH.star} clickAt={330} label={{ before: "Star", after: "★ Starred" }} start={0} underline={GH.plea} />
        <Caption zh={<>所以……觉得有意思的话，点个 <Red>Star</Red> 吧</>} en="So if you liked it, give it a star" start={178} end={330} />
        <Caption zh="每一个 Star，都是我继续画下去的动力" en="Every star keeps me drawing" start={340} end={590} />
      </Sequence>
      <Sequence from={720} durationInFrames={480}>
        <GithubScene shot="gh_profile" target={GH.follow} clickAt={300} label={{ before: "Follow", after: "Following" }} start={0} />
        <Caption zh={<>顺手<Red>关注</Red>一下我的 GitHub</>} en="And follow me on GitHub" start={20} end={290} />
        <Caption zh={<>@<Red>SnowballXueQiu</Red></>} en="github.com/SnowballXueQiu" start={300} end={470} />
      </Sequence>
      <Sequence from={1200} durationInFrames={240}>
        <Triple />
      </Sequence>
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
}

/** B站's 一键三连, drawn by the pen: thumbs up, coin, star. */
function Triple() {
  const f = useCurrentFrame();
  const icons: { label: string; strokes: Stroke[]; x: number }[] = [
    {
      label: "点赞",
      x: 560,
      strokes: [
        { pts: [[-60, -10], [-60, 70], [-30, 70], [-30, -10], [-60, -10]], width: 8 },
        { pts: [[-30, -5], [0, -40], [10, -85], [35, -80], [35, -30], [80, -30], [85, -5], [70, 65], [-30, 65]], width: 8 },
      ],
    },
    {
      label: "投币",
      x: 960,
      strokes: [
        { pts: ellipse(0, 0, 80, 80, 60), width: 8 },
        { pts: ellipse(0, 0, 55, 55, 60), width: 4 },
        // ¥: a V, the stem, two bars.
        { pts: [[-26, -38], [0, -2], [26, -38]], width: 8, color: C.accent },
        { pts: [[0, -2], [0, 42]], width: 8, color: C.accent },
        { pts: [[-24, 6], [24, 6]], width: 7, color: C.accent },
        { pts: [[-24, 22], [24, 22]], width: 7, color: C.accent },
      ],
    },
    {
      label: "收藏",
      x: 1360,
      strokes: [
        {
          pts: Array.from({ length: 11 }, (_, i) => {
            const a = -Math.PI / 2 + (i * Math.PI) / 5;
            const r = i % 2 ? 36 : 88;
            return [Math.cos(a) * r, Math.sin(a) * r] as Pt;
          }),
          width: 8,
        },
      ],
    },
  ];
  return (
    <AbsoluteFill>
      <Slam at={4} size={96} y={250} rot={-1} color={C.ink}>
        如果你也喜欢，<span style={{ color: C.accent }}>一键三连</span>
      </Slam>
      {icons.map((ic, i) => {
        const p = ramp(f, 30 + i * 40, 70 + i * 40, (t) => t);
        const strokes = ic.strokes.map((s) => ({ ...s, pts: s.pts.map(([x, y]) => [x + ic.x, y + 560] as Pt) }));
        return (
          <div key={ic.label}>
            <DrawStrokes strokes={strokes} progress={p} pen={p > 0 && p < 1} penScale={0.8} />
            <div style={{ position: "absolute", left: ic.x - 100, width: 200, top: 690, textAlign: "center", fontFamily: FONT.cjk, fontWeight: 900, fontSize: 54, color: C.ink, opacity: ramp(f, 60 + i * 40, 80 + i * 40) }}>{ic.label}</div>
          </div>
        );
      })}
      <Caption zh={<>B 站一键三连，GitHub 点个 Star，我们下次见</>} en="Like, coin, favourite, star. See you next time" start={150} end={238} />
    </AbsoluteFill>
  );
}

// ── K · End card ────────────────────────────────────────────────────────────
export function End() {
  const f = useCurrentFrame();
  const blink = f > 230 && f < 242 ? Math.sin(((f - 230) / 12) * Math.PI) : 0;
  const look: [number, number] = [Math.sin(f / 40) * 0.6, Math.cos(f / 55) * 0.3];
  const title = textStrokes("qwq.my", 0, 0, 240, "display", 4);
  const ox = 960 - title.width / 2;
  const strokes = title.strokes.map((pts) => ({ pts: pts.map(([x, y]) => [x + ox, y + 800] as Pt), width: 5 }));
  const fill = ramp(f, 210, 240);
  const fade = ramp(f, 420, 480, easeIn);
  return (
    <AbsoluteFill>
      <Paper />
      <div style={{ position: "absolute", left: 960 - 330, top: 170, transform: `rotate(${Math.sin(f / 50) * 2}deg)` }}>
        <QwQFace width={660} draw={ramp(f, 0, 90, easeOut)} blink={blink} look={look} />
      </div>
      <DrawStrokes strokes={strokes} progress={ramp(f, 80, 210, (t) => t)} />
      <div style={{ position: "absolute", left: ox, top: 800 - 240 * 0.74, fontFamily: FONT.display, fontSize: 240, lineHeight: 1, color: C.ink, opacity: fill, letterSpacing: 4 }}>qwq.my</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 905, textAlign: "center", fontFamily: FONT.mono, fontSize: 28, letterSpacing: "0.3em", color: C.accent, opacity: ramp(f, 230, 260) }}>
        谢谢观看 · THANKS FOR WATCHING
      </div>
      <Grain opacity={0.07} />
      <AbsoluteFill style={{ background: C.paper, opacity: fade }} />
    </AbsoluteFill>
  );
}

