export const EMPTY_AREA_SELECTION = { level: 'province' };

export function selectDistrict(_selection, district) {
  return { level: 'district', district, subdistrict: null };
}

export function selectSubdistrict(selection, subdistrict) {
  return { ...selection, level: 'subdistrict', subdistrict };
}

export function areaSummaryScope(selection) {
  if (selection.level === 'subdistrict') {
    return {
      level: 'subdistrict',
      districtName: selection.district.name,
      subdistrictName: selection.subdistrict.name,
    };
  }
  if (selection.level === 'district') {
    return { level: 'district', districtName: selection.district.name };
  }
  return { level: 'province' };
}

export function choroplethScope(selection) {
  return selection.level === 'subdistrict'
    ? { level: 'district', districtName: selection.district.name }
    : areaSummaryScope(selection);
}
