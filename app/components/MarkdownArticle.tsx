import katex from "katex";
import type { CSSProperties, ReactNode } from "react";
import { ExcalidrawViewer } from "./ExcalidrawViewer";
import { GalleryCarousel } from "./GalleryCarousel";
import { MermaidBlock } from "./MermaidBlock";
import { RichLinkCard } from "./RichLinkCard";

type Block =
  | { type: "heading"; level: number; text: string; slug: string }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "divider"; style: "solid" | "wave" | "double" }
  | { type: "code"; language: string; text: string }
  | { type: "math"; text: string }
  | { type: "toc"; title: string }
  | { type: "gallery"; items: GalleryItem[] }
  | { type: "grid"; items: GridItem[]; cols: number; gap: number }
  | { type: "admonition"; variant: "warning" | "banner" | "error" | "info"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "collapse"; title: string; text: string; spoiler: boolean }
  | { type: "richlink"; url: string };

type GalleryItem = {
  url: string;
  alt: string;
};

type GridItem = GalleryItem | { text: string };

export function MarkdownArticle({ content }: { content: string }) {
  const blocks = parseBlocks(content);
  const toc = blocks.filter((block): block is Extract<Block, { type: "heading" }> => block.type === "heading").map((block) => ({
    level: block.level,
    label: block.text,
    slug: block.slug,
  }));

  return <div className="markdown-article">{blocks.map((block, index) => renderBlock(block, index, toc))}</div>;
}

type TocEntry = {
  level: number;
  label: string;
  slug: string;
};

