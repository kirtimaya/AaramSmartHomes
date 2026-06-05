import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, room_id')
    .eq('id', user.id)
    .single();

  if (!tenant?.room_id) {
    return NextResponse.json({ error: 'Tenant has no assigned room' }, { status: 404 });
  }

  // Find the room's property
  const { data: room } = await supabaseAdmin
    .from('rooms')
    .select('id, property_id')
    .eq('id', tenant.room_id)
    .single();

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  // Find latest locked bill for this property
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: bill } = await supabaseAdmin
    .from('electricity_bills')
    .select('id, bill_month, total_amount, status')
    .eq('property_id', room.property_id)
    .eq('status', 'locked')
    .gte('bill_month', `${currentMonth}-01`)
    .order('bill_month', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!bill) {
    return NextResponse.json({ bill: null, my_split: null, summary: [] });
  }

  // Get this tenant's split
  const { data: mySplit } = await supabaseAdmin
    .from('bill_splits')
    .select('*')
    .eq('bill_id', bill.id)
    .eq('room_id', tenant.room_id)
    .single();

  // Get all splits for this bill (total_payable only — no ac_units exposed to other tenants)
  const { data: allSplits } = await supabaseAdmin
    .from('bill_splits')
    .select('tenant_name, total_payable, room_id')
    .eq('bill_id', bill.id)
    .order('tenant_name');

  return NextResponse.json({
    bill,
    my_split: mySplit,
    summary: allSplits ?? [],
  });
}
