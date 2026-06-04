import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminRequest } from "@/lib/admin-auth";
import { updatePost } from "@/lib/posts";
import type { Post } from "@/lib/post-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function isPost(value: unknown): value is Post {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Post>;
  return (
    typeof candidate.slug === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.summary === "string" &&
    typeof candidate.date === "string" &&
    typeof candidate.topic === "string" &&
    Array.isArray(candidate.tags) &&
    typeof candidate.read === "number" &&
    typeof candidate.color === "string" &&
    Array.isArray(candidate.content)
  );
}

export async function PUT(request: Request, context: RouteContext) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { slug } = await context.params;
  const body = await request.json();

  if (!isPost(body) || body.slug !== slug) {
    return NextResponse.json({ error: "Invalid post payload." }, { status: 400 });
  }

  const saved = await updatePost(slug, body);
  revalidatePath("/");
  revalidatePath(`/writing/${slug}`);
  revalidatePath("/admin/posts");

  return NextResponse.json(saved);
}
