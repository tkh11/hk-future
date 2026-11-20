import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pump_selection_records" ADD COLUMN "pump_selection_max_operating_pressure" varchar;
  ALTER TABLE "pump_selection_records" ADD COLUMN "pump_selection_inlet_connection" varchar;
  ALTER TABLE "pump_selection_records" ADD COLUMN "pump_selection_outlet_connection" varchar;
  ALTER TABLE "_pump_selection_records_v" ADD COLUMN "version_pump_selection_max_operating_pressure" varchar;
  ALTER TABLE "_pump_selection_records_v" ADD COLUMN "version_pump_selection_inlet_connection" varchar;
  ALTER TABLE "_pump_selection_records_v" ADD COLUMN "version_pump_selection_outlet_connection" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pump_selection_records" DROP COLUMN "pump_selection_max_operating_pressure";
  ALTER TABLE "pump_selection_records" DROP COLUMN "pump_selection_inlet_connection";
  ALTER TABLE "pump_selection_records" DROP COLUMN "pump_selection_outlet_connection";
  ALTER TABLE "_pump_selection_records_v" DROP COLUMN "version_pump_selection_max_operating_pressure";
  ALTER TABLE "_pump_selection_records_v" DROP COLUMN "version_pump_selection_inlet_connection";
  ALTER TABLE "_pump_selection_records_v" DROP COLUMN "version_pump_selection_outlet_connection";`)
}
