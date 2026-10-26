import CMSPageOverride from "@/components/cms/CMSPageOverride";
import type { Metadata } from "next";
import PageStub from "@/components/layout/PageStub";

export const metadata: Metadata = {
  title: "Проекты HEISSKRAFT",
  description:
    "Объекты и инженерные системы, реализованные на продукции HEISSKRAFT.",
};

function ProjectsPage() {
  return (
    <main>
      <PageStub
        title="Проекты HEISSKRAFT"
        note="Здесь появятся реализованные объекты и инженерные решения, собранные на продукции HEISSKRAFT."
      />
    </main>
  );
}

export default function CMSAwarePage() {
  return <CMSPageOverride path="/projects"><ProjectsPage /></CMSPageOverride>;
}
