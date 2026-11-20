import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pump_fluid_limits_kind" AS ENUM('water', 'ethyleneGlycol', 'propyleneGlycol');
  CREATE TYPE "public"."enum__pump_fluid_limits_v_kind" AS ENUM('water', 'ethyleneGlycol', 'propyleneGlycol');
  CREATE TABLE "pump_fluid_limits" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_pump_fluid_limits_kind",
  	"temperature_min_c" numeric,
  	"temperature_max_c" numeric,
  	"concentration_min_pct" numeric,
  	"concentration_max_pct" numeric
  );
  
  CREATE TABLE "_pump_fluid_limits_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum__pump_fluid_limits_v_kind",
  	"temperature_min_c" numeric,
  	"temperature_max_c" numeric,
  	"concentration_min_pct" numeric,
  	"concentration_max_pct" numeric,
  	"_uuid" varchar
  );
  
  ALTER TABLE "pump_selection_records" ADD COLUMN "pump_selection_allow_viscosity_correction" boolean DEFAULT false;
  ALTER TABLE "_pump_selection_records_v" ADD COLUMN "version_pump_selection_allow_viscosity_correction" boolean DEFAULT false;
  ALTER TABLE "pump_fluid_limits" ADD CONSTRAINT "pump_fluid_limits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pump_selection_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pump_fluid_limits_v" ADD CONSTRAINT "_pump_fluid_limits_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pump_selection_records_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pump_fluid_limits_order_idx" ON "pump_fluid_limits" USING btree ("_order");
  CREATE INDEX "pump_fluid_limits_parent_id_idx" ON "pump_fluid_limits" USING btree ("_parent_id");
  CREATE INDEX "_pump_fluid_limits_v_order_idx" ON "_pump_fluid_limits_v" USING btree ("_order");
  CREATE INDEX "_pump_fluid_limits_v_parent_id_idx" ON "_pump_fluid_limits_v" USING btree ("_parent_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pump_fluid_limits" CASCADE;
  DROP TABLE "_pump_fluid_limits_v" CASCADE;
  ALTER TABLE "pump_selection_records" DROP COLUMN "pump_selection_allow_viscosity_correction";
  ALTER TABLE "_pump_selection_records_v" DROP COLUMN "version_pump_selection_allow_viscosity_correction";
  DROP TYPE "public"."enum_pump_fluid_limits_kind";
  DROP TYPE "public"."enum__pump_fluid_limits_v_kind";`)
}
