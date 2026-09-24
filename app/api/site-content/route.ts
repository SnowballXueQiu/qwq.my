import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSiteContent, updateSiteContent } from "@/lib/site-content";
import type { SiteContent } from "@/lib/site-content-types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getSiteContent(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function PUT(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const content = (await request.json()) as SiteContent;

  if (
    !Array.isArray(content.projects) ||
    !Array.isArray(content.friends) ||
    !Array.isArray(content.me) ||
    !content.site ||
    typeof content.site.title !== "string" ||
    typeof content.site.faviconUrl !== "string" ||
    typeof content.site.heroImageUrl !== "string" ||
    typeof content.site.showGithub !== "boolean" ||
    typeof content.site.showX !== "boolean" ||
    typeof content.site.showEmail !== "boolean" ||
    !content.about ||
    typeof content.about.copyright !== "string"
  ) {
    return NextResponse.json({ error: "Invalid site content payload." }, { status: 400 });
  }

  const saved = await updateSiteContent(content);
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/friends");
  revalidatePath("/me");
  revalidatePath("/admin/site");
  return NextResponse.json(saved);
}
