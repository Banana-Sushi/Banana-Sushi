'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import { useAppContext } from '@/context/AppContext';
import { Icons } from '@/components/Icons';

const DELIVERY_FEE = 2.90;

export default function OrderPage() {
  const { cart, removeFromCart, clearCart, t, lang, addToast } = useAppContext();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('online');
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', zip: '', city: '', note: '' });

  const subtotal = cart.reduce((acc, c) => acc + c.item.price * c.quantity, 0);
  const total = subtotal + DELIVERY_FEE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setLoading(true);

    const orderData = {
      customerName: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      zipCode: form.zip,
      city: form.city,
      deliveryNote: form.note,
      paymentMethod,
      items: cart.map(c => ({
        menuItemId: c.item.id,
        name: c.item.name[lang],
        quantity: c.quantity,
        price: c.item.price,
      })),
      subtotal,
      deliveryFee: DELIVERY_FEE,
      total,
    };

    try {
      if (paymentMethod === 'online') {
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
    <div className="pt-[100px] md:pt-[130px] px-4 md:px-20 pb-32 max-w-7xl mx-auto animate-fade-in">
      <h2 className="text-4xl md:text-5xl font-black uppercase mb-16 tracking-tighter">{t.checkout.title}</h2>
      <div className="flex flex-col lg:flex-row gap-16">
        {/* Cart summary */}
        <div className="flex-1 space-y-8 bg-white p-8 md:p-12 rounded-[2.5rem] border border-gray-100 shadow-sm">
          {cart.map(c => (
            <div key={c.item.id} className="flex justify-between items-center py-6 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-5">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden">
                  <Image src={c.item.image} alt={c.item.name[lang]} fill className="object-cover" sizes="64px" />
                </div>
                <div className="font-black uppercase">
                  <p className="text-sm">{c.item.name[lang]}</p>
                  <p className="text-gray-300 text-[10px] mt-1">{c.quantity}x {c.item.price.toFixed(2)}€</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="font-black text-base">{(c.item.price * c.quantity).toFixed(2)}€</span>
                <button onClick={() => removeFromCart(c.item.id)} className="text-red-400 hover:text-red-600 transition-colors">
                  <Icons.Trash />
                </button>
              </div>
            </div>
          ))}
          <div className="pt-4 space-y-2 text-[10px] font-black uppercase text-gray-400">
            <div className="flex justify-between">
              <span>{t.checkout.subtotal}</span>
              <span className="text-black">{subtotal.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between">
              <span>{t.checkout.delivery}</span>
              <span className="text-black">{DELIVERY_FEE.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between items-baseline pt-4 border-t border-gray-100 text-black">
              <span className="tracking-widest">{t.checkout.total}</span>
              <span className="text-3xl text-black">{total.toFixed(2)}€</span>
            </div>
            <p className="text-gray-300 pt-1">{t.checkout.taxInfo}</p>
          </div>
        </div>

        {/* Order form */}
        <form onSubmit={handleSubmit} className="w-full lg:w-[420px] space-y-5 bg-gray-50 p-8 md:p-10 rounded-[2.5rem]">
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
          <textarea
            placeholder={t.checkout.notes}
            value={form.note}
            onChange={e => setForm({ ...form, note: e.target.value })}
            rows={2}
            className="w-full p-5 rounded-2xl border-none outline-none font-bold shadow-inner placeholder:text-gray-300 text-sm resize-none"
          />

          <div className="pt-4 space-y-4">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{t.checkout.payment}</p>
            <label className={`flex items-center gap-4 bg-white p-4 rounded-xl cursor-pointer font-black text-[11px] uppercase border-2 transition-all ${paymentMethod === 'online' ? 'border-yellow-500' : 'border-transparent'}`}>
              <input type="radio" name="payment" value="online" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} className="accent-black" />
              {t.checkout.online}
            </label>
            <label className={`flex items-center gap-4 bg-white p-4 rounded-xl cursor-pointer font-black text-[11px] uppercase border-2 transition-all ${paymentMethod === 'cash' ? 'border-yellow-500' : 'border-transparent'}`}>
              <input type="radio" name="payment" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} className="accent-black" />
              {t.checkout.cash}
            </label>
          </div>

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
