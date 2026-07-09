import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const update: Record<string, unknown> = {};
  if (body.isActive !== undefined) update.is_active = body.isActive;
  if (body.discountValue !== undefined) update.discount_value = body.discountValue;
  if (body.discountType !== undefined) update.discount_type = body.discountType;
  if (body.startDate !== undefined) update.start_date = body.startDate;
  if (body.endDate !== undefined) update.end_date = body.endDate;

  const { data, error } = await supabase
    .from('discounts')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    id: data.id,
    section: data.section,
    menuItemId: data.menu_item_id ?? null,
    categoryName: data.category_name ?? null,
    discountType: data.discount_type,
    discountValue: data.discount_value !== null ? Number(data.discount_value) : null,
    minOrderTotal: data.min_order_total !== null ? Number(data.min_order_total) : null,
    startDate: data.start_date ?? null,
    endDate: data.end_date ?? null,
    isActive: data.is_active,
  });
}
