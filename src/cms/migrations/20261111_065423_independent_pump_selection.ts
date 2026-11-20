import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pump_selection_records_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pump_selection_records_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "pump_selection_perf" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"flow" numeric,
  	"efficiency" numeric,
  	"power_p2" numeric,
  	"npsh" numeric
  );
  
  CREATE TABLE "pump_selection_records_curve_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"flow" numeric,
  	"head" numeric
  );
  
  CREATE TABLE "pump_selection_records" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"sku" varchar,
  	"title" varchar,
  	"pump_selection_model_name" varchar,
  	"pump_selection_description" varchar,
  	"pump_selection_fluid" varchar,
  	"pump_selection_impeller_type" varchar,
  	"pump_selection_seal_type" varchar,
  	"pump_selection_wetted_material" varchar,
  	"pump_selection_impeller_material" varchar,
  	"pump_selection_shaft_material" varchar,
  	"pump_selection_seal_material" varchar,
  	"pump_selection_installation" varchar,
  	"pump_selection_motor_name" varchar,
  	"pump_selection_motor_code" varchar,
  	"pump_selection_motor_type" varchar,
  	"pump_selection_protection_class" varchar,
  	"pump_selection_insulation_class" varchar,
  	"pump_selection_source_notes" varchar,
  	"pump_selection_temperature_min_c" numeric,
  	"pump_selection_temperature_max_c" numeric,
  	"pump_selection_flow_min_m3h" numeric,
  	"pump_selection_flow_max_m3h" numeric,
  	"pump_selection_head_at_min_flow_m" numeric,
  	"pump_selection_head_at_max_flow_m" numeric,
  	"pump_selection_impeller_count" numeric,
  	"pump_selection_motor_poles" numeric,
  	"pump_selection_volume_m3" numeric,
  	"pump_selection_photo_id" integer,
  	"pump_selection_drawing_id" integer,
  	"pump_selection_source_pdf_id" integer,
  	"specs_power_kw" numeric,
  	"specs_voltage_v" numeric,
  	"specs_phases" numeric,
  	"specs_net_weight_kg" numeric,
  	"curve_speed_rpm" numeric,
  	"curve_frequency_hz" numeric,
  	"curve_nominal_current_a" numeric,
  	"curve_hydraulics_only" boolean,
  	"curve_source_document_id" integer,
  	"curve_source_page" numeric,
  	"curve_workbook_filename" varchar,
  	"curve_workbook_sheet" varchar,
  	"curve_workbook_sha256" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pump_selection_records_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_pump_selection_perf_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"flow" numeric,
  	"efficiency" numeric,
  	"power_p2" numeric,
  	"npsh" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pump_selection_records_v_version_curve_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"flow" numeric,
  	"head" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pump_selection_records_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_sku" varchar,
  	"version_title" varchar,
  	"version_pump_selection_model_name" varchar,
  	"version_pump_selection_description" varchar,
  	"version_pump_selection_fluid" varchar,
  	"version_pump_selection_impeller_type" varchar,
  	"version_pump_selection_seal_type" varchar,
  	"version_pump_selection_wetted_material" varchar,
  	"version_pump_selection_impeller_material" varchar,
  	"version_pump_selection_shaft_material" varchar,
  	"version_pump_selection_seal_material" varchar,
  	"version_pump_selection_installation" varchar,
  	"version_pump_selection_motor_name" varchar,
  	"version_pump_selection_motor_code" varchar,
  	"version_pump_selection_motor_type" varchar,
  	"version_pump_selection_protection_class" varchar,
  	"version_pump_selection_insulation_class" varchar,
  	"version_pump_selection_source_notes" varchar,
  	"version_pump_selection_temperature_min_c" numeric,
  	"version_pump_selection_temperature_max_c" numeric,
  	"version_pump_selection_flow_min_m3h" numeric,
  	"version_pump_selection_flow_max_m3h" numeric,
  	"version_pump_selection_head_at_min_flow_m" numeric,
  	"version_pump_selection_head_at_max_flow_m" numeric,
  	"version_pump_selection_impeller_count" numeric,
  	"version_pump_selection_motor_poles" numeric,
  	"version_pump_selection_volume_m3" numeric,
  	"version_pump_selection_photo_id" integer,
  	"version_pump_selection_drawing_id" integer,
  	"version_pump_selection_source_pdf_id" integer,
  	"version_specs_power_kw" numeric,
  	"version_specs_voltage_v" numeric,
  	"version_specs_phases" numeric,
  	"version_specs_net_weight_kg" numeric,
  	"version_curve_speed_rpm" numeric,
  	"version_curve_frequency_hz" numeric,
  	"version_curve_nominal_current_a" numeric,
  	"version_curve_hydraulics_only" boolean,
  	"version_curve_source_document_id" integer,
  	"version_curve_source_page" numeric,
  	"version_curve_workbook_filename" varchar,
  	"version_curve_workbook_sheet" varchar,
  	"version_curve_workbook_sha256" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pump_selection_records_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pump_selection_records_id" integer;
  ALTER TABLE "pump_selection_perf" ADD CONSTRAINT "pump_selection_perf_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pump_selection_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pump_selection_records_curve_points" ADD CONSTRAINT "pump_selection_records_curve_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pump_selection_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pump_selection_records" ADD CONSTRAINT "pump_selection_records_pump_selection_photo_id_media_id_fk" FOREIGN KEY ("pump_selection_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pump_selection_records" ADD CONSTRAINT "pump_selection_records_pump_selection_drawing_id_media_id_fk" FOREIGN KEY ("pump_selection_drawing_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pump_selection_records" ADD CONSTRAINT "pump_selection_records_pump_selection_source_pdf_id_media_id_fk" FOREIGN KEY ("pump_selection_source_pdf_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pump_selection_records" ADD CONSTRAINT "pump_selection_records_curve_source_document_id_catalog_documents_id_fk" FOREIGN KEY ("curve_source_document_id") REFERENCES "public"."catalog_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pump_selection_perf_v" ADD CONSTRAINT "_pump_selection_perf_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pump_selection_records_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pump_selection_records_v_version_curve_points" ADD CONSTRAINT "_pump_selection_records_v_version_curve_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pump_selection_records_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pump_selection_records_v" ADD CONSTRAINT "_pump_selection_records_v_parent_id_pump_selection_records_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pump_selection_records"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pump_selection_records_v" ADD CONSTRAINT "_pump_selection_records_v_version_pump_selection_photo_id_media_id_fk" FOREIGN KEY ("version_pump_selection_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pump_selection_records_v" ADD CONSTRAINT "_pump_selection_records_v_version_pump_selection_drawing_id_media_id_fk" FOREIGN KEY ("version_pump_selection_drawing_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pump_selection_records_v" ADD CONSTRAINT "_pump_selection_records_v_version_pump_selection_source_pdf_id_media_id_fk" FOREIGN KEY ("version_pump_selection_source_pdf_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pump_selection_records_v" ADD CONSTRAINT "_pump_selection_records_v_version_curve_source_document_id_catalog_documents_id_fk" FOREIGN KEY ("version_curve_source_document_id") REFERENCES "public"."catalog_documents"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pump_selection_perf_order_idx" ON "pump_selection_perf" USING btree ("_order");
  CREATE INDEX "pump_selection_perf_parent_id_idx" ON "pump_selection_perf" USING btree ("_parent_id");
  CREATE INDEX "pump_selection_records_curve_points_order_idx" ON "pump_selection_records_curve_points" USING btree ("_order");
  CREATE INDEX "pump_selection_records_curve_points_parent_id_idx" ON "pump_selection_records_curve_points" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pump_selection_records_sku_idx" ON "pump_selection_records" USING btree ("sku");
  CREATE INDEX "pump_selection_records_pump_selection_pump_selection_pho_idx" ON "pump_selection_records" USING btree ("pump_selection_photo_id");
  CREATE INDEX "pump_selection_records_pump_selection_pump_selection_dra_idx" ON "pump_selection_records" USING btree ("pump_selection_drawing_id");
  CREATE INDEX "pump_selection_records_pump_selection_pump_selection_sou_idx" ON "pump_selection_records" USING btree ("pump_selection_source_pdf_id");
  CREATE INDEX "pump_selection_records_curve_curve_source_document_idx" ON "pump_selection_records" USING btree ("curve_source_document_id");
  CREATE INDEX "pump_selection_records_updated_at_idx" ON "pump_selection_records" USING btree ("updated_at");
  CREATE INDEX "pump_selection_records_created_at_idx" ON "pump_selection_records" USING btree ("created_at");
  CREATE INDEX "pump_selection_records__status_idx" ON "pump_selection_records" USING btree ("_status");
  CREATE INDEX "_pump_selection_perf_v_order_idx" ON "_pump_selection_perf_v" USING btree ("_order");
  CREATE INDEX "_pump_selection_perf_v_parent_id_idx" ON "_pump_selection_perf_v" USING btree ("_parent_id");
  CREATE INDEX "_pump_selection_records_v_version_curve_points_order_idx" ON "_pump_selection_records_v_version_curve_points" USING btree ("_order");
  CREATE INDEX "_pump_selection_records_v_version_curve_points_parent_id_idx" ON "_pump_selection_records_v_version_curve_points" USING btree ("_parent_id");
  CREATE INDEX "_pump_selection_records_v_parent_idx" ON "_pump_selection_records_v" USING btree ("parent_id");
  CREATE INDEX "_pump_selection_records_v_version_version_sku_idx" ON "_pump_selection_records_v" USING btree ("version_sku");
  CREATE INDEX "_pump_selection_records_v_version_pump_selection_version_idx" ON "_pump_selection_records_v" USING btree ("version_pump_selection_photo_id");
  CREATE INDEX "_pump_selection_records_v_version_pump_selection_versi_1_idx" ON "_pump_selection_records_v" USING btree ("version_pump_selection_drawing_id");
  CREATE INDEX "_pump_selection_records_v_version_pump_selection_versi_2_idx" ON "_pump_selection_records_v" USING btree ("version_pump_selection_source_pdf_id");
  CREATE INDEX "_pump_selection_records_v_version_curve_version_curve_so_idx" ON "_pump_selection_records_v" USING btree ("version_curve_source_document_id");
  CREATE INDEX "_pump_selection_records_v_version_version_updated_at_idx" ON "_pump_selection_records_v" USING btree ("version_updated_at");
  CREATE INDEX "_pump_selection_records_v_version_version_created_at_idx" ON "_pump_selection_records_v" USING btree ("version_created_at");
  CREATE INDEX "_pump_selection_records_v_version_version__status_idx" ON "_pump_selection_records_v" USING btree ("version__status");
  CREATE INDEX "_pump_selection_records_v_created_at_idx" ON "_pump_selection_records_v" USING btree ("created_at");
  CREATE INDEX "_pump_selection_records_v_updated_at_idx" ON "_pump_selection_records_v" USING btree ("updated_at");
  CREATE INDEX "_pump_selection_records_v_latest_idx" ON "_pump_selection_records_v" USING btree ("latest");
  CREATE INDEX "_pump_selection_records_v_autosave_idx" ON "_pump_selection_records_v" USING btree ("autosave");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pump_selection_records_fk" FOREIGN KEY ("pump_selection_records_id") REFERENCES "public"."pump_selection_records"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_pump_selection_records_id_idx" ON "payload_locked_documents_rels" USING btree ("pump_selection_records_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pump_selection_perf" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pump_selection_records_curve_points" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pump_selection_records" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pump_selection_perf_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pump_selection_records_v_version_curve_points" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pump_selection_records_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pump_selection_records_fk";
  DROP INDEX "payload_locked_documents_rels_pump_selection_records_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pump_selection_records_id";
  DROP TABLE "pump_selection_perf" CASCADE;
  DROP TABLE "pump_selection_records_curve_points" CASCADE;
  DROP TABLE "pump_selection_records" CASCADE;
  DROP TABLE "_pump_selection_perf_v" CASCADE;
  DROP TABLE "_pump_selection_records_v_version_curve_points" CASCADE;
  DROP TABLE "_pump_selection_records_v" CASCADE;
  DROP TYPE "public"."enum_pump_selection_records_status";
  DROP TYPE "public"."enum__pump_selection_records_v_version_status";`)
}
