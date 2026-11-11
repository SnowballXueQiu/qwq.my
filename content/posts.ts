import type { L10n } from "@/lib/i18n";

export type PostMeta = {
  slug: string;
  date: string; // YYYY-MM-DD
  title: L10n;
  summary: L10n;
  tags: string[];
};

// 占位文章：之后换成 content/posts/<slug>/{zh,en}.mdx，首页和博客页会自动读取。
export const posts: PostMeta[] = [
  {
    slug: "tearing-paper-with-glsl",
    date: "2026-11-11",
    title: { zh: "用 GLSL 撕开一张纸", en: "Tearing paper with GLSL" },
    summary: { zh: "Voronoi 碎片、顶点着色器和一次性绘制。", en: "Voronoi shards, a vertex shader and one draw call." },
    tags: ["three.js", "GLSL"],
  },
  {
    slug: "ink-lines-from-a-g-buffer",
    date: "2026-10-02",
    title: { zh: "从 G-buffer 里画出墨线", en: "Drawing ink lines from a G-buffer" },
    summary: { zh: "Sobel、网点和排线：非写实渲染笔记。", en: "Sobel, halftone and hatching: notes on NPR." },
    tags: ["rendering"],
  },
  {
    slug: "a-semester-in-review",
    date: "2026-07-01",
    title: { zh: "这学期的复盘", en: "A semester in review" },
    summary: { zh: "课程、项目，和没睡够的觉。", en: "Courses, projects, and not enough sleep." },
    tags: ["life"],
  },
  {
    slug: "hello-world",
    date: "2026-03-14",
    title: { zh: "你好，世界", en: "Hello, world" },
    summary: { zh: "第一篇。", en: "The first one." },
    tags: ["meta"],
  },
];
