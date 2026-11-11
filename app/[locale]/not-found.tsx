import Link from "next/link";
import { getDictionary, getLocale } from "@/lib/dictionaries";
import { DebugButton } from "@/components/game/DebugButton";

export default async function NotFound() {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <main
      id="main"
      className="relative z-10 flex min-h-svh flex-col items-start justify-center gap-6"
      style={{ padding: "var(--sheet-pad)" }}
    >
      <p className="label text-accent">ERR 404 · SHEET MISSING</p>
      <p aria-hidden className="font-display text-[clamp(5rem,18vw,14rem)] font-black leading-none tracking-tight text-accent">
        QAQ
      </p>
      <h1 className="font-display text-5xl font-extrabold tracking-tight md:text-7xl">{dict.notFound.title}</h1>
      <p className="max-w-md text-ink-soft">{dict.notFound.body}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/${locale}`} className="label border border-ink bg-paper px-3 py-2 hover:bg-ink hover:text-paper">
          ← {dict.notFound.back}
        </Link>
        <div className="w-56">
          <DebugButton label={dict.game.start} />
        </div>
      </div>
    </main>
  );
}
