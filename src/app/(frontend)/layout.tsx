import type { Metadata } from "next";
import { connection } from "next/server";
import { getPreviewUser } from "@/cms/preview";
import { cmsEnabled } from "@/cms/env";
import localFont from "next/font/local";
import { getNavigationContent, getSiteSettingsContent, getSiteSearchContent } from "@/content/cms-adapter";
import MetrikaTracker from "@/cms/analytics/MetrikaTracker";
import Header from "@/components/layout/Header";
import DeferredBlock from "@/components/ui/DeferredBlock";
import SmoothScroll from "@/components/layout/SmoothScroll";
import { HeaderThemeProvider } from "@/components/layout/HeaderTheme";
import "lenis/dist/lenis.css";
import "../globals.css";
import "../font-fallbacks.css";

const sfProDisplay = localFont({
  variable: "--font-sf-pro-display",
  // Display faces load on demand; preloading both families competes with media.
  preload: false,
  display: "swap",
  adjustFontFallback: "Arial",
  src: [
    { path: "../../../public/fonts/sf-pro/SFProDisplay-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../../public/fonts/sf-pro/SFProDisplay-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../../public/fonts/sf-pro/SFProDisplay-Semibold.woff2", weight: "600", style: "normal" },
    { path: "../../../public/fonts/sf-pro/SFProDisplay-Bold.woff2", weight: "700", style: "normal" },
  ],
});

const sfProText = localFont({
  variable: "--font-sf-pro-text",
  preload: true,
  display: "swap",
  // A single regular-weight fallback makes inline semibold text rewrap.
  // Keep the original regular metrics and use a measured semibold fallback.
  adjustFontFallback: false,
  fallback: ["HEISSKRAFT Text Fallback"],
  src: [
    { path: "../../../public/fonts/sf-pro/SFProText-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../../public/fonts/sf-pro/SFProText-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../../public/fonts/sf-pro/SFProText-Semibold.woff2", weight: "600", style: "normal" },
    { path: "../../../public/fonts/sf-pro/SFProText-Bold.woff2", weight: "700", style: "normal" },
  ],
});

export async function generateMetadata(): Promise<Metadata> {
  return getSiteSettingsContent();
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  if (cmsEnabled()) await connection();
  const [navigation, searchEntries] = await Promise.all([getNavigationContent(), getSiteSearchContent()]);
  const preview = cmsEnabled() ? await getPreviewUser() : null;
  return (
    <html lang="ru" className={`${sfProDisplay.variable} ${sfProText.variable}`}>
      <body>
        <HeaderThemeProvider defaultTheme="dark">
          <SmoothScroll />
          <MetrikaTracker enabled={process.env.METRIKA_ENABLED === "true" && !preview} counterId={process.env.METRIKA_COUNTER_ID} />
          <Header links={navigation} searchEntries={searchEntries} />
          {children}
          <DeferredBlock kind="footer" />
        </HeaderThemeProvider>
      </body>
    </html>
  );
}
