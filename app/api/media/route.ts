import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { addMediaAsset, getMediaAssets } from "@/lib/media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const allowedTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/svg+xml", "svg"],
  ["image/x-icon", "ico"],
  ["image/vnd.microsoft.icon", "ico"],
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
  ["application/pdf", "pdf"],
  ["text/plain", "txt"],
]);

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json(await getMediaAssets());
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing media file." }, { status: 400 });
  }

  const extension = allowedTypes.get(file.type);
  if (!extension) {
    return NextResponse.json({ error: "Unsupported media type." }, { status: 400 });
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "Media must be smaller than 50MB." }, { status: 400 });
  }

  const safeBase = file.name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
  const filename = `${Date.now()}-${safeBase || "media"}.${extension}`;
  const asset = await addMediaAsset({
    filename,
    contentType: file.type,
    size: file.size,
    createdAt: new Date().toISOString(),
    bytes: Buffer.from(await file.arrayBuffer()),
  });

  return NextResponse.json({ url: asset.url, asset });
}
