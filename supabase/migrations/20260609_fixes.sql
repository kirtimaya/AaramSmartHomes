-- Fix 1: Allow bill_splits.tenant_id to be NULL (vacant rooms have no tenant)
ALTER TABLE bill_splits ALTER COLUMN tenant_id DROP NOT NULL;

-- Fix 2: Add auth_user_id to tenant_invitations to track who claimed which invite
ALTER TABLE tenant_invitations
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Fix 3: Remove stale (non-seed) tenants
-- Dynamically discovers every table with a FK pointing at tenants and clears it,
-- so we never hit a constraint error regardless of schema shape.
DO $$
DECLARE
  stale_ids  UUID[];
  rec        RECORD;
  sql_stmt   TEXT;
BEGIN
  -- Collect stale tenant IDs (those not linked to any invitation)
  SELECT ARRAY(
    SELECT t.id FROM tenants t
    WHERE t.room_id IS NULL
       OR t.room_id NOT IN (SELECT room_id FROM tenant_invitations)
  ) INTO stale_ids;

  IF array_length(stale_ids, 1) IS NULL THEN
    RAISE NOTICE 'No stale tenants found — skipping cleanup.';
    RETURN;
  END IF;

  -- For every table that has a FK column referencing tenants.id,
  -- delete rows where that column matches a stale tenant ID.
  FOR rec IN
    SELECT
      kcu.table_name  AS tbl,
      kcu.column_name AS col
    FROM information_schema.table_constraints       tc
    JOIN information_schema.key_column_usage        kcu
      ON kcu.constraint_name = tc.constraint_name
     AND kcu.table_schema    = tc.table_schema
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name  = tc.constraint_name
     AND rc.constraint_schema = tc.constraint_schema
    JOIN information_schema.key_column_usage        ccu
      ON ccu.constraint_name  = rc.unique_constraint_name
     AND ccu.constraint_schema = rc.unique_constraint_schema
    WHERE tc.constraint_type  = 'FOREIGN KEY'
      AND ccu.table_name      = 'tenants'
      AND ccu.column_name     = 'id'
      AND tc.table_schema     = 'public'
  LOOP
    sql_stmt := format(
      'DELETE FROM %I WHERE %I = ANY($1)',
      rec.tbl, rec.col
    );
    RAISE NOTICE 'Clearing stale refs: %', sql_stmt;
    EXECUTE sql_stmt USING stale_ids;
  END LOOP;

  -- Now safe to delete
  DELETE FROM tenants WHERE id = ANY(stale_ids);
  RAISE NOTICE 'Removed % stale tenant(s).', array_length(stale_ids, 1);
END;
$$;

-- Fix 4: Reset rooms whose tenant_id points to a now-deleted tenant
UPDATE rooms
SET tenant_id = NULL
WHERE tenant_id IS NOT NULL
  AND tenant_id NOT IN (SELECT id FROM tenants);
