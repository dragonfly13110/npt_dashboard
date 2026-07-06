import nptSubdistrictsGeoJSON from '../../data/nakhon_pathom_subdistricts.json';
import { normalizePlaceName } from '../../utils/geojsonBoundaries';

export const DEFAULT_DISTRICT_OPTIONS = [
  'เมืองนครปฐม',
  'นครชัยศรี',
  'สามพราน',
  'ดอนตูม',
  'บางเลน',
  'กำแพงแสน',
  'พุทธมณฑล',
];

export function getSubdistrictsList(selectedDistrict) {
  if (!nptSubdistrictsGeoJSON?.features) return [];
  const normalizedSelDist = selectedDistrict
    ? normalizePlaceName(selectedDistrict)
    : null;
  const list = nptSubdistrictsGeoJSON.features
    .filter((feature) => {
      if (!normalizedSelDist) return true;
      return (
        normalizePlaceName(feature.properties?.amp_th) === normalizedSelDist
      );
    })
    .map((feature) => feature.properties?.tam_th)
    .filter(Boolean);
  return [...new Set(list)].sort((a, b) => a.localeCompare(b, 'th'));
}

export function getCrudLocationKeys(columns) {
  const districtColumn = columns.find(
    (column) => column.dataIndex && /district/i.test(String(column.dataIndex))
  );
  const subdistrictColumn = columns.find(
    (column) =>
      column.dataIndex && /subdistrict/i.test(String(column.dataIndex))
  );

  return {
    district: districtColumn?.dataIndex || null,
    subdistrict: subdistrictColumn?.dataIndex || null,
  };
}

export function getCrudFilterConfig(filterConfig, keys, activeFilters) {
  const conf = [...(filterConfig || [])];

  if (keys.district && keys.subdistrict) {
    let districtIndex = conf.findIndex((item) => item.key === keys.district);
    if (districtIndex === -1) {
      conf.unshift({
        key: keys.district,
        label: 'อำเภอ',
        options: DEFAULT_DISTRICT_OPTIONS,
      });
      districtIndex = 0;
    }

    const subdistrictIndex = conf.findIndex(
      (item) => item.key === keys.subdistrict
    );
    if (subdistrictIndex === -1) {
      conf.splice(districtIndex + 1, 0, {
        key: keys.subdistrict,
        label: 'ตำบล',
        options: [],
      });
    }
  }

  return conf.map((item) => {
    if (keys.subdistrict && item.key === keys.subdistrict) {
      return {
        ...item,
        options: getSubdistrictsList(activeFilters[keys.district]),
      };
    }
    return item;
  });
}
