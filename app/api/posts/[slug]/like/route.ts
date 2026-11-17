import { isPost, toggleLike } from "@/lib/postStats";
import { fromThisSite, visitorId } from "@/lib/visitor";

/** Likes the post for this visitor, or takes the like back. Answers with the new count. */
export async function POST(request: Request, ctx: RouteContext<"/api/posts/[slug]/like">) {
  const { slug } = await ctx.params;
  if (!isPost(slug) || !fromThisSite(request)) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(toggleLike(slug, await visitorId()), { headers: { "Cache-Control": "no-store" } });
}
