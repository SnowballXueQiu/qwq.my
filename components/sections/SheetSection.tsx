import type { SheetId } from "@/lib/sheets";
import { sheetNumber } from "@/lib/sheets";

/** One drawing sheet of the home page. `length` is its scroll height in viewports. */
export function SheetSection({
  id,
  title,
  length = 1,
  children,
  className = "",
}: {
  id: SheetId;
  title: string;
  length?: number;
  children: React.ReactNode;
  className?: string;
}) {
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
      <div className="label mb-6 flex items-center gap-3 text-ink-soft">
        <span className="text-accent">SHEET {sheetNumber(id)}</span>
        <span className="h-px w-12 bg-rule" />
        <span id={`${id}-title`}>{title}</span>
      </div>
      {children}
    </section>
  );
}
