"use client";

import { useSyncExternalStore } from "react";
import { isSoundOn, onSoundChange, setSound } from "@/lib/sound";

const subscribe = (cb: () => void) => onSoundChange(cb);

/** Header switch; four little bars dance while sound is on. */
export function SoundToggle({ labels }: { labels: { on: string; off: string } }) {
  const on = useSyncExternalStore(subscribe, isSoundOn, () => false);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? labels.off : labels.on}
      title={on ? labels.off : labels.on}
      data-cursor={on ? "MUTE" : "SOUND"}
      onClick={() => setSound(!on)}
      className={`label flex h-[22px] items-end gap-[2px] border px-2 py-1 transition-colors ${
        on ? "border-accent text-accent" : "border-ink hover:bg-ink hover:text-paper"
      }`}
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[2px] bg-current"
          style={{
            height: on ? undefined : 3,
            animation: on ? `eq 0.${6 + i}s ease-in-out ${i * 0.1}s infinite alternate` : undefined,
          }}
        />
      ))}
    </button>
  );
}
