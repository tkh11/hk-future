import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pump_curves" ADD COLUMN "workbook_filename" varchar;
  ALTER TABLE "pump_curves" ADD COLUMN "workbook_sheet" varchar;
  ALTER TABLE "pump_curves" ADD COLUMN "workbook_sha256" varchar;
  ALTER TABLE "_pump_curves_v" ADD COLUMN "version_workbook_filename" varchar;
  ALTER TABLE "_pump_curves_v" ADD COLUMN "version_workbook_sheet" varchar;
  ALTER TABLE "_pump_curves_v" ADD COLUMN "version_workbook_sha256" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pump_curves" DROP COLUMN "workbook_filename";
  ALTER TABLE "pump_curves" DROP COLUMN "workbook_sheet";
  ALTER TABLE "pump_curves" DROP COLUMN "workbook_sha256";
  ALTER TABLE "_pump_curves_v" DROP COLUMN "version_workbook_filename";
  ALTER TABLE "_pump_curves_v" DROP COLUMN "version_workbook_sheet";
  ALTER TABLE "_pump_curves_v" DROP COLUMN "version_workbook_sha256";`)
}
