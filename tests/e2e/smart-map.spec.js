import { test, expect } from '@playwright/test';

const district = 'เมืองนครปฐม';
const subdistrict = 'พระปฐมเจดีย์';
const metrics = {
  farmAreaRai: 1200,
  farmerHouseholds: 300,
  communityEnterprises: 4,
  largePlots: 2,
  smartFarmers: 6,
  youngSmartFarmers: 3,
  hotspotCount: 1,
  farmerRegistryHouseholds: 300,
  geoplotProgressPercent: 75,
  groupCount: 9,
  ricePi: 200,
  ricePrung: 100,
};

function summary(url) {
  const level = url.searchParams.get('level');
  return {
    availability: 'active',
    updatedAt: '2026-07-14T00:00:00.000Z',
    metrics,
    breakdown:
      level === 'province'
        ? [{ districtName: district, metrics }]
        : level === 'district'
          ? [{ districtName: district, subdistrictName: subdistrict, metrics }]
          : [],
  };
}

const pointFeature = {
  type: 'Feature',
  id: 'point-1',
  geometry: { type: 'Point', coordinates: [100.04, 13.82] },
  properties: {
    district,
    subdistrict,
    group_name: 'Public group',
    crop_type: 'rice',
  },
};

async function mockSmartMapApi(page, { failForecast = false } = {}) {
  await page.route('**/api/public-smart-map-*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('summary')) {
      return route.fulfill({ json: summary(url) });
    }
    if (url.pathname.endsWith('layer-status')) {
      return route.fulfill({
        json: {
          layers: [
            'young_farmer_groups',
            'career_groups',
            'housewife_groups',
            'forecast_plots',
            'fire_hotspots',
          ].map((id) => ({ id, availability: 'active', rowCount: 1 })),
        },
      });
    }
    if (url.pathname.endsWith('weather')) {
      return route.fulfill({
        json: {
          data: [
            {
              district,
              temp: 30,
              humidity: 65,
              weatherCode: 0,
              windSpeed: 3,
              pm25: 12,
              weatherStatus: 'ok',
              airQualityStatus: 'ok',
            },
          ],
        },
      });
    }
    if (url.pathname.endsWith('points')) {
      if (failForecast && url.searchParams.get('layer') === 'forecast_plots') {
        return route.fulfill({
          status: 503,
          json: { error: 'Forecast unavailable' },
        });
      }
      return route.fulfill({
        json: {
          data: { type: 'FeatureCollection', features: [pointFeature] },
          meta: { count: 1, validCoordinateCount: 1 },
        },
      });
    }
    if (url.pathname.endsWith('soil')) {
      return route.fulfill({
        json: {
          data: { type: 'FeatureCollection', features: [] },
          meta: { count: 0 },
        },
      });
    }
    return route.fallback();
  });
}

test.describe('Smart Map public flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockSmartMapApi(page);
  });

  test('loads KPI and choropleth, then scopes district and subdistrict search', async ({
    page,
  }) => {
    await page.goto('/smart-map');
    await expect(page.locator('.smart-map-kpi-bar')).toBeVisible();
    await expect(page.locator('.smart-map-container')).toBeVisible();

    const search = page.locator('.smart-map-search-input');
    await search.fill(district);
    await search.press('Enter');
    await expect(page.locator('.district-panel')).toBeVisible();

    await search.fill(subdistrict);
    await search.press('Enter');
    await expect(page.locator('.smart-map-status-bar')).toContainText(
      subdistrict
    );
  });

  test('loads multiple point layers, forecast and soil without exposing PII', async ({
    page,
  }) => {
    const pointRequests = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/public-smart-map-points'))
        pointRequests.push(request.url());
    });
    await page.goto('/smart-map');
    const toggles = page.locator('.control-toggle-checkbox-label');
    await toggles.nth(0).click();
    await toggles.nth(3).click();
    await toggles.nth(7).click();
    await expect.poll(() => pointRequests.length).toBeGreaterThanOrEqual(2);
    expect(
      pointRequests.some((url) => url.includes('young_farmer_groups'))
    ).toBeTruthy();
    expect(
      pointRequests.some((url) => url.includes('forecast_plots'))
    ).toBeTruthy();

    const payload = await page.evaluate(async () => {
      const response = await fetch(
        '/api/public-smart-map-points?layer=forecast_plots'
      );
      return response.json();
    });
    expect(JSON.stringify(payload)).not.toMatch(
      /owner_name|farmer_name|phone|email/i
    );
  });

  test('isolates a failed point layer instead of breaking the map', async ({
    page,
  }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await mockSmartMapApi(page, { failForecast: true });
    await page.goto('/smart-map');
    await page.locator('.control-toggle-checkbox-label').nth(3).click();
    await expect(page.locator('.smart-map-layer-error')).toBeVisible();
    await expect(page.locator('.smart-map-container')).toBeVisible();
  });

  test('keeps controls usable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/smart-map');
    await page.locator('.smart-map-controls-toggle').click();
    await expect(page.locator('.smart-map-controls')).toHaveClass(/open/);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth
      )
    ).toBeTruthy();
  });
});
