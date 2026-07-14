import { useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useApiCache } from './useApiCache';
import {
  DISTRICT_LIST,
  allTables,
  normalizeDistrict,
  createEmptyDistrictStats,
} from './dashboard/config';
import {
  fetchPublicCertificationsCount,
  fetchChartData,
  fetchMapData,
  fetchCommunityData,
} from './dashboard/dataFetchers';
import {
  selectEnterpriseStats,
  selectInstituteStats,
  selectLargePlotStats,
  selectAgriStats,
  selectCenterCounts,
  createAgriPieData,
  createLpPieData,
  selectEnrichedStats,
} from './dashboard/selectors';

export { DISTRICT_LIST, allTables, groupConfig } from './dashboard/config';
export { createAgriPieData, createLpPieData } from './dashboard/selectors';

export const PIE_COLORS = [
  '#66bb6a',
  '#42a5f5',
  '#ffca28',
  '#ef5350',
  '#ab47bc',
  '#26a69a',
  '#ff7043',
  '#8d6e63',
  '#78909c',
  '#5c6bc0',
  '#ec407a',
  '#29b6f6',
  '#9ccc65',
  '#ffa726',
  '#7e57c2',
];

export { createEmptyDistrictStats, normalizeDistrict };

export function useDashboardData() {
  const fetchDashboardData = async () => {
    // 1. Load Stats Counts
    const publicCertificationsCount = await fetchPublicCertificationsCount();
    const statsResults = [];
    for (const tbl of allTables) {
      try {
        if (
          tbl.table === 'certifications' &&
          publicCertificationsCount !== null
        ) {
          statsResults.push({ ...tbl, count: publicCertificationsCount });
          continue;
        }

        let query = supabase
          .from(tbl.table)
          .select('id', { count: 'exact', head: true });
        if (tbl.table === 'personnel') {
          query = query.neq('status', 'สำนักงาน');
        }
        const { count, error } = await query;
        statsResults.push({ ...tbl, count: error ? 0 : (count ?? 0) });
      } catch {
        statsResults.push({ ...tbl, count: 0 });
      }
    }

    // 2. Load Chart Data
    const {
      agri: agriData,
      lp: lpData,
      fi: fiData,
    } = await fetchChartData(supabase);

    // 3. Load Map Data
    const mapData = await fetchMapData(supabase);

    // 4. Load Community Data
    const {
      sfData,
      ceData,
      atData,
      lpData: rawLpData,
      instData,
      agriAreaData,
      lcData,
      pcData,
      sfcData,
      sfSfData,
      ysfData,
      disasterData,
      pestData,
      fireData,
      certData,
    } = await fetchCommunityData(supabase);

    // 5. Compute Stats
    const dStats = createEmptyDistrictStats();

    const { ceCount, distCounts, typeCounts, subdistrictCounts, ceList } =
      selectEnterpriseStats({ ceData, dStats });
    const { instituteStats } = selectInstituteStats({
      instData: instData || [],
      dStats,
    });
    const { lpStats } = selectLargePlotStats({
      lpData: rawLpData || [],
      dStats,
    });
    const { agriStats } = selectAgriStats({
      agriAreaData: agriAreaData || [],
      dStats,
    });

    selectCenterCounts({
      lcData: lcData || [],
      pcData: pcData || [],
      sfcData: sfcData || [],
      dStats,
    });
    selectEnrichedStats({
      sfSfData,
      ysfData,
      disasterData,
      pestData,
      fireData,
      certData,
      dStats,
    });

    return {
      stats: statsResults,
      agriData: agriData || [],
      largePlots: lpData || [],
      fiData: fiData || [],
      mapData,
      districtStats: dStats,
      smartFarmers: { list: sfData || [], count: sfData ? sfData.length : 0 },
      enterprises: {
        list: ceList || [],
        count: ceCount,
        typeCounts,
        subdistrictCounts,
      },
      ceDistrictStats: distCounts,
      tourism: { list: atData || [], count: atData ? atData.length : 0 },
      pestReportCount: pestData?.length || 0,
      instituteStats,
      lpStats,
      largePlotsList: rawLpData || [],
      agriStats,
    };
  };

  const {
    data: dashData,
    isLoading: loading,
    error,
    refetch,
  } = useApiCache('dashboard-overall-data-v3', fetchDashboardData);

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
    pestReportCount = 0,
    instituteStats = {},
    lpStats = {},
    largePlotsList = [],
    agriStats = {},
  } = dashData || {};

  const agriPie = useMemo(() => createAgriPieData(agriData), [agriData]);
  const lpPie = useMemo(() => createLpPieData(largePlots), [largePlots]);

  return {
    stats,
    loading,
    error,
    refetch,
    agriData,
    largePlots,
    fiData,
    mapData,
    districtStats,
    smartFarmers,
    enterprises,
    ceDistrictStats,
    tourism,
    pestReportCount,
    instituteStats,
    lpStats,
    agriStats,
    agriPie,
    lpPie,
    largePlotsList,
  };
}
