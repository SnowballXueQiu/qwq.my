import { useId } from "react";

/**
 * Marks a post as AI-generated. Hover (or focus, or tap on a phone) shows the notice.
 */
export function AigcBadge({ label, note, align = "left" }: { label: string; note: string; align?: "left" | "right" }) {
  const id = useId();
  return (
    <span className="group relative inline-flex align-middle normal-case tracking-normal">
      <button
        type="button"
        aria-describedby={id}
        className="label inline-flex items-center gap-1 border border-accent px-1.5 py-[1px] text-accent transition-colors hover:bg-accent hover:text-paper focus-visible:bg-accent focus-visible:text-paper"
      >
        <svg aria-hidden viewBox="0 0 12 12" className="h-[0.8em] w-[0.8em]" fill="currentColor">
          <path d="M6 0 7.3 4.7 12 6 7.3 7.3 6 12 4.7 7.3 0 6 4.7 4.7Z" />
        </svg>
        {label}
      </button>
      <span
        role="tooltip"
        id={id}
        className={`pointer-events-none invisible absolute top-full z-20 mt-2 w-64 border border-ink bg-paper px-3 py-2 text-left font-sans text-[0.8rem] leading-relaxed text-ink opacity-0 shadow-[4px_4px_0_var(--accent)] transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 ${align === "right" ? "right-0" : "left-0"}`}
      >
        {note}
      </span>
    </span>
  );
}
