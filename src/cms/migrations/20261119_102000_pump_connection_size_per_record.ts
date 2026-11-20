import { sql, type MigrateUpArgs } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    LOCK TABLE pump_selection_groups, pump_selection_records, _pump_selection_records_v IN SHARE ROW EXCLUSIVE MODE;

    WITH RECURSIVE local_sizes AS (
      SELECT id, parent_id,
        CASE WHEN jsonb_typeof(shared_characteristics -> 'connectionSize') = 'string'
          THEN NULLIF(btrim(shared_characteristics ->> 'connectionSize'), '') END AS size
      FROM pump_selection_groups
    ), resolved_sizes AS (
      SELECT id, size FROM local_sizes WHERE parent_id IS NULL
      UNION ALL
      SELECT child.id, COALESCE(child.size, parent.size)
      FROM local_sizes AS child
      JOIN resolved_sizes AS parent ON parent.id = child.parent_id
    ), updated_records AS (
      UPDATE pump_selection_records AS pump SET connection_size = folder.size
      FROM resolved_sizes AS folder
      WHERE pump.group_id = folder.id AND folder.size IS NOT NULL
        AND NULLIF(btrim(pump.connection_size), '') IS NULL
        AND NOT COALESCE(pump.characteristic_overrides ? 'connectionSize', false)
    )
    UPDATE _pump_selection_records_v AS version SET version_connection_size = folder.size
    FROM resolved_sizes AS folder
    WHERE version.version_group_id = folder.id AND folder.size IS NOT NULL
      AND NULLIF(btrim(version.version_connection_size), '') IS NULL
      AND NOT COALESCE(version.version_characteristic_overrides ? 'connectionSize', false);

    UPDATE pump_selection_groups
    SET shared_characteristics = shared_characteristics - 'connectionSize',
        shared_characteristics_draft = shared_characteristics_draft - 'connectionSize'
    WHERE shared_characteristics ? 'connectionSize' OR shared_characteristics_draft ? 'connectionSize';

    UPDATE pump_selection_records
    SET characteristic_overrides = characteristic_overrides - 'connectionSize'
    WHERE jsonb_typeof(characteristic_overrides) = 'array' AND characteristic_overrides ? 'connectionSize';

    UPDATE _pump_selection_records_v
    SET version_characteristic_overrides = version_characteristic_overrides - 'connectionSize'
    WHERE jsonb_typeof(version_characteristic_overrides) = 'array'
      AND version_characteristic_overrides ? 'connectionSize';
  `);
}

export async function down(): Promise<void> {
  // Older versions can read the same connection sizes stored directly on the articles.
}
