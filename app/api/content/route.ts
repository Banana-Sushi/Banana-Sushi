import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('site_content').select('key, value');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const content: Record<string, string> = {};
  for (const row of data ?? []) content[row.key] = row.value;
  return NextResponse.json(content);
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const updates: { key: string; value: string }[] = Object.entries(body).map(([key, value]) => ({ key, value: value as string }));

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('site_content').upsert(updates, { onConflict: 'key' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
