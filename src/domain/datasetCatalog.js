import {
  TABLE_CONFIG as CHATBOT_TABLE_CONFIG,
  TABLE_SEARCH_COLS,
  DISTRICT_COLS,
  NUMERIC_COLS,
  CATEGORY_COLS,
} from '../utils/chatbotConstants';
import { getPublicSelectColumns, isPrivateColumn } from '../utils/dataPrivacy';
import catalog from './datasetCatalog.json';

export const DASHBOARD_GROUPS = [
  {
    group: 'กลุ่มยุทธศาสตร์และสารสนเทศ',
    icon: '',
    color: '#1565c0',
    tables: [
      { table: 'farmer_registry', label: 'ทะเบียนเกษตรกร' },
      { table: 'agricultural_areas', label: 'พื้นที่การเกษตร' },
      { table: 'learning_centers', label: 'ศพก.' },
      { table: 'daily_weather', label: 'สภาพอากาศ/น้ำฝน' },
    ],
  },
  {
    group: 'กลุ่มส่งเสริมและพัฒนาการผลิต',
    icon: '',
    color: '#43a047',
    tables: [
      { table: 'large_plots', label: 'แปลงใหญ่' },
      { table: 'certifications', label: 'มาตรฐาน GAP' },
      { table: 'crop_production', label: 'ผลผลิตพืช' },
      { table: 'production_costs', label: 'ต้นทุนการผลิต' },
    ],
  },
  {
    group: 'กลุ่มส่งเสริมและพัฒนาเกษตรกร',
    icon: '',
    color: '#6a1b9a',
    tables: [
      { table: 'community_enterprises', label: 'วิสาหกิจชุมชน' },
      { table: 'smart_farmer_sf', label: 'เกษตรกรปราดเปรื่อง (SF)' },
      { table: 'young_smart_farmer_ysf', label: 'เกษตรกรรุ่นใหม่ (YSF)' },
      {
        table: 'agricultural_career_groups',
        label: 'กลุ่มส่งเสริมอาชีพการเกษตร',
      },
      { table: 'housewife_farmer_groups', label: 'กลุ่มแม่บ้านเกษตรกร' },
      { table: 'young_farmer_groups_detailed', label: 'กลุ่มยุวเกษตรกร' },
      { table: 'farmer_institutes', label: 'สถาบันเกษตรกร (รวม)' },
      { table: 'agri_tourism', label: 'ท่องเที่ยวเกษตร' },
      { table: 'disasters', label: 'ภัยพิบัติ' },
    ],
  },
  {
    group: 'กลุ่มอารักขาพืช',
    icon: '',
    color: '#e65100',
    tables: [
      { table: 'forecast_plots', label: 'แปลงพยากรณ์' },
      { table: 'ai_disease_forecasts', label: 'พยากรณ์โรค & แมลง (AI)' },
      { table: 'pest_centers', label: 'ศจช.' },
      { table: 'plant_doctors', label: 'หมอพืช' },
      { table: 'soil_fertilizer_centers', label: 'ศดปช.' },
      { table: 'soil_series', label: 'ชุดดิน' },
      { table: 'fire_hotspots', label: 'จุดเฝ้าระวัง PM2.5' },
    ],
  },
];

export const TABLE_ROUTES = catalog.TABLE_ROUTES;

export const DEPARTMENT_GROUP_MAP = {
  ฝ่ายบริหารทั่วไป: 'admin',
  กลุ่มยุทธศาสตร์และสารสนเทศ: 'strategy',
  กลุ่มส่งเสริมและพัฒนาการผลิต: 'production',
  กลุ่มส่งเสริมและพัฒนาเกษตรกร: 'development',
  กลุ่มอารักขาพืช: 'protection',
  ชุมชนเกษตรกร: 'community',
};

export const GROUP_TABLES = {
  admin: ['personnel', 'assets', 'budgets'],
  strategy: [
    'farmer_registry',
    'agricultural_areas',
    'gis_areas',
    'learning_centers',
    'disasters',
    'daily_weather',
  ],
  production: [
    'large_plots',
    'learning_centers',
    'certifications',
    'crop_production',
    'production_costs',
  ],
  development: [
    'community_enterprises',
    'smart_farmers',
    'smart_farmer_sf',
    'young_smart_farmer_ysf',
    'agricultural_career_groups',
    'farmer_groups',
    'housewife_farmer_groups',
    'young_farmer_groups',
    'young_farmer_groups_detailed',
    'farmer_institutes',
    'agri_tourism',
    'disasters',
  ],
  protection: [
    'forecast_plots',
    'ai_disease_forecasts',
    'pest_outbreaks',
    'pest_centers',
    'plant_doctors',
    'soil_fertilizer_centers',
    'soil_series',
    'biocontrol_stock',
    'fire_hotspots',
  ],
  community: ['forum_posts', 'forum_comments'],
};

