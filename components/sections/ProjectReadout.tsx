"use client";

import type { Project } from "@/content/projects";
import type { Locale } from "@/lib/i18n";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { Panel } from "./Panel";
import { useSceneIndex } from "./SceneReadout";

/** Shows whichever project's monolith the camera is passing, in sync with the 3D corridor. */
export function ProjectReadout({
  projects,
  locale,
  labels,
}: {
  projects: Project[];
  locale: Locale;
  labels: { view: string; source: string };
}) {
  const index = useSceneIndex("projects", projects.length);

  const p = projects[index];
  return (
    <Panel className="max-w-[400px] !p-3 md:!p-5">
      <div className="label flex justify-between text-ink-soft">
        <span className="text-accent">
          P-{String(index + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}
        </span>
        <span>{p.year}</span>
      </div>
      <h3 className="font-display mt-1 text-2xl font-extrabold tracking-tight md:mt-2 md:text-4xl">
        <ScrambleText text={p.title} />
      </h3>
      <p className="label mt-1 text-accent">{p.role[locale]}</p>
      <p className="mt-1 line-clamp-2 text-sm text-ink-soft md:mt-2 md:line-clamp-none">{p.summary[locale]}</p>
      <p className="label mt-3 hidden text-ink-soft md:block">{p.tags.join(" · ")}</p>
      <div className="mt-2 flex gap-2 md:mt-4">
        {p.href && (
          <a href={p.href} target="_blank" rel="noreferrer" className="label border border-ink px-2 py-1 hover:bg-ink hover:text-paper">
            {labels.view} ↗
          </a>
        )}
        {p.repo && (
          <a href={p.repo} target="_blank" rel="noreferrer" className="label border border-ink px-2 py-1 hover:bg-ink hover:text-paper">
            {labels.source} ↗
          </a>
        )}
      </div>
      {/* Progress ticks: one per monolith. */}
      <div aria-hidden className="mt-2 flex gap-1 md:mt-4">
        {projects.map((q, i) => (
          <span key={q.slug} className={`h-1 flex-1 ${i === index ? "bg-accent" : i < index ? "bg-ink" : "bg-rule"}`} />
        ))}
      </div>
    </Panel>
  );
}
