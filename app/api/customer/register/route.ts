import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { firstName, lastName, email, password, gender, birthdate, phone, street, zip, city, marketingConsent, discountEmailsConsent } = body;

  if (!firstName || !lastName || !email || !password || !street || !zip || !city) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const normalizedEmail = email.toLowerCase().trim();

  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const verificationToken = crypto.randomUUID();

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      first_name: firstName,
      last_name: lastName,
      email: normalizedEmail,
      password_hash: passwordHash,
      gender: gender || null,
      birthdate: birthdate || null,
      phone: phone || null,
      marketing_consent: marketingConsent ?? false,
      discount_emails_consent: discountEmailsConsent ?? false,
      email_verification_token: verificationToken,
    })
    .select('id')
    .single();

  if (error || !customer) {
    return NextResponse.json({ error: error?.message ?? 'Registration failed' }, { status: 500 });
  }

  await supabase.from('customer_addresses').insert({
    customer_id: customer.id,
    street,
    zip_code: zip,
    city,
    is_main: true,
  });

  try {
    await sendVerificationEmail(normalizedEmail, firstName, verificationToken);
  } catch (emailErr) {
    console.error('Verification email failed:', emailErr);
  }

  return NextResponse.json({ ok: true });
}
