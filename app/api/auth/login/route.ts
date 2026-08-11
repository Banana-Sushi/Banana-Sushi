import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { signToken } from '@/lib/auth';
import { checkIp, recordIpFailure, resetOnSuccess, getIp } from '@/lib/rate-limiter';

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  // ── Rate limit check ─────────────────────────────────────────────────────
  const ipLimit = checkIp(ip);
  if (ipLimit.blocked) {
    const mins = Math.ceil(ipLimit.retryAfterSecs / 60);
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.` },
      { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSecs) } },
    );
  }
  // ────────────────────────────────────────────────────────────────────────

  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const normalizedEmail = email.toLowerCase().trim();

  const { data, error } = await supabase
    .from('staff_users')
    .select('*')
    .eq('email', normalizedEmail);

  const user = data?.[0] ?? null;

  if (error || !user) {
    recordIpFailure(ip);
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    recordIpFailure(ip);
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  resetOnSuccess(ip, normalizedEmail);

  const token = await signToken({ id: user.id, email: user.email, role: user.role });

  const response = NextResponse.json({ ok: true, role: user.role });
  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 16,
    path: '/',
  });

  return response;
}
