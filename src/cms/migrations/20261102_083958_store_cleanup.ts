import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// The 2026-11-02 audit found these empty on both the working database and its copy.
// If anything was added since, stop instead of dropping it.
const mustBeEmpty = [
  ['product_series', sql`SELECT count(*)::int AS n FROM "product_series"`],
  ['products.series', sql`SELECT count(*)::int AS n FROM "products" WHERE "series_id" IS NOT NULL`],
  ['products.attributes', sql`SELECT count(*)::int AS n FROM "products_attributes"`],
  ['products.documents', sql`SELECT count(*)::int AS n FROM "products_rels" WHERE "path" = 'documents'`],
] as const;

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const [name, query] of mustBeEmpty) {
    const { rows } = await db.execute(query);
    if (Number(rows[0]?.n) > 0) throw new Error(`Migration stopped: ${name} is no longer empty. Move the data first.`);
  }
  // The product photo becomes the first gallery item wherever it is not in the gallery yet.
  await db.execute(sql`
  INSERT INTO "products_gallery" ("_order", "_parent_id", "id", "file_id", "role")
    SELECT 0, p."id", substr(md5(random()::text || p."id"::text), 1, 24), p."image_id", 'main'
    FROM "products" p
    WHERE p."image_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "products_gallery" g WHERE g."_parent_id" = p."id" AND g."file_id" = p."image_id");
  INSERT INTO "_products_v_version_gallery" ("_order", "_parent_id", "file_id", "role", "_uuid")
    SELECT 0, v."id", v."version_image_id", 'main', substr(md5(random()::text || v."id"::text), 1, 24)
    FROM "_products_v" v
    WHERE v."version_image_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "_products_v_version_gallery" g WHERE g."_parent_id" = v."id" AND g."file_id" = v."version_image_id");
  UPDATE "products_gallery" SET "role" = 'gallery' WHERE "role" = 'preview';
  UPDATE "_products_v_version_gallery" SET "role" = 'gallery' WHERE "role" = 'preview';
  UPDATE "product_variants_gallery" SET "role" = 'gallery' WHERE "role" = 'preview';
  UPDATE "_product_variants_v_version_gallery" SET "role" = 'gallery' WHERE "role" = 'preview';`)
  await db.execute(sql`
   ALTER TABLE "product_series" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_product_series_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_attributes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_attributes" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "product_series" CASCADE;
  DROP TABLE "_product_series_v" CASCADE;
  DROP TABLE "products_attributes" CASCADE;
  DROP TABLE "_products_v_version_attributes" CASCADE;
  ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_series_id_product_series_id_fk";
  
  ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_image_id_media_id_fk";
  
  ALTER TABLE "products_rels" DROP CONSTRAINT IF EXISTS "products_rels_media_fk";
  
  ALTER TABLE "_products_v" DROP CONSTRAINT IF EXISTS "_products_v_version_series_id_product_series_id_fk";
  
  ALTER TABLE "_products_v" DROP CONSTRAINT IF EXISTS "_products_v_version_image_id_media_id_fk";
  
  ALTER TABLE "_products_v_rels" DROP CONSTRAINT IF EXISTS "_products_v_rels_media_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_product_series_fk";
  
  ALTER TABLE "products_gallery" ALTER COLUMN "role" SET DATA TYPE text;
  DROP TYPE "public"."enum_products_gallery_role";
  CREATE TYPE "public"."enum_products_gallery_role" AS ENUM('main', 'gallery', 'technical');
  ALTER TABLE "products_gallery" ALTER COLUMN "role" SET DATA TYPE "public"."enum_products_gallery_role" USING "role"::"public"."enum_products_gallery_role";
  ALTER TABLE "_products_v_version_gallery" ALTER COLUMN "role" SET DATA TYPE text;
  DROP TYPE "public"."enum__products_v_version_gallery_role";
  CREATE TYPE "public"."enum__products_v_version_gallery_role" AS ENUM('main', 'gallery', 'technical');
  ALTER TABLE "_products_v_version_gallery" ALTER COLUMN "role" SET DATA TYPE "public"."enum__products_v_version_gallery_role" USING "role"::"public"."enum__products_v_version_gallery_role";
  ALTER TABLE "product_variants_gallery" ALTER COLUMN "role" SET DATA TYPE text;
  DROP TYPE "public"."enum_product_variants_gallery_role";
  CREATE TYPE "public"."enum_product_variants_gallery_role" AS ENUM('main', 'gallery', 'technical');
  ALTER TABLE "product_variants_gallery" ALTER COLUMN "role" SET DATA TYPE "public"."enum_product_variants_gallery_role" USING "role"::"public"."enum_product_variants_gallery_role";
  ALTER TABLE "_product_variants_v_version_gallery" ALTER COLUMN "role" SET DATA TYPE text;
  DROP TYPE "public"."enum__product_variants_v_version_gallery_role";
  CREATE TYPE "public"."enum__product_variants_v_version_gallery_role" AS ENUM('main', 'gallery', 'technical');
  ALTER TABLE "_product_variants_v_version_gallery" ALTER COLUMN "role" SET DATA TYPE "public"."enum__product_variants_v_version_gallery_role" USING "role"::"public"."enum__product_variants_v_version_gallery_role";
  DROP INDEX IF EXISTS "products_series_idx";
  DROP INDEX IF EXISTS "products_image_idx";
  DROP INDEX IF EXISTS "products_rels_media_id_idx";
  DROP INDEX IF EXISTS "_products_v_version_version_series_idx";
  DROP INDEX IF EXISTS "_products_v_version_version_image_idx";
  DROP INDEX IF EXISTS "_products_v_rels_media_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_product_series_id_idx";
  ALTER TABLE "products" DROP COLUMN "series_id";
  ALTER TABLE "products" DROP COLUMN "image_id";
  ALTER TABLE "products_rels" DROP COLUMN "media_id";
  ALTER TABLE "_products_v" DROP COLUMN "version_series_id";
  ALTER TABLE "_products_v" DROP COLUMN "version_image_id";
  ALTER TABLE "_products_v_rels" DROP COLUMN "media_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "product_series_id";
  DROP TYPE "public"."enum_product_series_status";
  DROP TYPE "public"."enum__product_series_v_version_status";
  DROP TYPE "public"."enum_products_attributes_value_type";
  DROP TYPE "public"."enum__products_v_version_attributes_value_type";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_product_series_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__product_series_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_products_attributes_value_type" AS ENUM('text', 'number', 'boolean');
  CREATE TYPE "public"."enum__products_v_version_attributes_value_type" AS ENUM('text', 'number', 'boolean');
  ALTER TYPE "public"."enum_products_gallery_role" ADD VALUE 'preview' BEFORE 'gallery';
  ALTER TYPE "public"."enum__products_v_version_gallery_role" ADD VALUE 'preview' BEFORE 'gallery';
  ALTER TYPE "public"."enum_product_variants_gallery_role" ADD VALUE 'preview' BEFORE 'gallery';
  ALTER TYPE "public"."enum__product_variants_v_version_gallery_role" ADD VALUE 'preview' BEFORE 'gallery';
  CREATE TABLE "product_series" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"description" varchar,
  	"category_id" integer,
  	"image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_product_series_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_product_series_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_description" varchar,
  	"version_category_id" integer,
  	"version_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__product_series_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "products_attributes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"key" varchar,
  	"value_type" "enum_products_attributes_value_type",
  	"text_value" varchar,
  	"number_value" numeric,
  	"boolean_value" boolean,
  	"unit" varchar
  );
  
  CREATE TABLE "_products_v_version_attributes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"key" varchar,
  	"value_type" "enum__products_v_version_attributes_value_type",
  	"text_value" varchar,
  	"number_value" numeric,
  	"boolean_value" boolean,
  	"unit" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "products" ADD COLUMN "series_id" integer;
  ALTER TABLE "products" ADD COLUMN "image_id" integer;
  ALTER TABLE "products_rels" ADD COLUMN "media_id" integer;
  ALTER TABLE "_products_v" ADD COLUMN "version_series_id" integer;
  ALTER TABLE "_products_v" ADD COLUMN "version_image_id" integer;
  ALTER TABLE "_products_v_rels" ADD COLUMN "media_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "product_series_id" integer;
  ALTER TABLE "product_series" ADD CONSTRAINT "product_series_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_series" ADD CONSTRAINT "product_series_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_product_series_v" ADD CONSTRAINT "_product_series_v_parent_id_product_series_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product_series"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_product_series_v" ADD CONSTRAINT "_product_series_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_product_series_v" ADD CONSTRAINT "_product_series_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_attributes" ADD CONSTRAINT "products_attributes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_attributes" ADD CONSTRAINT "_products_v_version_attributes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "product_series_slug_idx" ON "product_series" USING btree ("slug");
  CREATE INDEX "product_series_category_idx" ON "product_series" USING btree ("category_id");
  CREATE INDEX "product_series_image_idx" ON "product_series" USING btree ("image_id");
  CREATE INDEX "product_series_updated_at_idx" ON "product_series" USING btree ("updated_at");
  CREATE INDEX "product_series_created_at_idx" ON "product_series" USING btree ("created_at");
  CREATE INDEX "product_series__status_idx" ON "product_series" USING btree ("_status");
  CREATE INDEX "_product_series_v_parent_idx" ON "_product_series_v" USING btree ("parent_id");
  CREATE INDEX "_product_series_v_version_version_slug_idx" ON "_product_series_v" USING btree ("version_slug");
  CREATE INDEX "_product_series_v_version_version_category_idx" ON "_product_series_v" USING btree ("version_category_id");
  CREATE INDEX "_product_series_v_version_version_image_idx" ON "_product_series_v" USING btree ("version_image_id");
  CREATE INDEX "_product_series_v_version_version_updated_at_idx" ON "_product_series_v" USING btree ("version_updated_at");
  CREATE INDEX "_product_series_v_version_version_created_at_idx" ON "_product_series_v" USING btree ("version_created_at");
  CREATE INDEX "_product_series_v_version_version__status_idx" ON "_product_series_v" USING btree ("version__status");
  CREATE INDEX "_product_series_v_created_at_idx" ON "_product_series_v" USING btree ("created_at");
  CREATE INDEX "_product_series_v_updated_at_idx" ON "_product_series_v" USING btree ("updated_at");
  CREATE INDEX "_product_series_v_latest_idx" ON "_product_series_v" USING btree ("latest");
  CREATE INDEX "_product_series_v_autosave_idx" ON "_product_series_v" USING btree ("autosave");
  CREATE INDEX "products_attributes_order_idx" ON "products_attributes" USING btree ("_order");
  CREATE INDEX "products_attributes_parent_id_idx" ON "products_attributes" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_attributes_order_idx" ON "_products_v_version_attributes" USING btree ("_order");
  CREATE INDEX "_products_v_version_attributes_parent_id_idx" ON "_products_v_version_attributes" USING btree ("_parent_id");
  ALTER TABLE "products" ADD CONSTRAINT "products_series_id_product_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."product_series"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_series_id_product_series_id_fk" FOREIGN KEY ("version_series_id") REFERENCES "public"."product_series"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_series_fk" FOREIGN KEY ("product_series_id") REFERENCES "public"."product_series"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_series_idx" ON "products" USING btree ("series_id");
  CREATE INDEX "products_image_idx" ON "products" USING btree ("image_id");
  CREATE INDEX "products_rels_media_id_idx" ON "products_rels" USING btree ("media_id");
  CREATE INDEX "_products_v_version_version_series_idx" ON "_products_v" USING btree ("version_series_id");
  CREATE INDEX "_products_v_version_version_image_idx" ON "_products_v" USING btree ("version_image_id");
  CREATE INDEX "_products_v_rels_media_id_idx" ON "_products_v_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_product_series_id_idx" ON "payload_locked_documents_rels" USING btree ("product_series_id");`)
}
