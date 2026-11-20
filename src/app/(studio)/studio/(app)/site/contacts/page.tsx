import type { Metadata } from 'next';
import GlobalForm from '@/studio/components/GlobalForm';
import ui from '@/studio/components/ui.module.css';
import { requireEditor } from '@/studio/session';

export const metadata: Metadata = { title: 'Контакты' };

const fields = [
  { path: 'phone', label: 'Телефон' }, { path: 'phoneHref', label: 'Ссылка для звонка' },
  { path: 'email', label: 'E-mail офиса' }, { path: 'serviceEmail', label: 'E-mail сервисного центра' },
  { path: 'serviceExtensions', label: 'Добавочные сервисного центра' },
  { path: 'address', label: 'Адрес', multiline: true }, { path: 'hours', label: 'Часы работы' },
  { path: 'region', label: 'Индекс и регион' }, { path: 'locality', label: 'Населённый пункт' },
  { path: 'street', label: 'Улица и здание' }, { path: 'mapEmbed', label: 'Яндекс Карта' },
];

export default async function ContactsPage() {
  const s = await requireEditor();
  const doc = await s.payload.findGlobal({ slug: 'contacts', overrideAccess: false, user: s.user, depth: 0 });
  const content = (doc.content ?? {}) as unknown as Record<string, string>;
  const values = Object.fromEntries(fields.map(f => [f.path, content[f.path] ?? '']));
  return (
    <>
      <div className={ui.header}><h1>Контакты</h1></div>
      <GlobalForm slug="contacts" fields={fields} values={values} />
    </>
  );
}
