import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pump_curves_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pump_curves_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "pump_curves_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"flow" numeric,
  	"head" numeric
  );
  
  CREATE TABLE "pump_curves" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"model" varchar,
  	"speed_rpm" numeric,
  	"frequency_hz" numeric,
  	"nominal_current_a" numeric,
  	"source_document_id" integer,
  	"source_page" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pump_curves_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "pump_curves_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"product_variants_id" integer
  );
  
  CREATE TABLE "_pump_curves_v_version_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"flow" numeric,
  	"head" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pump_curves_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_model" varchar,
  	"version_speed_rpm" numeric,
  	"version_frequency_hz" numeric,
  	"version_nominal_current_a" numeric,
  	"version_source_document_id" integer,
  	"version_source_page" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pump_curves_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_pump_curves_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"product_variants_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pump_curves_id" integer;
  ALTER TABLE "pump_curves_points" ADD CONSTRAINT "pump_curves_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pump_curves"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pump_curves" ADD CONSTRAINT "pump_curves_source_document_id_catalog_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."catalog_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pump_curves_rels" ADD CONSTRAINT "pump_curves_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pump_curves"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pump_curves_rels" ADD CONSTRAINT "pump_curves_rels_product_variants_fk" FOREIGN KEY ("product_variants_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pump_curves_v_version_points" ADD CONSTRAINT "_pump_curves_v_version_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pump_curves_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pump_curves_v" ADD CONSTRAINT "_pump_curves_v_parent_id_pump_curves_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pump_curves"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pump_curves_v" ADD CONSTRAINT "_pump_curves_v_version_source_document_id_catalog_documents_id_fk" FOREIGN KEY ("version_source_document_id") REFERENCES "public"."catalog_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pump_curves_v_rels" ADD CONSTRAINT "_pump_curves_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pump_curves_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pump_curves_v_rels" ADD CONSTRAINT "_pump_curves_v_rels_product_variants_fk" FOREIGN KEY ("product_variants_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pump_curves_points_order_idx" ON "pump_curves_points" USING btree ("_order");
  CREATE INDEX "pump_curves_points_parent_id_idx" ON "pump_curves_points" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pump_curves_model_idx" ON "pump_curves" USING btree ("model");
  CREATE INDEX "pump_curves_source_document_idx" ON "pump_curves" USING btree ("source_document_id");
  CREATE INDEX "pump_curves_updated_at_idx" ON "pump_curves" USING btree ("updated_at");
  CREATE INDEX "pump_curves_created_at_idx" ON "pump_curves" USING btree ("created_at");
  CREATE INDEX "pump_curves__status_idx" ON "pump_curves" USING btree ("_status");
  CREATE INDEX "pump_curves_rels_order_idx" ON "pump_curves_rels" USING btree ("order");
  CREATE INDEX "pump_curves_rels_parent_idx" ON "pump_curves_rels" USING btree ("parent_id");
  CREATE INDEX "pump_curves_rels_path_idx" ON "pump_curves_rels" USING btree ("path");
  CREATE INDEX "pump_curves_rels_product_variants_id_idx" ON "pump_curves_rels" USING btree ("product_variants_id");
  CREATE INDEX "_pump_curves_v_version_points_order_idx" ON "_pump_curves_v_version_points" USING btree ("_order");
  CREATE INDEX "_pump_curves_v_version_points_parent_id_idx" ON "_pump_curves_v_version_points" USING btree ("_parent_id");
  CREATE INDEX "_pump_curves_v_parent_idx" ON "_pump_curves_v" USING btree ("parent_id");
  CREATE INDEX "_pump_curves_v_version_version_model_idx" ON "_pump_curves_v" USING btree ("version_model");
  CREATE INDEX "_pump_curves_v_version_version_source_document_idx" ON "_pump_curves_v" USING btree ("version_source_document_id");
  CREATE INDEX "_pump_curves_v_version_version_updated_at_idx" ON "_pump_curves_v" USING btree ("version_updated_at");
  CREATE INDEX "_pump_curves_v_version_version_created_at_idx" ON "_pump_curves_v" USING btree ("version_created_at");
  CREATE INDEX "_pump_curves_v_version_version__status_idx" ON "_pump_curves_v" USING btree ("version__status");
  CREATE INDEX "_pump_curves_v_created_at_idx" ON "_pump_curves_v" USING btree ("created_at");
  CREATE INDEX "_pump_curves_v_updated_at_idx" ON "_pump_curves_v" USING btree ("updated_at");
  CREATE INDEX "_pump_curves_v_latest_idx" ON "_pump_curves_v" USING btree ("latest");
  CREATE INDEX "_pump_curves_v_autosave_idx" ON "_pump_curves_v" USING btree ("autosave");
  CREATE INDEX "_pump_curves_v_rels_order_idx" ON "_pump_curves_v_rels" USING btree ("order");
  CREATE INDEX "_pump_curves_v_rels_parent_idx" ON "_pump_curves_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pump_curves_v_rels_path_idx" ON "_pump_curves_v_rels" USING btree ("path");
  CREATE INDEX "_pump_curves_v_rels_product_variants_id_idx" ON "_pump_curves_v_rels" USING btree ("product_variants_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pump_curves_fk" FOREIGN KEY ("pump_curves_id") REFERENCES "public"."pump_curves"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_pump_curves_id_idx" ON "payload_locked_documents_rels" USING btree ("pump_curves_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pump_curves_points" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pump_curves" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pump_curves_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pump_curves_v_version_points" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pump_curves_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pump_curves_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pump_curves_points" CASCADE;
  DROP TABLE "pump_curves" CASCADE;
  DROP TABLE "pump_curves_rels" CASCADE;
  DROP TABLE "_pump_curves_v_version_points" CASCADE;
  DROP TABLE "_pump_curves_v" CASCADE;
  DROP TABLE "_pump_curves_v_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pump_curves_fk";
  
  DROP INDEX "payload_locked_documents_rels_pump_curves_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pump_curves_id";
  DROP TYPE "public"."enum_pump_curves_status";
  DROP TYPE "public"."enum__pump_curves_v_version_status";`)
}
