import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { verifyCustomerToken } from '@/lib/customer-auth';

const ADMIN_ONLY = [
  '/dashboard/stats',
  '/dashboard/menu',
  '/dashboard/content',
  '/dashboard/staff',
  '/dashboard/discounts',
  '/dashboard/gutschein',
  '/dashboard/qrcode',
];

const ACCOUNT_PUBLIC = ['/account/login', '/account/register', '/account/verify', '/account/forgot-password', '/account/reset-password'];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Staff dashboard protection
  if (pathname.startsWith('/dashboard')) {
    if (pathname === '/dashboard/login') return NextResponse.next();

    const token = req.cookies.get('auth_token')?.value;
    const user = token ? await verifyToken(token) : null;

    if (!user) {
      return NextResponse.redirect(new URL('/dashboard/login', req.url));
    }

    if (user.role !== 'admin' && ADMIN_ONLY.some(p => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL('/dashboard/orders', req.url));
    }

    return NextResponse.next();
  }

  // Customer account protection
  if (pathname.startsWith('/account')) {
    if (ACCOUNT_PUBLIC.some(p => pathname === p)) return NextResponse.next();

    const token = req.cookies.get('customer_token')?.value;
    const customer = token ? await verifyCustomerToken(token) : null;

    if (!customer) {
      const url = new URL('/account/login', req.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/account/:path*'],
};
