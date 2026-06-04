import { NextResponse } from "next/server";
import { adminCookieOptions, createAdminSessionToken, verifyAdminPassword } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { username?: string; password?: string };
  const valid = await verifyAdminPassword(body.username ?? "", body.password ?? "");

  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    ...adminCookieOptions(),
    value: createAdminSessionToken(body.username),
  });
  return response;
}
