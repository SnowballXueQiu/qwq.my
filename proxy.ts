import { NextResponse, type NextRequest } from "next/server";
import { locales, negotiateLocale } from "@/lib/i18n";

/** The old blog's hostname: everything there now lives under qwq.my/<locale>/blog. */
const BLOG_HOST = "blog.qwq.my";
const SITE = "https://qwq.my";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0];
  if (host === BLOG_HOST) {
    const locale = negotiateLocale(request.headers.get("accept-language"));
    return NextResponse.redirect(`${SITE}/${locale}/blog`, 301);
  }
  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return;

  const locale = negotiateLocale(request.headers.get("accept-language"));
  request.nextUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // Skip Next internals, API routes, metadata images and any file with an extension
  // (the blog host is caught by the catch-all below as well).
  matcher: ["/((?!_next|api|opengraph-image|icon|.*\\..*).*)"],
};
