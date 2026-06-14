import { supabase } from '../supabaseClient';
import { logAction } from './auditLog';

export const CUSTOM_FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'date',
  'select',
  'boolean',
];

export const CUSTOM_FIELD_TABLES = new Set([
  'farmer_registry',
  'agricultural_areas',
  'learning_centers',
  'disasters',
  'daily_weather',
  'large_plots',
  'certifications',
  'crop_production',
  'coconut_aromatic_surveys',
  'community_enterprises',
  'smart_farmers',
  'smart_farmer_sf',
  'young_smart_farmer_ysf',
  'agricultural_career_groups',
  'farmer_groups',
  'housewife_farmer_groups',
  'young_farmer_groups',
  'young_farmer_groups_detailed',
  'agri_tourism',
  'forecast_plots',
  'pest_outbreaks',
  'pest_centers',
  'plant_doctors',
  'soil_fertilizer_centers',
  'biocontrol_stock',
  'fire_hotspots',
  'forum_posts',
  'forum_comments',
]);

export function canUseCustomFields(tableName) {
  return CUSTOM_FIELD_TABLES.has(tableName);
}

export function makeCustomDataIndex(fieldKey) {
  return `custom__${fieldKey}`;
}

export function isValidCustomFieldKey(value) {
  return /^[a-z][a-z0-9_]{1,40}$/.test(value || '');
}

export function normalizeCustomFieldKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

export function parseCustomOptions(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatCustomValue(value, definition) {
  if (value === null || value === undefined || value === '') return '';
  if (definition?.field_type === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function flattenCustomFields(row, definitions) {
  const customFields = row?.custom_fields || {};
  return definitions.reduce(
    (acc, definition) => ({
      ...acc,
      [makeCustomDataIndex(definition.field_key)]:
        customFields[definition.field_key] ?? null,
    }),
    { ...row }
  );
}

export async function fetchCustomFieldDefinitions(tableName) {
  if (!canUseCustomFields(tableName)) return [];

  const { data, error } = await supabase
    .from('custom_field_definitions')
    .select('*')
    .eq('table_name', tableName)
    .is('archived_at', null)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createCustomFieldDefinition(tableName, values) {
  const payload = {
    table_name: tableName,
    field_key: values.field_key,
    label: values.label,
    field_type: values.field_type,
    options:
      values.field_type === 'select' ? parseCustomOptions(values.options) : [],
    is_required: Boolean(values.is_required),
    is_visible: values.is_visible !== false,
    display_order: Number(values.display_order || 0),
  };

  const { data, error } = await supabase
    .from('custom_field_definitions')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  logAction('CREATE', 'custom_field_definitions', data.id, null, data);
  return data;
}

export async function updateCustomFieldDefinition(id, oldData, values) {
  const payload = {
    label: values.label,
    options:
      oldData.field_type === 'select' ? parseCustomOptions(values.options) : [],
    is_required: Boolean(values.is_required),
    is_visible: values.is_visible !== false,
    display_order: Number(values.display_order || 0),
  };

  const { data, error } = await supabase
    .from('custom_field_definitions')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  logAction('UPDATE', 'custom_field_definitions', id, oldData, data);
  return data;
}

export async function archiveCustomFieldDefinition(definition) {
  const { data, error } = await supabase
    .from('custom_field_definitions')
    .update({ archived_at: new Date().toISOString(), is_visible: false })
    .eq('id', definition.id)
    .select()
    .single();

  if (error) throw error;
  logAction(
    'DELETE',
    'custom_field_definitions',
    definition.id,
    definition,
    data
  );
  return data;
}

export async function deleteCustomFieldDefinition(definition) {
  const { data, error } = await supabase.rpc(
    'delete_custom_field_definition_as_service',
    { p_definition_id: definition.id }
  );

  if (error) throw error;
  logAction('DELETE', 'custom_field_definitions', definition.id, definition, {
    hard_deleted: true,
    affected_rows: data?.[0]?.affected_rows || 0,
  });
  return data?.[0] || { affected_rows: 0 };
}
