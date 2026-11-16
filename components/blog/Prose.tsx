/** Pieces for plain posts: photos, photo sets and boxed asides. */
import { publicImageSize } from "@/lib/imageSize";
import { Zoom } from "./Zoom";

/** Alt text worth printing under a photo (not "Image 1", "图 1" or a bare number). */
const captionOf = (alt?: string) => (alt && !/^(image\s*\d*|图\s*\d*|\d+)$/i.test(alt.trim()) ? alt.trim() : null);

/**
 * A photo in the text column. Its size is read from the file so the page doesn't jump
 * while it loads; tall photos stop at most of a screen high instead of running on.
 * Click to see it whole.
 */
export function ProseImage({ src, alt = "", full }: { src: string; alt?: string; full?: string }) {
  const size = publicImageSize(src);
  const caption = captionOf(alt);
  return (
    <span className="prose-img">
      <Zoom shots={[{ src: full ?? src, alt }]}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} width={size?.width} height={size?.height} loading="lazy" decoding="async" />
      </Zoom>
      {caption && <span className="prose-img-caption">{caption}</span>}
    </span>
  );
}

type GalleryItem = string | { src: string; alt?: string; full?: string };

/**
 * A set of photos laid out in justified rows: every photo in a row is the same height
 * and none is cropped. Each photo's share of the row is its aspect ratio; `rowHeight`
 * is the height a row aims for before it wraps (it may grow up to 1.6× to fill).
 */
export function Gallery({ images, rowHeight = 220 }: { images: GalleryItem[]; rowHeight?: number }) {
  const items = images.map((it) => (typeof it === "string" ? { src: it } : it));
  const shots = items.map((it) => ({ src: it.full ?? it.src, alt: it.alt ?? "" }));
  return (
    <div className="gallery">
      {items.map((it, i) => {
        const size = publicImageSize(it.src) ?? { width: 4, height: 3 };
        const ratio = size.width / size.height;
        const caption = captionOf(it.alt);
        return (
          <Zoom
            key={it.src}
            shots={shots}
            index={i}
            className="gallery-item"
            style={{
              flex: `${ratio} 1 ${Math.round(ratio * rowHeight)}px`,
              maxWidth: `${Math.round(ratio * rowHeight * 1.6)}px`,
              aspectRatio: `${size.width} / ${size.height}`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.src} alt={it.alt ?? ""} loading="lazy" decoding="async" />
            {caption && <span className="gallery-caption">{caption}</span>}
          </Zoom>
        );
      })}
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
