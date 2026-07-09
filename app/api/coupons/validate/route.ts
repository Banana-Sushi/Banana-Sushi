import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, email, subtotal } = body;

  if (!code || !email || subtotal === undefined) {
    return NextResponse.json({ valid: false, reason: 'Missing fields' });
  }

  const supabase = createServerSupabaseClient();
  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .single();

  if (error || !coupon) {
    return NextResponse.json({ valid: false, reason: 'Invalid coupon code' });
  }
  if (!coupon.is_active) {
    return NextResponse.json({ valid: false, reason: 'Coupon is inactive' });
  }

  const now = new Date();
  if (coupon.start_date && new Date(coupon.start_date) > now) {
    return NextResponse.json({ valid: false, reason: 'Coupon is not yet valid' });
  }
  if (coupon.end_date && new Date(coupon.end_date) < now) {
    return NextResponse.json({ valid: false, reason: 'Coupon has expired' });
  }
  if (coupon.uses_count >= coupon.uses_limit) {
    return NextResponse.json({ valid: false, reason: 'Coupon usage limit reached' });
  }
  if (coupon.min_order_total && Number(subtotal) < Number(coupon.min_order_total)) {
    return NextResponse.json({
      valid: false,
      reason: `Minimum order of ${Number(coupon.min_order_total).toFixed(2)}€ required`,
    });
  }

  // Check if this email already used the coupon
  const { data: existingUse } = await supabase
    .from('coupon_uses')
    .select('id')
    .eq('coupon_id', coupon.id)
    .eq('customer_identifier', email.toLowerCase().trim())
    .maybeSingle();

  if (existingUse) {
    return NextResponse.json({ valid: false, reason: 'You have already used this coupon' });
  }

  // Calculate discount amount
  let discountAmount: number;
  if (coupon.discount_type === 'percentage') {
    discountAmount = Math.round(Number(subtotal) * Number(coupon.discount_value) / 100 * 100) / 100;
  } else {
    discountAmount = Math.min(Number(subtotal), Number(coupon.discount_value));
  }

  return NextResponse.json({
    valid: true,
    couponId: coupon.id,
    discountType: coupon.discount_type,
    discountValue: Number(coupon.discount_value),
    discountAmount,
  });
}
