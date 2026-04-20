import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';
import { buildReceipt, receiptToBase64, type ReceiptData } from '@/lib/escpos-receipt';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = req.cookies.get('auth_token')?.value;
  const user  = token ? await verifyToken(token) : null;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabaseClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const items = (order.items as Array<{ name: string; quantity: number; price: number }>).map(i => ({
    name:      i.name,
    quantity:  i.quantity,
    unitPrice: i.price,
  }));

  const receiptData: ReceiptData = {
    restaurantName: 'BANANA SUSHI',
    addressLine1:   '123 Rue de la République',
    addressLine2:   'Tunis, 1000',
    phone:          '+216 XX XXX XXX',
    orderNumber:    order.order_number,
    date:           new Date(order.created_at),
    items,
    subtotal:       Number(order.subtotal),
    deliveryFee:    Number(order.delivery_fee),
    total:          Number(order.total),
    paymentMethod:  order.payment_method === 'cash' ? 'Cash on Delivery' : 'Online Payment',
    footerMessage:  'Merci pour votre commande! Thank you!',
  };

  const receipt = buildReceipt(receiptData);
  const format  = req.nextUrl.searchParams.get('format') ?? 'base64';

  if (format === 'raw') {
    return new NextResponse(receipt, {
      headers: {
        'Content-Type':        'application/octet-stream',
        'Content-Disposition': `attachment; filename="receipt-${order.order_number}.bin"`,
        'Content-Length':      String(receipt.length),
      },
    });
  }

  return NextResponse.json({
    orderNumber: order.order_number,
    bytes:       receipt.length,
    base64:      receiptToBase64(receipt),
  });
}
