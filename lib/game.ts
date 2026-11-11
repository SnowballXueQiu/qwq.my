import { create } from "zustand";

export type GameStatus = "idle" | "countdown" | "playing" | "over";

export const GAME_LENGTH = 60;
export const GAME_LIVES = 3;
const BEST_KEY = "qwq-debug-best";

type GameState = {
  status: GameStatus;
  score: number;
  lives: number;
  combo: number;
  timeLeft: number;
  best: number;
  squashed: number;
  start: () => void;
  play: () => void;
  hit: (points: number) => number;
  miss: () => void;
  tick: (dt: number) => void;
  exit: () => void;
};

let lastHit = 0;

export const useGame = create<GameState>((set, get) => ({
  status: "idle",
  score: 0,
  lives: GAME_LIVES,
  combo: 0,
  timeLeft: GAME_LENGTH,
  best: 0,
  squashed: 0,
  start: () => {
    let best = 0;
    try {
      best = Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {}
    set({ status: "countdown", score: 0, lives: GAME_LIVES, combo: 0, timeLeft: GAME_LENGTH, best, squashed: 0 });
  },
  play: () => set({ status: "playing" }),
  /** Registers a squash and returns the points actually awarded (with combo). */
  hit: (points) => {
    const now = performance.now();
    const combo = now - lastHit < 1200 ? get().combo + 1 : 1;
    lastHit = now;
    const awarded = points * Math.min(combo, 8);
    set((s) => ({ score: s.score + awarded, combo, squashed: s.squashed + 1 }));
    return awarded;
  },
  miss: () => {
    const lives = get().lives - 1;
    set({ lives, combo: 0 });
    if (lives <= 0) finish();
  },
  tick: (dt) => {
    const s = get();
    if (s.status !== "playing") return;
    const timeLeft = Math.max(0, s.timeLeft - dt);
    set({ timeLeft });
    if (timeLeft === 0) finish();
  },
  exit: () => set({ status: "idle" }),
}));

function finish() {
  const { score, best } = useGame.getState();
  const next = Math.max(score, best);
  try {
    localStorage.setItem(BEST_KEY, String(next));
  } catch {}
  useGame.setState({ status: "over", best: next });
}

// Handy for poking at the game from devtools during development.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __qwqGame: typeof useGame }).__qwqGame = useGame;
}
