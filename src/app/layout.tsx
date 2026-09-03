import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { HeaderThemeProvider } from "@/components/layout/HeaderTheme";
import "./globals.css";

export const metadata: Metadata = {
  title: "HEISSKRAFT",
  description: "HEISSKRAFT",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html:
              'html.preloader-done .site-preloader{display:none}.site-preloader{position:fixed;inset:0;z-index:100}.site-preloader__veil{position:absolute;inset:0;background:#f4f4f4}',
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var n=performance.getEntriesByType("navigation")[0];if(n&&n.type==="reload")sessionStorage.removeItem("hk-preloader-seen");else if(sessionStorage.getItem("hk-preloader-seen"))document.documentElement.classList.add("preloader-done")}catch(e){}`,
          }}
        />
      </head>
      <body>
        <HeaderThemeProvider defaultTheme="dark">
          <Header />
          {children}
          <Footer />
        </HeaderThemeProvider>
      </body>
    </html>
  );
}
