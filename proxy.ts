import { NextResponse, type NextRequest } from "next/server";
import { locales, negotiateLocale } from "@/lib/i18n";

/** www.qwq.my is an alias: send it to the bare domain, same path. */
const WWW_HOST = "www.qwq.my";
const SITE = "https://qwq.my";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0];
  if (host === WWW_HOST) return NextResponse.redirect(`${SITE}${pathname}${search}`, 301);

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return;

  const locale = negotiateLocale(request.headers.get("accept-language"));
  request.nextUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // Skip Next internals, API routes and metadata images. Files with an extension
  // skip it too, except on www, which redirects everything.
  matcher: [
    "/((?!_next|api|opengraph-image|icon|.*\\..*).*)",
    // Must be a literal: Next reads this config statically.
    { source: "/:path*", has: [{ type: "host", value: "www.qwq.my" }] },
  ],
};
