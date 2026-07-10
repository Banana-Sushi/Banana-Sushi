import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { signCustomerToken } from '@/lib/customer-auth';
import {
  checkIp, checkEmail,
  recordIpFailure, recordEmailFailure,
  resetOnSuccess, getIp,
} from '@/lib/rate-limiter';

function blocked(retryAfterSecs: number) {
  const mins = Math.ceil(retryAfterSecs / 60);
  return NextResponse.json(
    { error: `Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`, retryAfter: retryAfterSecs },
    { status: 429, headers: { 'Retry-After': String(retryAfterSecs) } },
  );
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const normalizedEmail = (email as string).toLowerCase().trim();

  // ── Rate limit checks ────────────────────────────────────────────────────
  const ipLimit = checkIp(ip);
  if (ipLimit.blocked) return blocked(ipLimit.retryAfterSecs);

  const emailLimit = checkEmail(normalizedEmail);
  if (emailLimit.blocked) return blocked(emailLimit.retryAfterSecs);
  // ────────────────────────────────────────────────────────────────────────

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error || !data) {
    recordIpFailure(ip);
    recordEmailFailure(normalizedEmail);
    const remaining = Math.min(checkIp(ip).remaining, checkEmail(normalizedEmail).remaining);
    return NextResponse.json(
      { error: 'Invalid credentials', remaining },
      { status: 401 },
    );
  }

  if (!data.email_verified) {
    // Don't count unverified-email errors as brute-force attempts
    return NextResponse.json({ error: 'Please verify your email address first' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, data.password_hash);
  if (!valid) {
    recordIpFailure(ip);
    recordEmailFailure(normalizedEmail);
    const remaining = Math.min(checkIp(ip).remaining, checkEmail(normalizedEmail).remaining);
    return NextResponse.json(
      { error: 'Invalid credentials', remaining },
      { status: 401 },
    );
  }

  // ── Success: clear rate limits ───────────────────────────────────────────
  resetOnSuccess(ip, normalizedEmail);

  const token = await signCustomerToken({ customerId: data.id, email: data.email });
  const { password_hash, email_verification_token, ...profile } = data;

  const response = NextResponse.json({ ok: true, customer: profile });
  response.cookies.set('customer_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  return response;
}
