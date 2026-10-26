import { getCMSPageMetadata } from "@/content/cms-adapter";
import type { Metadata } from "next";
import DeferredBlock from "@/components/ui/DeferredBlock";
import { getCMSPage } from "@/content/cms-adapter";
import CmsBlocks from "@/cms/blocks/CmsBlocks";
import ParkBanner from "@/sections/home/ParkBanner";

const defaultMetadata: Metadata = {
  title: "HEISSKRAFT — трубы, насосное оборудование и арматура",
  description:
    "HEISSKRAFT — российский производитель полимерных труб, фитингов, насосного оборудования и арматуры.",
};

export async function generateMetadata(): Promise<Metadata> {
  return getCMSPageMetadata("/", defaultMetadata);
}

export default async function HomePage() {
  const page = await getCMSPage("/");
  if (page) return <main><CmsBlocks blocks={page.blocks} /></main>;
  return (
    <main>
      <ParkBanner />
      <DeferredBlock kind="hero" />
      <DeferredBlock kind="solutions" />
    </main>
  );
}
