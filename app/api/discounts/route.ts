import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';
import { Discount } from '@/types';
import { sendDiscountEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('discounts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let result = data.map((d: any) => ({
    id: d.id,
    section: d.section,
    menuItemId: d.menu_item_id ?? null,
    categoryName: d.category_name ?? null,
    discountType: d.discount_type,
    discountValue: d.discount_value !== null && d.discount_value !== undefined ? Number(d.discount_value) : null,
    minOrderTotal: d.min_order_total !== null && d.min_order_total !== undefined ? Number(d.min_order_total) : null,
    startDate: d.start_date ?? null,
    endDate: d.end_date ?? null,
    isActive: d.is_active,
  })) as Discount[];

  if (req.nextUrl.searchParams.get('active') === 'true') {
    const now = new Date();
    result = result.filter(d =>
      d.isActive &&
      (!d.startDate || new Date(d.startDate) <= now) &&
      (!d.endDate || new Date(d.endDate) >= now),
    );
  }

  return NextResponse.json(result);
}

function mapDiscount(d: any): Discount {
  return {
    id: d.id,
    section: d.section,
    menuItemId: d.menu_item_id ?? null,
    categoryName: d.category_name ?? null,
    discountType: d.discount_type,
    discountValue: d.discount_value !== null && d.discount_value !== undefined ? Number(d.discount_value) : null,
    minOrderTotal: d.min_order_total !== null && d.min_order_total !== undefined ? Number(d.min_order_total) : null,
    startDate: d.start_date ?? null,
    endDate: d.end_date ?? null,
    isActive: d.is_active,
  };
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();

  if (body.section === 'command' && body.discountType === 'two_for_one') {
    return NextResponse.json({ error: 'Command discounts cannot be two_for_one' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('discounts')
    .insert({
      section: body.section,
      menu_item_id: body.menuItemId ?? null,
      category_name: body.categoryName ?? null,
      discount_type: body.discountType,
      discount_value: body.discountValue ?? null,
      min_order_total: body.minOrderTotal ?? null,
      start_date: body.startDate ?? null,
      end_date: body.endDate ?? null,
      is_active: body.isActive ?? true,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const discount = mapDiscount(data);

  // Fire-and-forget: notify subscribed customers
  if (discount.isActive) {
    supabase
      .from('customers')
      .select('email, first_name')
      .eq('discount_emails_consent', true)
      .eq('email_verified', true)
      .then(({ data: customers }) => {
        if (customers && customers.length > 0) {
          sendDiscountEmail(customers, {
            section: discount.section,
            discountType: discount.discountType,
            discountValue: discount.discountValue,
            categoryName: discount.categoryName,
            minOrderTotal: discount.minOrderTotal,
            endDate: discount.endDate,
          }).catch(console.error);
        }
      });
  }

  return NextResponse.json(discount, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('discounts').delete().eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
