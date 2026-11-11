import type { L10n } from "@/lib/i18n";

export type Skill = {
  name: string;
  group: L10n;
  /** 0–5, shown as tick marks in the BOM table. */
  level: number;
  since: number;
};

// 占位内容：技能爆炸图里的每个零件对应这里的一项。
export const skills: Skill[] = [
  { name: "TypeScript", group: { zh: "语言", en: "Language" }, level: 5, since: 2021 },
  { name: "React", group: { zh: "前端", en: "Frontend" }, level: 5, since: 2021 },
  { name: "Next.js", group: { zh: "前端", en: "Frontend" }, level: 4, since: 2022 },
  { name: "Three.js / GLSL", group: { zh: "图形", en: "Graphics" }, level: 4, since: 2023 },
  { name: "Node.js", group: { zh: "后端", en: "Backend" }, level: 4, since: 2021 },
  { name: "Python", group: { zh: "语言", en: "Language" }, level: 4, since: 2020 },
  { name: "Rust", group: { zh: "语言", en: "Language" }, level: 3, since: 2024 },
  { name: "PostgreSQL", group: { zh: "数据", en: "Data" }, level: 3, since: 2023 },
  { name: "Docker", group: { zh: "工具", en: "Tooling" }, level: 3, since: 2023 },
  { name: "Figma", group: { zh: "设计", en: "Design" }, level: 3, since: 2022 },
];
