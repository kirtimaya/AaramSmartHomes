import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  // requireAdmin handles both root email and admins table check
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { data: { user } } = await supabaseAdmin.auth.getUser(
    request.headers.get('Authorization')!.replace('Bearer ', '')
  );
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const uploadSource = 'admin';

  const formData = await request.formData();
  const propertyId  = formData.get('property_id') as string;
  const billMonth   = formData.get('bill_month') as string;   // YYYY-MM
  const uscNo       = formData.get('usc_no') as string | null;
  const presentReading  = Number(formData.get('present_reading'));
  const previousReading = Number(formData.get('previous_reading'));
  const presentDate     = formData.get('present_date') as string | null;
  const previousDate    = formData.get('previous_date') as string | null;
  const totalAmount     = Number(formData.get('total_amount'));
  const imageFile       = formData.get('image') as File | null;

  if (!propertyId || !billMonth) {
    return NextResponse.json({ error: 'property_id and bill_month are required' }, { status: 400 });
  }

  if (totalAmount <= 0) {
    return NextResponse.json({ error: 'Invalid bill amount' }, { status: 400 });
  }

  // Check for existing non-rejected bill
  const billMonthDate = `${billMonth}-01`;
  const { data: existing } = await supabaseAdmin
    .from('electricity_bills')
    .select('id, status')
    .eq('property_id', propertyId)
    .eq('bill_month', billMonthDate)
    .not('status', 'eq', 'rejected')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Bill already uploaded for this month', existing }, { status: 409 });
  }

  // Upload image to Supabase Storage if provided
  let billImageUrl: string | null = null;
  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split('.').pop() || 'jpg';
    const path = `electricity-bills/${propertyId}/${billMonth}.${ext}`;
    const { data: storageData, error: storageErr } = await supabaseAdmin.storage
      .from('bills')
      .upload(path, imageFile, { upsert: true, contentType: imageFile.type });
    if (!storageErr && storageData) {
      const { data: urlData } = supabaseAdmin.storage.from('bills').getPublicUrl(path);
      billImageUrl = urlData.publicUrl;
    }
  } else {
    // Allow plain URL string
    const imageUrl = formData.get('image_url') as string | null;
    if (imageUrl) billImageUrl = imageUrl;
  }

  const totalUnits = (presentReading && previousReading)
    ? presentReading - previousReading
    : Number(formData.get('total_units') || 0);

  const { data: bill, error } = await supabaseAdmin
    .from('electricity_bills')
    .insert({
      property_id:      propertyId,
      bill_month:       billMonthDate,
      usc_no:           uscNo,
      present_reading:  presentReading || null,
      previous_reading: previousReading || null,
      present_date:     presentDate || null,
      previous_date:    previousDate || null,
      total_units:      totalUnits,
      total_amount:     totalAmount,
      common_units:     0,   // recalculated during split; satisfy NOT NULL
      common_amount:    0,   // recalculated during split; satisfy NOT NULL
      bill_image_url:   billImageUrl,
      uploaded_by:      user.id,
      uploaded_by_name: user.user_metadata?.full_name || user.email,
      upload_source:    uploadSource,
      status:           'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(bill, { status: 201 });
}
