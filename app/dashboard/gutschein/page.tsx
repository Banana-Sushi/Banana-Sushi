'use client';

import { useState, useEffect, useCallback, useMemo, type FormEvent } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Icons } from '@/components/Icons';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_total: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  uses_limit: number;
  uses_count: number;
  created_at: string;
}

interface CouponGroup {
  key: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_total: number | null;
  start_date: string | null;
  end_date: string | null;
  uses_limit: number;
  coupons: Coupon[];
  created_at: string;
  totalCodes: number;
  available: number;
  exhausted: number;
  deactivated: number;
  totalUses: number;
  totalCapacity: number;
}

const labelClass = 'block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5';
const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors';

export default function GutscheinPage() {
  const { t, lang, addToast } = useAppContext();
  const td = t.dashboard;
  const locale = lang === 'de' ? 'de-DE' : 'en-GB';

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [togglingGroup, setTogglingGroup] = useState<string | null>(null);

  // Form
  const [quantity, setQuantity] = useState(1);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderTotal, setMinOrderTotal] = useState('');
  const [usesLimit, setUsesLimit] = useState(1);
  const [useStartDate, setUseStartDate] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [useEndDate, setUseEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [generating, setGenerating] = useState(false);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/coupons');
    if (res.ok) setCoupons(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const groups = useMemo<CouponGroup[]>(() => {
    const map = new Map<string, CouponGroup>();
    for (const c of coupons) {
      const key = `${c.discount_type}|${c.discount_value}|${c.min_order_total ?? ''}|${c.start_date ?? ''}|${c.end_date ?? ''}|${c.uses_limit}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          discount_type: c.discount_type,
          discount_value: c.discount_value,
          min_order_total: c.min_order_total,
          start_date: c.start_date,
          end_date: c.end_date,
          uses_limit: c.uses_limit,
          coupons: [],
          created_at: c.created_at,
          totalCodes: 0,
          available: 0,
          exhausted: 0,
          deactivated: 0,
          totalUses: 0,
          totalCapacity: 0,
        });
      }
      const g = map.get(key)!;
      g.coupons.push(c);
      g.totalCodes++;
      g.totalUses += c.uses_count;
      g.totalCapacity += c.uses_limit;
      if (c.uses_count >= c.uses_limit) g.exhausted++;
      else if (c.is_active) g.available++;
      else g.deactivated++;
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [coupons]);

  const resetForm = () => {
    setQuantity(1); setDiscountType('percentage'); setDiscountValue('');
    setMinOrderTotal(''); setUsesLimit(1);
    setUseStartDate(false); setStartDate('');
    setUseEndDate(false); setEndDate('');
  };

  const handleGenerate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity,
          discountType,
          discountValue: Number(discountValue),
          minOrderTotal: minOrderTotal ? Number(minOrderTotal) : undefined,
          usesLimit,
          startDate: useStartDate && startDate ? new Date(startDate).toISOString() : undefined,
          endDate: useEndDate && endDate ? new Date(endDate).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      addToast(`${data.length} Codes ${td.gutscheinToastGenerated}`, 'success');
      resetForm();
      setShowForm(false);
      await fetchCoupons();
    } catch (err: any) {
      addToast(err.message || td.gutscheinToastError, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleGroup = async (group: CouponGroup) => {
    const toggleable = group.coupons.filter(c => c.uses_count < c.uses_limit);
    const newActive = group.available < toggleable.length;
    setTogglingGroup(group.key);
    await Promise.all(
      toggleable.map(c =>
        fetch(`/api/coupons/${c.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: newActive }),
        })
      )
    );
    setCoupons(prev =>
      prev.map(c =>
        toggleable.some(tc => tc.id === c.id) ? { ...c, is_active: newActive } : c
      )
    );
    setTogglingGroup(null);
  };

  const handleDeleteGroup = async (ids: string[]) => {
    await Promise.all(ids.map(id => fetch(`/api/coupons/${id}`, { method: 'DELETE' })));
    setCoupons(prev => prev.filter(c => !ids.includes(c.id)));
    addToast(`${ids.length} Codes ${td.gutscheinToastDeleted}`, 'success');
    setConfirmDelete(null);
  };

  const downloadCsv = (rows: (string | number)[][], filename: string) => {
    const csv = '﻿' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadGroup = (group: CouponGroup) => {
    const label = group.discount_type === 'percentage' ? `${group.discount_value}pct` : `${group.discount_value}eur`;
    downloadCsv(
      [
        ['Code', 'Nutzungen', 'Max. Nutzungen', 'Aktiv'],
        ...group.coupons.map(c => [c.code, c.uses_count, c.uses_limit, c.is_active && c.uses_count < c.uses_limit ? 'Ja' : 'Nein']),
      ],
      `gutscheine_${label}_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString(locale) : null;
  const fmtDateLong = (d: string) =>
    new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
  const fmtTime = (d: string) => {
    const time = new Date(d).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return td.gutscheinClock ? `${time} ${td.gutscheinClock}` : time;
  };
  const fmtDiscount = (g: CouponGroup) =>
    g.discount_type === 'percentage'
      ? `${g.discount_value}% ${td.gutscheinDiscountSuffix}`
      : `${Number(g.discount_value).toFixed(2)}€ ${td.gutscheinDiscountSuffix}`;

  const getStatus = (g: CouponGroup) => {
    if (g.exhausted === g.totalCodes) return { label: td.gutscheinExhausted, color: 'bg-red-50 text-red-500' };
    if (g.available === g.totalCodes) return { label: td.gutscheinActive, color: 'bg-green-50 text-green-600' };
    if (g.available > 0) return { label: `${g.available} ${td.gutscheinAvailBadge}`, color: 'bg-yellow-50 text-yellow-700' };
    return { label: td.gutscheinInactive, color: 'bg-gray-100 text-gray-400' };
  };

  return (
    <div className="pt-8 px-4 md:px-12 max-w-7xl mx-auto lg:pl-32 min-h-screen pb-32">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-baseline mb-12 gap-6">
        <div>
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
            {td.gutschein}<span className="text-yellow-500">.</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {coupons.length > 0 && (
            <button
              onClick={() => setShowHistory(h => !h)}
              className="flex items-center gap-2 border border-gray-200 text-[11px] font-black uppercase tracking-widest px-5 py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6"/>
              </svg>
              {showHistory ? td.gutscheinHideHistory : td.gutscheinShowHistory}
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-black text-white text-[11px] font-black uppercase tracking-widest px-5 py-3 rounded-xl hover:bg-gray-900 transition-colors"
          >
            <Icons.Plus />
            {td.gutscheinGenerateBtn}
          </button>
        </div>
      </div>

      {/* Group cards */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-gray-200 font-black text-4xl uppercase tracking-tighter">{td.gutscheinNoData}</p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-black text-white text-[11px] font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-yellow-500 hover:text-black transition-all"
          >
            <Icons.Plus />
            {td.gutscheinGenerateBtn}
          </button>
        </div>
      ) : showHistory ? (
        <div className="space-y-4">
          {groups.map(group => {
            const status = getStatus(group);
            const usagePct = group.totalCapacity > 0 ? (group.totalUses / group.totalCapacity) * 100 : 0;
            const validFrom = fmtDate(group.start_date);
            const validTo = fmtDate(group.end_date);
            const isToggling = togglingGroup === group.key;
            const isExpanded = expandedGroup === group.key;
            const hasToggleable = group.available + group.deactivated > 0;
            const allToggleableActive = group.deactivated === 0 && group.exhausted < group.totalCodes;

            return (
              <div key={group.key} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">

                {/* Main row */}
                <div className="p-6 md:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">

                    {/* Discount badge + title */}
                    <div className="flex items-center gap-5 min-w-0">
                      <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center font-black text-base leading-tight text-center ${group.discount_type === 'percentage' ? 'bg-yellow-400 text-black' : 'bg-black text-white'}`}>
                        {group.discount_type === 'percentage'
                          ? `${group.discount_value}%`
                          : `${Number(group.discount_value).toFixed(0)}€`}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-lg leading-tight">{fmtDiscount(group)}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                          {group.min_order_total ? (
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              {td.gutscheinMinFrom} {Number(group.min_order_total).toFixed(2)}€
                            </span>
                          ) : null}
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {validFrom || validTo
                              ? `${validFrom ?? '—'} → ${validTo ?? '∞'}`
                              : td.gutscheinUnlimited}
                          </span>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {group.uses_limit} {td.gutscheinPerCode}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${status.color}`}>
                        {status.label}
                      </span>
                      {hasToggleable && (
                        <button
                          onClick={() => handleToggleGroup(group)}
                          disabled={isToggling}
                          className="px-4 py-2 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors disabled:opacity-40"
                        >
                          {isToggling ? '...' : allToggleableActive ? td.gutscheinDeactivate : td.gutscheinActivate}
                        </button>
                      )}
                      <button
                        onClick={() => handleDownloadGroup(group)}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        {td.gutscheinDownloadCsv}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(group.coupons.map(c => c.id))}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-5 pt-5 border-t border-gray-50 flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${usagePct >= 90 ? 'bg-red-400' : usagePct >= 60 ? 'bg-yellow-400' : 'bg-green-400'}`}
                        style={{ width: `${Math.min(100, usagePct)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest shrink-0">
                      {group.totalUses} / {group.totalCapacity} ({usagePct.toFixed(0)}%)
                    </span>
                  </div>

                  {/* Show history toggle */}
                  <button
                    onClick={() => setExpandedGroup(isExpanded ? null : group.key)}
                    className="mt-4 w-full flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                    {isExpanded ? td.gutscheinHideDetails : td.gutscheinShowDetails}
                  </button>
                </div>

                {/* Expanded history */}
                {isExpanded && (
                  <div className="border-t border-gray-50 bg-gray-50/50 px-6 md:px-8 py-4 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">

                      <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{td.gutscheinGeneratedOn}</p>
                        <p className="font-black text-xs">{fmtDateLong(group.created_at)}</p>
                        <p className="text-[9px] text-gray-400">{fmtTime(group.created_at)}</p>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{td.gutscheinValidFrom}</p>
                        <p className="font-black text-xs">
                          {group.start_date ? fmtDateLong(group.start_date) : td.gutscheinImmediately}
                        </p>
                        {group.start_date && <p className="text-[9px] text-gray-400">{fmtTime(group.start_date)}</p>}
                      </div>

                      <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{td.gutscheinValidUntil}</p>
                        <p className="font-black text-xs">
                          {group.end_date ? fmtDateLong(group.end_date) : td.gutscheinNoExpiry}
                        </p>
                        {group.end_date && <p className="text-[9px] text-gray-400">{fmtTime(group.end_date)}</p>}
                      </div>

                      <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{td.gutscheinMinOrderDetails}</p>
                        <p className="font-black text-xs">
                          {group.min_order_total ? `${Number(group.min_order_total).toFixed(2)}€` : td.gutscheinNoMinOrder}
                        </p>
                      </div>
                    </div>

                    {/* Code breakdown bar */}
                    <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-2">{td.gutscheinDistribution}</p>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, group.totalCapacity > 0 ? (group.exhausted / group.totalCodes) * 100 : 0)}%` }}
                        />
                      </div>
                      <p className="text-[9px] font-black text-gray-400 mt-1.5">
                        {group.exhausted} / {group.totalCodes} {td.gutscheinRedeemedBadge}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Generate Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black">{td.gutscheinGenerate}</h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-black transition-colors">
                <Icons.Close />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{td.gutscheinQuantity}</label>
                  <input type="number" min={1} max={500} value={quantity}
                    onChange={e => setQuantity(Number(e.target.value))} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{td.gutscheinUsesLimit}</label>
                  <input type="number" min={1} value={usesLimit}
                    onChange={e => setUsesLimit(Number(e.target.value))} required className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>{td.gutscheinDiscountType}</label>
                <div className="flex gap-3 mt-1">
                  {(['percentage', 'fixed'] as const).map(dt => (
                    <label key={dt} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 cursor-pointer font-black text-[10px] uppercase tracking-widest transition-all ${discountType === dt ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                      <input type="radio" name="dtype" value={dt} checked={discountType === dt} onChange={() => setDiscountType(dt)} className="sr-only" />
                      {dt === 'percentage' ? td.gutscheinPercentage : td.gutscheinFixed}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{td.gutscheinValue} {discountType === 'percentage' ? '(%)' : '(€)'}</label>
                  <input type="number" min={0.01} step={0.01} value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)} required
                    placeholder={discountType === 'percentage' ? '10' : '5.00'} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{td.gutscheinMinOrder}</label>
                  <input type="number" min={0} step={0.01} value={minOrderTotal}
                    onChange={e => setMinOrderTotal(e.target.value)} placeholder="—" className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5 cursor-pointer select-none">
                    <input type="checkbox" checked={useStartDate} onChange={e => setUseStartDate(e.target.checked)} className="accent-black" />
                    {td.gutscheinStartDate}
                  </label>
                  {useStartDate && <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5 cursor-pointer select-none">
                    <input type="checkbox" checked={useEndDate} onChange={e => setUseEndDate(e.target.checked)} className="accent-black" />
                    {td.gutscheinEndDate}
                  </label>
                  {useEndDate && <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                  className="flex-1 border border-gray-200 text-sm font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors">
                  {td.gutscheinCancel}
                </button>
                <button type="submit" disabled={generating}
                  className="flex-1 bg-black text-white text-sm font-bold py-3 rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-40">
                  {generating ? td.gutscheinGenerating : td.gutscheinGenerateBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-black mb-2">{td.gutscheinConfirmDelete}</h2>
            <p className="text-gray-500 text-sm mb-6">
              {confirmDelete.length} Codes {td.gutscheinDeleteWarning}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-gray-200 text-sm font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors">
                {td.gutscheinCancel}
              </button>
              <button onClick={() => handleDeleteGroup(confirmDelete)}
                className="flex-1 bg-red-500 text-white text-sm font-bold py-3 rounded-xl hover:bg-red-600 transition-colors">
                {td.gutscheinDelete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
