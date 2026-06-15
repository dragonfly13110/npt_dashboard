export const IMPORT_MODES = {
  append: 'append',
  upsert: 'upsert',
  replaceScope: 'replaceScope',
};

export const TABLE_IMPORT_POLICIES = {
  smart_farmer_sf: {
    uniqueFields: ['data_year', 'record_code'],
    replaceScopeFields: ['data_year'],
  },
  young_smart_farmer_ysf: {
    uniqueFields: ['data_year', 'record_code'],
    replaceScopeFields: ['data_year'],
  },
  young_farmer_groups_detailed: {
    uniqueFields: ['data_year', 'record_code'],
    replaceScopeFields: ['data_year'],
  },
  agricultural_career_groups: {
    uniqueFields: ['data_year', 'record_code'],
    replaceScopeFields: ['data_year'],
  },
  farmer_registry: {
    uniqueFields: ['district', 'data_year'],
    replaceScopeFields: ['data_year'],
  },
};

export function getImportPolicy(tableName, override = null) {
  return {
    uniqueFields: [],
    replaceScopeFields: [],
    ...(TABLE_IMPORT_POLICIES[tableName] || {}),
    ...(override || {}),
  };
}
