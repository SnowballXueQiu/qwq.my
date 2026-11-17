"use client";

import { useRef, useState } from "react";
import { prng } from "@/lib/prng";
import { tr, type Lang } from "./Figure";
import { useFrames } from "./useFrames";

const INK = "#141414";
const ACCENT = "#e8402a";
const SOFT = "#8a857c";

const TOKENS = ["我", "想", "吃"];
const SIZE = 8;

// A toy network with seeded random weights, so the server and every browser agree.
const rand = prng(1003);
const r = () => rand() * 2 - 1;
const EMBED = TOKENS.map(() => Array.from({ length: 4 }, r));
const W_XH = Array.from({ length: SIZE }, () => Array.from({ length: 4 }, () => r() * 1.2));
const W_HH = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => r() * 0.7));
const B_H = Array.from({ length: SIZE }, () => r() * 0.2);
const dot = (w: number[], v: number[]) => w.reduce((sum, x, j) => sum + x * v[j], 0);

/** h<t> = tanh(W_xh·x<t> + W_hh·h<t−1> + b), with or without the W_hh term. */
function unroll(memory: boolean) {
  const states: number[][] = [];
  let h = new Array<number>(SIZE).fill(0);
  for (const x of EMBED) {
    const prev = h;
    // Rounded: Math.tanh may differ in the last bit between the server and a browser.
    h = prev.map((_, i) => Math.round(Math.tanh(dot(W_XH[i], x) + (memory ? dot(W_HH[i], prev) : 0) + B_H[i]) * 1000) / 1000);
    states.push(h);
  }
  return states;
}
const STATES = { on: unroll(true), off: unroll(false) };

/** Made-up next-word guesses: with memory the net sees the whole sentence, without it only the last word. */
const GUESS: Record<"on" | "off", [string, number][][]> = {
  on: [
    [["想", 0.46], ["是", 0.31], ["爱", 0.23]],
    [["吃", 0.52], ["你", 0.27], ["睡", 0.21]],
    [["烧烤", 0.8], ["减肥", 0.2]],
  ],
  off: [
    [["想", 0.46], ["是", 0.31], ["爱", 0.23]],
    [["法", 0.44], ["要", 0.33], ["念", 0.23]],
    [["饭", 0.48], ["了", 0.31], ["瓜", 0.21]],
  ],
};

const VW = 640;
const VH = 320;
const CX = [180, 350, 520];
const Y_TOP = 14;
const H_TOP = 150;
const X_TOP = 252;
const BOX = 136;

const sup = (t: number | string) => <tspan dy={-5} fontSize={8}>{`<${t}>`}</tspan>;
const sub = (s: string) => (
  <tspan dy={3} fontSize={8}>
    {s}
  </tspan>
);

/**
 * An RNN unrolled over 我 · 想 · 吃: each step mixes the new word with the hidden state
 * it carried from the last step, then guesses the next word. Switch the memory off and
 * every step sees only its own word.
 */
