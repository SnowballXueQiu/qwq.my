import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { LangToggle } from "./LangToggle";
import { MenuButton } from "./MenuButton";
import { QwQLogo } from "./QwQLogo";
import { SheetNav } from "./SheetNav";
import { TerminalButton } from "./TerminalButton";
import { TitleBlock } from "./TitleBlock";

const COLUMNS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const ROWS = ["A", "B", "C", "D", "E", "F"];

function ZoneStrip({ side }: { side: "top" | "bottom" | "left" | "right" }) {
  const vertical = side === "left" || side === "right";
  const zones = vertical ? ROWS : COLUMNS;
  const position: Record<typeof side, React.CSSProperties> = {
    top: { top: "var(--frame-inset)", left: "var(--frame-inset)", right: "var(--frame-inset)", height: "var(--frame-gutter)" },
    bottom: { bottom: "var(--frame-inset)", left: "var(--frame-inset)", right: "var(--frame-inset)", height: "var(--frame-gutter)" },
    left: { left: "var(--frame-inset)", top: "var(--frame-inset)", bottom: "var(--frame-inset)", width: "var(--frame-gutter)" },
    right: { right: "var(--frame-inset)", top: "var(--frame-inset)", bottom: "var(--frame-inset)", width: "var(--frame-gutter)" },
  };

  return (
    <div
      className={`absolute hidden md:flex ${vertical ? "flex-col py-[var(--frame-gutter)]" : "px-[var(--frame-gutter)]"}`}
      style={position[side]}
    >
      {zones.map((zone, i) => (
        <div
          key={zone}
          className={`label relative flex flex-1 items-center justify-center text-[9px] text-ink-soft ${
            i > 0 ? (vertical ? "border-t border-ink" : "border-l border-ink") : ""
          }`}
        >
          {zone}
          {i === Math.floor(zones.length / 2) && (
            // Centring mark, as on a real drawing sheet.
            <span
              aria-hidden
              className={`absolute bg-ink ${
                vertical ? "top-0 h-px w-full -translate-y-px" : "left-0 h-full w-px -translate-x-px"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function SheetFrame({
  locale,
  dict,
  author,
}: {
  locale: Locale;
  dict: Dictionary;
  author: string;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 text-ink">
      <div className="absolute border border-ink" style={{ inset: "var(--frame-inset)" }} />
      <ZoneStrip side="top" />
      <ZoneStrip side="bottom" />
      <ZoneStrip side="left" />
      <ZoneStrip side="right" />

      <div
        className="absolute flex flex-col justify-between border-[1.5px] border-ink"
        style={{ inset: "calc(var(--frame-inset) + var(--frame-gutter))" }}
      >
        <header className="pointer-events-auto flex items-center justify-between gap-6 border-b border-ink bg-paper px-3 py-2 md:px-4">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2.5"
            data-cursor="HOME"
            aria-label="qwq.my"
          >
            <QwQLogo className="h-7 w-auto" />
            <span className="label hidden sm:inline">qwq.my</span>
          </Link>
          <SheetNav locale={locale} titles={dict.sheets} />
          <div className="flex items-center gap-2">
            <MenuButton labels={dict.menu} />
            <TerminalButton label={dict.controls.terminal} />
            <LangToggle locale={locale} label={dict.controls.language} />
          </div>
        </header>

        <div className="flex justify-end">
          <TitleBlock
            locale={locale}
            author={author}
            labels={dict.titleBlock}
            titles={dict.sheets}
          />
        </div>
      </div>
    </div>
  );
}
