import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  return user?.role === 'admin' ? user : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('menu_items').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('menu_items')
    .update({
      name_de: body.name_de,
      name_en: body.name_en,
      description_de: body.description_de,
      description_en: body.description_en,
      price: body.price,
      category: body.category,
      image: body.image,
      is_available: body.is_available,
      is_featured: body.is_featured,
      addons_optional: body.addons_optional ?? [],
      addons_mandatory: body.addons_mandatory ?? [],
      discount_type: body.discount_type || null,
      discount_value: body.discount_value ?? null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath('/');
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createServerSupabaseClient();

  // Fetch image URL before deleting
  const { data: item } = await supabase.from('menu_items').select('image').eq('id', id).single();

  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Delete from Supabase storage if image is from menu-images bucket
  if (item?.image) {
    const bucketBase = supabase.storage.from('menu-images').getPublicUrl('').data.publicUrl.replace(/\/$/, '');
    if (item.image.startsWith(bucketBase)) {
      const filePath = item.image.slice(bucketBase.length + 1);
      await supabase.storage.from('menu-images').remove([filePath]);
    }
  }

  return NextResponse.json({ ok: true });
}
