-- Fix 1: Allow bill_splits.tenant_id to be NULL (vacant rooms have no tenant)
ALTER TABLE bill_splits ALTER COLUMN tenant_id DROP NOT NULL;

-- Fix 2: Add auth_user_id to tenant_invitations to track who claimed which invite
ALTER TABLE tenant_invitations
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Fix 3: Remove stale (non-seed) tenants — clear FK dependents first
-- Identify stale tenant IDs: those whose room_id doesn't match any invitation
DO $$
DECLARE
  stale_ids UUID[];
BEGIN
  SELECT ARRAY(
    SELECT t.id FROM tenants t
    WHERE t.room_id IS NULL
       OR t.room_id NOT IN (SELECT room_id FROM tenant_invitations)
  ) INTO stale_ids;

  IF array_length(stale_ids, 1) IS NULL THEN
    RAISE NOTICE 'No stale tenants found — skipping cleanup.';
    RETURN;
  END IF;

  -- Clear dependent rows so the tenant DELETE can proceed
  DELETE FROM payments              WHERE tenant_id = ANY(stale_ids);
  DELETE FROM bill_splits           WHERE tenant_id = ANY(stale_ids);
  DELETE FROM tenant_ac_submissions WHERE tenant_id = ANY(stale_ids);
  DELETE FROM tickets               WHERE requester_id = ANY(stale_ids) AND requester_type = 'tenant';
  DELETE FROM notifications         WHERE user_id = ANY(stale_ids) AND user_type = 'tenant';
  DELETE FROM tenant_meal_preferences WHERE tenant_id = ANY(stale_ids);
  DELETE FROM meal_skip_requests    WHERE tenant_id = ANY(stale_ids);
  DELETE FROM tenant_profiles       WHERE tenant_id = ANY(stale_ids);

  -- Now safe to delete the tenants themselves
  DELETE FROM tenants WHERE id = ANY(stale_ids);

  RAISE NOTICE 'Removed % stale tenant(s).', array_length(stale_ids, 1);
END;
$$;

-- Fix 4: Reset any rooms whose tenant_id points to a now-deleted tenant
UPDATE rooms
SET tenant_id = NULL
WHERE tenant_id IS NOT NULL
  AND tenant_id NOT IN (SELECT id FROM tenants);
