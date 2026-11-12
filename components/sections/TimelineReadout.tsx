"use client";

import { whenLabel, type TimelineEvent } from "@/content/timeline";
import type { GithubData } from "@/lib/githubFetch";
import type { Locale } from "@/lib/i18n";
import { TIMELINE_SLOTS } from "@/lib/sheetLengths";
import { PlayYearButton } from "@/components/video/PlayYearButton";
import { Panel } from "./Panel";
import { useSceneIndex } from "./SceneReadout";

/**
 * A compact index of the road: where you are, what's next, and the GitHub
 * numbers the plaza at the end is built from. The stories themselves are on
 * the signs beside the road.
 */
export function TimelineReadout({
  events,
  locale,
  github,
  labels,
}: {
  events: TimelineEvent[];
  locale: Locale;
  github: GithubData;
  labels: { play: string; contributions: string; repos: string };
}) {
  const index = useSceneIndex("timeline", TIMELINE_SLOTS);
  const atPlaza = index >= events.length;
  return (
    <Panel className="relative z-20 max-w-[400px] font-mono">
      {/* On phones the roadside signs carry the story; keep just the GitHub line and the film. */}
      <p className="label hidden text-ink-soft md:block">
        <span className="text-accent">while</span> (alive) {"{"}
      </p>
      <ol className="mt-1.5 hidden text-[11px] leading-[18px] md:block">
        {events.map((e, i) => (
          <li
            key={e.date + e.title.en}
            className={`flex gap-3 pl-4 transition-opacity duration-300 ${i === index ? "opacity-100" : "opacity-35"}`}
          >
            <span className={`w-[78px] shrink-0 tabular-nums ${i === index ? "text-accent" : ""}`}>{whenLabel(e, locale)}</span>
            <span className="truncate">{e.title[locale]}</span>
          </li>
        ))}
      </ol>
      <p className="label mt-1 hidden text-ink-soft md:block">{"}"}</p>
      <a
        href={`https://github.com/${github.login}`}
        target="_blank"
        rel="noreferrer"
        data-cursor="GITHUB"
        className={`flex items-center gap-2 text-[11px] transition-colors hover:text-accent md:mt-2 md:border-t md:pt-2 ${
          atPlaza ? "border-accent text-accent" : "border-rule"
        }`}
      >
        <span className="text-accent">github</span>
        <span className="tabular-nums">
          {github.total} {labels.contributions} · {github.repos} {labels.repos}
        </span>
        <span className="ml-auto">↗</span>
      </a>
      <PlayYearButton label={labels.play} />
    </Panel>
  );
}
