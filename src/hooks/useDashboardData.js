import { useMemo } from 'react';
import { supabase } from '../supabaseClient';

export const groupConfig = [
    { group: 'ยุทธศาสตร์ฯ', icon: '🎯', color: '#1565c0', tables: [
        { table: 'agricultural_areas', label: 'พื้นที่การเกษตร' },
        { table: 'learning_centers', label: 'ศพก.' },
        { table: 'disasters', label: 'ภัยพิบัติ' },
    ]},
    { group: 'ส่งเสริมการผลิต', icon: '🌱', color: '#43a047', tables: [
        { table: 'large_plots', label: 'แปลงใหญ่' },
        { table: 'certifications', label: 'มาตรฐาน GAP' },
        { table: 'crop_production', label: 'ผลผลิตพืช' },
    ]},
    { group: 'พัฒนาเกษตรกร', icon: '🤝', color: '#6a1b9a', tables: [
        { table: 'community_enterprises', label: 'วิสาหกิจ' },
        { table: 'smart_farmers', label: 'เกษตรกรรุ่นใหม่' },
        { table: 'farmer_groups', label: 'กลุ่มแม่บ้าน' },
        { table: 'farmer_institutes', label: 'สถาบันเกษตรกร' },
        { table: 'agri_tourism', label: 'ท่องเที่ยวเกษตร' },
    ]},
    { group: 'อารักขาพืช', icon: '🛡️', color: '#e65100', tables: [
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

export const allTables = groupConfig.flatMap(g => g.tables.map(t => ({ ...t, group: g.group, groupIcon: g.icon, groupColor: g.color })));

import { useApiCache } from './useApiCache';

export function useDashboardData() {
    
    const fetchDashboardData = async () => {
        // 1. Load Stats
        const statsResults = [];
        for (const tbl of allTables) {
            try {
                const { count, error } = await supabase
                    .from(tbl.table)
                    .select('*', { count: 'exact', head: true });
                statsResults.push({ ...tbl, count: error ? 0 : (count ?? 0) });
            } catch {
                statsResults.push({ ...tbl, count: 0 });
            }
        }

        // 2. Load Chart Data
        const [agri, lp, fi] = await Promise.all([
            supabase.from('agricultural_areas').select('rice_in_season_rai, rice_off_season_rai, field_crops_rai, horticulture_rai, fruit_trees_rai, vegetables_rai, flowers_rai, herbs_spices_rai'),
            supabase.from('large_plots').select('commodity_group'),
            supabase.from('farmer_institutes').select('community_enterprise_groups'),
        ]);

        // 3. Load Landing Data
        async function fetchWithCount(table, selectStr = 'id') {
            const { data, count } = await supabase.from(table).select(selectStr, { count: 'exact' }).order('id', { ascending: false }).limit(3);
            return { list: data || [], count: count || 0 };
        }

        const mapPts = [];
        const [{ data: gis }, { data: tourMap }] = await Promise.all([
            supabase.from('gis_areas').select('area_name, district, latitude, longitude').not('latitude', 'is', null).limit(20),
            supabase.from('agri_tourism').select('spot_name, district, latitude, longitude').not('latitude', 'is', null).limit(20)
        ]);

        (gis || []).forEach(r => {
            if (r.latitude && r.longitude) mapPts.push({ name: r.area_name, district: r.district, lat: r.latitude, lon: r.longitude, type: 'gis', typeLabel: 'พื้นที่ GIS' });
        });
        (tourMap || []).forEach(r => {
            if (r.latitude && r.longitude) mapPts.push({ name: r.spot_name, district: r.district, lat: r.latitude, lon: r.longitude, type: 'tourism', typeLabel: 'ท่องเที่ยวเกษตร' });
        });

        const dStats = {};
        const dists = ['เมืองนครปฐม', 'กำแพงแสน', 'นครชัยศรี', 'ดอนตูม', 'บางเลน', 'สามพราน', 'พุทธมณฑล'];
        dists.forEach(d => dStats[d] = {
            ce: 0, lp: 0, area: 0, house: 0,
            ricePi: 0, ricePrung: 0, field: 0, fruit: 0, veg: 0, flow: 0, herb: 0,
            lc: 0, pc: 0, sfc: 0,
            instHousewives: 0, instYoung: 0, instCareer: 0, instVillage: 0
        });

        const [sfData, ceData, atData, { data: lpData }, { data: instData }, { data: agriAreaData }, { data: lcData }, { data: pcData }, { data: sfcData }] = await Promise.all([
            fetchWithCount('smart_farmers', 'id, full_name, district, main_product'),
            supabase.from('community_enterprises').select('id, district', { count: 'exact' }),
            fetchWithCount('agri_tourism', 'id, spot_name, district, spot_type'),
            supabase.from('large_plots').select('district, member_count, area_rai, commodity_group'),
            supabase.from('farmer_institutes').select('district, housewives_groups, young_farmer_groups, career_promotion_groups, village_farmers_count, total_groups, community_enterprise_groups, smart_farmer_count, young_smart_farmer_count'),
            supabase.from('agricultural_areas').select('district, farmer_households, total_area_rai, agri_crop_area_rai, rice_in_season_rai, rice_off_season_rai, field_crops_rai, horticulture_rai, fruit_trees_rai, vegetables_rai, flowers_rai, herbs_spices_rai').neq('district', 'รวม'),
            supabase.from('learning_centers').select('district'),
            supabase.from('pest_centers').select('district'),
            supabase.from('soil_fertilizer_centers').select('district')
        ]);

        const ceList = ceData.data || [];
        const ceCount = ceData.count || ceList.length;
        const distCounts = {};
        ceList.forEach(r => {
            let d = r.district || 'ไม่ระบุ';
            if (d === 'เมือง') d = 'เมืองนครปฐม';
            distCounts[d] = (distCounts[d] || 0) + 1;
            if (dStats[d]) dStats[d].ce += 1;
        });

        let iTotal = 0, iCE = 0, iHouse = 0, iYoungGrp = 0, iCareer = 0, iVillage = 0, iSF = 0, iYSF = 0;
        (instData || []).forEach(row => {
            let d = row.district;
            if (d === 'เมือง') d = 'เมืองนครปฐม';
            if (dStats[d]) {
                dStats[d].instHousewives += Number(row.housewives_groups) || 0;
                dStats[d].instYoung += Number(row.young_farmer_groups) || 0;
                dStats[d].instCareer += Number(row.career_promotion_groups) || 0;
                dStats[d].instVillage += Number(row.village_farmers_count) || 0;
            }
            iTotal += Number(row.total_groups) || 0;
            iCE += Number(row.community_enterprise_groups) || 0;
            iHouse += Number(row.housewives_groups) || 0;
            iYoungGrp += Number(row.young_farmer_groups) || 0;
            iCareer += Number(row.career_promotion_groups) || 0;
            iVillage += Number(row.village_farmers_count) || 0;
            iSF += Number(row.smart_farmer_count) || 0;
            iYSF += Number(row.young_smart_farmer_count) || 0;
        });
        const instituteStats = { total: iTotal, ce: iCE, housewives: iHouse, young_grp: iYoungGrp, career: iCareer, village: iVillage, sf: iSF, ysf: iYSF };

        let lRice = 0, lVegH = 0, lFruit = 0, lField = 0, lOther = 0, lMems = 0, lArea = 0;
        (lpData || []).forEach(row => {
            lMems += Number(row.member_count) || 0;
            lArea += Number(row.area_rai) || 0;
            const g = row.commodity_group;
            if (g === 'ข้าว') lRice++;
            else if (g === 'ผัก/สมุนไพร') lVegH++;
            else if (g === 'ไม้ผล') lFruit++;
            else if (g === 'พืชไร่') lField++;
            else lOther++;
            let d = row.district;
            if (d === 'เมือง') d = 'เมืองนครปฐม';
            if (dStats[d]) dStats[d].lp += 1;
        });
        const lpStats = { total: lpData ? lpData.length : 0, rice: lRice, veg_herb: lVegH, fruit: lFruit, field_crop: lField, other: lOther, members: lMems, area: lArea };

        (lcData || []).forEach(row => { let d = row.district; if (d === 'เมือง') d = 'เมืองนครปฐม'; if (dStats[d]) dStats[d].lc++; });
        (pcData || []).forEach(row => { let d = row.district; if (d === 'เมือง') d = 'เมืองนครปฐม'; if (dStats[d]) dStats[d].pc++; });
        (sfcData || []).forEach(row => { let d = row.district; if (d === 'เมือง') d = 'เมืองนครปฐม'; if (dStats[d]) dStats[d].sfc++; });

        let aHouse = 0, aTotal = 0, aCrop = 0, aRicePi = 0, aRicePrung = 0, aField = 0, aHort = 0, aFruit = 0, aVeg = 0, aFlow = 0, aHerb = 0;
        (agriAreaData || []).forEach(row => {
            aHouse += Number(row.farmer_households) || 0;
            aTotal += Number(row.total_area_rai) || 0;
            aCrop += Number(row.agri_crop_area_rai) || 0;
            aRicePi += Number(row.rice_in_season_rai) || 0;
            aRicePrung += Number(row.rice_off_season_rai) || 0;
            aField += Number(row.field_crops_rai) || 0;
            aHort += Number(row.horticulture_rai) || 0;
            aFruit += Number(row.fruit_trees_rai) || 0;
            aVeg += Number(row.vegetables_rai) || 0;
            aFlow += Number(row.flowers_rai) || 0;
            aHerb += Number(row.herbs_spices_rai) || 0;
            let d = row.district;
            if (d === 'เมือง') d = 'เมืองนครปฐม';
            if (dStats[d]) {
                dStats[d].area += Number(row.agri_crop_area_rai) || 0;
                dStats[d].house += Number(row.farmer_households) || 0;
                dStats[d].ricePi += Number(row.rice_in_season_rai) || 0;
                dStats[d].ricePrung += Number(row.rice_off_season_rai) || 0;
                dStats[d].field += Number(row.field_crops_rai) || 0;
                dStats[d].fruit += Number(row.fruit_trees_rai) || 0;
                dStats[d].veg += Number(row.vegetables_rai) || 0;
                dStats[d].flow += Number(row.flowers_rai) || 0;
                dStats[d].herb += Number(row.herbs_spices_rai) || 0;
            }
        });
        const agriStats = { households: aHouse, total_area: aTotal, crop_area: aCrop, rice_pi: aRicePi, rice_prung: aRicePrung, field_crops: aField, hort: aHort, fruit: aFruit, veg: aVeg, flow: aFlow, herb: aHerb };

        return {
            stats: statsResults,
            agriData: agri.data || [],
            largePlots: lp.data || [],
            fiData: fi.data || [],
            mapData: mapPts,
            districtStats: dStats,
            smartFarmers: sfData,
            enterprises: { list: [], count: ceCount },
            ceDistrictStats: distCounts,
            tourism: atData,
            instituteStats,
            lpStats,
            agriStats
        };
    };

    const { data: dashData, isLoading: loading } = useApiCache('dashboard-overall-data', fetchDashboardData);

    const { stats, agriData, largePlots, fiData, mapData, districtStats, smartFarmers, enterprises, ceDistrictStats, tourism, instituteStats, lpStats, agriStats } = dashData || {
        stats: [], agriData: [], largePlots: [], fiData: [], mapData: [], districtStats: {}, smartFarmers: { list: [], count: 0 },
        enterprises: { list: [], count: 0 }, ceDistrictStats: {}, tourism: { list: [], count: 0 }, instituteStats: {}, lpStats: {}, agriStats: {}
    };

    const agriPie = useMemo(() => {
        if (!agriData.length) return [];
        const fields = [
            { key: 'rice_in_season_rai', label: 'ข้าวนาปี' },
            { key: 'rice_off_season_rai', label: 'ข้าวนาปรัง' },
            { key: 'field_crops_rai', label: 'พืชไร่' },
            { key: 'horticulture_rai', label: 'พืชสวน' },
            { key: 'fruit_trees_rai', label: 'ไม้ผล/ไม้ยืนต้น' },
            { key: 'vegetables_rai', label: 'พืชผัก' },
            { key: 'flowers_rai', label: 'ไม้ดอก/ไม้ประดับ' },
            { key: 'herbs_spices_rai', label: 'สมุนไพร' },
        ];
        return fields.map(f => ({
            name: f.label,
            value: agriData.reduce((sum, row) => sum + (Number(row[f.key]) || 0), 0)
        })).filter(d => d.value > 0);
    }, [agriData]);

    const lpPie = useMemo(() => {
        if (!largePlots.length) return [];
        const map = {};
        largePlots.forEach(p => {
            const cg = p.commodity_group || 'ไม่ระบุ';
            map[cg] = (map[cg] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [largePlots]);

    return {
        stats, loading, agriData, largePlots, fiData,
        mapData, districtStats, smartFarmers, enterprises,
        ceDistrictStats, tourism, instituteStats, lpStats, agriStats,
        agriPie, lpPie
    };
}
