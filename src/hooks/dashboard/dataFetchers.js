import { allTables, normalizeDistrict } from './config';

/**
 * Fetch public certifications count from API
 */
export async function fetchPublicCertificationsCount() {
  try {
    const response = await fetch('/api/public-certifications?count=1');
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('application/json')) return null;

    const payload = await response.json();
    if (Number.isFinite(payload.count)) return payload.count;
    return Array.isArray(payload.data) ? payload.data.length : null;
  } catch {
    return null;
  }
}

/**
 * Fetch count for all tables
 */
export async function fetchAllCounts(supabase) {
  const results = [];
  const publicCertificationsCount = await fetchPublicCertificationsCount();

  for (const tbl of allTables) {
    try {
      if (
        tbl.table === 'certifications' &&
        publicCertificationsCount !== null
      ) {
        results.push({ ...tbl, count: publicCertificationsCount });
        continue;
      }

      const { count, error } = await supabase
        .from(tbl.table)
        .select('id', { count: 'exact', head: true });
      results.push({ ...tbl, count: error ? 0 : (count ?? 0) });
    } catch {
      results.push({ ...tbl, count: 0 });
    }
  }
  return results;
}

/**
 * Fetch chart data
 */
export async function fetchChartData(supabase) {
  const [agri, lp, fi] = await Promise.all([
    supabase
      .from('agricultural_areas')
      .select(
        'rice_in_season_rai, rice_off_season_rai, field_crops_rai, horticulture_rai, fruit_trees_rai, vegetables_rai, flowers_rai, herbs_spices_rai'
      ),
    supabase.from('large_plots').select('commodity_group'),
    supabase.from('farmer_institutes').select('community_enterprise_groups'),
  ]);
  return { agri: agri.data || [], lp: lp.data || [], fi: fi.data || [] };
}

/**
 * Fetch map data (GIS + tourism)
 */
export async function fetchMapData(supabase) {
  const mapPts = [];
  const [{ data: gis }, { data: tourMap }] = await Promise.all([
    supabase
      .from('gis_areas')
      .select('area_name, district, latitude, longitude')
      .not('latitude', 'is', null)
      .limit(20),
    supabase
      .from('agri_tourism')
      .select('spot_name, district, latitude, longitude')
      .not('latitude', 'is', null)
      .limit(20),
  ]);

  (gis || []).forEach((r) => {
    if (r.latitude && r.longitude)
      mapPts.push({
        name: r.area_name,
        district: r.district,
        lat: r.latitude,
        lon: r.longitude,
        type: 'gis',
        typeLabel: 'พื้นที่ GIS',
      });
  });
  (tourMap || []).forEach((r) => {
    if (r.latitude && r.longitude)
      mapPts.push({
        name: r.spot_name,
        district: r.district,
        lat: r.latitude,
        lon: r.longitude,
        type: 'tourism',
        typeLabel: 'ท่องเที่ยวเกษตร',
      });
  });

  return mapPts;
}

/**
 * Fetch community data and compute stats
 */
export async function fetchCommunityData(supabase) {
  const [
    { data: sfData },
    ceData,
    { data: atData },
    { data: lpData },
    { data: instData },
    { data: agriAreaData },
    { data: lcData },
    { data: pcData },
    { data: sfcData },
    { data: sfSfData },
    { data: ysfData },
    { data: disasterData },
    { data: pestData },
    { data: fireData },
    { data: certData },
  ] = await Promise.all([
    supabase
      .from('smart_farmers')
      .select('district, main_product')
      .order('id', { ascending: false })
      .limit(3),
    supabase
      .from('community_enterprises')
      .select(
        'id, enterprise_type, enterprise_name, approval_date, district, subdistrict, village_no',
        { count: 'exact' }
      )
      .order('id', { ascending: false }),
    supabase
      .from('agri_tourism')
      .select('district, spot_name, spot_type')
      .order('id', { ascending: false }),
    supabase
      .from('large_plots')
      .select(
        'id, plot_name, commodity, district, subdistrict, member_count, area_rai, commodity_group, year'
      ),
    supabase
      .from('farmer_institutes')
      .select(
        'district, housewives_groups, young_farmer_groups, career_promotion_groups, village_farmers_count, total_groups, community_enterprise_groups, smart_farmer_count, young_smart_farmer_count'
      ),
    supabase
      .from('agricultural_areas')
      .select(
        'district, farmer_households, total_area_rai, agri_crop_area_rai, rice_in_season_rai, rice_off_season_rai, field_crops_rai, horticulture_rai, fruit_trees_rai, vegetables_rai, flowers_rai, herbs_spices_rai'
      )
      .neq('district', 'รวม'),
    supabase.from('learning_centers').select('district'),
    supabase.from('pest_centers').select('district'),
    supabase.from('soil_fertilizer_centers').select('district'),
    supabase.from('smart_farmer_sf').select('district'),
    supabase.from('young_smart_farmer_ysf').select('district'),
    supabase
      .from('disasters')
      .select('district, damaged_area, affected_farmers'),
    supabase.from('pest_outbreaks').select('district, outbreak_area'),
    supabase.from('fire_hotspots').select('district'),
    supabase.from('certifications').select('plot_district'),
  ]);

  return {
    sfData,
    ceData,
    atData,
    lpData,
    instData,
    agriAreaData,
    lcData,
    pcData,
    sfcData,
    sfSfData,
    ysfData,
    disasterData,
    pestData,
    fireData,
    certData,
  };
}
