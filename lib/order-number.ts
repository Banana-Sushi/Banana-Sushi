import { SupabaseClient } from '@supabase/supabase-js';

export async function generateOrderNumber(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase
    .from('orders')
    .select('order_number')
    .like('order_number', 'BNN-%')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let next = 1000;
  if (data?.order_number) {
    const parsed = parseInt(data.order_number.replace('BNN-', ''), 10);
    if (!isNaN(parsed)) {
      next = parsed >= 9999 ? 1000 : parsed + 1;
    }
  }

  return `BNN-${next}`;
}
