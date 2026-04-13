'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Icons } from '@/components/Icons';

interface AddonField {
  name: string;
  price: string;
}

interface RawMenuItem {
  id: string;
  name_de: string;
  name_en: string;
  description_de: string;
  description_en: string;
  price: number | string;
  category: string;
  image: string;
  is_available: boolean;
  is_featured: boolean;
  addons_optional: AddonField[];
  addons_mandatory: AddonField[];
  discount_type: 'percentage' | 'fixed' | '';
  discount_value: string;
}

const EMPTY_FORM: Omit<RawMenuItem, 'id'> = {
  name_de: '', name_en: '', description_de: '', description_en: '',
  price: '', category: 'Sushi', image: '', is_available: true, is_featured: false,
  addons_optional: [], addons_mandatory: [],
  discount_type: '', discount_value: '',
};

const CATEGORIES = ['Menüs', 'Vegetarische Menüs', 'Sushi Platten', 'Sushi Burger', 'Vorspeisen', 'Warme Suppen', 'Poke Bowl', 'Sommerrollen', 'Wok-Gerichte', 'Glasnudelsalat', 'Makis', 'Temaki', 'Nigiri', 'Inside Out Rolls', 'Inside Out Rolls (vegetarisch)', 'Spezial Rolls', 'Sashimi', 'Golden Rolls', 'Mini Golden Rolls', 'Desserts', 'Extras & Beilagen', 'Drinks'];

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
      price: String(item.price), category: item.category, image: item.image,
      is_available: item.is_available, is_featured: item.is_featured,
      addons_optional: (item.addons_optional ?? []).map((a: any) => ({ name: a.name, price: String(a.price) })),
      addons_mandatory: (item.addons_mandatory ?? []).map((a: any) => ({ name: a.name, price: String(a.price) })),
      discount_type: (item.discount_type as any) || '',
      discount_value: (item.discount_value as any) != null ? String(item.discount_value) : '',
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const compressImage = (file: File): Promise<{ blob: Blob; ext: string; mime: string }> =>
    new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const MAX = 900;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        // Prefer WebP (same quality, ~40% smaller than JPEG); fall back to JPEG
        const tryWebP = () => {
          canvas.toBlob(blob => {
            if (blob) { resolve({ blob, ext: 'webp', mime: 'image/webp' }); }
            else { tryJpeg(); }
          }, 'image/webp', 0.88);
        };
        const tryJpeg = () => {
          canvas.toBlob(blob => {
            blob ? resolve({ blob, ext: 'jpg', mime: 'image/jpeg' }) : reject(new Error('Compression failed'));
          }, 'image/jpeg', 0.88);
        };
        tryWebP();
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { blob, ext, mime } = await compressImage(file);
      const formData = new FormData();
      formData.append('file', new File([blob], file.name.replace(/\.\w+$/, `.${ext}`), { type: mime }));
      const res = await fetch('/api/menu/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setForm(prev => ({ ...prev, image: data.url }));
    } catch (err: any) {
      addToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const addAddon = (type: 'optional' | 'mandatory') => {
    const key = type === 'optional' ? 'addons_optional' : 'addons_mandatory';
    setForm(prev => ({ ...prev, [key]: [...prev[key], { name: '', price: '0' }] }));
  };

  const updateAddon = (type: 'optional' | 'mandatory', idx: number, field: 'name' | 'price', val: string) => {
    const key = type === 'optional' ? 'addons_optional' : 'addons_mandatory';
    setForm(prev => ({
      ...prev,
      [key]: prev[key].map((a: AddonField, i: number) => i === idx ? { ...a, [field]: val } : a),
    }));
  };

  const removeAddon = (type: 'optional' | 'mandatory', idx: number) => {
    const key = type === 'optional' ? 'addons_optional' : 'addons_mandatory';
    setForm(prev => ({ ...prev, [key]: prev[key].filter((_: any, i: number) => i !== idx) }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(String(form.price)) || 0,
        discount_type: form.discount_type || null,
        discount_value: form.discount_type && form.discount_value !== '' ? Number(form.discount_value) : null,
        addons_optional: form.addons_optional
          .filter((a: AddonField) => a.name.trim())
          .map((a: AddonField) => ({ name: a.name.trim(), price: Number(a.price) || 0 })),
        addons_mandatory: form.addons_mandatory
          .filter((a: AddonField) => a.name.trim())
          .map((a: AddonField) => ({ name: a.name.trim(), price: Number(a.price) || 0 })),
      };
      const url = editingId ? `/api/menu/${editingId}` : '/api/menu';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    const prev = items;
    setItems(items.filter(i => i.id !== id)); // optimistic update
    const res = await fetch(`/api/menu/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) {
      addToast('Item deleted', 'success');
    } else {
      setItems(prev); // revert on failure
      const data = await res.json().catch(() => ({}));
      addToast(data.error || 'Failed to delete', 'error');
    }
  };

  return (
    <div className="pt-8 px-4 md:px-12 max-w-7xl mx-auto lg:pl-32 min-h-screen pb-32">
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map(item => {
            const name = lang === 'de' ? item.name_de : item.name_en;
            const hasMandatory = (item.addons_mandatory as any)?.length > 0;
            const hasOptional = (item.addons_optional as any)?.length > 0;
            return (
              <div key={item.id} className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden hover:shadow-xl transition-all group">
                {/* Image */}
                <div className="relative h-40 bg-gray-50 overflow-hidden">
                  {item.image ? (
                    <Image src={item.image} alt={name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="400px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl text-gray-200">🍣</div>
                  )}
                  {/* Price pill */}
                  <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-sm font-black shadow-lg">
                    {Number(item.price).toFixed(2)}€
                  </div>
                  {/* Discount badge */}
                  {item.discount_type && (
                    <div className="absolute top-3 left-3 bg-yellow-500 text-black px-2.5 py-1 rounded-xl text-[9px] font-black uppercase shadow">
                      {item.discount_type === 'percentage' ? `${item.discount_value}% off` : `${Number(item.discount_value).toFixed(2)}€ off`}
                    </div>
                  )}
                  {/* Unavailable overlay */}
                  {!item.is_available && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-red-500 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-xl tracking-widest">Unavailable</span>
                    </div>
                  )}
                </div>
                {/* Content */}
                <div className="p-5">
                  <div className="mb-3">
                    <h4 className="font-black uppercase text-base leading-tight truncate">{name}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">{item.category}</p>
                  </div>
                  {/* Status badges */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {item.is_featured && <span className="text-[8px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-black uppercase">★ Featured</span>}
                    {hasMandatory && <span className="text-[8px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-black uppercase">Required add-ons</span>}
                    {hasOptional && <span className="text-[8px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-black uppercase">Extras</span>}
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-gray-50">
                    <button
                      onClick={() => openEdit(item)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 rounded-xl text-[10px] font-black uppercase hover:bg-black hover:text-white transition-all"
                    >
                      <Icons.Edit /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-400 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black uppercase tracking-tight">
                {editingId ? 'Edit Item' : 'Add New Item'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                <Icons.Close />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-5">

              {/* Basic info */}
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
                  <input required type="text" inputMode="decimal" placeholder="0.00" value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
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

              {/* Discount */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <label className="text-[9px] font-black uppercase text-gray-500">Discount (optional)</label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={form.discount_type}
                    onChange={e => setForm({ ...form, discount_type: e.target.value as any, discount_value: '' })}
                    className="p-3 bg-white rounded-xl border-none outline-none font-bold text-sm"
                  >
                    <option value="">No Discount</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (€)</option>
                  </select>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={form.discount_type === 'percentage' ? 'e.g. 10' : 'e.g. 2.00'}
                    value={form.discount_value}
                    onChange={e => setForm({ ...form, discount_value: e.target.value })}
                    disabled={!form.discount_type}
                    className="p-3 bg-white rounded-xl border-none outline-none font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
                {form.discount_type && form.discount_value && (
                  <p className="text-[9px] font-black text-green-600 uppercase">
                    {form.discount_type === 'percentage'
                      ? `Customer pays: ${(Number(form.price) * (1 - Number(form.discount_value) / 100)).toFixed(2)}€`
                      : `Customer pays: ${Math.max(0, Number(form.price) - Number(form.discount_value)).toFixed(2)}€`}
                  </p>
                )}
              </div>

              {/* Mandatory Add-ons */}
              <div className="bg-purple-50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase text-purple-700">Mandatory Add-ons</p>
                    <p className="text-[8px] text-purple-400 mt-0.5">Customer must choose at least one</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addAddon('mandatory')}
                    className="text-[8px] font-black uppercase bg-purple-600 text-white px-3 py-1.5 rounded-full hover:bg-purple-700 transition-all"
                  >
                    + Add
                  </button>
                </div>
                {form.addons_mandatory.length === 0 && (
                  <p className="text-[9px] text-purple-300 font-bold italic">No mandatory add-ons — item can be added to cart directly.</p>
                )}
                {form.addons_mandatory.map((addon, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={addon.name}
                      onChange={e => updateAddon('mandatory', i, 'name', e.target.value)}
                      placeholder="Option name (e.g. Small, Large)"
                      className="flex-1 p-3 bg-white rounded-xl border-none outline-none font-bold text-sm"
                    />
                    <div className="relative w-24">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={addon.price}
                        onChange={e => updateAddon('mandatory', i, 'price', e.target.value)}
                        placeholder="0.00"
                        className="w-full p-3 bg-white rounded-xl border-none outline-none font-bold text-sm pr-6"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-black">€</span>
                    </div>
                    <button type="button" onClick={() => removeAddon('mandatory', i)} className="p-2 text-purple-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all font-black text-lg leading-none">×</button>
                  </div>
                ))}
              </div>

              {/* Optional Add-ons */}
              <div className="bg-blue-50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase text-blue-700">Optional Add-ons</p>
                    <p className="text-[8px] text-blue-400 mt-0.5">Customer may choose extras (checkboxes)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addAddon('optional')}
                    className="text-[8px] font-black uppercase bg-blue-600 text-white px-3 py-1.5 rounded-full hover:bg-blue-700 transition-all"
                  >
                    + Add
                  </button>
                </div>
                {form.addons_optional.length === 0 && (
                  <p className="text-[9px] text-blue-300 font-bold italic">No optional add-ons.</p>
                )}
                {form.addons_optional.map((addon, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={addon.name}
                      onChange={e => updateAddon('optional', i, 'name', e.target.value)}
                      placeholder="Extra name (e.g. Extra Sauce)"
                      className="flex-1 p-3 bg-white rounded-xl border-none outline-none font-bold text-sm"
                    />
                    <div className="relative w-24">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={addon.price}
                        onChange={e => updateAddon('optional', i, 'price', e.target.value)}
                        placeholder="0.00"
                        className="w-full p-3 bg-white rounded-xl border-none outline-none font-bold text-sm pr-6"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-black">€</span>
                    </div>
                    <button type="button" onClick={() => removeAddon('optional', i)} className="p-2 text-blue-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all font-black text-lg leading-none">×</button>
                  </div>
                ))}
              </div>

              {/* Image */}
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Image</label>
                <div className="mt-1 space-y-2">
                  {form.image && (
                    <div className="relative w-full h-32 rounded-2xl overflow-hidden">
                      <Image src={form.image} alt="Preview" fill className="object-cover" sizes="400px" />
                    </div>
                  )}
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
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
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
