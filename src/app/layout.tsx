import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SmoothScroll from "@/components/layout/SmoothScroll";
import { HeaderThemeProvider } from "@/components/layout/HeaderTheme";
import "lenis/dist/lenis.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "HEISSKRAFT",
  description: "HEISSKRAFT",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru">
      <body>
        <HeaderThemeProvider defaultTheme="dark">
          <SmoothScroll />
          <Header />
          {children}
          <Footer />
        </HeaderThemeProvider>
      </body>
    </html>
  );
}
