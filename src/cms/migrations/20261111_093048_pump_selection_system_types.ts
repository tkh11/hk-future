import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pump_selection_records_system_types" AS ENUM('heating', 'waterSupply', 'cooling', 'airConditioning');
  CREATE TYPE "public"."enum__pump_selection_records_v_version_system_types" AS ENUM('heating', 'waterSupply', 'cooling', 'airConditioning');
  CREATE TABLE "pump_selection_records_system_types" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_pump_selection_records_system_types",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_pump_selection_records_v_version_system_types" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__pump_selection_records_v_version_system_types",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "pump_selection_records_system_types" ADD CONSTRAINT "pump_selection_records_system_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pump_selection_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pump_selection_records_v_version_system_types" ADD CONSTRAINT "_pump_selection_records_v_version_system_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pump_selection_records_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pump_selection_records_system_types_order_idx" ON "pump_selection_records_system_types" USING btree ("order");
  CREATE INDEX "pump_selection_records_system_types_parent_idx" ON "pump_selection_records_system_types" USING btree ("parent_id");
  CREATE INDEX "_pump_selection_records_v_version_system_types_order_idx" ON "_pump_selection_records_v_version_system_types" USING btree ("order");
  CREATE INDEX "_pump_selection_records_v_version_system_types_parent_idx" ON "_pump_selection_records_v_version_system_types" USING btree ("parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pump_selection_records_system_types" CASCADE;
  DROP TABLE "_pump_selection_records_v_version_system_types" CASCADE;
  DROP TYPE "public"."enum_pump_selection_records_system_types";
  DROP TYPE "public"."enum__pump_selection_records_v_version_system_types";`)
}
