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
import { latestYearRows } from '../pages/interactiveDashboard/filters';

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
    const failedTables = [];
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
        if (error) {
          failedTables.push(tbl.table);
        }
        statsResults.push({ ...tbl, count: error ? 0 : (count ?? 0) });
      } catch {
        failedTables.push(tbl.table);
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
      failedTables,
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
  } = useApiCache('dashboard-overall-data-v4', fetchDashboardData);

  const {
    stats = [],
    failedTables = [],
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
    agriStats = {},
  } = dashData || {};

  const agriPie = useMemo(() => createAgriPieData(agriData), [agriData]);
  const lpPie = useMemo(() => createLpPieData(largePlots), [largePlots]);

  return {
    stats,
    failedTables,
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
    instituteStats,
    lpStats,
    agriStats,
    agriPie,
    lpPie,
    largePlotsList,
  };
}

export function useInteractiveOverviewData() {
  const fetchOverviewData = async () => {
    const [
      enterprises,
      largePlots,
      agriAreas,
      learning,
      pest,
      soil,
      gis,
      tourism,
    ] = await Promise.all([
      supabase
        .from('community_enterprises')
        .select('district', { count: 'exact' }),
      supabase
        .from('large_plots')
        .select('district,member_count,area_rai,commodity_group,year'),
      supabase
        .from('agricultural_areas')
        .select(
          'district,farmer_households,total_area_rai,agri_crop_area_rai,rice_in_season_rai,rice_off_season_rai,field_crops_rai,horticulture_rai,fruit_trees_rai,vegetables_rai,flowers_rai,herbs_spices_rai'
        )
        .neq('district', 'รวม'),
      supabase.from('learning_centers').select('district'),
      supabase.from('pest_centers').select('district'),
      supabase.from('soil_fertilizer_centers').select('district'),
      supabase
        .from('gis_areas')
        .select('area_name,district,latitude,longitude')
        .not('latitude', 'is', null)
        .limit(20),
      supabase
        .from('agri_tourism')
        .select('spot_name,district,spot_type,latitude,longitude'),
    ]);
    const error = [
      enterprises,
      largePlots,
      agriAreas,
      learning,
      pest,
      soil,
      gis,
      tourism,
    ].find((result) => result.error)?.error;
    if (error) throw error;

    return {
      enterprises: {
        data: enterprises.data || [],
        count: enterprises.count ?? enterprises.data?.length ?? 0,
      },
      largePlots: largePlots.data || [],
      agriAreas: agriAreas.data || [],
      learningCenters: learning.data || [],
      pestCenters: pest.data || [],
      soilFertilizerCenters: soil.data || [],
      gisAreas: gis.data || [],
      tourism: tourism.data || [],
    };
  };

  const {
    data = {},
    isLoading: loading,
    error,
    refetch,
  } = useApiCache('interactive-dashboard-overview-v1', fetchOverviewData);
  const overview = useMemo(() => {
    const districtStats = createEmptyDistrictStats();
    const enterpriseResult = selectEnterpriseStats({
      ceData: data.enterprises || { data: [], count: 0 },
      dStats: districtStats,
    });
    const currentLargePlots = latestYearRows(data.largePlots || [], 'year');
    const { lpStats } = selectLargePlotStats({
      lpData: currentLargePlots,
      dStats: districtStats,
    });
    const { agriStats } = selectAgriStats({
      agriAreaData: data.agriAreas || [],
      dStats: districtStats,
    });
    selectCenterCounts({
      lcData: data.learningCenters || [],
      pcData: data.pestCenters || [],
      sfcData: data.soilFertilizerCenters || [],
      dStats: districtStats,
    });
    const tourism = data.tourism || [];
    const mapData = [
      ...(data.gisAreas || [])
        .filter((row) => row.latitude && row.longitude)
        .map((row) => ({
          name: row.area_name,
          district: row.district,
          lat: row.latitude,
          lon: row.longitude,
          type: 'gis',
          typeLabel: 'พื้นที่ GIS',
        })),
      ...tourism
        .filter((row) => row.latitude && row.longitude)
        .slice(0, 20)
        .map((row) => ({
          name: row.spot_name,
          district: row.district,
          lat: row.latitude,
          lon: row.longitude,
          type: 'tourism',
          typeLabel: 'ท่องเที่ยวเกษตร',
        })),
    ];

    return {
      stats: [
        {
          table: 'learning_centers',
          count: data.learningCenters?.length || 0,
        },
        { table: 'pest_centers', count: data.pestCenters?.length || 0 },
        {
          table: 'soil_fertilizer_centers',
          count: data.soilFertilizerCenters?.length || 0,
        },
      ],
      mapData,
      districtStats,
      lpStats,
      agriStats,
      enterprises: {
        count: enterpriseResult.ceCount,
      },
      tourism: {
        list: tourism,
        count: tourism.length,
      },
      agriPie: createAgriPieData(data.agriAreas || []),
    };
  }, [data]);

  return { ...overview, loading, error, refetch };
}
