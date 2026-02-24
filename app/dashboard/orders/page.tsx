'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
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
  };
}

export default function OrdersPage() {
  const { t } = useAppContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | 'processing' | 'completed'>('all');
  const [loading, setLoading] = useState(true);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const newOrderTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/orders');
    if (res.ok) {
      const data = await res.json();
      setOrders(data.map(mapOrder));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();

    // Supabase Realtime subscription
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        const newOrder = mapOrder(payload.new);
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
        setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  const filtered = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter(o => o.status === filter);
  }, [orders, filter]);

  const counts = useMemo(() => ({
    all: orders.length,
    processing: orders.filter(o => o.status === 'processing').length,
    completed: orders.filter(o => o.status === 'completed').length,
  }), [orders]);

  return (
    <div className="pt-[100px] px-4 md:px-12 max-w-7xl mx-auto lg:pl-32 min-h-screen pb-32">
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
                : f === 'processing' ? 'bg-black text-white border-black shadow-xl scale-105'
                : 'bg-black text-white border-black shadow-xl scale-105'
              : 'bg-white border-gray-100 shadow-sm text-black hover:border-gray-300'}`}
          >
            <p className={`text-[9px] font-black uppercase mb-2 ${filter === f ? 'text-gray-300' : 'text-gray-300'}`}>
              {f.toUpperCase()}
            </p>
            <p className={`text-3xl font-black ${filter === f && f === 'completed' ? 'text-white' : filter === f ? 'text-white' : f === 'completed' ? 'text-green-500' : f === 'processing' ? 'text-yellow-500' : 'text-black'}`}>
              {counts[f]}
            </p>
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
            <Link
              key={order.id}
              href={`/dashboard/orders/${order.id}`}
              className={`bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all relative overflow-hidden group ${newOrderIds.has(order.id) ? 'animate-new-order' : ''}`}
            >
              <div className={`absolute top-0 left-0 w-1.5 h-full ${order.status === 'completed' ? 'bg-green-500' : 'bg-yellow-400'}`} />
              <div className="flex justify-between items-start mb-3">
                <p className="text-[9px] font-black text-gray-300 uppercase">
                  {order.orderNumber} · {new Date(order.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {newOrderIds.has(order.id) && (
                  <span className="text-[8px] font-black uppercase tracking-widest bg-yellow-400 text-black px-2 py-1 rounded-lg animate-fade-in">NEW</span>
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
                <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${order.status === 'completed' ? 'bg-green-50 text-green-500' : 'bg-yellow-50 text-yellow-600'}`}>
                  {order.status === 'completed' ? t.dashboard.completed : t.dashboard.processing}
                </span>
                <span className="font-black text-lg">{order.total.toFixed(2)}€</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-300 font-black uppercase tracking-widest text-sm">No orders in this category</p>
        </div>
      )}
    </div>
  );
}
