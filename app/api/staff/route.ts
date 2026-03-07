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

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('staff_users')
    .select('id, email, name, role, created_at')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, email, password, role } = await req.json();
  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 });
  }
  if (!['admin', 'staff'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('staff_users')
    .insert({ name, email: email.toLowerCase().trim(), password_hash, role })
    .select('id, email, name, role, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
