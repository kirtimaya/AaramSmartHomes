import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireTenant } from '@/lib/supabaseAdmin';

// GET /api/tenant/menus?from=YYYY-MM-DD&to=YYYY-MM-DD
// Fetches menus + items via the service-role client, bypassing RLS.
export async function GET(request: NextRequest) {
  const auth = await requireTenant(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = request.nextUrl;
  const from = searchParams.get('from');
  const to   = searchParams.get('to');

  let query = supabaseAdmin
    .from('menus')
    .select('date, meal_block, menu_items(item_name, sort_order)');

  if (from) query = query.gte('date', from);
  if (to)   query = query.lte('date', to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
