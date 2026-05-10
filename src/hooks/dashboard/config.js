/**
 * Dashboard configuration, constants, and helpers
 */

export const DISTRICT_LIST = [
    'เมืองนครปฐม',
    'กำแพงแสน',
    'นครชัยศริ',
    'ดอนตูม',
    'บางเลน',
    'สามพราน',
    'พุทธมณฑล'
];

export const groupConfig = [
    {
        group: 'ยุทธศาสตร์ฯ',
        icon: '',
        color: '#1565c0',
        tables: [
            { table: 'agricultural_areas', label: 'พื้นที่การเกษตร' },
            { table: 'learning_centers', label: 'ศพก.' },
            { table: 'disasters', label: 'ภัยพิบัติ' },
        ]
    },
    {
        group: 'ส่งเสริมการผลิต',
        icon: '',
        color: '#43a047',
        tables: [
            { table: 'large_plots', label: 'แปลงใหญ่' },
            { table: 'certifications', label: 'มาตรฐาน GAP' },
            { table: 'crop_production', label: 'ผลผลิตพืช' },
        ]
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
        ]
    },
    {
        group: 'อารักขาพืช',
        icon: '',
        color: '#e65100',
        tables: [
            { table: 'forecast_plots', label: 'แปลงพยากรณ์' },
            { table: 'pest_centers', label: 'ศจช.' },
            { table: 'soil_fertilizer_centers', label: 'ศดปช.' },
            { table: 'fire_hotspots', label: 'จุดเฝ้าระวัง PM2.5' },
        ]
    },
];

export const PIE_COLORS = [
    '#66bb6a', '#42a5f5', '#ffca28', '#ef5350', '#ab47bc',
    '#26a69a', '#ff7043', '#8d6e63', '#78909c', '#5c6bc0',
    '#ec407a', '#29b6f6', '#9ccc65', '#ffa726', '#7e57c2'
];

export const allTables = groupConfig.flatMap(g =>
    g.tables.map(t => ({
        ...t,
        group: g.group,
        groupIcon: g.icon,
        groupColor: g.color
    }))
);

/**
 * Create an empty district stats object
 */
export function createEmptyDistrictStats() {
    return DISTRICT_LIST.reduce((acc, d) => {
        acc[d] = {
            ce: 0, lp: 0, area: 0, house: 0,
            ricePi: 0, ricePrung: 0, field: 0, fruit: 0, veg: 0, flow: 0, herb: 0,
            lc: 0, pc: 0, sfc: 0,
            instHousewives: 0, instYoung: 0, instCareer: 0, instVillage: 0
        };
        return acc;
    }, {});
}

/**
 * Normalize district name (handle 'เมือง' -> 'เมืองนครปฐม')
 */
export function normalizeDistrict(district) {
    if (!district) return district;
    return district === 'เมือง' ? 'เมืองนครปฐม' : String(district);
}

