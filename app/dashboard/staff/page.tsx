'use client';

import { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Icons } from '@/components/Icons';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  created_at: string;
}

const EMPTY_FORM = { name: '', email: '', password: '', role: 'staff' as 'admin' | 'staff' };

export default function StaffManagementPage() {
  const { t, addToast } = useAppContext();
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchStaff = async () => {
    const res = await fetch('/api/staff');
    if (res.ok) setMembers(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchStaff(); }, []);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (member: StaffMember) => {
    setForm({ name: member.name, email: member.email, password: '', role: member.role });
    setEditingId(member.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) return;
    if (!editingId && !form.password) return;
    setSaving(true);
    const url = editingId ? `/api/staff/${editingId}` : '/api/staff';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      const saved: StaffMember = await res.json();
      if (editingId) {
        setMembers(prev => prev.map(m => m.id === editingId ? saved : m));
      } else {
        setMembers(prev => [...prev, saved]);
      }
      addToast(editingId ? 'Staff member updated' : 'Staff member added', 'success');
      closeModal();
    } else {
      const err = await res.json();
      addToast(err.error ?? 'Error saving', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setMembers(prev => prev.filter(m => m.id !== id));
      addToast('Staff member deleted', 'success');
    } else {
      const err = await res.json();
      addToast(err.error ?? 'Error deleting', 'error');
    }
    setConfirmDeleteId(null);
  };

  return (
    <div className="pt-8 px-4 md:px-12 max-w-7xl mx-auto lg:pl-32 min-h-screen pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-baseline mb-12 gap-6">
        <div>
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
            {t.dashboard.staffMgmt ?? 'Staff'}<span className="text-yellow-500">.</span>
          </h2>
          <p className="text-gray-400 font-black text-[11px] uppercase tracking-widest mt-2">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-black text-white text-[11px] font-black uppercase tracking-widest px-5 py-3 rounded-xl hover:bg-gray-900 transition-colors"
        >
          <Icons.Plus />
          {t.dashboard.addStaff}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <p className="text-center py-12 text-gray-300 font-black uppercase tracking-widest text-sm">No staff members yet</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-300 uppercase">{t.dashboard.staffName}</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-300 uppercase">{t.dashboard.staffEmail}</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-300 uppercase">{t.dashboard.staffRole}</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-300 uppercase">{t.dashboard.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members.map(member => (
                  <tr key={member.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-8 py-5 font-black text-sm">{member.name}</td>
                    <td className="px-8 py-5 text-gray-500 text-sm">{member.email}</td>
                    <td className="px-8 py-5">
                      <span className={`inline-block px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                        member.role === 'admin' ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <button onClick={() => openEdit(member)} className="text-gray-300 hover:text-black transition-colors" title="Edit">
                          <Icons.Edit />
                        </button>
                        <button onClick={() => setConfirmDeleteId(member.id)} className="text-gray-300 hover:text-red-500 transition-colors" title="Delete">
                          <Icons.Trash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {members.map(member => (
              <div key={member.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-black text-base truncate">{member.name}</p>
                    <p className="text-gray-400 text-sm mt-0.5 truncate">{member.email}</p>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      member.role === 'admin' ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {member.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 pt-1">
                    <button onClick={() => openEdit(member)} className="text-gray-300 hover:text-black transition-colors" title="Edit">
                      <Icons.Edit />
                    </button>
                    <button onClick={() => setConfirmDeleteId(member.id)} className="text-gray-300 hover:text-red-500 transition-colors" title="Delete">
                      <Icons.Trash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black">
                {editingId ? t.dashboard.editStaff : t.dashboard.addStaff}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-black transition-colors">
                <Icons.Close />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">
                  {t.dashboard.staffName}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">
                  {t.dashboard.staffEmail}
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">
                  {t.dashboard.staffPassword}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors"
                  placeholder={editingId ? t.dashboard.staffPasswordHint : 'Password'}
                />
                {editingId && (
                  <p className="text-xs text-gray-400 mt-1">{t.dashboard.staffPasswordHint}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">
                  {t.dashboard.staffRole}
                </label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'staff' }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors bg-white"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 border border-gray-200 text-sm font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.email || (!editingId && !form.password)}
                className="flex-1 bg-black text-white text-sm font-bold py-3 rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-black mb-2">{t.dashboard.confirmDelete}</h2>
            <p className="text-gray-500 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 border border-gray-200 text-sm font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 bg-red-500 text-white text-sm font-bold py-3 rounded-xl hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
