import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pump_selection_records" ADD COLUMN "specs_voltage_delta_v" varchar;
    ALTER TABLE "pump_selection_records" ADD COLUMN "specs_voltage_star_v" varchar;
    ALTER TABLE "_pump_selection_records_v" ADD COLUMN "version_specs_voltage_delta_v" varchar;
    ALTER TABLE "_pump_selection_records_v" ADD COLUMN "version_specs_voltage_star_v" varchar;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pump_selection_records" DROP COLUMN "specs_voltage_delta_v";
    ALTER TABLE "pump_selection_records" DROP COLUMN "specs_voltage_star_v";
    ALTER TABLE "_pump_selection_records_v" DROP COLUMN "version_specs_voltage_delta_v";
    ALTER TABLE "_pump_selection_records_v" DROP COLUMN "version_specs_voltage_star_v";
  `);
}
