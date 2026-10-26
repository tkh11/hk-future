import CMSPageOverride from "@/components/cms/CMSPageOverride";
import type { Metadata } from "next";
import PageStub from "@/components/layout/PageStub";

export const metadata: Metadata = {
  title: "Гарантия и качество — HEISSKRAFT",
  description:
    "Подход HEISSKRAFT к производству, подбору материалов и гарантии на инженерные системы.",
};

function WarrantyPage() {
  return (
    <main>
      <PageStub
        title="Гарантия и качество"
        note="Здесь появятся стандарты производства, принципы подбора материалов и гарантийные условия HEISSKRAFT."
      />
    </main>
  );
}

export default function CMSAwarePage() {
  return <CMSPageOverride path="/warranty"><WarrantyPage /></CMSPageOverride>;
}
