import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const ADMIN_ONLY = ['/dashboard/stats', '/dashboard/menu'];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Allow login page
  if (pathname === '/dashboard/login') return NextResponse.next();

  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    return NextResponse.redirect(new URL('/dashboard/login', req.url));
  }

  // Staff cannot access admin-only sections
  if (user.role !== 'admin' && ADMIN_ONLY.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/dashboard/orders', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
