import { useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useApiCache } from './useApiCache';

const DISTRICT_COLORS = {
    'เมืองนครปฐม': '#0969da',
    'นครชัยศรี': '#1a7f37',
    'สามพราน': '#bf8700',
    'ดอนตูม': '#8250df',
    'บางเลน': '#cf222e',
    'กำแพงแสน': '#0550ae',
    'พุทธมณฑล': '#953800',
};

const FI_GROUP_TYPES = [
    { key: 'community_enterprise_groups', label: 'วิสาหกิจชุมชน', color: '#0969da' },
    { key: 'housewives_groups', label: 'กลุ่มแม่บ้านเกษตรกร', color: '#1a7f37' },
    { key: 'young_farmer_groups', label: 'กลุ่มยุวเกษตรกร', color: '#bf8700' },
    { key: 'career_promotion_groups', label: 'กลุ่มส่งเสริมอาชีพ', color: '#8250df' }
];

export function useDevelopmentData() {
    const fetchDevelopmentData = async () => {
        const [ce, sf, fg, fi, at] = await Promise.all([
            supabase.from('community_enterprises').select('*'),
            supabase.from('smart_farmers').select('*'),
            supabase.from('farmer_groups').select('*'),
            supabase.from('farmer_institutes').select('*'),
            supabase.from('agri_tourism').select('*'),
        ]);

        return {
            communityData: ce.data || [],
            smartData: sf.data || [],
            farmerGroupData: fg.data || [],
            farmerInstData: fi.data || [],
            tourismData: at.data || [],
        };
    };

    const { data, isLoading: loading } = useApiCache('development-dashboard-data', fetchDevelopmentData);
    const { communityData, smartData, farmerInstData } = data || { communityData: [], smartData: [], farmerInstData: [], farmerGroupData: [], tourismData: [] };

    // ============================================
    // Community Enterprises Charts
    // ============================================
    const cePie = useMemo(() => {
        const counts = {};
        communityData.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            counts[dist] = (counts[dist] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value, color: DISTRICT_COLORS[name] || '#656d76' }))
            .sort((a, b) => b.value - a.value);
    }, [communityData]);

    const { ceBar, ceGroups } = useMemo(() => {
        const counts = {};
        const typeSet = new Set();
        communityData.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            const type = item.enterprise_type || 'ไม่ระบุ';
            if (!counts[dist]) counts[dist] = { name: dist, total: 0 };
            counts[dist][type] = (counts[dist][type] || 0) + 1;
            counts[dist].total += 1;
            typeSet.add(type);
        });
        const sortedBarData = Object.values(counts).sort((a, b) => b.total - a.total);
        const sortedTypeGroups = Array.from(typeSet).sort();
        return { ceBar: sortedBarData, ceGroups: sortedTypeGroups };
    }, [communityData]);

    // ============================================
    // Smart Farmers Chart
    // ============================================
    const sfBar = useMemo(() => {
        const map = {};
        smartData.forEach(s => {
            const d = s.district || 'ไม่ระบุ';
            map[d] = (map[d] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [smartData]);

    // ============================================
    // Farmer Institutes Charts
    // ============================================
    const fiPie = useMemo(() => {
        let sums = {
            community_enterprise_groups: 0,
            housewives_groups: 0,
            young_farmer_groups: 0,
            career_promotion_groups: 0
        };

        farmerInstData.forEach(item => {
            sums.community_enterprise_groups += Number(item.community_enterprise_groups) || 0;
            sums.housewives_groups += Number(item.housewives_groups) || 0;
            sums.young_farmer_groups += Number(item.young_farmer_groups) || 0;
            sums.career_promotion_groups += Number(item.career_promotion_groups) || 0;
        });

        return FI_GROUP_TYPES.map(type => ({
            name: type.label,
            value: sums[type.key],
            color: type.color
        })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
    }, [farmerInstData]);

    const fiBar = useMemo(() => {
        const districtMap = {};
        farmerInstData.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            if (!districtMap[dist]) {
                districtMap[dist] = {
                    name: dist,
                    community_enterprise_groups: 0,
                    housewives_groups: 0,
                    young_farmer_groups: 0,
                    career_promotion_groups: 0
                };
            }
            districtMap[dist].community_enterprise_groups += Number(item.community_enterprise_groups) || 0;
            districtMap[dist].housewives_groups += Number(item.housewives_groups) || 0;
            districtMap[dist].young_farmer_groups += Number(item.young_farmer_groups) || 0;
            districtMap[dist].career_promotion_groups += Number(item.career_promotion_groups) || 0;
        });

        return Object.values(districtMap).sort((a, b) => {
            const totalA = a.community_enterprise_groups + a.housewives_groups + a.young_farmer_groups + a.career_promotion_groups;
            const totalB = b.community_enterprise_groups + b.housewives_groups + b.young_farmer_groups + b.career_promotion_groups;
            return totalB - totalA;
        });
    }, [farmerInstData]);

    // ============================================
    // Summary Stats
    // ============================================
    const sfStats = useMemo(() => {
        const topProducts = {};
        smartData.forEach(item => {
            const prod = item.main_product || 'ไม่ระบุ';
            topProducts[prod] = (topProducts[prod] || 0) + 1;
        });
        const prods = Object.entries(topProducts).sort((a,b) => b[1] - a[1]).slice(0, 4);
        return { total: smartData.length, topProducts: prods };
    }, [smartData]);

    const fiStats = useMemo(() => {
        let iTotal = 0, iCE = 0, iHouse = 0, iYoungGrp = 0, iCareer = 0, iVillage = 0, iSF = 0, iYSF = 0;
        farmerInstData.forEach(row => {
            iTotal += Number(row.total_groups) || 0;
            iCE += Number(row.community_enterprise_groups) || 0;
            iHouse += Number(row.housewives_groups) || 0;
            iYoungGrp += Number(row.young_farmer_groups) || 0;
            iCareer += Number(row.career_promotion_groups) || 0;
            iVillage += Number(row.village_farmers_count) || 0;
            iSF += Number(row.smart_farmer_count) || 0;
            iYSF += Number(row.young_smart_farmer_count) || 0;
        });
        return { total: iTotal, ce: iCE, housewives: iHouse, young_grp: iYoungGrp, career: iCareer, village: iVillage, sf: iSF, ysf: iYSF };
    }, [farmerInstData]);

    const ceStats = useMemo(() => {
        const counts = {};
        communityData.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            counts[dist] = (counts[dist] || 0) + 1;
        });
        return {
           total: communityData.length,
           districts: Object.entries(counts).sort((a,b) => b[1] - a[1])
        };
    }, [communityData]);

    return {
        loading,
        cePie, ceBar, ceGroups, ceStats,
        sfBar, sfStats,
        fiPie, fiBar, fiStats
    };
}
