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
    <Panel className="max-w-[400px]">
      <div className="label flex justify-between text-ink-soft">
        <span className="text-accent">
          P-{String(index + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}
        </span>
        <span>{p.year}</span>
      </div>
      <h3 className="font-display mt-2 text-4xl font-extrabold tracking-tight">
        <ScrambleText text={p.title} />
      </h3>
      <p className="label mt-1 text-accent">{p.role[locale]}</p>
      <p className="mt-2 text-sm text-ink-soft">{p.summary[locale]}</p>
      <p className="label mt-3 text-ink-soft">{p.tags.join(" · ")}</p>
      <div className="mt-4 flex gap-2">
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
      <div aria-hidden className="mt-4 flex gap-1">
        {projects.map((q, i) => (
          <span key={q.slug} className={`h-1 flex-1 ${i === index ? "bg-accent" : i < index ? "bg-ink" : "bg-rule"}`} />
        ))}
      </div>
    </Panel>
  );
}
