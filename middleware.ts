import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Allow login page
  if (pathname === '/dashboard/login') return NextResponse.next();

  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    return NextResponse.redirect(new URL('/dashboard/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
