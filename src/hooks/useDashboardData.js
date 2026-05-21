import { useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useApiCache } from './useApiCache';
import { DISTRICT_LIST, allTables, normalizeDistrict, createEmptyDistrictStats } from './dashboard/config';
import {
    fetchPublicCertificationsCount,
    fetchChartData,
    fetchMapData,
    fetchCommunityData
} from './dashboard/dataFetchers';
import {
    selectEnterpriseStats,
    selectInstituteStats,
    selectLargePlotStats,
    selectAgriStats,
    selectCenterCounts,
    createAgriPieData,
    createLpPieData
} from './dashboard/selectors';

export { DISTRICT_LIST, allTables } from './dashboard/config';
export { createAgriPieData, createLpPieData } from './dashboard/selectors';

export const groupConfig = [
    { group: 'ยุทธศาสตร์ฯ', icon: '', color: '#1565c0', tables: [
        { table: 'agricultural_areas', label: 'พื้นที่การเกษตร' },
        { table: 'learning_centers', label: 'ศพก.' },
        { table: 'disasters', label: 'ภัยพิบัติ' },
    ]},
    { group: 'ส่งเสริมการผลิต', icon: '', color: '#43a047', tables: [
        { table: 'large_plots', label: 'แปลงใหญ่' },
        { table: 'certifications', label: 'มาตรฐาน GAP' },
        { table: 'crop_production', label: 'ผลผลิตพืช' },
    ]},
    { group: 'พัฒนาเกษตรกร', icon: '', color: '#6a1b9a', tables: [
        { table: 'community_enterprises', label: 'วิสาหกิจ' },
        { table: 'smart_farmers', label: 'เกษตรกรรุ่นใหม่' },
        { table: 'farmer_groups', label: 'กลุ่มแม่บ้าน' },
        { table: 'farmer_institutes', label: 'สถาบันเกษตรกร' },
        { table: 'agri_tourism', label: 'ท่องเที่ยวเกษตร' },
    ]},
    { group: 'อารักขาพืช', icon: '', color: '#e65100', tables: [
        { table: 'forecast_plots', label: 'แปลงพยากรณ์' },
        { table: 'pest_centers', label: 'ศจช.' },
        { table: 'soil_fertilizer_centers', label: 'ศดปช.' },
        { table: 'fire_hotspots', label: 'จุดเฝ้าระวัง PM2.5' },
    ]},
];

export const PIE_COLORS = [
    '#66bb6a', '#42a5f5', '#ffca28', '#ef5350', '#ab47bc',
    '#26a69a', '#ff7043', '#8d6e63', '#78909c', '#5c6bc0',
    '#ec407a', '#29b6f6', '#9ccc65', '#ffa726', '#7e57c2'
];

export { createEmptyDistrictStats, normalizeDistrict };

export function useDashboardData() {
    const fetchDashboardData = async () => {
        // 1. Load Stats Counts
        const publicCertificationsCount = await fetchPublicCertificationsCount();
        const statsResults = [];
        for (const tbl of allTables) {
            try {
                if (tbl.table === 'certifications' && publicCertificationsCount !== null) {
                    statsResults.push({ ...tbl, count: publicCertificationsCount });
                    continue;
                }

                const { count, error } = await supabase
                    .from(tbl.table)
                    .select('*', { count: 'exact', head: true });
                statsResults.push({ ...tbl, count: error ? 0 : (count ?? 0) });
            } catch {
                statsResults.push({ ...tbl, count: 0 });
            }
        }

        // 2. Load Chart Data
        const { agri: agriData, lp: lpData, fi: fiData } = await fetchChartData(supabase);

        // 3. Load Map Data
        const mapData = await fetchMapData(supabase);

        // 4. Load Community Data
        const {
            sfData, ceData, atData, lpData: rawLpData, instData, agriAreaData, lcData, pcData, sfcData
        } = await fetchCommunityData(supabase);

        // 5. Compute Stats
        const dStats = createEmptyDistrictStats();
        
        // Enterprise stats
        const { ceCount, distCounts, typeCounts, subdistrictCounts, ceList } = selectEnterpriseStats({ ceData, dStats });
        
        // Institute stats
        const { instituteStats } = selectInstituteStats({ instData: instData || [], dStats });
        
        // Large plot stats
        const { lpStats } = selectLargePlotStats({ lpData: rawLpData || [], dStats });
        
        // Agri stats
        const { agriStats } = selectAgriStats({ agriAreaData: agriAreaData || [], dStats });
        
        // Center counts
        selectCenterCounts({ lcData: lcData || [], pcData: pcData || [], sfcData: sfcData || [], dStats });

        return {
            stats: statsResults,
            agriData: agriData || [],
            largePlots: lpData || [],
            fiData: fiData || [],
            mapData,
            districtStats: dStats,
            smartFarmers: { list: sfData || [], count: sfData ? sfData.length : 0 },
            enterprises: { list: ceList || [], count: ceCount, typeCounts, subdistrictCounts },
            ceDistrictStats: distCounts,
            tourism: { list: atData || [], count: atData ? atData.length : 0 },
            instituteStats,
            lpStats,
            largePlotsList: rawLpData || [],
            agriStats
        };
    };

    const { data: dashData, isLoading: loading, error, refetch } = useApiCache('dashboard-overall-data-v2', fetchDashboardData);

    const {
        stats = [],
        agriData = [],
        largePlots = [],
        fiData = [],
        mapData = [],
        districtStats = {},
        smartFarmers = { list: [], count: 0 },
        enterprises = { list: [], count: 0 },
        ceDistrictStats = {},
        tourism = { list: [], count: 0 },
        instituteStats = {},
        lpStats = {},
        largePlotsList = [],
        agriStats = {}
    } = dashData || {};

    const agriPie = useMemo(() => createAgriPieData(agriData), [agriData]);
    const lpPie = useMemo(() => createLpPieData(largePlots), [largePlots]);

    return {
        stats, loading, error, refetch, agriData, largePlots, fiData,
        mapData, districtStats, smartFarmers, enterprises,
        ceDistrictStats, tourism, instituteStats, lpStats, agriStats,
        agriPie, lpPie, largePlotsList
    };
}
