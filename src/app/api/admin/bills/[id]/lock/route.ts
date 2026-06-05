import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin } from '@/lib/supabaseAdmin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const { data: bill } = await supabaseAdmin
    .from('electricity_bills')
    .select('id, status, property_id')
    .eq('id', id)
    .single();

  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });

  if (bill.status !== 'split_calculated') {
    return NextResponse.json({ error: 'Bill must have split calculated before locking' }, { status: 409 });
  }

  const now = new Date().toISOString();

  // Lock all split rows
  const { error: splitErr } = await supabaseAdmin
    .from('bill_splits')
    .update({ locked_at: now })
    .eq('bill_id', id);

  if (splitErr) return NextResponse.json({ error: splitErr.message }, { status: 500 });

  // Lock the bill
  const { error: billErr } = await supabaseAdmin
    .from('electricity_bills')
    .update({ status: 'locked', updated_at: now })
    .eq('id', id);

  if (billErr) return NextResponse.json({ error: billErr.message }, { status: 500 });

  // In-app notification: insert a notification record if that table exists
  // (fire-and-forget — don't fail if table doesn't exist)
  const { data: splits } = await supabaseAdmin
    .from('bill_splits')
    .select('tenant_id, total_payable')
    .eq('bill_id', id);

  if (splits?.length) {
    const notifications = splits.map((s: any) => ({
      user_id:   s.tenant_id,
      type:      'bill_locked',
      message:   `Your electricity bill has been finalized. Total payable: ₹${s.total_payable}`,
      read:      false,
      created_at: now,
    }));

    // Attempt to insert notifications — ignore error if table doesn't exist
    await supabaseAdmin.from('notifications').insert(notifications).then(() => {});
  }

  return NextResponse.json({ success: true });
}
