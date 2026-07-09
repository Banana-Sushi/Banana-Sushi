import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyCustomerToken } from '@/lib/customer-auth';

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get('customer_token')?.value;
  const session = token ? await verifyCustomerToken(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { firstName, lastName, phone, gender, birthdate, discountEmailsConsent } = body;

  if (firstName !== undefined && (!firstName || !lastName)) {
    return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const updates: Record<string, unknown> = {};
  if (firstName !== undefined) updates.first_name = firstName;
  if (lastName !== undefined) updates.last_name = lastName;
  if (phone !== undefined) updates.phone = phone || null;
  if (gender !== undefined) updates.gender = gender || null;
  if (birthdate !== undefined) updates.birthdate = birthdate || null;
  if (discountEmailsConsent !== undefined) updates.discount_emails_consent = discountEmailsConsent;

  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', session.customerId)
    .select('id, first_name, last_name, email, phone, gender, birthdate, discount_emails_consent')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
