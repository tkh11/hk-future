import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "categories" ADD COLUMN "source_key" varchar;
  ALTER TABLE "_categories_v" ADD COLUMN "version_source_key" varchar;
  ALTER TABLE "pages" ADD COLUMN "source_key" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_source_key" varchar;
  ALTER TABLE "articles" ADD COLUMN "source_key" varchar;
  ALTER TABLE "_articles_v" ADD COLUMN "version_source_key" varchar;
  CREATE UNIQUE INDEX "categories_source_key_idx" ON "categories" USING btree ("source_key");
  CREATE INDEX "_categories_v_version_version_source_key_idx" ON "_categories_v" USING btree ("version_source_key");
  CREATE UNIQUE INDEX "pages_source_key_idx" ON "pages" USING btree ("source_key");
  CREATE INDEX "_pages_v_version_version_source_key_idx" ON "_pages_v" USING btree ("version_source_key");
  CREATE UNIQUE INDEX "articles_source_key_idx" ON "articles" USING btree ("source_key");
  CREATE INDEX "_articles_v_version_version_source_key_idx" ON "_articles_v" USING btree ("version_source_key");
  -- One-time adoption of the original imported records; never match their URL again.
  UPDATE "categories" SET "source_key" = 'catalog:' || "path" WHERE "source_key" IS NULL AND "path" IN ('pipelines', 'pipelines/therm', 'pipelines/multilayer', 'pipelines/hdpe', 'pipelines/fireoff', 'pipelines/black-pipe', 'pumps', 'pumps/pressure-boosting', 'pumps/circulation', 'pumps/borehole', 'pumps/drainage', 'pumps/sewage', 'pumps/stations', 'pumps/automation', 'auxiliary');
  UPDATE "_categories_v" AS version SET "version_source_key" = source."source_key" FROM "categories" AS source WHERE version."parent_id" = source."id" AND version."version_source_key" IS NULL AND source."source_key" IS NOT NULL;
  UPDATE "articles" SET "source_key" = 'article:' || "slug" WHERE "source_key" IS NULL AND "slug" IN ('sharovoy-kran-kak-vybrat', 'pnd-truba-dlya-vodoprovoda', 'tsirkulyatsionnyy-nasos-podbor', 'nasosnaya-stantsiya-vodosnabzheniya', 'polipropilenovye-truby-vybor', 'gidroakkumulyator-vybor', 'pogruzhnoy-ili-poverhnostnyy-nasos', 'vodyanoy-teplyy-pol', 'drenazhnyy-nasos-vybor', 'truby-dlya-otopleniya', 'skvazhinnyy-nasos-podbor', 'vodoprovodnye-truby', 'metalloplastikovye-truby', 'kollektor-teplogo-pola', 'tsentrobezhnyy-nasos-rabochaya-tochka', 'fekalnyy-nasos-vybor', 'truba-dlya-teplogo-pola', 'fitingi-dlya-trub', 'rasshiritelnyy-bak-otopleniya', 'sshityy-polietilen-ili-pe-rt');
  UPDATE "_articles_v" AS version SET "version_source_key" = source."source_key" FROM "articles" AS source WHERE version."parent_id" = source."id" AND version."version_source_key" IS NULL AND source."source_key" IS NOT NULL;
  UPDATE "pages" SET "source_key" = 'page:' || "path" WHERE "source_key" IS NULL AND "path" IN ('/', '/solutions/data-centers', '/solutions/fire-suppression');
  UPDATE "_pages_v" AS version SET "version_source_key" = source."source_key" FROM "pages" AS source WHERE version."parent_id" = source."id" AND version."version_source_key" IS NULL AND source."source_key" IS NOT NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "categories_source_key_idx";
  DROP INDEX "_categories_v_version_version_source_key_idx";
  DROP INDEX "pages_source_key_idx";
  DROP INDEX "_pages_v_version_version_source_key_idx";
  DROP INDEX "articles_source_key_idx";
  DROP INDEX "_articles_v_version_version_source_key_idx";
  ALTER TABLE "categories" DROP COLUMN "source_key";
  ALTER TABLE "_categories_v" DROP COLUMN "version_source_key";
  ALTER TABLE "pages" DROP COLUMN "source_key";
  ALTER TABLE "_pages_v" DROP COLUMN "version_source_key";
  ALTER TABLE "articles" DROP COLUMN "source_key";
  ALTER TABLE "_articles_v" DROP COLUMN "version_source_key";`)
}
