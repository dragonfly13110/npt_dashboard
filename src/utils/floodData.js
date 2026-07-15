export const sumField = (rows, key) =>
  rows.reduce((total, row) => total + Number(row[key] || 0), 0);

export const groupSum = (rows, groupKey, valueKey) =>
  [
    ...rows.reduce((groups, row) => {
      const name = row[groupKey] || 'ไม่ระบุ';
      groups.set(name, (groups.get(name) || 0) + Number(row[valueKey] || 0));
      return groups;
    }, new Map()),
  ]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) =>
      typeof a.name === 'number'
        ? a.name - b.name
        : String(a.name).localeCompare(String(b.name), 'th')
    );

export const groupPointsByYear = (points) =>
  [...Map.groupBy(points, ({ year }) => year)].sort(([a], [b]) => a - b);

export function toFloodMapPoint(row) {
  const x = Number(row.utm_x);
  const y = Number(row.utm_y);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x <= 0 || y <= 0)
    return null;

  const { lat, lng } = utmToLatLng(x, y, Number(row.utm_zone) || 47);
  const { minLat, maxLat, minLng, maxLng } = NAKHON_PATHOM_BOUNDS;
  if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) return null;
  return { ...row, lat, lng };
}
import { utmToLatLng } from './geo';

const NAKHON_PATHOM_BOUNDS = {
  minLat: 13.649,
  maxLat: 14.179,
  minLng: 99.818,
  maxLng: 100.337,
};
