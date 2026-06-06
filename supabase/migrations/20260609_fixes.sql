-- Fix 1: Allow bill_splits.tenant_id to be NULL (vacant rooms have no tenant)
ALTER TABLE bill_splits ALTER COLUMN tenant_id DROP NOT NULL;

-- Fix 2: Add auth_user_id to tenant_invitations to track who claimed which invite
ALTER TABLE tenant_invitations
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Fix 3: Remove all tenants whose room_id does not match any invitation room
-- (seed tenants' invites exist in tenant_invitations; test/stale accounts do not)
-- Preserves the root admin account even if not in invitations
DELETE FROM tenants
WHERE id IN (
  SELECT t.id FROM tenants t
  WHERE t.room_id IS NULL
     OR t.room_id NOT IN (SELECT room_id FROM tenant_invitations)
);

-- Fix 4: Reset any occupied rooms that have no valid tenant record
-- (rooms set to Occupied by seed migration but no tenant has claimed yet)
UPDATE rooms
SET tenant_id = NULL
WHERE tenant_id IS NOT NULL
  AND tenant_id NOT IN (SELECT id FROM tenants);
