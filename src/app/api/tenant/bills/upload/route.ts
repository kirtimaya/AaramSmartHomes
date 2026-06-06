import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireTenant } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  const auth = await requireTenant(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, roomId } = auth;

  if (!roomId) {
    return NextResponse.json({ error: 'You have no assigned room' }, { status: 403 });
  }

  const { data: room } = await supabaseAdmin
    .from('rooms')
    .select('property_id')
    .eq('id', roomId)
    .single();

  if (!room?.property_id) {
    return NextResponse.json({ error: 'Room has no property' }, { status: 404 });
  }

  const formData = await request.formData();
  const billMonth   = formData.get('bill_month') as string;        // YYYY-MM
  const totalAmount = Number(formData.get('total_amount') || 0);
  const totalUnits  = Number(formData.get('total_units')  || 0);
  const imageFile   = formData.get('image') as File | null;

  if (!billMonth) {
    return NextResponse.json({ error: 'bill_month is required (YYYY-MM)' }, { status: 400 });
  }

  const billMonthDate = `${billMonth}-01`;

  // Prevent duplicate submission for same month
  const { data: existing } = await supabaseAdmin
    .from('electricity_bills')
    .select('id, status')
    .eq('property_id', room.property_id)
    .eq('bill_month', billMonthDate)
    .not('status', 'eq', 'rejected')
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'A bill already exists for this month', existing },
      { status: 409 }
    );
  }

  // Upload image
  let billImageUrl: string | null = null;
  if (imageFile && imageFile.size > 0) {
    const ext  = imageFile.name.split('.').pop() || 'jpg';
    const path = `electricity-bills/${room.property_id}/${billMonth}-tenant-${userId.slice(0, 8)}.${ext}`;
    const { data: stored, error: storageErr } = await supabaseAdmin.storage
      .from('bills')
      .upload(path, imageFile, { upsert: true, contentType: imageFile.type });
    if (!storageErr && stored) {
      const { data: { publicUrl } } = supabaseAdmin.storage.from('bills').getPublicUrl(path);
      billImageUrl = publicUrl;
    }
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('name')
    .eq('id', userId)
    .single();

  const { data: bill, error } = await supabaseAdmin
    .from('electricity_bills')
    .insert({
      property_id:      room.property_id,
      bill_month:       billMonthDate,
      total_units:      totalUnits || 0,
      total_amount:     totalAmount || 0,
      common_units:     0,
      common_amount:    0,
      bill_image_url:   billImageUrl,
      uploaded_by:      userId,
      uploaded_by_name: tenant?.name ?? 'Tenant',
      upload_source:    'tenant',
      status:           'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(bill, { status: 201 });
}
