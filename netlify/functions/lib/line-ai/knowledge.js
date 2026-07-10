import catalog from '../../../../src/domain/datasetCatalog.json' with { type: 'json' };
import manualIndex from './manual-index.json' with { type: 'json' };

const ORIGIN = 'https://npt-dashboard.netlify.app';
const ROLE_RANK = { guest: 0, viewer: 1, editor: 2, district_editor: 2, admin: 3 };
const ENTRIES = new Map([
  ...catalog.LINE_DATASETS,
  ...catalog.SYSTEM_PAGES,
  ...catalog.MANUALS,
].map((entry) => [entry.id, entry]));
const PRIVATE_KEY = /full_name|first_name|last_name|owner_name|farmer_name|contact_person|chairman|president|leader|manager|phone|mobile|tel|address|email|line_id|facebook/i;

function canAccess(identity, entry) {
  return (ROLE_RANK[identity?.role] ?? 0) >= (ROLE_RANK[entry.minRole] ?? 99);
}

function publicRecord(record, entry, role) {
  if (role !== 'guest') return record;
  return Object.fromEntries(
    Object.entries(record || {}).filter(
      ([key]) => !PRIVATE_KEY.test(key) && !entry.piiFields?.includes(key)
    )
  );
}

function routeFor(entry) {
  if (!entry?.route) return null;
  return entry.route.startsWith('/') ? `${ORIGIN}${entry.route}` : null;
}

function termsForSearch(terms) {
  return [...new Set((terms || []).map((term) => String(term).trim()).filter((term) => term.length >= 2))].slice(0, 5);
}

function selectedEntries(identity, catalogIds, terms) {
  const requested = (catalogIds || [])
    .map((id) => ENTRIES.get(id))
    .filter((entry) => entry && canAccess(identity, entry))
    .slice(0, 5);
  if (requested.length) return requested;
  const searchText = terms.join(' ').toLowerCase();
  return [...ENTRIES.values()]
    .filter((entry) => entry.kind === 'dataset' && canAccess(identity, entry))
    .filter((entry) => !searchText || [entry.title, entry.description, ...(entry.aliases || [])].join(' ').toLowerCase().includes(searchText))
    .slice(0, 5);
}

function searchManuals(entries, terms, role) {
  const allowed = new Set(entries.map((entry) => entry.id));
  return manualIndex
    .filter((chunk) => allowed.has(chunk.id) && (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[chunk.minRole] ?? 99))
    .map((chunk) => ({
      chunk,
      score: terms.reduce((score, term) => score + (chunk.content.toLowerCase().includes(term.toLowerCase()) ? 1 : 0), 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

export async function searchSystemKnowledge({ supabase, identity, catalogIds = [], searchTerms = [] }) {
  const terms = termsForSearch(searchTerms);
  const entries = selectedEntries(identity, catalogIds, terms);
  const evidence = [];
  const records = [];
  const datasetEntries = entries.filter((entry) => entry.kind === 'dataset');
  const tableNames = datasetEntries.map((entry) => entry.source);

  if (tableNames.length && supabase?.rpc) {
    try {
      const rpcName = identity?.role === 'guest' ? 'global_search_public' : 'global_search_staff';
      const { data, error } = await supabase.rpc(rpcName, {
        search_terms: terms,
        table_names: tableNames,
        result_limit: 3,
      });
      if (!error) {
        for (const category of Array.isArray(data) ? data : []) {
          const entry = catalog.LINE_DATASETS.find((item) => item.source === category.table);
          if (!entry) continue;
          const safeResults = (category.results || []).slice(0, 3).map((row) => publicRecord(row, entry, identity?.role));
          if (!safeResults.length && !category.totalCount) continue;
          evidence.push({ sourceKind: 'system', catalogId: entry.id, table: entry.source, totalCount: category.totalCount || safeResults.length, results: safeResults });
          records.push({ title: entry.title, subtitle: `พบ ${category.totalCount || safeResults.length} รายการ`, url: routeFor(entry), totalCount: category.totalCount || safeResults.length, sourceKind: 'system' });
        }
      }
    } catch {
      // Continue to manuals/pages and let orchestrator decide whether to use web fallback.
    }
  }

  for (const { chunk } of searchManuals(entries, terms, identity?.role || 'guest')) {
    evidence.push({ sourceKind: 'system', catalogId: chunk.id, title: chunk.title, heading: chunk.heading, content: chunk.content });
    records.push({ title: chunk.title, subtitle: chunk.heading || 'คู่มือระบบ', url: chunk.route, sourceKind: 'system' });
  }

  for (const entry of entries.filter((item) => item.kind === 'page')) {
    const haystack = [entry.title, entry.description, ...(entry.aliases || [])].join(' ').toLowerCase();
    if (!terms.length || terms.some((term) => haystack.includes(term.toLowerCase()))) {
      evidence.push({ sourceKind: 'system', catalogId: entry.id, title: entry.title, description: entry.description, route: entry.route });
      records.push({ title: entry.title, subtitle: entry.description, url: routeFor(entry), sourceKind: 'system' });
    }
  }

  return { found: evidence.length > 0, evidence: evidence.slice(0, 5), records: records.slice(0, 3) };
}
