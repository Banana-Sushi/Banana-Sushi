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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  if (body.postalCode !== undefined && !isValidGermanPostalCode(String(body.postalCode))) {
    return NextResponse.json({ error: 'Postal code must be exactly 5 digits' }, { status: 400 });
  }

  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const update: Record<string, unknown> = {};
  if (body.postalCode !== undefined) update.postal_code = String(body.postalCode).trim();
  if (body.fee !== undefined) update.fee = Number(body.fee);
  if (body.isActive !== undefined) update.is_active = body.isActive;

  const { data, error } = await supabase.from('delivery_postal_codes').update(update).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(mapPostalCode(data));
}
