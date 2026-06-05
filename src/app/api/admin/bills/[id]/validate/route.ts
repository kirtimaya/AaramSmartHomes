import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin } from '@/lib/supabaseAdmin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const { data: bill, error: billErr } = await supabaseAdmin
    .from('electricity_bills')
    .select('*, properties(usc_no)')
    .eq('id', id)
    .single();

  if (billErr || !bill) {
    return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
  }

  if (bill.status !== 'pending') {
    return NextResponse.json({ error: `Bill is already ${bill.status}` }, { status: 409 });
  }

  const property = (bill as any).properties;

  // ── Check 1: USC No. ──────────────────────────────────────────────────────
  if (property?.usc_no && bill.usc_no && bill.usc_no !== property.usc_no) {
    const { data } = await supabaseAdmin
      .from('electricity_bills')
      .update({ status: 'rejected', rejection_reason: 'USC No. mismatch', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return NextResponse.json({ status: 'rejected', rejection_reason: 'USC No. mismatch', bill: data });
  }

  if (!property?.usc_no) {
    // Property has no USC No. configured — warn but don't fail check 1
    // (admin should configure USC No. first; for now pass this check)
  }

  // ── Check 2: Period continuity ────────────────────────────────────────────
  const { data: lastBill } = await supabaseAdmin
    .from('electricity_bills')
    .select('present_date, present_reading')
    .eq('property_id', bill.property_id)
    .eq('status', 'validated')
    .order('bill_month', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastBill && bill.previous_date && lastBill.present_date) {
    if (bill.previous_date !== lastBill.present_date) {
      const { data } = await supabaseAdmin
        .from('electricity_bills')
        .update({ status: 'rejected', rejection_reason: 'Period mismatch', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      return NextResponse.json({ status: 'rejected', rejection_reason: 'Period mismatch', bill: data });
    }
  }

  // ── Check 3: Units consistency ─────────────────────────────────────────────
  if (bill.present_reading != null && bill.previous_reading != null && bill.total_units != null) {
    const computed = bill.present_reading - bill.previous_reading;
    if (Math.abs(computed - bill.total_units) > 1) {
      const { data } = await supabaseAdmin
        .from('electricity_bills')
        .update({ status: 'rejected', rejection_reason: 'Unit count inconsistency', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      return NextResponse.json({ status: 'rejected', rejection_reason: 'Unit count inconsistency', bill: data });
    }
  }

  // ── All checks passed ──────────────────────────────────────────────────────
  const { data: updated } = await supabaseAdmin
    .from('electricity_bills')
    .update({ status: 'validated', rejection_reason: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  return NextResponse.json({ status: 'validated', bill: updated });
}
