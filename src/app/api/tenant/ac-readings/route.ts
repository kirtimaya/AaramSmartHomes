import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireTenant } from '@/lib/supabaseAdmin';

function currentMonthStart(): string {
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000); // IST
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

// GET  /api/tenant/ac-readings
// Returns the last two readings for the tenant so the portal can show
// previous reading and whether current month is already submitted.
export async function GET(request: NextRequest) {
  const auth = await requireTenant(request);
  if (auth instanceof NextResponse) return auth;
  const { tenantId } = auth;

  const { data, error } = await supabaseAdmin
    .from('ac_meter_readings')
    .select('id, reading_month, meter_reading, photo_url, submitted_at')
    .eq('tenant_id', tenantId)
    .order('reading_month', { ascending: false })
    .limit(2);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const thisMonth = currentMonthStart();
  const current  = data?.find(r => r.reading_month === thisMonth) ?? null;
  const previous = data?.find(r => r.reading_month !== thisMonth) ?? null;

  return NextResponse.json({ current, previous });
}

// POST /api/tenant/ac-readings
// Body: { meter_reading: number, photo_url?: string }
// Upserts a reading for the current month.
export async function POST(request: NextRequest) {
  const auth = await requireTenant(request);
  if (auth instanceof NextResponse) return auth;
  const { tenantId, roomId } = auth;

  if (!roomId) {
    return NextResponse.json({ error: 'You have no assigned room' }, { status: 403 });
  }

  const { data: room } = await supabaseAdmin
    .from('rooms')
    .select('has_ac')
    .eq('id', roomId)
    .single();

  if (!room?.has_ac) {
    return NextResponse.json({ error: 'Your room does not have AC' }, { status: 400 });
  }

  const body = await request.json();
  const meterReading = Number(body.meter_reading);
  const photoUrl     = body.photo_url as string | undefined;

  if (isNaN(meterReading) || meterReading < 0) {
    return NextResponse.json({ error: 'meter_reading must be a non-negative number' }, { status: 400 });
  }

  const readingMonth = currentMonthStart();

  const { data, error } = await supabaseAdmin
    .from('ac_meter_readings')
    .upsert({
      tenant_id:     tenantId,
      room_id:       roomId,
      reading_month: readingMonth,
      meter_reading: meterReading,
      photo_url:     photoUrl ?? null,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'tenant_id,reading_month' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
