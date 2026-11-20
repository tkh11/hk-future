import { getCMSPageMetadata } from "@/content/cms-adapter";
import CMSPageOverride from "@/components/cms/CMSPageOverride";
import type { Metadata } from "next";
import DeferredBlock from "@/components/ui/DeferredBlock";
import FireHero from "@/sections/fire-suppression/FireHero";

const defaultMetadata: Metadata = {
  title: "Системы пожаротушения — HEISSKRAFT",
  description: "Трубопроводные системы FireOff и станции пожаротушения HK-Boost FPA/FPV. Интерактивная модель соединений и решения HEISSKRAFT для вашего проекта.",
};

export async function generateMetadata(): Promise<Metadata> {
  return getCMSPageMetadata("/solutions/fire-suppression", defaultMetadata);
}

function FireSuppressionPage() {
  return <main>
    <FireHero />
    <DeferredBlock kind="fire-intro" />
    <DeferredBlock kind="fire-system" />
    <DeferredBlock kind="fire-products" />
  </main>;
}

export default function CMSAwarePage() {
  return <CMSPageOverride path="/solutions/fire-suppression"><FireSuppressionPage /></CMSPageOverride>;
}
