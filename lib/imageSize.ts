import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";

export type Size = { width: number; height: number };

const PUBLIC = path.join(process.cwd(), "public");
const cache = new Map<string, Size | null>();

/** Pixel size of an image served from public/, or null for remote or unreadable files. */
export function publicImageSize(src: string): Size | null {
  if (!src.startsWith("/")) return null;
  const hit = cache.get(src);
  if (hit !== undefined) return hit;
  let size: Size | null = null;
  const file = path.join(PUBLIC, decodeURI(src.split(/[?#]/)[0]));
  if (file.startsWith(PUBLIC + path.sep)) {
    try {
      const { width, height } = imageSize(readFileSync(file));
      if (width && height) size = { width, height };
    } catch {}
  }
  cache.set(src, size);
  return size;
}
