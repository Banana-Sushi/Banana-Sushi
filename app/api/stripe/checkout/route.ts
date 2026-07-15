import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateOrderNumber } from '@/lib/order-number';
import { haversineKm, geocodeAddress, RESTAURANT_LAT, RESTAURANT_LNG } from '@/lib/distance';
import { getDeliveryZoneForDistance } from '@/lib/delivery-zones';
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

  return { valid: true, couponId: coupon.id as string, discountAmount };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;

  const supabase = createServerSupabaseClient();

  const isPickup = body.paymentMethod === 'pickup_online';
  let deliveryFee = Number(body.deliveryFee ?? 0);

  if (!isPickup && body.address && body.zipCode && body.city) {
    try {
      const coords = await geocodeAddress(body.address, body.zipCode, body.city);
      if (!coords) return NextResponse.json({ error: 'Out of range' }, { status: 400 });
      const dist = haversineKm(RESTAURANT_LAT, RESTAURANT_LNG, coords.lat, coords.lng);
      const { data: zones } = await supabase.from('delivery_zones').select('*').eq('is_active', true).order('sort_order', { ascending: true }).order('created_at', { ascending: true });
      const evaluation = getDeliveryZoneForDistance(dist, (zones ?? []).map((zone: any) => ({
        id: zone.id,
        maxDistanceKm: Number(zone.max_distance_km),
        fee: Number(zone.fee),
        isActive: zone.is_active ?? true,
        sortOrder: Number(zone.sort_order ?? 0),
        createdAt: zone.created_at,
      })));
      if (evaluation.isOutOfRange || evaluation.fee === null) return NextResponse.json({ error: 'Out of range' }, { status: 400 });
      deliveryFee = evaluation.fee;
    } catch {
      return NextResponse.json({ error: 'Out of range' }, { status: 400 });
    }
  }

  // Validate coupon if provided
  let couponId: string | null = null;
  let couponDiscount = 0;

  if (body.couponCode && body.email) {
    const couponRes = await validateCoupon(supabase, body.couponCode, body.email, body.subtotal);
    if (!couponRes.valid) {
      return NextResponse.json({ error: couponRes.reason ?? 'Invalid coupon' }, { status: 400 });
    }
    couponId = couponRes.couponId!;
    couponDiscount = couponRes.discountAmount!;
  }

  const orderNumber = await generateOrderNumber(supabase);
  const finalTotal = Math.max(0, (body.subtotal + deliveryFee) - couponDiscount);

  // Build Stripe line items
  const lineItems = body.items.map((item: any) => ({
    price_data: {
      currency: 'eur',
      product_data: { name: item.name },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }));

  // Add delivery fee only for non-pickup orders
  if (!isPickup && deliveryFee > 0) {
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: { name: 'Delivery Fee' },
        unit_amount: Math.round(deliveryFee * 100),
      },
      quantity: 1,
    });
  }

  // Create DB order and Stripe coupon in parallel to reduce latency
  // NOTE: coupon_uses is recorded in the webhook AFTER payment confirmation,
  // not here — so abandoned checkouts don't consume the coupon.
  const stripeCouponPromise: Promise<string | null> = couponDiscount > 0
    ? stripe.coupons.create({
        amount_off: Math.round(couponDiscount * 100),
        currency: 'eur',
        duration: 'once',
        name: body.couponCode ?? 'Discount',
      }).then(c => c.id).catch((err: any) => {
        console.error('Failed to create Stripe coupon:', err.message);
        return null;
      })
    : Promise.resolve(null);

  const [{ data: order, error: orderError }, stripeCouponId] = await Promise.all([
    supabase
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
        payment_method: isPickup ? 'pickup_online' : 'online',
        status: 'pending',
        items: body.items,
        subtotal: body.subtotal,
        delivery_fee: deliveryFee,
        total: finalTotal,
        coupon_id: couponId,
        coupon_discount: couponDiscount,
        customer_id: body.customerId ?? null,
      })
      .select()
      .single(),
    stripeCouponPromise,
  ]);

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

  const stripeDiscounts: Array<{ coupon: string }> | undefined =
    stripeCouponId ? [{ coupon: stripeCouponId }] : undefined;

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'paypal'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${baseUrl}/order/success`,
      cancel_url: `${baseUrl}/order/cancel`,
      discounts: stripeDiscounts,
      metadata: {
        orderId: order.id,
        orderNumber,
        customerEmail: body.email ?? '',
      },
      customer_email: body.email || undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Stripe error' }, { status: 500 });
  }

  // Save session ID to order
  await supabase
    .from('orders')
    .update({ stripe_session_id: session.id })
    .eq('id', order.id);

  return NextResponse.json({ url: session.url });
}
