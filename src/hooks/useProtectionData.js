import { useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useApiCache } from './useApiCache';
import {
  ALL_DISTRICTS,
  LATEST_YEAR,
  filterRows,
} from '../pages/interactiveDashboard/filters';

const PLOT_TYPE_COLORS = {
  พื้นที่เสี่ยง: '#cf222e',
  'ศจช.': '#0969da',
  พื้นที่เฝ้าระวัง: '#bf8700',
  ไม่ระบุ: '#656d76',
};

const PC_GRADE_COLORS = {
  A: '#1a7f37',
  B: '#0969da',
  C: '#bf8700',
  ไม่ระบุ: '#656d76',
};

const SF_GRADE_COLORS = {
  'A+': '#055160',
  A: '#1a7f37',
  B: '#0969da',
  C: '#bf8700',
  ไม่ระบุ: '#656d76',
};

export function useProtectionData(
  filters = { district: ALL_DISTRICTS, year: LATEST_YEAR }
) {
  const fetchProtectionData = async () => {
    const [po, pc, pd, sf, fh] = await Promise.all([
      supabase.from('forecast_plots').select('crop_type, district, plot_type'),
      supabase
        .from('pest_centers')
        .select('main_crop_type, district, grade_level'),
      supabase.from('plant_doctors').select('district, subdistrict'),
      supabase
        .from('soil_fertilizer_centers')
        .select('main_crop_type, district, grade_level'),
      supabase.from('fire_hotspots').select('district, subdistrict'),
    ]);
    const error = [po, pc, pd, sf, fh].find((result) => result.error)?.error;
    if (error) throw error;

    return {
      pestOutbreaks: po.data || [],
      pestCenters: pc.data || [],
      plantDoctors: pd.data || [],
      soilFertilizer: sf.data || [],
      fireHotspots: fh.data || [],
    };
  };

  const {
    data,
    isLoading: loading,
    error,
    refetch,
  } = useApiCache('protection-dashboard-data', fetchProtectionData);
  const {
    pestOutbreaks: allPestOutbreaks = [],
    pestCenters: allPestCenters = [],
    plantDoctors: allPlantDoctors = [],
    soilFertilizer: allSoilFertilizer = [],
    fireHotspots: allFireHotspots = [],
  } = data || {
    pestOutbreaks: [],
    pestCenters: [],
    plantDoctors: [],
    soilFertilizer: [],
    fireHotspots: [],
  };
  const {
    pestOutbreaks,
    pestCenters,
    plantDoctors,
    soilFertilizer,
    fireHotspots,
  } = useMemo(
    () => ({
      pestOutbreaks: filterRows(allPestOutbreaks, filters, { yearKey: null }),
      pestCenters: filterRows(allPestCenters, filters, { yearKey: null }),
      plantDoctors: filterRows(allPlantDoctors, filters, { yearKey: null }),
      soilFertilizer: filterRows(allSoilFertilizer, filters, { yearKey: null }),
      fireHotspots: filterRows(allFireHotspots, filters, { yearKey: null }),
    }),
    [
      allPestOutbreaks,
      allPestCenters,
      allPlantDoctors,
      allSoilFertilizer,
      allFireHotspots,
      filters,
    ]
  );

  // ============================================
  // Pest Outbreaks Charts (Forecast Plots)
  // ============================================
  const poPie = useMemo(() => {
    const counts = {};
    pestOutbreaks.forEach((item) => {
      const crop = item.crop_type || 'ไม่ระบุ';
      counts[crop] = (counts[crop] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [pestOutbreaks]);

  const { poBar, poTypes } = useMemo(() => {
    const counts = {};
    const typeSet = new Set();
    pestOutbreaks.forEach((item) => {
      const dist = item.district || 'ไม่ระบุ';
      const type = item.plot_type || 'ไม่ระบุ';
      if (!counts[dist]) counts[dist] = { name: dist, total: 0 };
      counts[dist][type] = (counts[dist][type] || 0) + 1;
      counts[dist].total += 1;
      typeSet.add(type);
    });
    const sortedBarData = Object.values(counts).sort(
      (a, b) => b.total - a.total
    );
    const sortedTypes = Array.from(typeSet).sort((a, b) => {
      const order = {
        พื้นที่เสี่ยง: 1,
        'ศจช.': 2,
        พื้นที่เฝ้าระวัง: 3,
        ไม่ระบุ: 4,
      };
      return (order[a] || 9) - (order[b] || 9);
    });
    return { poBar: sortedBarData, poTypes: sortedTypes };
  }, [pestOutbreaks]);

  // ============================================
  // Pest Centers Charts
  // ============================================
  const pcPie = useMemo(() => {
    const counts = {};
    pestCenters.forEach((item) => {
      const crop = item.main_crop_type || 'ไม่ระบุ';
      counts[crop] = (counts[crop] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [pestCenters]);

  const { pcBar, pcTypes } = useMemo(() => {
    const counts = {};
    const typeSet = new Set();
    pestCenters.forEach((item) => {
      const dist = item.district || 'ไม่ระบุ';
      const grade = item.grade_level || 'ไม่ระบุ';
      if (!counts[dist]) counts[dist] = { name: dist, total: 0 };
      counts[dist][grade] = (counts[dist][grade] || 0) + 1;
      counts[dist].total += 1;
      typeSet.add(grade);
    });
    const sortedBarData = Object.values(counts).sort(
      (a, b) => b.total - a.total
    );
    const sortedTypes = Array.from(typeSet).sort((a, b) => {
      const order = { A: 1, B: 2, C: 3, ไม่ระบุ: 4 };
      return (order[a] || 9) - (order[b] || 9);
    });
    return { pcBar: sortedBarData, pcTypes: sortedTypes };
  }, [pestCenters]);

  // ============================================
  // Soil Fertilizer Centers Charts
  // ============================================
  const sfPie = useMemo(() => {
    const counts = {};
    soilFertilizer.forEach((item) => {
      const crop = item.main_crop_type || 'ไม่ระบุ';
      counts[crop] = (counts[crop] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [soilFertilizer]);

  const { sfBar, sfTypes } = useMemo(() => {
    const counts = {};
    const typeSet = new Set();
    soilFertilizer.forEach((item) => {
      const dist = item.district || 'ไม่ระบุ';
      const grade = item.grade_level || 'ไม่ระบุ';
      if (!counts[dist]) counts[dist] = { name: dist, total: 0 };
      counts[dist][grade] = (counts[dist][grade] || 0) + 1;
      counts[dist].total += 1;
      typeSet.add(grade);
    });
    const sortedBarData = Object.values(counts).sort(
      (a, b) => b.total - a.total
    );
    const sortedTypes = Array.from(typeSet).sort((a, b) => {
      const order = { 'A+': 1, A: 2, B: 3, C: 4, ไม่ระบุ: 5 };
      return (order[a] || 9) - (order[b] || 9);
    });
    return { sfBar: sortedBarData, sfTypes: sortedTypes };
  }, [soilFertilizer]);

  // ============================================
  // Plant Doctors Charts
  // ============================================
  const plantDoctorDistrictBar = useMemo(() => {
    const counts = {};
    plantDoctors.forEach((item) => {
      const dist = item.district || 'ไม่ระบุ';
      if (!counts[dist]) counts[dist] = { name: dist, total: 0 };
      counts[dist].total += 1;
    });
    return Object.values(counts).sort((a, b) => b.total - a.total);
  }, [plantDoctors]);

  // ============================================
  // Fire Hotspots Charts
  // ============================================
  const firePie = useMemo(() => {
    const map = {};
    fireHotspots.forEach((f) => {
      const d = f.district || f.subdistrict || 'ไม่ระบุ';
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [fireHotspots]);

  // ============================================
  // Summary Stats
  // ============================================
  const poStats = useMemo(() => {
    const typeMap = {};
    pestOutbreaks.forEach((item) => {
      const t = item.plot_type || 'ไม่ระบุ';
      typeMap[t] = (typeMap[t] || 0) + 1;
    });
    const getVal = (key) => typeMap[key] || 0;
    return {
      total: pestOutbreaks.length,
      risk: getVal('พื้นที่เสี่ยง'),
      pc: getVal('ศจช.'),
      watch: getVal('พื้นที่เฝ้าระวัง'),
    };
  }, [pestOutbreaks]);

  const pcStats = useMemo(() => {
    const gradeMap = {};
    pestCenters.forEach((item) => {
      const g = item.grade_level || 'ไม่ระบุ';
      gradeMap[g] = (gradeMap[g] || 0) + 1;
    });
    const getVal = (key) => gradeMap[key] || 0;
    return {
      total: pestCenters.length,
      a: getVal('A'),
      b: getVal('B'),
      c: getVal('C'),
    };
  }, [pestCenters]);

  const sfStats = useMemo(() => {
    const gradeMap = {};
    soilFertilizer.forEach((item) => {
      const g = item.grade_level || 'ไม่ระบุ';
      gradeMap[g] = (gradeMap[g] || 0) + 1;
    });
    const getVal = (key) => gradeMap[key] || 0;
    return {
      total: soilFertilizer.length,
      aplus: getVal('A+'),
      a: getVal('A'),
      b: getVal('B'),
      c: getVal('C'),
    };
  }, [soilFertilizer]);

  const plantDoctorStats = useMemo(() => {
    const districtSet = new Set();
    const subdistrictSet = new Set();
    plantDoctors.forEach((item) => {
      if (item.district) districtSet.add(item.district);
      if (item.subdistrict) subdistrictSet.add(item.subdistrict);
    });
    return {
      total: plantDoctors.length,
      districts: districtSet.size,
      subdistricts: subdistrictSet.size,
    };
  }, [plantDoctors]);

  return {
    loading,
    error,
    refetch,
    yearSupported: {
      forecast_plots: false,
      pest_centers: false,
      plant_doctors: false,
      soil_fertilizer_centers: false,
      fire_hotspots: false,
    },
    poPie,
    poBar,
    poTypes,
    poStats,
    pcPie,
    pcBar,
    pcTypes,
    pcStats,
    plantDoctorDistrictBar,
    plantDoctorStats,
    sfPie,
    sfBar,
    sfTypes,
    sfStats,
    firePie,
  };
}
