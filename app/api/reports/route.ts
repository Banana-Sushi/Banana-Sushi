import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('financial_reports')
    .select('*')
    .order('generated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { startDate, endDate } = await req.json();
  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', `${startDate}T00:00:00.000Z`)
    .lte('created_at', `${endDate}T23:59:59.999Z`)
    .neq('status', 'pending');

  if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 500 });

  const totalOrders     = orders.length;
  const totalRevenue    = round2(orders.reduce((s, o) => s + Number(o.total), 0));
  const deliveryFees    = round2(orders.reduce((s, o) => s + Number(o.delivery_fee), 0));
  const couponDiscounts = round2(orders.reduce((s, o) => s + Number(o.coupon_discount || 0), 0));
  // Food revenue = actual total minus delivery — always satisfies: subtotalRevenue + deliveryFees = totalRevenue
  const subtotalRevenue = round2(totalRevenue - deliveryFees);

  const cashList    = orders.filter(o => o.payment_method === 'cash');
  const onlineList  = orders.filter(o => o.payment_method === 'online');
  const pickupList  = orders.filter(o => o.payment_method === 'pickup_online' || o.payment_method === 'pickup_cash');

  const vatRate = 0.19;
  // German prices are gross (VAT-inclusive): extract the VAT portion, not add 19% on top
  const netRevenue = round2(subtotalRevenue / (1 + vatRate));
  const vatAmount  = round2(subtotalRevenue - netRevenue);

  const report_data = {
    period: { start: startDate, end: endDate },
    totalOrders,
    totalRevenue,
    deliveryFees,
    couponDiscounts,
    subtotalRevenue,
    cashOrders:   { count: cashList.length,   total: round2(cashList.reduce((s, o)   => s + Number(o.total), 0)) },
    onlineOrders: { count: onlineList.length,  total: round2(onlineList.reduce((s, o) => s + Number(o.total), 0)) },
    pickupOrders: { count: pickupList.length,  total: round2(pickupList.reduce((s, o) => s + Number(o.total), 0)) },
    vatRate,
    vatAmount,
    netRevenue,
    orders: orders.map(o => ({
      orderNumber:   o.order_number,
      date:          o.created_at,
      total:         Number(o.total),
      paymentMethod: o.payment_method,
      customerName:  o.customer_name,
    })),
  };

  const { data: report, error: insertError } = await supabase
    .from('financial_reports')
    .insert({ start_date: startDate, end_date: endDate, generated_by: user.email, report_data })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json(report, { status: 201 });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
