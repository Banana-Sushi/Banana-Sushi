import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';
import type { Category } from '@/types';

function mapCategory(row: any): Category {
  return { id: row.id, name: row.name, sortOrder: Number(row.sort_order ?? 0) };
}

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(mapCategory));
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const names: string[] = Array.isArray(body.names) ? body.names : [];
  if (names.length === 0) return NextResponse.json({ error: 'names is required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('categories')
    .upsert(
      names.map((name, index) => ({ name, sort_order: index })),
      { onConflict: 'name' },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath('/menu');
  return NextResponse.json({ ok: true });
}
