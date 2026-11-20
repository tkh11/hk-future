import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" ALTER COLUMN "product_kind" SET DEFAULT 'family';
  ALTER TABLE "_products_v" ALTER COLUMN "version_product_kind" SET DEFAULT 'family';
  ALTER TABLE "products" ADD COLUMN "publication_requested" boolean DEFAULT false;
  ALTER TABLE "_products_v" ADD COLUMN "version_publication_requested" boolean DEFAULT false;
  ALTER TABLE "media" ADD COLUMN "focal_x" numeric;
  ALTER TABLE "media" ADD COLUMN "focal_y" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumb_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_thumb_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumb_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumb_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_thumb_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumb_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_card_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_card_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_card_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_card_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_card_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_card_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_wide_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_wide_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_wide_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_wide_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_wide_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_wide_filename" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_focal_x" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_focal_y" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_thumb_url" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_thumb_width" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_thumb_height" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_thumb_mime_type" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_thumb_filesize" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_thumb_filename" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_card_url" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_card_width" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_card_height" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_card_mime_type" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_card_filesize" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_card_filename" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_wide_url" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_wide_width" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_wide_height" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_wide_mime_type" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_wide_filesize" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_wide_filename" varchar;
  CREATE INDEX "products_publication_requested_idx" ON "products" USING btree ("publication_requested");
  CREATE INDEX "_products_v_version_version_publication_requested_idx" ON "_products_v" USING btree ("version_publication_requested");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_wide_sizes_wide_filename_idx" ON "media" USING btree ("sizes_wide_filename");
  CREATE INDEX "_media_v_version_sizes_thumb_version_sizes_thumb_filenam_idx" ON "_media_v" USING btree ("version_sizes_thumb_filename");
  CREATE INDEX "_media_v_version_sizes_card_version_sizes_card_filename_idx" ON "_media_v" USING btree ("version_sizes_card_filename");
  CREATE INDEX "_media_v_version_sizes_wide_version_sizes_wide_filename_idx" ON "_media_v" USING btree ("version_sizes_wide_filename");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "products_publication_requested_idx";
  DROP INDEX "_products_v_version_version_publication_requested_idx";
  DROP INDEX "media_sizes_thumb_sizes_thumb_filename_idx";
  DROP INDEX "media_sizes_card_sizes_card_filename_idx";
  DROP INDEX "media_sizes_wide_sizes_wide_filename_idx";
  DROP INDEX "_media_v_version_sizes_thumb_version_sizes_thumb_filenam_idx";
  DROP INDEX "_media_v_version_sizes_card_version_sizes_card_filename_idx";
  DROP INDEX "_media_v_version_sizes_wide_version_sizes_wide_filename_idx";
  ALTER TABLE "products" ALTER COLUMN "product_kind" SET DEFAULT 'single';
  ALTER TABLE "_products_v" ALTER COLUMN "version_product_kind" SET DEFAULT 'single';
  ALTER TABLE "products" DROP COLUMN "publication_requested";
  ALTER TABLE "_products_v" DROP COLUMN "version_publication_requested";
  ALTER TABLE "media" DROP COLUMN "focal_x";
  ALTER TABLE "media" DROP COLUMN "focal_y";
  ALTER TABLE "media" DROP COLUMN "sizes_thumb_url";
  ALTER TABLE "media" DROP COLUMN "sizes_thumb_width";
  ALTER TABLE "media" DROP COLUMN "sizes_thumb_height";
  ALTER TABLE "media" DROP COLUMN "sizes_thumb_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_thumb_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_thumb_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_card_url";
  ALTER TABLE "media" DROP COLUMN "sizes_card_width";
  ALTER TABLE "media" DROP COLUMN "sizes_card_height";
  ALTER TABLE "media" DROP COLUMN "sizes_card_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_card_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_card_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_wide_url";
  ALTER TABLE "media" DROP COLUMN "sizes_wide_width";
  ALTER TABLE "media" DROP COLUMN "sizes_wide_height";
  ALTER TABLE "media" DROP COLUMN "sizes_wide_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_wide_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_wide_filename";
  ALTER TABLE "_media_v" DROP COLUMN "version_focal_x";
  ALTER TABLE "_media_v" DROP COLUMN "version_focal_y";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_thumb_url";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_thumb_width";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_thumb_height";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_thumb_mime_type";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_thumb_filesize";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_thumb_filename";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_card_url";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_card_width";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_card_height";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_card_mime_type";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_card_filesize";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_card_filename";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_wide_url";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_wide_width";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_wide_height";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_wide_mime_type";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_wide_filesize";
  ALTER TABLE "_media_v" DROP COLUMN "version_sizes_wide_filename";`)
}
