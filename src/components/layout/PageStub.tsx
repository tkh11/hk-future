import Link from "next/link";

export default function PageStub({
  title,
  note,
}: {
  title: string;
  note: string;
}) {
  return (
    <section data-header-theme="light" className="page-stub">
      <div className="page-stub__inner">
        <p className="page-stub__eyebrow">Раздел в разработке</p>
        <h1 className="page-stub__title">{title}</h1>
        <p className="page-stub__note">{note}</p>
        <Link href="/#project-form" className="page-stub__cta">
          Оставить заявку
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
