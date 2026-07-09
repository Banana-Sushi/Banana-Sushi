import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyCustomerToken } from '@/lib/customer-auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('customer_token')?.value;
  const session = token ? await verifyCustomerToken(token) : null;

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  const { data: customer, error } = await supabase
    .from('customers')
    .select('id, first_name, last_name, email, email_verified, gender, birthdate, phone, marketing_consent, discount_emails_consent, created_at')
    .eq('id', session.customerId)
    .single();

  if (error || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const { data: addresses } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', session.customerId)
    .order('is_main', { ascending: false });

  return NextResponse.json({ customer, addresses: addresses ?? [] });
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('customer_token')?.value;
  const session = token ? await verifyCustomerToken(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabaseClient();

  // Unlink orders (keep them, just remove the customer link)
  await supabase
    .from('orders')
    .update({ customer_id: null })
    .eq('customer_id', session.customerId);

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', session.customerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set('customer_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
