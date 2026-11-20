import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pump_selection_groups" ADD COLUMN "shared_characteristics" jsonb;
  ALTER TABLE "pump_selection_groups" ADD COLUMN "shared_characteristics_draft" jsonb;
  ALTER TABLE "pump_selection_records" ADD COLUMN "characteristic_overrides" jsonb;
  ALTER TABLE "_pump_selection_records_v" ADD COLUMN "version_characteristic_overrides" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pump_selection_groups" DROP COLUMN "shared_characteristics";
  ALTER TABLE "pump_selection_groups" DROP COLUMN "shared_characteristics_draft";
  ALTER TABLE "pump_selection_records" DROP COLUMN "characteristic_overrides";
  ALTER TABLE "_pump_selection_records_v" DROP COLUMN "version_characteristic_overrides";`)
}
