import "server-only";
import { cookies } from "next/headers";
import { VISITOR_COOKIE } from "./postStats";

/** This visitor's id from their cookie; one is issued (for a year) if they have none yet. */
export async function visitorId() {
  const jar = await cookies();
  const known = jar.get(VISITOR_COOKIE)?.value;
  if (known && /^[0-9a-f-]{36}$/.test(known)) return known;
  const id = crypto.randomUUID();
  jar.set(VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return id;
}

/** Counts only come from the site's own pages: a cross-site request is turned away. */
export function fromThisSite(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = new URL(origin).host;
  return host === request.headers.get("x-forwarded-host") || host === request.headers.get("host");
}

/** Crawlers and previews don't count as reads. */
export const isBot = (request: Request) => /bot|crawl|spider|slurp|preview|headless|curl|wget|python|httpclient/i.test(request.headers.get("user-agent") ?? "");
