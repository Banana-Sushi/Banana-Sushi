import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateOrderNumber } from '@/lib/order-number';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;

  const supabase = createServerSupabaseClient();
  const orderNumber = await generateOrderNumber(supabase);

  // Create order in DB with pending status first
  const { data: order, error: orderError } = await supabase 
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_name: body.customerName,
      phone: body.phone,
      address: body.address,
      zip_code: body.zipCode,
      city: body.city,
      delivery_note: body.deliveryNote ?? null,
      payment_method: 'online',
      status: 'pending',
      items: body.items,
      subtotal: body.subtotal,
      delivery_fee: body.deliveryFee,
      total: body.total,
    })
    .select()
    .single();

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

  // Build Stripe line items
  const lineItems = body.items.map((item: any) => ({
    price_data: {
      currency: 'eur',
      product_data: { name: item.name },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }));

  // Add delivery fee
  lineItems.push({
    price_data: {
      currency: 'eur',
      product_data: { name: 'Delivery Fee' },
      unit_amount: Math.round(body.deliveryFee * 100),
    },
    quantity: 1,
  });

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'paypal', 'sepa_debit'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${baseUrl}/order/success`,
      cancel_url: `${baseUrl}/order/cancel`,
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
