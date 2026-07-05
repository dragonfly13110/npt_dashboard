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
