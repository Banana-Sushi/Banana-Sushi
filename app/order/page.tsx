'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useAppContext } from '@/context/AppContext';
import { Icons } from '@/components/Icons';
import { haversineKm, geocodeAddress, RESTAURANT_LAT, RESTAURANT_LNG } from '@/lib/distance';
import { findPostalCodeOverride, getDeliveryZoneForDistance } from '@/lib/delivery-zones';

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
  const [feeStatus, setFeeStatus] = useState<'idle' | 'pending' | 'ready'>('idle');
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    discountType: string;
    discountValue: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showScheduledTimeError, setShowScheduledTimeError] = useState(false);

  // Customer session state
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new');
  const [guestMode, setGuestMode] = useState(false);
  const [customerLoaded, setCustomerLoaded] = useState(false);

  const isPickup = deliveryMode === 'pickup';
  const effectiveDeliveryFee = isPickup ? 0 : (deliveryFee ?? 0);
  const datetimeInputRef = useRef<HTMLInputElement | null>(null);

  const formatScheduledTimeDisplay = (value: string) => {
    if (!value) return '';
    const [date, time] = value.split('T');
    return date && time ? `${date} ${time}` : value;
  };

  const MIN_SCHEDULED_LEAD_MINUTES = 50;

  const toDatetimeLocalValue = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const minScheduledTime = toDatetimeLocalValue(new Date(Date.now() + MIN_SCHEDULED_LEAD_MINUTES * 60 * 1000));

  const validateScheduledTime = (value: string) => {
    if (!value) return true;
    if (value < minScheduledTime) {
      setShowScheduledTimeError(true);
      return false;
    }
    setShowScheduledTimeError(false);
    return true;
  };

  useEffect(() => {
    if (isPickup) {
      setDeliveryFee(0);
      setFeeStatus('ready');
      setRangeError(null);
      return;
    }

    const address = form.address.trim();
    const zip = form.zip.trim();
    const city = form.city.trim();

    if (!address || !zip || !city) {
      setDeliveryFee(null);
      setFeeStatus('idle');
      setRangeError(null);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setDeliveryFee(null);
      setFeeStatus('pending');
      setRangeError(null);

      try {
        const postalCodesRes = await fetch('/api/delivery-postal-codes');
        const postalCodes = postalCodesRes.ok ? await postalCodesRes.json() : [];
        const postalCodeOverride = Array.isArray(postalCodes)
          ? findPostalCodeOverride(zip, postalCodes)
          : null;
        if (active && postalCodeOverride) {
          setDeliveryFee(postalCodeOverride.fee);
          setFeeStatus('ready');
          return;
        }

        const coords = await geocodeAddress(address, zip, city);
        if (!active) return;
        if (!coords) {
          setRangeError(lang === 'de' ? 'Out of range' : 'Out of range');
          setFeeStatus('idle');
          return;
        }

        const dist = haversineKm(RESTAURANT_LAT, RESTAURANT_LNG, coords.lat, coords.lng);
        const zonesRes = await fetch('/api/delivery-zones');
        const zones = await zonesRes.json();
        if (!active) return;

        const evaluation = getDeliveryZoneForDistance(dist, zones);
        if (evaluation.isOutOfRange) {
          setRangeError(lang === 'de' ? 'Out of range' : 'Out of range');
          setFeeStatus('idle');
          return;
        }

        setDeliveryFee(evaluation.fee ?? 0);
        setFeeStatus('ready');
      } catch {
        if (!active) return;
        setRangeError(lang === 'de' ? 'Out of range' : 'Out of range');
        setFeeStatus('idle');
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [form.address, form.zip, form.city, isPickup, lang]);

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
  const previewFee = isPickup ? 0 : (deliveryFee ?? 0);
  const previewTotal = Math.max(0, discountedSubtotal - couponDiscountAmount + previewFee);

  const buildOrderData = (fee: number) => ({
    customerName: form.name,
    email: form.email,
    phone: form.phone,
    address: isPickup ? null : form.address,
    zipCode: isPickup ? null : form.zip,
    city: isPickup ? null : form.city,
    deliveryNote: form.note || null,
    scheduledTime: form.scheduledTime || null,
    paymentMethod: isPickup ? (paymentChoice === 'online' ? 'pickup_online' : 'pickup_cash') : paymentChoice,
    items: cart.map(c => ({
      menuItemId: c.item.id,
      name: c.item.name[lang],
      quantity: c.quantity,
      price: c.effectivePrice,
      selectedOptionalAddons: c.selectedOptionalAddons,
      selectedMandatoryAddons: c.selectedMandatoryAddons,
    })),
    subtotal: discountedSubtotal,
    deliveryFee: fee,
    total: Math.max(0, discountedSubtotal - couponDiscountAmount + fee),
    couponCode: appliedCoupon?.code ?? null,
    customerId: customer?.id ?? null,
  });

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

    if (!validateScheduledTime(form.scheduledTime)) {
      return;
    }

    setLoading(true);
    setDeliveryFee(null);
    setFeeStatus('pending');
    setShowConfirmModal(false);
    setRangeError(null);

    if (!isPickup) {
      setCheckingAddress(true);
      try {
        const postalCodesRes = await fetch('/api/delivery-postal-codes');
        const postalCodes = postalCodesRes.ok ? await postalCodesRes.json() : [];
        const postalCodeOverride = Array.isArray(postalCodes)
          ? findPostalCodeOverride(form.zip, postalCodes)
          : null;
        let computedFee: number;

        if (postalCodeOverride) {
          computedFee = postalCodeOverride.fee;
        } else {
          const coords = await geocodeAddress(form.address, form.zip, form.city);
          if (!coords) {
            setRangeError(lang === 'de' ? 'Out of range' : 'Out of range');
            setCheckingAddress(false);
            setLoading(false);
            setFeeStatus('idle');
            return;
          }
          const dist = haversineKm(RESTAURANT_LAT, RESTAURANT_LNG, coords.lat, coords.lng);
          const zonesRes = await fetch('/api/delivery-zones');
          const zones = await zonesRes.json();
          const evaluation = getDeliveryZoneForDistance(dist, zones);
          if (evaluation.isOutOfRange) {
            setRangeError(lang === 'de' ? 'Out of range' : 'Out of range');
            setCheckingAddress(false);
            setLoading(false);
            setFeeStatus('idle');
            return;
          }
          computedFee = evaluation.fee ?? 0;
        }

        setDeliveryFee(computedFee);
        setFeeStatus('ready');
      } catch {
        addToast('Adresse konnte nicht gefunden werden. Bitte überprüfe deine Eingabe.', 'error');
        setCheckingAddress(false);
        setLoading(false);
        setFeeStatus('idle');
        return;
      }
      setCheckingAddress(false);
    } else {
      setDeliveryFee(0);
      setFeeStatus('ready');
    }

    setLoading(false);
    setShowConfirmModal(true);
  };

  const confirmOrder = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    setShowConfirmModal(false);

    const fee = isPickup ? 0 : (deliveryFee ?? 0);
    const orderData = buildOrderData(fee);

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
      {showConfirmModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-2xl">
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-5">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-gray-400">
                {lang === 'de' ? 'Bestellung bestätigen' : 'Confirm order'}
              </p>
              <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-black">
                {lang === 'de' ? 'Bitte prüfe deine Bestellung' : 'Please review your order'}
              </h3>
            </div>

            <div className="p-8">
              <div className="rounded-[1.25rem] border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <span>{lang === 'de' ? 'Ihre Auswahl' : 'Your selection'}</span>
                  <span className="text-gray-700">{cart.reduce((total, item) => total + item.quantity, 0)} {lang === 'de' ? 'Artikel' : 'items'}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {cart.map(item => (
                    <div key={item.cartKey} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm font-bold text-gray-700">
                      <span>{item.quantity}× {item.item.name[lang]}</span>
                      <span className="text-gray-900">{(item.effectivePrice * item.quantity).toFixed(2)}€</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-[1.25rem] border border-gray-100 bg-white p-4">
                <div className="space-y-3 text-sm font-bold text-gray-600">
                  <div className="flex justify-between">
                    <span>{t.checkout.subtotal}</span>
                    <span>{discountedSubtotal.toFixed(2)}€</span>
                  </div>
                  {couponDiscountAmount > 0 && appliedCoupon && (
                    <div className="flex justify-between text-green-600">
                      <span>{lang === 'de' ? 'Gutschein' : 'Coupon'} ({appliedCoupon.code})</span>
                      <span>-{couponDiscountAmount.toFixed(2)}€</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>{t.checkout.delivery}</span>
                    <span>{previewFee.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-3 text-base font-black text-black">
                    <span>{t.checkout.total}</span>
                    <span>{previewTotal.toFixed(2)}€</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 transition-all hover:bg-gray-100"
                >
                  {lang === 'de' ? 'Zurück' : 'Back'}
                </button>
                <button
                  type="button"
                  onClick={confirmOrder}
                  disabled={loading}
                  className="flex-1 rounded-2xl bg-black px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-gray-800 disabled:opacity-50"
                >
                  {loading ? '...' : (lang === 'de' ? 'Jetzt bestellen' : 'Place order')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rangeError && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">{lang === 'de' ? 'Lieferung nicht möglich' : 'Delivery unavailable'}</p>
            <h3 className="mt-3 text-2xl font-black uppercase tracking-tight">{rangeError}</h3>
            <p className="mt-3 text-sm font-bold text-gray-500">
              {lang === 'de' ? 'Diese Adresse liegt außerhalb des aktuell definierten Liefergebiets.' : 'This address is outside the currently configured delivery area.'}
            </p>
            <button
              type="button"
              onClick={() => setRangeError(null)}
              className="mt-6 w-full rounded-2xl bg-black px-5 py-4 text-[10px] font-black uppercase tracking-[0.25em] text-white hover:bg-yellow-500 hover:text-black transition-all"
            >
              {lang === 'de' ? 'Schließen' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {showScheduledTimeError && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">{lang === 'de' ? 'Zeitfenster' : 'Time window'}</p>
            <h3 className="mt-3 text-2xl font-black uppercase tracking-tight">
              {lang === 'de' ? 'Wähle einen späteren Zeitpunkt' : 'Choose a later time'}
            </h3>
            <p className="mt-3 text-sm font-bold text-gray-500">
              {lang === 'de'
                ? 'Das gewünschte Liefer- oder Abholzeitfenster muss mindestens 50 Minuten in der Zukunft liegen.'
                : 'The preferred delivery or pickup time must be at least 50 minutes from now.'}
            </p>
            <button
              type="button"
              onClick={() => setShowScheduledTimeError(false)}
              className="mt-6 w-full rounded-2xl bg-black px-5 py-4 text-[10px] font-black uppercase tracking-[0.25em] text-white hover:bg-yellow-500 hover:text-black transition-all"
            >
              {lang === 'de' ? 'Schließen' : 'Close'}
            </button>
          </div>
        </div>
      )}

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
                {isPickup ? (lang === 'de' ? 'Kostenlos' : 'Free') : (
                  feeStatus === 'pending'
                    ? (lang === 'de' ? 'Wird berechnet...' : 'Calculating...')
                    : deliveryFee !== null
                      ? `${deliveryFee.toFixed(2)}€`
                      : (lang === 'de' ? 'Kostenlos' : 'Free')
                )}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-3 border-t border-gray-200 text-black">
              <span className="font-black uppercase tracking-widest text-[10px]">{t.checkout.total}</span>
              <span className="text-3xl font-black">{(isPickup || feeStatus === 'ready') ? `${total.toFixed(2)}€` : '...'}</span>
            </div>
            <p className="text-[9px] text-gray-300 font-bold uppercase pt-1">{t.checkout.taxInfo}</p>
            {!isPickup && feeStatus === 'pending' && (
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                {lang === 'de' ? 'Bitte gib deine Adresse ein, um die Liefergebühr zu berechnen.' : 'Please enter your address to calculate the delivery fee.'}
              </p>
            )}
          </div>
        </div>

        {/* Order form */}
        <form onSubmit={handleSubmit} noValidate className="w-full xl:w-[400px] shrink-0 space-y-5 bg-gray-50 p-8 md:p-10 rounded-[2.5rem]">

          {/* Delivery mode choice */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{t.checkout.payment}</p>

            <label className={`flex items-center gap-4 bg-white p-4 rounded-xl cursor-pointer font-black text-[11px] uppercase border-2 transition-all ${deliveryMode === 'delivery' && paymentChoice === 'online' ? 'border-yellow-500' : 'border-transparent'}`}>
              <input type="radio" name="mode" value="delivery_online" checked={deliveryMode === 'delivery' && paymentChoice === 'online'} onChange={() => { setDeliveryMode('delivery'); setPaymentChoice('online'); setDeliveryFee(null); }} className="accent-black" />
              {t.checkout.online}
            </label>

            <label className={`flex items-center gap-4 bg-white p-4 rounded-xl cursor-pointer font-black text-[11px] uppercase border-2 transition-all ${deliveryMode === 'delivery' && paymentChoice === 'cash' ? 'border-yellow-500' : 'border-transparent'}`}>
              <input type="radio" name="mode" value="delivery_cash" checked={deliveryMode === 'delivery' && paymentChoice === 'cash'} onChange={() => { setDeliveryMode('delivery'); setPaymentChoice('cash'); setDeliveryFee(null); }} className="accent-black" />
              {t.checkout.cash}
            </label>

            <label className={`flex items-center gap-4 bg-white p-4 rounded-xl cursor-pointer font-black text-[11px] uppercase border-2 transition-all ${isPickup ? 'border-yellow-500' : 'border-transparent'}`}>
              <input type="radio" name="mode" value="pickup" checked={isPickup} onChange={() => { setDeliveryMode('pickup'); setPaymentChoice('online'); setDeliveryFee(null); }} className="accent-black" />
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

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-black tracking-wide ml-1">{t.checkout.scheduledTime}</label>

            {/* Desktop: real datetime-local input */}
            <input
              type="datetime-local"
              value={form.scheduledTime}
              onChange={e => {
                const nextValue = e.target.value;
                setForm({ ...form, scheduledTime: nextValue });
                if (nextValue) validateScheduledTime(nextValue);
                else setShowScheduledTimeError(false);
              }}
              min={minScheduledTime}
              placeholder="Select date and time"
              className="hidden md:block w-full p-4 rounded-[32px] border border-neutral-200 bg-white text-black text-sm font-bold shadow-sm outline-none transition focus:border-black"
            />

            {/* Mobile: custom visible field with hidden picker overlay */}
            <div className="relative md:hidden">
              <div className="w-full text-left p-4 pr-12 rounded-[32px] border border-neutral-200 bg-white text-black text-sm font-bold shadow-sm transition">
                {form.scheduledTime ? formatScheduledTimeDisplay(form.scheduledTime) : 'Select date and time'}
              </div>
              <input
                ref={datetimeInputRef}
                type="datetime-local"
                value={form.scheduledTime}
                onChange={e => {
                  const nextValue = e.target.value;
                  setForm({ ...form, scheduledTime: nextValue });
                  if (nextValue) validateScheduledTime(nextValue);
                  else setShowScheduledTimeError(false);
                }}
                min={minScheduledTime}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {form.scheduledTime && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, scheduledTime: '' })}
                  className="absolute right-4 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-600 text-xs font-black"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

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
