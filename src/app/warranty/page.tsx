import type { Metadata } from "next";
import PageStub from "@/components/layout/PageStub";

export const metadata: Metadata = {
  title: "Гарантия и качество — HEISSKRAFT",
  description:
    "Подход HEISSKRAFT к производству, подбору материалов и гарантии на инженерные системы.",
};

export default function WarrantyPage() {
  return (
    <main>
      <PageStub
        title="Гарантия и качество"
        note="Здесь появятся стандарты производства, принципы подбора материалов и гарантийные условия HEISSKRAFT."
      />
    </main>
  );
}
