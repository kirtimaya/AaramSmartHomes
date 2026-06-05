import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin } from '@/lib/supabaseAdmin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { tenant_id, ac_units } = await request.json();

  if (!tenant_id || typeof ac_units !== 'number' || ac_units < 0) {
    return NextResponse.json({ error: 'tenant_id and non-negative ac_units are required' }, { status: 400 });
  }

  // Find the tenant's room submission for this bill
  const { data: existing } = await supabaseAdmin
    .from('tenant_ac_submissions')
    .select('*')
    .eq('bill_id', id)
    .eq('tenant_id', tenant_id)
    .maybeSingle();

  let data, error;

  if (existing) {
    ({ data, error } = await supabaseAdmin
      .from('tenant_ac_submissions')
      .update({ is_admin_override: true, admin_override_value: ac_units })
      .eq('id', existing.id)
      .select()
      .single());
  } else {
    // Find the room for this tenant
    const { data: tenant } = await supabaseAdmin
      .from('tenants').select('room_id').eq('id', tenant_id).single();

    if (!tenant?.room_id) {
      return NextResponse.json({ error: 'Tenant not found or has no room' }, { status: 404 });
    }

    ({ data, error } = await supabaseAdmin
      .from('tenant_ac_submissions')
      .insert({
        bill_id: id,
        tenant_id,
        room_id: tenant.room_id,
        ac_units_submitted: ac_units,
        is_admin_override: true,
        admin_override_value: ac_units,
      })
      .select()
      .single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
