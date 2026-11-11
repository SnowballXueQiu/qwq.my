/** A HUD panel floating over the 3D world: framed, slightly see-through, never centred. */
export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`pointer-events-auto relative border border-ink bg-paper/90 p-4 backdrop-blur-[2px] md:p-5 ${className}`}
    >
      {/* Corner ticks, like registration marks. */}
      <span aria-hidden className="absolute -left-1 -top-1 size-2 border-l border-t border-accent" />
      <span aria-hidden className="absolute -bottom-1 -right-1 size-2 border-b border-r border-accent" />
      {children}
    </div>
  );
}
