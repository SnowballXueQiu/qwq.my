import { profile } from "@/content/profile";
import { projects } from "@/content/projects";
import { skills } from "@/content/skills";
import { timeline } from "@/content/timeline";
import { emit } from "@/lib/fx";
import type { Locale } from "@/lib/i18n";
import { scrollToTarget } from "@/lib/scroll";
import { sheets } from "@/lib/sheets";
import type { PostMeta } from "@/lib/postTypes";
import type { Expression } from "@/lib/store";

export type Line = { kind: "in" | "out" | "err" | "ok" | "accent"; text: string };

export type Context = {
  locale: Locale;
  print: (...lines: (string | Line)[]) => void;
  clear: () => void;
  close: () => void;
  navigate: (href: string) => void;
  history: string[];
  posts: PostMeta[];
};

type Command = {
  summary: Record<Locale, string>;
  usage?: string;
  /** Candidates for the first argument, for Tab completion. */
  args?: () => string[];
  run: (args: string[], ctx: Context) => void | Promise<void>;
};

const t = (ctx: Context, zh: string, en: string) => (ctx.locale === "zh" ? zh : en);
const ok = (text: string): Line => ({ kind: "ok", text });
const err = (text: string): Line => ({ kind: "err", text });
const accent = (text: string): Line => ({ kind: "accent", text });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SECTIONS = sheets.filter((s) => s !== "hero");
/** Filled in by the terminal so `read <Tab>` can complete post slugs. */
let postSlugs: string[] = [];
export const setPostSlugs = (slugs: string[]) => {
  postSlugs = slugs;
};
const FACES: Expression[] = ["QwQ", "OwO", ">w<", "QAQ", "@w@", "-w-", "^w^"];

function gpu() {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return (ext && gl?.getParameter(ext.UNMASKED_RENDERER_WEBGL)) || "unknown";
  } catch {
    return "unknown";
  }
}

