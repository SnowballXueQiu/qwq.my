/** Pieces for plain posts: photo sets and boxed asides. */

/** A set of photos two to a row; each opens full size. */
export function Gallery({ images }: { images: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {images.map((src) => (
        <a key={src} href={src} target="_blank" rel="noreferrer" className="block border border-ink bg-paper">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
        </a>
      ))}
    </div>
  );
}

const CALLOUT = {
  warning: "注意 · WARNING",
  note: "备注 · NOTE",
  tip: "提示 · TIP",
  info: "说明 · INFO",
} as const;

/** An aside set off from the text, labelled like a note on a drawing. */
export function Callout({ type = "note", children }: { type?: keyof typeof CALLOUT; children: React.ReactNode }) {
  return (
    <aside className="callout border border-ink border-l-4 border-l-accent bg-paper px-4 py-3">
      <p className="label text-accent">{CALLOUT[type] ?? CALLOUT.note}</p>
      <div className="mt-1">{children}</div>
    </aside>
  );
}
