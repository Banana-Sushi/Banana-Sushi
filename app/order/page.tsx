'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAppContext } from '@/context/AppContext';
import { Icons } from '@/components/Icons';
import { haversineKm, geocodeAddress, RESTAURANT_LAT, RESTAURANT_LNG, MAX_DELIVERY_KM } from '@/lib/distance';

interface CustomerAddress {
  id: string;
  label: string | null;
  street: string;
  zip_code: string;
  city: string;
  is_main: boolean;
}

interface CustomerSession {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
}

export default function OrderPage() {
  const { cart, removeFromCart, clearCart, t, lang, addToast, discounts } = useAppContext();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingAddress, setCheckingAddress] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentChoice, setPaymentChoice] = useState<'online' | 'cash'>('online');
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', zip: '', city: '', note: '', scheduledTime: '' });
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    discountType: string;
    discountValue: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Customer session state
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new');
  const [guestMode, setGuestMode] = useState(false);
  const [customerLoaded, setCustomerLoaded] = useState(false);

  const isPickup = deliveryMode === 'pickup';
  const effectiveDeliveryFee = isPickup ? 0 : (deliveryFee ?? 0);

  useEffect(() => {
    fetch('/api/content')
      .then(r => r.json())
      .then(data => {
        const fee = parseFloat(data.delivery_fee);
        if (!isNaN(fee)) setDeliveryFee(fee);
      })
      .catch(() => setDeliveryFee(2.90));
  }, []);

  // Load customer session
  useEffect(() => {
    fetch('/api/customer/me')
      .then(async res => {
        if (!res.ok) { setCustomerLoaded(true); return; }
        const data = await res.json();
        setCustomer(data.customer);
        setCustomerAddresses(data.addresses ?? []);
        // Pre-fill form fields
        setForm(prev => ({
          ...prev,
          name: `${data.customer.first_name} ${data.customer.last_name}`,
          email: data.customer.email,
          phone: data.customer.phone ?? prev.phone,
        }));
        // Pre-select main address
        const mainAddr = (data.addresses ?? []).find((a: CustomerAddress) => a.is_main);
        if (mainAddr) {
          setSelectedAddressId(mainAddr.id);
          setForm(prev => ({
            ...prev,
            address: mainAddr.street,
            zip: mainAddr.zip_code,
            city: mainAddr.city,
          }));
        }
        setCustomerLoaded(true);
      })
      .catch(() => setCustomerLoaded(true));
  }, []);

  // When address selection changes, fill address fields
  const handleAddressSelect = (id: string | 'new') => {
    setSelectedAddressId(id);
    if (id === 'new') {
      setForm(prev => ({ ...prev, address: '', zip: '', city: '' }));
    } else {
      const addr = customerAddresses.find(a => a.id === id);
      if (addr) {
        setForm(prev => ({ ...prev, address: addr.street, zip: addr.zip_code, city: addr.city }));
      }
    }
  };

  const subtotal = cart.reduce((acc, c) => acc + c.effectivePrice * c.quantity, 0);

  const now = new Date();
  const bestCommand = discounts
    .filter(d =>
      d.section === 'command' &&
      d.isActive &&
      (!d.startDate || new Date(d.startDate) <= now) &&
      (!d.endDate || new Date(d.endDate) >= now) &&
      (d.minOrderTotal ?? 0) <= subtotal,
    )
    .sort((a, b) => (b.minOrderTotal ?? 0) - (a.minOrderTotal ?? 0))[0] ?? null;

  let commandDiscountAmount = 0;
  if (bestCommand) {
    if (bestCommand.discountType === 'percentage') {
      commandDiscountAmount = Math.round(subtotal * (bestCommand.discountValue ?? 0) / 100 * 100) / 100;
    } else if (bestCommand.discountType === 'fixed') {
      commandDiscountAmount = Math.min(subtotal, bestCommand.discountValue ?? 0);
    }
  }

  const discountedSubtotal = subtotal - commandDiscountAmount;
  const couponDiscountAmount = appliedCoupon?.discountAmount ?? 0;
  const total = Math.max(0, discountedSubtotal - couponDiscountAmount + effectiveDeliveryFee);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    if (!form.email) {
      setCouponError(lang === 'de' ? 'Bitte zuerst E-Mail eingeben.' : 'Please enter your email first.');
      return;
    }
    setCouponLoading(true);
    setCouponError(null);
    setAppliedCoupon(null);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), email: form.email, subtotal: discountedSubtotal }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon({ code: couponCode.trim().toUpperCase(), discountAmount: data.discountAmount, discountType: data.discountType, discountValue: data.discountValue });
      } else {
        setCouponError(data.reason ?? (lang === 'de' ? 'Ungültiger Gutscheincode' : 'Invalid coupon code'));
      }
    } catch {
      setCouponError(lang === 'de' ? 'Fehler beim Prüfen des Codes.' : 'Error validating coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setLoading(true);

    if (!isPickup) {
      setCheckingAddress(true);
      try {
        const coords = await geocodeAddress(form.address, form.zip, form.city);
        if (!coords) {
          addToast('Adresse konnte nicht gefunden werden. Bitte überprüfe deine Eingabe.', 'error');
          setCheckingAddress(false);
          setLoading(false);
          return;
        }
        const dist = haversineKm(RESTAURANT_LAT, RESTAURANT_LNG, coords.lat, coords.lng);
        if (dist > MAX_DELIVERY_KM) {
          addToast(
            lang === 'de'
              ? 'Deine Adresse liegt außerhalb unseres Liefergebiets (max. 7 km).'
              : 'Your address is outside our delivery area (max. 7 km).',
            'error',
          );
          setCheckingAddress(false);
          setLoading(false);
          return;
        }
      } catch {
        addToast('Adresse konnte nicht gefunden werden. Bitte überprüfe deine Eingabe.', 'error');
        setCheckingAddress(false);
        setLoading(false);
        return;
      }
      setCheckingAddress(false);
    }

    let paymentMethod: string;
    if (isPickup) {
      paymentMethod = paymentChoice === 'online' ? 'pickup_online' : 'pickup_cash';
    } else {
      paymentMethod = paymentChoice;
    }

    const orderData = {
      customerName: form.name,
      email: form.email,
      phone: form.phone,
      address: isPickup ? null : form.address,
      zipCode: isPickup ? null : form.zip,
      city: isPickup ? null : form.city,
      deliveryNote: form.note || null,
      scheduledTime: form.scheduledTime || null,
      paymentMethod,
      items: cart.map(c => ({
        menuItemId: c.item.id,
        name: c.item.name[lang],
        quantity: c.quantity,
        price: c.effectivePrice,
        selectedOptionalAddons: c.selectedOptionalAddons,
        selectedMandatoryAddons: c.selectedMandatoryAddons,
      })),
      subtotal: discountedSubtotal,
      deliveryFee: effectiveDeliveryFee,
      total,
      couponCode: appliedCoupon?.code ?? null,
      customerId: customer?.id ?? null,
    };

    try {
      if (paymentChoice === 'online') {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Checkout failed');
        clearCart();
        window.location.href = data.url;
      } else {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Order failed');
        clearCart();
        router.push('/order/success');
      }
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Something went wrong', 'error');
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="pt-[100px] md:pt-[130px] px-4 animate-fade-in text-center py-24">
        <p className="text-gray-200 font-black text-4xl md:text-6xl uppercase tracking-tighter mb-8">{t.checkout.empty}</p>
        <Link href="/menu" className="text-black font-black uppercase tracking-[0.2em] text-[11px] border-b-2 border-black pb-1 hover:text-yellow-500 hover:border-yellow-500 transition-all">
          {t.checkout.browseMenu}
        </Link>
      </div>
    );
  }

  const isLoggedIn = !!customer;
  const showGuestBanner = customerLoaded && !isLoggedIn && !guestMode;

  return (
    <div className="pt-[100px] md:pt-[130px] px-4 md:px-6 pb-32 max-w-screen-2xl mx-auto animate-fade-in">
      <h2 className="text-4xl md:text-5xl font-black uppercase mb-8 tracking-tighter">{t.checkout.title}</h2>

      {/* Guest / Login banner */}
      {showGuestBanner && (
        <div className="mb-8 bg-gray-50 rounded-[2rem] p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border border-gray-100">
          <div>
            <p className="font-black text-sm uppercase tracking-tight">
              {lang === 'de' ? 'Hast du ein Konto?' : 'Have an account?'}
            </p>
            <p className="text-gray-400 text-xs font-bold mt-0.5">
              {lang === 'de' ? 'Melde dich an, um deine Adressen & Bestellverlauf zu nutzen.' : 'Sign in to use your saved addresses & order history.'}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link
              href="/account/login?redirect=/order"
              className="bg-black text-white px-5 py-3 rounded-full font-black uppercase tracking-[0.15em] text-[10px] hover:bg-yellow-500 hover:text-black transition-all"
            >
              {t.account.loginOrRegister}
            </Link>
            <button
              onClick={() => setGuestMode(true)}
              className="px-5 py-3 rounded-full border-2 border-gray-200 font-black uppercase tracking-[0.15em] text-[10px] text-gray-500 hover:border-black hover:text-black transition-all"
            >
              {t.account.continueAsGuest}
            </button>
          </div>
        </div>
      )}

      {/* Logged in badge */}
      {isLoggedIn && (
        <div className="mb-8 flex items-center gap-3 text-xs font-bold text-gray-500">
          <Icons.User />
          <span>{t.account.loggedInAs} <span className="text-black font-black">{customer.first_name} {customer.last_name}</span></span>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-10">
        {/* Cart summary */}
        <div className="flex-1 min-w-0 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 md:p-10 space-y-0 divide-y divide-gray-50">
            {cart.map(c => {
              const allAddons = [
                ...(c.selectedMandatoryAddons ?? []),
                ...(c.selectedOptionalAddons ?? []),
              ];
              const basePrice = c.effectivePrice - allAddons.reduce((s, a) => s + a.price, 0);
              const lineTotal = c.effectivePrice * c.quantity;
              const isFree = c.effectivePrice === 0;
              return (
                <div key={c.cartKey} className="py-6">
                  <div className="flex gap-4">
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                      <Image src={c.item.image} alt={c.item.name[lang]} fill className="object-cover" sizes="80px" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black uppercase text-sm leading-tight">{c.item.name[lang]}</h4>
                          {isFree && (
                            <span className="text-[8px] font-black uppercase bg-yellow-400 text-black px-2 py-0.5 rounded-full shrink-0">
                              {lang === 'de' ? 'Gratis' : 'Free'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-black text-base">{isFree ? '0.00€' : `${lineTotal.toFixed(2)}€`}</span>
                          <button onClick={() => removeFromCart(c.cartKey)} className="text-red-300 hover:text-red-500 transition-colors">
                            <Icons.Trash />
                          </button>
                        </div>
                      </div>
                      {!isFree && (
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                            <span>{c.quantity}× base</span>
                            <span>{(basePrice * c.quantity).toFixed(2)}€</span>
                          </div>
                          {allAddons.map((a, i) => (
                            <div key={i} className="flex justify-between text-[10px] font-bold text-gray-300 uppercase">
                              <span className="flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-gray-200 shrink-0" />
                                {a.name}
                              </span>
                              <span>{a.price > 0 ? `+${(a.price * c.quantity).toFixed(2)}€` : (lang === 'de' ? 'Gratis' : 'Free')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-gray-100 px-8 md:px-10 py-6 space-y-3 bg-gray-50/50">
            <div className="flex justify-between text-[10px] font-black uppercase text-gray-400">
              <span>{t.checkout.subtotal}</span>
              <span className="text-black">{subtotal.toFixed(2)}€</span>
            </div>
            {commandDiscountAmount > 0 && bestCommand && (
              <div className="flex justify-between text-[10px] font-black uppercase text-green-600">
                <span>
                  {lang === 'de' ? 'Rabatt' : 'Discount'}
                  {bestCommand.discountType === 'percentage' ? ` (${bestCommand.discountValue}%)` : ''}
                </span>
                <span>-{commandDiscountAmount.toFixed(2)}€</span>
              </div>
            )}
            {couponDiscountAmount > 0 && appliedCoupon && (
              <div className="flex justify-between text-[10px] font-black uppercase text-green-600">
                <span>{lang === 'de' ? 'Gutschein' : 'Coupon'} ({appliedCoupon.code})</span>
                <span>-{couponDiscountAmount.toFixed(2)}€</span>
              </div>
            )}
            <div className="flex justify-between text-[10px] font-black uppercase text-gray-400">
              <span>{t.checkout.delivery}</span>
              <span className="text-black">
                {isPickup ? (lang === 'de' ? 'Kostenlos' : 'Free') : (deliveryFee !== null ? `${deliveryFee.toFixed(2)}€` : '...')}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-3 border-t border-gray-200 text-black">
              <span className="font-black uppercase tracking-widest text-[10px]">{t.checkout.total}</span>
              <span className="text-3xl font-black">{(isPickup || deliveryFee !== null) ? `${total.toFixed(2)}€` : '...'}</span>
            </div>
            <p className="text-[9px] text-gray-300 font-bold uppercase pt-1">{t.checkout.taxInfo}</p>
          </div>
        </div>

        {/* Order form */}
        <form onSubmit={handleSubmit} className="w-full xl:w-[400px] shrink-0 space-y-5 bg-gray-50 p-8 md:p-10 rounded-[2.5rem]">

          {/* Delivery mode choice */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{t.checkout.payment}</p>

            <label className={`flex items-center gap-4 bg-white p-4 rounded-xl cursor-pointer font-black text-[11px] uppercase border-2 transition-all ${deliveryMode === 'delivery' && paymentChoice === 'online' ? 'border-yellow-500' : 'border-transparent'}`}>
              <input type="radio" name="mode" value="delivery_online" checked={deliveryMode === 'delivery' && paymentChoice === 'online'} onChange={() => { setDeliveryMode('delivery'); setPaymentChoice('online'); }} className="accent-black" />
              {t.checkout.online}
            </label>

            <label className={`flex items-center gap-4 bg-white p-4 rounded-xl cursor-pointer font-black text-[11px] uppercase border-2 transition-all ${deliveryMode === 'delivery' && paymentChoice === 'cash' ? 'border-yellow-500' : 'border-transparent'}`}>
              <input type="radio" name="mode" value="delivery_cash" checked={deliveryMode === 'delivery' && paymentChoice === 'cash'} onChange={() => { setDeliveryMode('delivery'); setPaymentChoice('cash'); }} className="accent-black" />
              {t.checkout.cash}
            </label>

            <label className={`flex items-center gap-4 bg-white p-4 rounded-xl cursor-pointer font-black text-[11px] uppercase border-2 transition-all ${isPickup ? 'border-yellow-500' : 'border-transparent'}`}>
              <input type="radio" name="mode" value="pickup" checked={isPickup} onChange={() => { setDeliveryMode('pickup'); setPaymentChoice('online'); }} className="accent-black" />
              {t.checkout.pickup}
            </label>

            {isPickup && (
              <div className="ml-4 space-y-2 animate-fade-in">
                <p className="text-[9px] font-black uppercase text-gray-300 tracking-widest px-1">{t.checkout.pickupInfo}</p>
                <label className={`flex items-center gap-4 bg-gray-100 p-3 rounded-xl cursor-pointer font-black text-[10px] uppercase border-2 transition-all ${paymentChoice === 'online' ? 'border-yellow-500' : 'border-transparent'}`}>
                  <input type="radio" name="pickup_payment" value="online" checked={paymentChoice === 'online'} onChange={() => setPaymentChoice('online')} className="accent-black" />
                  {t.checkout.pickupPayOnline}
                </label>
                <label className={`flex items-center gap-4 bg-gray-100 p-3 rounded-xl cursor-pointer font-black text-[10px] uppercase border-2 transition-all ${paymentChoice === 'cash' ? 'border-yellow-500' : 'border-transparent'}`}>
                  <input type="radio" name="pickup_payment" value="cash" checked={paymentChoice === 'cash'} onChange={() => setPaymentChoice('cash')} className="accent-black" />
                  {t.checkout.pickupPayAtRestaurant}
                </label>
              </div>
            )}
          </div>

          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest pt-2">
            {isPickup ? t.checkout.contactInfo : t.checkout.customerInfo}
          </p>
          <input
            required
            placeholder={t.checkout.name}
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full p-5 rounded-2xl border-none outline-none font-bold shadow-inner placeholder:text-gray-300 text-sm"
          />
          <input
            required
            type="email"
            placeholder={t.checkout.email}
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full p-5 rounded-2xl border-none outline-none font-bold shadow-inner placeholder:text-gray-300 text-sm"
          />
          <input
            required
            placeholder={t.checkout.phone}
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            className="w-full p-5 rounded-2xl border-none outline-none font-bold shadow-inner placeholder:text-gray-300 text-sm"
          />

          {/* Address selection for logged-in customers (delivery only) */}
          {!isPickup && isLoggedIn && customerAddresses.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{t.account.savedAddresses}</p>
              {customerAddresses.map(addr => (
                <label
                  key={addr.id}
                  className={`flex items-center gap-3 bg-white p-4 rounded-xl cursor-pointer font-bold text-[11px] border-2 transition-all ${selectedAddressId === addr.id ? 'border-yellow-500' : 'border-transparent'}`}
                >
                  <input
                    type="radio"
                    name="savedAddress"
                    value={addr.id}
                    checked={selectedAddressId === addr.id}
                    onChange={() => handleAddressSelect(addr.id)}
                    className="accent-black shrink-0"
                  />
                  <span className="min-w-0">
                    {addr.label && <span className="text-gray-400 mr-1">{addr.label} · </span>}
                    {addr.street}, {addr.zip_code} {addr.city}
                    {addr.is_main && <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-yellow-600">★</span>}
                  </span>
                </label>
              ))}
              <label className={`flex items-center gap-3 bg-white p-4 rounded-xl cursor-pointer font-bold text-[11px] border-2 transition-all ${selectedAddressId === 'new' ? 'border-yellow-500' : 'border-transparent'}`}>
                <input
                  type="radio"
                  name="savedAddress"
                  value="new"
                  checked={selectedAddressId === 'new'}
                  onChange={() => handleAddressSelect('new')}
                  className="accent-black shrink-0"
                />
                {t.account.newAddress}
              </label>
            </div>
          )}

          {!isPickup && (selectedAddressId === 'new' || !isLoggedIn) && (
            <>
              <input
                required
                placeholder={t.checkout.address}
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full p-5 rounded-2xl border-none outline-none font-bold shadow-inner placeholder:text-gray-300 text-sm"
              />
              <div className="flex gap-3">
                <input
                  required
                  placeholder={t.checkout.zip}
                  value={form.zip}
                  onChange={e => setForm({ ...form, zip: e.target.value })}
                  className="w-1/3 p-5 rounded-2xl border-none outline-none font-bold shadow-inner placeholder:text-gray-300 text-sm"
                />
                <input
                  required
                  placeholder={t.checkout.city}
                  value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                  className="w-2/3 p-5 rounded-2xl border-none outline-none font-bold shadow-inner placeholder:text-gray-300 text-sm"
                />
              </div>
            </>
          )}

          <textarea
            placeholder={t.checkout.notes}
            value={form.note}
            onChange={e => setForm({ ...form, note: e.target.value })}
            rows={2}
            className="w-full p-5 rounded-2xl border-none outline-none font-bold shadow-inner placeholder:text-gray-300 text-sm resize-none"
          />

          <input
            type="datetime-local"
            value={form.scheduledTime}
            onChange={e => setForm({ ...form, scheduledTime: e.target.value })}
            className="w-full p-5 rounded-2xl border-none outline-none font-bold shadow-inner placeholder:text-gray-300 text-sm"
          />
          <p className="text-[9px] font-black uppercase text-gray-300 tracking-widest -mt-3">{t.checkout.scheduledTime}</p>

          {/* Coupon code */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{t.checkout.couponCode}</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t.checkout.couponPlaceholder}
                value={couponCode}
                onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); if (!e.target.value) setAppliedCoupon(null); }}
                disabled={!!appliedCoupon}
                className="flex-1 p-4 rounded-2xl border-none outline-none font-bold shadow-inner placeholder:text-gray-300 text-sm uppercase tracking-widest disabled:opacity-50"
              />
              {appliedCoupon ? (
                <button
                  type="button"
                  onClick={() => { setAppliedCoupon(null); setCouponCode(''); setCouponError(null); }}
                  className="px-4 py-2 rounded-2xl bg-gray-200 text-gray-600 font-black text-[10px] uppercase tracking-widest hover:bg-red-100 hover:text-red-500 transition-all"
                >
                  ✕
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-5 py-2 rounded-2xl bg-black text-white font-black text-[10px] uppercase tracking-widest hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-40"
                >
                  {couponLoading ? '...' : t.checkout.couponApply}
                </button>
              )}
            </div>
            {appliedCoupon && (
              <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">
                ✓ -{appliedCoupon.discountAmount.toFixed(2)}€ {lang === 'de' ? 'Rabatt angewendet' : 'discount applied'}
              </p>
            )}
            {couponError && (
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">{couponError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || showGuestBanner}
            className="w-full bg-black text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] mt-6 hover:bg-yellow-500 hover:text-black transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (checkingAddress ? 'Checking address...' : '...') : t.checkout.placeOrder}
          </button>
        </form>
      </div>
    </div>
  );
}
