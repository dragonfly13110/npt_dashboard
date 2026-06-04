import {
    TABLE_CONFIG as CHATBOT_TABLE_CONFIG,
    TABLE_SEARCH_COLS,
    DISTRICT_COLS,
    NUMERIC_COLS,
    CATEGORY_COLS,
} from '../utils/chatbotConstants';
import { getPublicSelectColumns, isPrivateColumn } from '../utils/dataPrivacy';

export const DASHBOARD_GROUPS = [
    {
        group: 'ยุทธศาสตร์ฯ',
        icon: '',
        color: '#1565c0',
        tables: [
            { table: 'agricultural_areas', label: 'พื้นที่การเกษตร' },
            { table: 'learning_centers', label: 'ศพก.' },
            { table: 'disasters', label: 'ภัยพิบัติ' },
        ],
    },
    {
        group: 'ส่งเสริมการผลิต',
        icon: '',
        color: '#43a047',
        tables: [
            { table: 'large_plots', label: 'แปลงใหญ่' },
            { table: 'certifications', label: 'มาตรฐาน GAP' },
            { table: 'crop_production', label: 'ผลผลิตพืช' },
        ],
    },
    {
        group: 'พัฒนาเกษตรกร',
        icon: '',
        color: '#6a1b9a',
        tables: [
            { table: 'community_enterprises', label: 'วิสาหกิจ' },
            { table: 'smart_farmers', label: 'เกษตรกรรุ่นใหม่' },
            { table: 'farmer_groups', label: 'กลุ่มแม่บ้าน' },
            { table: 'farmer_institutes', label: 'สถาบันเกษตรกร' },
            { table: 'agri_tourism', label: 'ท่องเที่ยวเกษตร' },
        ],
    },
    {
        group: 'อารักขาพืช',
        icon: '',
        color: '#e65100',
        tables: [
            { table: 'forecast_plots', label: 'แปลงพยากรณ์' },
            { table: 'ai_disease_forecasts', label: 'พยากรณ์โรค & แมลง (AI)' },
            { table: 'pest_centers', label: 'ศจช.' },
            { table: 'plant_doctors', label: 'หมอพืช' },
            { table: 'soil_fertilizer_centers', label: 'ศดปช.' },
            { table: 'fire_hotspots', label: 'จุดเฝ้าระวัง PM2.5' },
        ],
    },
];

export const TABLE_ROUTES = {
    agricultural_areas: '/dashboard/strategy/agricultural-areas',
    learning_centers: '/dashboard/strategy/learning-centers',
    disasters: '/dashboard/development/disasters',
    farmer_registry: '/dashboard/strategy/farmer-registry',
    large_plots: '/dashboard/production/large-plots',
    certifications: '/dashboard/production/certifications',
    crop_production: '/dashboard/production/crop-production',
    community_enterprises: '/dashboard/development/community-enterprises',
    smart_farmers: '/dashboard/development/smart-farmers',
    smart_farmer_sf: '/dashboard/development/smart-farmer-sf',
    young_smart_farmer_ysf: '/dashboard/development/young-smart-farmer-ysf',
    agricultural_career_groups: '/dashboard/development/agricultural-career-groups',
    farmer_groups: '/dashboard/development/farmer-groups',
    housewife_farmer_groups: '/dashboard/development/housewife-farmer-groups',
    young_farmer_groups: '/dashboard/development/young-farmer-groups',
    young_farmer_groups_detailed: '/dashboard/development/young-farmer-groups',
    farmer_institutes: '/dashboard/development/farmer-institutes',
    agri_tourism: '/dashboard/development/agri-tourism',
    forecast_plots: '/dashboard/protection/pest-outbreaks',
    ai_disease_forecasts: '/dashboard/protection/disease-forecast',
    pest_centers: '/dashboard/protection/pest-centers',
    plant_doctors: '/dashboard/protection/plant-doctors',
    soil_fertilizer_centers: '/dashboard/protection/soil-fertilizer',
    fire_hotspots: '/dashboard/protection/fire-hotspots',
    budgets: '/dashboard/admin/budgets',
};

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

export function getDatasetSelectColumns(table, {
    role = 'viewer',
    purpose = 'default',
    columns = [],
    extraColumns = [],
} = {}) {
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

    const safeColumns = purpose === 'ai'
        ? baseColumns.filter((dataIndex) => !isPrivateColumn(table, { dataIndex }))
        : baseColumns;
    const uniqueColumns = [...new Set(safeColumns)];

    if (purpose !== 'default' && role !== 'guest' && purpose !== 'ai') {
        return [...new Set(['id', 'created_at', 'updated_at', ...uniqueColumns])].join(',');
    }

    return getPublicSelectColumns(
        table,
        uniqueColumns.map((dataIndex) => ({ dataIndex })),
        role === 'guest' || purpose === 'ai' ? 'guest' : role,
        ['updated_at']
    );
}
