import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabaseAdmin';

// ── Pure split math (shared between calculate-split route and auto-trigger) ───

export function calculateSplitMath(
  bill: { total_amount: number; total_units: number },
  rooms: Array<{ id: string; has_ac: boolean; tenant_name?: string | null; tenant_id?: string | null }>,
  submissions: Array<{ room_id: string; ac_units_submitted: number; is_admin_override: boolean; admin_override_value?: number | null }>,
  acRatePerUnit: number
) {
  const totalRooms = rooms.length;
  let totalACCharge = 0;
  const splits: Array<{
    room_id: string;
    tenant_id: string | null;
    tenant_name: string;
    acUnits: number;
    acCharge: number;
    commonShare: number;
    totalPayable: number;
  }> = [];

  for (const room of rooms) {
    const sub = submissions.find(s => s.room_id === room.id);
    const acUnits = room.has_ac
      ? (sub?.is_admin_override && sub.admin_override_value != null
          ? sub.admin_override_value
          : sub?.ac_units_submitted ?? 0)
      : 0;
    const acCharge = parseFloat((acUnits * acRatePerUnit).toFixed(2));
    totalACCharge += acCharge;
    splits.push({ room_id: room.id, tenant_id: room.tenant_id ?? null, tenant_name: room.tenant_name || 'Unknown', acUnits, acCharge, commonShare: 0, totalPayable: 0 });
  }

  const commonPool = parseFloat((bill.total_amount - totalACCharge).toFixed(2));
  const rawShare   = Math.floor((commonPool / totalRooms) * 100) / 100;
  const residual   = parseFloat((commonPool - rawShare * totalRooms).toFixed(2));

  splits.sort((a, b) => a.tenant_name.localeCompare(b.tenant_name));
  splits[0].commonShare = parseFloat((rawShare + residual).toFixed(2));
  for (let i = 1; i < splits.length; i++) splits[i].commonShare = rawShare;
  for (const s of splits) s.totalPayable = parseFloat((s.acCharge + s.commonShare).toFixed(2));

  return { splits, totalACCharge, commonPool, unattributedUnits: bill.total_units - splits.reduce((t, s) => t + s.acUnits, 0) };
}

// ── Run split calculation and persist results ─────────────────────────────────

export async function runCalculateSplit(billId: string, db: SupabaseClient = supabaseAdmin): Promise<{ success: boolean; error?: string; missing_submissions?: string[] }> {
  const { data: bill, error: billErr } = await db
    .from('electricity_bills')
    .select('*, properties(ac_rate_per_unit)')
    .eq('id', billId)
    .single();

  if (billErr || !bill) return { success: false, error: 'Bill not found' };
  if (bill.status === 'locked')    return { success: false, error: 'Bill is already locked' };
  if (bill.status !== 'validated') return { success: false, error: 'Bill must be validated before splitting' };

  const acRate = (bill as any).properties?.ac_rate_per_unit ?? 9.00;

  const { data: rooms } = await db
    .from('rooms')
    .select('id, has_ac, tenant_name, tenant_id')
    .eq('property_id', bill.property_id)
    .order('name');

  if (!rooms?.length) return { success: false, error: 'No rooms found for this property' };

  const { data: submissions } = await db
    .from('tenant_ac_submissions')
    .select('*')
    .eq('bill_id', billId);

  const { splits } = calculateSplitMath(bill, rooms, submissions ?? [], acRate);

  const { error: splitErr } = await db
    .from('bill_splits')
    .upsert(
      splits.map(s => ({
        bill_id:       billId,
        room_id:       s.room_id,
        tenant_id:     s.tenant_id,
        tenant_name:   s.tenant_name,
        ac_units:      s.acUnits,
        ac_charge:     s.acCharge,
        common_share:  s.commonShare,
        total_payable: s.totalPayable,
      })),
      { onConflict: 'bill_id,room_id' }
    );

  if (splitErr) return { success: false, error: splitErr.message };

  await db
    .from('electricity_bills')
    .update({ status: 'split_calculated', updated_at: new Date().toISOString() })
    .eq('id', billId);

  const missing = rooms.filter(r => r.has_ac && !(submissions ?? []).find(s => s.room_id === r.id)).map(r => r.tenant_name || r.id);
  return { success: true, missing_submissions: missing };
}

// ── Check whether all AC rooms have submitted for a bill ──────────────────────

export async function allACRoomsSubmitted(billId: string, propertyId: string, db: SupabaseClient = supabaseAdmin): Promise<{ ready: boolean; submitted: number; total: number }> {
  const { data: acRooms } = await db
    .from('rooms')
    .select('id')
    .eq('property_id', propertyId)
    .eq('has_ac', true);

  const total = acRooms?.length ?? 0;
  if (total === 0) return { ready: false, submitted: 0, total: 0 };

  const { data: subs } = await db
    .from('tenant_ac_submissions')
    .select('room_id')
    .eq('bill_id', billId);

  const submitted = acRooms!.filter(r => subs?.some(s => s.room_id === r.id)).length;
  return { ready: submitted === total, submitted, total };
}
