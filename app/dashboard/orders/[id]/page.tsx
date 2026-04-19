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
    const win = window.open('', '_blank', 'width=400,height=700');
    if (!win) return;
    const dateStr = new Date(order.createdAt).toLocaleDateString('de-DE');
    const timeStr = new Date(order.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    // Epson TM-T88VII: 80mm paper, 203 DPI, Font A = 42 chars/line at normal size
    // Use table layout — flexbox is unreliable for thermal printer drivers
    const COL = 42; // characters per line
    const priceW = 10; // chars reserved for price column
    const nameW = COL - priceW - 1;

    const padRight = (s: string, len: number) => s.slice(0, len).padEnd(len);
    const padLeft = (s: string, len: number) => s.slice(0, len).padStart(len);

    const itemLines = order.items.map(item => {
      const label = `${item.quantity}x ${item.name}`;
      const price = `${(item.price * item.quantity).toFixed(2)}EUR`;
      return `<tr><td class="name">${esc(padRight(label, nameW))}</td><td class="price">${esc(padLeft(price, priceW))}</td></tr>`;
    }).join('');

    const orderNumLine = `<tr><td class="name bold">ORDER #</td><td class="price bold">${esc(order.orderNumber)}</td></tr>`;
    const dateLine = `<tr><td class="name">${dateStr}</td><td class="price">${timeStr}</td></tr>`;
    const subtotalLine = `<tr><td class="name">Subtotal</td><td class="price">${order.subtotal.toFixed(2)} EUR</td></tr>`;
    const deliveryLine = `<tr><td class="name">Delivery fee</td><td class="price">${order.deliveryFee.toFixed(2)} EUR</td></tr>`;
    const totalLine = `<tr><td class="name bold xl">TOTAL</td><td class="price bold xl">${order.total.toFixed(2)} EUR</td></tr>`;
    const paymentMethod = order.paymentMethod === 'online' ? 'Online (Card)' : 'Pickup (Pay at restaurant)';

    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Receipt</title>
<style>
  @page { size: 80mm auto; margin: 2mm 0mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 8pt;
    color: #000;
    width: 76mm;
    padding: 0 2mm;
    word-break: break-word;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .xl { font-size: 11pt; }
  .header-title { font-size: 14pt; font-weight: bold; letter-spacing: 1px; }
  .sep { width: 100%; border: none; border-top: 1px dashed #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td { vertical-align: top; padding: 1px 0; white-space: pre-wrap; word-break: break-word; }
  td.name { width: 68%; }
  td.price { width: 32%; text-align: right; white-space: nowrap; }
  .footer { margin-top: 6px; }
  .stars { letter-spacing: 2px; }
</style>
</head><body>
<div class="center" style="margin-bottom:5px">
  <div class="header-title">Sushi Banana</div>
  <div>Sushi-Allee 42, 10115 Berlin</div>
  <div>Tel: +49 (0) 30 123 456 78</div>
  <div>www.bananasushi.de</div>
</div>
<hr class="sep">
<table>${orderNumLine}${dateLine}</table>
<hr class="sep">
<div class="bold">PICKUP BY:</div>
<div>${esc(order.customerName)}</div>
<div>${esc(order.phone)}</div>
${order.address ? `<div>${esc(order.address)}</div>` : ''}
${order.zipCode || order.city ? `<div>${esc(order.zipCode)} ${esc(order.city)}</div>` : ''}
${order.deliveryNote ? `<div>Note: ${esc(order.deliveryNote)}</div>` : ''}
<hr class="sep">
<table>
  <tr><td class="name bold">ITEM</td><td class="price bold">TOTAL</td></tr>
</table>
<hr class="sep">
<table>${itemLines}</table>
<hr class="sep">
<table>${subtotalLine}${deliveryLine}</table>
<hr class="sep">
<table>${totalLine}</table>
<hr class="sep">
<div>PAYMENT: ${esc(paymentMethod)}</div>
<hr class="sep">
<div class="center footer">
  <div>Vielen Dank fuer Ihre Bestellung!</div>
  <div>Thank you for your order!</div>
  <div style="margin-top:6px" class="stars">* * * * * * * * * * * * *</div>
  <div style="margin-top:4px;font-size:7pt">${esc(order.orderNumber)} &middot; ${dateStr}</div>
</div>
</body></html>`);
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
