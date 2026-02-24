import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('category');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      name_de: body.name_de,
      name_en: body.name_en,
      description_de: body.description_de ?? '',
      description_en: body.description_en ?? '',
      price: body.price,
      category: body.category,
      image: body.image ?? '',
      is_available: body.is_available ?? true,
      is_featured: body.is_featured ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath('/');
  return NextResponse.json(data, { status: 201 });
}
