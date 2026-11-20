import { getMetrikaSummary } from '@/cms/analytics/metrika';
import ui from '@/studio/components/ui.module.css';
import { numberFormat } from '@/studio/labels';
import css from './overview.module.css';

const duration = (seconds: number) => `${Math.floor(seconds / 60)} мин ${Math.round(seconds % 60)} с`;

export default async function Traffic() {
  const m = await getMetrikaSummary();
  if (m.status === 'unconfigured') return <p className={ui.muted}>Метрика не подключена: администратору нужно указать номер счётчика и токен чтения.</p>;
  if (m.status === 'unavailable') return <p className={ui.muted}>Метрика сейчас не отвечает. Попробуйте обновить страницу позже.</p>;
  const stats = [
    { label: 'Визиты', value: numberFormat.format(m.visits) },
    { label: 'Посетители', value: numberFormat.format(m.visitors) },
    { label: 'Просмотры', value: numberFormat.format(m.pageViews) },
    { label: 'Отказы', value: `${numberFormat.format(Math.round(m.bounceRate * 10) / 10)} %` },
    { label: 'Время на сайте', value: duration(m.averageVisitSeconds) },
  ];
  return (
    <dl className={css.stats}>
      {stats.map(s => (
        <div key={s.label} className={css.stat}>
          <dt>{s.label}</dt>
          <dd className="num">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export const trafficFallback = <p className={ui.muted}>Загружаю статистику…</p>;
