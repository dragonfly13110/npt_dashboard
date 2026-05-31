import { getDashboardGroups, getDashboardTables } from '../../domain/datasetCatalog';

/**
 * Dashboard configuration, constants, and helpers.
 * Dataset/table grouping now comes from the shared catalog so dashboard,
 * search, and chatbot do not drift as tables are added.
 */

export const DISTRICT_LIST = [
    'เมืองนครปฐม',
    'กำแพงแสน',
    'นครชัยศรี',
    'ดอนตูม',
    'บางเลน',
    'สามพราน',
    'พุทธมณฑล'
];

export const groupConfig = getDashboardGroups();

export const PIE_COLORS = [
    '#66bb6a', '#42a5f5', '#ffca28', '#ef5350', '#ab47bc',
    '#26a69a', '#ff7043', '#8d6e63', '#78909c', '#5c6bc0',
    '#ec407a', '#29b6f6', '#9ccc65', '#ffa726', '#7e57c2'
];

export const allTables = getDashboardTables();

export function createEmptyDistrictStats() {
    return DISTRICT_LIST.reduce((acc, d) => {
        acc[d] = {
            ce: 0, lp: 0, area: 0, house: 0,
            ricePi: 0, ricePrung: 0, field: 0, fruit: 0, veg: 0, flow: 0, herb: 0,
            lc: 0, pc: 0, sfc: 0,
            instHousewives: 0, instYoung: 0, instCareer: 0, instVillage: 0,
            sfSfCount: 0, ysfCount: 0,
            disasterFarmers: 0, disasterArea: 0,
            pestArea: 0, fireCount: 0,
            coconutArea: 0, coconutIncome: 0,
            certGap: 0
        };
        return acc;
    }, {});
}

export function normalizeDistrict(district) {
    if (!district) return district;
    return district === 'เมือง' ? 'เมืองนครปฐม' : String(district);
}
