import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "pump_perf" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"flow" numeric,
  	"efficiency" numeric,
  	"power_p2" numeric,
  	"npsh" numeric
  );
  
  CREATE TABLE "_pump_perf_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"flow" numeric,
  	"efficiency" numeric,
  	"power_p2" numeric,
  	"npsh" numeric,
  	"_uuid" varchar
  );
  
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_model_name" varchar;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_description" varchar;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_fluid" varchar;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_impeller_type" varchar;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_seal_type" varchar;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_wetted_material" varchar;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_impeller_material" varchar;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_shaft_material" varchar;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_seal_material" varchar;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_installation" varchar;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_motor_name" varchar;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_motor_code" varchar;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_motor_type" varchar;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_protection_class" varchar;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_insulation_class" varchar;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_source_notes" varchar;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_temperature_min_c" numeric;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_temperature_max_c" numeric;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_flow_min_m3h" numeric;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_flow_max_m3h" numeric;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_head_at_min_flow_m" numeric;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_head_at_max_flow_m" numeric;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_impeller_count" numeric;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_motor_poles" numeric;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_volume_m3" numeric;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_photo_id" integer;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_drawing_id" integer;
  ALTER TABLE "product_variants" ADD COLUMN "pump_selection_source_pdf_id" integer;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_model_name" varchar;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_description" varchar;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_fluid" varchar;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_impeller_type" varchar;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_seal_type" varchar;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_wetted_material" varchar;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_impeller_material" varchar;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_shaft_material" varchar;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_seal_material" varchar;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_installation" varchar;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_motor_name" varchar;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_motor_code" varchar;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_motor_type" varchar;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_protection_class" varchar;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_insulation_class" varchar;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_source_notes" varchar;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_temperature_min_c" numeric;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_temperature_max_c" numeric;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_flow_min_m3h" numeric;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_flow_max_m3h" numeric;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_head_at_min_flow_m" numeric;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_head_at_max_flow_m" numeric;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_impeller_count" numeric;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_motor_poles" numeric;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_volume_m3" numeric;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_photo_id" integer;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_drawing_id" integer;
  ALTER TABLE "_product_variants_v" ADD COLUMN "version_pump_selection_source_pdf_id" integer;
  ALTER TABLE "pump_perf" ADD CONSTRAINT "pump_perf_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pump_perf_v" ADD CONSTRAINT "_pump_perf_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_product_variants_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pump_perf_order_idx" ON "pump_perf" USING btree ("_order");
  CREATE INDEX "pump_perf_parent_id_idx" ON "pump_perf" USING btree ("_parent_id");
  CREATE INDEX "_pump_perf_v_order_idx" ON "_pump_perf_v" USING btree ("_order");
  CREATE INDEX "_pump_perf_v_parent_id_idx" ON "_pump_perf_v" USING btree ("_parent_id");
  ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_pump_selection_photo_id_media_id_fk" FOREIGN KEY ("pump_selection_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_pump_selection_drawing_id_media_id_fk" FOREIGN KEY ("pump_selection_drawing_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_pump_selection_source_pdf_id_media_id_fk" FOREIGN KEY ("pump_selection_source_pdf_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_product_variants_v" ADD CONSTRAINT "_product_variants_v_version_pump_selection_photo_id_media_id_fk" FOREIGN KEY ("version_pump_selection_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_product_variants_v" ADD CONSTRAINT "_product_variants_v_version_pump_selection_drawing_id_media_id_fk" FOREIGN KEY ("version_pump_selection_drawing_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_product_variants_v" ADD CONSTRAINT "_product_variants_v_version_pump_selection_source_pdf_id_media_id_fk" FOREIGN KEY ("version_pump_selection_source_pdf_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "product_variants_pump_selection_pump_selection_photo_idx" ON "product_variants" USING btree ("pump_selection_photo_id");
  CREATE INDEX "product_variants_pump_selection_pump_selection_drawing_idx" ON "product_variants" USING btree ("pump_selection_drawing_id");
  CREATE INDEX "product_variants_pump_selection_pump_selection_source_pd_idx" ON "product_variants" USING btree ("pump_selection_source_pdf_id");
  CREATE INDEX "_product_variants_v_version_pump_selection_version_pump__idx" ON "_product_variants_v" USING btree ("version_pump_selection_photo_id");
  CREATE INDEX "_product_variants_v_version_pump_selection_version_pum_1_idx" ON "_product_variants_v" USING btree ("version_pump_selection_drawing_id");
  CREATE INDEX "_product_variants_v_version_pump_selection_version_pum_2_idx" ON "_product_variants_v" USING btree ("version_pump_selection_source_pdf_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pump_perf" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pump_perf_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pump_perf" CASCADE;
  DROP TABLE "_pump_perf_v" CASCADE;
  ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_pump_selection_photo_id_media_id_fk";
  
  ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_pump_selection_drawing_id_media_id_fk";
  
  ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_pump_selection_source_pdf_id_media_id_fk";
  
  ALTER TABLE "_product_variants_v" DROP CONSTRAINT "_product_variants_v_version_pump_selection_photo_id_media_id_fk";
  
  ALTER TABLE "_product_variants_v" DROP CONSTRAINT "_product_variants_v_version_pump_selection_drawing_id_media_id_fk";
  
  ALTER TABLE "_product_variants_v" DROP CONSTRAINT "_product_variants_v_version_pump_selection_source_pdf_id_media_id_fk";
  
  DROP INDEX "product_variants_pump_selection_pump_selection_photo_idx";
  DROP INDEX "product_variants_pump_selection_pump_selection_drawing_idx";
  DROP INDEX "product_variants_pump_selection_pump_selection_source_pd_idx";
  DROP INDEX "_product_variants_v_version_pump_selection_version_pump__idx";
  DROP INDEX "_product_variants_v_version_pump_selection_version_pum_1_idx";
  DROP INDEX "_product_variants_v_version_pump_selection_version_pum_2_idx";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_model_name";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_description";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_fluid";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_impeller_type";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_seal_type";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_wetted_material";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_impeller_material";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_shaft_material";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_seal_material";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_installation";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_motor_name";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_motor_code";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_motor_type";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_protection_class";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_insulation_class";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_source_notes";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_temperature_min_c";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_temperature_max_c";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_flow_min_m3h";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_flow_max_m3h";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_head_at_min_flow_m";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_head_at_max_flow_m";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_impeller_count";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_motor_poles";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_volume_m3";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_photo_id";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_drawing_id";
  ALTER TABLE "product_variants" DROP COLUMN "pump_selection_source_pdf_id";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_model_name";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_description";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_fluid";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_impeller_type";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_seal_type";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_wetted_material";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_impeller_material";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_shaft_material";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_seal_material";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_installation";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_motor_name";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_motor_code";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_motor_type";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_protection_class";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_insulation_class";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_source_notes";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_temperature_min_c";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_temperature_max_c";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_flow_min_m3h";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_flow_max_m3h";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_head_at_min_flow_m";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_head_at_max_flow_m";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_impeller_count";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_motor_poles";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_volume_m3";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_photo_id";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_drawing_id";
  ALTER TABLE "_product_variants_v" DROP COLUMN "version_pump_selection_source_pdf_id";`)
}
