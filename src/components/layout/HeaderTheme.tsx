"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { HeaderTheme } from "@/types/header";

type HeaderThemeContextValue = {
  theme: HeaderTheme;
  setTheme: (theme: HeaderTheme) => void;
};

const HeaderThemeContext = createContext<HeaderThemeContextValue | null>(null);

export function HeaderThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: ReactNode;
  defaultTheme?: HeaderTheme;
}) {
  const [theme, setTheme] = useState<HeaderTheme>(defaultTheme);
  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("[data-header-theme]");

    if (sections.length === 0) {
      return;
    }

    const ratios = new Map<Element, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
        }

        let nextTheme: HeaderTheme | null = null;
        let bestRatio = -1;

        for (const section of sections) {
          const ratio = ratios.get(section) ?? 0;
          const sectionTheme = section.getAttribute("data-header-theme");

          if (
            ratio > bestRatio &&
            (sectionTheme === "light" || sectionTheme === "dark")
          ) {
            bestRatio = ratio;
            nextTheme = sectionTheme;
          }
        }

        if (nextTheme) {
          setTheme(nextTheme);
        }
      },
      {
        root: null,
        rootMargin: "-8% 0px -72% 0px",
        threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  return (
    <HeaderThemeContext.Provider value={value}>
      {children}
    </HeaderThemeContext.Provider>
  );
}

export function useHeaderTheme() {
  const context = useContext(HeaderThemeContext);

  if (!context) {
    throw new Error("useHeaderTheme must be used within HeaderThemeProvider");
  }

  return context;
}

export function HeaderThemeMarker({ theme }: { theme: HeaderTheme }) {
  const { setTheme } = useHeaderTheme();

  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  return null;
}
