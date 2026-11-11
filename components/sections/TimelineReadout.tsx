"use client";

import type { TimelineEvent } from "@/content/timeline";
import type { Locale } from "@/lib/i18n";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { Panel } from "./Panel";
import { useSceneIndex } from "./SceneReadout";
import { PlayYearButton } from "@/components/video/PlayYearButton";

/** The log line for whichever milestone the camera is driving past. */
export function TimelineReadout({
  events,
  locale,
  playLabel,
}: {
  events: TimelineEvent[];
  locale: Locale;
  playLabel: string;
}) {
  const index = useSceneIndex("timeline", events.length);
  return (
    <Panel className="max-w-[420px] font-mono">
      <p className="label text-ink-soft">
        <span className="text-accent">while</span> (alive) {"{"}
      </p>
      <ol className="mt-2 space-y-1 text-xs">
        {events.map((e, i) => (
          <li
            key={e.date + e.title.en}
            className={`flex gap-3 pl-4 transition-opacity ${i === index ? "opacity-100" : "opacity-35"}`}
          >
            <span className={i === index ? "text-accent" : ""}>{e.date}</span>
            <span>{i === index ? <ScrambleText text={e.title[locale]} /> : e.title[locale]}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 border-t border-rule pt-2 pl-4 text-sm text-ink-soft">{events[index].detail[locale]}</p>
      <p className="label mt-2 text-ink-soft">{"}"}</p>
      <PlayYearButton label={playLabel} />
    </Panel>
  );
}
