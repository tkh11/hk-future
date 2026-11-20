import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Программы подбора — HEISSKRAFT' };

export default function EquipmentSelection() {
  return <main data-header-theme="light">
    <section className="page-stub">
      <div className="page-stub__inner">
        <h1 className="page-stub__title">Программы подбора</h1>
        <p className="page-stub__note">Подберите насос HEISSKRAFT по расходу, напору и типу системы.</p>
        <Link className="page-stub__cta" href="/selection/pumps">Программа подбора насосов <span aria-hidden="true">→</span></Link>
      </div>
    </section>
  </main>;
}
