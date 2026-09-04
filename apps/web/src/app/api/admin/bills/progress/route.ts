import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  // Fetch all properties with their rooms
  const { data: properties } = await supabaseAdmin
    .from('properties')
    .select('id, name')
    .order('name');

  if (!properties?.length) return NextResponse.json([]);

  const results = await Promise.all(properties.map(async (property) => {
    // Most recent bill for this property
    const { data: bill } = await supabaseAdmin
      .from('electricity_bills')
      .select('id, bill_month, status, rejection_reason, created_at, uploaded_by_name')
      .eq('property_id', property.id)
      .order('bill_month', { ascending: false })
      .limit(1)
      .maybeSingle();

    // All rooms with AC for this property
    const { data: acRooms } = await supabaseAdmin
      .from('rooms')
      .select('id, name, tenant_name, tenant_id, has_ac')
      .eq('property_id', property.id)
      .eq('has_ac', true)
      .order('name');

    // Fetch tenant contact info for AC rooms
    const tenantIds = (acRooms ?? []).map(r => r.tenant_id).filter(Boolean) as string[];
    const tenantContacts: Record<string, { phone: string | null; email: string | null }> = {};
    if (tenantIds.length > 0) {
      const { data: contacts } = await supabaseAdmin
        .from('tenants')
        .select('id, phone, email')
        .in('id', tenantIds);
      (contacts ?? []).forEach(c => { tenantContacts[c.id] = { phone: c.phone, email: c.email }; });
    }

    // AC submissions for current bill (if any)
    const submissions: { room_id: string; ac_units_submitted: number; submitted_at: string; meter_photo_url: string | null }[] = [];
    if (bill && ['validated', 'split_calculated', 'locked'].includes(bill.status)) {
      const { data: subs } = await supabaseAdmin
        .from('tenant_ac_submissions')
        .select('room_id, ac_units_submitted, submitted_at, meter_photo_url')
        .eq('bill_id', bill.id);
      if (subs) submissions.push(...subs);
    }

    // Bill splits (if calculated)
    let splits: { tenant_name: string; room_id: string; ac_units: number; ac_charge: number; common_share: number; total_payable: number }[] = [];
    if (bill && ['split_calculated', 'locked'].includes(bill.status)) {
      const { data: s } = await supabaseAdmin
        .from('bill_splits')
        .select('tenant_name, room_id, ac_units, ac_charge, common_share, total_payable')
        .eq('bill_id', bill.id)
        .order('tenant_name');
      if (s) splits = s;
    }

    const acRoomProgress = (acRooms ?? []).map(r => {
      const sub = submissions.find(s => s.room_id === r.id);
      const contact = r.tenant_id ? tenantContacts[r.tenant_id] : null;
      return {
        room_id:            r.id,
        room_name:          r.name,
        tenant_name:        r.tenant_name || '(vacant)',
        tenant_phone:       contact?.phone ?? null,
        tenant_email:       contact?.email ?? null,
        submitted:          !!sub,
        ac_units_submitted: sub?.ac_units_submitted ?? null,
        submitted_at:       sub?.submitted_at ?? null,
        meter_photo_url:    sub?.meter_photo_url ?? null,
      };
    });

    return {
      property_id:   property.id,
      property_name: property.name,
      bill: bill ?? null,
      ac_rooms_total:     acRooms?.length ?? 0,
      ac_rooms_submitted: submissions.length,
      ac_room_progress:   acRoomProgress,
      splits,
    };
  }));

  return NextResponse.json(results);
}
