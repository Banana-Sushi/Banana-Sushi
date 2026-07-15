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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const update: Record<string, unknown> = {};
  if (body.maxDistanceKm !== undefined) update.max_distance_km = Number(body.maxDistanceKm);
  if (body.fee !== undefined) update.fee = Number(body.fee);
  if (body.isActive !== undefined) update.is_active = body.isActive;
  if (body.sortOrder !== undefined) update.sort_order = Number(body.sortOrder);

  const { data, error } = await supabase.from('delivery_zones').update(update).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(mapZone(data));
}
