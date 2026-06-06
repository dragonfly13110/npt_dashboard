ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS budget_round INTEGER,
  ADD COLUMN IF NOT EXISTS source_file TEXT,
  ADD COLUMN IF NOT EXISTS source_row_id INTEGER,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

UPDATE budgets
SET
  budget_round = COALESCE(
    budget_round,
    NULLIF(notes::jsonb ->> 'round', '')::integer,
    2
  ),
  source_file = COALESCE(
    source_file,
    NULLIF(notes::jsonb ->> 'sourceFile', ''),
    'agricultural_plan_checked.xlsx'
  ),
  source_row_id = COALESCE(
    source_row_id,
    NULLIF(notes::jsonb ->> 'sourceId', '')::integer
  )
WHERE notes IS NOT NULL
  AND notes ~ '^\\s*\\{';

UPDATE budgets
SET budget_round = COALESCE(budget_round, 2)
WHERE budget_round IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS budgets_source_round_row_uidx
ON budgets (fiscal_year, budget_round, source_file, source_row_id)
WHERE source_file IS NOT NULL AND source_row_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS budgets_fiscal_year_round_idx
ON budgets (fiscal_year, budget_round);
