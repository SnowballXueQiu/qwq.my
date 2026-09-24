import { NextResponse } from "next/server";
import { incrementPostLike } from "@/lib/posts";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const post = await incrementPostLike(slug);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  return NextResponse.json({ likes: post.likes, views: post.views });
}
