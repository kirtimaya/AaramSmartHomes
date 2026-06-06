-- ============================================================
-- Admin cleanup + Kirtimaya email fix
-- Run in Supabase SQL editor (postgres role)
-- ============================================================

-- Remove all admin entries (root user is kirtimayaswain@gmail.com via ROOT_EMAIL env, not the admins table)
DELETE FROM admins;

-- Update Kirtimaya Swain's email in tenant_invitations (no email was set in seed, so this adds it)
UPDATE tenant_invitations
SET email = 'kirtimayaswan@gmail.com'
WHERE phone = '8270102379'
  AND name ILIKE '%kirtimaya%'
  AND (email IS NULL OR email != 'kirtimayaswan@gmail.com');

-- Update in tenants table if they have already signed up with a different email
UPDATE tenants
SET email = 'kirtimayaswan@gmail.com'
WHERE phone = '8270102379'
  AND name ILIKE '%kirtimaya%'
  AND email != 'kirtimayaswan@gmail.com';

-- Verify admins table is empty
SELECT COUNT(*) AS remaining_admins FROM admins;

-- Verify Kirtimaya's invitation email
SELECT name, phone, email, status
FROM tenant_invitations
WHERE phone = '8270102379';
