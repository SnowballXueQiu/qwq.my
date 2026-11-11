"use client";

export function TerminalButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-cursor="SHELL"
      onClick={() => window.dispatchEvent(new Event("qwq:terminal"))}
      className="label border border-ink px-2 py-1 transition-colors hover:bg-ink hover:text-paper"
    >
      &gt;_
    </button>
  );
}
