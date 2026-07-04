import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { adminClient: db, email: actorEmail, userId: actorId } = auth;

  const { id } = await params;

  const { data: bill, error: billErr } = await db
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
  const now = new Date().toISOString();

  // ── Check 1: USC No. ──────────────────────────────────────────────────────
  if (property?.usc_no && bill.usc_no && bill.usc_no !== property.usc_no) {
    const { data } = await db
      .from('electricity_bills')
      .update({ status: 'rejected', rejection_reason: 'USC No. mismatch', updated_at: now })
      .eq('id', id).select().single();
    await logAudit({
      actorId, actorEmail, actorRole: 'admin', action: 'bill.validate',
      entityType: 'bill', entityId: id, before: { status: bill.status }, after: data,
    });
    return NextResponse.json({ status: 'rejected', rejection_reason: 'USC No. mismatch', bill: data });
  }

  // ── Check 2: Period continuity ────────────────────────────────────────────
  const { data: lastBill } = await db
    .from('electricity_bills')
    .select('present_date, present_reading')
    .eq('property_id', bill.property_id)
    .eq('status', 'validated')
    .order('bill_month', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastBill && bill.previous_date && lastBill.present_date) {
    if (bill.previous_date !== lastBill.present_date) {
      const { data } = await db
        .from('electricity_bills')
        .update({ status: 'rejected', rejection_reason: 'Period mismatch', updated_at: now })
        .eq('id', id).select().single();
      await logAudit({
        actorId, actorEmail, actorRole: 'admin', action: 'bill.validate',
        entityType: 'bill', entityId: id, before: { status: bill.status }, after: data,
      });
      return NextResponse.json({ status: 'rejected', rejection_reason: 'Period mismatch', bill: data });
    }
  }

  // ── Check 3: Units consistency ─────────────────────────────────────────────
  if (bill.present_reading != null && bill.previous_reading != null && bill.total_units != null) {
    const computed = bill.present_reading - bill.previous_reading;
    if (Math.abs(computed - bill.total_units) > 1) {
      const { data } = await db
        .from('electricity_bills')
        .update({ status: 'rejected', rejection_reason: 'Unit count inconsistency', updated_at: now })
        .eq('id', id).select().single();
      await logAudit({
        actorId, actorEmail, actorRole: 'admin', action: 'bill.validate',
        entityType: 'bill', entityId: id, before: { status: bill.status }, after: data,
      });
      return NextResponse.json({ status: 'rejected', rejection_reason: 'Unit count inconsistency', bill: data });
    }
  }

  // ── All checks passed ──────────────────────────────────────────────────────
  const { data: updated } = await db
    .from('electricity_bills')
    .update({ status: 'validated', rejection_reason: null, updated_at: now })
    .eq('id', id).select().single();

  await logAudit({
    actorId, actorEmail, actorRole: 'admin', action: 'bill.validate',
    entityType: 'bill', entityId: id, before: { status: bill.status }, after: updated,
  });

  return NextResponse.json({ status: 'validated', bill: updated });
}
