import { useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useApiCache } from './useApiCache';

const DISTRICT_COLORS = {
  เมืองนครปฐม: '#0969da',
  นครชัยศรี: '#1a7f37',
  สามพราน: '#bf8700',
  ดอนตูม: '#8250df',
  บางเลน: '#cf222e',
  กำแพงแสน: '#0550ae',
  พุทธมณฑล: '#953800',
};

const FI_GROUP_TYPES = [
  {
    key: 'community_enterprise_groups',
    label: 'วิสาหกิจชุมชน',
    color: '#0969da',
  },
  { key: 'housewives_groups', label: 'กลุ่มแม่บ้านเกษตรกร', color: '#1a7f37' },
  { key: 'young_farmer_groups', label: 'กลุ่มยุวเกษตรกร', color: '#bf8700' },
  {
    key: 'career_promotion_groups',
    label: 'กลุ่มส่งเสริมอาชีพ',
    color: '#8250df',
  },
];

const countBy = (rows, key, limit = 12) =>
  Object.entries(
    rows.reduce((acc, row) => {
      const name = row[key] || 'ไม่ระบุ';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, value]) => ({
      name,
      value,
      color: DISTRICT_COLORS[name] || '#656d76',
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

const sum = (rows, key) =>
  rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);

const latestYearRows = (rows, yearKey = 'data_year') => {
  const years = rows.map((row) => Number(row[yearKey])).filter(Number.isFinite);
  if (!years.length) return { year: null, rows };
  const year = Math.max(...years);
  return { year, rows: rows.filter((row) => Number(row[yearKey]) === year) };
};

const makeDistrictStack = (configs) => {
  const map = {};
  configs.forEach(({ rows, key }) => {
    rows.forEach((row) => {
      const district = row.district || 'ไม่ระบุ';
      if (!map[district]) map[district] = { name: district, total: 0 };
      map[district][key] = (map[district][key] || 0) + 1;
      map[district].total += 1;
    });
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
};

export function useDevelopmentData() {
  const fetchDevelopmentData = async () => {
    const [ce, sf, ysf, career, housewife, young, fi, tourism, disasters] =
      await Promise.all([
        supabase.from('community_enterprises').select('district'),
        supabase.from('smart_farmer_sf').select('district, data_year'),
        supabase.from('young_smart_farmer_ysf').select('district, data_year'),
        supabase
          .from('agricultural_career_groups')
          .select('district, data_year, member_count, income'),
        supabase
          .from('housewife_farmer_groups')
          .select('district, year, member_count, income'),
        supabase
          .from('young_farmer_groups_detailed')
          .select('district, data_year, member_count, income'),
        supabase
          .from('farmer_institutes')
          .select(
            'total_groups, community_enterprise_groups, housewives_groups, young_farmer_groups, career_promotion_groups, village_farmers_count, smart_farmer_count, young_smart_farmer_count'
          ),
        supabase.from('agri_tourism').select('spot_type, district'),
        supabase
          .from('disasters')
          .select(
            'year, district, disaster_type, damaged_area, affected_farmers'
          ),
      ]);

    return {
      communityData: ce.data || [],
      sfData: sf.data || [],
      ysfData: ysf.data || [],
      careerData: career.data || [],
      housewifeData: housewife.data || [],
      youngGroupData: young.data || [],
      farmerInstData: fi.data || [],
      tourismData: tourism.data || [],
      disasterData: disasters.data || [],
    };
  };

  const { data, isLoading: loading } = useApiCache(
    'development-dashboard-data-v2',
    fetchDevelopmentData
  );
  const {
    communityData = [],
    sfData = [],
    ysfData = [],
    careerData = [],
    housewifeData = [],
    youngGroupData = [],
    farmerInstData = [],
    tourismData = [],
    disasterData = [],
  } = data || {};

  const activeSf = useMemo(() => latestYearRows(sfData), [sfData]);
  const activeYsf = useMemo(() => latestYearRows(ysfData), [ysfData]);
  const activeCareer = useMemo(() => latestYearRows(careerData), [careerData]);
  const activeHousewife = useMemo(
    () => latestYearRows(housewifeData, 'year'),
    [housewifeData]
  );
  const activeYoung = useMemo(
    () => latestYearRows(youngGroupData),
    [youngGroupData]
  );
  const activeDisasters = useMemo(
    () => latestYearRows(disasterData, 'year'),
    [disasterData]
  );

  const ceStats = useMemo(
    () => ({
      total: communityData.length,
      districts: countBy(communityData, 'district', 6).map((item) => [
        item.name,
        item.value,
      ]),
    }),
    [communityData]
  );

  const peopleStats = useMemo(
    () => ({
      sfTotal: activeSf.rows.length,
      sfYear: activeSf.year,
      ysfTotal: activeYsf.rows.length,
      ysfYear: activeYsf.year,
      sfDistricts: countBy(activeSf.rows, 'district', 8),
      ysfDistricts: countBy(activeYsf.rows, 'district', 8),
    }),
    [activeSf, activeYsf]
  );

  const groupStats = useMemo(() => {
    const careerMembers = sum(activeCareer.rows, 'member_count');
    const housewifeMembers = sum(activeHousewife.rows, 'member_count');
    const youngMembers = sum(activeYoung.rows, 'member_count');
    return {
      careerYear: activeCareer.year,
      housewifeYear: activeHousewife.year,
      youngYear: activeYoung.year,
      careerTotal: activeCareer.rows.length,
      housewifeTotal: activeHousewife.rows.length,
      youngTotal: activeYoung.rows.length,
      careerMembers,
      housewifeMembers,
      youngMembers,
      totalGroups:
        activeCareer.rows.length +
        activeHousewife.rows.length +
        activeYoung.rows.length,
      totalMembers: careerMembers + housewifeMembers + youngMembers,
      income:
        sum(activeCareer.rows, 'income') +
        sum(activeHousewife.rows, 'income') +
        sum(activeYoung.rows, 'income'),
    };
  }, [activeCareer, activeHousewife, activeYoung]);

  const fiStats = useMemo(() => {
    const total = sum(farmerInstData, 'total_groups');
    const ce = sum(farmerInstData, 'community_enterprise_groups');
    const housewives = sum(farmerInstData, 'housewives_groups');
    const youngGrp = sum(farmerInstData, 'young_farmer_groups');
    const career = sum(farmerInstData, 'career_promotion_groups');
    const village = sum(farmerInstData, 'village_farmers_count');
    const sf = sum(farmerInstData, 'smart_farmer_count');
    const ysf = sum(farmerInstData, 'young_smart_farmer_count');
    return {
      total,
      ce,
      housewives,
      young_grp: youngGrp,
      career,
      village,
      sf,
      ysf,
    };
  }, [farmerInstData]);

  const tourismStats = useMemo(
    () => ({
      total: tourismData.length,
      byType: countBy(tourismData, 'spot_type', 4).map((item) => [
        item.name,
        item.value,
      ]),
      byDistrict: countBy(tourismData, 'district', 8),
    }),
    [tourismData]
  );

  const disasterStats = useMemo(
    () => ({
      year: activeDisasters.year,
      total: activeDisasters.rows.length,
      damagedArea: sum(activeDisasters.rows, 'damaged_area'),
      affectedFarmers: sum(activeDisasters.rows, 'affected_farmers'),
      byType: countBy(activeDisasters.rows, 'disaster_type', 8),
    }),
    [activeDisasters]
  );

  const fiPie = useMemo(
    () =>
      FI_GROUP_TYPES.map((type) => ({
        name: type.label,
        value: sum(farmerInstData, type.key),
        color: type.color,
      }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value),
    [farmerInstData]
  );

  const groupComposition = useMemo(
    () =>
      [
        {
          name: 'วิสาหกิจชุมชน',
          value: communityData.length,
          color: '#0969da',
        },
        {
          name: 'กลุ่มส่งเสริมอาชีพ',
          value: activeCareer.rows.length,
          color: '#8250df',
        },
        {
          name: 'กลุ่มแม่บ้าน',
          value: activeHousewife.rows.length,
          color: '#1a7f37',
        },
        {
          name: 'กลุ่มยุวเกษตรกร',
          value: activeYoung.rows.length,
          color: '#bf8700',
        },
        {
          name: 'ท่องเที่ยวเกษตร',
          value: tourismData.length,
          color: '#0ea5e9',
        },
      ].filter((item) => item.value > 0),
    [
      communityData.length,
      activeCareer,
      activeHousewife,
      activeYoung,
      tourismData.length,
    ]
  );

  const districtStack = useMemo(
    () =>
      makeDistrictStack([
        { key: 'community', rows: communityData },
        { key: 'career', rows: activeCareer.rows },
        { key: 'housewife', rows: activeHousewife.rows },
        { key: 'young', rows: activeYoung.rows },
        { key: 'tourism', rows: tourismData },
        { key: 'disasters', rows: activeDisasters.rows },
      ]),
    [
      communityData,
      activeCareer,
      activeHousewife,
      activeYoung,
      tourismData,
      activeDisasters,
    ]
  );

  const peopleDistrictStack = useMemo(
    () =>
      makeDistrictStack([
        { key: 'sf', rows: activeSf.rows },
        { key: 'ysf', rows: activeYsf.rows },
      ]),
    [activeSf, activeYsf]
  );

  return {
    loading,
    ceStats,
    peopleStats,
    groupStats,
    fiStats,
    tourismStats,
    disasterStats,
    fiPie,
    groupComposition,
    districtStack,
    peopleDistrictStack,
    farmerInstTypes: FI_GROUP_TYPES,
  };
}