function renderBlock(block: Block, index: number, toc: TocEntry[]) {
  if (block.type === "heading") {
    const Tag = `h${Math.min(block.level, 3)}` as "h1" | "h2" | "h3";
    return (
      <Tag id={block.slug} key={index}>
        {renderInline(block.text)}
      </Tag>
    );
  }
  if (block.type === "quote") return <blockquote key={index}>{renderInline(block.text)}</blockquote>;
  if (block.type === "list") {
    const Tag = block.ordered ? "ol" : "ul";
    return (
      <Tag key={index}>
        {block.items.map((item) => (
          <li key={item}>{renderInline(item)}</li>
        ))}
      </Tag>
    );
  }
  if (block.type === "divider") {
    return <hr className={`markdown-divider ${block.style}`} key={index} />;
  }
  if (block.type === "code") {
    if (block.language === "mermaid") return <MermaidBlock chart={block.text} key={index} />;
    if (block.language === "excalidraw") return <ExcalidrawViewer source={block.text} key={index} />;
    return (
      <pre className="markdown-code-block" key={index}>
        <code>{block.text}</code>
      </pre>
    );
  }
  if (block.type === "math") return <div className="latex-block" dangerouslySetInnerHTML={{ __html: renderKatex(block.text, true) }} key={index} />;
  if (block.type === "toc") return <TableOfContents entries={toc} title={block.title} key={index} />;
  if (block.type === "gallery") {
    return <GalleryCarousel items={block.items.map((item) => ({ ...item, url: normalizeMediaUrl(item.url) }))} key={index} />;
  }
  if (block.type === "grid") {
    return (
      <div className="markdown-grid" style={{ "--grid-cols": block.cols, "--grid-gap": `${block.gap * 4}px` } as CSSProperties} key={index}>
        {block.items.map((item, itemIndex) =>
          "url" in item ? <img src={normalizeMediaUrl(item.url)} alt={item.alt} key={`${item.url}-${itemIndex}`} /> : <div key={`${item.text}-${itemIndex}`}>{renderInline(item.text)}</div>,
        )}
      </div>
    );
  }
  if (block.type === "admonition") {
    return (
      <aside className={`markdown-admonition ${block.variant}`} key={index}>
        <strong>{block.variant === "error" ? "Error" : block.variant === "warning" ? "Warning" : "Note"}</strong>
        <p>{renderInline(block.text)}</p>
      </aside>
    );
  }
  if (block.type === "table") {
    return (
      <div className="markdown-table-wrap" key={index}>
        <table>
          <thead>
            <tr>{block.headers.map((header) => <th key={header}>{renderTableCell(header)}</th>)}</tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{renderTableCell(cell)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.type === "collapse") {
    if (block.spoiler) {
      return (
        <div className="markdown-spoiler-block" key={index}>
          <div className="markdown-spoiler-content">{renderSpoilerParagraph(block.text)}</div>
        </div>
      );
    }
    return (
      <details className="markdown-collapse" key={index}>
        <summary>{block.title || "More"}</summary>
        <MarkdownArticle content={block.text} />
      </details>
    );
  }
  if (block.type === "richlink") return <RichLinkCard url={block.url} key={index} />;
  return <p key={index}>{renderInline(block.text)}</p>;
}

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const headingCounts = new Map<string, number>();

  const flushParagraph = () => {
    if (paragraph.length) {
      const text = paragraph.join(" ");
      const linked = text.match(/^\[.+\]\((https?:\/\/[^)]+)\)$/);
      if (/^richlink\s+https?:\/\//i.test(text)) blocks.push({ type: "richlink", url: text.replace(/^richlink\s+/i, "").trim() });
      else if (linked && linked[1].includes("github.com/")) blocks.push({ type: "richlink", url: linked[1].trim() });
      else if (isRichLinkUrl(text)) blocks.push({ type: "richlink", url: text.trim() });
      else blocks.push({ type: "paragraph", text });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list?.items.length) blocks.push({ type: "list", ordered: list.ordered, items: list.items });
    list = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith(":::")) {
      flushParagraph();
      flushList();
      const directive = trimmed.replace(/^:::\s*/, "");
      const body: string[] = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== ":::") {
        body.push(lines[index]);
        index += 1;
      }
      blocks.push(parseDirective(directive, body.join("\n")));
      continue;
    }

    if (trimmed === "---" || trimmed === "~~~" || trimmed === "===") {
      flushParagraph();
      flushList();
      blocks.push({
        type: "divider",
        style: trimmed === "~~~" ? "wave" : trimmed === "===" ? "double" : "solid",
      });
      continue;
    }

    if (trimmed.startsWith("```")) {
      flushParagraph();
      flushList();
      const language = trimmed.replace(/^```/, "").trim().toLowerCase();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      blocks.push({ type: "code", language, text: code.join("\n") });
      continue;
    }

    if (trimmed === "$$") {
      flushParagraph();
      flushList();
      const math: string[] = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== "$$") {
        math.push(lines[index]);
        index += 1;
      }
      blocks.push({ type: "math", text: math.join("\n") });
      continue;
    }

    if (isTableStart(lines, index)) {
      flushParagraph();
      flushList();
      const tableLines = [lines[index], lines[index + 1]];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        tableLines.push(lines[index]);
        index += 1;
      }
      index -= 1;
      blocks.push(parseTable(tableLines));
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2],
        slug: uniqueSlug(heading[2], headingCounts),
      });
      continue;
    }

    const unordered = trimmed.match(/^[-*]\s+(.+)$/);
    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      if (!list || list.ordered !== isOrdered) flushList();
      list = list ?? { ordered: isOrdered, items: [] };
      list.items.push((ordered ?? unordered)![1]);
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "quote", text: trimmed.replace(/^>\s?/, "") });
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function parseDirective(directive: string, body: string): Block {
  if (directive.startsWith("gallery")) {
    return {
      type: "gallery",
      items: body
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map(parseGalleryItem),
    };
  }
  if (directive.startsWith("grid")) {
    const cols = Number(directive.match(/cols=(\d+)/)?.[1] ?? 3);
    const gap = Number(directive.match(/gap=(\d+)/)?.[1] ?? 4);
    return {
      type: "grid",
      cols: Math.max(1, Math.min(cols, 6)),
      gap: Math.max(1, Math.min(gap, 10)),
      items: body
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map(parseGridItem),
    };
  }
  if (directive.startsWith("toc")) return { type: "toc", title: directive.replace(/^toc\s*/i, "").trim() };
  if (directive.startsWith("warning")) return { type: "admonition", variant: "warning", text: body.trim() };
  if (directive.startsWith("banner")) {
    const variant = directive.includes("error") ? "error" : "banner";
    return { type: "admonition", variant, text: body.trim() };
  }
  if (directive.startsWith("collapse")) return { type: "collapse", title: directive.replace(/^collapse\s*/i, "").trim(), text: body, spoiler: false };
  if (directive.startsWith("spoiler")) return { type: "collapse", title: directive.replace(/^spoiler\s*/i, "").trim(), text: body, spoiler: true };
  return { type: "admonition", variant: "info", text: body.trim() };
}

function parseGalleryItem(line: string): GalleryItem {
  const image = line.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+['"]([^'"]+)['"])?\)$/);
  if (image) return { alt: image[3] || image[1] || "Gallery image", url: image[2] };
  return { alt: "Gallery image", url: line };
}

function parseGridItem(line: string): GridItem {
  if (/^https?:\/\/\S+/.test(line) || line.startsWith("/media/") || line.startsWith("![")) return parseGalleryItem(line);
  return { text: line };
}

function parseTable(lines: string[]): Block {
  const parseRow = (line: string) => {
    const source = line.trim().replace(/^\||\|$/g, "");
    const cells: string[] = [];
    let current = "";
    let inCode = false;

    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (char === "`") {
        inCode = !inCode;
        current += char;
        continue;
      }
      if (char === "|" && !inCode) {
        cells.push(current.trim());
        current = "";
        continue;
      }
      current += char;
    }

    cells.push(current.trim());
    return cells;
  };
  return {
    type: "table",
    headers: parseRow(lines[0]),
    rows: lines.slice(2).map(parseRow),
  };
}

