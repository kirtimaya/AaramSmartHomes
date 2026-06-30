import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin } from '@/lib/supabaseAdmin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();
  const { usc_no, ac_rate_per_unit } = body;

  if (!usc_no && ac_rate_per_unit === undefined) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (usc_no !== undefined) updates.usc_no = usc_no;
  if (ac_rate_per_unit !== undefined) updates.ac_rate_per_unit = ac_rate_per_unit;

  const { data, error } = await supabaseAdmin
    .from('properties')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
