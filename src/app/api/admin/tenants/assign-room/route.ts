import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { tenantId, roomId } = await request.json();
  if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });

  // Get current room assignment
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, room_id')
    .eq('id', tenantId)
    .single();

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const oldRoomId = tenant.room_id;

  // Update tenants.room_id
  const { error: tErr } = await supabaseAdmin
    .from('tenants')
    .update({ room_id: roomId ?? null })
    .eq('id', tenantId);
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  // Clear old room
  if (oldRoomId && oldRoomId !== roomId) {
    await supabaseAdmin
      .from('rooms')
      .update({ tenant_id: null, tenant_name: null, occupancy_status: 'Vacant' })
      .eq('id', oldRoomId);
  }

  // Set new room
  if (roomId) {
    await supabaseAdmin
      .from('rooms')
      .update({ tenant_id: tenantId, tenant_name: tenant.name, occupancy_status: 'Occupied' })
      .eq('id', roomId);
  }

  return NextResponse.json({ ok: true });
}
