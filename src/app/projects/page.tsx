import type { Metadata } from "next";
import PageStub from "@/components/layout/PageStub";

export const metadata: Metadata = {
  title: "Проекты HEISSKRAFT",
  description:
    "Объекты и инженерные системы, реализованные на продукции HEISSKRAFT.",
};

export default function ProjectsPage() {
  return (
    <main>
      <PageStub
        title="Проекты HEISSKRAFT"
        note="Здесь появятся реализованные объекты и инженерные решения, собранные на продукции HEISSKRAFT."
      />
    </main>
  );
}
