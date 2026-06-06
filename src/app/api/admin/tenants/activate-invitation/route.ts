import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { adminClient: db, email: adminEmail } = auth;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is required to activate tenants' },
      { status: 501 }
    );
  }

  const { invitationId } = await request.json();
  if (!invitationId) {
    return NextResponse.json({ error: 'invitationId is required' }, { status: 400 });
  }

  // Fetch invitation
  const { data: inv, error: invErr } = await db
    .from('tenant_invitations')
    .select('id, name, email, phone, room_id, status')
    .eq('id', invitationId)
    .single();

  if (invErr || !inv) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  }
  if (inv.status !== 'pending') {
    return NextResponse.json({ error: 'Invitation is no longer pending' }, { status: 409 });
  }
  if (!inv.email) {
    return NextResponse.json({ error: 'Invitation has no email address' }, { status: 400 });
  }

  // Resolve or create auth user
  let userId: string;

  const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    inv.email,
    {
      data: { name: inv.name },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/tenant`,
    }
  );

  if (!inviteErr && inviteData?.user) {
    userId = inviteData.user.id;
  } else {
    // User already exists — find by email
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existing = users.find(u => u.email === inv.email);
    if (!existing) {
      return NextResponse.json(
        { error: inviteErr?.message ?? 'Could not create or find auth user' },
        { status: 500 }
      );
    }
    userId = existing.id;
  }

  // Check if tenant record already exists
  const { data: existingTenant } = await db
    .from('tenants')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  let tenant;
  if (existingTenant) {
    // Already exists — just mark active
    const { data, error } = await db
      .from('tenants')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    tenant = data;
  } else {
    // Create tenant record
    const { data, error } = await db
      .from('tenants')
      .insert({
        id:           userId,
        name:         inv.name,
        email:        inv.email,
        phone:        inv.phone ?? null,
        room_id:      inv.room_id ?? null,
        status:       'active',
        move_in_date: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    tenant = data;
  }

  // Update room occupancy if room is assigned
  if (inv.room_id) {
    await db
      .from('rooms')
      .update({ occupancy_status: 'Occupied', tenant_id: userId })
      .eq('id', inv.room_id);
  }

  // Mark invitation as accepted
  await db
    .from('tenant_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitationId);

  // Audit log
  await db.from('tenant_change_log').insert({
    tenant_id:        userId,
    changed_by_email: adminEmail,
    changes:          { status: { from: 'pending_invitation', to: 'active' }, activated_from_invitation: invitationId },
  });

  return NextResponse.json(tenant, { status: 201 });
}
