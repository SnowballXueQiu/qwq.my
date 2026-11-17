/** A heading in a post's table of contents. `depth` is the heading level, 2–4. */
export type TocItem = { id: string; text: string; depth: number };

type HastNode = { type: string; tagName?: string; value?: string; properties?: Record<string, unknown>; children?: HastNode[] };

/** Slug for heading anchors; keeps CJK characters. */
export const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");

const textOf = (n: HastNode): string => n.value ?? (n.children ?? []).map(textOf).join("");

/**
 * Rehype plugin: gives h2–h4 their anchor ids and lists them in `file.data.toc`, so the
 * anchors and the table of contents come from the same pass. Runs before KaTeX, so a
 * formula in a heading reads as its TeX. Repeated titles get -2, -3, …
 */
export function rehypeToc() {
  return (tree: HastNode, file: { data: Record<string, unknown> }) => {
    const toc: TocItem[] = [];
    const seen = new Map<string, number>();
    const walk = (node: HastNode) => {
      for (const child of node.children ?? []) {
        const depth = child.type === "element" && /^h[2-4]$/.test(child.tagName ?? "") ? Number(child.tagName![1]) : 0;
        if (!depth) {
          walk(child);
          continue;
        }
        const text = textOf(child).replace(/\s+/g, " ").trim();
        const base = slugify(text) || "section";
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        const id = n > 1 ? `${base}-${n}` : base;
        child.properties = { ...child.properties, id };
        toc.push({ id, text, depth });
      }
    };
    walk(tree);
    file.data.toc = toc;
  };
}
