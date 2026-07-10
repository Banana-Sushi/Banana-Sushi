'use client';

import { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Discount } from '@/types';
import { Icons } from '@/components/Icons';

const CATEGORIES = ['Menüs', 'Vegetarische Menüs', 'Sushi Platten', 'Sushi Burger', 'Vorspeisen', 'Warme Suppen', 'Poke Bowl', 'Sommerrollen', 'Wok-Gerichte', 'Glasnudelsalat', 'Makis', 'Temaki', 'Nigiri', 'Inside Out Rolls', 'Inside Out Rolls (vegetarisch)', 'Spezial Rolls', 'Sashimi', 'Golden Rolls', 'Mini Golden Rolls', 'Desserts', 'Extras & Beilagen', 'Drinks'];

type TabKey = 'product' | 'category' | 'global' | 'command';

interface RawItem { id: string; name_de: string; name_en: string; price: number; category: string; }

interface TypeForm {
  discountType: 'percentage' | 'fixed' | 'two_for_one';
  discountValue: string;
  startDate: string;
  endDate: string;
}

const EMPTY_TYPE_FORM: TypeForm = { discountType: 'percentage', discountValue: '', startDate: '', endDate: '' };

function TypeToggle({ value, onChange, allowTwoForOne = true }: {
  value: 'percentage' | 'fixed' | 'two_for_one';
  onChange: (v: 'percentage' | 'fixed' | 'two_for_one') => void;
  allowTwoForOne?: boolean;
}) {
  const opts: Array<{ v: 'percentage' | 'fixed' | 'two_for_one'; label: string }> = [
    { v: 'percentage', label: '%' },
    { v: 'fixed', label: '€' },
    ...(allowTwoForOne ? [{ v: 'two_for_one' as const, label: '2×1' }] : []),
  ];
  return (
    <div className="flex gap-2">
      {opts.map(o => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${value === o.v ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function DateFields({ startDate, endDate, onChangeStart, onChangeEnd, t }: {
  startDate: string; endDate: string;
  onChangeStart: (v: string) => void; onChangeEnd: (v: string) => void;
  t: any;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-[9px] font-black uppercase text-gray-400 ml-1">
          {t.dashboard.discountStartDate} <span className="text-gray-300 normal-case font-bold">(opt.)</span>
        </label>
        <input type="date" value={startDate} onChange={e => onChangeStart(e.target.value)}
          className="w-full mt-1 p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm" />
      </div>
      <div>
        <label className="text-[9px] font-black uppercase text-gray-400 ml-1">
          {t.dashboard.discountEndDate} <span className="text-gray-300 normal-case font-bold">(opt.)</span>
        </label>
        <input type="date" value={endDate} onChange={e => onChangeEnd(e.target.value)}
          className="w-full mt-1 p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm" />
      </div>
    </div>
  );
}

function DiscountBadge({ d, lang }: { d: Discount; lang: string }) {
  const typeLabel =
    d.discountType === 'percentage' ? `${d.discountValue}%` :
    d.discountType === 'fixed' ? `${Number(d.discountValue).toFixed(2)}€` :
    '2×1';
  const sectionColor =
    d.section === 'product' ? 'bg-purple-100 text-purple-700' :
    d.section === 'category' ? 'bg-yellow-100 text-yellow-700' :
    d.section === 'global' ? 'bg-black text-white' :
    'bg-blue-100 text-blue-700';

  const now = new Date();
  const expired = !!d.endDate && new Date(d.endDate) < now;

  return (
    <div className={`flex flex-wrap items-center gap-2 mb-1`}>
      <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${sectionColor}`}>
        {d.section === 'product' ? (lang === 'de' ? 'Produkt' : 'Product') :
         d.section === 'category' ? (lang === 'de' ? 'Kategorie' : 'Category') :
         d.section === 'global' ? 'Global' : (lang === 'de' ? 'Bestellung' : 'Order')}
      </span>
      <span className="text-3xl font-black">{typeLabel}</span>
      {expired && (
        <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-red-100 text-red-500">
          {lang === 'de' ? 'Abgelaufen' : 'Expired'}
        </span>
      )}
    </div>
  );
}

function formatDateRange(d: Discount, noExpiry: string) {
  const start = d.startDate ? new Date(d.startDate).toLocaleDateString() : null;
  const end = d.endDate ? new Date(d.endDate).toLocaleDateString() : null;
  if (!start && !end) return noExpiry;
  if (start && end) return `${start} – ${end}`;
  if (start) return `${start} →`;
  return `→ ${end}`;
}

function DiscountRow({ d, lang, noExpiry, onToggle, onDelete }: {
  d: Discount; lang: string; noExpiry: string;
  onToggle: () => void; onDelete: () => void;
}) {
  const now = new Date();
  const expired = !!d.endDate && new Date(d.endDate) < now;
  return (
    <div className={`bg-white rounded-[2rem] border overflow-hidden transition-all ${expired ? 'border-red-100 opacity-60' : 'border-gray-100 hover:shadow-xl'}`}>
      <div className="p-5 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <DiscountBadge d={d} lang={lang} />
          <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">{formatDateRange(d, noExpiry)}</p>
          {d.section === 'category' && d.categoryName && (
            <p className="text-[10px] font-black text-gray-500 mt-0.5">{d.categoryName}</p>
          )}
          {d.section === 'command' && d.minOrderTotal != null && (
            <p className="text-[10px] font-black text-gray-500 mt-0.5">
              {lang === 'de' ? 'Ab' : 'From'} {Number(d.minOrderTotal).toFixed(2)}€
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggle}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${d.isActive ? 'bg-green-100 text-green-600 hover:bg-green-500 hover:text-white' : 'bg-gray-100 text-gray-400 hover:bg-black hover:text-white'}`}
          >
            {d.isActive ? (lang === 'de' ? 'Aktiv' : 'Active') : (lang === 'de' ? 'Inaktiv' : 'Inactive')}
          </button>
          <button onClick={onDelete} className="p-2.5 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all">
            <Icons.Trash />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DiscountsPage() {
  const { t, lang, addToast } = useAppContext();
  const [activeTab, setActiveTab] = useState<TabKey>('product');
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [menuItems, setMenuItems] = useState<RawItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Product tab
  const [productSearch, setProductSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<RawItem | null>(null);
  const [productForm, setProductForm] = useState<TypeForm>(EMPTY_TYPE_FORM);

  // Category tab
  const [catForm, setCatForm] = useState<TypeForm & { categoryName: string }>({
    ...EMPTY_TYPE_FORM, categoryName: CATEGORIES[0],
  });

  // Global tab
  const [globalForm, setGlobalForm] = useState<TypeForm>(EMPTY_TYPE_FORM);

  // Command tab
  const [cmdForm, setCmdForm] = useState<TypeForm & { minOrderTotal: string }>({
    discountType: 'percentage', discountValue: '', startDate: '', endDate: '', minOrderTotal: '',
  });

  const fetchDiscounts = async () => {
    const res = await fetch('/api/discounts');
    if (res.ok) setDiscounts(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchDiscounts();
    fetch('/api/menu').then(r => r.ok ? r.json() : []).then(setMenuItems).catch(() => {});
  }, []);

  const productDiscounts = discounts.filter(d => d.section === 'product');
  const categoryDiscounts = discounts.filter(d => d.section === 'category');
  const globalDiscounts = discounts.filter(d => d.section === 'global');
  const commandDiscounts = discounts.filter(d => d.section === 'command');

  const filteredItems = productSearch.trim()
    ? menuItems.filter(i =>
        i.name_de.toLowerCase().includes(productSearch.toLowerCase()) ||
        i.name_en.toLowerCase().includes(productSearch.toLowerCase()),
      ).slice(0, 8)
    : [];

  const getItemName = (id: string | null) => {
    if (!id) return '?';
    const item = menuItems.find(i => i.id === id);
    return item ? (lang === 'de' ? item.name_de : item.name_en) : id;
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.dashboard.confirmDelete)) return;
    const prev = discounts;
    setDiscounts(prev.filter(d => d.id !== id));
    const res = await fetch('/api/discounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      setDiscounts(prev);
      addToast(lang === 'de' ? 'Fehler beim Löschen' : 'Failed to delete', 'error');
    } else {
      addToast(lang === 'de' ? 'Gelöscht' : 'Deleted', 'success');
    }
  };

  const handleToggleActive = async (d: Discount) => {
    const updated = { ...d, isActive: !d.isActive };
    setDiscounts(prev => prev.map(x => x.id === d.id ? updated : x));
    const res = await fetch(`/api/discounts/${d.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !d.isActive }),
    });
    if (!res.ok) {
      setDiscounts(prev => prev.map(x => x.id === d.id ? d : x));
      addToast(lang === 'de' ? 'Fehler beim Aktualisieren' : 'Failed to update', 'error');
    }
  };

  const postDiscount = async (body: object) => {
    setSaving(true);
    try {
      const res = await fetch('/api/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { addToast(data.error || 'Error', 'error'); return false; }
      await fetchDiscounts();
      addToast(lang === 'de' ? 'Rabatt gespeichert' : 'Discount saved', 'success');
      return true;
    } catch {
      addToast(lang === 'de' ? 'Netzwerkfehler' : 'Network error', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    const ok = await postDiscount({
      section: 'product',
      menuItemId: selectedItem.id,
      discountType: productForm.discountType,
      discountValue: productForm.discountType !== 'two_for_one' ? Number(productForm.discountValue) : null,
      startDate: productForm.startDate || null,
      endDate: productForm.endDate || null,
    });
    if (ok) { setSelectedItem(null); setProductSearch(''); setProductForm(EMPTY_TYPE_FORM); }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await postDiscount({
      section: 'category',
      categoryName: catForm.categoryName,
      discountType: catForm.discountType,
      discountValue: catForm.discountType !== 'two_for_one' ? Number(catForm.discountValue) : null,
      startDate: catForm.startDate || null,
      endDate: catForm.endDate || null,
    });
    if (ok) setCatForm({ ...EMPTY_TYPE_FORM, categoryName: CATEGORIES[0] });
  };

  const handleSaveGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const hasActive = globalDiscounts.some(d =>
      d.isActive &&
      (!d.startDate || new Date(d.startDate) <= now) &&
      (!d.endDate || new Date(d.endDate) >= now),
    );
    if (hasActive && !confirm(t.dashboard.discountWarnGlobal + (lang === 'de' ? ' Trotzdem hinzufügen?' : ' Add anyway?'))) return;
    const ok = await postDiscount({
      section: 'global',
      discountType: globalForm.discountType,
      discountValue: globalForm.discountType !== 'two_for_one' ? Number(globalForm.discountValue) : null,
      startDate: globalForm.startDate || null,
      endDate: globalForm.endDate || null,
    });
    if (ok) setGlobalForm(EMPTY_TYPE_FORM);
  };

  const handleSaveCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await postDiscount({
      section: 'command',
      discountType: cmdForm.discountType,
      discountValue: Number(cmdForm.discountValue),
      minOrderTotal: Number(cmdForm.minOrderTotal),
      startDate: cmdForm.startDate || null,
      endDate: cmdForm.endDate || null,
    });
    if (ok) setCmdForm({ discountType: 'percentage', discountValue: '', startDate: '', endDate: '', minOrderTotal: '' });
  };

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'product', label: t.dashboard.discountTabProduct },
    { key: 'category', label: t.dashboard.discountTabCategory },
    { key: 'global', label: t.dashboard.discountTabGlobal },
    { key: 'command', label: t.dashboard.discountTabCommand },
  ];

  const formClass = "bg-white rounded-[2rem] border border-gray-100 p-6 space-y-4 mb-6";
  const inputClass = "w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm";
  const labelClass = "text-[9px] font-black uppercase text-gray-400 ml-1";
  const saveBtn = (disabled: boolean) => (
    <button type="submit" disabled={disabled || saving}
      className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-50">
      {saving ? '...' : t.dashboard.discountSave}
    </button>
  );

  return (
    <div className="pt-8 px-4 md:px-12 max-w-4xl mx-auto lg:pl-32 min-h-screen pb-32">
      <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-10">
        {t.dashboard.discounts}<span className="text-yellow-500">.</span>
      </h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-gray-100 p-1.5 rounded-2xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.key ? 'bg-black text-white shadow' : 'text-gray-500 hover:text-black'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── PRODUCT TAB ── */}
          {activeTab === 'product' && (
            <div>
              <div className={formClass}>
                <div>
                  <label className={labelClass}>{t.dashboard.discountSearchItems}</label>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={e => { setProductSearch(e.target.value); setSelectedItem(null); }}
                    placeholder={t.dashboard.discountSearchItems}
                    className={`${inputClass} mt-1`}
                  />
                  {filteredItems.length > 0 && !selectedItem && (
                    <ul className="mt-2 bg-gray-50 rounded-2xl overflow-hidden divide-y divide-gray-100">
                      {filteredItems.map(item => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => { setSelectedItem(item); setProductSearch(lang === 'de' ? item.name_de : item.name_en); }}
                            className="w-full flex justify-between items-center px-4 py-3 hover:bg-yellow-50 transition-all text-left"
                          >
                            <span className="font-black text-sm">{lang === 'de' ? item.name_de : item.name_en}</span>
                            <span className="text-[10px] font-bold text-gray-400">{Number(item.price).toFixed(2)}€</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {selectedItem && (
                  <form onSubmit={handleSaveProduct} className="space-y-4 border-t border-gray-100 pt-4 mt-2">
                    <div className="flex items-center gap-3 bg-yellow-50 rounded-2xl px-4 py-3">
                      <span className="font-black text-sm flex-1">{lang === 'de' ? selectedItem.name_de : selectedItem.name_en}</span>
                      <span className="text-[10px] font-bold text-gray-400">{Number(selectedItem.price).toFixed(2)}€</span>
                      <button type="button" onClick={() => { setSelectedItem(null); setProductSearch(''); }} className="text-gray-400 hover:text-red-500 transition-colors font-black text-lg leading-none">×</button>
                    </div>
                    <div>
                      <label className={labelClass}>{t.dashboard.discountType}</label>
                      <div className="mt-1">
                        <TypeToggle value={productForm.discountType} onChange={v => setProductForm(f => ({ ...f, discountType: v, discountValue: '' }))} />
                      </div>
                    </div>
                    {productForm.discountType !== 'two_for_one' && (
                      <div>
                        <label className={labelClass}>{t.dashboard.discountValue}</label>
                        <div className="relative mt-1">
                          <input required type="number" min="0" step="0.01" value={productForm.discountValue}
                            onChange={e => setProductForm(f => ({ ...f, discountValue: e.target.value }))}
                            className={`${inputClass} pr-10`} />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-400 text-sm">
                            {productForm.discountType === 'percentage' ? '%' : '€'}
                          </span>
                        </div>
                      </div>
                    )}
                    <DateFields
                      startDate={productForm.startDate} endDate={productForm.endDate}
                      onChangeStart={v => setProductForm(f => ({ ...f, startDate: v }))}
                      onChangeEnd={v => setProductForm(f => ({ ...f, endDate: v }))}
                      t={t}
                    />
                    {saveBtn(false)}
                  </form>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {productDiscounts.length === 0
                  ? <p className="text-center py-8 text-gray-300 font-black uppercase text-sm">{t.dashboard.discountNoRules}</p>
                  : productDiscounts.map(d => (
                    <div key={d.id} className="relative">
                      <p className="text-[9px] font-black uppercase text-gray-400 ml-2 mb-1">{getItemName(d.menuItemId)}</p>
                      <DiscountRow d={d} lang={lang} noExpiry={t.dashboard.discountNoExpiry}
                        onToggle={() => handleToggleActive(d)} onDelete={() => handleDelete(d.id)} />
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* ── CATEGORY TAB ── */}
          {activeTab === 'category' && (
            <div>
              <form onSubmit={handleSaveCategory} className={`${formClass} space-y-4`}>
                <div>
                  <label className={labelClass}>{t.dashboard.discountCategory}</label>
                  <select value={catForm.categoryName} onChange={e => setCatForm(f => ({ ...f, categoryName: e.target.value }))}
                    className={`${inputClass} mt-1`}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t.dashboard.discountType}</label>
                  <div className="mt-1">
                    <TypeToggle value={catForm.discountType} onChange={v => setCatForm(f => ({ ...f, discountType: v, discountValue: '' }))} />
                  </div>
                </div>
                {catForm.discountType !== 'two_for_one' && (
                  <div>
                    <label className={labelClass}>{t.dashboard.discountValue}</label>
                    <div className="relative mt-1">
                      <input required type="number" min="0" step="0.01" value={catForm.discountValue}
                        onChange={e => setCatForm(f => ({ ...f, discountValue: e.target.value }))}
                        className={`${inputClass} pr-10`} />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-400 text-sm">
                        {catForm.discountType === 'percentage' ? '%' : '€'}
                      </span>
                    </div>
                  </div>
                )}
                <DateFields
                  startDate={catForm.startDate} endDate={catForm.endDate}
                  onChangeStart={v => setCatForm(f => ({ ...f, startDate: v }))}
                  onChangeEnd={v => setCatForm(f => ({ ...f, endDate: v }))}
                  t={t}
                />
                {saveBtn(false)}
              </form>

              <div className="flex flex-col gap-3">
                {categoryDiscounts.length === 0
                  ? <p className="text-center py-8 text-gray-300 font-black uppercase text-sm">{t.dashboard.discountNoRules}</p>
                  : categoryDiscounts.map(d => (
                    <DiscountRow key={d.id} d={d} lang={lang} noExpiry={t.dashboard.discountNoExpiry}
                      onToggle={() => handleToggleActive(d)} onDelete={() => handleDelete(d.id)} />
                  ))
                }
              </div>
            </div>
          )}

          {/* ── GLOBAL TAB ── */}
          {activeTab === 'global' && (
            <div>
              {globalDiscounts.filter(d => {
                const now = new Date();
                return d.isActive &&
                  (!d.startDate || new Date(d.startDate) <= now) &&
                  (!d.endDate || new Date(d.endDate) >= now);
              }).length > 1 && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-3 text-[10px] font-black uppercase text-yellow-700">
                  ⚠ {t.dashboard.discountWarnGlobal}
                </div>
              )}
              <form onSubmit={handleSaveGlobal} className={`${formClass} space-y-4`}>
                <div>
                  <label className={labelClass}>{t.dashboard.discountType}</label>
                  <div className="mt-1">
                    <TypeToggle value={globalForm.discountType} onChange={v => setGlobalForm(f => ({ ...f, discountType: v, discountValue: '' }))} />
                  </div>
                </div>
                {globalForm.discountType !== 'two_for_one' && (
                  <div>
                    <label className={labelClass}>{t.dashboard.discountValue}</label>
                    <div className="relative mt-1">
                      <input required type="number" min="0" step="0.01" value={globalForm.discountValue}
                        onChange={e => setGlobalForm(f => ({ ...f, discountValue: e.target.value }))}
                        className={`${inputClass} pr-10`} />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-400 text-sm">
                        {globalForm.discountType === 'percentage' ? '%' : '€'}
                      </span>
                    </div>
                  </div>
                )}
                <DateFields
                  startDate={globalForm.startDate} endDate={globalForm.endDate}
                  onChangeStart={v => setGlobalForm(f => ({ ...f, startDate: v }))}
                  onChangeEnd={v => setGlobalForm(f => ({ ...f, endDate: v }))}
                  t={t}
                />
                {saveBtn(false)}
              </form>

              <div className="flex flex-col gap-3">
                {globalDiscounts.length === 0
                  ? <p className="text-center py-8 text-gray-300 font-black uppercase text-sm">{t.dashboard.discountNoRules}</p>
                  : globalDiscounts.map(d => (
                    <DiscountRow key={d.id} d={d} lang={lang} noExpiry={t.dashboard.discountNoExpiry}
                      onToggle={() => handleToggleActive(d)} onDelete={() => handleDelete(d.id)} />
                  ))
                }
              </div>
            </div>
          )}

          {/* ── COMMAND TAB ── */}
          {activeTab === 'command' && (
            <div>
              <form onSubmit={handleSaveCommand} className={`${formClass} space-y-4`}>
                <div>
                  <label className={labelClass}>{t.dashboard.discountMinOrder}</label>
                  <div className="relative mt-1">
                    <input required type="number" min="0" step="0.01" value={cmdForm.minOrderTotal}
                      onChange={e => setCmdForm(f => ({ ...f, minOrderTotal: e.target.value }))}
                      className={`${inputClass} pr-10`} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-400 text-sm">€</span>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{t.dashboard.discountType}</label>
                  <div className="mt-1">
                    <TypeToggle value={cmdForm.discountType} onChange={v => setCmdForm(f => ({ ...f, discountType: v, discountValue: '' }))} allowTwoForOne={false} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{t.dashboard.discountValue}</label>
                  <div className="relative mt-1">
                    <input required type="number" min="0" step="0.01" value={cmdForm.discountValue}
                      onChange={e => setCmdForm(f => ({ ...f, discountValue: e.target.value }))}
                      className={`${inputClass} pr-10`} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-400 text-sm">
                      {cmdForm.discountType === 'percentage' ? '%' : '€'}
                    </span>
                  </div>
                </div>
                <DateFields
                  startDate={cmdForm.startDate} endDate={cmdForm.endDate}
                  onChangeStart={v => setCmdForm(f => ({ ...f, startDate: v }))}
                  onChangeEnd={v => setCmdForm(f => ({ ...f, endDate: v }))}
                  t={t}
                />
                {saveBtn(false)}
              </form>

              <div className="flex flex-col gap-3">
                {commandDiscounts.length === 0
                  ? <p className="text-center py-8 text-gray-300 font-black uppercase text-sm">{t.dashboard.discountNoRules}</p>
                  : commandDiscounts
                    .sort((a, b) => (a.minOrderTotal ?? 0) - (b.minOrderTotal ?? 0))
                    .map(d => (
                      <DiscountRow key={d.id} d={d} lang={lang} noExpiry={t.dashboard.discountNoExpiry}
                        onToggle={() => handleToggleActive(d)} onDelete={() => handleDelete(d.id)} />
                    ))
                }
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
