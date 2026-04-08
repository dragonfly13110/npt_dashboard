import { useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useApiCache } from './useApiCache';

export function useProductionData() {
    const fetchProductionData = async () => {
        const [lp, ct, cr] = await Promise.all([
            supabase.from('large_plots').select('*'),
            supabase.from('certifications').select('*'),
            supabase.from('crop_production').select('*'),
        ]);

        return {
            largePlots: lp.data || [],
            certs: ct.data || [],
            crops: cr.data || []
        };
    };

    const { data, isLoading: loading } = useApiCache('production-dashboard-data', fetchProductionData);

    const { largePlots, certs, crops } = data || { largePlots: [], certs: [], crops: [] };

    // ============================================
    // Large Plots Charts
    // ============================================
    const lpPie = useMemo(() => {
        const counts = {};
        largePlots.forEach(item => {
            const group = item.commodity_group || 'ไม่ระบุ';
            counts[group] = (counts[group] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [largePlots]);

    const { lpBar, lpGroups } = useMemo(() => {
        const counts = {};
        const groupSet = new Set();
        largePlots.forEach(item => {
            const dist = item.district || 'ไม่ระบุ';
            const group = item.commodity_group || 'ไม่ระบุ';
            if (!counts[dist]) counts[dist] = { name: dist, total: 0 };
            counts[dist][group] = (counts[dist][group] || 0) + 1;
            counts[dist].total += 1;
            groupSet.add(group);
        });
        const barDataArray = Object.values(counts).sort((a, b) => b.total - a.total);
        const barGroupsArray = Array.from(groupSet).sort();
        return { lpBar: barDataArray, lpGroups: barGroupsArray };
    }, [largePlots]);

    // ============================================
    // Certifications Charts
    // ============================================
    const top10Crops = useMemo(() => {
        const cropArea = {};
        certs.forEach(item => {
            const crop = item.crop_name || 'ไม่ระบุพืช';
            cropArea[crop] = (cropArea[crop] || 0) + (Number(item.area_rai) || 0);
        });
        return Object.entries(cropArea)
            .sort((a, b) => b[1] - a[1]) // Sort descending by Area Rai
            .slice(0, 10) // Take Top 10
            .map(entry => entry[0]);
    }, [certs]);

    const certPie = useMemo(() => {
        const cropFarmers = {};
        certs.forEach(item => {
            const crop = item.crop_name || 'ไม่ระบุพืช';
            if (!top10Crops.includes(crop)) return; 
            if (!cropFarmers[crop]) cropFarmers[crop] = new Set();
            if (item.farmer_name) cropFarmers[crop].add(item.farmer_name);
        });
        return top10Crops.map(name => ({
            name,
            value: cropFarmers[name] ? cropFarmers[name].size : 0
        })).filter(d => d.value > 0);
    }, [certs, top10Crops]);

    const { certBar, certGroups } = useMemo(() => {
        const districtCropFarmers = {};
        certs.forEach(item => {
            const dist = item.plot_district || 'ไม่ระบุอำเภอ';
            const crop = item.crop_name || 'ไม่ระบุพืช';
            const farmer = item.farmer_name;
            if (!top10Crops.includes(crop)) return;

            if (!districtCropFarmers[dist]) districtCropFarmers[dist] = { _totalSet: new Set() };
            if (!districtCropFarmers[dist][crop]) districtCropFarmers[dist][crop] = new Set();

            if (farmer) {
                districtCropFarmers[dist][crop].add(farmer);
                districtCropFarmers[dist]._totalSet.add(farmer);
            }
        });

        const barDataArray = Object.keys(districtCropFarmers).map(dist => {
            const obj = { name: dist, total: districtCropFarmers[dist]._totalSet.size };
            top10Crops.forEach(crop => {
                obj[crop] = districtCropFarmers[dist][crop] ? districtCropFarmers[dist][crop].size : 0;
            });
            return obj;
        }).sort((a, b) => b.total - a.total); 

        return { certBar: barDataArray, certGroups: top10Crops };
    }, [certs, top10Crops]);

    const certVolumeData = useMemo(() => {
        const cropVolume = {};
        certs.forEach(item => {
            const crop = item.crop_name || 'ไม่ระบุพืช';
            cropVolume[crop] = (cropVolume[crop] || 0) + (Number(item.production_volume_kg) || 0);
        });
        return Object.entries(cropVolume)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, value]) => ({ name, value }))
            .filter(d => d.value > 0);
    }, [certs]);

    const certExpireData = useMemo(() => {
        const yearCount = {};
        certs.forEach(item => {
            if (!item.exp_date) return;
            const parts = String(item.exp_date).split('/');
            const year = parts.length === 3 ? parts[2] : 'ไม่ระบุ';
            // Extract properly formatted year if possible
            if (year.length === 4 && !isNaN(year)) {
                 yearCount[year] = (yearCount[year] || 0) + 1;
            }
        });
        return Object.entries(yearCount)
            .sort((a, b) => a[0].localeCompare(b[0])) 
            .map(([year, count]) => ({ year, count }));
    }, [certs]);


    // ============================================
    // Crop Production Chart
    // ============================================
    const cropBar = useMemo(() => {
        const map = {};
        crops.forEach(c => {
            const key = c.district || c.crop_name || 'ไม่ระบุ';
            map[key] = (map[key] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [crops]);

    // ============================================
    // Summary Stats for Bento Cards
    // ============================================
    const lpStats = useMemo(() => {
        let members = 0, area = 0, rice = 0, veg = 0, fruit = 0, field = 0, other = 0;
        largePlots.forEach(row => {
            members += Number(row.member_count) || 0;
            area += Number(row.area_rai) || 0;
            const g = row.commodity_group;
            if (g === 'ข้าว') rice++;
            else if (g === 'ผัก/สมุนไพร') veg++;
            else if (g === 'ไม้ผล') fruit++;
            else if (g === 'พืชไร่') field++;
            else other++;
        });
        return { total: largePlots.length, rice, veg, fruit, field, other, members, area };
    }, [largePlots]);

    const certStats = useMemo(() => {
        let area = 0;
        const cropMap = {};
        certs.forEach(row => {
            area += Number(row.area_rai) || 0;
            const c = row.crop_name || 'ไม่ระบุ';
            cropMap[c] = (cropMap[c] || 0) + 1;
        });
        const prods = Object.entries(cropMap).sort((a,b) => b[1] - a[1]).slice(0, 4);
        return { total: certs.length, area, topCrops: prods };
    }, [certs]);

    const cropStats = useMemo(() => {
        const cropMap = {};
        crops.forEach(row => {
            const c = row.crop_name || 'ไม่ระบุ';
            cropMap[c] = (cropMap[c] || 0) + 1;
        });
        const prods = Object.entries(cropMap).sort((a,b) => b[1] - a[1]).slice(0, 4);
        return { total: crops.length, topCrops: prods };
    }, [crops]);

    return {
        loading,
        lpPie, lpBar, lpGroups, lpStats,
        certPie, certBar, certGroups, certVolumeData, certExpireData, certStats,
        cropBar, cropStats
    };
}
