/**
 * Marks a post as written with AI tools. Hover (or focus, or tap on a phone) and the tag
 * opens sideways into the notice, along its own line, so it never covers the text.
 * `compact` keeps it closed (for tight spots like the index) with the notice as a tooltip.
 */
export function AigcBadge({ label, note, compact = false }: { label: string; note: string; compact?: boolean }) {
  const mark = (
    <svg aria-hidden viewBox="0 0 12 12" className="h-[0.8em] w-[0.8em] shrink-0" fill="currentColor">
      <path d="M6 0 7.3 4.7 12 6 7.3 7.3 6 12 4.7 7.3 0 6 4.7 4.7Z" />
    </svg>
  );
  if (compact) {
    return (
      <span title={note} className="label inline-flex items-center gap-1 border border-accent px-1.5 py-[1px] text-accent">
        {mark}
        {label}
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-label={`${label}: ${note}`}
      className="group label inline-flex max-w-full items-center border border-accent text-accent transition-colors hover:bg-accent hover:text-paper focus-visible:bg-accent focus-visible:text-paper"
    >
      <span className="inline-flex shrink-0 items-center gap-1 px-1.5 py-[1px]">
        {mark}
        {label}
      </span>
      <span
        aria-hidden
        className="grid grid-cols-[0fr] transition-[grid-template-columns] duration-300 ease-out group-hover:grid-cols-[1fr] group-focus-visible:grid-cols-[1fr] group-focus:grid-cols-[1fr]"
      >
        <span className="overflow-hidden">
          <span className="block whitespace-normal border-l sm:whitespace-nowrap border-current py-[1px] pr-2 pl-2 font-sans text-[0.75rem] normal-case tracking-normal">
            {note}
          </span>
        </span>
      </span>
    </button>
  );
}
