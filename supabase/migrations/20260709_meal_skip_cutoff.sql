-- ============================================================
-- Server-side enforcement of the "skip/change a meal at least 8 hours
-- before the meal window starts" rule. Previously this was ONLY checked
-- client-side (apps/web/src/app/tenant/components/MealsTab.tsx
-- isMealLocked()) — nothing stopped a direct API call, a second browser
-- tab past the cutoff, or clock drift from writing a late skip.
--
-- meal_windows is the single source of truth for window times, read by
-- both this trigger and clients (packages/core/src/food/mealCutoff.ts
-- mirrors these exact times — keep them in sync if ever changed here).
-- ============================================================

CREATE TABLE IF NOT EXISTS meal_windows (
  meal_block   TEXT PRIMARY KEY CHECK (meal_block IN ('Breakfast', 'Lunch', 'Dinner')),
  window_start TIME NOT NULL,
  window_end   TIME NOT NULL
);

INSERT INTO meal_windows (meal_block, window_start, window_end) VALUES
  ('Breakfast', '08:00', '10:00'),
  ('Lunch',     '13:00', '15:00'),
  ('Dinner',    '20:30', '22:30')
ON CONFLICT (meal_block) DO UPDATE SET window_start = EXCLUDED.window_start, window_end = EXCLUDED.window_end;

ALTER TABLE meal_windows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone_read_meal_windows" ON meal_windows;
CREATE POLICY "anyone_read_meal_windows" ON meal_windows FOR SELECT USING (true);

-- ── Trigger: enforce the 8-hour-before-window-start cutoff ────────────────

CREATE OR REPLACE FUNCTION enforce_meal_skip_cutoff()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- needed so auth_is_admin() can read the admins table under any caller's RLS
AS $$
DECLARE
  rec    RECORD := COALESCE(NEW, OLD);
  cutoff TIMESTAMPTZ;
BEGIN
  -- Bypass for service-role callers (Spring JDBC, Supabase service key — auth.uid() is
  -- NULL for both) and admins (corrections, Aara's mark_member_absent tool in Phase 7).
  IF auth.uid() IS NULL OR auth_is_admin() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT ((rec.skip_date::timestamp + mw.window_start) AT TIME ZONE 'Asia/Kolkata') - INTERVAL '8 hours'
    INTO cutoff
  FROM meal_windows mw
  WHERE mw.meal_block = rec.meal_block;

  IF cutoff IS NOT NULL AND now() >= cutoff THEN
    RAISE EXCEPTION 'MEAL_SKIP_CUTOFF_PASSED: changes for % on % are locked 8 hours before the meal window', rec.meal_block, rec.skip_date
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Covers INSERT (skip), UPDATE (rare, but same rule applies), and DELETE
-- (un-skipping late is just as disruptive to kitchen headcount as skipping late).
DROP TRIGGER IF EXISTS trg_meal_skip_cutoff ON meal_skip_requests;
CREATE TRIGGER trg_meal_skip_cutoff
  BEFORE INSERT OR UPDATE OR DELETE ON meal_skip_requests
  FOR EACH ROW EXECUTE FUNCTION enforce_meal_skip_cutoff();
