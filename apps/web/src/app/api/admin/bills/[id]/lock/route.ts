import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabaseAdmin';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { logAudit } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { adminClient: db, email: actorEmail, userId: actorId } = auth;

  const { id } = await params;

  const { data: bill } = await db
    .from('electricity_bills')
    .select('id, status, property_id')
    .eq('id', id)
    .single();

  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });

  if (bill.status !== 'split_calculated') {
    return NextResponse.json({ error: 'Bill must have split calculated before locking' }, { status: 409 });
  }

  const now = new Date().toISOString();

  const { error: splitErr } = await db
    .from('bill_splits')
    .update({ locked_at: now })
    .eq('bill_id', id);

  if (splitErr) return NextResponse.json({ error: splitErr.message }, { status: 500 });

  const { error: billErr } = await db
    .from('electricity_bills')
    .update({ status: 'locked', updated_at: now })
    .eq('id', id);

  if (billErr) return NextResponse.json({ error: billErr.message }, { status: 500 });

  await logAudit({
    actorId, actorEmail, actorRole: 'admin', action: 'bill.lock',
    entityType: 'bill', entityId: id, before: { status: bill.status }, after: { status: 'locked' },
  });

  const { data: splits } = await db
    .from('bill_splits')
    .select('tenant_id, total_payable')
    .eq('bill_id', id);

  if (splits?.length) {
    const notifications = splits.map((s: any) => ({
      user_id:   s.tenant_id,
      user_type: 'tenant',
      type:      'bill_locked',
      title:     'Electricity Bill Finalised',
      message:   `Your electricity bill has been finalised. Total payable: ₹${Number(s.total_payable).toLocaleString('en-IN')}`,
      read:      false,
      created_at: now,
    }));

    await db.from('notifications').insert(notifications).then(() => {});

    const tenantIds = splits.map((s: any) => s.tenant_id);
    const { data: tenants } = await db
      .from('tenants')
      .select('id, name, phone')
      .in('id', tenantIds);

    if (tenants) {
      await Promise.all(tenants.map((t: any) => {
        if (!t.phone) return Promise.resolve();
        const split = splits.find((s: any) => s.tenant_id === t.id);
        if (!split) return Promise.resolve();
        return sendWhatsAppMessage(
          t.phone,
          `Hi ${t.name}! Your electricity bill has been finalised. Total payable: ₹${Number(split.total_payable).toLocaleString('en-IN')}. Log in to your Aaram portal for details.`
        );
      }));
    }
  }

  return NextResponse.json({ success: true });
}
