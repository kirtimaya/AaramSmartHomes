-- Allow authenticated tenants to read menus and menu_items.
-- Previously only admins had access, so MealsTab returned empty results.

CREATE POLICY "tenants_read_menus" ON menus
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "tenants_read_menu_items" ON menu_items
  FOR SELECT TO authenticated USING (true);
