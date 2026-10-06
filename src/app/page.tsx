import type { Metadata } from "next";
import DeferredBlock from "@/components/ui/DeferredBlock";
import ParkBanner from "@/sections/home/ParkBanner";

export const metadata: Metadata = {
  title: "HEISSKRAFT — трубы, насосное оборудование и арматура",
  description:
    "HEISSKRAFT — российский производитель полимерных труб, фитингов, насосного оборудования и арматуры.",
};

export default function HomePage() {
  return (
    <main>
      <ParkBanner />
      <DeferredBlock kind="hero" />
      <DeferredBlock kind="solutions" />
    </main>
  );
}
