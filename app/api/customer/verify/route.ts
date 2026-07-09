import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('email_verification_token', token)
    .maybeSingle();

  if (!customer) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
  }

  await supabase
    .from('customers')
    .update({ email_verified: true, email_verification_token: null })
    .eq('id', customer.id);

  return NextResponse.json({ ok: true });
}
