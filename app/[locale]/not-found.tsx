import Link from "next/link";
import { getDictionary, getLocale } from "@/lib/dictionaries";

export default async function NotFound() {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <main
      id="main"
      className="flex min-h-svh flex-col items-start justify-center gap-6"
      style={{ padding: "var(--sheet-pad)" }}
    >
      <p className="label text-accent">ERR 404 · SHEET MISSING</p>
      <h1 className="font-display text-6xl font-extrabold tracking-tight md:text-8xl">
        {dict.notFound.title}
      </h1>
      <p className="max-w-md text-ink-soft">{dict.notFound.body}</p>
      <Link href={`/${locale}`} className="label border border-ink px-3 py-2 hover:bg-ink hover:text-paper">
        ← {dict.notFound.back}
      </Link>
    </main>
  );
}
