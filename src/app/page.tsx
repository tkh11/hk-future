import type { Metadata } from "next";
import AboutIntro from "@/sections/home/AboutIntro";
import CategorySplit from "@/sections/home/CategorySplit";
import HomeHero from "@/sections/home/HomeHero";
import PipesBanner from "@/sections/home/PipesBanner";

export const metadata: Metadata = {
  title: "HEISSKRAFT — трубы, насосное оборудование и арматура",
  description:
    "HEISSKRAFT — российский производитель полимерных труб, фитингов, насосного оборудования и арматуры.",
};

export default function HomePage() {
  return (
    <main>
      <HomeHero />
      <AboutIntro />
      <PipesBanner />
      <CategorySplit />
    </main>
  );
}
