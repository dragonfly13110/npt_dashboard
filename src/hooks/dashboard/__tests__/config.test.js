import { describe, it, expect } from 'vitest';
import { DISTRICT_LIST, groupConfig, PIE_COLORS, allTables, createEmptyDistrictStats, normalizeDistrict } from '../config';

describe('config', () => {
    describe('DISTRICT_LIST', () => {
        it('contains 7 districts', () => {
            expect(DISTRICT_LIST).toHaveLength(7);
            expect(DISTRICT_LIST).toContain('เมืองนครปฐม');
            expect(DISTRICT_LIST).toContain('กำแพงแสน');
        });
    });

    describe('groupConfig', () => {
        it('has 4 groups', () => {
            expect(groupConfig).toHaveLength(4);
        });

        it('each group has required fields', () => {
            groupConfig.forEach(group => {
                expect(group).toHaveProperty('group');
                expect(group).toHaveProperty('icon');
                expect(group).toHaveProperty('color');
                expect(group).toHaveProperty('tables');
                expect(Array.isArray(group.tables)).toBe(true);
                group.tables.forEach(table => {
                    expect(table).toHaveProperty('table');
                    expect(table).toHaveProperty('label');
                });
            });
        });

        it('produces allTables with extended properties', () => {
            expect(allTables.length).toBeGreaterThan(0);
            allTables.forEach(table => {
                expect(table).toHaveProperty('group');
                expect(table).toHaveProperty('groupIcon');
                expect(table).toHaveProperty('groupColor');
            });
        });
    });

    describe('PIE_COLORS', () => {
        it('is an array of color strings', () => {
            expect(Array.isArray(PIE_COLORS)).toBe(true);
            PIE_COLORS.forEach(color => {
                expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
            });
        });
    });

    describe('createEmptyDistrictStats', () => {
        it('creates stats object for all districts', () => {
            const stats = createEmptyDistrictStats();
            expect(Object.keys(stats)).toHaveLength(DISTRICT_LIST.length);
            DISTRICT_LIST.forEach(district => {
                expect(stats).toHaveProperty(district);
                expect(stats[district]).toHaveProperty('ce', 0);
                expect(stats[district]).toHaveProperty('lp', 0);
                expect(stats[district]).toHaveProperty('area', 0);
            });
        });

        it('has correct property keys', () => {
            const stats = createEmptyDistrictStats();
            const expectedKeys = ['ce', 'lp', 'area', 'house', 'ricePi', 'ricePrung', 
                'field', 'fruit', 'veg', 'flow', 'herb', 'lc', 'pc', 'sfc',
                'instHousewives', 'instYoung', 'instCareer', 'instVillage'];
            const firstDistrict = stats[DISTRICT_LIST[0]];
            expectedKeys.forEach(key => {
                expect(firstDistrict).toHaveProperty(key, 0);
            });
        });
    });

    describe('normalizeDistrict', () => {
        it('converts "เมือง" to "เมืองนครปฐม"', () => {
            expect(normalizeDistrict('เมือง')).toBe('เมืองนครปฐม');
        });

        it('keeps other districts unchanged', () => {
            expect(normalizeDistrict('กำแพงแสน')).toBe('กำแพงแสน');
        });

        it('handles undefined input', () => {
            expect(normalizeDistrict(undefined)).toBe(undefined);
        });
    });
});