export const commands: Record<string, Command> = {
  help: {
    summary: { zh: "列出所有命令", en: "list commands" },
    run: (_, ctx) => {
      ctx.print(accent(t(ctx, "可用命令：", "available commands:")));
      for (const [name, c] of Object.entries(commands)) {
        if (name === "sudo") continue;
        ctx.print(`  ${(name + (c.usage ? " " + c.usage : "")).padEnd(18)} ${c.summary[ctx.locale]}`);
      }
      ctx.print(t(ctx, "  提示：Tab 补全，↑↓ 历史，Esc 关闭", "  tip: Tab completes, ↑↓ history, Esc closes"));
    },
  },
  ls: {
    summary: { zh: "列出板块", en: "list sections" },
    run: (_, ctx) => {
      ctx.print(SECTIONS.map((s) => s + "/").join("  ") + "  blog/  projects/");
    },
  },
  cd: {
    summary: { zh: "飞到某个板块", en: "fly to a section" },
    usage: "<section>",
    args: () => [...SECTIONS, "~"],
    run: ([target], ctx) => {
      const id = !target || target === "~" || target === "/" ? "hero" : target.replace(/\/$/, "");
      if (id === "blog") return ctx.navigate(`/${ctx.locale}/blog`);
      if (!sheets.includes(id as (typeof sheets)[number])) {
        return ctx.print(err(`cd: ${target}: ${t(ctx, "没有这个板块", "no such section")}`));
      }
      if (location.pathname !== `/${ctx.locale}`) {
        ctx.navigate(`/${ctx.locale}#${id}`);
      } else {
        ctx.close();
        setTimeout(() => scrollToTarget(`#${id}`), 80);
      }
    },
  },
  cat: {
    summary: { zh: "查看信息", en: "print a file" },
    usage: "<about|skills|timeline>",
    args: () => ["about", "skills", "timeline"],
    run: ([file], ctx) => {
      const l = ctx.locale;
      if (file === "about" || file === "about.md") {
        ctx.print(
          accent(`# ${profile.name[l]}`),
          `${profile.roles[l]} · ${profile.school[l]} · ${profile.major[l]} · ${profile.grade[l]}`,
          ...profile.bio.map((p) => p[l]),
        );
      } else if (file === "skills") {
        skills.forEach((s) => ctx.print(`${s.name.padEnd(18)} ${"▮".repeat(s.level)}${"▯".repeat(5 - s.level)}  since ${s.since}`));
      } else if (file === "timeline") {
        timeline.forEach((e) => ctx.print(`${e.date}  ${e.title[l]}`));
      } else {
        ctx.print(err(`cat: ${file ?? ""}: ${t(ctx, "没有这个文件", "no such file")}`));
      }
    },
  },
  projects: {
    summary: { zh: "列出项目", en: "list projects" },
    run: (_, ctx) => {
      projects.forEach((p, i) => ctx.print(`[${i + 1}] ${p.title.padEnd(16)} ${p.year}  ${p.summary[ctx.locale]}`));
      ctx.print(t(ctx, "用 open <编号> 打开", "use open <n> to open one"));
    },
  },
  open: {
    summary: { zh: "打开项目", en: "open a project" },
    usage: "<n|slug>",
    args: () => projects.map((p) => p.slug),
    run: ([arg], ctx) => {
      const p = projects[Number(arg) - 1] ?? projects.find((q) => q.slug === arg);
      const href = p?.href ?? p?.repo;
      if (!p) return ctx.print(err(`open: ${arg ?? ""}: ${t(ctx, "找不到", "not found")}`));
      if (!href) return ctx.print(t(ctx, `${p.title} 还没有公开链接`, `${p.title} has no public link yet`));
      window.open(href, "_blank", "noopener");
      ctx.print(ok(`→ ${href}`));
    },
  },
  blog: {
    summary: { zh: "列出文章", en: "list posts" },
    run: (_, ctx) => {
      ctx.posts.forEach((p, i) => ctx.print(`[${i + 1}] ${p.date}  ${p.title}`));
      ctx.print(t(ctx, "用 read <编号> 阅读", "use read <n> to read one"));
    },
  },
  read: {
    summary: { zh: "阅读文章", en: "read a post" },
    usage: "<n|slug>",
    args: () => postSlugs,
    run: ([arg], ctx) => {
      const p = ctx.posts[Number(arg) - 1] ?? ctx.posts.find((q) => q.slug === arg);
      if (!p) return ctx.print(err(`read: ${arg ?? ""}: ${t(ctx, "找不到", "not found")}`));
      ctx.navigate(`/${ctx.locale}/blog/${p.slug}`);
    },
  },
  lab: {
    summary: { zh: "打开实验室（流体、反应扩散）", en: "open the lab (fluids, reaction–diffusion)" },
    run: (_, ctx) => ctx.navigate(`/${ctx.locale}/lab`),
  },
  whoami: {
    summary: { zh: "你是谁", en: "who are you" },
    run: (_, ctx) => ctx.print(t(ctx, "visitor —— 一位有好奇心的访客 (◉w◉)", "visitor — a curious one (◉w◉)")),
  },
  neofetch: {
    summary: { zh: "系统信息", en: "system info" },
    run: (_, ctx) => {
      const art = [
        "  .---.       .---.   ",
        " /     \\     /     \\  ",
        "|   ●   | w |   ●   | ",
        " \\     /     \\     /  ",
        "  '---'\\      '---'\\  ",
      ];
      const info = [
        `visitor@qwq.my`,
        `--------------`,
        `OS: ${navigator.platform || "web"}`,
        `Screen: ${screen.width}×${screen.height} @${devicePixelRatio}x`,
        `GPU: ${gpu()}`,
        `Shell: qwqsh 0.1`,
        `Uptime: ${Math.round(performance.now() / 1000)}s`,
      ];
      for (let i = 0; i < Math.max(art.length, info.length); i++) {
        ctx.print({ kind: i < 2 ? "accent" : "out", text: (art[i] ?? "").padEnd(28) + (info[i] ?? "") });
      }
    },
  },
  date: {
    summary: { zh: "当前时间", en: "current time" },
    run: (_, ctx) => ctx.print(new Date().toString()),
  },
  echo: {
    summary: { zh: "回显", en: "print text" },
    usage: "<text>",
    run: (args, ctx) => ctx.print(args.join(" ")),
  },
  history: {
    summary: { zh: "命令历史", en: "command history" },
    run: (_, ctx) => ctx.history.forEach((h, i) => ctx.print(`${String(i + 1).padStart(4)}  ${h}`)),
  },
  lang: {
    summary: { zh: "切换语言", en: "switch language" },
    usage: "<zh|en>",
    args: () => ["zh", "en"],
    run: ([l], ctx) => {
      if (l !== "zh" && l !== "en") return ctx.print(err("lang: zh | en"));
      ctx.navigate(location.pathname.replace(/^\/(zh|en)/, `/${l}`) + location.hash);
    },
  },
  invert: {
    summary: { zh: "反白闪一下", en: "flash the frame" },
    run: (_, ctx) => {
      emit("flash", { duration: 0.15 });
      emit("glitch", { duration: 0.4, amount: 0.7 });
      ctx.print(ok("✓"));
    },
  },
  qwq: {
    summary: { zh: "让 QwQ 换个表情", en: "make QwQ pull a face" },
    usage: "[face]",
    args: () => FACES,
    run: ([face], ctx) => {
      const expression = (FACES.includes(face as Expression) ? face : FACES[Math.floor(Math.random() * FACES.length)]) as Expression;
      emit("face", { expression, duration: 3 });
      ctx.print(accent(expression));
    },
  },
  debug: {
    summary: { zh: "开始抓虫小游戏", en: "start the bug-squashing game" },
    run: (_, ctx) => {
      ctx.close();
      emit("game", { open: true });
    },
  },
  clear: {
    summary: { zh: "清屏", en: "clear the screen" },
    run: (_, ctx) => ctx.clear(),
  },
  exit: {
    summary: { zh: "关闭终端", en: "close the terminal" },
    run: (_, ctx) => ctx.close(),
  },
  sudo: {
    summary: { zh: "", en: "" },
    run: async (args, ctx) => {
      if (args.join(" ").replace(/\s+/g, " ").trim() !== "rm -rf /") {
        return ctx.print(err(t(ctx, "visitor 不在 sudoers 文件中。此事将被报告。", "visitor is not in the sudoers file. This incident will be reported.")));
      }
      ctx.print("[sudo] password for visitor: ********");
      for (const path of ["/usr/share/paper", "/lib/ink.so", "/etc/shaders", "/bin/qwq", "/home/me"]) {
        await sleep(160);
        ctx.print(err(`rm: removing '${path}' ...`));
      }
      await sleep(250);
      ctx.close();
      emit("crash", {});
    },
  },
};

export function complete(input: string): string | null {
  const parts = input.split(/\s+/);
  if (parts.length === 1) {
    const hits = Object.keys(commands).filter((c) => c !== "sudo" && c.startsWith(parts[0]));
    return hits.length === 1 ? hits[0] + " " : null;
  }
  const cmd = commands[parts[0]];
  const candidates = cmd?.args?.() ?? [];
  const last = parts[parts.length - 1];
  const hits = candidates.filter((c) => c.startsWith(last));
  if (hits.length !== 1) return null;
  return [...parts.slice(0, -1), hits[0]].join(" ") + " ";
}

export async function run(input: string, ctx: Context) {
  const [name, ...args] = input.trim().split(/\s+/);
  if (!name) return;
  const cmd = commands[name];
  if (!cmd) {
    ctx.print(err(`${name}: command not found — ${t(ctx, "试试 help", "try help")}`));
    emit("face", { expression: "QAQ", duration: 1.5 });
    return;
  }
  await cmd.run(args, ctx);
}
