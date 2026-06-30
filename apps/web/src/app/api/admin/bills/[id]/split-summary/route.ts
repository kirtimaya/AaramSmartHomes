import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin } from '@/lib/supabaseAdmin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const { data: bill } = await supabaseAdmin
    .from('electricity_bills')
    .select('id, total_units, total_amount, status')
    .eq('id', id)
    .single();

  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });

  const { data: splits } = await supabaseAdmin
    .from('bill_splits')
    .select('*, rooms(name)')
    .eq('bill_id', id)
    .order('tenant_name');

  const { data: submissions } = await supabaseAdmin
    .from('tenant_ac_submissions')
    .select('*')
    .eq('bill_id', id);

  const totalAttributedUnits = (splits ?? []).reduce((sum: number, s: any) => sum + s.ac_units, 0);
  const unattributedUnits = bill.total_units - totalAttributedUnits;

  const summaryRows = (splits ?? []).map((s: any) => ({
    id:            s.id,
    tenant_name:   s.tenant_name,
    room:          s.rooms?.name,
    ac_units:      s.ac_units,
    ac_charge:     s.ac_charge,
    common_share:  s.common_share,
    total_payable: s.total_payable,
    locked_at:     s.locked_at,
    submission:    submissions?.find((sub: any) => sub.room_id === s.room_id),
  }));

  return NextResponse.json({
    bill,
    summary: summaryRows,
    unattributed_units: unattributedUnits,
  });
}
