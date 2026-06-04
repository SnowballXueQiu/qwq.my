import { NextResponse } from "next/server";
import { getAnalytics, recordPageView } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = url.searchParams.get("page") ?? "/";
  const analytics = await getAnalytics();

  return NextResponse.json({
    totalPageViews: analytics.totalPageViews,
    pageViews: analytics.pages[page] ?? 0,
    updatedAt: analytics.updatedAt,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { page?: string };
  const page = body.page ?? "/";
  const analytics = await recordPageView(page);

  return NextResponse.json({
    totalPageViews: analytics.totalPageViews,
    pageViews: analytics.pages[page] ?? 0,
    updatedAt: analytics.updatedAt,
  });
}
