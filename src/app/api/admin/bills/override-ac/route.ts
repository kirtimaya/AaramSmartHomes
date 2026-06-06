import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin } from '@/lib/supabaseAdmin';
import { allACRoomsSubmitted, runCalculateSplit } from '@/lib/billUtils';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { adminClient } = auth;

  const { bill_id, room_id, ac_units_submitted } = await request.json();
  if (!bill_id || !room_id || typeof ac_units_submitted !== 'number') {
    return NextResponse.json({ error: 'bill_id, room_id, ac_units_submitted required' }, { status: 400 });
  }

  const { data: bill } = await adminClient
    .from('electricity_bills')
    .select('id, status, property_id')
    .eq('id', bill_id)
    .single();

  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
  if (bill.status === 'locked') return NextResponse.json({ error: 'Bill is locked' }, { status: 403 });

  const { data: room } = await adminClient
    .from('rooms')
    .select('id, tenant_id')
    .eq('id', room_id)
    .single();

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  const { error } = await adminClient
    .from('tenant_ac_submissions')
    .upsert({
      bill_id,
      room_id,
      tenant_id:         room.tenant_id ?? null,
      ac_units_submitted,
      submitted_at:      new Date().toISOString(),
    }, { onConflict: 'bill_id,room_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { ready, submitted, total } = await allACRoomsSubmitted(bill_id, bill.property_id, adminClient);
  let auto_calculated = false;
  if (ready) {
    const result = await runCalculateSplit(bill_id, adminClient);
    auto_calculated = result.success;
  }

  return NextResponse.json({ ok: true, auto_calculated, ac_progress: { submitted, total } });
}
