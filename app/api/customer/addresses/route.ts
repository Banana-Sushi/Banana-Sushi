import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyCustomerToken } from '@/lib/customer-auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('customer_token')?.value;
  const session = token ? await verifyCustomerToken(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', session.customerId)
    .order('is_main', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('customer_token')?.value;
  const session = token ? await verifyCustomerToken(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { label, street, zip, city, isMain } = body;

  if (!street || !zip || !city) {
    return NextResponse.json({ error: 'Street, zip, and city are required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  if (isMain) {
    await supabase
      .from('customer_addresses')
      .update({ is_main: false })
      .eq('customer_id', session.customerId);
  }

  const { data, error } = await supabase
    .from('customer_addresses')
    .insert({
      customer_id: session.customerId,
      label: label || null,
      street,
      zip_code: zip,
      city,
      is_main: isMain ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
