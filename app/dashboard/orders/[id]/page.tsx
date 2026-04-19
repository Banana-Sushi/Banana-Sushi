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

  const esc = (s: string | null) => (s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const handlePrint = () => {
    if (!order) return;
    const win = window.open('', '_blank', 'width=320,height=700');
    if (!win) return;

    const d = new Date(order.createdAt);
    const dateStr = d.toLocaleDateString('de-DE');
    const timeStr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    // TM-T88VII: plain pre-formatted text avoids all CSS layout issues.
    // W=32 chars guarantees fit within 72mm printable area at 10pt Courier New,
    // even after the driver adds its own 3mm hardware margins on each side.
    const W = 32;
    const SEP = '-'.repeat(W);

    const row = (left: string, right: string) => {
      const r = right.slice(0, W - 2);
      const l = left.slice(0, W - r.length - 1);
      return l.padEnd(W - r.length) + r;
    };
    const ctr = (s: string) => {
      const t = s.slice(0, W);
      const pad = Math.floor((W - t.length) / 2);
      return (' '.repeat(pad) + t).padEnd(W);
    };
    const wrap = (s: string): string[] => {
      const out: string[] = [];
      for (let i = 0; i < s.length; i += W) out.push(s.slice(i, i + W));
      return out.length ? out : [''];
    };

    const txt: string[] = [];
    txt.push(ctr('Sushi Banana'));
    txt.push(ctr('Sushi-Allee 42, 10115 Berlin'));
    txt.push(ctr('Tel: +49 (0) 30 123 456 78'));
    txt.push(ctr('www.bananasushi.de'));
    txt.push('');
    txt.push(SEP);
    txt.push(row('ORDER #', order.orderNumber));
    txt.push(row(dateStr, timeStr));
    txt.push(SEP);
    txt.push('PICKUP BY:');
    txt.push(order.customerName.slice(0, W));
    txt.push(order.phone.slice(0, W));
    if (order.address) wrap(`${order.address}, ${order.zipCode} ${order.city}`).forEach(l => txt.push(l));
    if (order.deliveryNote) wrap(`Note: ${order.deliveryNote}`).forEach(l => txt.push(l));
    txt.push(SEP);
    txt.push(row('ITEM', 'TOTAL'));
    txt.push(SEP);
    for (const item of order.items) {
      const price = `${(item.price * item.quantity).toFixed(2)} EUR`;
      const label = `${item.quantity}x ${item.name}`;
      txt.push(row(label, price));
      txt.push(`   ${item.quantity} x ${item.price.toFixed(2)} EUR`);
    }
    txt.push(SEP);
    txt.push(row('Subtotal', `${order.subtotal.toFixed(2)} EUR`));
    txt.push(row('Delivery fee', `${order.deliveryFee.toFixed(2)} EUR`));
    txt.push(SEP);
    txt.push(row('TOTAL', `${order.total.toFixed(2)} EUR`));
    txt.push(SEP);
    const pm = order.paymentMethod === 'online'
      ? 'Online (Card)'
      : 'Pickup (Pay at restaurant)';
    wrap(`PAYMENT: ${pm}`).forEach(l => txt.push(l));
    txt.push(SEP);
    txt.push('');
    txt.push(ctr('Vielen Dank fuer Ihre'));
    txt.push(ctr('Bestellung!'));
    txt.push(ctr('Thank you for your order!'));
    txt.push('');
    txt.push(ctr('* * * * * * * * *'));
    txt.push(ctr(`${order.orderNumber} * ${dateStr}`));
    txt.push('');

    const body = txt.join('\n')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Receipt</title>
<style>
  @page { size: 80mm auto; margin: 2mm 0; }
  * { margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 10pt;
    font-weight: bold;
    color: #000;
    white-space: pre;
    padding: 0 1mm;
    -webkit-font-smoothing: none;
    font-smooth: never;
  }
</style>
</head><body>${body}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
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
