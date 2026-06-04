import { normalizeDistrict } from './config';

// ==================== FACTORY HELPERS ====================
const createDistrictStats = () => ({
    ce: 0, lp: 0, area: 0, house: 0,
    ricePi: 0, ricePrung: 0, field: 0, fruit: 0, veg: 0, flow: 0, herb: 0,
    lc: 0, pc: 0, sfc: 0,
    instHousewives: 0, instYoung: 0, instCareer: 0, instVillage: 0,
    sfSfCount: 0, ysfCount: 0,
    disasterFarmers: 0, disasterArea: 0,
    pestArea: 0, fireCount: 0,
    coconutArea: 0, coconutIncome: 0,
    certGap: 0
});

function ensureDistrictStats(dStats) {
    return dStats;
}

// ==================== AGGREGATION SELECTORS ====================

export function selectEnterpriseStats({ ceData, dStats: inputStats }) {
    let dStats = inputStats; // mutate in place for now, could copy if needed
    const ceList = ceData.data || [];
    const ceCount = ceData.count || ceList.length;
    const distCounts = {};
    const typeCounts = {};
    const subdistrictCounts = {};
    
    ceList.forEach(row => {
        let d = normalizeDistrict(row.district || 'ไม่ระบุ');
        distCounts[d] = (distCounts[d] || 0) + 1;
        const type = row.enterprise_type || 'ไม่ระบุประเภท';
        const subdistrict = row.subdistrict || 'ไม่ระบุตำบล';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        subdistrictCounts[subdistrict] = (subdistrictCounts[subdistrict] || 0) + 1;
        if (dStats[d]) dStats[d].ce += 1;
    });

    return { dStats, ceCount, distCounts, typeCounts, subdistrictCounts, ceList };
}

export function selectInstituteStats({ instData, dStats }) {
    let iTotal = 0, iCE = 0, iHouse = 0, iYoungGrp = 0, iCareer = 0, iVillage = 0, iSF = 0, iYSF = 0;

    (instData || []).forEach(row => {
        let d = normalizeDistrict(row.district);
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

    return { dStats, instituteStats: { total: iTotal, ce: iCE, housewives: iHouse, young_grp: iYoungGrp, career: iCareer, village: iVillage, sf: iSF, ysf: iYSF } };
}

export function selectLargePlotStats({ lpData, dStats }) {
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
        let d = normalizeDistrict(row.district);
        if (dStats[d]) dStats[d].lp += 1;
    });

    return { dStats, lpStats: { total: lpData ? lpData.length : 0, rice: lRice, veg_herb: lVegH, fruit: lFruit, field_crop: lField, other: lOther, members: lMems, area: lArea } };
}

export function selectAgriStats({ agriAreaData, dStats }) {
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
        let d = normalizeDistrict(row.district);
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
            dStats[d].totalArea = (dStats[d].totalArea || 0) + (Number(row.total_area_rai) || 0);
            dStats[d].hort = (dStats[d].hort || 0) + (Number(row.horticulture_rai) || 0);
        }
    });

    return { dStats, agriStats: { households: aHouse, total_area: aTotal, crop_area: aCrop, rice_pi: aRicePi, rice_prung: aRicePrung, field_crops: aField, hort: aHort, fruit: aFruit, veg: aVeg, flow: aFlow, herb: aHerb } };
}

export function selectCenterCounts({ lcData, pcData, sfcData, dStats }) {
    (lcData || []).forEach(row => { let d = normalizeDistrict(row.district); if (dStats[d]) dStats[d].lc++; });
    (pcData || []).forEach(row => { let d = normalizeDistrict(row.district); if (dStats[d]) dStats[d].pc++; });
    (sfcData || []).forEach(row => { let d = normalizeDistrict(row.district); if (dStats[d]) dStats[d].sfc++; });
    return dStats;
}

// ==================== PIE CHART DATA ====================

export function createAgriPieData(agriData) {
    if (!agriData || agriData.length === 0) return [];
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
}

export function createLpPieData(largePlots) {
    if (!largePlots || largePlots.length === 0) return [];
    const map = {};
    largePlots.forEach(p => {
        const cg = p.commodity_group || 'ไม่ระบุ';
        map[cg] = (map[cg] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function selectEnrichedStats({ sfSfData, ysfData, disasterData, pestData, fireData, coconutData, certData, dStats }) {
    // 1. Smart Farmer SF count
    (sfSfData || []).forEach(row => {
        let d = normalizeDistrict(row.district);
        if (dStats[d]) dStats[d].sfSfCount += 1;
    });

    // 2. Young Smart Farmer YSF count
    (ysfData || []).forEach(row => {
        let d = normalizeDistrict(row.district);
        if (dStats[d]) dStats[d].ysfCount += 1;
    });

    // 3. Disasters
    (disasterData || []).forEach(row => {
        let d = normalizeDistrict(row.district);
        if (dStats[d]) {
            dStats[d].disasterArea += Number(row.damaged_area) || 0;
            dStats[d].disasterFarmers += Number(row.affected_farmers) || 0;
        }
    });

    // 4. Pest outbreaks
    (pestData || []).forEach(row => {
        let d = normalizeDistrict(row.district);
        if (dStats[d]) {
            dStats[d].pestArea += Number(row.outbreak_area) || 0;
        }
    });

    // 5. Fire hotspots
    (fireData || []).forEach(row => {
        let d = normalizeDistrict(row.district);
        if (dStats[d]) dStats[d].fireCount += 1;
    });

    // 6. Coconut aromatic surveys
    (coconutData || []).forEach(row => {
        let d = normalizeDistrict(row.district);
        if (dStats[d]) {
            dStats[d].coconutArea += Number(row.planted_area_rai) || 0;
            dStats[d].coconutIncome += Number(row.total_income) || 0;
        }
    });

    // 7. Certifications
    (certData || []).forEach(row => {
        let d = normalizeDistrict(row.plot_district || row.district);
        if (dStats[d]) {
            dStats[d].certGap += 1;
        }
    });

    return dStats;
}
