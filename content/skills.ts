import type { L10n } from "@/lib/i18n";

export type SkillGroup = {
  id: string;
  /** Shown in the panel. */
  title: L10n;
  /** Shown as 3D type (ASCII only). */
  code: string;
  items: string[];
};

// 技能按组排列；3D 场景每组一站，面板里列出全部。
export const skillGroups: SkillGroup[] = [
  { id: "fluent", title: { zh: "熟练", en: "Fluent" }, code: "FLUENT", items: ["TypeScript", "JavaScript", "Python", "Java", "Kotlin"] },
  { id: "familiar", title: { zh: "了解", en: "Familiar" }, code: "FAMILIAR", items: ["Rust", "Go"] },
  { id: "enough", title: { zh: "够用", en: "Get by" }, code: "GET BY", items: ["C/C++", "C#", "Shell (Bash)", "MATLAB"] },
  { id: "frontend", title: { zh: "前端", en: "Frontend" }, code: "FRONTEND", items: ["Next.js", "Node.js", "Vue", "React", "Three.js", "GSAP"] },
  { id: "native", title: { zh: "原生开发", en: "Native" }, code: "NATIVE", items: ["Flutter", "Dart", "SwiftUI", "Liquid Glass"] },
  { id: "backend", title: { zh: "后端", en: "Backend" }, code: "BACKEND", items: ["Axum", "SeaORM", "FastAPI", "Air"] },
  { id: "db", title: { zh: "数据库", en: "Databases" }, code: "DATABASES", items: ["PostgreSQL", "MySQL", "SQLite", "MongoDB"] },
  { id: "devops", title: { zh: "DevOps", en: "DevOps" }, code: "DEVOPS", items: ["Docker", "K8s", "GitHub Actions", "Gitea"] },
  { id: "llm", title: { zh: "LLM 工具", en: "LLM tools" }, code: "LLM", items: ["Claude CLI", "Codex", "DeepSeek Harness", "Orca", "Image 2"] },
];
