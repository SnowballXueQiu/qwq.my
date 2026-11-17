"use client";

import { useEffect, useRef, useState } from "react";
import { prng } from "@/lib/prng";
import { tr, type Lang } from "./Figure";
import { useFrames } from "./useFrames";

const INK = "#141414";
const ACCENT = "#e8402a";
const SOFT = "#8a857c";

/** Bases as two bits each. Pairs are bitwise opposites: A 00 · T 11, C 01 · G 10. */
const BITS: Record<string, string> = { A: "00", C: "01", G: "10", T: "11" };
const PAIR: Record<string, string> = { A: "T", T: "A", C: "G", G: "C" };

const helixRand = prng(20250331);
const HELIX = Array.from({ length: 64 }, () => "ACGT"[Math.floor(helixRand() * 4)]);

/**
 * A double helix, turning slowly. A red read head sweeps along it: on one side the rungs
 * are bases, on the other the same rungs as bits. Point at the helix to move the head.
 */
export function HelixCode({ lang }: { lang: Lang }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ phase: 0, head: 0.35, dir: 1, pointer: null as number | null });

  const draw = () => {
    const c = canvas.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = c.clientWidth;
    const H = c.clientHeight;
    if (c.width !== Math.round(W * dpr)) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    const s = state.current;
    const cy = H / 2 + 4;
    const amp = Math.min(46, H * 0.3);
    // About ten rungs a turn, as in real B-DNA; the second strand trails by 0.8π (the grooves).
    const step = W < 480 ? 20 : 24;
    const k = (2 * Math.PI) / (step * 10);
    const lag = 0.8 * Math.PI;
    const headX = s.head * W;
    const strand = (x: number, off: number) => ({ y: cy + amp * Math.sin(k * x + s.phase + off), z: Math.cos(k * x + s.phase + off) });

    const strands = (front: boolean) => {
      for (const off of [0, lag]) {
        for (let x = 0; x < W; x += 3) {
          const a = strand(x, off);
          const b = strand(x + 3, off);
          if (a.z + b.z >= 0 !== front) continue;
          g.strokeStyle = front ? INK : SOFT;
          g.globalAlpha = front ? 1 : 0.45;
          g.lineWidth = front ? 1.6 + 1.2 * ((a.z + b.z) / 2) : 1.1;
          g.beginPath();
          g.moveTo(x, a.y);
          g.lineTo(x + 3, b.y);
          g.stroke();
        }
      }
    };

    strands(false);
    g.font = `10px ${getComputedStyle(c).fontFamily}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    const first = Math.floor(-step / 2);
    for (let i = 0; first + i * step < W + step; i++) {
      const x = first + i * step + step / 2;
      const top = strand(x, 0);
      const bottom = strand(x, lag);
      const depth = (top.z + bottom.z) / 2;
      const base = HELIX[i % HELIX.length];
      const pair = PAIR[base];
      // Left of the head the rungs read as bases while it moves right, and the other way back.
      const decoded = s.dir > 0 ? x < headX : x > headX;
      const mid = (top.y + bottom.y) / 2;
      g.globalAlpha = 0.35 + 0.65 * ((depth + 1) / 2);
      g.lineWidth = 1;
      g.strokeStyle = INK;
      g.beginPath();
      g.moveTo(x, top.y);
      g.lineTo(x, mid);
      g.stroke();
      g.strokeStyle = ACCENT;
      g.beginPath();
      g.moveTo(x, mid);
      g.lineTo(x, bottom.y);
      g.stroke();
      if (depth > -0.2) {
        g.fillStyle = decoded ? INK : SOFT;
        const lo = Math.min(top.y, bottom.y);
        const hi = Math.max(top.y, bottom.y);
        const [a, b] = top.y < bottom.y ? [base, pair] : [pair, base];
        g.fillText(decoded ? a : BITS[a], x, lo - 9);
        g.fillStyle = decoded ? ACCENT : SOFT;
        g.fillText(decoded ? b : BITS[b], x, hi + 9);
      }
    }
    strands(true);

    g.globalAlpha = 1;
    g.strokeStyle = ACCENT;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(headX, 14);
    g.lineTo(headX, H - 4);
    g.stroke();
    g.fillStyle = ACCENT;
    g.textAlign = s.head > 0.8 ? "right" : "left";
    g.fillText(s.dir > 0 ? "DECODE ▸" : "◂ ENCODE", headX + (s.head > 0.8 ? -6 : 6), 10);
  };

  useFrames(canvas, (dt) => {
    const s = state.current;
    s.phase += dt * 0.7;
    if (s.pointer !== null) s.head += (s.pointer - s.head) * Math.min(1, dt * 12);
    else {
      s.head += s.dir * dt * 0.09;
      if (s.head > 1.06 || s.head < -0.06) s.dir = -s.dir;
    }
    draw();
  });

  // First frame, and the still picture with reduced motion.
  useEffect(() => {
    draw();
    const observer = new ResizeObserver(() => draw());
    observer.observe(canvas.current!);
    return () => observer.disconnect();
  });

  return (
    <div>
      <canvas
        ref={canvas}
        className="block h-[170px] w-full touch-pan-y font-mono"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const s = state.current;
          const next = (e.clientX - r.left) / r.width;
          if (s.pointer !== null && next !== s.pointer) s.dir = next > s.pointer ? 1 : -1;
          s.pointer = next;
        }}
        onPointerLeave={() => (state.current.pointer = null)}
        role="img"
        aria-label={tr(lang, "一段转动的 DNA 双螺旋，碱基和二进制随红线互换", "A turning DNA double helix whose rungs switch between bases and bits as a red line passes")}
      />
      <p className="border-t border-ink px-3 py-2 font-mono text-[0.72rem] text-ink-soft">
        A = 00 · C = 01 · G = 10 · T = 11 ·{" "}
        {tr(lang, "配对的两个碱基，二进制正好按位取反", "paired bases are each other's bitwise NOT")}
      </p>
    </div>
  );
}

/* The genetic code, NCBI table 1: index 16·first + 4·second + third, bases in TCAG order. */
const CODE = "FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG";
const AMINO: Record<string, [string, string, string]> = {
  F: ["Phe", "苯丙氨酸", "phenylalanine"],
  L: ["Leu", "亮氨酸", "leucine"],
  I: ["Ile", "异亮氨酸", "isoleucine"],
  M: ["Met", "甲硫氨酸", "methionine"],
  V: ["Val", "缬氨酸", "valine"],
  S: ["Ser", "丝氨酸", "serine"],
  P: ["Pro", "脯氨酸", "proline"],
  T: ["Thr", "苏氨酸", "threonine"],
  A: ["Ala", "丙氨酸", "alanine"],
  Y: ["Tyr", "酪氨酸", "tyrosine"],
  H: ["His", "组氨酸", "histidine"],
  Q: ["Gln", "谷氨酰胺", "glutamine"],
  N: ["Asn", "天冬酰胺", "asparagine"],
  K: ["Lys", "赖氨酸", "lysine"],
  D: ["Asp", "天冬氨酸", "aspartate"],
  E: ["Glu", "谷氨酸", "glutamate"],
  C: ["Cys", "半胱氨酸", "cysteine"],
  W: ["Trp", "色氨酸", "tryptophan"],
  R: ["Arg", "精氨酸", "arginine"],
  G: ["Gly", "甘氨酸", "glycine"],
};
const translate = (codon: string) => CODE[[...codon].reduce((n, b) => n * 4 + "TCAG".indexOf(b === "U" ? "T" : b), 0)];

const START = "ATGTCTGGAAAATGGTAA";
const VW = 640;
const VH = 300;
const LEFT = 62;
const PITCH = (VW - LEFT * 2) / 18;
const bx = (i: number) => LEFT + PITCH * (i + 0.5);
/** Where each act starts and ends on the 0–1 playhead. */
const ACT = { transcribe: [0.06, 0.46], export: [0.46, 0.54], translate: [0.54, 0.94] } as const;
const progress = (t: number, [a, b]: readonly [number, number]) => Math.min(1, Math.max(0, (t - a) / (b - a)));

function randomGene() {
  const sense = [...CODE].map((aa, i) => (aa === "*" ? null : "TCAG"[i >> 4] + "TCAG"[(i >> 2) & 3] + "TCAG"[i & 3])).filter((c): c is string => c !== null);
  const pick = () => sense[Math.floor(Math.random() * sense.length)];
  return "ATG" + pick() + pick() + pick() + pick() + ["TAA", "TAG", "TGA"][Math.floor(Math.random() * 3)];
}

/**
 * The central dogma, played through on one short gene: RNA polymerase opens the DNA and
 * copies the template strand into mRNA (T becomes U); the mRNA leaves; a ribosome reads it
 * three bases at a time and strings the amino acids into a chain until a stop codon.
 */
export function CentralDogma({ lang }: { lang: Lang }) {
  const [gene, setGene] = useState(START);
  const [t, setT] = useState(0.3);
  const [playing, setPlaying] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const hold = useRef(0);

  useFrames(
    box,
    (dt) => {
      // Rests a moment on the finished protein, then plays again.
      if (t >= 1) {
        hold.current += dt;
        if (hold.current > 2.2) {
          hold.current = 0;
          setT(0);
        }
        return;
      }
      setT((v) => Math.min(1, v + dt / 16));
    },
    playing,
  );

  const mrna = gene.replaceAll("T", "U");
  const template = [...gene].map((b) => PAIR[b]);
  const codons = Array.from({ length: 6 }, (_, j) => mrna.slice(j * 3, j * 3 + 3));
  const copied = progress(t, ACT.transcribe) * 18;
  const away = progress(t, ACT.export);
  const read = progress(t, ACT.translate) * 6;
  // The ribosome rests on a codon, then slides on to the next one.
  const codon = Math.min(5, Math.floor(read));
  const slide = codon < 5 ? Math.max(0, (read - codon - 0.6) / 0.4) : 0;
  const polymerase = t > ACT.transcribe[0] && t < ACT.transcribe[1];
  const ribosome = t > ACT.translate[0] && t < 1;
  // Each amino acid joins the chain shortly after its codon is reached.
  const chain = codons.map(translate).filter((_, j) => read > j + 0.3);
  const mrnaY = 150 + away * 26;
  const ribX = bx(codon * 3 + 1) + slide * 3 * PITCH;

  let stage: string;
  if (t < ACT.transcribe[0]) stage = tr(lang, "一段基因：两条链按 A–T、C–G 配对。", "A gene: two strands, paired A–T and C–G.");
  else if (t < ACT.transcribe[1])
    stage = tr(
      lang,
      `① 转录：RNA 聚合酶解开双链，照着模板链合成 mRNA（${Math.floor(copied)} / 18），T 换成了 U。`,
      `① Transcription: RNA polymerase opens the strands and copies the template into mRNA (${Math.floor(copied)} / 18), with U in place of T.`,
    );
  else if (t < ACT.translate[0]) stage = tr(lang, "mRNA 离开细胞核，DNA 原封不动地留在原地。", "The mRNA leaves the nucleus; the DNA stays where it was, untouched.");
  else {
    const aa = translate(codons[codon]);
    stage =
      aa === "*"
        ? tr(lang, `③ 终止：读到终止密码子 ${codons[codon]}，蛋白质（多肽链）完成，之后会折叠成形去干活。`, `③ Stop: ${codons[codon]} is a stop codon. The chain is done, and will fold up and go to work.`)
        : tr(
            lang,
            `② 翻译：核糖体读到密码子 ${codons[codon]} → ${AMINO[aa][1]}（${AMINO[aa][0]}）${codon === 0 ? "，AUG 同时是起始信号" : ""}。`,
            `② Translation: the ribosome reads codon ${codons[codon]} → ${AMINO[aa][2]} (${AMINO[aa][0]})${codon === 0 ? "; AUG is also the start signal" : ""}.`,
          );
  }

  return (
    <div ref={box}>
      <svg viewBox={`0 0 ${VW} ${VH}`} className="block w-full select-none font-mono">
        {/* DNA: coding strand over template strand; the polymerase opens a bubble as it goes. */}
        <g opacity={1 - away * 0.6}>
          <text x={8} y={50} className="fill-[#8a857c] text-[11px]">
            DNA
          </text>
          {[...gene].map((b, i) => {
            const open = polymerase && Math.abs(i + 0.5 - copied) < 2.5 ? 9 : 0;
            return (
              <g key={i}>
                <line x1={bx(i)} x2={bx(i)} y1={54 - open} y2={84 + open} stroke={INK} strokeOpacity={open ? 0.12 : 0.35} strokeDasharray={open ? "2 3" : undefined} />
                <text x={bx(i)} y={48 - open} textAnchor="middle" className="fill-[#141414] text-[15px]">
                  {b}
                </text>
                <text x={bx(i)} y={98 + open} textAnchor="middle" className="fill-[#141414] text-[15px] font-bold">
                  {template[i]}
                </text>
              </g>
            );
          })}
          <text x={LEFT - 6} y={48} textAnchor="end" className="fill-[#8a857c] text-[11px]">
            5′
          </text>
          <text x={VW - LEFT + 6} y={48} className="fill-[#8a857c] text-[11px]">
            3′
          </text>
          <text x={LEFT - 6} y={98} textAnchor="end" className="fill-[#8a857c] text-[11px]">
            3′
          </text>
          <text x={VW - LEFT + 6} y={98} className="fill-[#8a857c] text-[11px]">
            5′
          </text>
          <text x={VW - 8} y={116} textAnchor="end" className="fill-[#8a857c] text-[11px]">
            {tr(lang, "粗体：模板链", "bold: template strand")}
          </text>
        </g>
        {polymerase && (
          <g transform={`translate(${LEFT + PITCH * copied},0)`}>
            <rect x={-PITCH * 2.4} y={26} width={PITCH * 3.4} height={86} rx={14} fill={ACCENT} fillOpacity={0.1} stroke={ACCENT} />
            <text x={-PITCH * 0.7} y={20} textAnchor="middle" className="fill-[#e8402a] text-[11px]">
              {tr(lang, "RNA 聚合酶", "RNA polymerase")}
            </text>
          </g>
        )}

        {/* mRNA, one codon per tint once it is being read. */}
        <g>
          {copied > 0 && (
            <text x={8} y={mrnaY + 4} className="fill-[#8a857c] text-[11px]">
              mRNA
            </text>
          )}
          {copied >= 18 && (
            <>
              <text x={LEFT - 6} y={mrnaY + 4} textAnchor="end" className="fill-[#8a857c] text-[11px]">
                5′
              </text>
              <text x={VW - LEFT + 6} y={mrnaY + 4} className="fill-[#8a857c] text-[11px]">
                3′
              </text>
            </>
          )}
          {[...mrna].map((b, i) =>
            i < copied ? (
              <g key={i}>
                {t > ACT.translate[0] && i % 3 === 0 && (
                  <rect x={bx(i) - PITCH / 2 + 1} y={mrnaY - 13} width={PITCH * 3 - 2} height={22} fill={INK} opacity={Math.floor(i / 3) % 2 ? 0.05 : 0.1} />
                )}
                <text x={bx(i)} y={mrnaY + 4} textAnchor="middle" className={`text-[15px] ${b === "U" ? "fill-[#e8402a] font-bold" : "fill-[#141414]"}`}>
                  {b}
                </text>
              </g>
            ) : null,
          )}
        </g>

        {/* The ribosome sits on the codon it is reading; the chain leaves through its large subunit. */}
        {ribosome && (
          <g transform={`translate(${ribX},${mrnaY})`}>
            <rect x={-PITCH * 1.7} y={-32} width={PITCH * 3.4} height={18} rx={9} fill="#f1ede4" fillOpacity={0.55} stroke={INK} strokeWidth={1.4} />
            <rect x={-PITCH * 1.9} y={12} width={PITCH * 3.8} height={28} rx={14} fill="#f1ede4" fillOpacity={0.55} stroke={INK} strokeWidth={1.4} />
            <text x={0} y={30} textAnchor="middle" className="fill-[#141414] text-[11px]">
              {tr(lang, "核糖体", "ribosome")}
            </text>
          </g>
        )}
        {ribosome && chain.length > 0 && chain.at(-1) !== "*" && (
          <line x1={ribX} y1={mrnaY + 40} x2={bx((chain.length - 1) * 3 + 1)} y2={232} stroke={INK} strokeWidth={1} strokeDasharray="2 3" />
        )}

        {/* The growing chain: one amino acid under each codon read. */}
        {chain.length > 0 && (
          <g>
            <text x={8} y={250} className="fill-[#8a857c] text-[11px]">
              {tr(lang, "蛋白质", "protein")}
            </text>
            {chain.map((aa, j) =>
              aa === "*" ? (
                <text key={j} x={bx(j * 3 + 1)} y={254} textAnchor="middle" className="fill-[#e8402a] text-[13px] font-bold">
                  {tr(lang, "终止", "STOP")}
                </text>
              ) : (
                <g key={j}>
                  {j > 0 && <line x1={bx(j * 3 - 2) + 16} x2={bx(j * 3 + 1) - 18} y1={250} y2={250} stroke={INK} strokeWidth={2} />}
                  <circle cx={bx(j * 3 + 1)} cy={250} r={19} fill={j === 0 ? ACCENT : INK} />
                  <text x={bx(j * 3 + 1)} y={254} textAnchor="middle" className="fill-[#f1ede4] text-[12px] font-bold">
                    {AMINO[aa][0]}
                  </text>
                  <text x={bx(j * 3 + 1)} y={284} textAnchor="middle" className="fill-[#8a857c] text-[12px]">
                    {lang === "zh" ? AMINO[aa][1] : AMINO[aa][2]}
                  </text>
                </g>
              ),
            )}
          </g>
        )}
      </svg>
      <div className="flex flex-wrap items-center gap-3 border-t border-ink px-3 py-2 font-mono text-[0.75rem]">
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={t}
          onChange={(e) => {
            setPlaying(false);
            setT(Number(e.target.value));
          }}
          className="min-w-32 flex-1"
          aria-label={tr(lang, "进度", "progress")}
        />
        <button type="button" onClick={() => setPlaying((v) => !v)} className="label border border-ink px-2 py-1">
          {playing ? "❚❚" : "▶"}
        </button>
        <button
          type="button"
          onClick={() => {
            setGene(randomGene());
            setT(0);
            setPlaying(true);
          }}
          className="label border border-ink px-2 py-1 hover:border-accent hover:text-accent"
        >
          {tr(lang, "换一段基因", "new gene")}
        </button>
      </div>
      <p className="min-h-[3.6em] border-t border-ink px-3 py-2 font-mono text-[0.75rem] text-ink-soft" aria-live="polite">
        {stage}
      </p>
    </div>
  );
}
