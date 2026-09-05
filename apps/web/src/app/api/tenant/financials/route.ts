import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireTenant } from '@/lib/supabaseAdmin';

interface IncomeRecord {
  id: string;
  amount: number;
  income_type: string;
  income_date: string;
  note: string | null;
}

export async function GET(request: NextRequest) {
  const auth = await requireTenant(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, roomId } = auth;

  const empty = {
    deposit_total: 0, deposit_records: [] as IncomeRecord[],
    rent_records: [] as IncomeRecord[], rent_total_paid: 0,
    setup_cost_total: 0,
  };

  if (!roomId) return NextResponse.json(empty);

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('move_in_date, move_out_date')
    .eq('id', userId)
    .single();

  // Rooms are re-let to new tenants over time, and income_records only
  // keys by room_id (no tenant_id) — without a move_in_date we can't tell
  // this tenant's history apart from a previous occupant's, so rather than
  // risk showing someone else's rent/deposit amounts, return empty.
  if (!tenant?.move_in_date) {
    return NextResponse.json({ ...empty, warning: 'Move-in date not set on your profile yet — ask admin to add it.' });
  }

  let query = supabaseAdmin
    .from('income_records')
    .select('id, amount, income_type, income_date, note')
    .eq('room_id', roomId)
    .gte('income_date', tenant.move_in_date)
    .order('income_date', { ascending: true });

  if (tenant.move_out_date) query = query.lte('income_date', tenant.move_out_date);

  const { data: records, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const depositRecords = (records ?? []).filter(r => r.income_type === 'deposit') as IncomeRecord[];
  const rentRecords    = (records ?? []).filter(r => r.income_type === 'rent') as IncomeRecord[];
  const setupRecords   = (records ?? []).filter(r => r.income_type === 'setup_cost') as IncomeRecord[];

  return NextResponse.json({
    deposit_total:    depositRecords.reduce((s, r) => s + Number(r.amount), 0),
    deposit_records:  depositRecords,
    rent_records:     rentRecords,
    rent_total_paid:  rentRecords.reduce((s, r) => s + Number(r.amount), 0),
    setup_cost_total: setupRecords.reduce((s, r) => s + Number(r.amount), 0),
  });
}
