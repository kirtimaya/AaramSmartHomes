import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bill_id: string }> }
) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bill_id } = await params;
  const { ac_units_submitted } = await request.json();

  if (typeof ac_units_submitted !== 'number' || ac_units_submitted < 0) {
    return NextResponse.json({ error: 'ac_units_submitted must be a non-negative number' }, { status: 400 });
  }

  const { data: bill } = await supabaseAdmin
    .from('electricity_bills')
    .select('id, status, property_id')
    .eq('id', bill_id)
    .single();

  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });

  if (bill.status === 'locked') {
    return NextResponse.json({ error: 'Bill is already locked' }, { status: 403 });
  }

  if (bill.status !== 'validated') {
    return NextResponse.json({ error: 'Bill is not in validated state' }, { status: 409 });
  }

  // Find tenant's room in this property
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, room_id')
    .eq('id', user.id)
    .single();

  if (!tenant?.room_id) {
    return NextResponse.json({ error: 'Tenant has no assigned room' }, { status: 403 });
  }

  // Verify the room belongs to the bill's property
  const { data: room } = await supabaseAdmin
    .from('rooms')
    .select('id, property_id')
    .eq('id', tenant.room_id)
    .eq('property_id', bill.property_id)
    .single();

  if (!room) {
    return NextResponse.json({ error: 'You are not a tenant of this property' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('tenant_ac_submissions')
    .upsert({
      bill_id,
      tenant_id: user.id,
      room_id:   tenant.room_id,
      ac_units_submitted,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'bill_id,room_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bill_id: string }> }
) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bill_id } = await params;

  // Check if admin
  const { data: adminRow } = await supabaseAdmin
    .from('admins').select('id').eq('email', user.email).single();

  if (adminRow) {
    // Admin: return all submissions
    const { data, error } = await supabaseAdmin
      .from('tenant_ac_submissions')
      .select('*')
      .eq('bill_id', bill_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Tenant: return own submission only
  const { data: tenant } = await supabaseAdmin
    .from('tenants').select('room_id').eq('id', user.id).single();

  const { data, error } = await supabaseAdmin
    .from('tenant_ac_submissions')
    .select('*')
    .eq('bill_id', bill_id)
    .eq('tenant_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
