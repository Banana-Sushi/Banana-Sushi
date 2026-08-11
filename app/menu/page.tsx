import { MenuPageClient } from './MenuPageClient';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { MenuItem } from '@/types';

export default async function MenuPage() {
  const supabase = createServerSupabaseClient();
  const [{ data }, { data: categoryRows }] = await Promise.all([
    supabase.from('menu_items').select('*').eq('is_available', true).order('category'),
    supabase.from('categories').select('name').order('sort_order', { ascending: true }),
  ]);

  const categoryOrder: string[] = (categoryRows ?? []).map((row: any) => row.name);

  const items: MenuItem[] = (data ?? []).map((item: any) => ({
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
  }));

  return <MenuPageClient items={items} categoryOrder={categoryOrder} />;
}
