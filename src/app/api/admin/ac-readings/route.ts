import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin } from '@/lib/supabaseAdmin';

// GET  /api/admin/ac-readings?month=YYYY-MM-01
// Returns all AC meter readings for the given month (or current month if omitted),
// joined with room and tenant info, with computed units consumed.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const defaultMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
  const month = request.nextUrl.searchParams.get('month') ?? defaultMonth;

  // Compute previous month
  const d = new Date(month + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() - 1);
  const prevMonth = d.toISOString().slice(0, 10).slice(0, 7) + '-01';

  // Fetch current month readings
  const { data: current, error: e1 } = await supabaseAdmin
    .from('ac_meter_readings')
    .select('tenant_id, room_id, meter_reading, photo_url, submitted_at')
    .eq('reading_month', month);

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  // Fetch previous month readings for the same tenants
  const tenantIds = (current ?? []).map(r => r.tenant_id);
  const { data: previous } = tenantIds.length
    ? await supabaseAdmin
        .from('ac_meter_readings')
        .select('tenant_id, meter_reading')
        .eq('reading_month', prevMonth)
        .in('tenant_id', tenantIds)
    : { data: [] };

  const prevMap = new Map((previous ?? []).map(r => [r.tenant_id, r.meter_reading]));

  // Fetch tenant + room info
  const { data: rooms } = await supabaseAdmin
    .from('rooms')
    .select('id, name, property_id')
    .eq('has_ac', true);

  const { data: tenants } = tenantIds.length
    ? await supabaseAdmin
        .from('tenants')
        .select('id, name')
        .in('id', tenantIds)
    : { data: [] };

  const roomMap   = new Map((rooms ?? []).map(r => [r.id, r]));
  const tenantMap = new Map((tenants ?? []).map(t => [t.id, t.name as string]));

  const rows = (current ?? []).map(r => {
    const prev  = prevMap.get(r.tenant_id) ?? null;
    const units = prev !== null ? Number(r.meter_reading) - Number(prev) : null;
    return {
      tenant_id:        r.tenant_id,
      tenant_name:      tenantMap.get(r.tenant_id) ?? 'Unknown',
      room_id:          r.room_id,
      room_name:        roomMap.get(r.room_id)?.name ?? 'Unknown',
      current_reading:  r.meter_reading,
      previous_reading: prev,
      units_consumed:   units,
      photo_url:        r.photo_url,
      submitted_at:     r.submitted_at,
    };
  });

  // Also include AC rooms that have no submission yet for this month
  const submittedRooms = new Set((current ?? []).map(r => r.room_id));
  const missingRooms = (rooms ?? []).filter(r => !submittedRooms.has(r.id));
  for (const r of missingRooms) {
    rows.push({
      tenant_id: '',
      tenant_name: '—',
      room_id: r.id,
      room_name: r.name,
      current_reading: null as unknown as number,
      previous_reading: null,
      units_consumed: null,
      photo_url: null,
      submitted_at: null as unknown as string,
    });
  }

  rows.sort((a, b) => a.room_name.localeCompare(b.room_name));

  return NextResponse.json({ month, rows });
}
