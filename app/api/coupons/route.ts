import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';
import { generateUniqueCodes } from '@/lib/coupon-code';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { quantity, discountType, discountValue, minOrderTotal, startDate, endDate, usesLimit } = body;

  if (!quantity || quantity < 1 || quantity > 500) {
    return NextResponse.json({ error: 'Quantity must be between 1 and 500' }, { status: 400 });
  }
  if (!discountType || !['percentage', 'fixed'].includes(discountType)) {
    return NextResponse.json({ error: 'Invalid discount type' }, { status: 400 });
  }
  if (!discountValue || discountValue <= 0) {
    return NextResponse.json({ error: 'Discount value must be positive' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  // Get existing codes to avoid collisions
  const { data: existing } = await supabase.from('coupons').select('code');
  const existingSet = new Set((existing ?? []).map((r: any) => r.code));

  const codes = generateUniqueCodes(quantity, existingSet);
  if (codes.length < quantity) {
    return NextResponse.json({ error: 'Could not generate enough unique codes' }, { status: 500 });
  }

  const rows = codes.map(code => ({
    code,
    discount_type: discountType,
    discount_value: discountValue,
    min_order_total: minOrderTotal ?? null,
    start_date: startDate ?? null,
    end_date: endDate ?? null,
    is_active: true,
    uses_limit: usesLimit ?? 1,
    uses_count: 0,
  }));

  const { data, error } = await supabase.from('coupons').insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
