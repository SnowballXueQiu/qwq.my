import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { deleteMediaAsset, getMediaAsset, getMediaFileStream } from "@/lib/media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const [asset, stream] = await Promise.all([getMediaAsset(id), getMediaFileStream(id).catch(() => null)]);

  if (!asset || !stream) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  return new NextResponse(stream, {
    headers: {
      "Content-Type": asset.contentType,
      "Content-Length": String(asset.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  await deleteMediaAsset(id);
  return NextResponse.json({ ok: true });
}
