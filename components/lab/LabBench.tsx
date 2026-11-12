"use client";

import { useEffect, useRef, useState } from "react";
import { InkFluid } from "./InkFluid";
import { RD_PRESETS, ReactionDiffusion, type RdPreset } from "./ReactionDiffusion";

type Labels = {
  fluid: { title: string; body: string; hint: string };
  rd: { title: string; body: string; hint: string; reset: string };
};

/** Pauses a toy's simulation while it's scrolled out of view. */
function useOnScreen<T extends Element>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, visible] as const;
}

function Experiment({
  code,
  title,
  body,
  hint,
  controls,
  children,
}: {
  code: string;
  title: string;
  body: string;
  hint: string;
  controls?: React.ReactNode;
  children: (visible: boolean) => React.ReactNode;
}) {
  const [ref, visible] = useOnScreen<HTMLDivElement>();
  return (
    <section className="mt-16 grid gap-6 lg:grid-cols-[1fr_300px]">
      <div ref={ref} className="relative aspect-[16/10] border border-ink shadow-[8px_8px_0_var(--accent)]">
        {children(visible)}
        <span className="label pointer-events-none absolute left-2 top-2 bg-paper px-1 text-accent">{code}</span>
        <span className="label pointer-events-none absolute bottom-2 right-2 bg-paper px-1 text-ink-soft">{hint}</span>
      </div>
      <div>
        <p className="label text-accent">{code}</p>
        <h2 className="font-display mt-2 text-3xl font-extrabold tracking-tight">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
        {controls && <div className="mt-5 flex flex-wrap gap-2">{controls}</div>}
      </div>
    </section>
  );
}

export function LabBench({ labels }: { labels: Labels }) {
  const [preset, setPreset] = useState<RdPreset>("coral");
  const [resetKey, setResetKey] = useState(1);
  const button = (active: boolean) =>
    `label border px-2 py-1 transition-colors ${active ? "border-accent bg-accent text-paper" : "border-ink hover:bg-ink hover:text-paper"}`;
  return (
    <>
      <Experiment code="EXP-01 · INK FLUID" title={labels.fluid.title} body={labels.fluid.body} hint={labels.fluid.hint}>
        {(visible) => <InkFluid paused={!visible} />}
      </Experiment>
      <Experiment
        code="EXP-02 · GRAY–SCOTT"
        title={labels.rd.title}
        body={labels.rd.body}
        hint={labels.rd.hint}
        controls={
          <>
            {(Object.keys(RD_PRESETS) as RdPreset[]).map((p) => (
              <button key={p} type="button" onClick={() => setPreset(p)} className={button(p === preset)}>
                {p}
              </button>
            ))}
            <button type="button" onClick={() => setResetKey((k) => k + 1)} className={button(false)}>
              ↺ {labels.rd.reset}
            </button>
          </>
        }
      >
        {(visible) => <ReactionDiffusion preset={preset} resetKey={resetKey} paused={!visible} />}
      </Experiment>
    </>
  );
}
