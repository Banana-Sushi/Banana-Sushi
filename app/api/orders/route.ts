import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';
import { generateOrderNumber } from '@/lib/order-number';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .neq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = createServerSupabaseClient();

  const orderNumber = await generateOrderNumber(supabase);

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
      payment_method: body.paymentMethod,
      status: 'processing',
      items: body.items,
      subtotal: body.subtotal,
      delivery_fee: body.deliveryFee ?? 0,
      total: body.total,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send confirmation email if customer email is provided
  if (body.email) {
    try {
      const { sendOrderConfirmationEmail } = await import('@/lib/email');
      const order = {
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
      };
      await sendOrderConfirmationEmail(order as any, body.email);
    } catch (emailErr) {
      console.error('Email send failed:', emailErr);
    }
  }

  return NextResponse.json({ ok: true, orderId: data.id, orderNumber }, { status: 201 });
}
