"use client";

import { useEffect, useState } from "react";
import { emit, on } from "@/lib/fx";

/** sudo rm -rf / — the page shakes apart, panics, then reboots. */
export function CrashOverlay() {
  const [phase, setPhase] = useState<"idle" | "shake" | "panic">("idle");

  useEffect(
    () =>
      on("crash", () => {
        const html = document.documentElement;
        setPhase("shake");
        html.classList.add("is-crashing");
        emit("glitch", { duration: 1.2, amount: 0.3 });
        emit("face", { expression: "@w@", duration: 1.6 });
        setTimeout(() => {
          html.classList.remove("is-crashing");
          setPhase("panic");
        }, 1600);
        setTimeout(() => {
          setPhase("idle");
          emit("reboot", {});
        }, 3400);
      }),
    [],
  );

  if (phase !== "panic") return null;
  return (
    <div className="fixed inset-0 z-[96] flex animate-[panic-in_0.6s_ease-out] flex-col items-start justify-center gap-4 bg-[#e8402a] p-[8vw] font-mono text-[#141414]">
      <p className="text-6xl font-black">QAQ</p>
      <p className="text-lg">kernel panic — not syncing: attempted to kill /home/me</p>
      <p className="text-sm opacity-70">rebooting in 2s …</p>
    </div>
  );
}
