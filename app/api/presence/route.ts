import { NextResponse } from "next/server";
import { getPresence, updatePresence } from "@/lib/presence";
import type { PresencePayload } from "@/lib/presence-types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getPresence(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as PresencePayload;

  if (payload.status !== "online" && payload.status !== "offline") {
    return NextResponse.json({ error: "status must be online or offline." }, { status: 400 });
  }

  const next = await updatePresence(payload);
  return NextResponse.json(next, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
