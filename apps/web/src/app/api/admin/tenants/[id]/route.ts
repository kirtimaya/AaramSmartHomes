import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/audit';

type Params = { params: Promise<{ id: string }> };

// ── GET single tenant ────────────────────────────────────────────────────────
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { data, error } = await auth.adminClient
    .from('tenants')
    .select('id, name, email, phone, room_id, move_in_date, status, created_at')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  return NextResponse.json(data);
}

// ── PUT update tenant details ─────────────────────────────────────────────────
// Accepted fields: name, email, phone, move_in_date, status
// All others ignored. Logs changes to tenant_change_log.
export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { adminClient: db, email: adminEmail, userId: actorId } = auth;

  const { id } = await params;
  const body = await request.json();

  const ALLOWED = ['name', 'email', 'phone', 'move_in_date', 'move_out_date', 'status'] as const;
  type AllowedKey = typeof ALLOWED[number];

  const { data: current, error: fetchErr } = await db
    .from('tenants')
    .select('name, email, phone, move_in_date, move_out_date, status')
    .eq('id', id)
    .single();

  if (fetchErr || !current) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  // Build update payload + detect changes
  const update: Partial<Record<AllowedKey, string | null>> = {};
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  for (const key of ALLOWED) {
    if (!(key in body)) continue;
    const incoming = body[key] === '' ? null : body[key];
    const existing = (current as Record<string, unknown>)[key] ?? null;
    if (incoming !== existing) {
      update[key] = incoming;
      changes[key] = { from: existing, to: incoming };
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, message: 'No changes' });
  }

  const { data: updated, error: updateErr } = await db
    .from('tenants')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Write audit log (fire-and-forget — don't fail the request if logging fails)
  await db.from('tenant_change_log').insert({
    tenant_id:        id,
    changed_by_email: adminEmail,
    changes,
  }).then(() => {});

  await logAudit({
    actorId, actorEmail: adminEmail, actorRole: 'admin', action: 'tenant.update',
    entityType: 'tenant', entityId: id, before: current, after: updated,
  });

  return NextResponse.json(updated);
}

// ── PATCH toggle status only (convenience shortcut) ──────────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { adminClient: db, email: adminEmail, userId: actorId } = auth;

  const { id } = await params;
  const { status } = await request.json();

  if (!['active', 'inactive', 'notice', 'moved_out'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { data: current } = await db
    .from('tenants').select('status').eq('id', id).single();

  const { data, error } = await db
    .from('tenants')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from('tenant_change_log').insert({
    tenant_id:        id,
    changed_by_email: adminEmail,
    changes:          { status: { from: current?.status ?? null, to: status } },
  }).then(() => {});

  await logAudit({
    actorId, actorEmail: adminEmail, actorRole: 'admin', action: 'tenant.update_status',
    entityType: 'tenant', entityId: id,
    before: { status: current?.status ?? null }, after: { status },
  });

  return NextResponse.json(data);
}
