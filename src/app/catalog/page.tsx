import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Каталог — HEISSKRAFT",
  description:
    "Каталог HEISSKRAFT: трубопроводные системы, насосное оборудование и арматура. Раздел в разработке.",
};

export default function CatalogPage() {
  return (
    <main>
      <section data-header-theme="light" className="page-stub">
        <div className="page-stub__inner">
          <h1 className="page-stub__title">Каталог</h1>
          <p className="page-stub__note">Раздел в разработке</p>
        </div>
      </section>
    </main>
  );
}
