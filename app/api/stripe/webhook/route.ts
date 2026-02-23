import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const orderId = session.metadata?.orderId;
    const customerEmail = session.metadata?.customerEmail || session.customer_details?.email;

    if (orderId) {
      const supabase = createServerSupabaseClient();

      // Update order status
      const { data: order } = await supabase
        .from('orders')
        .update({ status: 'processing' })
        .eq('id', orderId)
        .select()
        .single();

      // Send confirmation email
      if (order && customerEmail) {
        try {
          const { sendOrderConfirmationEmail } = await import('@/lib/email');
          const mappedOrder = {
            id: order.id,
            orderNumber: order.order_number,
            customerName: order.customer_name,
            phone: order.phone,
            address: order.address,
            zipCode: order.zip_code,
            city: order.city,
            paymentMethod: order.payment_method,
            status: order.status,
            items: order.items,
            subtotal: Number(order.subtotal),
            deliveryFee: Number(order.delivery_fee),
            total: Number(order.total),
            createdAt: order.created_at,
          };
          await sendOrderConfirmationEmail(mappedOrder as any, customerEmail);
        } catch (emailErr) {
          console.error('Email failed:', emailErr);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
