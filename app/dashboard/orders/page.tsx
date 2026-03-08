'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Icons } from '@/components/Icons';
import { Order } from '@/types';

function playNotificationBeep() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch {}
}

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
    acknowledgedAt: raw.acknowledged_at ?? null,
  };
}

function OrderStatusPill({ order }: { order: Order }) {
  if (order.status === 'completed') {
    return <span className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase bg-green-50 text-green-500">Completed</span>;
  }
  if (!order.acknowledgedAt) {
    return <span className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase bg-red-50 text-red-500 animate-pulse">New</span>;
  }
  return <span className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase bg-yellow-50 text-yellow-600">Processing</span>;
}

function orderBarColor(order: Order) {
  if (order.status === 'completed') return 'bg-green-500';
  if (!order.acknowledgedAt) return 'bg-red-400';
  return 'bg-yellow-400';
}

export default function OrdersPage() {
  const { t, addToast } = useAppContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | 'processing' | 'completed'>('all');
  const [loading, setLoading] = useState(true);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const newOrderTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const seenOrderIds = useRef<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/orders');
    if (res.ok) {
      const data = await res.json();
      const mapped = data.map(mapOrder);
      setOrders(mapped);
      mapped.forEach((o: Order) => seenOrderIds.current.add(o.id));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        const newOrder = mapOrder(payload.new);
        if (newOrder.status === 'pending') return; // wait for payment confirmation
        seenOrderIds.current.add(newOrder.id);
        setOrders(prev => [newOrder, ...prev]);
        playNotificationBeep();
        setNewOrderIds(prev => new Set([...prev, newOrder.id]));
        const timer = setTimeout(() => {
          setNewOrderIds(prev => { const next = new Set(prev); next.delete(newOrder.id); return next; });
          newOrderTimers.current.delete(newOrder.id);
        }, 2500);
        newOrderTimers.current.set(newOrder.id, timer);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
        const updated = mapOrder(payload.new);
        if (updated.status === 'pending') return;

        const isNew = !seenOrderIds.current.has(updated.id);
        if (isNew && updated.status === 'processing') {
          seenOrderIds.current.add(updated.id);
          setOrders(prev => [updated, ...prev]);
          playNotificationBeep();
          setNewOrderIds(prev => new Set([...prev, updated.id]));
          const timer = setTimeout(() => {
            setNewOrderIds(prev => { const next = new Set(prev); next.delete(updated.id); return next; });
            newOrderTimers.current.delete(updated.id);
          }, 2500);
          newOrderTimers.current.set(updated.id, timer);
          return;
        }

        setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
        setSelectedOrder(prev => prev?.id === updated.id ? updated : prev);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  const openOrder = useCallback((order: Order) => {
    setSelectedOrder(order);
  }, []);

  const handlePrint = useCallback(() => {
    if (selectedOrder && !selectedOrder.acknowledgedAt) {
      const now = new Date().toISOString();
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, acknowledgedAt: now } : o));
      setSelectedOrder(prev => prev ? { ...prev, acknowledgedAt: now } : prev);
      fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledged_at: now }),
      });
    }
    window.print();
  }, [selectedOrder]);

  const filtered = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter(o => o.status === filter);
  }, [orders, filter]);

  const counts = useMemo(() => ({
    all: orders.length,
    processing: orders.filter(o => o.status === 'processing').length,
    completed: orders.filter(o => o.status === 'completed').length,
    new: orders.filter(o => o.status === 'processing' && !o.acknowledgedAt).length,
  }), [orders]);

  const markComplete = async () => {
    if (!selectedOrder) return;
    setUpdating(true);
    const res = await fetch(`/api/orders/${selectedOrder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    if (res.ok) {
      const data = await res.json();
      const updated = mapOrder(data);
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      setSelectedOrder(updated);
      addToast('Order marked as completed', 'success');
    } else {
      addToast('Failed to update status', 'error');
    }
    setUpdating(false);
  };

  return (
    <div className="pt-8 px-4 md:px-12 max-w-7xl mx-auto lg:pl-32 min-h-screen pb-32">
      <div className="mb-10">
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
          Live Orders<span className="text-yellow-500">.</span>
        </h2>
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-2">
          Real-time updates enabled
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {(['all', 'processing', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`p-6 rounded-3xl border transition-all text-center ${filter === f
              ? f === 'completed' ? 'bg-green-500 text-white border-green-500 shadow-xl scale-105'
                : 'bg-black text-white border-black shadow-xl scale-105'
              : 'bg-white border-gray-100 shadow-sm text-black hover:border-gray-300'}`}
          >
            <p className="text-[9px] font-black uppercase mb-2 text-gray-300">{f.toUpperCase()}</p>
            <p className={`text-3xl font-black ${filter === f ? 'text-white' : f === 'completed' ? 'text-green-500' : f === 'processing' ? 'text-yellow-500' : 'text-black'}`}>
              {counts[f]}
            </p>
            {f === 'processing' && counts.new > 0 && (
              <p className="text-[8px] font-black uppercase mt-1 text-red-400">{counts.new} new</p>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {filtered.map(order => (
            <button
              key={order.id}
              onClick={() => openOrder(order)}
              className={`bg-white p-8 rounded-[2rem] shadow-sm border transition-all relative overflow-hidden text-left w-full hover:shadow-xl ${
                newOrderIds.has(order.id) ? 'animate-new-order' : ''
              } ${
                !order.acknowledgedAt && order.status === 'processing'
                  ? 'border-red-200 ring-1 ring-red-200'
                  : 'border-gray-100'
              }`}
            >
              <div className={`absolute top-0 left-0 w-1.5 h-full ${orderBarColor(order)}`} />
              <div className="flex justify-between items-start mb-3">
                <p className="text-[9px] font-black text-gray-300 uppercase">
                  {order.orderNumber} · {new Date(order.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {!order.acknowledgedAt && order.status === 'processing' && (
                  <span className="text-[8px] font-black uppercase tracking-widest bg-red-400 text-white px-2 py-1 rounded-lg animate-fade-in">NEW</span>
                )}
              </div>
              <h3 className="text-xl font-black uppercase mb-3 truncate">{order.customerName}</h3>
              <ul className="mb-5 space-y-0.5">
                {order.items.slice(0, 3).map((item: any, i: number) => (
                  <li key={i} className="text-[11px] font-bold text-gray-400 uppercase truncate">
                    {item.quantity}× {item.name}
                  </li>
                ))}
                {order.items.length > 3 && (
                  <li className="text-[10px] font-black text-gray-300 uppercase">+{order.items.length - 3} more</li>
                )}
              </ul>
              <div className="flex justify-between items-center">
                <OrderStatusPill order={order} />
                <span className="font-black text-lg">{order.total.toFixed(2)}€</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-300 font-black uppercase tracking-widest text-sm">No orders in this category</p>
        </div>
      )}

      {/* Order detail modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-zoom-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8 md:p-10">
              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">
                    {new Date(selectedOrder.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    {' · '}
                    {new Date(selectedOrder.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <h2 className="text-2xl font-black uppercase tracking-tight">{selectedOrder.orderNumber}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusPill order={selectedOrder} />
                  <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                    <Icons.Close />
                  </button>
                </div>
              </div>

              {/* Customer info */}
              <div className="grid grid-cols-2 gap-6 uppercase font-black tracking-tight text-[11px] mb-8 bg-gray-50 rounded-2xl p-5">
                <div>
                  <p className="text-gray-300 mb-1">{t.dashboard.customer}</p>
                  <p className="text-sm">{selectedOrder.customerName}</p>
                  <p className="text-gray-400 mt-1 font-bold">{selectedOrder.phone}</p>
                </div>
                <div>
                  <p className="text-gray-300 mb-1">{t.dashboard.deliveryAddress}</p>
                  <p className="text-sm">{selectedOrder.address}</p>
                  <p className="text-gray-400 mt-1 font-bold">{selectedOrder.zipCode} {selectedOrder.city}</p>
                  {selectedOrder.deliveryNote && <p className="text-gray-400 mt-1 italic font-bold">{selectedOrder.deliveryNote}</p>}
                </div>
              </div>

              {/* Payment */}
              <div className="mb-6">
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-2">{t.dashboard.paymentStatus}</p>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${selectedOrder.paymentMethod === 'online' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
                  {selectedOrder.paymentMethod === 'online' ? 'Online' : 'Cash on Delivery'}
                </span>
              </div>

              {/* Items */}
              <div className="border-t border-gray-100 pt-6 space-y-3 mb-6">
                {selectedOrder.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between font-bold text-sm uppercase">
                    <span>{item.quantity}× {item.name}</span>
                    <span className="font-black">{(item.price * item.quantity).toFixed(2)}€</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 pt-4 space-y-2 mb-8">
                <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                  <span>Subtotal</span>
                  <span>{selectedOrder.subtotal.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-[11px] font-black uppercase text-gray-400">
                  <span>Delivery</span>
                  <span>{selectedOrder.deliveryFee.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between font-black text-2xl tracking-tighter pt-3 border-t border-gray-100">
                  <span>TOTAL</span>
                  <span>{selectedOrder.total.toFixed(2)}€</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {selectedOrder.status === 'processing' && (
                  <button
                    onClick={markComplete}
                    disabled={updating}
                    className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-green-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Icons.Check /> {updating ? '...' : t.dashboard.markComplete}
                  </button>
                )}
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-gray-100 text-black px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black hover:text-white transition-all"
                >
                  <Icons.Print /> {t.dashboard.print}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt — only visible on print */}
      {selectedOrder && (
        <div className="receipt-print" style={{ display: 'none' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', padding: '0' }}>
            <div style={{ textAlign: 'center', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #000' }}>
              <div style={{ fontWeight: 900, fontSize: '15px', letterSpacing: '2px' }}>BANANA SUSHI.</div>
              <div style={{ fontSize: '10px' }}>Sushi-Allee 42, 10115 Berlin</div>
              <div style={{ fontSize: '10px' }}>+49 (0) 30 123 456 78</div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div><strong>ORDER {selectedOrder.orderNumber}</strong></div>
              <div>{new Date(selectedOrder.createdAt).toLocaleDateString('de-DE')} {new Date(selectedOrder.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', marginBottom: '8px' }}>
              <div><strong>{selectedOrder.customerName}</strong></div>
              <div>{selectedOrder.phone}</div>
              <div>{selectedOrder.address}</div>
              <div>{selectedOrder.zipCode} {selectedOrder.city}</div>
              {selectedOrder.deliveryNote && <div><em>Note: {selectedOrder.deliveryNote}</em></div>}
            </div>
            <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', marginBottom: '8px' }}>
              {selectedOrder.items.map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{item.quantity}x {item.name}</span>
                  <span>{(item.price * item.quantity).toFixed(2)}€</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                <span>Subtotal</span><span>{selectedOrder.subtotal.toFixed(2)}€</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                <span>Delivery</span><span>{selectedOrder.deliveryFee.toFixed(2)}€</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '14px', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #000' }}>
                <span>TOTAL</span><span>{selectedOrder.total.toFixed(2)}€</span>
              </div>
            </div>
            <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', textAlign: 'center', fontSize: '10px' }}>
              <div>Zahlung: {selectedOrder.paymentMethod === 'online' ? 'Online' : 'Bar bei Lieferung'}</div>
              <div style={{ marginTop: '8px' }}>Vielen Dank für Ihre Bestellung!</div>
              <div>Thank you for your order!</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
