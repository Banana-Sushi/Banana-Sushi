import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';
import { isValidGermanPostalCode } from '@/lib/delivery-zones';
import type { DeliveryPostalCode } from '@/types';

function mapPostalCode(row: any): DeliveryPostalCode {
  return {
    id: row.id,
    postalCode: row.postal_code,
    fee: Number(row.fee),
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
  };
}

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('delivery_postal_codes')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(mapPostalCode));
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  if (!isValidGermanPostalCode(String(body.postalCode ?? ''))) {
    return NextResponse.json({ error: 'Postal code must be exactly 5 digits' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('delivery_postal_codes')
    .insert({
      postal_code: String(body.postalCode).trim(),
      fee: Number(body.fee),
      is_active: body.isActive ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(mapPostalCode(data), { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('delivery_postal_codes').delete().eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
