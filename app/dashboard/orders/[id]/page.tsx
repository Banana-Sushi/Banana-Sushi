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

  const handlePrint = () => window.print();

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
    <div className="pt-[100px] px-4 md:px-12 max-w-4xl mx-auto lg:pl-32 min-h-screen pb-32">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors mb-8 print:hidden"
      >
        <Icons.ArrowLeft /> {t.dashboard.back}
      </button>

      <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-2xl print:shadow-none print:border-none print:rounded-none print:p-4">
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
        <div className="flex gap-4 mt-10 print:hidden">
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

      {/* Receipt — only visible on print */}
      <div className="receipt-print" style={{ display: 'none' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '11px' }}>
          <div style={{ textAlign: 'center', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #000' }}>
            <div style={{ fontWeight: 900, fontSize: '15px', letterSpacing: '2px' }}>BANANA SUSHI.</div>
            <div style={{ fontSize: '10px' }}>Sushi-Allee 42, 10115 Berlin</div>
            <div style={{ fontSize: '10px' }}>+49 (0) 30 123 456 78</div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <div><strong>ORDER {order.orderNumber}</strong></div>
            <div>{new Date(order.createdAt).toLocaleDateString('de-DE')} {new Date(order.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', marginBottom: '8px' }}>
            <div><strong>{order.customerName}</strong></div>
            <div>{order.phone}</div>
            <div>{order.address}</div>
            <div>{order.zipCode} {order.city}</div>
            {order.deliveryNote && <div><em>Note: {order.deliveryNote}</em></div>}
          </div>
          <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', marginBottom: '8px' }}>
            {order.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{item.quantity}x {item.name}</span>
                <span>{(item.price * item.quantity).toFixed(2)}€</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span>Subtotal</span><span>{order.subtotal.toFixed(2)}€</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span>Delivery</span><span>{order.deliveryFee.toFixed(2)}€</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '14px', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #000' }}>
              <span>TOTAL</span><span>{order.total.toFixed(2)}€</span>
            </div>
          </div>
          <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', textAlign: 'center', fontSize: '10px' }}>
            <div>Zahlung: {order.paymentMethod === 'online' ? 'Online' : 'Bar bei Lieferung'}</div>
            <div style={{ marginTop: '8px' }}>Vielen Dank für Ihre Bestellung!</div>
            <div>Thank you for your order!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
