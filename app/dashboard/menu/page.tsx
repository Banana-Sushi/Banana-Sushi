'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Icons } from '@/components/Icons';
import { supabase } from '@/lib/supabase';

interface RawMenuItem {
  id: string;
  name_de: string;
  name_en: string;
  description_de: string;
  description_en: string;
  price: number;
  category: string;
  image: string;
  is_available: boolean;
  is_featured: boolean;
}

const EMPTY_FORM: Omit<RawMenuItem, 'id'> = {
  name_de: '', name_en: '', description_de: '', description_en: '',
  price: '' as any, category: 'Sushi', image: '', is_available: true, is_featured: false,
};

const CATEGORIES = ['Sushi', 'Bowls', 'Drinks', 'Starters', 'Desserts'];

export default function MenuManagementPage() {
  const { t, lang, addToast } = useAppContext();
  const [items, setItems] = useState<RawMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<RawMenuItem, 'id'>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMenu = async () => {
    const res = await fetch('/api/menu');
    if (res.ok) setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchMenu(); }, []);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (item: RawMenuItem) => {
    setForm({
      name_de: item.name_de, name_en: item.name_en,
      description_de: item.description_de, description_en: item.description_en,
      price: item.price, category: item.category, image: item.image,
      is_available: item.is_available, is_featured: item.is_featured,
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('menu-images').upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('menu-images').getPublicUrl(path);
      setForm(prev => ({ ...prev, image: data.publicUrl }));
    } catch (err: any) {
      addToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingId ? `/api/menu/${editingId}` : '/api/menu';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        addToast(editingId ? 'Item updated' : 'Item added', 'success');
        setShowModal(false);
        fetchMenu();
      } else {
        const data = await res.json();
        addToast(data.error || 'Failed to save', 'error');
      }
    } catch {
      addToast('Network error. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' });
    if (res.ok) {
      addToast('Item deleted', 'success');
      setItems(prev => prev.filter(i => i.id !== id));
    } else {
      addToast('Failed to delete', 'error');
    }
  };

  return (
    <div className="pt-[100px] px-4 md:px-12 max-w-7xl mx-auto lg:pl-32 min-h-screen pb-32">
      <div className="flex justify-between items-end mb-12">
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
          Menu<span className="text-yellow-500">.</span>
        </h2>
        <button
          onClick={openNew}
          className="bg-black text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-yellow-500 hover:text-black transition-all flex items-center gap-2"
        >
          <Icons.Plus /> {t.dashboard.addNewItem}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {items.map(item => (
            <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-gray-100 flex gap-5 items-center hover:shadow-lg transition-all">
              {item.image ? (
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                  <Image src={item.image} alt={lang === 'de' ? item.name_de : item.name_en} fill className="object-cover" sizes="80px" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gray-100 shrink-0 flex items-center justify-center text-gray-300 text-2xl">🍣</div>
              )}
              <div className="flex-1 overflow-hidden font-black uppercase">
                <h4 className="text-sm truncate tracking-tight">{lang === 'de' ? item.name_de : item.name_en}</h4>
                <p className="text-gray-400 text-[10px] mt-0.5">{Number(item.price).toFixed(2)}€ · {item.category}</p>
                <div className="flex gap-1 mt-1">
                  {item.is_featured && <span className="text-[8px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-black uppercase">Featured</span>}
                  {!item.is_available && <span className="text-[8px] bg-red-100 text-red-500 px-2 py-0.5 rounded-full font-black uppercase">Unavailable</span>}
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openEdit(item)} className="p-2.5 bg-gray-50 rounded-xl hover:bg-black hover:text-white transition-all">
                    <Icons.Edit />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2.5 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                    <Icons.Trash />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black uppercase tracking-tight">
                {editingId ? 'Edit Item' : 'Add New Item'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                <Icons.Close />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Name (DE)</label>
                  <input required value={form.name_de} onChange={e => setForm({ ...form, name_de: e.target.value })}
                    className="w-full mt-1 p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Name (EN)</label>
                  <input required value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })}
                    className="w-full mt-1 p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Description (DE)</label>
                <textarea value={form.description_de} onChange={e => setForm({ ...form, description_de: e.target.value })}
                  rows={2} className="w-full mt-1 p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm resize-none" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Description (EN)</label>
                <textarea value={form.description_en} onChange={e => setForm({ ...form, description_en: e.target.value })}
                  rows={2} className="w-full mt-1 p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Price (€)</label>
                  <input required type="number" step="0.01" min="0" placeholder="0.00" value={form.price}
                    onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full mt-1 p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Image upload + URL */}
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Image</label>
                <div className="mt-1 space-y-2">
                  {form.image && (
                    <div className="relative w-full h-32 rounded-2xl overflow-hidden">
                      <Image src={form.image} alt="Preview" fill className="object-cover" sizes="400px" />
                    </div>
                  )}
                  {/* URL input */}
                  <input
                    value={form.image}
                    onChange={e => setForm({ ...form, image: e.target.value })}
                    placeholder="Paste image URL (https://...)"
                    className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm"
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-[9px] font-black uppercase text-gray-300 tracking-widest">or upload</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 font-black text-[10px] uppercase tracking-widest text-gray-400 hover:border-black hover:text-black transition-all disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Upload from device'}
                  </button>
                </div>
              </div>

              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_available} onChange={e => setForm({ ...form, is_available: e.target.checked })} className="accent-black w-4 h-4" />
                  <span className="text-[10px] font-black uppercase">Available</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} className="accent-black w-4 h-4" />
                  <span className="text-[10px] font-black uppercase">Featured on Homepage</span>
                </label>
              </div>
              <button type="submit" disabled={saving || uploading}
                className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-yellow-500 hover:text-black transition-all mt-4 disabled:opacity-50">
                {saving ? '...' : editingId ? 'Save Changes' : 'Add Item'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
