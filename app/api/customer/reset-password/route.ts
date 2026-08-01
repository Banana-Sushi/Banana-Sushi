import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) {
    return NextResponse.json({ error: 'Token and password required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data: customer } = await supabase
    .from('customers')
    .select('id, password_reset_expires')
    .eq('password_reset_token', token)
    .maybeSingle();

  if (!customer || !customer.password_reset_expires || new Date(customer.password_reset_expires) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await supabase
    .from('customers')
    .update({
      password_hash: passwordHash,
      password_reset_token: null,
      password_reset_expires: null,
    })
    .eq('id', customer.id);

  return NextResponse.json({ ok: true });
}
