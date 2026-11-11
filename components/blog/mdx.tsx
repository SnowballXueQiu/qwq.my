import type { MDXComponents } from "next-mdx-remote-client/rsc";
import Link from "next/link";

/** Slug for heading anchors; keeps CJK characters. */
const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");

const textOf = (node: React.ReactNode): string =>
  typeof node === "string" || typeof node === "number"
    ? String(node)
    : Array.isArray(node)
      ? node.map(textOf).join("")
      : node && typeof node === "object" && "props" in node
        ? textOf((node as { props: { children?: React.ReactNode } }).props.children)
        : "";

export const mdxComponents: MDXComponents = {
  h2: ({ children }) => {
    const id = slugify(textOf(children));
    return (
      <h2 id={id} className="group">
        <a href={`#${id}`} className="no-underline">
          {children}
          <span aria-hidden className="ml-2 text-accent opacity-0 transition-opacity group-hover:opacity-100">
            #
          </span>
        </a>
      </h2>
    );
  },
  a: ({ href = "", children }) =>
    href.startsWith("/") || href.startsWith("#") ? (
      <Link href={href}>{children}</Link>
    ) : (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    ),
};
