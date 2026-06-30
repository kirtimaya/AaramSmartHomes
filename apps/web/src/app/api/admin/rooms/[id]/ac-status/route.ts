import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin } from '@/lib/supabaseAdmin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { has_ac } = await request.json();

  if (typeof has_ac !== 'boolean') {
    return NextResponse.json({ error: 'has_ac must be boolean' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('rooms')
    .update({ has_ac })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
