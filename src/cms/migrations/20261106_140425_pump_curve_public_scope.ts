import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

async function moveSelectionLink({ payload, req }: MigrateUpArgs | MigrateDownArgs, from: string, to: string) {
  const nav = await payload.findGlobal({ slug: 'navigation', depth: 0, req, overrideAccess: true })
  if (!nav.items?.some(item => item.label === 'Подбор оборудования' && item.href === from)) return
  const items = nav.items.map(item => item.label === 'Подбор оборудования' && item.href === from ? { ...item, href: to } : item)
  await payload.updateGlobal({ slug: 'navigation', data: { items }, req, overrideAccess: true })
}

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pump_curves" ADD COLUMN "hydraulics_only" boolean DEFAULT false;
  ALTER TABLE "_pump_curves_v" ADD COLUMN "version_hydraulics_only" boolean DEFAULT false;`)
  await moveSelectionLink({ db, payload, req }, '/catalog', '/selection')
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pump_curves" DROP COLUMN "hydraulics_only";
  ALTER TABLE "_pump_curves_v" DROP COLUMN "version_hydraulics_only";`)
  await moveSelectionLink({ db, payload, req }, '/selection', '/catalog')
}
