import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin } from '@/lib/supabaseAdmin';

// GET  /api/admin/meal-service-periods?tenantId=xxx
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = request.nextUrl.searchParams.get('tenantId');
  if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('meal_service_periods')
    .select('id, tenant_id, start_date, end_date, created_at')
    .eq('tenant_id', tenantId)
    .order('start_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/admin/meal-service-periods
// Body: { tenantId, startDate, endDate }
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { tenantId, startDate, endDate } = await request.json();
  if (!tenantId || !startDate || !endDate) {
    return NextResponse.json({ error: 'tenantId, startDate, endDate required' }, { status: 400 });
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: 'endDate must be on or after startDate' }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from('meal_service_periods')
    .insert({ tenant_id: tenantId, start_date: startDate, end_date: endDate })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/admin/meal-service-periods?id=xxx
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('meal_service_periods')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: id });
}
