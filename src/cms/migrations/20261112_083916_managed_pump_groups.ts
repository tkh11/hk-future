import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "pump_selection_groups" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"parent_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "pump_selection_records" ADD COLUMN "group_id" integer;
  ALTER TABLE "pump_selection_records" ADD COLUMN "connection_size" varchar;
  ALTER TABLE "_pump_selection_records_v" ADD COLUMN "version_group_id" integer;
  ALTER TABLE "_pump_selection_records_v" ADD COLUMN "version_connection_size" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pump_selection_groups_id" integer;
  ALTER TABLE "pump_selection_groups" ADD CONSTRAINT "pump_selection_groups_parent_id_pump_selection_groups_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pump_selection_groups"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pump_selection_groups_parent_idx" ON "pump_selection_groups" USING btree ("parent_id");
  CREATE INDEX "pump_selection_groups_updated_at_idx" ON "pump_selection_groups" USING btree ("updated_at");
  CREATE INDEX "pump_selection_groups_created_at_idx" ON "pump_selection_groups" USING btree ("created_at");
  CREATE UNIQUE INDEX "parent_slug_idx" ON "pump_selection_groups" USING btree ("parent_id","slug") NULLS NOT DISTINCT;
  ALTER TABLE "pump_selection_records" ADD CONSTRAINT "pump_selection_records_group_id_pump_selection_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."pump_selection_groups"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pump_selection_records_v" ADD CONSTRAINT "_pump_selection_records_v_version_group_id_pump_selection_groups_id_fk" FOREIGN KEY ("version_group_id") REFERENCES "public"."pump_selection_groups"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pump_selection_groups_fk" FOREIGN KEY ("pump_selection_groups_id") REFERENCES "public"."pump_selection_groups"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pump_selection_records_group_idx" ON "pump_selection_records" USING btree ("group_id");
  CREATE INDEX "_pump_selection_records_v_version_version_group_idx" ON "_pump_selection_records_v" USING btree ("version_group_id");
  CREATE INDEX "payload_locked_documents_rels_pump_selection_groups_id_idx" ON "payload_locked_documents_rels" USING btree ("pump_selection_groups_id");

  INSERT INTO "pump_selection_groups" ("title", "slug") VALUES ('HIP', 'hip');
  INSERT INTO "pump_selection_groups" ("title", "slug", "parent_id")
    SELECT 'HIP 32', 'hip-32', "id" FROM "pump_selection_groups" WHERE "slug" = 'hip' AND "parent_id" IS NULL;
  INSERT INTO "pump_selection_groups" ("title", "slug", "parent_id")
    SELECT 'SSVF', 'ssvf', "id" FROM "pump_selection_groups" WHERE "slug" = 'hip-32';

  UPDATE "pump_selection_records"
  SET "group_id" = (SELECT "id" FROM "pump_selection_groups" WHERE "slug" = 'ssvf'),
      "connection_size" = CASE WHEN "sku" = '77005422' THEN 'G 2″' ELSE 'DN 32' END
  WHERE "sku" IN ('77005422', '77005423', '77005403', '77015401', '77015402', '77025403', '77035404', '77045424', '77055425');
  UPDATE "_pump_selection_records_v" AS version
  SET "version_group_id" = record."group_id",
      "version_connection_size" = record."connection_size"
  FROM "pump_selection_records" AS record
  WHERE version."parent_id" = record."id" AND record."group_id" IS NOT NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pump_selection_records" DROP CONSTRAINT "pump_selection_records_group_id_pump_selection_groups_id_fk";
  
  ALTER TABLE "_pump_selection_records_v" DROP CONSTRAINT "_pump_selection_records_v_version_group_id_pump_selection_groups_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pump_selection_groups_fk";
  
  DROP INDEX "pump_selection_records_group_idx";
  DROP INDEX "_pump_selection_records_v_version_version_group_idx";
  DROP INDEX "payload_locked_documents_rels_pump_selection_groups_id_idx";
  ALTER TABLE "pump_selection_records" DROP COLUMN "group_id";
  ALTER TABLE "pump_selection_records" DROP COLUMN "connection_size";
  ALTER TABLE "_pump_selection_records_v" DROP COLUMN "version_group_id";
  ALTER TABLE "_pump_selection_records_v" DROP COLUMN "version_connection_size";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pump_selection_groups_id";
  DROP TABLE "pump_selection_groups";`)
}
