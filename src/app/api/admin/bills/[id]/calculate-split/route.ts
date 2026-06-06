import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin } from '@/lib/supabaseAdmin';

function calculateSplit(
  bill: { total_amount: number; total_units: number },
  rooms: Array<{ id: string; has_ac: boolean; tenant_name?: string; tenant_id?: string | null }>,
  acSubmissions: Array<{ room_id: string; ac_units_submitted: number; is_admin_override: boolean; admin_override_value?: number | null }>,
  acRatePerUnit: number
) {
  const totalRooms = rooms.length;
  let totalACCharge = 0;
  const splits: Array<{
    room_id: string;
    tenant_id: string | null;
    tenant_name: string;
    acUnits: number;
    acCharge: number;
    commonShare: number;
    totalPayable: number;
  }> = [];

  for (const room of rooms) {
    const submission = acSubmissions.find(s => s.room_id === room.id);
    const acUnits = room.has_ac
      ? (submission?.is_admin_override && submission.admin_override_value != null
          ? submission.admin_override_value
          : submission?.ac_units_submitted ?? 0)
      : 0;
    const acCharge = parseFloat((acUnits * acRatePerUnit).toFixed(2));
    totalACCharge += acCharge;
    splits.push({ room_id: room.id, tenant_id: room.tenant_id ?? null, tenant_name: room.tenant_name || 'Unknown', acUnits, acCharge, commonShare: 0, totalPayable: 0 });
  }

  const commonPool = parseFloat((bill.total_amount - totalACCharge).toFixed(2));
  const rawShare = Math.floor((commonPool / totalRooms) * 100) / 100;
  const residual = parseFloat((commonPool - rawShare * totalRooms).toFixed(2));

  // Sort alphabetically; first tenant absorbs residual
  splits.sort((a, b) => a.tenant_name.localeCompare(b.tenant_name));
  splits[0].commonShare = parseFloat((rawShare + residual).toFixed(2));
  for (let i = 1; i < splits.length; i++) splits[i].commonShare = rawShare;

  for (const s of splits) {
    s.totalPayable = parseFloat((s.acCharge + s.commonShare).toFixed(2));
  }

  const unattributedUnits = bill.total_units - splits.reduce((sum, s) => sum + s.acUnits, 0);
  return { splits, totalACCharge, commonPool, unattributedUnits };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const { data: bill, error: billErr } = await supabaseAdmin
    .from('electricity_bills')
    .select('*, properties(ac_rate_per_unit)')
    .eq('id', id)
    .single();

  if (billErr || !bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
  if (bill.status !== 'validated') {
    return NextResponse.json({ error: 'Bill must be validated before splitting' }, { status: 409 });
  }

  const acRate = (bill as any).properties?.ac_rate_per_unit ?? 9.00;

  // Fetch all rooms for property
  const { data: rooms } = await supabaseAdmin
    .from('rooms')
    .select('id, has_ac, tenant_name, tenant_id')
    .eq('property_id', bill.property_id)
    .order('name');

  if (!rooms?.length) {
    return NextResponse.json({ error: 'No rooms found for this property' }, { status: 422 });
  }

  // Fetch AC submissions
  const { data: submissions } = await supabaseAdmin
    .from('tenant_ac_submissions')
    .select('*')
    .eq('bill_id', id);

  const { splits, unattributedUnits } = calculateSplit(
    bill,
    rooms,
    submissions ?? [],
    acRate
  );

  // Upsert bill_splits
  const now = new Date().toISOString();
  const upsertRows = splits.map(s => ({
    bill_id:       id,
    room_id:       s.room_id,
    tenant_id:     s.tenant_id,
    tenant_name:   s.tenant_name,
    ac_units:      s.acUnits,
    ac_charge:     s.acCharge,
    common_share:  s.commonShare,
    total_payable: s.totalPayable,
  }));

  const { data: savedSplits, error: splitErr } = await supabaseAdmin
    .from('bill_splits')
    .upsert(upsertRows, { onConflict: 'bill_id,room_id' })
    .select();

  if (splitErr) return NextResponse.json({ error: splitErr.message }, { status: 500 });

  await supabaseAdmin
    .from('electricity_bills')
    .update({ status: 'split_calculated', updated_at: now })
    .eq('id', id);

  // Warn about missing AC submissions
  const missingSubmissions = rooms
    .filter(r => r.has_ac)
    .filter(r => !(submissions ?? []).find(s => s.room_id === r.id))
    .map(r => r.tenant_name || r.id);

  return NextResponse.json({
    splits: savedSplits,
    unattributed_units: unattributedUnits,
    missing_submissions: missingSubmissions,
  });
}