export function RnnUnroll({ lang }: { lang: Lang }) {
  const [step, setStep] = useState(2);
  const [memory, setMemory] = useState(true);
  const [playing, setPlaying] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const clock = useRef(0);

  useFrames(
    box,
    (dt) => {
      clock.current += dt;
      if (clock.current > (step === 2 ? 3.4 : 1.8)) {
        clock.current = 0;
        setStep((s) => (s + 1) % 3);
      }
    },
    playing,
  );

  const key = memory ? "on" : "off";
  const states = STATES[key];
  const go = (s: number) => {
    setPlaying(false);
    setStep(s);
  };
  const [best, prob] = GUESS[key][step][0];
  const p = Math.round(prob * 100);
  const note = [
    tr(lang, `t = 1：输入「我」，记忆 h<0> 还是空的 → 下一个字最可能是「${best}」（${p}%）。`, `t = 1: input 我 (I); the memory h<0> is still empty → the likeliest next word is 「${best}」 (${p}%).`),
    memory
      ? tr(lang, `t = 2：输入「想」，和 h<1> 里记着的「我」合在一起 → 「${best}」（${p}%）。`, `t = 2: input 想 (want), mixed with the 我 kept in h<1> → 「${best}」 (${p}%).`)
      : tr(lang, `t = 2：没有记忆，只看见「想」→ 猜成「${best}」（${p}%），凑出一个「想法」。`, `t = 2: no memory, only 想 → it guesses 「${best}」 (${p}%), as in 想法 (idea).`),
    memory
      ? tr(lang, `t = 3：输入「吃」，h<2> 里还记着「我想」→ 最可能接「${best}」（${p}%）。`, `t = 3: input 吃 (eat); h<2> still holds 我想 (I want) → most likely 「${best}」 (BBQ, ${p}%).`)
      : tr(lang, `t = 3：没有记忆，只看见「吃」→ 猜成「${best}」（${p}%），前面的「我想」全忘了。`, `t = 3: no memory, only 吃 → it guesses 「${best}」 (rice, ${p}%); 我想 is forgotten.`),
  ][step];

  return (
    <div ref={box}>
      <svg viewBox={`0 0 ${VW} ${VH}`} className="block w-full select-none font-mono">
        {/* h<0>: the empty memory the first step starts from. */}
        <g opacity={memory ? 1 : 0.3}>
          <rect x={22} y={H_TOP + 8} width={62} height={30} fill="none" stroke={SOFT} strokeDasharray="3 3" />
          <text x={53} y={H_TOP + 27} textAnchor="middle" className="fill-[#8a857c] text-[12px]">
            h{sup(0)}
            <tspan dy={5}> = 0</tspan>
          </text>
        </g>
        {CX.map((cx, t) => {
          const active = t === step;
          const shown = t <= step;
          const h = states[t];
          const from = t === 0 ? 84 : CX[t - 1] + BOX / 2;
          const flow = active ? "flow-dash" : undefined;
          return (
            <g key={t} opacity={shown ? 1 : 0.16}>
              {/* x → h */}
              <line x1={cx} x2={cx} y1={X_TOP} y2={H_TOP + 48} stroke={active ? ACCENT : INK} strokeWidth={1.4} strokeDasharray={active ? "5 5" : undefined} className={flow} />
              {/* h<t−1> → h<t> */}
              <line
                x1={from}
                x2={cx - BOX / 2 - 4}
                y1={H_TOP + 23}
                y2={H_TOP + 23}
                stroke={memory ? (active ? ACCENT : INK) : SOFT}
                strokeWidth={1.4}
                strokeDasharray={memory ? (active ? "5 5" : undefined) : "2 4"}
                className={memory ? flow : undefined}
              />
              <path d={`M${cx - BOX / 2 - 4},${H_TOP + 23} l-7,-4 v8 z`} fill={memory ? (active ? ACCENT : INK) : SOFT} />
              {!memory && (
                <text x={(from + cx - BOX / 2) / 2} y={H_TOP + 27} textAnchor="middle" className="fill-[#e8402a] text-[13px] font-bold">
                  ×
                </text>
              )}
              {/* h → y */}
              <line x1={cx} x2={cx} y1={H_TOP} y2={Y_TOP + 92} stroke={active ? ACCENT : INK} strokeWidth={1.4} strokeDasharray={active ? "5 5" : undefined} className={flow} />
              <path d={`M${cx},${Y_TOP + 92} l-4,7 h8 z`} fill={active ? ACCENT : INK} />

              {/* The hidden state: eight numbers in (−1, 1); ink for +, red for −. */}
              <rect x={cx - BOX / 2} y={H_TOP} width={BOX} height={46} fill="#f1ede4" stroke={active ? ACCENT : INK} strokeWidth={active ? 2 : 1.2} />
              {h.map((v, i) => (
                <rect key={i} x={cx - 60 + i * 15} y={H_TOP + 16} width={13} height={13} fill={v >= 0 ? INK : ACCENT} fillOpacity={(0.12 + 0.88 * Math.abs(v)).toFixed(3)}>
                  <title>{v.toFixed(3)}</title>
                </rect>
              ))}
              <text x={cx - BOX / 2 + 4} y={H_TOP + 11} className="fill-[#8a857c] text-[11px]">
                h{sup(t + 1)}
              </text>

              {/* The input word. */}
              <rect x={cx - 26} y={X_TOP} width={52} height={40} fill={active ? INK : "#f1ede4"} stroke={INK} strokeWidth={1.2} />
              <text x={cx} y={X_TOP + 27} textAnchor="middle" className={`text-[18px] ${active ? "fill-[#f1ede4]" : "fill-[#141414]"}`}>
                {TOKENS[t]}
              </text>
              <text x={cx} y={X_TOP + 58} textAnchor="middle" className="fill-[#8a857c] text-[11px]">
                x{sup(t + 1)}
              </text>

              {/* The guess for the next word. */}
              <rect x={cx - BOX / 2} y={Y_TOP} width={BOX} height={92} fill="#f1ede4" stroke={active ? ACCENT : INK} strokeWidth={active ? 2 : 1.2} />
              <text x={cx - BOX / 2 + 4} y={Y_TOP + 12} className="fill-[#8a857c] text-[11px]">
                y{sup(t + 1)}
              </text>
              {GUESS[key][t].map(([word, prob], i) => (
                <g key={word} transform={`translate(${cx - BOX / 2 + 8},${Y_TOP + 30 + i * 22})`}>
                  <text y={4} className="fill-[#141414] text-[13px]">
                    {word}
                  </text>
                  <rect x={34} y={-5} width={70 * prob} height={10} fill={i === 0 ? ACCENT : INK} fillOpacity={i === 0 ? 1 : 0.35} />
                  <text x={BOX - 16} y={4} textAnchor="end" className="fill-[#141414] text-[13px]">
                    {Math.round(prob * 100)}%
                  </text>
                </g>
              ))}
            </g>
          );
        })}
        {/* The weights, labelled once: the same three matrices at every step. */}
        <text x={CX[0] + 6} y={X_TOP - 18} className="fill-[#8a857c] text-[12px]">
          W{sub("xh")}
        </text>
        <text x={CX[0] + 6} y={H_TOP - 14} className="fill-[#8a857c] text-[12px]">
          W{sub("hy")}
        </text>
        <text x={(CX[0] + CX[1]) / 2} y={H_TOP + 14} textAnchor="middle" className="fill-[#8a857c] text-[12px]">
          W{sub("hh")}
        </text>
      </svg>
      <div className="flex flex-wrap items-center gap-2 border-t border-ink px-3 py-2 font-mono text-[0.75rem]">
        {TOKENS.map((tok, t) => (
          <button
            key={t}
            type="button"
            onClick={() => go(t)}
            className={`label border px-2 py-1 normal-case ${t === step ? "border-ink bg-ink text-paper" : "border-ink"}`}
            aria-pressed={t === step}
          >
            t = {t + 1} · {tok}
          </button>
        ))}
        <button type="button" onClick={() => setPlaying((v) => !v)} className="label border border-ink px-2 py-1">
          {playing ? "❚❚" : "▶"}
        </button>
        <button
          type="button"
          onClick={() => setMemory((v) => !v)}
          aria-pressed={memory}
          className={`label ml-auto border px-2 py-1 normal-case ${memory ? "border-accent bg-accent text-paper" : "border-ink"}`}
        >
          {tr(lang, "记忆 W_hh：", "memory W_hh: ")}
          {memory ? tr(lang, "开", "on") : tr(lang, "关", "off")}
        </button>
      </div>
      <p className="min-h-[3.6em] border-t border-ink px-3 py-2 font-mono text-[0.75rem] text-ink-soft" aria-live="polite">
        {note}
      </p>
    </div>
  );
}
