import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin } from '@/lib/supabaseAdmin';

// GET  /api/admin/meal-attendance?date=YYYY-MM-DD
// Returns all meal attendance records for the given date.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const date = request.nextUrl.searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'date query param required (YYYY-MM-DD)' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('meal_attendance')
    .select('tenant_id, meal_block')
    .eq('attendance_date', date);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

// POST /api/admin/meal-attendance
// Body: { tenantId, date, mealBlock }
// Toggles attendance — inserts if absent, deletes if present.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { email } = auth;

  const { tenantId, date, mealBlock } = await request.json();
  if (!tenantId || !date || !mealBlock) {
    return NextResponse.json({ error: 'tenantId, date, mealBlock required' }, { status: 400 });
  }

  // Check if record exists
  const { data: existing } = await supabaseAdmin
    .from('meal_attendance')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('attendance_date', date)
    .eq('meal_block', mealBlock)
    .maybeSingle();

  if (existing) {
    // Toggle off — delete
    await supabaseAdmin
      .from('meal_attendance')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('attendance_date', date)
      .eq('meal_block', mealBlock);

    return NextResponse.json({ toggled: 'off' });
  }

  // Toggle on — insert
  const { error } = await supabaseAdmin
    .from('meal_attendance')
    .insert({ tenant_id: tenantId, attendance_date: date, meal_block: mealBlock, marked_by: email });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ toggled: 'on' }, { status: 201 });
}
