import type { Metadata } from "next";
import DeferredBlock from "@/components/ui/DeferredBlock";
import FireHero from "@/sections/fire-suppression/FireHero";

export const metadata: Metadata = {
  title: "Системы пожаротушения — HEISSKRAFT",
  description: "Трубопроводные системы FireOff и станции пожаротушения HK-Boost FPA/FPV. Интерактивная модель соединений и решения HEISSKRAFT для вашего проекта.",
};

export default function FireSuppressionPage() {
  return <main>
    <FireHero />
    <DeferredBlock kind="fire-intro" />
    <DeferredBlock kind="fire-system" />
    <DeferredBlock kind="fire-products" />
  </main>;
}
