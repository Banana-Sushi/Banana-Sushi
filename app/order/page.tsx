'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAppContext } from '@/context/AppContext';
import { Icons } from '@/components/Icons';

export default function OrderPage() {
  const { cart, removeFromCart, clearCart, t, lang, addToast } = useAppContext();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentChoice, setPaymentChoice] = useState<'online' | 'cash'>('online');
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', zip: '', city: '', note: '' });
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);

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

  const subtotal = cart.reduce((acc, c) => acc + c.effectivePrice * c.quantity, 0);
  const total = subtotal + effectiveDeliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setLoading(true);

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
      paymentMethod,
      items: cart.map(c => ({
        menuItemId: c.item.id,
        name: c.item.name[lang],
        quantity: c.quantity,
        price: c.effectivePrice,
        selectedOptionalAddons: c.selectedOptionalAddons,
        selectedMandatoryAddons: c.selectedMandatoryAddons,
      })),
      subtotal,
      deliveryFee: effectiveDeliveryFee,
      total,
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
    } catch (err: any) {
      addToast(err.message || 'Something went wrong', 'error');
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

  return (
    <div className="pt-[100px] md:pt-[130px] px-4 md:px-6 pb-32 max-w-screen-2xl mx-auto animate-fade-in">
      <h2 className="text-4xl md:text-5xl font-black uppercase mb-16 tracking-tighter">{t.checkout.title}</h2>
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
              return (
                <div key={c.cartKey} className="py-6">
                  <div className="flex gap-4">
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                      <Image src={c.item.image} alt={c.item.name[lang]} fill className="object-cover" sizes="80px" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-black uppercase text-sm leading-tight">{c.item.name[lang]}</h4>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-black text-base">{lineTotal.toFixed(2)}€</span>
                          <button onClick={() => removeFromCart(c.cartKey)} className="text-red-300 hover:text-red-500 transition-colors">
                            <Icons.Trash />
                          </button>
                        </div>
                      </div>
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

            {/* Online Payment (delivery) */}
            <label className={`flex items-center gap-4 bg-white p-4 rounded-xl cursor-pointer font-black text-[11px] uppercase border-2 transition-all ${deliveryMode === 'delivery' && paymentChoice === 'online' ? 'border-yellow-500' : 'border-transparent'}`}>
              <input type="radio" name="mode" value="delivery_online" checked={deliveryMode === 'delivery' && paymentChoice === 'online'} onChange={() => { setDeliveryMode('delivery'); setPaymentChoice('online'); }} className="accent-black" />
              {t.checkout.online}
            </label>

            {/* Cash on Delivery */}
            <label className={`flex items-center gap-4 bg-white p-4 rounded-xl cursor-pointer font-black text-[11px] uppercase border-2 transition-all ${deliveryMode === 'delivery' && paymentChoice === 'cash' ? 'border-yellow-500' : 'border-transparent'}`}>
              <input type="radio" name="mode" value="delivery_cash" checked={deliveryMode === 'delivery' && paymentChoice === 'cash'} onChange={() => { setDeliveryMode('delivery'); setPaymentChoice('cash'); }} className="accent-black" />
              {t.checkout.cash}
            </label>

            {/* Pickup */}
            <label className={`flex items-center gap-4 bg-white p-4 rounded-xl cursor-pointer font-black text-[11px] uppercase border-2 transition-all ${isPickup ? 'border-yellow-500' : 'border-transparent'}`}>
              <input type="radio" name="mode" value="pickup" checked={isPickup} onChange={() => { setDeliveryMode('pickup'); setPaymentChoice('online'); }} className="accent-black" />
              {t.checkout.pickup}
            </label>

            {/* Pickup sub-options */}
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

          {/* Contact fields — always shown */}
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

          {/* Address fields — only for delivery */}
          {!isPickup && (
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] mt-6 hover:bg-yellow-500 hover:text-black transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '...' : t.checkout.placeOrder}
          </button>
        </form>
      </div>
    </div>
  );
}
