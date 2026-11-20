import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DELETE FROM "pump_fluid_limits" WHERE "kind" = 'water';
  DELETE FROM "_pump_fluid_limits_v" WHERE "kind" = 'water';
  ALTER TABLE "pump_fluid_limits" ALTER COLUMN "kind" SET DATA TYPE text;
  DROP TYPE "public"."enum_pump_fluid_limits_kind";
  CREATE TYPE "public"."enum_pump_fluid_limits_kind" AS ENUM('ethyleneGlycol', 'propyleneGlycol');
  ALTER TABLE "pump_fluid_limits" ALTER COLUMN "kind" SET DATA TYPE "public"."enum_pump_fluid_limits_kind" USING "kind"::"public"."enum_pump_fluid_limits_kind";
  ALTER TABLE "_pump_fluid_limits_v" ALTER COLUMN "kind" SET DATA TYPE text;
  DROP TYPE "public"."enum__pump_fluid_limits_v_kind";
  CREATE TYPE "public"."enum__pump_fluid_limits_v_kind" AS ENUM('ethyleneGlycol', 'propyleneGlycol');
  ALTER TABLE "_pump_fluid_limits_v" ALTER COLUMN "kind" SET DATA TYPE "public"."enum__pump_fluid_limits_v_kind" USING "kind"::"public"."enum__pump_fluid_limits_v_kind";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TYPE "public"."enum_pump_fluid_limits_kind" ADD VALUE 'water' BEFORE 'ethyleneGlycol';
  ALTER TYPE "public"."enum__pump_fluid_limits_v_kind" ADD VALUE 'water' BEFORE 'ethyleneGlycol';`)
}
