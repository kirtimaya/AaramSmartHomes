import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { allACRoomsSubmitted } from '@/lib/billUtils';

export type BillShareStatus =
  | 'no_bill'          // Main bill not uploaded yet
  | 'pending'          // Bill uploaded but not yet validated
  | 'rejected'         // Bill was rejected
  | 'waiting_readings' // Validated but some AC readings missing
  | 'calculated'       // Split done, not yet locked (admin reviewing)
  | 'locked';          // Split locked — tenant can see their amount

export interface BillShareResponse {
  status: BillShareStatus;
  message: string;
  bill_month?: string;
  ac_progress?: { submitted: number; total: number };
  my_split?: {
    ac_units: number;
    ac_charge: number;
    common_share: number;
    total_payable: number;
  };
  all_splits?: { tenant_name: string; total_payable: number }[];
}

export async function GET(request: NextRequest): Promise<NextResponse<BillShareResponse>> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ status: 'no_bill', message: 'Unauthorized' }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ status: 'no_bill', message: 'Unauthorized' }, { status: 401 });

  // Resolve tenant → room → property
  const { data: tenant } = await supabaseAdmin
    .from('tenants').select('id, room_id').eq('id', user.id).single();

  if (!tenant?.room_id) {
    return NextResponse.json({ status: 'no_bill', message: 'No room assigned to your account.' });
  }

  const { data: room } = await supabaseAdmin
    .from('rooms').select('id, property_id, has_ac').eq('id', tenant.room_id).single();

  if (!room?.property_id) {
    return NextResponse.json({ status: 'no_bill', message: 'Room configuration incomplete.' });
  }

  // Find the most recent electricity bill for this property (any status)
  const { data: bill } = await supabaseAdmin
    .from('electricity_bills')
    .select('id, bill_month, status, rejection_reason')
    .eq('property_id', room.property_id)
    .order('bill_month', { ascending: false })
    .limit(1)
    .maybeSingle();

  const monthLabel = bill?.bill_month
    ? new Date(bill.bill_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : undefined;

  // ── No bill at all ────────────────────────────────────────────────────────
  if (!bill) {
    return NextResponse.json({
      status: 'no_bill',
      message: 'Electricity bill not uploaded yet. Please check back later.',
    });
  }

  // ── Bill pending validation ───────────────────────────────────────────────
  if (bill.status === 'pending') {
    return NextResponse.json({
      status: 'pending',
      bill_month: monthLabel,
      message: `Electricity bill for ${monthLabel} has been uploaded and is being reviewed.`,
    });
  }

  // ── Bill rejected ─────────────────────────────────────────────────────────
  if (bill.status === 'rejected') {
    return NextResponse.json({
      status: 'rejected',
      bill_month: monthLabel,
      message: `The electricity bill for ${monthLabel} was rejected and needs to be re-uploaded. Our team has been notified.`,
    });
  }

  // ── Bill validated — check AC submissions ─────────────────────────────────
  if (bill.status === 'validated') {
    const { submitted, total } = await allACRoomsSubmitted(bill.id, room.property_id);
    return NextResponse.json({
      status: 'waiting_readings',
      bill_month: monthLabel,
      ac_progress: { submitted, total },
      message: submitted < total
        ? `AC meter readings not received from some flatmates (${submitted}/${total} submitted). We will notify you once the split is calculated!`
        : `All meter readings received for ${monthLabel}. Split is being calculated.`,
    });
  }

  // ── Split calculated (admin reviewing) ───────────────────────────────────
  if (bill.status === 'split_calculated') {
    const { data: mySplit } = await supabaseAdmin
      .from('bill_splits')
      .select('ac_units, ac_charge, common_share, total_payable')
      .eq('bill_id', bill.id)
      .eq('room_id', tenant.room_id)
      .maybeSingle();

    return NextResponse.json({
      status: 'calculated',
      bill_month: monthLabel,
      message: `Split calculated for ${monthLabel}. Your admin is reviewing before finalising.`,
      my_split: mySplit ?? undefined,
    });
  }

  // ── Bill locked — show final split ───────────────────────────────────────
  if (bill.status === 'locked') {
    const [splitRes, allRes] = await Promise.all([
      supabaseAdmin
        .from('bill_splits')
        .select('ac_units, ac_charge, common_share, total_payable')
        .eq('bill_id', bill.id)
        .eq('room_id', tenant.room_id)
        .maybeSingle(),
      supabaseAdmin
        .from('bill_splits')
        .select('tenant_name, total_payable')
        .eq('bill_id', bill.id)
        .order('tenant_name'),
    ]);

    return NextResponse.json({
      status: 'locked',
      bill_month: monthLabel,
      message: `Your electricity dues for ${monthLabel} have been finalised.`,
      my_split: splitRes.data ?? undefined,
      all_splits: allRes.data ?? [],
    });
  }

  return NextResponse.json({ status: 'no_bill', message: 'Unknown bill status.' });
}
