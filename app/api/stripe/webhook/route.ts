import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Force Node.js runtime — stripe.webhooks.constructEvent requires raw body
// which is not guaranteed on Edge runtime
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: string;
  try {
    body = await req.text();
  } catch (err: any) {
    console.error('[webhook] Failed to read body:', err.message);
    return NextResponse.json({ error: 'Could not read body' }, { status: 400 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    console.error('[webhook] Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET env var not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('[webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  try {
    const isCompleted = event.type === 'checkout.session.completed';
    const isAsyncPaid = event.type === 'checkout.session.async_payment_succeeded';

    if (isCompleted || isAsyncPaid) {
      const session = event.data.object as any;

      if (isCompleted && session.payment_status !== 'paid') {
        return NextResponse.json({ received: true });
      }

      const orderId = session.metadata?.orderId;
      const customerEmail = session.metadata?.customerEmail || session.customer_details?.email;

      console.log(`[webhook] Processing order ${orderId}, email: ${customerEmail}`);

      if (orderId) {
        const supabase = createServerSupabaseClient();

        const { data: order, error: updateError } = await supabase
          .from('orders')
          .update({ status: 'processing' })
          .eq('id', orderId)
          .select()
          .single();

        if (updateError) {
          console.error('[webhook] Supabase update failed:', updateError.message);
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
        }

        console.log(`[webhook] Order ${orderId} updated to processing`);

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
            console.log(`[webhook] Confirmation email sent to ${customerEmail}`);
          } catch (emailErr) {
            console.error('[webhook] Email failed:', emailErr);
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[webhook] Unhandled error:', err.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
