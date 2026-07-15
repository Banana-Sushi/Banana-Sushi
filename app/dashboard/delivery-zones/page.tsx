'use client';

import { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Icons } from '@/components/Icons';
import type { DeliveryZone } from '@/types';

interface ZoneForm {
  maxDistanceKm: string;
  fee: string;
}

const emptyForm = (): ZoneForm => ({ maxDistanceKm: '', fee: '' });

export default function DeliveryZonesPage() {
  const { t, addToast, lang } = useAppContext();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ZoneForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/delivery-zones');
      if (res.ok) {
        const data = await res.json();
        setZones(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.maxDistanceKm || !form.fee) return;

    setSaving(true);
    try {
      const payload = {
        maxDistanceKm: Number(form.maxDistanceKm),
        fee: Number(form.fee),
        sortOrder: zones.length,
      };
      const res = editingId
        ? await fetch(`/api/delivery-zones/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/delivery-zones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save zone');
      setForm(emptyForm());
      setEditingId(null);
      await fetchZones();
      addToast(lang === 'de' ? 'Lieferzone gespeichert' : 'Delivery zone saved', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to save zone', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (zone: DeliveryZone) => {
    setEditingId(zone.id);
    setForm({ maxDistanceKm: String(zone.maxDistanceKm), fee: String(zone.fee) });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(lang === 'de' ? 'Diese Zone löschen?' : 'Delete this zone?')) return;
    try {
      const res = await fetch('/api/delivery-zones', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete zone');
      await fetchZones();
      addToast(lang === 'de' ? 'Zone gelöscht' : 'Zone deleted', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to delete zone', 'error');
    }
  };

  return (
    <div className="pt-8 px-4 md:px-12 max-w-7xl mx-auto lg:pl-32 min-h-screen pb-32">
      <div className="flex flex-col md:flex-row justify-between items-baseline mb-10 gap-8">
        <div>
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
            Delivery Zones<span className="text-yellow-500">.</span>
          </h2>
          <p className="mt-3 text-sm text-gray-400 font-bold uppercase tracking-widest">
            {lang === 'de' ? 'Verwalte Lieferbereiche und Gebühren' : 'Manage delivery ranges and fees'}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[360px,1fr]">
        <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-5">
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
              {editingId ? (lang === 'de' ? 'Zone bearbeiten' : 'Edit zone') : (lang === 'de' ? 'Neue Zone' : 'New zone')}
            </p>
            <h3 className="text-2xl font-black mt-2">{editingId ? 'Edit' : 'Add'}</h3>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase text-gray-400 ml-1">{lang === 'de' ? 'Max. Entfernung (km)' : 'Max distance (km)'}</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.maxDistanceKm}
              onChange={e => setForm({ ...form, maxDistanceKm: e.target.value })}
              className="w-full mt-1 p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm"
              required
            />
          </div>

          <div>
            <label className="text-[9px] font-black uppercase text-gray-400 ml-1">{lang === 'de' ? 'Liefergebühr (€)' : 'Delivery fee (€)'}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.fee}
              onChange={e => setForm({ ...form, fee: e.target.value })}
              className="w-full mt-1 p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm"
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-black text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-50"
            >
              {saving ? '...' : editingId ? (lang === 'de' ? 'Speichern' : 'Save') : (lang === 'de' ? 'Hinzufügen' : 'Add')}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => { setEditingId(null); setForm(emptyForm()); }}
                className="px-4 py-4 rounded-2xl bg-gray-100 text-gray-500 font-black uppercase tracking-[0.2em] text-[10px]"
              >
                {lang === 'de' ? 'Abbrechen' : 'Cancel'}
              </button>
            )}
          </div>
        </form>

        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
            </div>
          ) : zones.length === 0 ? (
            <div className="p-10 text-center text-gray-400 font-black uppercase tracking-widest text-sm">
              {lang === 'de' ? 'Noch keine Lieferzonen angelegt.' : 'No delivery zones yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[500px]">
                <thead className="bg-gray-50/70">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-300">{lang === 'de' ? 'Bereich' : 'Range'}</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-300">{lang === 'de' ? 'Max. km' : 'Max km'}</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-300">{lang === 'de' ? 'Gebühr' : 'Fee'}</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-300">{lang === 'de' ? 'Aktion' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-bold">
                  {zones.map((zone, index) => (
                    <tr key={zone.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-5 text-sm">{index + 1}</td>
                      <td className="px-6 py-5 text-sm">{zone.maxDistanceKm.toFixed(1)} km</td>
                      <td className="px-6 py-5 text-sm">{zone.fee.toFixed(2)}€</td>
                      <td className="px-6 py-5">
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(zone)} className="rounded-xl border border-gray-200 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-black hover:text-white transition-all">
                            {lang === 'de' ? 'Bearbeiten' : 'Edit'}
                          </button>
                          <button onClick={() => handleDelete(zone.id)} className="rounded-xl border border-red-200 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500 hover:text-white transition-all">
                            <Icons.Trash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
