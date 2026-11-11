import type { L10n } from "@/lib/i18n";

export type Project = {
  slug: string;
  title: string;
  year: number;
  summary: L10n;
  tags: string[];
  /** Path under /public, rendered through the halftone shader. */
  cover?: string;
  href?: string;
  repo?: string;
};

// 占位内容：项目环形阵列里的每块屏幕对应这里的一项。
export const projects: Project[] = [
  {
    slug: "qwq-my",
    title: "qwq.my",
    year: 2026,
    summary: {
      zh: "这个网站：一只会变形的 QwQ，用工程图纸风格的 GLSL 渲染。",
      en: "This site: a shape-shifting QwQ rendered as an engineering drawing in GLSL.",
    },
    tags: ["Next.js", "Three.js", "GLSL", "Remotion"],
    repo: "https://github.com/SnowballXueQiu",
  },
  {
    slug: "project-two",
    title: "Project Two",
    year: 2025,
    summary: { zh: "占位项目，替换成你的作品。", en: "Placeholder project. Replace with your own." },
    tags: ["Rust", "CLI"],
  },
  {
    slug: "project-three",
    title: "Project Three",
    year: 2025,
    summary: { zh: "占位项目，替换成你的作品。", en: "Placeholder project. Replace with your own." },
    tags: ["React", "Node.js"],
  },
  {
    slug: "project-four",
    title: "Project Four",
    year: 2024,
    summary: { zh: "占位项目，替换成你的作品。", en: "Placeholder project. Replace with your own." },
    tags: ["Python", "ML"],
  },
  {
    slug: "project-five",
    title: "Project Five",
    year: 2024,
    summary: { zh: "占位项目，替换成你的作品。", en: "Placeholder project. Replace with your own." },
    tags: ["Figma", "Design"],
  },
];
