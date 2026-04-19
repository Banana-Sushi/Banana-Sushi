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

  const handleEscPosPrint = async () => {
    if (!order) return;
    try {
      const res = await fetch(`/api/orders/${order.id}/receipt?format=network`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Print failed');
      addToast('Receipt sent to printer', 'success');
    } catch (err: any) {
      addToast(`Print error: ${err?.message ?? 'unknown'}`, 'error');
    }
  };

  const handlePrint = () => {
    if (!order) return;
    // Open without a fixed pixel size — let @page CSS control the paper width.
    // Fixed-pixel windows cause double-scaling by the printer driver (blurry text).
    const win = window.open('', '_blank');
    if (!win) return;

    const d       = new Date(order.createdAt);
    const dateStr = d.toLocaleDateString('de-DE');
    const timeStr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const pm      = order.paymentMethod === 'online' ? 'Online (Card)' : 'Pickup (Pay at restaurant)';

    const esc = (s: string) =>
      String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const itemRows = order.items.map(item => `
      <div class="row">
        <span class="item-name">${esc(String(item.quantity))}x ${esc(item.name)}</span>
        <span class="item-total">${(item.price * item.quantity).toFixed(2)} EUR</span>
      </div>
      <div class="item-sub">${esc(String(item.quantity))} &times; ${item.price.toFixed(2)} EUR</div>
    `).join('');

    const addressLine = order.address
      ? `<p>${esc(order.address)}, ${esc(order.zipCode ?? '')} ${esc(order.city ?? '')}</p>`
      : '';
    const noteLine = order.deliveryNote
      ? `<p class="note">Note: ${esc(order.deliveryNote)}</p>`
      : '';

    win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt ${esc(order.orderNumber)}</title>
<style>
  /* ── Page setup ── */
  @page { size: 80mm auto; margin: 4mm 3mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 8.5pt;
    color: #000;
    width: 100%;
    -webkit-font-smoothing: none;
    font-smooth: never;
  }

  /* ── Typography helpers ── */
  .center { text-align: center; }
  .bold   { font-weight: 900; }
  .title  { font-size: 13pt; font-weight: 900; letter-spacing: 1px; }
  .note   { font-style: italic; }

  /* ── Layout helpers ── */
  p { margin: 0.8mm 0; line-height: 1.3; }
  .sep { border-top: 1px dashed #000; margin: 2mm 0; }

  /* ── Two-column rows ── */
  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    width: 100%;
    margin: 0.5mm 0;
  }
  .row span { line-height: 1.4; }
  .item-name  { flex: 1; padding-right: 4px; word-break: break-word; }
  .item-total { white-space: nowrap; font-weight: 900; }
  .item-sub   { padding-left: 4mm; color: #333; margin-bottom: 1mm; }

  .summary-label { flex: 1; }
  .summary-value { white-space: nowrap; }

  .total-row { font-size: 11pt; font-weight: 900; margin: 1mm 0; }
</style>
</head>
<body>

  <p class="center title">Sushi Banana</p>
  <p class="center">Sushi-Allee 42, 10115 Berlin</p>
  <p class="center">Tel: +49 (0) 30 123 456 78</p>
  <p class="center">www.bananasushi.de</p>

  <div class="sep"></div>

  <div class="row">
    <span class="bold">ORDER #${esc(order.orderNumber)}</span>
    <span>${dateStr} ${timeStr}</span>
  </div>

  <div class="sep"></div>

  <p class="bold">PICKUP BY:</p>
  <p>${esc(order.customerName)}</p>
  <p>${esc(order.phone)}</p>
  ${addressLine}
  ${noteLine}

  <div class="sep"></div>

  <div class="row bold">
    <span>ITEM</span>
    <span>TOTAL</span>
  </div>

  <div class="sep"></div>

  ${itemRows}

  <div class="sep"></div>

  <div class="row">
    <span class="summary-label">Subtotal</span>
    <span class="summary-value">${order.subtotal.toFixed(2)} EUR</span>
  </div>
  <div class="row">
    <span class="summary-label">Delivery fee</span>
    <span class="summary-value">${order.deliveryFee.toFixed(2)} EUR</span>
  </div>

  <div class="sep"></div>

  <div class="row total-row">
    <span>TOTAL</span>
    <span>${order.total.toFixed(2)} EUR</span>
  </div>

  <div class="sep"></div>

  <p>PAYMENT: ${esc(pm)}</p>

  <div class="sep"></div>

  <p>&nbsp;</p>
  <p class="center">Vielen Dank fuer Ihre Bestellung!</p>
  <p class="center">Thank you for your order!</p>
  <p>&nbsp;</p>
  <p class="center">* * * * * * * * *</p>
  <p class="center">${esc(order.orderNumber)} &middot; ${dateStr}</p>
  <p>&nbsp;</p>

</body>
</html>`);

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
            <button
              onClick={handleEscPosPrint}
              title="Send raw ESC/POS bytes to Epson via USB-Serial (Chrome/Edge)"
              className="flex items-center gap-2 bg-black text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-gray-800 transition-all"
            >
              <Icons.Print /> ESC/POS
            </button>
          </div>
        </div>
      </div>

    </>
  );
}
