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
    <html lang="ru">
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
