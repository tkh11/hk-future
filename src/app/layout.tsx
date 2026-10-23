import type { Metadata } from "next";
import localFont from "next/font/local";
import Header from "@/components/layout/Header";
import DeferredBlock from "@/components/ui/DeferredBlock";
import SmoothScroll from "@/components/layout/SmoothScroll";
import { HeaderThemeProvider } from "@/components/layout/HeaderTheme";
import "lenis/dist/lenis.css";
import "./globals.css";
import "./font-fallbacks.css";

const sfProDisplay = localFont({
  variable: "--font-sf-pro-display",
  // Display faces load on demand; preloading both families competes with media.
  preload: false,
  display: "swap",
  adjustFontFallback: "Arial",
  src: [
    { path: "../../public/fonts/sf-pro/SFProDisplay-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/sf-pro/SFProDisplay-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/sf-pro/SFProDisplay-Semibold.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/sf-pro/SFProDisplay-Bold.woff2", weight: "700", style: "normal" },
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
    { path: "../../public/fonts/sf-pro/SFProText-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/sf-pro/SFProText-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/sf-pro/SFProText-Semibold.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/sf-pro/SFProText-Bold.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "HEISSKRAFT",
  description: "HEISSKRAFT",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${sfProDisplay.variable} ${sfProText.variable}`}>
      <body>
        <HeaderThemeProvider defaultTheme="dark">
          <SmoothScroll />
          <Header />
          {children}
          <DeferredBlock kind="footer" />
        </HeaderThemeProvider>
      </body>
    </html>
  );
}
