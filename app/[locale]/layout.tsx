import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { profile } from "@/content/profile";
import { getDictionary, getLocale } from "@/lib/dictionaries";
import { locales } from "@/lib/i18n";
import { SmoothScroll } from "@/components/scroll/SmoothScroll";
import { SceneLoader } from "@/components/three/SceneLoader";
import { GameHUD } from "@/components/game/GameHUD";
import { Terminal } from "@/components/terminal/Terminal";
import { BootScreen } from "@/components/ui/BootScreen";
import { CrashOverlay } from "@/components/ui/CrashOverlay";
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
        <SceneLoader titles={dict.sheets} />
        <ToneSync />
        <SheetFrame locale={locale} dict={dict} author={profile.name[locale]} />
        {children}
        <Terminal locale={locale} />
        <GameHUD labels={dict.game} />
        <CrashOverlay />
        <BootScreen />
        <CrosshairCursor />
      </body>
    </html>
  );
}
