import type { Metadata } from "next";
import "../styles.css";
import "./globals.css";
import { PersistentSiteHeader } from "./components/PersistentSiteHeader";
import { getSiteContent } from "@/lib/site-content";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    title: content.site.title,
    description: content.site.description,
    icons: content.site.faviconUrl ? [{ rel: "icon", url: content.site.faviconUrl }] : undefined,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>
        <PersistentSiteHeader />
        {children}
      </body>
    </html>
  );
}
