-- Allow all authenticated users (tenants + admins) to read menus and menu_items.
-- Without these policies the tenant portal MealsTab cannot load the weekly menu.
-- Admin INSERT/UPDATE is already covered by kitchen page which runs under admin session.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'menus' AND policyname = 'menus_read_authenticated'
  ) THEN
    CREATE POLICY "menus_read_authenticated" ON menus
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'menu_items' AND policyname = 'menu_items_read_authenticated'
  ) THEN
    CREATE POLICY "menu_items_read_authenticated" ON menu_items
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Also ensure menus/menu_items have RLS enabled (in case they were created without it)
ALTER TABLE IF EXISTS menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS menu_items ENABLE ROW LEVEL SECURITY;
