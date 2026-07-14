import { normalizePlaceName } from '../../../../src/utils/geojsonBoundaries.js';

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseSummaryScope(params) {
  const level = params.get('level') || 'province';
  if (!['province', 'district', 'subdistrict'].includes(level)) {
    throw new Error('level must be province, district, or subdistrict');
  }
  const scope = {
    level,
    districtCode: params.get('districtCode') || null,
    districtName: params.get('districtName') || null,
    subdistrictCode: params.get('subdistrictCode') || null,
    subdistrictName: params.get('subdistrictName') || null,
  };
  if (level !== 'province' && !scope.districtName) {
    throw new Error('districtName is required');
  }
  if (level === 'subdistrict' && !scope.subdistrictName) {
    throw new Error('subdistrictName is required');
  }
  return scope;
}

function rowsForScope(rows = [], scope = {}) {
  if (scope.level === 'province') return rows;
  const district = normalizePlaceName(scope.districtName);
  return rows.filter((row) => {
    if (normalizePlaceName(row.district) !== district) return false;
    return (
      scope.level !== 'subdistrict' ||
      normalizePlaceName(row.subdistrict) ===
        normalizePlaceName(scope.subdistrictName)
    );
  });
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + number(row[field]), 0);
}

const SOURCE_TABLES = {
  agriculturalAreas: 'agricultural_areas',
  farmerRegistry: 'farmer_registry_subdistricts',
  communityEnterprises: 'community_enterprises',
  largePlots: 'large_plots',
  smartFarmers: 'smart_farmer_sf',
  youngSmartFarmers: 'young_smart_farmer_ysf',
  fireHotspots: 'fire_hotspots',
};

function freshness(rowsByDataset) {
  const sources = Object.entries(rowsByDataset)
    .filter(([, rows]) => rows.length > 0)
    .map(([key, rows]) => ({
      table: SOURCE_TABLES[key],
      updatedAt:
        rows
          .map((row) => row.updated_at || row.created_at || row.cutoff_date)
          .filter(Boolean)
          .sort()
          .at(-1) || null,
    }));
  return {
    sources,
    updatedAt:
      sources
        .map((source) => source.updatedAt)
        .filter(Boolean)
        .sort()
        .at(-1) || null,
  };
}

export function buildSmartMapSummary(scope, datasets = {}) {
  const rows = Object.fromEntries(
    Object.keys(SOURCE_TABLES).map((key) => [
      key,
      rowsForScope(datasets[key], scope),
    ])
  );
  const { agriculturalAreas, farmerRegistry } = rows;
  const useSubdistrictMetrics = scope.level === 'subdistrict';
  const hasSubdistrictData = farmerRegistry.length > 0;
  const { sources, updatedAt } = freshness(rows);

  return {
    scope,
    availability:
      useSubdistrictMetrics && !hasSubdistrictData ? 'district_only' : 'active',
    metrics: {
      farmAreaRai: useSubdistrictMetrics
        ? sum(farmerRegistry, 'farm_area_rai')
        : sum(agriculturalAreas, 'total_area_rai'),
      farmerHouseholds: useSubdistrictMetrics
        ? sum(farmerRegistry, 'net_total_households')
        : sum(agriculturalAreas, 'farmer_households'),
      communityEnterprises: rows.communityEnterprises.length,
      largePlots: rows.largePlots.length,
      smartFarmers: rows.smartFarmers.length,
      youngSmartFarmers: rows.youngSmartFarmers.length,
      hotspotCount: rows.fireHotspots.length,
    },
    cropAreas: [],
    networkCounts: {},
    riskMetrics: {},
    sources,
    updatedAt,
  };
}
