import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, supabaseAdmin } from '@/lib/supabaseAdmin';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { adminClient: db, email: adminEmail } = auth;

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

  let userId: string;
  let emailSent = false;

  if (inv.email && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Try to create/resend invite via auth
    const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      inv.email,
      {
        data: { name: inv.name },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/tenant`,
      }
    );

    if (!inviteErr && inviteData?.user) {
      userId = inviteData.user.id;
      emailSent = true;
    } else {
      // User already exists — find by email
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const existing = users.find(u => u.email === inv.email);
      if (existing) {
        userId = existing.id;
      } else {
        // Auth creation failed for unknown reason — fall back to placeholder UUID
        userId = randomUUID();
      }
    }
  } else {
    // No email or no service role key — create a placeholder tenant record.
    // The auth callback will re-link the real UID when the tenant signs up.
    userId = randomUUID();
  }

  // Check if tenant record already exists with this userId
  const { data: existingTenant } = await db
    .from('tenants')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  // Also check if a tenant with this email already exists (for email-based re-link)
  let emailConflict = false;
  if (inv.email) {
    const { data: byEmail } = await db
      .from('tenants')
      .select('id')
      .eq('email', inv.email)
      .maybeSingle();
    if (byEmail && byEmail.id !== userId) emailConflict = true;
  }

  let tenant;
  if (existingTenant) {
    const { data, error } = await db
      .from('tenants')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    tenant = data;
  } else if (!emailConflict) {
    const { data, error } = await db
      .from('tenants')
      .insert({
        id:           userId,
        name:         inv.name,
        email:        inv.email ?? null,
        phone:        inv.phone ?? null,
        room_id:      inv.room_id ?? null,
        status:       'active',
        move_in_date: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    tenant = data;
  } else {
    // Email already exists as tenant — just activate that existing record
    const { data, error } = await db
      .from('tenants')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('email', inv.email)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    tenant = data;
    userId = tenant.id;
  }

  // Update room occupancy
  if (inv.room_id) {
    await db
      .from('rooms')
      .update({ occupancy_status: 'Occupied', tenant_id: userId })
      .eq('id', inv.room_id);
  }

  // Mark invitation accepted
  await db
    .from('tenant_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitationId);

  // Audit log
  await db.from('tenant_change_log').insert({
    tenant_id:        userId,
    changed_by_email: adminEmail,
    changes: {
      status:                   { from: 'pending_invitation', to: 'active' },
      activated_from_invitation: invitationId,
      email_sent:               emailSent,
    },
  });

  return NextResponse.json({ ...tenant, email_sent: emailSent }, { status: 201 });
}
