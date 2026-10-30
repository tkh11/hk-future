import * as migration_20261026_142827_initial from './20261026_142827_initial';
import * as migration_20261026_143904_page_sections from './20261026_143904_page_sections';
import * as migration_20261026_152029_seed_source_keys from './20261026_152029_seed_source_keys';
import * as migration_20261030_062308_legacy_catalog from './20261030_062308_legacy_catalog';

export const migrations = [
  {
    up: migration_20261026_142827_initial.up,
    down: migration_20261026_142827_initial.down,
    name: '20261026_142827_initial',
  },
  {
    up: migration_20261026_143904_page_sections.up,
    down: migration_20261026_143904_page_sections.down,
    name: '20261026_143904_page_sections',
  },
  {
    up: migration_20261026_152029_seed_source_keys.up,
    down: migration_20261026_152029_seed_source_keys.down,
    name: '20261026_152029_seed_source_keys',
  },
  {
    up: migration_20261030_062308_legacy_catalog.up,
    down: migration_20261030_062308_legacy_catalog.down,
    name: '20261030_062308_legacy_catalog'
  },
];
