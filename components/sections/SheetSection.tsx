import type { SheetId } from "@/lib/sheets";
import { sheetNumber } from "@/lib/sheets";

/** One drawing sheet of the home page. `length` is its scroll height in viewports. */
export function SheetSection({
  id,
  title,
  length = 1,
  sticky = false,
  children,
  className = "",
}: {
  id: SheetId;
  title: string;
  length?: number;
  /** Pin the content to the viewport while the section scrolls past (for scrubbed scenes). */
  sticky?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const label = (
    <div className="label mb-6 flex items-center gap-3 text-ink-soft">
      <span className="text-accent">SHEET {sheetNumber(id)}</span>
      <span className="h-px w-12 bg-rule" />
      <span id={`${id}-title`}>{title}</span>
    </div>
  );

  if (sticky) {
    return (
      <section
        id={id}
        data-sheet={id}
        aria-labelledby={`${id}-title`}
        className="relative"
        style={{ height: `${length * 100}svh` }}
      >
        <div
          className={`sticky top-0 flex h-svh flex-col justify-end ${className}`}
          style={{ paddingInline: "var(--sheet-pad)", paddingBlock: "calc(var(--sheet-pad) + 48px)" }}
        >
          {label}
          {children}
        </div>
      </section>
    );
  }

  return (
    <section
      id={id}
      data-sheet={id}
      aria-labelledby={`${id}-title`}
      className={`relative ${className}`}
      style={{
        minHeight: `${length * 100}svh`,
        paddingInline: "var(--sheet-pad)",
        paddingBlock: "calc(var(--sheet-pad) + 48px)",
      }}
    >
      {label}
      {children}
    </section>
  );
}
