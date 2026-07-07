import { supabase } from '../supabaseClient';
import {
  TABLE_CONFIG,
  getDatasetRoute,
  getDatasetSelectColumns,
  getDistrictColumn,
  getSearchColumns,
  listDatasetKeys,
} from '../domain/datasetCatalog';
import { getPublicColumns } from '../utils/dataPrivacy';
import { parseSearchQuery } from './searchQueryParser';

/**
 * Mapping: table name → dashboard route path
 */
// ========== Cache System ==========
const cache = new Map();
const inFlightSearches = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const CACHE_STORAGE_KEY = 'npt_global_search_cache_v1';
const MAX_CACHE_ITEMS = 80;

function readStoredCache() {
  try {
    if (typeof sessionStorage === 'undefined') return {};
    return JSON.parse(sessionStorage.getItem(CACHE_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeStoredCache(stored) {
  try {
    if (typeof sessionStorage === 'undefined') return;
    const entries = Object.entries(stored)
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
      .slice(0, MAX_CACHE_ITEMS);
    sessionStorage.setItem(
      CACHE_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(entries))
    );
  } catch {
    // Cache is optional. Ignore storage quota/private-mode failures.
  }
}

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp <= CACHE_TTL) {
    return entry.data;
  }
  if (entry) {
    cache.delete(key);
  }

  const stored = readStoredCache();
  const storedEntry = stored[key];
  if (!storedEntry) return null;
  if (Date.now() - storedEntry.timestamp > CACHE_TTL) {
    delete stored[key];
    writeStoredCache(stored);
    return null;
  }
  cache.set(key, storedEntry);
  return storedEntry.data;
}

function setCache(key, data) {
  // Keep cache size manageable
  if (cache.size > MAX_CACHE_ITEMS) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  const entry = { data, timestamp: Date.now() };
  cache.set(key, entry);
  writeStoredCache({
    ...readStoredCache(),
    [key]: entry,
  });
}

// ========== Recent Searches ==========
const RECENT_KEY = 'npt_recent_searches';
const MAX_RECENT = 8;

export function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addRecentSearch(term) {
  if (!term || term.trim().length < 2) return;
  const cleaned = term.trim();
  const recent = getRecentSearches().filter((s) => s !== cleaned);
  recent.unshift(cleaned);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

export function clearRecentSearches() {
  localStorage.removeItem(RECENT_KEY);
}

// ========== Label Helpers ==========
function getResultLabel(row, table) {
  const searchCols = getSearchColumns(table);
  const distCol = getDistrictColumn(table);

  for (const col of searchCols) {
    if (row[col] && typeof row[col] === 'string' && row[col].trim()) {
      return row[col].trim();
    }
  }
  if (row[distCol]) return row[distCol];
  for (const [key, val] of Object.entries(row)) {
    if (['id', 'created_at', 'updated_at'].includes(key)) continue;
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  return 'ข้อมูล';
}

function parseBudgetNotes(notes) {
  if (!notes || typeof notes !== 'string') return {};
  try {
    const parsed = JSON.parse(notes);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeBudgetRowForSearch(row) {
  const notes = parseBudgetNotes(row.notes);
  const project = notes.project || row.project_name || '';
  const activity = notes.activity || '';
  const displayNotes = [notes.detail, notes.target, notes.owner]
    .filter(Boolean)
    .join(' • ');

  return {
    id: row.id,
    project_name:
      [project, activity].filter(Boolean).join(' / ') || row.project_name,
    activity,
    district: notes.district || '',
    subdistrict: notes.subdistrict || '',
    budget_amount: row.budget_amount ?? notes.budget ?? null,
    spent_amount: row.spent_amount ?? notes.spentAmount ?? null,
    budget_source: row.budget_source || notes.plan || '',
    status: row.status || notes.status || '',
    notes: displayNotes || null,
    fiscal_year: row.fiscal_year || notes.fiscalYear || null,
    budget_round: row.budget_round || notes.round || null,
    score: row.score ?? null,
    match_column: row.match_column ?? null,
    match_value: row.match_value ?? null,
    match_type: row.match_type ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function getResultSubtitle(row, table) {
  if (table === 'budgets') {
    return (
      [
        row.district,
        row.activity,
        row.budget_amount
          ? `${Number(row.budget_amount).toLocaleString('th-TH')} บาท`
          : null,
      ]
        .filter(Boolean)
        .join(' • ') || null
    );
  }

  const distCol = getDistrictColumn(table);
  const searchCols = getSearchColumns(table);
  const parts = [];

  if (row[distCol]) parts.push(`อ.${row[distCol]}`);
  const labelCol = searchCols[0];
  for (const col of searchCols.slice(1, 3)) {
    if (col !== labelCol && row[col] && typeof row[col] === 'string') {
      parts.push(row[col]);
    }
  }
  return parts.join(' • ') || null;
}

function sanitizeRowForRole(table, row, role) {
  if (role !== 'guest') return row;
  const publicKeys = new Set(
    getPublicColumns(
      table,
      Object.keys(row).map((key) => ({ dataIndex: key })),
      role
    ).map((column) => column.dataIndex)
  );
  return Object.fromEntries(
    Object.entries(row).filter(
      ([key]) =>
        publicKeys.has(key) || ['id', 'created_at', 'updated_at'].includes(key)
    )
  );
}

const getRowScore = (row, tableHints = [], table) =>
  Number(row.score || 0) + (tableHints.includes(table) ? 20 : 0);

function enrichResults(rawResults, role = 'viewer', tableHints = []) {
  return rawResults
    .map((entry) => {
      const config = TABLE_CONFIG[entry.table];
      if (!config) return null;
      const safeRows = (entry.results || [])
        .map((row) =>
          entry.table === 'budgets' ? normalizeBudgetRowForSearch(row) : row
        )
        .map((row) => sanitizeRowForRole(entry.table, row, role));
      return {
        table: entry.table,
        label: config.label,
        icon: config.icon,
        group: config.group,
        route: getDatasetRoute(entry.table),
        totalCount: entry.totalCount || entry.results?.length || 0,
        results: safeRows
          .map((row) => {
            const score = getRowScore(row, tableHints, entry.table);
            return {
              id: row.id,
              title: getResultLabel(row, entry.table),
              subtitle: getResultSubtitle(row, entry.table),
              score,
              matchColumn: row.match_column || null,
              matchValue: row.match_value || null,
              matchType: row.match_type || null,
              raw: row,
            };
          })
          .sort((a, b) => b.score - a.score),
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        (b.results[0]?.score || 0) - (a.results[0]?.score || 0) ||
        b.totalCount - a.totalCount
    );
}

// ========== RPC-based search (single request → 18 tables) ==========
async function searchViaRPC(searchTerm, limitPerTable) {
  const { data, error } = await supabase.rpc('global_search', {
    search_term: searchTerm,
    result_limit: limitPerTable,
  });

  if (error) throw error;
  return data || [];
}

// ========== Fallback: parallel search (18 requests) ==========
async function searchViaParallel(
  searchTerm,
  limitPerTable,
  role = 'viewer',
  tableHints = []
) {
  const tables = listDatasetKeys();

  const searchPromises = tables.map(async (table) => {
    const searchCols = getSearchColumns(table, role);
    if (!searchCols || searchCols.length === 0) return null;

    try {
      const distCol = getDistrictColumn(table);
      const allCols = [...new Set([...searchCols, distCol])];
      const orString = allCols
        .map((c) => `${c}.ilike.%${searchTerm}%`)
        .join(',');

      const selectColumns = getDatasetSelectColumns(table, {
        role,
        purpose: 'search',
        columns: allCols,
      });
      const { data, count, error } = await supabase
        .from(table)
        .select(selectColumns, { count: 'exact' })
        .or(orString)
        .limit(limitPerTable);

      if (error || !data || data.length === 0) return null;

      return { table, totalCount: count || data.length, results: data };
    } catch {
      return null;
    }
  });

  const raw = (await Promise.all(searchPromises)).filter(Boolean);
  return enrichResults(raw, role, tableHints);
}

// ========== Main Search Function ==========
export async function globalSearch(query, limitPerTable = 5, role = 'viewer') {
  if (!query || query.trim().length < 2) return [];

  const searchTerm = query.trim();
  const parsedQuery = parseSearchQuery(searchTerm);
  const cacheKey = `${role}:${searchTerm}:${limitPerTable}`;

  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (inFlightSearches.has(cacheKey)) {
    return inFlightSearches.get(cacheKey);
  }

  const searchPromise = (async () => {
    let results;
    try {
      // Try RPC first (1 request). Guest uses parallel path to avoid private search columns.
      results =
        role === 'guest'
          ? await searchViaParallel(
              searchTerm,
              limitPerTable,
              role,
              parsedQuery.tableHints
            )
          : await searchViaRPC(searchTerm, limitPerTable).then((data) =>
              enrichResults(data, role, parsedQuery.tableHints)
            );
    } catch {
      // Fallback to parallel (18 requests)
      console.warn('RPC search failed, falling back to parallel search');
      results = await searchViaParallel(
        searchTerm,
        limitPerTable,
        role,
        parsedQuery.tableHints
      );
    }

    // Save to cache
    setCache(cacheKey, results);

    // Save to recent searches
    if (results.length > 0) {
      addRecentSearch(searchTerm);
    }

    return results;
  })();

  inFlightSearches.set(cacheKey, searchPromise);
  try {
    return await searchPromise;
  } finally {
    inFlightSearches.delete(cacheKey);
  }
}
