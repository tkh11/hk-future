import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pump_selection_records" DROP COLUMN "pump_selection_allow_viscosity_correction";
  ALTER TABLE "_pump_selection_records_v" DROP COLUMN "version_pump_selection_allow_viscosity_correction";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pump_selection_records" ADD COLUMN "pump_selection_allow_viscosity_correction" boolean DEFAULT false;
  ALTER TABLE "_pump_selection_records_v" ADD COLUMN "version_pump_selection_allow_viscosity_correction" boolean DEFAULT false;`)
}
