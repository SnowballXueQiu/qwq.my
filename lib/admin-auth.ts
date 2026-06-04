import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const cookieName = "snowball_admin_session";

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || "development-session-secret-change-me";
}

function getAdminUsername() {
  return process.env.ADMIN_USERNAME || "snowball";
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

function timingSafeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function verifyAdminPassword(username: string, password: string) {
  if (username !== getAdminUsername()) return false;

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) return false;

  const [algorithm, salt, expected] = hash.split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;

  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });

  return timingSafeEqual(derived.toString("hex"), expected);
}

export function createAdminSessionToken(username = getAdminUsername()) {
  const days = Number(process.env.ADMIN_SESSION_DAYS ?? 14);
  const expiresAt = Date.now() + Math.max(days, 1) * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ username, expiresAt })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionToken(token?: string) {
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature || !timingSafeEqual(sign(payload), signature)) return false;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { username: string; expiresAt: number };
    return session.username === getAdminUsername() && session.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export async function requireAdmin() {
  const store = await cookies();
  if (!verifyAdminSessionToken(store.get(cookieName)?.value)) {
    redirect("/admin/login");
  }
}

export function isAdminRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);

  return verifyAdminSessionToken(token);
}

export function adminCookieOptions() {
  const days = Number(process.env.ADMIN_SESSION_DAYS ?? 14);
  return {
    name: cookieName,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.max(days, 1) * 24 * 60 * 60,
  };
}
