"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export function LangToggle({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const other: Locale = locale === "zh" ? "en" : "zh";
  const href = pathname.replace(/^\/(zh|en)(?=\/|$)/, `/${other}`) || `/${other}`;

  return (
    <Link
      href={href}
      hrefLang={other}
      aria-label={label}
      data-cursor={other.toUpperCase()}
      className="label border border-ink px-2 py-1 transition-colors hover:bg-ink hover:text-paper"
    >
      {locale === "zh" ? "中 / en" : "zh / EN"}
    </Link>
  );
}
