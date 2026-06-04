import { NextResponse } from "next/server";
import { adminCookieOptions } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ ...adminCookieOptions(), value: "", maxAge: 0 });
  return response;
}
