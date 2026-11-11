import { hasLocale } from "@/lib/i18n";
import { listPosts } from "@/lib/posts";
import { profile } from "@/content/profile";

const SITE = "https://qwq.my";
const escape = (s: string) => s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** RSS 2.0 for each language: /zh/feed.xml and /en/feed.xml. */
export async function GET(_: Request, { params }: RouteContext<"/[locale]/feed.xml">) {
  const { locale } = await params;
  if (!hasLocale(locale)) return new Response("Not found", { status: 404 });
  const posts = await listPosts(locale);
  const items = posts
    .map(
      (p) => `    <item>
      <title>${escape(p.title)}</title>
      <link>${SITE}/${locale}/blog/${p.slug}</link>
      <guid>${SITE}/${locale}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${escape(p.summary)}</description>
    </item>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escape(profile.name[locale])} · qwq.my</title>
    <link>${SITE}/${locale}</link>
    <description>${escape(profile.roles[locale])}</description>
    <language>${locale === "zh" ? "zh-CN" : "en"}</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}

export function generateStaticParams() {
  return [{ locale: "zh" }, { locale: "en" }];
}
