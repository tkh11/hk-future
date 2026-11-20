import * as migration_20261026_142827_initial from './20261026_142827_initial';
import * as migration_20261026_143904_page_sections from './20261026_143904_page_sections';
import * as migration_20261026_152029_seed_source_keys from './20261026_152029_seed_source_keys';
import * as migration_20261030_062308_legacy_catalog from './20261030_062308_legacy_catalog';
import * as migration_20261102_083958_store_cleanup from './20261102_083958_store_cleanup';
import * as migration_20261102_094209_studio_media_publication from './20261102_094209_studio_media_publication';
import * as migration_20261106_083624_pump_curves from './20261106_083624_pump_curves';
import * as migration_20261106_090343_pump_curve_diagram from './20261106_090343_pump_curve_diagram';
import * as migration_20261106_132228_pump_workbook_source from './20261106_132228_pump_workbook_source';
import * as migration_20261106_140425_pump_curve_public_scope from './20261106_140425_pump_curve_public_scope';
import * as migration_20261109_070811_pump_selection_report from './20261109_070811_pump_selection_report';
import * as migration_20261109_081748_pump_single_curve from './20261109_081748_pump_single_curve';
import * as migration_20261111_065423_independent_pump_selection from './20261111_065423_independent_pump_selection';
import * as migration_20261111_070743_retire_catalog_pump_fields from './20261111_070743_retire_catalog_pump_fields';
import * as migration_20261111_093048_pump_selection_system_types from './20261111_093048_pump_selection_system_types';
import * as migration_20261111_100103_pump_selection_system_options from './20261111_100103_pump_selection_system_options';
import * as migration_20261112_083916_managed_pump_groups from './20261112_083916_managed_pump_groups';
import * as migration_20261113_071305_pump_motor_voltage from './20261113_071305_pump_motor_voltage';
import * as migration_20261117_075011_pump_fluid_limits from './20261117_075011_pump_fluid_limits';
import * as migration_20261117_083855_pump_mounting from './20261117_083855_pump_mounting';
import * as migration_20261117_085731_remove_pump_viscosity_flag from './20261117_085731_remove_pump_viscosity_flag';
import * as migration_20261117_090827_pump_glycol_approvals from './20261117_090827_pump_glycol_approvals';
import * as migration_20261119_092306_pump_shared_characteristics from './20261119_092306_pump_shared_characteristics';
import * as migration_20261119_102000_pump_connection_size_per_record from './20261119_102000_pump_connection_size_per_record';

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
    name: '20261030_062308_legacy_catalog',
  },
  {
    up: migration_20261102_083958_store_cleanup.up,
    down: migration_20261102_083958_store_cleanup.down,
    name: '20261102_083958_store_cleanup',
  },
  {
    up: migration_20261102_094209_studio_media_publication.up,
    down: migration_20261102_094209_studio_media_publication.down,
    name: '20261102_094209_studio_media_publication',
  },
  {
    up: migration_20261106_083624_pump_curves.up,
    down: migration_20261106_083624_pump_curves.down,
    name: '20261106_083624_pump_curves',
  },
  {
    up: migration_20261106_090343_pump_curve_diagram.up,
    down: migration_20261106_090343_pump_curve_diagram.down,
    name: '20261106_090343_pump_curve_diagram',
  },
  {
    up: migration_20261106_132228_pump_workbook_source.up,
    down: migration_20261106_132228_pump_workbook_source.down,
    name: '20261106_132228_pump_workbook_source',
  },
  {
    up: migration_20261106_140425_pump_curve_public_scope.up,
    down: migration_20261106_140425_pump_curve_public_scope.down,
    name: '20261106_140425_pump_curve_public_scope',
  },
  {
    up: migration_20261109_070811_pump_selection_report.up,
    down: migration_20261109_070811_pump_selection_report.down,
    name: '20261109_070811_pump_selection_report',
  },
  {
    up: migration_20261109_081748_pump_single_curve.up,
    down: migration_20261109_081748_pump_single_curve.down,
    name: '20261109_081748_pump_single_curve',
  },
  {
    up: migration_20261111_065423_independent_pump_selection.up,
    down: migration_20261111_065423_independent_pump_selection.down,
    name: '20261111_065423_independent_pump_selection',
  },
  {
    up: migration_20261111_070743_retire_catalog_pump_fields.up,
    down: migration_20261111_070743_retire_catalog_pump_fields.down,
    name: '20261111_070743_retire_catalog_pump_fields',
  },
  {
    up: migration_20261111_093048_pump_selection_system_types.up,
    down: migration_20261111_093048_pump_selection_system_types.down,
    name: '20261111_093048_pump_selection_system_types',
  },
  {
    up: migration_20261111_100103_pump_selection_system_options.up,
    down: migration_20261111_100103_pump_selection_system_options.down,
    name: '20261111_100103_pump_selection_system_options',
  },
  {
    up: migration_20261112_083916_managed_pump_groups.up,
    down: migration_20261112_083916_managed_pump_groups.down,
    name: '20261112_083916_managed_pump_groups',
  },
  {
    up: migration_20261113_071305_pump_motor_voltage.up,
    down: migration_20261113_071305_pump_motor_voltage.down,
    name: '20261113_071305_pump_motor_voltage',
  },
  {
    up: migration_20261117_075011_pump_fluid_limits.up,
    down: migration_20261117_075011_pump_fluid_limits.down,
    name: '20261117_075011_pump_fluid_limits',
  },
  {
    up: migration_20261117_083855_pump_mounting.up,
    down: migration_20261117_083855_pump_mounting.down,
    name: '20261117_083855_pump_mounting',
  },
  {
    up: migration_20261117_085731_remove_pump_viscosity_flag.up,
    down: migration_20261117_085731_remove_pump_viscosity_flag.down,
    name: '20261117_085731_remove_pump_viscosity_flag',
  },
  {
    up: migration_20261117_090827_pump_glycol_approvals.up,
    down: migration_20261117_090827_pump_glycol_approvals.down,
    name: '20261117_090827_pump_glycol_approvals',
  },
  {
    up: migration_20261119_092306_pump_shared_characteristics.up,
    down: migration_20261119_092306_pump_shared_characteristics.down,
    name: '20261119_092306_pump_shared_characteristics'
  },
  {
    up: migration_20261119_102000_pump_connection_size_per_record.up,
    down: migration_20261119_102000_pump_connection_size_per_record.down,
    name: '20261119_102000_pump_connection_size_per_record',
  },
];
