"use client";

import { useEffect, useRef, useState } from "react";
import { on } from "@/lib/fx";
import { GAME_LENGTH, GAME_LIVES, useGame } from "@/lib/game";
import { lockScroll } from "@/lib/scroll";
import { QwQLogo } from "@/components/ui/QwQLogo";

type Labels = {
  title: string;
  hint: string;
  score: string;
  best: string;
  squashed: string;
  passed: string;
  failed: string;
  retry: string;
  exit: string;
};

type Popup = { id: number; x: number; y: number; points: number; combo: number };

/** The DOM half of debug mode: countdown, score, lives, timer, hit popups and the result card. */
export function GameHUD({ labels }: { labels: Labels }) {
  const status = useGame((s) => s.status);
  const score = useGame((s) => s.score);
  const lives = useGame((s) => s.lives);
  const combo = useGame((s) => s.combo);
  const timeLeft = useGame((s) => s.timeLeft);
  const best = useGame((s) => s.best);
  const squashed = useGame((s) => s.squashed);
  const [count, setCount] = useState<string | null>(null);
  const [popups, setPopups] = useState<Popup[]>([]);
  const nextId = useRef(0);

  useEffect(() => on("game", ({ open }) => (open ? useGame.getState().start() : useGame.getState().exit())), []);

  useEffect(
    () =>
      on("hit", (hit) => {
        const id = nextId.current++;
        setPopups((p) => [...p, { id, ...hit }]);
        setTimeout(() => setPopups((p) => p.filter((q) => q.id !== id)), 800);
      }),
    [],
  );

  const active = status !== "idle";
  useEffect(() => {
    lockScroll(active);
    document.documentElement.classList.toggle("game-open", active);
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && useGame.getState().exit();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  useEffect(() => {
    if (status !== "countdown") return;
    const steps = ["3", "2", "1", "DEBUG!"];
    const timers = steps.map((step, i) => setTimeout(() => setCount(step), i * 600));
    timers.push(
      setTimeout(() => {
        setCount(null);
        useGame.getState().play();
      }, steps.length * 600),
    );
    return () => timers.forEach(clearTimeout);
  }, [status]);

  if (!active) return null;
  const passed = lives > 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-[75] font-mono text-[#f1ede4]">
      <div className="absolute left-1/2 top-[84px] flex -translate-x-1/2 items-center gap-6 border border-[#f1ede4]/50 bg-[#141414]/85 px-4 py-2">
        <span className="text-[10px] uppercase tracking-[0.16em] text-[#e8402a]">{labels.title}</span>
        <span className="tabular-nums">
          {labels.score} <b className="text-lg">{String(score).padStart(5, "0")}</b>
        </span>
        {combo > 1 && <span className="text-[#e8402a]">×{Math.min(combo, 8)}</span>}
        <span className="flex gap-1" aria-label={`${lives}/${GAME_LIVES}`}>
          {Array.from({ length: GAME_LIVES }, (_, i) => (
            <QwQLogo key={i} track={false} className={`h-3.5 w-auto ${i < lives ? "" : "opacity-20"}`} />
          ))}
        </span>
        <span className="relative h-1.5 w-28 border border-[#f1ede4]/60">
          <span className="absolute inset-y-0 left-0 bg-[#e8402a]" style={{ width: `${(timeLeft / GAME_LENGTH) * 100}%` }} />
        </span>
        <span className="w-8 text-right tabular-nums">{Math.ceil(timeLeft)}s</span>
      </div>

      {status === "playing" && (
        <p className="absolute bottom-24 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.16em] text-[#f1ede4]/60">
          {labels.hint}
        </p>
      )}

      {count && (
        <p key={count} className="absolute inset-0 flex animate-[ping_0.6s_ease-out] items-center justify-center font-display text-[18vw] font-black leading-none text-[#e8402a]">
          {count}
        </p>
      )}

      {popups.map((p) => (
        <span
          key={p.id}
          className="absolute -translate-x-1/2 animate-[float-up_0.8s_ease-out_forwards] font-display text-2xl font-black text-[#e8402a]"
          style={{ left: p.x, top: p.y }}
        >
          +{p.points}
          {p.combo > 1 && <small className="ml-1 text-sm text-[#f1ede4]">×{Math.min(p.combo, 8)}</small>}
        </span>
      ))}

      {status === "over" && (
        <div className="pointer-events-auto absolute left-1/2 top-1/2 w-[min(420px,90vw)] -translate-x-1/2 -translate-y-1/2 border border-[#f1ede4] bg-[#141414] p-6 shadow-[8px_8px_0_#e8402a]">
          <p className={`text-[11px] uppercase tracking-[0.16em] ${passed ? "text-[#f1ede4]" : "text-[#e8402a]"}`}>
            {passed ? labels.passed : labels.failed}
          </p>
          <p className="font-display mt-2 text-6xl font-black tabular-nums">{score}</p>
          <dl className="mt-4 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-[#f1ede4]/60">{labels.best}</dt>
            <dd className="text-right tabular-nums">{best}</dd>
            <dt className="text-[#f1ede4]/60">{labels.squashed}</dt>
            <dd className="text-right tabular-nums">{squashed}</dd>
          </dl>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => useGame.getState().start()}
              className="flex-1 border border-[#e8402a] bg-[#e8402a] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[#141414] hover:bg-transparent hover:text-[#e8402a]"
            >
              ↺ {labels.retry}
            </button>
            <button
              type="button"
              onClick={() => useGame.getState().exit()}
              className="flex-1 border border-[#f1ede4] px-3 py-2 text-[11px] uppercase tracking-[0.14em] hover:bg-[#f1ede4] hover:text-[#141414]"
            >
              {labels.exit}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
