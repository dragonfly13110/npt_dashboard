import { describe, expect, it } from 'vitest';

import {
    aggregateDistrictData,
    aggregateZoneData,
    parseSoilResponse,
} from './soilMoistureUtils';

function createMockResponse(base) {
    return {
        hourly: {
            time: [
                '2026-04-09T23:00',
                '2026-04-10T00:00',
                '2026-04-10T01:00',
                '2026-04-10T02:00',
            ],
            soil_moisture_0_to_1cm: [base, base + 0.01, base + 0.02, base + 0.03],
            soil_moisture_3_to_9cm: [base + 0.04, base + 0.05, base + 0.06, base + 0.07],
            soil_moisture_9_to_27cm: [base + 0.08, base + 0.09, base + 0.10, base + 0.11],
            soil_moisture_27_to_81cm: [base + 0.12, base + 0.13, base + 0.14, base + 0.15],
            soil_temperature_0cm: [30, 31, 32, 33],
            soil_temperature_18cm: [27, 28, 29, 30],
        },
    };
}

describe('soilMoistureUtils', () => {
    it('averages multiple points into one zone summary', () => {
        const pointA = parseSoilResponse(createMockResponse(0.10), new Date('2026-04-10T01:15:00+07:00'));
        const pointB = parseSoilResponse(createMockResponse(0.20), new Date('2026-04-10T01:15:00+07:00'));

        const zone = aggregateZoneData('นาข้าว', [pointA, pointB]);

        expect(zone.pointCount).toBe(2);
        expect(zone.current.soil_moisture_0_to_1cm).toBeCloseTo(0.17, 5);
        expect(zone.current.soil_moisture_9_to_27cm).toBeCloseTo(0.25, 5);
        expect(zone.current.soil_temp_surface).toBeCloseTo(32, 5);
        expect(zone.trend).toHaveLength(2);
        expect(zone.trend[0].value).toBeCloseTo(0.17, 5);
        expect(zone.history).toHaveLength(1);
        expect(zone.history[0].surface).toBeCloseTo(0.15, 5);
    });

    it('averages all zones into one district summary', () => {
        const riceZone = aggregateZoneData('นาข้าว', [
            parseSoilResponse(createMockResponse(0.10), new Date('2026-04-10T01:15:00+07:00')),
            parseSoilResponse(createMockResponse(0.20), new Date('2026-04-10T01:15:00+07:00')),
        ]);
        const orchardZone = aggregateZoneData('สวน', [
            parseSoilResponse(createMockResponse(0.30), new Date('2026-04-10T01:15:00+07:00')),
        ]);

        const district = aggregateDistrictData([riceZone, orchardZone]);

        expect(district.zoneCount).toBe(2);
        expect(district.pointCount).toBe(3);
        expect(district.current.soil_moisture_0_to_1cm).toBeCloseTo((0.17 + 0.32) / 2, 5);
        expect(district.current.soil_moisture_27_to_81cm).toBeCloseTo((0.29 + 0.44) / 2, 5);
        expect(district.trend).toHaveLength(2);
        expect(district.history).toHaveLength(1);
    });
});
