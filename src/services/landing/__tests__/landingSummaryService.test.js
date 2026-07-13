import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  getWeatherSummary,
  getAirQualitySummary,
  getHotspotSummary,
  getSoilMoistureSummary,
  getReservoirSummary,
} from '../landingSummaryService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('landingSummaryService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('getWeatherSummary returns normalized weather data on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        current: {
          temperature_2m: 32.4,
          weather_code: 3,
          relative_humidity_2m: 65,
          time: '2026-07-13T10:00:00Z',
        },
      }),
    });

    const summary = await getWeatherSummary();
    expect(summary.value).toBe(32);
    expect(summary.unit).toBe('°C');
    expect(summary.status).toBe('success');
    expect(summary.statusLabel).toBe('มีเมฆมาก');
    expect(summary.secondaryText).toBe('ความชื้นสัมพัทธ์ 65%');
    expect(summary.sourceLabel).toBe('Open-Meteo');
  });

  it('getWeatherSummary handles api errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const summary = await getWeatherSummary();
    expect(summary.value).toBeNull();
    expect(summary.status).toBe('unavailable');
    expect(summary.statusLabel).toBe('ไม่สามารถเชื่อมต่อข้อมูล');
  });

  it('getAirQualitySummary returns PM2.5 details on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        current: {
          pm2_5: 22,
          pm10: 45,
          european_aqi: 33,
          time: '2026-07-13T10:00:00Z',
        },
      }),
    });

    const summary = await getAirQualitySummary();
    expect(summary.value).toBe(22);
    expect(summary.status).toBe('normal');
    expect(summary.statusLabel).toBe('ปานกลาง');
    expect(summary.secondaryText).toContain('PM10: 45');
  });

  it('getHotspotSummary parses GISTDA hotspots correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [
          { properties: { name: 'Point 1' } },
          { properties: { name: 'Point 2' } },
        ],
      }),
    });

    const summary = await getHotspotSummary();
    expect(summary.value).toBe(2);
    expect(summary.status).toBe('normal');
    expect(summary.statusLabel).toBe('พบจุดความร้อน 2 จุด');
  });

  it('getSoilMoistureSummary returns percentage', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        hourly: {
          soil_moisture_0_to_1cm: [
            0.28, 0.28, 0.28, 0.28, 0.28, 0.28, 0.28, 0.28, 0.28, 0.28, 0.28,
            0.28, 0.28, 0.28, 0.28, 0.28, 0.28, 0.28, 0.28, 0.28, 0.28, 0.28,
            0.28, 0.28,
          ],
        },
      }),
    });

    const summary = await getSoilMoistureSummary();
    expect(summary.value).toBe(28);
    expect(summary.unit).toBe('%');
    expect(summary.status).toBe('success');
    expect(summary.statusLabel).toBe('เหมาะสม');
  });

  it('getReservoirSummary aggregates main dams', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        date: '2026-07-13',
        data: [
          {
            region: 'กลาง',
            dam: [
              { id: '200401', capacity: 17745, volume: 12000 },
              { id: '200402', capacity: 8860, volume: 6000 },
            ],
          },
        ],
      }),
    });

    const summary = await getReservoirSummary();
    expect(summary.value).toBe(68);
    expect(summary.status).toBe('normal');
    expect(summary.statusLabel).toBe('น้ำปานกลาง');
  });
});
