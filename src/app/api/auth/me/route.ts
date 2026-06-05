import { NextRequest, NextResponse } from 'next/server';
import { getUserRole } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ role: null, profile: null });

  const { role, userId, email } = await getUserRole(token);
  return NextResponse.json({ role, userId, email });
}
