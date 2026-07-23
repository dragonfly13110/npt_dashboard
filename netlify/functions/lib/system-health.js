export const FRESHNESS_RULES = [
  {
    id: 'weather',
    table: 'daily_weather',
    field: 'date',
    maxAgeHours: 48,
  },
  {
    id: 'farmer-registry',
    table: 'farmer_registry_snapshots',
    field: 'scraped_at',
    maxAgeHours: 96,
  },
  {
    id: 'geoplots',
    table: 'geoplots_parcel_progress',
    field: 'scraped_at',
    maxAgeHours: 96,
  },
  {
    id: 'rice-harvest',
    table: 'rice_harvest_snapshots',
    field: 'scraped_at',
    maxAgeHours: 216,
  },
  {
    id: 'tbk-cultivation',
    table: 'tbk_cultivation_snapshots',
    field: 'scraped_at',
    maxAgeHours: 432,
  },
];

function hoursSince(value, now) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(
    0,
    Math.round(((now.getTime() - timestamp) / 3_600_000) * 10) / 10
  );
}

export async function checkSystemHealth({
  ping,
  readLatest,
  now = new Date(),
  rules = FRESHNESS_RULES,
}) {
  const checkedAt = now.toISOString();

  try {
    await ping();
  } catch {
    return {
      status: 'down',
      checkedAt,
      database: { status: 'down' },
      datasets: [],
    };
  }

  const datasets = await Promise.all(
    rules.map(async (rule) => {
      try {
        const latestAt = await readLatest(rule);
        const ageHours = latestAt ? hoursSince(latestAt, now) : null;
        const status =
          ageHours === null
            ? 'missing'
            : ageHours <= rule.maxAgeHours
              ? 'healthy'
              : 'stale';
        return {
          id: rule.id,
          status,
          latestAt: latestAt || null,
          ageHours,
          maxAgeHours: rule.maxAgeHours,
        };
      } catch {
        return {
          id: rule.id,
          status: 'unavailable',
          latestAt: null,
          ageHours: null,
          maxAgeHours: rule.maxAgeHours,
        };
      }
    })
  );

  return {
    status: datasets.every((dataset) => dataset.status === 'healthy')
      ? 'healthy'
      : 'degraded',
    checkedAt,
    database: { status: 'healthy' },
    datasets,
  };
}

export function checkSupabaseHealth(
  supabase,
  { now = new Date(), rules = FRESHNESS_RULES } = {}
) {
  return checkSystemHealth({
    now,
    rules,
    ping: async () => {
      const { error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .limit(1);
      if (error) throw error;
    },
    readLatest: async ({ table, field }) => {
      const { data, error } = await supabase
        .from(table)
        .select(field)
        .not(field, 'is', null)
        .order(field, { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.[field] || null;
    },
  });
}

export async function alertUnhealthySystem(
  report,
  { alert, requestId = 'scheduled' }
) {
  if (report.status === 'healthy') return false;

  const unhealthyIds = (report.datasets || [])
    .filter((dataset) => dataset.status !== 'healthy')
    .map((dataset) => dataset.id);
  const event =
    report.status === 'down'
      ? 'database_down'
      : `stale_${unhealthyIds.join(',') || 'unknown'}`;

  await alert({
    functionName: 'system-health-monitor',
    event,
    requestId,
  });
  return true;
}
