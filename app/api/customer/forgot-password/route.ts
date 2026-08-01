import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const normalizedEmail = (email as string).toLowerCase().trim();
  const supabase = createServerSupabaseClient();

  const { data: customer } = await supabase
    .from('customers')
    .select('id, first_name, email')
    .eq('email', normalizedEmail)
    .maybeSingle();

  // Always respond ok — don't reveal whether an account exists.
  if (customer) {
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await supabase
      .from('customers')
      .update({ password_reset_token: token, password_reset_expires: expires })
      .eq('id', customer.id);

    try {
      await sendPasswordResetEmail(customer.email, customer.first_name, token);
    } catch (emailErr) {
      console.error('Password reset email failed:', emailErr);
    }
  }

  return NextResponse.json({ ok: true });
}
