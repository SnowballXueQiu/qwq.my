"use client";

import type { SkillGroup } from "@/content/skills";
import type { Locale } from "@/lib/i18n";
import { DebugButton } from "@/components/game/DebugButton";
import { Panel } from "./Panel";
import { useSceneIndex } from "./SceneReadout";

/** Every skill, grouped; the group the camera is visiting lights up. */
export function SkillsPanel({
  groups,
  locale,
  labels,
}: {
  groups: SkillGroup[];
  locale: Locale;
  labels: { heading: string; bom: string; debug: string };
}) {
  const active = useSceneIndex("skills", groups.length);
  return (
    // On phones the 3D card already shows the group in view; the full list would hide it.
    <Panel className="hidden max-w-[420px] md:block">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">{labels.heading}</h2>
        <span className="label text-ink-soft">{labels.bom}</span>
      </div>
      <dl className="mt-3 space-y-1.5">
        {groups.map((g, i) => (
          <div
            key={g.id}
            className={`grid grid-cols-[72px_1fr] items-baseline gap-2 border-l-2 pl-2 transition-colors duration-300 ${
              i === active ? "border-accent" : "border-transparent"
            }`}
          >
            <dt className={`label ${i === active ? "text-accent" : "text-ink-soft"}`}>{g.title[locale]}</dt>
            <dd className="flex flex-wrap gap-1">
              {g.items.map((item) => (
                <span
                  key={item}
                  className={`border px-1.5 py-px font-mono text-[11px] leading-4 transition-colors duration-300 ${
                    i === active ? "border-ink bg-ink text-paper" : "border-rule"
                  }`}
                >
                  {item}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <DebugButton label={labels.debug} />
    </Panel>
  );
}
