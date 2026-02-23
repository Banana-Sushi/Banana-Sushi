import { HomePageClient } from './HomePageClient';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { MenuItem } from '@/types';

export default async function HomePage() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('menu_items')
    .select('*')
    .eq('is_available', true)
    .eq('is_featured', true)
    .limit(4);

  const featuredItems: MenuItem[] = (data ?? []).map((item: any) => ({
    id: item.id,
    name: { de: item.name_de, en: item.name_en },
    description: { de: item.description_de ?? '', en: item.description_en ?? '' },
    price: Number(item.price),
    category: item.category,
    image: item.image ?? '',
    available: item.is_available,
    isFeatured: item.is_featured,
  }));

  return <HomePageClient featuredItems={featuredItems} />;
}
