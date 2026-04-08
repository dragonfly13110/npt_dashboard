import { useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useApiCache } from './useApiCache';

const PLOT_TYPE_COLORS = {
    'พื้นที่เสี่ยง': '#cf222e',
    'ศจช.': '#0969da',
    'พื้นที่เฝ้าระวัง': '#bf8700',
    'ไม่ระบุ': '#656d76',
};

const PC_GRADE_COLORS = {
    'A': '#1a7f37',
    'B': '#0969da',
    'C': '#bf8700',
    'ไม่ระบุ': '#656d76',
};

const SF_GRADE_COLORS = {
    'A+': '#055160',
    'A': '#1a7f37',
    'B': '#0969da',
    'C': '#bf8700',
    'ไม่ระบุ': '#656d76',
};

export function useProtectionData() {
    const fetchProtectionData = async () => {
        const [po, pc, sf, fh] = await Promise.all([
            supabase.from('forecast_plots').select('*'),
            supabase.from('pest_centers').select('*'),
            supabase.from('soil_fertilizer_centers').select('*'),
            supabase.from('fire_hotspots').select('*'),
        ]);

        return {
            pestOutbreaks: po.data || [],
            pestCenters: pc.data || [],
            soilFertilizer: sf.data || [],
            fireHotspots: fh.data || []
        };
    };

    const { data, isLoading: loading } = useApiCache('protection-dashboard-data', fetchProtectionData);
    const { pestOutbreaks, pestCenters, soilFertilizer, fireHotspots } = data || { pestOutbreaks: [], pestCenters: [], soilFertilizer: [], fireHotspots: [] };

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
        const sortedBarData = Object.values(counts).sort((a, b) => b.total - a.total);
        const sortedTypes = Array.from(typeSet).sort((a, b) => {
            const order = { 'พื้นที่เสี่ยง': 1, 'ศจช.': 2, 'พื้นที่เฝ้าระวัง': 3, 'ไม่ระบุ': 4 };
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
        const sortedBarData = Object.values(counts).sort((a, b) => b.total - a.total);
        const sortedTypes = Array.from(typeSet).sort((a, b) => {
            const order = { 'A': 1, 'B': 2, 'C': 3, 'ไม่ระบุ': 4 };
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
        const sortedBarData = Object.values(counts).sort((a, b) => b.total - a.total);
        const sortedTypes = Array.from(typeSet).sort((a, b) => {
            const order = { 'A+': 1, 'A': 2, 'B': 3, 'C': 4, 'ไม่ระบุ': 5 };
            return (order[a] || 9) - (order[b] || 9);
        });
        return { sfBar: sortedBarData, sfTypes: sortedTypes };
    }, [soilFertilizer]);

    // ============================================
    // Fire Hotspots Charts
    // ============================================
    const firePie = useMemo(() => {
        const map = {};
        fireHotspots.forEach((f) => {
            const d = f.district || f.subdistrict || 'ไม่ระบุ';
            map[d] = (map[d] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
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
            watch: getVal('พื้นที่เฝ้าระวัง') 
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
            c: getVal('C') 
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
            c: getVal('C') 
        };
    }, [soilFertilizer]);

    return {
        loading,
        poPie, poBar, poTypes, poStats,
        pcPie, pcBar, pcTypes, pcStats,
        sfPie, sfBar, sfTypes, sfStats,
        firePie
    };
}
