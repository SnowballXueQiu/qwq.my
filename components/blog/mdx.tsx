import type { MDXComponents } from "next-mdx-remote-client/rsc";
import Link from "next/link";
import { BeatLab } from "./figures/BeatLab";
import { Clip } from "./figures/Clip";
import { DeployDiagram, PipelineDiagram } from "./figures/Diagrams";
import { EdgeLab } from "./figures/EdgeLab";
import { FaceGrid } from "./figures/FaceGrid";
import { Figure } from "./figures/Figure";
import { GBufferExplorer } from "./figures/GBufferExplorer";
import { HalftoneLab } from "./figures/HalftoneLab";
import { SceneClock } from "./figures/SceneClock";
import { SimplifyLab } from "./figures/SimplifyLab";
import { SplineLab } from "./figures/SplineLab";
import { TearLab } from "./figures/TearLab";
import { Callout, Gallery } from "./Prose";

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
  // Figures for the posts: plates, clips recorded from the site, and live labs.
  Figure,
  Clip,
  GBufferExplorer,
  FaceGrid,
  SceneClock,
  EdgeLab,
  HalftoneLab,
  TearLab,
  SplineLab,
  BeatLab,
  SimplifyLab,
  PipelineDiagram,
  DeployDiagram,
  // Plain posts: photo sets and boxed asides.
  Gallery,
  Callout,
  // eslint-disable-next-line @next/next/no-img-element
  img: ({ src, alt }) => <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" decoding="async" />,
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
  // Pages go through the router; files (images, downloads) and other sites open on their own.
  a: ({ href = "", children }) =>
    (href.startsWith("/") && !/\.\w+$/.test(href)) || href.startsWith("#") ? (
      <Link href={href}>{children}</Link>
    ) : (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    ),
};
