import { type MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Keep the detailed curve as the single editable source. Excel curves must
  // never be replaced by digitised catalogue data. Payload runs this atomically.
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pump_curves c
        WHERE nullif(c.workbook_filename, '') IS NULL AND c.source_document_id IS NOT NULL
          AND (SELECT count(*) FROM pump_curves_diagram_points p WHERE p._parent_id = c.id) < 2
      ) THEN RAISE EXCEPTION 'Catalogue curve has no detailed points; reconcile before migration'; END IF;
      IF EXISTS (
        SELECT 1 FROM pump_curves c WHERE nullif(c.workbook_filename, '') IS NOT NULL
          AND EXISTS (SELECT 1 FROM pump_curves_diagram_points p WHERE p._parent_id = c.id)
      ) THEN RAISE EXCEPTION 'Excel curve also has diagram points; reconcile before migration'; END IF;
      IF EXISTS (
        SELECT 1 FROM _pump_curves_v v
        WHERE v.latest = true AND nullif(v.version_workbook_filename, '') IS NULL
          AND EXISTS (SELECT 1 FROM pump_curves_diagram_points p WHERE p._parent_id = v.parent_id)
          AND (SELECT count(*) FROM _pump_curves_v_version_diagram_points p WHERE p._parent_id = v.id) < 2
      ) THEN RAISE EXCEPTION 'Latest catalogue draft has no detailed points; reconcile before migration'; END IF;
    END $$;

    DELETE FROM pump_curves_points p USING pump_curves c
    WHERE p._parent_id = c.id AND nullif(c.workbook_filename, '') IS NULL
      AND EXISTS (SELECT 1 FROM pump_curves_diagram_points d WHERE d._parent_id = c.id);
    INSERT INTO pump_curves_points (_order, _parent_id, id, flow, head)
      SELECT p._order, p._parent_id, p.id, p.flow, p.head
      FROM pump_curves_diagram_points p JOIN pump_curves c ON c.id = p._parent_id
      WHERE nullif(c.workbook_filename, '') IS NULL;
    UPDATE pump_curves c SET source_page = c.diagram_page, updated_at = now()
      WHERE nullif(c.workbook_filename, '') IS NULL
        AND EXISTS (SELECT 1 FROM pump_curves_diagram_points p WHERE p._parent_id = c.id);

    -- Remove the retired dataset from version snapshots too, so restoring an
    -- old version cannot reintroduce it. Snapshots predating the detailed curve
    -- have no curve points and cannot pass publication validation.
    DELETE FROM _pump_curves_v_version_points p USING _pump_curves_v v
      WHERE p._parent_id = v.id AND nullif(v.version_workbook_filename, '') IS NULL
        AND EXISTS (SELECT 1 FROM pump_curves_diagram_points d WHERE d._parent_id = v.parent_id);
    INSERT INTO _pump_curves_v_version_points (_order, _parent_id, flow, head, _uuid)
      SELECT p._order, p._parent_id, p.flow, p.head, p._uuid
      FROM _pump_curves_v_version_diagram_points p JOIN _pump_curves_v v ON v.id = p._parent_id
      WHERE nullif(v.version_workbook_filename, '') IS NULL;
    UPDATE _pump_curves_v v SET version_source_page = v.version_diagram_page,
      version_updated_at = CASE WHEN v.latest THEN now() ELSE v.version_updated_at END,
      version__status = CASE
        WHEN (SELECT count(*) FROM _pump_curves_v_version_points p WHERE p._parent_id = v.id) < 2
          THEN 'draft'::enum__pump_curves_v_version_status ELSE v.version__status END
      WHERE nullif(v.version_workbook_filename, '') IS NULL
        AND EXISTS (SELECT 1 FROM pump_curves_diagram_points d WHERE d._parent_id = v.parent_id);

    DROP TABLE pump_curves_diagram_points;
    DROP TABLE _pump_curves_v_version_diagram_points;
    ALTER TABLE pump_curves DROP COLUMN diagram_page;
    ALTER TABLE _pump_curves_v DROP COLUMN version_diagram_page;
  `);
}

export async function down(): Promise<void> {
  throw new Error('Passport points were explicitly removed. Restore the private pre-migration database backup to reverse this data migration.');
}
