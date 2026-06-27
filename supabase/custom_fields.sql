CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  archived_at TIMESTAMPTZ,
  promoted_at TIMESTAMPTZ,
  promoted_column_name TEXT,
  CONSTRAINT custom_field_definitions_field_key_format
    CHECK (field_key ~ '^[a-z][a-z0-9_]{1,40}$'),
  CONSTRAINT custom_field_definitions_field_type_check
    CHECK (field_type IN ('text', 'textarea', 'number', 'date', 'select', 'boolean')),
  CONSTRAINT custom_field_definitions_options_array
    CHECK (jsonb_typeof(options) = 'array'),
  CONSTRAINT custom_field_definitions_allowed_table_check
    CHECK (
      table_name IN (
        'farmer_registry',
        'agricultural_areas',
        'learning_centers',
        'disasters',
        'daily_weather',
        'large_plots',
        'certifications',
        'crop_production',
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
        'forum_comments'
      )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_field_definitions_active_key
  ON public.custom_field_definitions (table_name, field_key)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_table_order
  ON public.custom_field_definitions (table_name, display_order, created_at)
  WHERE archived_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_custom_field_definition_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
  END IF;
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

DROP TRIGGER IF EXISTS trg_custom_field_definition_metadata ON public.custom_field_definitions;
CREATE TRIGGER trg_custom_field_definition_metadata
  BEFORE INSERT OR UPDATE ON public.custom_field_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_custom_field_definition_metadata();

CREATE OR REPLACE FUNCTION public.enforce_custom_field_definition_rules()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD.field_type <> NEW.field_type
    AND OLD.archived_at IS NULL
  THEN
    RAISE EXCEPTION 'field_type cannot be changed after creation';
  END IF;

  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL) THEN
    SELECT COUNT(*)
      INTO active_count
      FROM public.custom_field_definitions
     WHERE table_name = NEW.table_name
       AND archived_at IS NULL
       AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF active_count >= 30 THEN
      RAISE EXCEPTION 'custom field limit reached for table %', NEW.table_name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

DROP TRIGGER IF EXISTS trg_custom_field_definition_rules ON public.custom_field_definitions;
CREATE TRIGGER trg_custom_field_definition_rules
  BEFORE INSERT OR UPDATE ON public.custom_field_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_custom_field_definition_rules();

ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.custom_field_definitions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.custom_field_definitions TO authenticated;

DROP POLICY IF EXISTS "Visible custom fields readable" ON public.custom_field_definitions;
CREATE POLICY "Visible custom fields readable" ON public.custom_field_definitions
  FOR SELECT
  USING (archived_at IS NULL AND is_visible = true);

DROP POLICY IF EXISTS "Admin manage custom fields" ON public.custom_field_definitions;
CREATE POLICY "Admin manage custom fields" ON public.custom_field_definitions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DO $$
DECLARE
  target_table TEXT;
  target_tables TEXT[] := ARRAY[
    'farmer_registry',
    'agricultural_areas',
    'learning_centers',
    'disasters',
    'daily_weather',
    'large_plots',
    'certifications',
    'crop_production',
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
    'forum_comments'
  ];
BEGIN
  FOREACH target_table IN ARRAY target_tables LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = target_table
        AND c.relkind IN ('r', 'p')
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT ''{}''::jsonb',
        target_table
      );
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I USING GIN (custom_fields)',
        'idx_' || target_table || '_custom_fields',
        target_table
      );
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.delete_custom_field_definition_as_service(
  p_definition_id UUID
)
RETURNS TABLE (
  deleted_table_name TEXT,
  deleted_field_key TEXT,
  affected_rows INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  definition RECORD;
  rows_changed INTEGER := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can delete custom fields';
  END IF;

  SELECT *
    INTO definition
    FROM public.custom_field_definitions
   WHERE id = p_definition_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'custom field definition not found';
  END IF;

  IF definition.promoted_at IS NOT NULL THEN
    RAISE EXCEPTION 'promoted custom fields cannot be deleted by this operation';
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET custom_fields = custom_fields - $1 WHERE custom_fields ? $1',
    definition.table_name
  )
  USING definition.field_key;

  GET DIAGNOSTICS rows_changed = ROW_COUNT;

  DELETE FROM public.custom_field_definitions
   WHERE id = p_definition_id;

  deleted_table_name := definition.table_name;
  deleted_field_key := definition.field_key;
  affected_rows := rows_changed;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_custom_field_definition_as_service(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_custom_field_definition_as_service(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_custom_field_definition_as_service(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_custom_field_definition_as_service(UUID) TO service_role;
