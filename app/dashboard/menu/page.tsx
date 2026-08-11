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
}

const EMPTY_FORM: Omit<RawMenuItem, 'id'> = {
  name_de: '', name_en: '', description_de: '', description_en: '',
  price: '', category: 'Sushi', image: '', is_available: true, is_featured: false,
  addons_optional: [], addons_mandatory: [],
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
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [orderOpen, setOrderOpen] = useState(false);
  const [draftOrder, setDraftOrder] = useState<string[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [positionDrafts, setPositionDrafts] = useState<Record<string, string>>({});

  const fetchMenu = async () => {
    const res = await fetch('/api/menu');
    if (res.ok) setItems(await res.json());
    setLoading(false);
  };

  const fetchCategoryOrder = async () => {
    const res = await fetch('/api/categories');
    if (res.ok) {
      const data: { name: string }[] = await res.json();
      setCategoryOrder(data.map(c => c.name));
    }
  };

  useEffect(() => { fetchMenu(); fetchCategoryOrder(); }, []);

  // Categories used by items but not yet known to the category-order table
  // 'All' is excluded — it's a reserved pseudo-category for the "show everything" filter on the public menu page
  const knownCategories = new Set(categoryOrder);
  const savedCategoryList = [
    ...categoryOrder,
    ...Array.from(new Set(items.map(i => i.category))).filter(c => !knownCategories.has(c)),
  ].filter(c => c !== 'All');

  const openOrderPanel = () => {
    setDraftOrder(savedCategoryList);
    setOrderOpen(true);
  };

  const closeOrderPanel = () => {
    setOrderOpen(false);
    setDraftOrder([]);
    setPositionDrafts({});
  };

  const moveCategory = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draftOrder.length) return;
    const next = [...draftOrder];
    [next[index], next[target]] = [next[target], next[index]];
    setDraftOrder(next);
  };

  const commitCategoryPosition = (category: string, rawValue: string) => {
    setPositionDrafts(prev => {
      const next = { ...prev };
      delete next[category];
      return next;
    });

    const parsed = parseInt(rawValue, 10);
    if (!Number.isFinite(parsed)) return;

    const currentIndex = draftOrder.indexOf(category);
    const targetIndex = Math.min(Math.max(parsed - 1, 0), draftOrder.length - 1);
    if (currentIndex === -1 || targetIndex === currentIndex) return;

    const next = [...draftOrder];
    next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, category);
    setDraftOrder(next);
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names: draftOrder }),
      });
      if (!res.ok) throw new Error();
      setCategoryOrder(draftOrder);
      addToast('Category order saved', 'success');
      closeOrderPanel();
    } catch {
      addToast('Failed to save category order', 'error');
    } finally {
      setSavingOrder(false);
    }
  };

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

      {savedCategoryList.length > 0 && (
        <div className="mb-10 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => (orderOpen ? closeOrderPanel() : openOrderPanel())}
            className="w-full flex items-center justify-between gap-4 p-6 text-left"
          >
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest">Category Order</h3>
              <p className="text-[10px] text-gray-400 font-bold mt-1">Controls the order categories appear in on the menu page.</p>
            </div>
            <span className={`transition-transform duration-200 shrink-0 ${orderOpen ? '' : 'rotate-180'}`}>
              <Icons.ChevronUp />
            </span>
          </button>

          {orderOpen && (
            <div className="px-6 pb-6">
              <p className="text-[10px] text-gray-400 font-bold mb-4">Type a position number to jump a category there, or use the arrows to nudge it by one.</p>
              <div className="flex flex-col gap-1.5 mb-5">
                {draftOrder.map((category, index) => (
                  <div key={category} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
                    <input
                      type="number"
                      min={1}
                      max={draftOrder.length}
                      disabled={savingOrder}
                      value={positionDrafts[category] ?? String(index + 1)}
                      onChange={e => setPositionDrafts(prev => ({ ...prev, [category]: e.target.value }))}
                      onBlur={e => commitCategoryPosition(category, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      className="w-12 text-center bg-white border border-gray-200 rounded-lg py-1.5 text-xs font-black outline-none focus:border-black disabled:opacity-50"
                      aria-label={`Position for ${category}`}
                    />
                    <span className="flex-1 text-xs font-black uppercase truncate">{category}</span>
                    <button
                      type="button"
                      onClick={() => moveCategory(index, -1)}
                      disabled={index === 0 || savingOrder}
                      className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-20 disabled:pointer-events-none transition-all"
                      aria-label="Move up"
                    >
                      <Icons.ChevronUp />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCategory(index, 1)}
                      disabled={index === draftOrder.length - 1 || savingOrder}
                      className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-20 disabled:pointer-events-none transition-all rotate-180"
                      aria-label="Move down"
                    >
                      <Icons.ChevronUp />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSaveOrder}
                  disabled={savingOrder}
                  className="flex-1 bg-black text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-50"
                >
                  {savingOrder ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={closeOrderPanel}
                  disabled={savingOrder}
                  className="px-6 py-3.5 rounded-xl bg-gray-100 text-gray-500 font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
