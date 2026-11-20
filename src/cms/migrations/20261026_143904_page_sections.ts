import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_site_section_section" AS ENUM('home-banner', 'about-company', 'engineering-solutions', 'dc-hero', 'dc-intro', 'dc-system', 'dc-products', 'fire-hero', 'fire-intro', 'fire-system', 'fire-products');
  CREATE TYPE "public"."enum__pages_v_blocks_site_section_section" AS ENUM('home-banner', 'about-company', 'engineering-solutions', 'dc-hero', 'dc-intro', 'dc-system', 'dc-products', 'fire-hero', 'fire-intro', 'fire-system', 'fire-products');
  CREATE TABLE "pages_blocks_site_section" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "_path" text NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "hidden" boolean DEFAULT false,
    "section" "enum_pages_blocks_site_section_section",
    "block_name" varchar
  );

  CREATE TABLE "_pages_v_blocks_site_section" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "_path" text NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "hidden" boolean DEFAULT false,
    "section" "enum__pages_v_blocks_site_section_section",
    "_uuid" varchar,
    "block_name" varchar
  );

  ALTER TABLE "pages_blocks_site_section" ADD CONSTRAINT "pages_blocks_site_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_site_section" ADD CONSTRAINT "_pages_v_blocks_site_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_site_section_order_idx" ON "pages_blocks_site_section" USING btree ("_order");
  CREATE INDEX "pages_blocks_site_section_parent_id_idx" ON "pages_blocks_site_section" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_site_section_path_idx" ON "pages_blocks_site_section" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_site_section_order_idx" ON "_pages_v_blocks_site_section" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_site_section_parent_id_idx" ON "_pages_v_blocks_site_section" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_site_section_path_idx" ON "_pages_v_blocks_site_section" USING btree ("_path");
  ALTER TABLE "media" DROP COLUMN "focal_x";
  ALTER TABLE "media" DROP COLUMN "focal_y";
  ALTER TABLE "_media_v" DROP COLUMN "version_focal_x";
  ALTER TABLE "_media_v" DROP COLUMN "version_focal_y";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_site_section" CASCADE;
  DROP TABLE "_pages_v_blocks_site_section" CASCADE;
  ALTER TABLE "media" ADD COLUMN "focal_x" numeric;
  ALTER TABLE "media" ADD COLUMN "focal_y" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_focal_x" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_focal_y" numeric;
  DROP TYPE "public"."enum_pages_blocks_site_section_section";
  DROP TYPE "public"."enum__pages_v_blocks_site_section_section";`)
}
