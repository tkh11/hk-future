import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_gallery_role" AS ENUM('main', 'preview', 'gallery', 'technical');
  CREATE TYPE "public"."enum_products_product_kind" AS ENUM('single', 'family', 'request');
  CREATE TYPE "public"."enum_products_profile" AS ENUM('pipe', 'fitting', 'valve', 'manifold', 'mounting', 'pump', 'station', 'motor', 'tank', 'automation', 'cable', 'tool', 'compensator', 'mixer', 'accessory');
  CREATE TYPE "public"."enum_products_review_state" AS ENUM('ready', 'review', 'blocked');
  CREATE TYPE "public"."enum__products_v_version_gallery_role" AS ENUM('main', 'preview', 'gallery', 'technical');
  CREATE TYPE "public"."enum__products_v_version_product_kind" AS ENUM('single', 'family', 'request');
  CREATE TYPE "public"."enum__products_v_version_profile" AS ENUM('pipe', 'fitting', 'valve', 'manifold', 'mounting', 'pump', 'station', 'motor', 'tank', 'automation', 'cable', 'tool', 'compensator', 'mixer', 'accessory');
  CREATE TYPE "public"."enum__products_v_version_review_state" AS ENUM('ready', 'review', 'blocked');
  CREATE TYPE "public"."enum_product_variants_gallery_role" AS ENUM('main', 'preview', 'gallery', 'technical');
  CREATE TYPE "public"."enum_product_variants_profile" AS ENUM('pipe', 'fitting', 'valve', 'manifold', 'mounting', 'pump', 'station', 'motor', 'tank', 'automation', 'cable', 'tool', 'compensator', 'mixer', 'accessory');
  CREATE TYPE "public"."enum_product_variants_color" AS ENUM('green', 'purple', 'black', 'red', 'blue', 'azure');
  CREATE TYPE "public"."enum_product_variants_review_state" AS ENUM('ready', 'review', 'blocked');
  CREATE TYPE "public"."enum_product_variants_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__product_variants_v_version_gallery_role" AS ENUM('main', 'preview', 'gallery', 'technical');
  CREATE TYPE "public"."enum__product_variants_v_version_profile" AS ENUM('pipe', 'fitting', 'valve', 'manifold', 'mounting', 'pump', 'station', 'motor', 'tank', 'automation', 'cable', 'tool', 'compensator', 'mixer', 'accessory');
  CREATE TYPE "public"."enum__product_variants_v_version_color" AS ENUM('green', 'purple', 'black', 'red', 'blue', 'azure');
  CREATE TYPE "public"."enum__product_variants_v_version_review_state" AS ENUM('ready', 'review', 'blocked');
  CREATE TYPE "public"."enum__product_variants_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_catalog_documents_review_state" AS ENUM('ready', 'review', 'blocked');
  CREATE TYPE "public"."enum_catalog_documents_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__catalog_documents_v_version_review_state" AS ENUM('ready', 'review', 'blocked');
  CREATE TYPE "public"."enum__catalog_documents_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "products_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"file_id" integer,
  	"role" "enum_products_gallery_role",
  	"caption" varchar
  );
  
  CREATE TABLE "cat_doc_ids" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "products_catalog_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"document_id" integer,
  	"visible" boolean DEFAULT true
  );
  
  CREATE TABLE "products_resources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"file_id" integer,
  	"url" varchar,
  	"section" varchar,
  	"visible" boolean DEFAULT true
  );
  
  CREATE TABLE "products_legacy_ids" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "_products_v_version_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"file_id" integer,
  	"role" "enum__products_v_version_gallery_role",
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_cat_doc_ids_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_catalog_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"document_id" integer,
  	"visible" boolean DEFAULT true,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_resources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"file_id" integer,
  	"url" varchar,
  	"section" varchar,
  	"visible" boolean DEFAULT true,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_legacy_ids" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "product_variants_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"file_id" integer,
  	"role" "enum_product_variants_gallery_role",
  	"caption" varchar
  );
  
  CREATE TABLE "product_variants_legacy_ids" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "product_variants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"product_id" integer,
  	"sku" varchar,
  	"profile" "enum_product_variants_profile",
  	"size" varchar,
  	"connection" varchar,
  	"color" "enum_product_variants_color",
  	"sort_order" numeric DEFAULT 500,
  	"specs_dn" numeric,
  	"specs_pn" numeric,
  	"specs_sdr" numeric,
  	"specs_outer_diameter_mm" numeric,
  	"specs_wall_thickness_mm" numeric,
  	"specs_power_kw" numeric,
  	"specs_phases" numeric,
  	"specs_voltage_v" numeric,
  	"specs_max_temperature_c" numeric,
  	"specs_precharge_bar" numeric,
  	"specs_dimension_a_mm" numeric,
  	"specs_dimension_b_mm" numeric,
  	"specs_net_weight_kg" numeric,
  	"specs_core_count" numeric,
  	"specs_cross_section_mm2" numeric,
  	"specs_coil_length_m" numeric,
  	"specs_max_flow_m3h" numeric,
  	"specs_max_head_m" numeric,
  	"specs_tank_volume_l" numeric,
  	"packaging_weight_value" numeric,
  	"packaging_weight_unit" varchar,
  	"packaging_weight_note" varchar,
  	"packaging_amount_value" numeric,
  	"packaging_amount_unit" varchar,
  	"packaging_amount_note" varchar,
  	"packaging_volume_value" numeric,
  	"packaging_volume_unit" varchar,
  	"packaging_volume_note" varchar,
  	"packaging_units_verified" boolean DEFAULT false,
  	"review_state" "enum_product_variants_review_state" DEFAULT 'ready',
  	"review_notes" varchar,
  	"external_id" varchar,
  	"source_active" boolean,
  	"source_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_product_variants_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_product_variants_v_version_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"file_id" integer,
  	"role" "enum__product_variants_v_version_gallery_role",
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_product_variants_v_version_legacy_ids" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_product_variants_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_product_id" integer,
  	"version_sku" varchar,
  	"version_profile" "enum__product_variants_v_version_profile",
  	"version_size" varchar,
  	"version_connection" varchar,
  	"version_color" "enum__product_variants_v_version_color",
  	"version_sort_order" numeric DEFAULT 500,
  	"version_specs_dn" numeric,
  	"version_specs_pn" numeric,
  	"version_specs_sdr" numeric,
  	"version_specs_outer_diameter_mm" numeric,
  	"version_specs_wall_thickness_mm" numeric,
  	"version_specs_power_kw" numeric,
  	"version_specs_phases" numeric,
  	"version_specs_voltage_v" numeric,
  	"version_specs_max_temperature_c" numeric,
  	"version_specs_precharge_bar" numeric,
  	"version_specs_dimension_a_mm" numeric,
  	"version_specs_dimension_b_mm" numeric,
  	"version_specs_net_weight_kg" numeric,
  	"version_specs_core_count" numeric,
  	"version_specs_cross_section_mm2" numeric,
  	"version_specs_coil_length_m" numeric,
  	"version_specs_max_flow_m3h" numeric,
  	"version_specs_max_head_m" numeric,
  	"version_specs_tank_volume_l" numeric,
  	"version_packaging_weight_value" numeric,
  	"version_packaging_weight_unit" varchar,
  	"version_packaging_weight_note" varchar,
  	"version_packaging_amount_value" numeric,
  	"version_packaging_amount_unit" varchar,
  	"version_packaging_amount_note" varchar,
  	"version_packaging_volume_value" numeric,
  	"version_packaging_volume_unit" varchar,
  	"version_packaging_volume_note" varchar,
  	"version_packaging_units_verified" boolean DEFAULT false,
  	"version_review_state" "enum__product_variants_v_version_review_state" DEFAULT 'ready',
  	"version_review_notes" varchar,
  	"version_external_id" varchar,
  	"version_source_active" boolean,
  	"version_source_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__product_variants_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "catalog_documents_legacy_ids" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "catalog_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"kind" varchar,
  	"description" varchar,
  	"file_id" integer,
  	"cover_id" integer,
  	"review_state" "enum_catalog_documents_review_state" DEFAULT 'ready',
  	"review_notes" varchar,
  	"external_id" varchar,
  	"source_active" boolean,
  	"legacy_labels" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_catalog_documents_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_catalog_documents_v_version_legacy_ids" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_catalog_documents_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_kind" varchar,
  	"version_description" varchar,
  	"version_file_id" integer,
  	"version_cover_id" integer,
  	"version_review_state" "enum__catalog_documents_v_version_review_state" DEFAULT 'ready',
  	"version_review_notes" varchar,
  	"version_external_id" varchar,
  	"version_source_active" boolean,
  	"version_legacy_labels" jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__catalog_documents_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "media_legacy_ids" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "_media_v_version_legacy_ids" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  
  ALTER TABLE "products" ADD COLUMN "product_kind" "enum_products_product_kind" DEFAULT 'single';
  ALTER TABLE "products" ADD COLUMN "profile" "enum_products_profile";
  ALTER TABLE "products" ADD COLUMN "summary" varchar;
  ALTER TABLE "products" ADD COLUMN "sort_order" numeric DEFAULT 500;
  ALTER TABLE "products" ADD COLUMN "characteristics" varchar;
  ALTER TABLE "products" ADD COLUMN "documents_text" varchar;
  ALTER TABLE "products" ADD COLUMN "video_text" varchar;
  ALTER TABLE "products" ADD COLUMN "review_state" "enum_products_review_state" DEFAULT 'ready';
  ALTER TABLE "products" ADD COLUMN "review_notes" varchar;
  ALTER TABLE "products" ADD COLUMN "source_active" boolean;
  ALTER TABLE "products" ADD COLUMN "source_slug" varchar;
  ALTER TABLE "products" ADD COLUMN "title_en" varchar;
  ALTER TABLE "products" ADD COLUMN "description_en" varchar;
  ALTER TABLE "products" ADD COLUMN "characteristics_en" varchar;
  ALTER TABLE "products" ADD COLUMN "documents_text_en" varchar;
  ALTER TABLE "products_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "_products_v" ADD COLUMN "version_product_kind" "enum__products_v_version_product_kind" DEFAULT 'single';
  ALTER TABLE "_products_v" ADD COLUMN "version_profile" "enum__products_v_version_profile";
  ALTER TABLE "_products_v" ADD COLUMN "version_summary" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_sort_order" numeric DEFAULT 500;
  ALTER TABLE "_products_v" ADD COLUMN "version_characteristics" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_documents_text" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_video_text" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_review_state" "enum__products_v_version_review_state" DEFAULT 'ready';
  ALTER TABLE "_products_v" ADD COLUMN "version_review_notes" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_source_active" boolean;
  ALTER TABLE "_products_v" ADD COLUMN "version_source_slug" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_title_en" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_description_en" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_characteristics_en" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_documents_text_en" varchar;
  ALTER TABLE "_products_v_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "media" ADD COLUMN "external_id" varchar;
  ALTER TABLE "media" ADD COLUMN "source_active" boolean;
  ALTER TABLE "media" ADD COLUMN "sha256" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_external_id" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_source_active" boolean;
  ALTER TABLE "_media_v" ADD COLUMN "version_sha256" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "product_variants_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "catalog_documents_id" integer;
  ALTER TABLE "products_gallery" ADD CONSTRAINT "products_gallery_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_gallery" ADD CONSTRAINT "products_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cat_doc_ids" ADD CONSTRAINT "cat_doc_ids_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_catalog_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_catalog_documents" ADD CONSTRAINT "products_catalog_documents_document_id_catalog_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."catalog_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_catalog_documents" ADD CONSTRAINT "products_catalog_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_resources" ADD CONSTRAINT "products_resources_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_resources" ADD CONSTRAINT "products_resources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_legacy_ids" ADD CONSTRAINT "products_legacy_ids_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_gallery" ADD CONSTRAINT "_products_v_version_gallery_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_gallery" ADD CONSTRAINT "_products_v_version_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_cat_doc_ids_v" ADD CONSTRAINT "_cat_doc_ids_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_version_catalog_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_catalog_documents" ADD CONSTRAINT "_products_v_version_catalog_documents_document_id_catalog_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."catalog_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_catalog_documents" ADD CONSTRAINT "_products_v_version_catalog_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_resources" ADD CONSTRAINT "_products_v_version_resources_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_resources" ADD CONSTRAINT "_products_v_version_resources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_legacy_ids" ADD CONSTRAINT "_products_v_version_legacy_ids_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "product_variants_gallery" ADD CONSTRAINT "product_variants_gallery_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_variants_gallery" ADD CONSTRAINT "product_variants_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "product_variants_legacy_ids" ADD CONSTRAINT "product_variants_legacy_ids_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_product_variants_v_version_gallery" ADD CONSTRAINT "_product_variants_v_version_gallery_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_product_variants_v_version_gallery" ADD CONSTRAINT "_product_variants_v_version_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_product_variants_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_product_variants_v_version_legacy_ids" ADD CONSTRAINT "_product_variants_v_version_legacy_ids_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_product_variants_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_product_variants_v" ADD CONSTRAINT "_product_variants_v_parent_id_product_variants_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_product_variants_v" ADD CONSTRAINT "_product_variants_v_version_product_id_products_id_fk" FOREIGN KEY ("version_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "catalog_documents_legacy_ids" ADD CONSTRAINT "catalog_documents_legacy_ids_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."catalog_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "catalog_documents" ADD CONSTRAINT "catalog_documents_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "catalog_documents" ADD CONSTRAINT "catalog_documents_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_catalog_documents_v_version_legacy_ids" ADD CONSTRAINT "_catalog_documents_v_version_legacy_ids_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_catalog_documents_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_catalog_documents_v" ADD CONSTRAINT "_catalog_documents_v_parent_id_catalog_documents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."catalog_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_catalog_documents_v" ADD CONSTRAINT "_catalog_documents_v_version_file_id_media_id_fk" FOREIGN KEY ("version_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_catalog_documents_v" ADD CONSTRAINT "_catalog_documents_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_legacy_ids" ADD CONSTRAINT "media_legacy_ids_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_media_v_version_legacy_ids" ADD CONSTRAINT "_media_v_version_legacy_ids_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_media_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_gallery_order_idx" ON "products_gallery" USING btree ("_order");
  CREATE INDEX "products_gallery_parent_id_idx" ON "products_gallery" USING btree ("_parent_id");
  CREATE INDEX "products_gallery_file_idx" ON "products_gallery" USING btree ("file_id");
  CREATE INDEX "cat_doc_ids_order_idx" ON "cat_doc_ids" USING btree ("_order");
  CREATE INDEX "cat_doc_ids_parent_id_idx" ON "cat_doc_ids" USING btree ("_parent_id");
  CREATE INDEX "products_catalog_documents_order_idx" ON "products_catalog_documents" USING btree ("_order");
  CREATE INDEX "products_catalog_documents_parent_id_idx" ON "products_catalog_documents" USING btree ("_parent_id");
  CREATE INDEX "products_catalog_documents_document_idx" ON "products_catalog_documents" USING btree ("document_id");
  CREATE INDEX "products_resources_order_idx" ON "products_resources" USING btree ("_order");
  CREATE INDEX "products_resources_parent_id_idx" ON "products_resources" USING btree ("_parent_id");
  CREATE INDEX "products_resources_file_idx" ON "products_resources" USING btree ("file_id");
  CREATE INDEX "products_legacy_ids_order_idx" ON "products_legacy_ids" USING btree ("_order");
  CREATE INDEX "products_legacy_ids_parent_id_idx" ON "products_legacy_ids" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_gallery_order_idx" ON "_products_v_version_gallery" USING btree ("_order");
  CREATE INDEX "_products_v_version_gallery_parent_id_idx" ON "_products_v_version_gallery" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_gallery_file_idx" ON "_products_v_version_gallery" USING btree ("file_id");
  CREATE INDEX "_cat_doc_ids_v_order_idx" ON "_cat_doc_ids_v" USING btree ("_order");
  CREATE INDEX "_cat_doc_ids_v_parent_id_idx" ON "_cat_doc_ids_v" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_catalog_documents_order_idx" ON "_products_v_version_catalog_documents" USING btree ("_order");
  CREATE INDEX "_products_v_version_catalog_documents_parent_id_idx" ON "_products_v_version_catalog_documents" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_catalog_documents_document_idx" ON "_products_v_version_catalog_documents" USING btree ("document_id");
  CREATE INDEX "_products_v_version_resources_order_idx" ON "_products_v_version_resources" USING btree ("_order");
  CREATE INDEX "_products_v_version_resources_parent_id_idx" ON "_products_v_version_resources" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_resources_file_idx" ON "_products_v_version_resources" USING btree ("file_id");
  CREATE INDEX "_products_v_version_legacy_ids_order_idx" ON "_products_v_version_legacy_ids" USING btree ("_order");
  CREATE INDEX "_products_v_version_legacy_ids_parent_id_idx" ON "_products_v_version_legacy_ids" USING btree ("_parent_id");
  CREATE INDEX "product_variants_gallery_order_idx" ON "product_variants_gallery" USING btree ("_order");
  CREATE INDEX "product_variants_gallery_parent_id_idx" ON "product_variants_gallery" USING btree ("_parent_id");
  CREATE INDEX "product_variants_gallery_file_idx" ON "product_variants_gallery" USING btree ("file_id");
  CREATE INDEX "product_variants_legacy_ids_order_idx" ON "product_variants_legacy_ids" USING btree ("_order");
  CREATE INDEX "product_variants_legacy_ids_parent_id_idx" ON "product_variants_legacy_ids" USING btree ("_parent_id");
  CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_id");
  CREATE INDEX "product_variants_sku_idx" ON "product_variants" USING btree ("sku");
  CREATE INDEX "product_variants_profile_idx" ON "product_variants" USING btree ("profile");
  CREATE UNIQUE INDEX "product_variants_external_id_idx" ON "product_variants" USING btree ("external_id");
  CREATE INDEX "product_variants_updated_at_idx" ON "product_variants" USING btree ("updated_at");
  CREATE INDEX "product_variants_created_at_idx" ON "product_variants" USING btree ("created_at");
  CREATE INDEX "product_variants__status_idx" ON "product_variants" USING btree ("_status");
  CREATE INDEX "_product_variants_v_version_gallery_order_idx" ON "_product_variants_v_version_gallery" USING btree ("_order");
  CREATE INDEX "_product_variants_v_version_gallery_parent_id_idx" ON "_product_variants_v_version_gallery" USING btree ("_parent_id");
  CREATE INDEX "_product_variants_v_version_gallery_file_idx" ON "_product_variants_v_version_gallery" USING btree ("file_id");
  CREATE INDEX "_product_variants_v_version_legacy_ids_order_idx" ON "_product_variants_v_version_legacy_ids" USING btree ("_order");
  CREATE INDEX "_product_variants_v_version_legacy_ids_parent_id_idx" ON "_product_variants_v_version_legacy_ids" USING btree ("_parent_id");
  CREATE INDEX "_product_variants_v_parent_idx" ON "_product_variants_v" USING btree ("parent_id");
  CREATE INDEX "_product_variants_v_version_version_product_idx" ON "_product_variants_v" USING btree ("version_product_id");
  CREATE INDEX "_product_variants_v_version_version_sku_idx" ON "_product_variants_v" USING btree ("version_sku");
  CREATE INDEX "_product_variants_v_version_version_profile_idx" ON "_product_variants_v" USING btree ("version_profile");
  CREATE INDEX "_product_variants_v_version_version_external_id_idx" ON "_product_variants_v" USING btree ("version_external_id");
  CREATE INDEX "_product_variants_v_version_version_updated_at_idx" ON "_product_variants_v" USING btree ("version_updated_at");
  CREATE INDEX "_product_variants_v_version_version_created_at_idx" ON "_product_variants_v" USING btree ("version_created_at");
  CREATE INDEX "_product_variants_v_version_version__status_idx" ON "_product_variants_v" USING btree ("version__status");
  CREATE INDEX "_product_variants_v_created_at_idx" ON "_product_variants_v" USING btree ("created_at");
  CREATE INDEX "_product_variants_v_updated_at_idx" ON "_product_variants_v" USING btree ("updated_at");
  CREATE INDEX "_product_variants_v_latest_idx" ON "_product_variants_v" USING btree ("latest");
  CREATE INDEX "_product_variants_v_autosave_idx" ON "_product_variants_v" USING btree ("autosave");
  CREATE INDEX "catalog_documents_legacy_ids_order_idx" ON "catalog_documents_legacy_ids" USING btree ("_order");
  CREATE INDEX "catalog_documents_legacy_ids_parent_id_idx" ON "catalog_documents_legacy_ids" USING btree ("_parent_id");
  CREATE INDEX "catalog_documents_file_idx" ON "catalog_documents" USING btree ("file_id");
  CREATE INDEX "catalog_documents_cover_idx" ON "catalog_documents" USING btree ("cover_id");
  CREATE UNIQUE INDEX "catalog_documents_external_id_idx" ON "catalog_documents" USING btree ("external_id");
  CREATE INDEX "catalog_documents_updated_at_idx" ON "catalog_documents" USING btree ("updated_at");
  CREATE INDEX "catalog_documents_created_at_idx" ON "catalog_documents" USING btree ("created_at");
  CREATE INDEX "catalog_documents__status_idx" ON "catalog_documents" USING btree ("_status");
  CREATE INDEX "_catalog_documents_v_version_legacy_ids_order_idx" ON "_catalog_documents_v_version_legacy_ids" USING btree ("_order");
  CREATE INDEX "_catalog_documents_v_version_legacy_ids_parent_id_idx" ON "_catalog_documents_v_version_legacy_ids" USING btree ("_parent_id");
  CREATE INDEX "_catalog_documents_v_parent_idx" ON "_catalog_documents_v" USING btree ("parent_id");
  CREATE INDEX "_catalog_documents_v_version_version_file_idx" ON "_catalog_documents_v" USING btree ("version_file_id");
  CREATE INDEX "_catalog_documents_v_version_version_cover_idx" ON "_catalog_documents_v" USING btree ("version_cover_id");
  CREATE INDEX "_catalog_documents_v_version_version_external_id_idx" ON "_catalog_documents_v" USING btree ("version_external_id");
  CREATE INDEX "_catalog_documents_v_version_version_updated_at_idx" ON "_catalog_documents_v" USING btree ("version_updated_at");
  CREATE INDEX "_catalog_documents_v_version_version_created_at_idx" ON "_catalog_documents_v" USING btree ("version_created_at");
  CREATE INDEX "_catalog_documents_v_version_version__status_idx" ON "_catalog_documents_v" USING btree ("version__status");
  CREATE INDEX "_catalog_documents_v_created_at_idx" ON "_catalog_documents_v" USING btree ("created_at");
  CREATE INDEX "_catalog_documents_v_updated_at_idx" ON "_catalog_documents_v" USING btree ("updated_at");
  CREATE INDEX "_catalog_documents_v_latest_idx" ON "_catalog_documents_v" USING btree ("latest");
  CREATE INDEX "_catalog_documents_v_autosave_idx" ON "_catalog_documents_v" USING btree ("autosave");
  CREATE INDEX "media_legacy_ids_order_idx" ON "media_legacy_ids" USING btree ("_order");
  CREATE INDEX "media_legacy_ids_parent_id_idx" ON "media_legacy_ids" USING btree ("_parent_id");
  CREATE INDEX "_media_v_version_legacy_ids_order_idx" ON "_media_v_version_legacy_ids" USING btree ("_order");
  CREATE INDEX "_media_v_version_legacy_ids_parent_id_idx" ON "_media_v_version_legacy_ids" USING btree ("_parent_id");
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_variants_fk" FOREIGN KEY ("product_variants_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_catalog_documents_fk" FOREIGN KEY ("catalog_documents_id") REFERENCES "public"."catalog_documents"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_profile_idx" ON "products" USING btree ("profile");
  CREATE INDEX "products_rels_categories_id_idx" ON "products_rels" USING btree ("categories_id");
  CREATE INDEX "_products_v_version_version_profile_idx" ON "_products_v" USING btree ("version_profile");
  CREATE INDEX "_products_v_rels_categories_id_idx" ON "_products_v_rels" USING btree ("categories_id");
  CREATE UNIQUE INDEX "media_external_id_idx" ON "media" USING btree ("external_id");
  CREATE UNIQUE INDEX "media_sha256_idx" ON "media" USING btree ("sha256");
  CREATE INDEX "_media_v_version_version_external_id_idx" ON "_media_v" USING btree ("version_external_id");
  CREATE INDEX "_media_v_version_version_sha256_idx" ON "_media_v" USING btree ("version_sha256");
  CREATE INDEX "payload_locked_documents_rels_product_variants_id_idx" ON "payload_locked_documents_rels" USING btree ("product_variants_id");
  CREATE INDEX "payload_locked_documents_rels_catalog_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("catalog_documents_id");
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cat_doc_ids" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_catalog_documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_resources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_legacy_ids" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_cat_doc_ids_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_catalog_documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_resources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_legacy_ids" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "product_variants_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "product_variants_legacy_ids" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "product_variants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_product_variants_v_version_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_product_variants_v_version_legacy_ids" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_product_variants_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "catalog_documents_legacy_ids" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "catalog_documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_catalog_documents_v_version_legacy_ids" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_catalog_documents_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "media_legacy_ids" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_media_v_version_legacy_ids" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "products_gallery" CASCADE;
  DROP TABLE "cat_doc_ids" CASCADE;
  DROP TABLE "products_catalog_documents" CASCADE;
  DROP TABLE "products_resources" CASCADE;
  DROP TABLE "products_legacy_ids" CASCADE;
  DROP TABLE "_products_v_version_gallery" CASCADE;
  DROP TABLE "_cat_doc_ids_v" CASCADE;
  DROP TABLE "_products_v_version_catalog_documents" CASCADE;
  DROP TABLE "_products_v_version_resources" CASCADE;
  DROP TABLE "_products_v_version_legacy_ids" CASCADE;
  DROP TABLE "product_variants_gallery" CASCADE;
  DROP TABLE "product_variants_legacy_ids" CASCADE;
  DROP TABLE "product_variants" CASCADE;
  DROP TABLE "_product_variants_v_version_gallery" CASCADE;
  DROP TABLE "_product_variants_v_version_legacy_ids" CASCADE;
  DROP TABLE "_product_variants_v" CASCADE;
  DROP TABLE "catalog_documents_legacy_ids" CASCADE;
  DROP TABLE "catalog_documents" CASCADE;
  DROP TABLE "_catalog_documents_v_version_legacy_ids" CASCADE;
  DROP TABLE "_catalog_documents_v" CASCADE;
  DROP TABLE "media_legacy_ids" CASCADE;
  DROP TABLE "_media_v_version_legacy_ids" CASCADE;
  ALTER TABLE "products_rels" DROP CONSTRAINT "products_rels_categories_fk";
  
  ALTER TABLE "_products_v_rels" DROP CONSTRAINT "_products_v_rels_categories_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_product_variants_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_catalog_documents_fk";
  
  DROP INDEX "products_profile_idx";
  DROP INDEX "products_rels_categories_id_idx";
  DROP INDEX "_products_v_version_version_profile_idx";
  DROP INDEX "_products_v_rels_categories_id_idx";
  DROP INDEX "media_external_id_idx";
  DROP INDEX "media_sha256_idx";
  DROP INDEX "_media_v_version_version_external_id_idx";
  DROP INDEX "_media_v_version_version_sha256_idx";
  DROP INDEX "payload_locked_documents_rels_product_variants_id_idx";
  DROP INDEX "payload_locked_documents_rels_catalog_documents_id_idx";
  
  
  ALTER TABLE "products" DROP COLUMN "product_kind";
  ALTER TABLE "products" DROP COLUMN "profile";
  ALTER TABLE "products" DROP COLUMN "summary";
  ALTER TABLE "products" DROP COLUMN "sort_order";
  ALTER TABLE "products" DROP COLUMN "characteristics";
  ALTER TABLE "products" DROP COLUMN "documents_text";
  ALTER TABLE "products" DROP COLUMN "video_text";
  ALTER TABLE "products" DROP COLUMN "review_state";
  ALTER TABLE "products" DROP COLUMN "review_notes";
  ALTER TABLE "products" DROP COLUMN "source_active";
  ALTER TABLE "products" DROP COLUMN "source_slug";
  ALTER TABLE "products" DROP COLUMN "title_en";
  ALTER TABLE "products" DROP COLUMN "description_en";
  ALTER TABLE "products" DROP COLUMN "characteristics_en";
  ALTER TABLE "products" DROP COLUMN "documents_text_en";
  ALTER TABLE "products_rels" DROP COLUMN "categories_id";
  ALTER TABLE "_products_v" DROP COLUMN "version_product_kind";
  ALTER TABLE "_products_v" DROP COLUMN "version_profile";
  ALTER TABLE "_products_v" DROP COLUMN "version_summary";
  ALTER TABLE "_products_v" DROP COLUMN "version_sort_order";
  ALTER TABLE "_products_v" DROP COLUMN "version_characteristics";
  ALTER TABLE "_products_v" DROP COLUMN "version_documents_text";
  ALTER TABLE "_products_v" DROP COLUMN "version_video_text";
  ALTER TABLE "_products_v" DROP COLUMN "version_review_state";
  ALTER TABLE "_products_v" DROP COLUMN "version_review_notes";
  ALTER TABLE "_products_v" DROP COLUMN "version_source_active";
  ALTER TABLE "_products_v" DROP COLUMN "version_source_slug";
  ALTER TABLE "_products_v" DROP COLUMN "version_title_en";
  ALTER TABLE "_products_v" DROP COLUMN "version_description_en";
  ALTER TABLE "_products_v" DROP COLUMN "version_characteristics_en";
  ALTER TABLE "_products_v" DROP COLUMN "version_documents_text_en";
  ALTER TABLE "_products_v_rels" DROP COLUMN "categories_id";
  ALTER TABLE "media" DROP COLUMN "external_id";
  ALTER TABLE "media" DROP COLUMN "source_active";
  ALTER TABLE "media" DROP COLUMN "sha256";
  ALTER TABLE "_media_v" DROP COLUMN "version_external_id";
  ALTER TABLE "_media_v" DROP COLUMN "version_source_active";
  ALTER TABLE "_media_v" DROP COLUMN "version_sha256";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "product_variants_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "catalog_documents_id";
  DROP TYPE "public"."enum_products_gallery_role";
  DROP TYPE "public"."enum_products_product_kind";
  DROP TYPE "public"."enum_products_profile";
  DROP TYPE "public"."enum_products_review_state";
  DROP TYPE "public"."enum__products_v_version_gallery_role";
  DROP TYPE "public"."enum__products_v_version_product_kind";
  DROP TYPE "public"."enum__products_v_version_profile";
  DROP TYPE "public"."enum__products_v_version_review_state";
  DROP TYPE "public"."enum_product_variants_gallery_role";
  DROP TYPE "public"."enum_product_variants_profile";
  DROP TYPE "public"."enum_product_variants_color";
  DROP TYPE "public"."enum_product_variants_review_state";
  DROP TYPE "public"."enum_product_variants_status";
  DROP TYPE "public"."enum__product_variants_v_version_gallery_role";
  DROP TYPE "public"."enum__product_variants_v_version_profile";
  DROP TYPE "public"."enum__product_variants_v_version_color";
  DROP TYPE "public"."enum__product_variants_v_version_review_state";
  DROP TYPE "public"."enum__product_variants_v_version_status";
  DROP TYPE "public"."enum_catalog_documents_review_state";
  DROP TYPE "public"."enum_catalog_documents_status";
  DROP TYPE "public"."enum__catalog_documents_v_version_review_state";
  DROP TYPE "public"."enum__catalog_documents_v_version_status";`)
}
