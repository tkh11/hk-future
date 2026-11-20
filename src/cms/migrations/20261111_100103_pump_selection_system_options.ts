import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_pump_selection_records_system_types" ADD VALUE 'sewerage';
  ALTER TYPE "public"."enum_pump_selection_records_system_types" ADD VALUE 'drainage';
  ALTER TYPE "public"."enum_pump_selection_records_system_types" ADD VALUE 'wellWaterSupply';
  ALTER TYPE "public"."enum__pump_selection_records_v_version_system_types" ADD VALUE 'sewerage';
  ALTER TYPE "public"."enum__pump_selection_records_v_version_system_types" ADD VALUE 'drainage';
  ALTER TYPE "public"."enum__pump_selection_records_v_version_system_types" ADD VALUE 'wellWaterSupply';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pump_selection_records_system_types" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_pump_selection_records_system_types";
  CREATE TYPE "public"."enum_pump_selection_records_system_types" AS ENUM('heating', 'waterSupply', 'cooling', 'airConditioning');
  ALTER TABLE "pump_selection_records_system_types" ALTER COLUMN "value" SET DATA TYPE "public"."enum_pump_selection_records_system_types" USING "value"::"public"."enum_pump_selection_records_system_types";
  ALTER TABLE "_pump_selection_records_v_version_system_types" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum__pump_selection_records_v_version_system_types";
  CREATE TYPE "public"."enum__pump_selection_records_v_version_system_types" AS ENUM('heating', 'waterSupply', 'cooling', 'airConditioning');
  ALTER TABLE "_pump_selection_records_v_version_system_types" ALTER COLUMN "value" SET DATA TYPE "public"."enum__pump_selection_records_v_version_system_types" USING "value"::"public"."enum__pump_selection_records_v_version_system_types";`)
}
