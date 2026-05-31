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

/**
 * Mapping: table name → dashboard route path
 */
// ========== Cache System ==========
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds

function getCached(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

function setCache(key, data) {
    // Keep cache size manageable
    if (cache.size > 50) {
        const oldest = cache.keys().next().value;
        cache.delete(oldest);
    }
    cache.set(key, { data, timestamp: Date.now() });
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
    const recent = getRecentSearches().filter(s => s !== cleaned);
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

function getResultSubtitle(row, table) {
    if (table === 'budgets') {
        const notes = parseBudgetNotes(row.notes);
        return [notes.district, notes.activity, row.budget_amount ? `${Number(row.budget_amount).toLocaleString('th-TH')} บาท` : null]
            .filter(Boolean)
            .join(' • ') || null;
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
    const publicKeys = new Set(getPublicColumns(table, Object.keys(row).map((key) => ({ dataIndex: key })), role).map((column) => column.dataIndex));
    return Object.fromEntries(Object.entries(row).filter(([key]) => publicKeys.has(key) || ['id', 'created_at', 'updated_at'].includes(key)));
}

function enrichResults(rawResults, role = 'viewer') {
    return rawResults
        .map((entry) => {
            const config = TABLE_CONFIG[entry.table];
            if (!config) return null;
            const safeRows = (entry.results || []).map((row) => sanitizeRowForRole(entry.table, row, role));
            return {
                table: entry.table,
                label: config.label,
                icon: config.icon,
                group: config.group,
                route: getDatasetRoute(entry.table),
                totalCount: entry.totalCount || entry.results?.length || 0,
                results: safeRows.map(row => ({
                    id: row.id,
                    title: getResultLabel(row, entry.table),
                    subtitle: getResultSubtitle(row, entry.table),
                    raw: row,
                })),
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.totalCount - a.totalCount);
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
async function searchViaParallel(searchTerm, limitPerTable, role = 'viewer') {
    const tables = listDatasetKeys();

    const searchPromises = tables.map(async (table) => {
        const searchCols = getSearchColumns(table, role);
        if (!searchCols || searchCols.length === 0) return null;

        try {
            const distCol = getDistrictColumn(table);
            const allCols = [...new Set([...searchCols, distCol])];
            const orString = allCols.map(c => `${c}.ilike.%${searchTerm}%`).join(',');

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
    return enrichResults(raw, role);
}

// ========== Main Search Function ==========
export async function globalSearch(query, limitPerTable = 5, role = 'viewer') {
    if (!query || query.trim().length < 2) return [];

    const searchTerm = query.trim();
    const cacheKey = `${role}:${searchTerm}:${limitPerTable}`;

    // Check cache first
    const cached = getCached(cacheKey);
    if (cached) return cached;

    let results;
    try {
        // Try RPC first (1 request). Guest uses parallel path to avoid private search columns.
        results = role === 'guest'
            ? await searchViaParallel(searchTerm, limitPerTable, role)
            : await searchViaRPC(searchTerm, limitPerTable).then((data) => enrichResults(data, role));
    } catch {
        // Fallback to parallel (18 requests)
        console.warn('RPC search failed, falling back to parallel search');
        results = await searchViaParallel(searchTerm, limitPerTable, role);
    }

    // Save to cache
    setCache(cacheKey, results);

    // Save to recent searches
    if (results.length > 0) {
        addRecentSearch(searchTerm);
    }

    return results;
}
