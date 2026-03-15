export const dynamic = 'force-dynamic';

import { HomePageClient } from './HomePageClient';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { MenuItem } from '@/types';

export default async function HomePage() {
  const supabase = createServerSupabaseClient();

  const [menuRes, contentRes] = await Promise.all([
    supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true)
      .or('is_featured.eq.true,discount_type.not.is.null')
      .limit(8),
    supabase.from('site_content').select('key, value'),
  ]);

  const featuredItems: MenuItem[] = (menuRes.data ?? []).map((item: any) => ({
    id: item.id,
    name: { de: item.name_de, en: item.name_en },
    description: { de: item.description_de ?? '', en: item.description_en ?? '' },
    price: Number(item.price),
    category: item.category,
    image: item.image ?? '',
    available: item.is_available,
    isFeatured: item.is_featured,
    addonsOptional: item.addons_optional ?? [],
    addonsMandatory: item.addons_mandatory ?? [],
    discountType: item.discount_type ?? null,
    discountValue: item.discount_value != null ? Number(item.discount_value) : null,
  })).sort((a: MenuItem, b: MenuItem) => {
    const discountAmount = (item: MenuItem) => {
      if (!item.discountType || !item.discountValue) return 0;
      return item.discountType === 'percentage'
        ? item.price * (item.discountValue / 100)
        : item.discountValue;
    };
    return discountAmount(b) - discountAmount(a);
  });

  const content: Record<string, string> = {};
  for (const row of contentRes.data ?? []) content[row.key] = row.value;

  return <HomePageClient featuredItems={featuredItems} content={content} />;
}
