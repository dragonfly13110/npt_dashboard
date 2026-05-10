import { describe, it, expect } from 'vitest';
import {
    selectEnterpriseStats,
    selectInstituteStats,
    selectLargePlotStats,
    selectAgriStats,
    createAgriPieData,
    createLpPieData
} from '../selectors';
import { createEmptyDistrictStats } from '../config';

describe('selectors', () => {
    describe('selectEnterpriseStats', () => {
        it('counts enterprises correctly', () => {
            const dStats = createEmptyDistrictStats();
            const ceData = { data: [{ district: 'เมืองนครปฐม' }, { district: 'กำแพงแสน' }, { district: 'เมืองนครปฐม' }] };
            
            const result = selectEnterpriseStats({ ceData, dStats });
            
            expect(result.ceCount).toBe(3);
            expect(result.dStats['เมืองนครปฐม'].ce).toBe(2);
            expect(result.dStats['กำแพงแสน'].ce).toBe(1);
        });

        it('handles empty data', () => {
            const dStats = createEmptyDistrictStats();
            const result = selectEnterpriseStats({ ceData: { data: [] }, dStats });
            
            expect(result.ceCount).toBe(0);
            expect(result.dStats['เมืองนครปฐม'].ce).toBe(0);
        });
    });

    describe('selectInstituteStats', () => {
        it('calculates totals from institute data', () => {
            const dStats = createEmptyDistrictStats();
            const instData = [
                { 
                    district: 'เมืองนครปฐม',
                    total_groups: 10, community_enterprise_groups: 2,
                    housewives_groups: 3, young_farmer_groups: 1,
                    career_promotion_groups: 1, village_farmers_count: 5,
                    smart_farmer_count: 2, young_smart_farmer_count: 1
                }
            ];
            
            const { instituteStats } = selectInstituteStats({ instData, dStats });
            
            expect(instituteStats.total).toBe(10);
            expect(instituteStats.ce).toBe(2);
            expect(instituteStats.housewives).toBe(3);
            expect(instituteStats.sf).toBe(2);
        });
    });

    describe('selectLargePlotStats', () => {
        it('categorizes commodity groups', () => {
            const dStats = createEmptyDistrictStats();
            const lpData = [
                { district: 'เมืองนครปฐม', member_count: 5, area_rai: 10, commodity_group: 'ข้าว' },
                { district: 'กำแพงแสน', member_count: 3, area_rai: 5, commodity_group: 'ผัก/สมุนไพร' },
                { district: 'เมืองนครปฐม', member_count: 2, area_rai: 8, commodity_group: 'ข้าว' },
            ];
            
            const { lpStats } = selectLargePlotStats({ lpData, dStats });
            
            expect(lpStats.total).toBe(3);
            expect(lpStats.rice).toBe(2);
            expect(lpStats.veg_herb).toBe(1);
            expect(lpStats.members).toBe(10);
            expect(lpStats.area).toBe(23);
        });
    });

    describe('selectAgriStats', () => {
        it('calculates agricultural statistics', () => {
            const dStats = createEmptyDistrictStats();
            const agriAreaData = [
                { 
                    district: 'เมืองนครปฐม',
                    farmer_households: 100,
                    total_area_rai: 500,
                    agri_crop_area_rai: 300,
                    rice_in_season_rai: 200,
                    rice_off_season_rai: 50,
                    field_crops_rai: 30,
                    horticulture_rai: 20,
                    fruit_trees_rai: 15,
                    vegetables_rai: 10,
                    flowers_rai: 5,
                    herbs_spices_rai: 3
                }
            ];
            
            const { agriStats } = selectAgriStats({ agriAreaData, dStats });
            
            expect(agriStats.households).toBe(100);
            expect(agriStats.total_area).toBe(500);
            expect(agriStats.crop_area).toBe(300);
            expect(agriStats.rice_pi).toBe(200);
        });
    });

    describe('createAgriPieData', () => {
        it('transforms agricultural data into pie chart format', () => {
            const agriData = [
                { rice_in_season_rai: 100, rice_off_season_rai: 50, field_crops_rai: 30, horticulture_rai: 20, fruit_trees_rai: 15, vegetables_rai: 10, flowers_rai: 5, herbs_spices_rai: 3 },
                { rice_in_season_rai: 80, rice_off_season_rai: 40, field_crops_rai: 25, horticulture_rai: 15, fruit_trees_rai: 10, vegetables_rai: 8, flowers_rai: 4, herbs_spices_rai: 2 },
            ];
            
            const result = createAgriPieData(agriData);
            
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toHaveProperty('name');
            expect(result[0]).toHaveProperty('value');
        });

        it('returns empty array for null/empty input', () => {
            expect(createAgriPieData(null)).toEqual([]);
            expect(createAgriPieData([])).toEqual([]);
        });
    });

    describe('createLpPieData', () => {
        it('groups by commodity_group', () => {
            const largePlots = [
                { commodity_group: 'ข้าว' },
                { commodity_group: 'ข้าว' },
                { commodity_group: 'ผัก/สมุนไพร' },
            ];
            
            const result = createLpPieData(largePlots);
            
            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('ข้าว');
            expect(result[0].value).toBe(2);
        });

        it('returns empty array for null/empty input', () => {
            expect(createLpPieData(null)).toEqual([]);
            expect(createLpPieData([])).toEqual([]);
        });
    });
});
