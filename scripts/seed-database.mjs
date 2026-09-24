import process from "node:process";

const dynamicImport = new Function("specifier", "return import(specifier)");

const DEFAULT_SITE_CONTENT = {
  site: {
    title: "qwq.my",
    description: "A soft hand-drawn personal blog built with Next.js.",
    faviconUrl: "",
    brandName: "qwq.my",
    heroTitle: "Ahoy~!!\nI'm snowball~!!",
    heroSubtitle: "Frontend engineer & interface tinkerer",
    heroTagline: "Problem solver :)",
    heroImageUrl: "",
    heroImageAlt: "Pastel hand-drawn mascot holding a small star wand",
    projectsIntro: "Small UI experiments, notes, and tools that keep the page alive.",
    githubUrl: "https://github.com/SnowballXueQiu",
    xUrl: "https://twitter.com/SnowballLoveYou",
    email: "i@qwq.my",
    showGithub: true,
    showX: true,
    showEmail: true,
  },
  me: [
    {
      id: "intro",
      kind: "intro",
      title: "SnowballXueQiu",
      summary: "Student, builder, Minecraft server engineer, and frontend developer.",
      enabled: true,
      imageUrl: "https://s2.loli.net/2024/07/14/KSNQxu9RBlWdbJ6.gif",
      imageAlt: "QwQ",
      items: [{ title: "Self-introduction", subtitle: "Hello! I am SnowballXueQiu.", url: "", meta: "About", color: "violet" }],
      links: [],
    },
  ],
  projects: [
    {
      title: "Presence Board",
      summary: "A local macOS probe, API route, and live website widget.",
      status: "Live",
      tags: ["nextjs", "swiftui", "presence"],
      color: "mint",
      githubUrl: "",
    },
  ],
  friends: [],
  about: {
    copyright: "© 2026 snowball. Site content, writing, and visual direction are reserved unless otherwise noted.",
  },
};

const MARKDOWN_STYLE_PREVIEW = [
  "# Markdown Style Preview",
  "",
  "This article covers the supported writing blocks used by the renderer.",
  "",
  "::: toc Contents",
  ":::",
  "",
  "## Inline Markdown",
  "",
  "**Bold text**, __strong text__, ++underlined text++, _italic text_, [a normal link](https://qwq.my), `inline $x^2$ math`, and inline math $a^2 + b^2 = c^2$.",
  "",
  "---",
  "",
  "~~~",
  "",
  "===",
  "",
  "## KaTeX",
  "",
  "$$",
  "\\int_0^1 x^2\\,dx = \\frac{1}{3}",
  "$$",
  "",
  "$$",
  "\\begin{aligned}",
  "f(x) &= x^2 + 2x + 1\\\\",
  "     &= (x+1)^2",
  "\\end{aligned}",
  "$$",
  "",
  "$$",
  "\\sum_{n=1}^{5} n = 1 + 2 + 3 + 4 + 5 = 15",
  "$$",
  "",
  "## Mermaid",
  "",
  "```mermaid",
  "graph TD",
  "  A[Draft] --> B[Preview]",
  "  B --> C[Publish]",
  "```",
  "",
  "## Gallery",
  "",
  "::: gallery",
  "https://loremflickr.com/640/480/city?1",
  "https://loremflickr.com/640/480/city?2",
  "https://loremflickr.com/640/480/city?3",
  "![](https://loremflickr.com/640/480/city?4 'Image')",
  ":::",
  "",
  "## Grid",
  "",
  "::: grid {cols=3,gap=4}",
  "Grid 1",
  "Grid 2",
  "Grid 3",
  "https://loremflickr.com/640/480/city?1",
  "https://loremflickr.com/640/480/city?2",
  "https://loremflickr.com/640/480/city?3",
  "![](https://loremflickr.com/640/480/city?4 'Image')",
  "![](https://loremflickr.com/640/480/city?4 'Image')",
  "![](https://loremflickr.com/640/480/city?4 'Image')",
  ":::",
  "",
  "Media library images can be referenced as `![](/media/image-name.png)` after upload.",
  "",
  "## Warning And Banner",
  "",
  "::: warning",
  "_here be dragons_",
  ":::",
  "",
  "::: banner {error}",
  "_here be dragons_",
  ":::",
  "",
  "## Table",
  "",
  "| Feature | Syntax | Status |",
  "| --- | --- | --- |",
  "| KaTeX | `$x^2$` | supported |",
  "| Inline math | `$\\alpha + \\beta$` | supported |",
  "| Inline code math | `inline $x^2$ math` | supported |",
  "| Mermaid | code fence | supported |",
  "| Gallery | directive | supported |",
  "| Spoiler | `||hidden text||` | supported |",
  "| Divider | `---` / `~~~` / `===` | supported |",
  "| TOC | `::: toc Contents` | supported |",
  "",
  "## Excalidraw",
  "",
  "```excalidraw",
  "{\"type\":\"excalidraw/clipboard\",\"elements\":[{\"type\":\"rectangle\",\"version\":14,\"versionNonce\":1361369853,\"isDeleted\":false,\"id\":\"_PSpf6pLwkWIJubC_tf9D\",\"fillStyle\":\"solid\",\"strokeWidth\":2,\"strokeStyle\":\"solid\",\"roughness\":1,\"opacity\":100,\"angle\":0,\"x\":545.0390625,\"y\":387.296875,\"strokeColor\":\"#1e1e1e\",\"backgroundColor\":\"transparent\",\"width\":177.53515625,\"height\":138.328125,\"seed\":1495751197,\"groupIds\":[],\"frameId\":null,\"roundness\":{\"type\":3},\"boundElements\":[],\"updated\":1706954302946,\"link\":null,\"locked\":false}],\"files\":{}}",
  "```",
  "",
  "## Collapse And Spoiler",
  "",
  "::: collapse Details",
  "Hidden notes can contain **Markdown**.",
  ":::",
  "",
  "This block is hidden until opened. Inline spoiler looks like ||hidden text||.",
  "",
  "## List",
  "",
  "- Unordered item",
  "- Another item with `inline $y^2$ math`",
  "1. Ordered item",
  "2. Ordered item with __strong__ text",
  "",
  "## Quote",
  "",
  "> This is a blockquote with **bold** and `inline $z^2$ math`.",
  "",
  "## Final Note",
  "",
  "This preview now shows headings, paragraphs, lists, quotes, block math, inline math, inline code math, divider styles, TOC, gallery, grid, table, spoiler, collapse, mermaid, and excalidraw in one place.",
  "",
  "## Rich Link",
  "",
  "richlink https://github.com/Innei/Shiro",
  "",
  "[Innei/Shiro#129](https://github.com/Innei/Shiro/pull/129)",
  "",
  "https://github.com/Innei/Shiro/commit/6957e011439eb2d3cbf42bfb67ed81b07d4bcc2a",
].join("\n");

