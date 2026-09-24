import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { addFriendApplication, getFriendApplications } from "@/lib/friend-applications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json(await getFriendApplications(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, string>;
  const required = ["nickname", "siteTitle", "website", "avatarUrl", "email", "intro"];
  const missing = required.some((key) => !payload[key]?.trim());

  if (missing) {
    return NextResponse.json({ error: "Missing required friend application fields." }, { status: 400 });
  }

  const website = normalizeHttps(payload.website);
  const avatarUrl = normalizeHttps(payload.avatarUrl);

  if (!website || !avatarUrl || !payload.email.includes("@")) {
    return NextResponse.json({ error: "Invalid URL or email." }, { status: 400 });
  }

  const saved = await addFriendApplication({
    nickname: payload.nickname.trim(),
    siteTitle: payload.siteTitle.trim(),
    website,
    avatarUrl,
    email: payload.email.trim(),
    intro: payload.intro.trim(),
  }).catch(() => null);

  if (!saved) {
    return NextResponse.json({ error: "MongoDB is required to save friend applications." }, { status: 503 });
  }

  return NextResponse.json(saved, { status: 201 });
}

function normalizeHttps(value: string) {
  const trimmed = value.trim();
  const withProtocol = trimmed.startsWith("https://") ? trimmed : `https://${trimmed.replace(/^https?:\/\//, "")}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}
