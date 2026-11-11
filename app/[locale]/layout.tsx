import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { profile } from "@/content/profile";
import { getDictionary, getLocale } from "@/lib/dictionaries";
import { locales } from "@/lib/i18n";
import { SmoothScroll } from "@/components/scroll/SmoothScroll";
import { SceneLoader } from "@/components/three/SceneLoader";
import { CrosshairCursor } from "@/components/ui/CrosshairCursor";
import { SheetFrame } from "@/components/ui/SheetFrame";
import { ToneSync } from "@/components/ui/ToneSync";
import "../globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    metadataBase: new URL("https://qwq.my"),
    title: { default: dict.meta.title, template: `%s · qwq.my` },
    description: dict.meta.description,
    alternates: { languages: { zh: "/zh", en: "/en" } },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await getLocale();
  const dict = await getDictionary();

  return (
    <html
      lang={locale === "zh" ? "zh-CN" : "en"}
      data-tone="paper"
      suppressHydrationWarning
      className={`${archivo.variable} ${jetbrains.variable}`}
    >
      <body>
        <a href="#main" className="skip-link">
          {dict.controls.skip}
        </a>
        <SmoothScroll />
        <SceneLoader />
        <ToneSync />
        <SheetFrame locale={locale} dict={dict} author={profile.name[locale]} />
        {children}
        <CrosshairCursor />
      </body>
    </html>
  );
}