function isTableStart(lines: string[], index: number) {
  return Boolean(lines[index]?.includes("|") && lines[index + 1]?.trim().match(/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/));
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(!?\[[^\]]+\]\([^)]+\)|\|\|[\s\S]+?\|\||`[^`]+`|\$(?!\$)(?:\\.|[^$\\])+\$|\+\+[\s\S]+?\+\+|\*\*[\s\S]+?\*\*|__[\s\S]+?__|_[^_]+_|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${match.index}-${token}`;
    const image = token.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+['"]([^'"]+)['"])?\)$/);
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

    if (image) nodes.push(<img src={normalizeMediaUrl(image[2])} alt={image[3] || image[1] || "Markdown image"} key={key} />);
    else if (link) nodes.push(<a href={normalizeMediaUrl(link[2])} key={key}>{link[1]}</a>);
    else if (token.startsWith("||")) nodes.push(<span className="inline-spoiler" key={key}>{token.slice(2, -2)}</span>);
    else if (token.startsWith("`")) nodes.push(renderInlineCode(token.slice(1, -1), key));
    else if (token.startsWith("$")) nodes.push(<span className="latex-inline" dangerouslySetInnerHTML={{ __html: renderKatex(token.slice(1, -1), false) }} key={key} />);
    else if (token.startsWith("++")) nodes.push(<span className="inline-underline" key={key}>{token.slice(2, -2)}</span>);
    else if (token.startsWith("**")) nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("__")) nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("_")) nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    else if (token.startsWith("*")) nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function renderKatex(source: string, displayMode: boolean) {
  try {
    return katex.renderToString(source, { displayMode, throwOnError: false, strict: false });
  } catch {
    return source;
  }
}

function renderInlineCode(source: string, key: string) {
  const tokenPattern = /(\|\|[\s\S]+?\|\||\$(?!\$)(?:\\.|[^$\\])+\$)/g;
  const pieces: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(source))) {
    if (match.index > lastIndex) pieces.push(source.slice(lastIndex, match.index));
    if (match[0].startsWith("||")) {
      pieces.push(<span className="inline-spoiler" key={`${key}-${match.index}`}>{match[0].slice(2, -2)}</span>);
    } else {
      pieces.push(<span className="latex-inline" dangerouslySetInnerHTML={{ __html: renderKatex(match[0].slice(1, -1), false) }} key={`${key}-${match.index}`} />);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < source.length) pieces.push(source.slice(lastIndex));
  return <code className="inline-code" key={key}>{pieces}</code>;
}

function renderSpoilerParagraph(text: string) {
  const parts = text.split(/(\|\|[\s\S]+?\|\|)/g);
  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith("||")) return <span className="inline-spoiler" key={`${part}-${index}`}>{part.slice(2, -2)}</span>;
        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </span>
  );
}

function renderTableCell(cell: string) {
  const match = cell.match(/^`([^`]+)`$/);
  if (!match) return renderInline(cell);
  return [renderInlineCode(match[1], cell)];
}

function normalizeMediaUrl(url: string) {
  if (url.startsWith("/media/")) return `/api/media/by-name/${encodeURIComponent(url.replace("/media/", ""))}`;
  return url;
}

function isRichLinkUrl(text: string) {
  return /^https?:\/\/\S+$/.test(text) && (text.includes("github.com/") || text.includes("://"));
}

function uniqueSlug(text: string, counts: Map<string, number>) {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
  const current = counts.get(base) ?? 0;
  counts.set(base, current + 1);
  return current === 0 ? base : `${base}-${current + 1}`;
}

function TableOfContents({ entries, title }: { entries: TocEntry[]; title: string }) {
  if (!entries.length) return null;
  return (
    <nav className="markdown-toc" aria-label="Table of contents">
      <div className="markdown-toc-title">{title || "Contents"}</div>
      <ol>
        {entries.map((entry) => (
          <li className={`markdown-toc-level-${Math.min(entry.level, 3)}`} key={entry.slug}>
            <a href={`#${entry.slug}`}>{entry.label}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
