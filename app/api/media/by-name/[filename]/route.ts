import { NextResponse } from "next/server";
import { getMediaAssetByFilename, getMediaFileStream } from "@/lib/media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ filename: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { filename } = await context.params;
  const asset = await getMediaAssetByFilename(decodeURIComponent(filename));
  const stream = asset ? await getMediaFileStream(asset.id).catch(() => null) : null;

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
