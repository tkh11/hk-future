import 'server-only';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter, Link } from '@payloadcms/ui';
import { redirect } from 'next/navigation';
import type { AdminViewServerProps } from 'payload';
import { canEdit } from '@/cms/access';
import CatalogImportPanel from './CatalogImportPanel';
import styles from './AdminDashboard.module.css';

/** A root custom view gets no template from Payload, so the shared shell is added here. */
export default function CatalogImportView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult;
  const { payload, user } = req;
  const adminPath = payload.config.routes.admin;
  if (!user) redirect(`${adminPath}/login?redirect=${encodeURIComponent(`${adminPath}/import`)}`);
  const allowed = canEdit(user) && !!permissions.collections?.['import-batches']?.read;
  return <DefaultTemplate i18n={req.i18n} locale={locale} params={params} payload={payload} permissions={permissions} req={req} searchParams={searchParams} user={user} visibleEntities={visibleEntities}>
    <Gutter className={styles.dashboard}>
      <header className={styles.heading}>
        <h1>Импорт каталога</h1>
        <p>Загрузите CSV или XLSX, проверьте изменения и подтвердите импорт. Новые товары создаются как черновики. Существующие значения сохраняются, пока вы явно не выберете поля для замены.</p>
      </header>
      {allowed ? <>
        <CatalogImportPanel standalone />
        <p className={styles.muted}><Link href={`${adminPath}/collections/import-batches`} prefetch={false}>История импорта</Link></p>
      </> : <p role="status">Импорт доступен редакторам каталога. Обратитесь к администратору, если нужен доступ.</p>}
    </Gutter>
  </DefaultTemplate>;
}
