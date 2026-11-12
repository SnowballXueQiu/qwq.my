import type { Metadata } from "next";
import { Suspense } from "react";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { profile } from "@/content/profile";
import { getDictionary, getLocale } from "@/lib/dictionaries";
import { locales } from "@/lib/i18n";
import { listPosts } from "@/lib/posts";
import { SmoothScroll } from "@/components/scroll/SmoothScroll";
import { SceneLoader } from "@/components/three/SceneLoader";
import { Hud } from "@/components/hud/Hud";
import { SoundBridge } from "@/components/sound/SoundBridge";
import { MvTimeline } from "@/components/hud/MvTimeline";
import { existsSync } from "node:fs";
import path from "node:path";
import { GameHUD } from "@/components/game/GameHUD";
import { YearInReviewModal } from "@/components/video/YearInReviewModal";
import { Terminal } from "@/components/terminal/Terminal";
import { BootScreen } from "@/components/ui/BootScreen";
import { CrashOverlay } from "@/components/ui/CrashOverlay";
import { CrosshairCursor } from "@/components/ui/CrosshairCursor";
import { SheetFrame } from "@/components/ui/SheetFrame";
import { RouteSync } from "@/components/ui/RouteSync";
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
    alternates: {
      languages: { zh: "/zh", en: "/en" },
      types: { "application/rss+xml": `/${await getLocale()}/feed.xml` },
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await getLocale();
  const dict = await getDictionary();
  const posts = await listPosts(locale);
  const videoFile = `/video/year-in-review-2026${locale === "en" ? "-en" : ""}.mp4`;
  const videoUrl = existsSync(path.join(process.cwd(), "public", videoFile)) ? videoFile : null;

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
        <SoundBridge />
        <SceneLoader titles={dict.sheets} postCount={posts.length} />
        <ToneSync />
        <Suspense fallback={null}>
          <RouteSync />
        </Suspense>
        <Hud toyHint={dict.hero.toys} />
        <SheetFrame locale={locale} dict={dict} author={profile.name[locale]} />
        <MvTimeline titles={dict.sheets} />
        {children}
        <Terminal locale={locale} posts={posts} />
        <GameHUD labels={dict.game} />
        <YearInReviewModal locale={locale} videoUrl={videoUrl} labels={dict.video} />
        <CrashOverlay />
        <BootScreen />
        <CrosshairCursor />
      </body>
    </html>
  );
}
