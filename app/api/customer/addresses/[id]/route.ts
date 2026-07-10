import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyCustomerToken } from '@/lib/customer-auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get('customer_token')?.value;
  const session = token ? await verifyCustomerToken(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const supabase = createServerSupabaseClient();

  const { data: addr } = await supabase
    .from('customer_addresses')
    .select('customer_id')
    .eq('id', id)
    .single();

  if (!addr || addr.customer_id !== session.customerId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (body.isMain) {
    await supabase
      .from('customer_addresses')
      .update({ is_main: false })
      .eq('customer_id', session.customerId);
  }

  const updates: Record<string, unknown> = {};
  if (body.label !== undefined) updates.label = body.label;
  if (body.street !== undefined) updates.street = body.street;
  if (body.zip !== undefined) updates.zip_code = body.zip;
  if (body.city !== undefined) updates.city = body.city;
  if (body.isMain !== undefined) updates.is_main = body.isMain;

  const { data, error } = await supabase
    .from('customer_addresses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get('customer_token')?.value;
  const session = token ? await verifyCustomerToken(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: addr } = await supabase
    .from('customer_addresses')
    .select('customer_id, is_main')
    .eq('id', id)
    .single();

  if (!addr || addr.customer_id !== session.customerId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (addr.is_main) {
    const { count } = await supabase
      .from('customer_addresses')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', session.customerId);

    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Cannot delete the only address' }, { status: 400 });
    }
  }

  const { error } = await supabase
    .from('customer_addresses')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
