"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { scrollToSheet } from "@/components/scroll/beats";
import { sheetNumber, sheets, type SheetId } from "@/lib/sheets";
import { useSite } from "@/lib/store";

export function SheetNav({
  locale,
  titles,
  labLabel,
}: {
  locale: Locale;
  titles: Record<SheetId, string>;
  labLabel: string;
}) {
  const active = useSite((s) => s.sheet);
  const isHome = usePathname() === `/${locale}`;

  return (
    <nav aria-label="Sheets" className="hidden lg:block">
      <ol className="flex items-center gap-4">
        {sheets.slice(1).map((id) => {
          const isActive = isHome && sheets[active] === id;
          return (
            <li key={id}>
              <Link
                href={`/${locale}#${id}`}
                onClick={(e) => {
                  if (!isHome) return;
                  e.preventDefault();
                  scrollToSheet(id);
                }}
                aria-current={isActive ? "location" : undefined}
                className="label group flex items-baseline gap-1.5"
              >
                <span className={isActive ? "text-accent" : "text-ink-soft"}>
                  {sheetNumber(id)}
                </span>
                <span className="relative">
                  {titles[id]}
                  <span
                    aria-hidden
                    className={`absolute -bottom-1 left-0 h-px bg-current transition-[width] duration-300 ${
                      isActive ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                </span>
              </Link>
            </li>
          );
        })}
        <li>
          <Link href={`/${locale}/lab`} className="label flex items-baseline gap-1.5 text-accent">
            <span>LAB</span>
            <span>{labLabel}</span>
          </Link>
        </li>
      </ol>
    </nav>
  );
}
