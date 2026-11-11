import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { profile } from "@/content/profile";
import { getDictionary, getLocale } from "@/lib/dictionaries";
import { locales } from "@/lib/i18n";
import { THEME_STORAGE_KEY } from "@/lib/tokens";
import { SmoothScroll } from "@/components/scroll/SmoothScroll";
import { CrosshairCursor } from "@/components/ui/CrosshairCursor";
import { SheetFrame } from "@/components/ui/SheetFrame";
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

const themeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="paper"||t==="blueprint")document.documentElement.dataset.theme=t}catch(e){}})()`;

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
      data-theme="paper"
      suppressHydrationWarning
      className={`${archivo.variable} ${jetbrains.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          {dict.controls.skip}
        </a>
        <SmoothScroll />
        <SheetFrame locale={locale} dict={dict} author={profile.name[locale]} />
        {children}
        <CrosshairCursor />
      </body>
    </html>
  );
}
