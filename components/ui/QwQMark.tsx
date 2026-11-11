/** The QwQ glyph drawn as a face: two Q-eyes and a w-mouth. */
export function QwQMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 28"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="13" r="9" />
      <path d="M16.5 18.5 21.5 24.5" />
      <circle cx="13" cy="14" r="2.2" fill="currentColor" stroke="none" />
      <path d="M26 10.5 29.4 19.5 32 13 34.6 19.5 38 10.5" />
      <circle cx="52" cy="13" r="9" />
      <path d="M56.5 18.5 61.5 24.5" />
      <circle cx="53" cy="14" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
