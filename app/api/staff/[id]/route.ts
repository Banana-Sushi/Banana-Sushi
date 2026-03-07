import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  if (!user || user.role !== 'admin') return null;
  return user;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { name, email, password, role } = await req.json();
  if (!name || !email || !role) {
    return NextResponse.json({ error: 'Name, email and role required' }, { status: 400 });
  }
  if (!['admin', 'staff'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { name, email: email.toLowerCase().trim(), role };
  if (password) {
    updates.password_hash = await bcrypt.hash(password, 10);
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('staff_users')
    .update(updates)
    .eq('id', id)
    .select('id, email, name, role, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Prevent self-deletion
  if (admin.id === id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('staff_users').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
