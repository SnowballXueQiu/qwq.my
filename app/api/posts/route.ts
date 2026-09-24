import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { createPost, getPosts } from "@/lib/posts";
import type { Post } from "@/lib/post-types";

export const dynamic = "force-dynamic";

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
    typeof candidate.content === "string"
  );
}

export async function GET() {
  return NextResponse.json(await getPosts(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  if (!isPost(body)) {
    return NextResponse.json({ error: "Invalid post payload." }, { status: 400 });
  }

  const saved = await createPost({ ...body, views: body.views ?? 0, likes: body.likes ?? 0 });
  revalidatePath("/");
  revalidatePath("/admin/posts");
  revalidatePath("/admin/site");
  revalidatePath(`/writing/${saved.slug}`);
  return NextResponse.json(saved, { status: 201 });
}
