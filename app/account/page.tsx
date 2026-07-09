'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { Icons } from '@/components/Icons';

type Tab = 'orders' | 'profile' | 'addresses';

interface Address {
  id: string;
  label: string | null;
  street: string;
  zip_code: string;
  city: string;
  is_main: boolean;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  birthdate: string | null;
  discount_emails_consent: boolean;
  created_at: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: string;
  total: number;
  status: string;
  payment_method: string;
  address: string | null;
  zip_code: string | null;
  city: string | null;
  items: OrderItem[];
  created_at: string;
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className="font-bold text-sm text-gray-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    processing: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

export default function AccountPage() {
  const { t, lang } = useAppContext();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('orders');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: '', street: '', zip: '', city: '', isMain: false });
  const [addingAddress, setAddingAddress] = useState(false);
  const [addrError, setAddrError] = useState<string | null>(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '', gender: '', birthdate: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    fetch('/api/customer/me')
      .then(async res => {
        if (!res.ok) { router.replace('/account/login'); return; }
        const data = await res.json();
        setCustomer(data.customer);
        setAddresses(data.addresses ?? []);
        setProfileForm({
          firstName: data.customer.first_name,
          lastName: data.customer.last_name,
          phone: data.customer.phone ?? '',
          gender: data.customer.gender ?? '',
          birthdate: data.customer.birthdate ?? '',
        });
      })
      .finally(() => setLoading(false));

    fetch('/api/customer/orders')
      .then(res => res.json())
      .then(data => setOrders(Array.isArray(data) ? data : []));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/customer/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  const handleSetMain = async (id: string) => {
    const res = await fetch(`/api/customer/addresses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isMain: true }),
    });
    if (res.ok) setAddresses(prev => prev.map(a => ({ ...a, is_main: a.id === id })));
  };

  const handleDeleteAddress = async (id: string) => {
    const res = await fetch(`/api/customer/addresses/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setAddresses(prev => prev.filter(a => a.id !== id));
    } else {
      const data = await res.json();
      setAddrError(data.error ?? 'Could not delete address');
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingAddress(true);
    setAddrError(null);
    const res = await fetch('/api/customer/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAddr),
    });
    if (res.ok) {
      const data = await res.json();
      if (newAddr.isMain) {
        setAddresses(prev => [data, ...prev.map(a => ({ ...a, is_main: false }))]);
      } else {
        setAddresses(prev => [...prev, data]);
      }
      setNewAddr({ label: '', street: '', zip: '', city: '', isMain: false });
      setShowAddAddress(false);
    }
    setAddingAddress(false);
  };

  const handleToggleDiscountEmails = async (value: boolean) => {
    setCustomer(prev => prev ? { ...prev, discount_emails_consent: value } : prev);
    await fetch('/api/customer/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discountEmailsConsent: value }),
    });
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    const res = await fetch('/api/customer/me', { method: 'DELETE' });
    if (res.ok) {
      router.push('/');
      router.refresh();
    }
    setDeletingAccount(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    const res = await fetch('/api/customer/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileForm),
    });
    if (res.ok) {
      const data = await res.json();
      setCustomer(prev => prev ? { ...prev, ...data } : prev);
      setEditingProfile(false);
    } else {
      const data = await res.json();
      setProfileError(data.error ?? 'Could not save profile');
    }
    setSavingProfile(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) return null;

  const initials = `${customer.first_name[0]}${customer.last_name[0]}`.toUpperCase();
  const memberSince = new Date(customer.created_at).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { month: 'long', year: 'numeric' });

  const tabLabels: Record<Tab, string> = {
    orders: t.account.tabOrders,
    profile: t.account.tabProfile,
    addresses: t.account.tabAddresses,
  };

  const inputClass = "w-full p-4 rounded-2xl border border-gray-200 outline-none font-bold shadow-sm placeholder:text-gray-300 text-sm focus:border-black transition-colors";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero banner */}
      <div className="bg-black text-white">
        <div className="max-w-3xl mx-auto px-4 pt-[120px] md:pt-[150px] pb-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-5">
              {/* Initials avatar */}
              <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center shrink-0">
                <span className="text-black font-black text-xl tracking-tight">{initials}</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white leading-none">
                  {customer.first_name} {customer.last_name}
                </h1>
                <p className="text-gray-400 text-xs font-bold mt-1">{customer.email}</p>
                <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mt-1">
                  {t.account.memberSince} {memberSince}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors shrink-0 mt-1"
            >
              <Icons.LogOut />
              <span className="hidden sm:inline">{t.account.logout}</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10">
            <div>
              <p className="text-3xl font-black text-yellow-400">{orders.length}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-0.5">{t.account.totalOrders}</p>
            </div>
            <div>
              <p className="text-3xl font-black text-white">{addresses.length}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-0.5">{t.account.tabAddresses}</p>
            </div>
            <div>
              <p className="text-3xl font-black text-white">
                {orders.reduce((s, o) => s + Number(o.total), 0).toFixed(0)}€
              </p>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-0.5">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-3xl mx-auto px-4 pb-20">
        {/* Tabs */}
        <div className="flex gap-1 bg-white p-1 rounded-2xl mt-6 mb-6 border border-gray-100 shadow-sm">
          {(['orders', 'profile', 'addresses'] as Tab[]).map(tabName => (
            <button
              key={tabName}
              onClick={() => setTab(tabName)}
              className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                tab === tabName ? 'bg-black text-white shadow-sm' : 'text-gray-400 hover:text-black'
              }`}
            >
              {tabLabels[tabName]}
            </button>
          ))}
        </div>

        {/* ── ORDERS TAB ── */}
        {tab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-white rounded-[2rem] border border-gray-100 p-16 text-center shadow-sm">
                <p className="text-5xl mb-4">🍣</p>
                <p className="font-black uppercase tracking-tight text-gray-300 text-lg">{t.account.noOrders}</p>
                <Link href="/menu" className="mt-6 inline-block text-[11px] font-black uppercase tracking-widest border-b-2 border-black pb-1 hover:text-yellow-500 hover:border-yellow-500 transition-colors">
                  {lang === 'de' ? 'Jetzt bestellen' : 'Order now'}
                </Link>
              </div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
                  {/* Order header */}
                  <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-yellow-400 rounded-xl flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-black text-sm uppercase tracking-tight">#{order.order_number}</p>
                        <p className="text-gray-400 text-[10px] font-bold">
                          {new Date(order.created_at).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                          {' · '}
                          {new Date(order.created_at).toLocaleTimeString(lang === 'de' ? 'de-DE' : 'en-US', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <StatusBadge status={order.status} />
                      <p className="font-black text-xl">{Number(order.total).toFixed(2)}€</p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="px-6 py-4 space-y-2">
                    {(order.items as OrderItem[]).map((item, i) => (
                      <div key={i} className="flex justify-between text-xs font-bold text-gray-600">
                        <span className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">
                            {item.quantity}
                          </span>
                          {item.name}
                        </span>
                        <span className="text-gray-400">{(item.price * item.quantity).toFixed(2)}€</span>
                      </div>
                    ))}
                  </div>

                  {/* Footer row */}
                  {order.address && (
                    <div className="px-6 pb-5 flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <Icons.MapPin />
                      <span>{order.address}, {order.zip_code} {order.city}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {tab === 'profile' && (
          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
            {!editingProfile ? (
              <div>
                <div className="flex justify-between items-center px-8 pt-8 pb-6 border-b border-gray-50">
                  <h2 className="font-black text-base uppercase tracking-tight">{t.account.tabProfile}</h2>
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
                  >
                    <Icons.Edit />
                    {t.account.editProfile}
                  </button>
                </div>
                <div className="px-8 py-6 grid grid-cols-2 gap-6">
                  <ProfileField label={t.account.firstName} value={customer.first_name} />
                  <ProfileField label={t.account.lastName} value={customer.last_name} />
                  <ProfileField label={t.account.email} value={customer.email} />
                  {customer.phone && <ProfileField label={t.account.phone} value={customer.phone} />}
                  {customer.gender && (
                    <ProfileField label={t.account.gender} value={customer.gender} />
                  )}
                  {customer.birthdate && (
                    <ProfileField
                      label={t.account.birthdate}
                      value={new Date(customer.birthdate).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US')}
                    />
                  )}
                </div>

                {/* Discount emails toggle */}
                <div className="px-8 pb-6 border-t border-gray-50 pt-5">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="font-black text-sm">{t.account.discountEmailsPref}</p>
                      <p className="text-xs text-gray-400 font-bold mt-0.5">{t.account.discountEmails}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDiscountEmails(!customer.discount_emails_consent)}
                      className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${customer.discount_emails_consent ? 'bg-yellow-400' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${customer.discount_emails_consent ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                  </label>
                </div>

                {/* Delete account */}
                <div className="px-8 pb-8 border-t border-gray-50 pt-5">
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors"
                    >
                      {t.account.deleteAccount}
                    </button>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                      <p className="font-black text-sm text-red-700 mb-1">{t.account.deleteAccountConfirm}</p>
                      <p className="text-xs text-red-500 font-bold mb-4">{t.account.deleteAccountWarning}</p>
                      <div className="flex gap-3">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deletingAccount}
                          className="flex-1 bg-red-500 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          {deletingAccount ? '...' : t.account.deleteAccount}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-5 py-3 rounded-xl border-2 border-red-200 font-black text-[10px] uppercase tracking-widest text-red-400 hover:border-red-400 transition-colors"
                        >
                          {t.account.cancel}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="p-8 space-y-4">
                <h2 className="font-black text-base uppercase tracking-tight mb-6">{t.account.editProfile}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <input required placeholder={t.account.firstName} value={profileForm.firstName} onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })} className={inputClass} />
                  <input required placeholder={t.account.lastName} value={profileForm.lastName} onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })} className={inputClass} />
                </div>
                <input type="tel" placeholder={t.account.phone} value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} className={inputClass} />
                <div className="grid grid-cols-2 gap-4">
                  <select value={profileForm.gender} onChange={e => setProfileForm({ ...profileForm, gender: e.target.value })} className={`${inputClass} text-gray-700 bg-white appearance-none`}>
                    <option value="">{t.account.gender}</option>
                    <option value="male">{lang === 'de' ? 'Männlich' : 'Male'}</option>
                    <option value="female">{lang === 'de' ? 'Weiblich' : 'Female'}</option>
                    <option value="other">{lang === 'de' ? 'Divers' : 'Other'}</option>
                  </select>
                  <input type="date" value={profileForm.birthdate} onChange={e => setProfileForm({ ...profileForm, birthdate: e.target.value })} className={`${inputClass} text-gray-700`} />
                </div>
                {profileError && (
                  <p className="text-red-500 text-xs font-black uppercase tracking-widest">{profileError}</p>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={savingProfile} className="flex-1 bg-black text-white py-4 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-50">
                    {savingProfile ? '...' : t.account.saveProfile}
                  </button>
                  <button type="button" onClick={() => { setEditingProfile(false); setProfileError(null); }} className="px-6 py-4 rounded-[2rem] border-2 border-gray-200 font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-black hover:border-black transition-all">
                    {t.account.cancel}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── ADDRESSES TAB ── */}
        {tab === 'addresses' && (
          <div className="space-y-3">
            {addrError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <p className="text-red-600 text-xs font-black uppercase tracking-widest">{addrError}</p>
              </div>
            )}

            {addresses.map(addr => (
              <div
                key={addr.id}
                className={`bg-white rounded-[2rem] border-2 p-5 shadow-sm transition-all ${addr.is_main ? 'border-yellow-400' : 'border-gray-100'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 items-start min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${addr.is_main ? 'bg-yellow-400' : 'bg-gray-100'}`}>
                      <Icons.MapPin />
                    </div>
                    <div className="min-w-0">
                      {addr.label && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{addr.label}</p>
                      )}
                      <p className="font-black text-sm">{addr.street}</p>
                      <p className="text-sm font-bold text-gray-500">{addr.zip_code} {addr.city}</p>
                      {addr.is_main && (
                        <span className="inline-block mt-1.5 text-[9px] font-black uppercase tracking-widest bg-yellow-400 text-black px-2 py-0.5 rounded-full">
                          {t.account.mainAddress}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!addr.is_main && (
                      <button onClick={() => handleSetMain(addr.id)} className="text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-gray-100 hover:bg-yellow-400 transition-colors">
                        {t.account.setMain}
                      </button>
                    )}
                    <button onClick={() => handleDeleteAddress(addr.id)} className="text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-gray-100 text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                      {t.account.deleteAddress}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {!showAddAddress ? (
              <button
                onClick={() => setShowAddAddress(true)}
                className="w-full py-5 rounded-[2rem] border-2 border-dashed border-gray-200 font-black text-[10px] uppercase tracking-widest text-gray-400 hover:border-black hover:text-black transition-all"
              >
                + {t.account.addAddress}
              </button>
            ) : (
              <form onSubmit={handleAddAddress} className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-3">
                <h3 className="font-black text-sm uppercase tracking-tight">{t.account.addAddressTitle}</h3>
                <input placeholder={t.account.label} value={newAddr.label} onChange={e => setNewAddr({ ...newAddr, label: e.target.value })} className={inputClass} />
                <input required placeholder={t.account.street} value={newAddr.street} onChange={e => setNewAddr({ ...newAddr, street: e.target.value })} className={inputClass} />
                <div className="flex gap-3">
                  <input required placeholder={t.account.zip} value={newAddr.zip} onChange={e => setNewAddr({ ...newAddr, zip: e.target.value })} className="w-1/3 p-4 rounded-2xl border border-gray-200 outline-none font-bold shadow-sm placeholder:text-gray-300 text-sm focus:border-black transition-colors" />
                  <input required placeholder={t.account.city} value={newAddr.city} onChange={e => setNewAddr({ ...newAddr, city: e.target.value })} className="w-2/3 p-4 rounded-2xl border border-gray-200 outline-none font-bold shadow-sm placeholder:text-gray-300 text-sm focus:border-black transition-colors" />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={newAddr.isMain} onChange={e => setNewAddr({ ...newAddr, isMain: e.target.checked })} className="accent-black w-4 h-4" />
                  <span className="text-xs font-bold text-gray-600">{t.account.mainAddress}</span>
                </label>
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={addingAddress} className="flex-1 bg-black text-white py-4 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-50">
                    {addingAddress ? '...' : t.account.addAddress}
                  </button>
                  <button type="button" onClick={() => setShowAddAddress(false)} className="px-6 py-4 rounded-[2rem] border-2 border-gray-200 font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-black hover:border-black transition-all">
                    {t.account.cancel}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
