import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  const { pathname } = request.nextUrl;

  // Allow auth-related routes and public pages
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/stripe/webhook') ||
    pathname === '/login'
  ) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/predictions/:path*',
    '/value-bets/:path*',
    '/acca-builder/:path*',
    '/pipeline/:path*',
    '/reports/:path*',
    '/today/:path*',
    '/admin/:path*',
  ],
};
