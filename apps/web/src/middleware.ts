import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Defense-in-depth only. This app's supabase-js sessions live in
// localStorage, not cookies, so middleware cannot verify a real session —
// only a same-site hint cookie set by AuthContext on sign-in/sign-out. The
// actual security boundary is server-side: Spring ROLE_ADMIN-gated APIs and
// Postgres RLS policies (auth_is_admin()). This middleware exists only to
// bounce obviously-signed-out visitors before the client bundle loads and
// makes its own (also server-verified) /api/admin/status check.
export function middleware(request: NextRequest) {
  const hasAuthHint = request.cookies.has('aaram-auth');
  if (!hasAuthHint) {
    return NextResponse.redirect(new URL('/adminLogin', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
