import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "pump_curves_diagram_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"flow" numeric,
  	"head" numeric
  );
  
  CREATE TABLE "_pump_curves_v_version_diagram_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"flow" numeric,
  	"head" numeric,
  	"_uuid" varchar
  );
  
  ALTER TABLE "pump_curves" ADD COLUMN "diagram_page" numeric;
  ALTER TABLE "_pump_curves_v" ADD COLUMN "version_diagram_page" numeric;
  ALTER TABLE "pump_curves_diagram_points" ADD CONSTRAINT "pump_curves_diagram_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pump_curves"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pump_curves_v_version_diagram_points" ADD CONSTRAINT "_pump_curves_v_version_diagram_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pump_curves_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pump_curves_diagram_points_order_idx" ON "pump_curves_diagram_points" USING btree ("_order");
  CREATE INDEX "pump_curves_diagram_points_parent_id_idx" ON "pump_curves_diagram_points" USING btree ("_parent_id");
  CREATE INDEX "_pump_curves_v_version_diagram_points_order_idx" ON "_pump_curves_v_version_diagram_points" USING btree ("_order");
  CREATE INDEX "_pump_curves_v_version_diagram_points_parent_id_idx" ON "_pump_curves_v_version_diagram_points" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pump_curves_diagram_points" CASCADE;
  DROP TABLE "_pump_curves_v_version_diagram_points" CASCADE;
  ALTER TABLE "pump_curves" DROP COLUMN "diagram_page";
  ALTER TABLE "_pump_curves_v" DROP COLUMN "version_diagram_page";`)
}
