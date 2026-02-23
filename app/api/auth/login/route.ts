import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
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

console.log('[login] normalized email:', normalizedEmail);
console.log('[login] raw data:', data);
console.log('[login] raw error:', error);

const user = data?.[0] ?? null;

  console.log('[login] email:', email.toLowerCase().trim());
  console.log('[login] supabase error:', error?.message ?? null);
  console.log('[login] user found:', !!user);

  if (error || !user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  console.log('[login] password valid:', valid);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await signToken({ id: user.id, email: user.email, role: user.role });

  const response = NextResponse.json({ ok: true, role: user.role });
  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  });

  return response;
}