const DEFAULT_POSTS = [
  {
    slug: "markdown-style-preview",
    title: "Markdown Style Preview",
    summary: "A complete preview article for every supported Markdown extension.",
    date: "June 4, 2026",
    topic: "frontend",
    tags: ["markdown", "preview", "katex", "mermaid"],
    read: 2,
    color: "blue",
    views: 0,
    likes: 0,
    content: MARKDOWN_STYLE_PREVIEW,
  },
  {
    slug: "markdown-garden",
    title: "Markdown Garden",
    summary: "A tiny notebook for ideas, components, and sketchy experiments.",
    date: "May 28, 2026",
    topic: "design",
    tags: ["demo", "markdown", "styling"],
    read: 1,
    color: "violet",
    views: 0,
    likes: 0,
    content: "## A small garden\n\nThis garden is where small interface thoughts get planted before they become full projects.\n\n$$\n\\text{idea} \\rightarrow \\text{note} \\rightarrow \\text{project}\n$$",
  },
];

const DEFAULT_ANALYTICS = {
  totalPageViews: 0,
  pages: {},
  updatedAt: new Date(0).toISOString(),
};

const DEFAULT_PRESENCE = {
  status: "offline",
  location: "Shanghai",
  bpm: 72,
  device: { name: "Mac", os: "macOS" },
  activeApp: { name: "Unknown" },
  editing: { isEditor: true, editor: "Next.js", file: "app/page.tsx", branch: "main" },
  updatedAt: new Date(0).toISOString(),
  stale: true,
};

async function main() {
  if (!process.env.MONGODB_URI) {
    console.log("MONGODB_URI is not set; skipping seed.");
    return;
  }

  const { MongoClient } = await dynamicImport("mongodb");
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const db = client.db(process.env.MONGODB_DB || "qwq_my");

  await db.collection("siteContent").updateOne({ _id: "current" }, { $setOnInsert: { ...DEFAULT_SITE_CONTENT, _id: "current" } }, { upsert: true });

  for (const post of DEFAULT_POSTS) {
    if (post.slug === "markdown-style-preview") {
      await db.collection("posts").updateOne({ slug: post.slug }, { $set: post }, { upsert: true });
    } else {
      await db.collection("posts").updateOne({ slug: post.slug }, { $setOnInsert: post }, { upsert: true });
    }
  }

  await db.collection("analytics").updateOne({ _id: "current" }, { $setOnInsert: { ...DEFAULT_ANALYTICS, _id: "current" } }, { upsert: true });
  await db.collection("presence").updateOne({ _id: "current" }, { $setOnInsert: { ...DEFAULT_PRESENCE, _id: "current" } }, { upsert: true });

  await Promise.all([
    db.collection("posts").createIndex({ slug: 1 }, { unique: true }),
    db.collection("friendApplications").createIndex({ createdAt: -1 }),
    db.collection("media").createIndex({ createdAt: -1 }),
    db.collection("mediaFiles.files").createIndex({ uploadDate: -1 }),
  ]);

  await client.close();
  console.log("Database seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
