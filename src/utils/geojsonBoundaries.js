export const NAKHON_PATHOM_PROVINCE_CODE = '73';

export function normalizeProvinceCode(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().padStart(2, '0');
}

export function isFeatureInProvince(feature, provinceCode) {
  const normalizedTarget = normalizeProvinceCode(provinceCode);
  const props = feature?.properties || {};
  return (
    normalizeProvinceCode(
      props.pro_code ?? props.PRO_CODE ?? props.provinceCode
    ) === normalizedTarget
  );
}

export function compactSubdistrictProperties(properties = {}) {
  return {
    tam_code: properties.tam_code ?? properties.TAM_CODE ?? '',
    tam_th: properties.tam_th ?? properties.TAM_TN ?? properties.TAM_NAMT ?? '',
    tam_en: properties.tam_en ?? properties.TAM_EN ?? properties.TAM_NAME ?? '',
    amp_code: properties.amp_code ?? properties.AMP_CODE ?? '',
    amp_th: properties.amp_th ?? properties.AMP_TN ?? properties.AMP_NAMT ?? '',
    amp_en: properties.amp_en ?? properties.AMP_EN ?? properties.AMP_NAME ?? '',
    pro_code: normalizeProvinceCode(
      properties.pro_code ?? properties.PRO_CODE ?? properties.provinceCode
    ),
    pro_th:
      properties.pro_th ?? properties.PROV_TN ?? properties.PRO_NAMT ?? '',
    pro_en:
      properties.pro_en ?? properties.PROV_EN ?? properties.PRO_NAME ?? '',
    area_sqkm: properties.area_sqkm ?? properties.AREA_SQKM ?? null,
  };
}

export function filterSubdistrictGeojsonByProvince(
  geojson,
  provinceCode = NAKHON_PATHOM_PROVINCE_CODE
) {
  if (
    !geojson ||
    geojson.type !== 'FeatureCollection' ||
    !Array.isArray(geojson.features)
  ) {
    throw new Error('Expected a GeoJSON FeatureCollection');
  }

  return {
    type: 'FeatureCollection',
    features: geojson.features
      .filter((feature) => isFeatureInProvince(feature, provinceCode))
      .map((feature) => ({
        type: 'Feature',
        properties: compactSubdistrictProperties(feature.properties),
        geometry: feature.geometry,
      })),
  };
}

export function normalizePlaceName(value) {
  const normalized = String(value || '')
    .trim()
    .replace(/^(อำเภอ|อ\.|ตำบล|ต\.)\s*/u, '');
  return normalized === 'เมืองนครปฐม' ? 'เมือง' : normalized;
}

export function getSubdistrictsForDistrict(geojson, districtName) {
  const normalizedDistrict = normalizePlaceName(districtName);
  return [...(geojson?.features || [])]
    .filter(
      (feature) =>
        normalizePlaceName(feature.properties?.amp_th) === normalizedDistrict
    )
    .sort((a, b) =>
      normalizePlaceName(a.properties?.tam_th).localeCompare(
        normalizePlaceName(b.properties?.tam_th),
        'th'
      )
    );
}

export function findSubdistrictFeature(
  geojson,
  { tamCode, districtName, subdistrictName } = {}
) {
  const normalizedDistrict = normalizePlaceName(districtName);
  const normalizedSubdistrict = normalizePlaceName(subdistrictName);
  return (
    (geojson?.features || []).find((feature) => {
      const props = feature.properties || {};
      if (tamCode && props.tam_code === String(tamCode)) return true;
      return (
        normalizedSubdistrict &&
        normalizePlaceName(props.tam_th) === normalizedSubdistrict &&
        (!normalizedDistrict ||
          normalizePlaceName(props.amp_th) === normalizedDistrict)
      );
    }) || null
  );
}

export function countRowsBySubdistrict(rows, geojson, options = {}) {
  const districtField = options.districtField || 'district';
  const subdistrictField = options.subdistrictField || 'subdistrict';

  return (rows || []).reduce((counts, row) => {
    const feature = findSubdistrictFeature(geojson, {
      tamCode: row.tam_code || row.tambon_code || row.subdistrict_code,
      districtName: row[districtField],
      subdistrictName: row[subdistrictField],
    });
    if (!feature?.properties?.tam_code) return counts;
    counts[feature.properties.tam_code] =
      (counts[feature.properties.tam_code] || 0) + 1;
    return counts;
  }, {});
}
