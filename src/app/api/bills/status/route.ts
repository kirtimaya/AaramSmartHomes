import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get('property_id');
  const billMonth  = searchParams.get('bill_month'); // YYYY-MM

  if (!propertyId || !billMonth) {
    return NextResponse.json({ error: 'property_id and bill_month are required' }, { status: 400 });
  }

  const billMonthDate = billMonth.length === 7 ? `${billMonth}-01` : billMonth;

  const { data: bill } = await supabaseAdmin
    .from('electricity_bills')
    .select('id, status, rejection_reason, uploaded_by_name, created_at')
    .eq('property_id', propertyId)
    .eq('bill_month', billMonthDate)
    .not('status', 'eq', 'rejected')
    .maybeSingle();

  if (!bill) {
    return NextResponse.json({ status: null });
  }

  return NextResponse.json({
    id:               bill.id,
    status:           bill.status,
    rejection_reason: bill.rejection_reason,
    uploaded_by_name: bill.uploaded_by_name,
    uploaded_at:      bill.created_at,
  });
}
