'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Icons } from '@/components/Icons';
import { Order } from '@/types';

function mapOrder(raw: any): Order {
  return {
    id: raw.id,
    orderNumber: raw.order_number,
    customerName: raw.customer_name,
    phone: raw.phone,
    address: raw.address,
    zipCode: raw.zip_code,
    city: raw.city,
    deliveryNote: raw.delivery_note,
    paymentMethod: raw.payment_method,
    status: raw.status,
    items: raw.items,
    subtotal: Number(raw.subtotal),
    deliveryFee: Number(raw.delivery_fee),
    total: Number(raw.total),
    stripeSessionId: raw.stripe_session_id,
    createdAt: raw.created_at,
  };
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, addToast } = useAppContext();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then(res => res.json())
      .then(data => { setOrder(mapOrder(data)); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const markComplete = async () => {
    if (!order) return;
    setUpdating(true);
    const res = await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    if (res.ok) {
      const data = await res.json();
      setOrder(mapOrder(data));
      addToast('Order marked as completed', 'success');
    } else {
      addToast('Failed to update status', 'error');
    }
    setUpdating(false);
  };

  const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const handlePrint = () => {
    if (!order) return;
    const win = window.open('', '_blank', 'width=700,height=900');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Receipt ${esc(order.orderNumber)}</title>
<style>
  @page { margin: 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; font-size: 13px; color: #000; max-width: 480px; margin: 0 auto; }
  .center { text-align: center; }
  .small { font-size: 11px; }
  .dashed { border-top: 1px dashed #000; margin: 12px 0 0; padding-top: 12px; }
  .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
  .total-row { display: flex; justify-content: space-between; font-weight: 900; font-size: 17px; margin-top: 8px; padding-top: 8px; border-top: 2px solid #000; }
  h1 { font-size: 22px; letter-spacing: 3px; margin-bottom: 4px; font-weight: 900; }
</style>
</head><body>
<div class="center" style="padding-bottom:12px;border-bottom:1px dashed #000;margin-bottom:14px">
  <h1>Sushi Banana.</h1>
  <div class="small">Sushi-Allee 42, 10115 Berlin</div>
  <div class="small">+49 (0) 30 123 456 78</div>
</div>
<div style="margin-bottom:12px">
  <div style="font-weight:900">ORDER ${esc(order.orderNumber)}</div>
  <div class="small">${new Date(order.createdAt).toLocaleDateString('de-DE')} ${new Date(order.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
</div>
<div class="dashed" style="margin-bottom:12px">
  <div style="font-weight:900">${esc(order.customerName)}</div>
  <div>${esc(order.phone)}</div>
  <div>${esc(order.address)}</div>
  <div>${esc(order.zipCode)} ${esc(order.city)}</div>
  ${order.deliveryNote ? `<div style="margin-top:4px;font-style:italic">Note: ${esc(order.deliveryNote)}</div>` : ''}
</div>
<div class="dashed" style="margin-bottom:0">
  ${order.items.map(item => `<div class="row"><span>${item.quantity}x ${esc(item.name)}</span><span>${(item.price * item.quantity).toFixed(2)}€</span></div>`).join('')}
</div>
<div class="dashed">
  <div class="row small"><span>Subtotal</span><span>${order.subtotal.toFixed(2)}€</span></div>
  <div class="row small"><span>Delivery</span><span>${order.deliveryFee.toFixed(2)}€</span></div>
  <div class="total-row"><span>TOTAL</span><span>${order.total.toFixed(2)}€</span></div>
</div>
<div style="border-top:1px dashed #000;padding-top:12px;margin-top:14px;text-align:center" class="small">
  <div>Zahlung: ${order.paymentMethod === 'online' ? 'Online' : 'Bar bei Lieferung'}</div>
  <div style="margin-top:10px;font-weight:900">Vielen Dank für Ihre Bestellung!</div>
  <div>Thank you for your order!</div>
</div>
</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 250);
  };

  if (loading) {
    return (
      <div className="pt-40 lg:pl-32 flex justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return <div className="pt-40 lg:pl-32 px-8 font-black text-gray-400 uppercase">Order not found</div>;
  }

  return (
    <>
      <div className="pt-8 px-4 md:px-12 max-w-4xl mx-auto lg:pl-32 min-h-screen pb-32 print:hidden">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors mb-8"
        >
          <Icons.ArrowLeft /> {t.dashboard.back}
        </button>

        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-2xl">
          {/* Header */}
          <div className="flex justify-between items-start mb-10">
            <div>
              <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">
                {new Date(order.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} ·{' '}
                {new Date(order.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <h2 className="text-3xl font-black uppercase tracking-tight">{order.orderNumber}</h2>
            </div>
            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${order.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-700'}`}>
              {order.status === 'completed' ? t.dashboard.completed : t.dashboard.processing}
            </span>
          </div>

          {/* Customer info */}
          <div className="grid grid-cols-2 gap-8 uppercase font-black tracking-tight text-[11px] mb-12">
            <div>
              <p className="text-gray-300 mb-1">{t.dashboard.customer}</p>
              <p className="text-base">{order.customerName}</p>
              <p className="text-gray-400 mt-1">{order.phone}</p>
            </div>
            <div>
              <p className="text-gray-300 mb-1">{t.dashboard.deliveryAddress}</p>
              <p className="text-base">{order.address}</p>
              <p className="text-gray-400 mt-1">{order.zipCode} {order.city}</p>
              {order.deliveryNote && <p className="text-gray-400 mt-1 italic">{order.deliveryNote}</p>}
            </div>
          </div>

          {/* Payment */}
          <div className="mb-8">
            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-2">{t.dashboard.paymentStatus}</p>
            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${order.paymentMethod === 'online' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
              {order.paymentMethod === 'online' ? 'Online (Card)' : 'Cash on Delivery'}
            </span>
          </div>

          {/* Items */}
          <div className="border-t border-gray-100 pt-8 space-y-4 mb-8">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between font-bold text-sm uppercase">
                <span>{item.quantity}x {item.name}</span>
                <span>{(item.price * item.quantity).toFixed(2)}€</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-100 pt-6 space-y-2">
            <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
              <span>Subtotal</span>
              <span>{order.subtotal.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
              <span>Delivery</span>
              <span>{order.deliveryFee.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between font-black text-2xl tracking-tighter pt-2 border-t border-gray-100">
              <span>TOTAL</span>
              <span>{order.total.toFixed(2)}€</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mt-10">
            {order.status === 'processing' && (
              <button
                onClick={markComplete}
                disabled={updating}
                className="flex-1 bg-green-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-green-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Icons.Check /> {updating ? '...' : t.dashboard.markComplete}
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-gray-100 text-black px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-black hover:text-white transition-all"
            >
              <Icons.Print /> {t.dashboard.print}
            </button>
          </div>
        </div>
      </div>

    </>
  );
}
