import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';
import { generateOrderNumber } from '@/lib/order-number';
import { haversineKm, geocodeAddress, RESTAURANT_LAT, RESTAURANT_LNG, MAX_DELIVERY_KM } from '@/lib/distance';
import type { SupabaseClient } from '@supabase/supabase-js';

async function validateCoupon(supabase: SupabaseClient, code: string, email: string, subtotal: number) {
  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .single();

  if (error || !coupon) return { valid: false, reason: 'Invalid coupon code' };
  if (!coupon.is_active) return { valid: false, reason: 'Coupon is inactive' };

  const now = new Date();
  if (coupon.start_date && new Date(coupon.start_date) > now) return { valid: false, reason: 'Coupon is not yet valid' };
  if (coupon.end_date && new Date(coupon.end_date) < now) return { valid: false, reason: 'Coupon has expired' };
  if (coupon.uses_count >= coupon.uses_limit) return { valid: false, reason: 'Coupon usage limit reached' };
  if (coupon.min_order_total && subtotal < Number(coupon.min_order_total)) {
    return { valid: false, reason: `Minimum order of ${Number(coupon.min_order_total).toFixed(2)}€ required` };
  }

  const { data: existingUse } = await supabase
    .from('coupon_uses')
    .select('id')
    .eq('coupon_id', coupon.id)
    .eq('customer_identifier', email.toLowerCase().trim())
    .maybeSingle();

  if (existingUse) return { valid: false, reason: 'You have already used this coupon' };

  let discountAmount: number;
  if (coupon.discount_type === 'percentage') {
    discountAmount = Math.round(subtotal * Number(coupon.discount_value) / 100 * 100) / 100;
  } else {
    discountAmount = Math.min(subtotal, Number(coupon.discount_value));
  }

  return { valid: true, couponId: coupon.id as string, discountAmount, usesCount: coupon.uses_count as number, usesLimit: coupon.uses_limit as number };
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, coupon:coupons(code)')
    .neq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const isDelivery = body.paymentMethod === 'cash' || body.paymentMethod === 'online';
  if (isDelivery && body.address && body.zipCode && body.city) {
    try {
      const coords = await geocodeAddress(body.address, body.zipCode, body.city);
      if (!coords) return NextResponse.json({ error: 'Delivery address out of range' }, { status: 400 });
      const dist = haversineKm(RESTAURANT_LAT, RESTAURANT_LNG, coords.lat, coords.lng);
      if (dist > MAX_DELIVERY_KM) return NextResponse.json({ error: 'Delivery address out of range' }, { status: 400 });
    } catch {
      return NextResponse.json({ error: 'Delivery address out of range' }, { status: 400 });
    }
  }

  const supabase = createServerSupabaseClient();

  // Validate and apply coupon if provided
  let couponId: string | null = null;
  let couponDiscount = 0;
  let couponUsesCount = 0;
  let couponUsesLimit = 0;

  if (body.couponCode) {
    const couponRes = await validateCoupon(supabase, body.couponCode, body.email, body.subtotal);
    if (!couponRes.valid) {
      return NextResponse.json({ error: couponRes.reason ?? 'Invalid coupon' }, { status: 400 });
    }
    couponId = couponRes.couponId!;
    couponDiscount = couponRes.discountAmount!;
    couponUsesCount = couponRes.usesCount!;
    couponUsesLimit = couponRes.usesLimit!;
  }

  const orderNumber = await generateOrderNumber(supabase);
  const finalTotal = Math.max(0, (body.subtotal + (body.deliveryFee ?? 0)) - couponDiscount);

  const { data, error } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_name: body.customerName,
      phone: body.phone,
      address: body.address ?? null,
      zip_code: body.zipCode ?? null,
      city: body.city ?? null,
      delivery_note: body.deliveryNote ?? null,
      scheduled_time: body.scheduledTime || null,
      payment_method: body.paymentMethod,
      status: 'processing',
      items: body.items,
      subtotal: body.subtotal,
      delivery_fee: body.deliveryFee ?? 0,
      total: finalTotal,
      coupon_id: couponId,
      coupon_discount: couponDiscount,
      customer_id: body.customerId ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Record coupon use and increment counter (cash orders are immediately confirmed)
  if (couponId && body.email) {
    const { error: useErr } = await supabase.from('coupon_uses').insert({
      coupon_id: couponId,
      order_id: data.id,
      customer_identifier: body.email.toLowerCase().trim(),
    });
    if (!useErr) {
      await supabase.rpc('increment_coupon_uses', { coupon_id_param: couponId });
      if (couponUsesCount + 1 >= couponUsesLimit) {
        await supabase.from('coupons').update({ is_active: false }).eq('id', couponId);
      }
    } else {
      console.error('Failed to record coupon use:', useErr.message);
    }
  }

  // Send confirmation email — fire and forget so it doesn't delay the response
  if (body.email) {
    const emailOrder = {
      id: data.id,
      orderNumber: data.order_number,
      customerName: data.customer_name,
      phone: data.phone,
      address: data.address,
      zipCode: data.zip_code,
      city: data.city,
      paymentMethod: data.payment_method,
      status: data.status,
      items: data.items,
      subtotal: Number(data.subtotal),
      deliveryFee: Number(data.delivery_fee),
      total: Number(data.total),
      createdAt: data.created_at,
      couponCode: couponId ? body.couponCode : null,
      couponDiscount: couponDiscount,
    };
    import('@/lib/email').then(({ sendOrderConfirmationEmail }) =>
      sendOrderConfirmationEmail(emailOrder as any, body.email).catch(
        (err: any) => console.error('Email send failed:', err)
      )
    ).catch((err: any) => console.error('Email import failed:', err));
  }

  return NextResponse.json({ ok: true, orderId: data.id, orderNumber }, { status: 201 });
}
