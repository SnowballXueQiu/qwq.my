import { isPost, readStats, recordView } from "@/lib/postStats";
import { fromThisSite, isBot, visitorId } from "@/lib/visitor";

/** A read of the post: counted once per visitor per day. Answers with the post's view count. */
export async function POST(request: Request, ctx: RouteContext<"/api/posts/[slug]/view">) {
  const { slug } = await ctx.params;
  if (!isPost(slug) || !fromThisSite(request)) return Response.json({ error: "not found" }, { status: 404 });
  if (isBot(request)) return Response.json({ views: readStats(slug, undefined).views });
  const views = recordView(slug, await visitorId());
  return Response.json({ views }, { headers: { "Cache-Control": "no-store" } });
}
