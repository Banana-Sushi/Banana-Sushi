import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';
import type { DeliveryZone } from '@/types';

function mapZone(row: any): DeliveryZone {
  return {
    id: row.id,
    maxDistanceKm: Number(row.max_distance_km),
    fee: Number(row.fee),
    isActive: row.is_active ?? true,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at,
  };
}

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('delivery_zones')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(mapZone));
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('delivery_zones')
    .insert({
      max_distance_km: Number(body.maxDistanceKm),
      fee: Number(body.fee),
      is_active: body.isActive ?? true,
      sort_order: Number(body.sortOrder ?? 0),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(mapZone(data), { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('delivery_zones').delete().eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