export const PUBLIC_READ_GROUPS = [
  'admin',
  'strategy',
  'production',
  'development',
  'protection',
  'community',
];

export const PUBLIC_READ_TABLES = [
  ...new Set([
    ...Object.values(GROUP_TABLES).flat(),
    'agricultural_areas',
    'learning_centers',
    'pest_outbreaks',
    'soil_fertilizer_centers',
    'farmer_institutes',
    'daily_weather',
    'site_statistics',
    'forum_posts',
    'forum_comments',
  ]),
];

export const DISTRICT_WRITE_TABLES = ['personnel', 'budgets'];

export function getDepartmentGroupKey(department) {
  return department ? DEPARTMENT_GROUP_MAP[department] || null : null;
}

export function getGroupTables(groupKey) {
  return GROUP_TABLES[groupKey] || [];
}

export function canGroupAccessTable(groupKey, tableName) {
  return getGroupTables(groupKey).includes(tableName);
}

export function canGuestAccessGroup(groupKey) {
  return PUBLIC_READ_GROUPS.includes(groupKey);
}

export function canGuestAccessTable(tableName) {
  return PUBLIC_READ_TABLES.includes(tableName);
}

export function canDistrictEditorWriteTable(tableName) {
  return DISTRICT_WRITE_TABLES.includes(tableName);
}

const DASHBOARD_GROUP_BY_TABLE = DASHBOARD_GROUPS.reduce((acc, group) => {
  group.tables.forEach((table) => {
    acc[table.table] = {
      group: group.group,
      groupIcon: group.icon,
      groupColor: group.color,
      dashboardLabel: table.label,
    };
  });
  return acc;
}, {});

export const DATASET_CATALOG = Object.fromEntries(
  Object.entries(CHATBOT_TABLE_CONFIG).map(([table, config]) => [
    table,
    {
      table,
      ...config,
      route: TABLE_ROUTES[table] || '/dashboard',
      searchColumns: TABLE_SEARCH_COLS[table] || [],
      districtColumn: DISTRICT_COLS[table] || 'district',
      numericColumns: NUMERIC_COLS[table] || [],
      categoryColumns: CATEGORY_COLS[table] || [],
      ...(DASHBOARD_GROUP_BY_TABLE[table] || {}),
    },
  ])
);

export const TABLE_CONFIG = CHATBOT_TABLE_CONFIG;

export function getDataset(table) {
  return DATASET_CATALOG[table] || null;
}

export function listDatasetKeys() {
  return Object.keys(DATASET_CATALOG);
}

export function getDatasetRoute(table) {
  return getDataset(table)?.route || '/dashboard';
}

export function getSearchColumns(table, role = 'viewer') {
  const columns = getDataset(table)?.searchColumns || [];
  if (role !== 'guest') return columns;
  return columns.filter((dataIndex) => !isPrivateColumn(table, { dataIndex }));
}

export function getDistrictColumn(table) {
  return getDataset(table)?.districtColumn || 'district';
}

export function getNumericColumns(table) {
  return getDataset(table)?.numericColumns || [];
}

export function getCategoryColumns(table) {
  return getDataset(table)?.categoryColumns || [];
}

export function getDashboardGroups() {
  return DASHBOARD_GROUPS;
}

export function getDashboardTables() {
  return DASHBOARD_GROUPS.flatMap((group) =>
    group.tables.map((table) => ({
      ...table,
      group: group.group,
      groupIcon: group.icon,
      groupColor: group.color,
    }))
  );
}

export function getDatasetSelectColumns(
  table,
  { role = 'viewer', purpose = 'default', columns = [], extraColumns = [] } = {}
) {
  if (purpose === 'default' && role !== 'guest') return '*';

  const dataset = getDataset(table);
  const baseColumns = [
    dataset?.districtColumn,
    ...(dataset?.searchColumns || []),
    ...(dataset?.numericColumns || []),
    ...(dataset?.categoryColumns || []),
    ...columns,
    ...extraColumns,
  ].filter(Boolean);

  const safeColumns =
    purpose === 'ai'
      ? baseColumns.filter(
          (dataIndex) => !isPrivateColumn(table, { dataIndex })
        )
      : baseColumns;
  const uniqueColumns = [...new Set(safeColumns)];

  if (purpose !== 'default' && role !== 'guest' && purpose !== 'ai') {
    return [
      ...new Set(['id', 'created_at', 'updated_at', ...uniqueColumns]),
    ].join(',');
  }

  return getPublicSelectColumns(
    table,
    uniqueColumns.map((dataIndex) => ({ dataIndex })),
    role === 'guest' || purpose === 'ai' ? 'guest' : role,
    ['updated_at']
  );
}
