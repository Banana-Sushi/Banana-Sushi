'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
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
    createdAt: raw.created_at,
  };
}

export default function HistoryPage() {
  const { t } = useAppContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | 'today' | 'month'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => { setOrders(data.map(mapOrder)); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    const getLocalDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayStr = getLocalDateStr(new Date());
    const monthStr = todayStr.substring(0, 7);
    if (filter === 'today') return orders.filter(o => getLocalDateStr(new Date(o.createdAt)) === todayStr);
    if (filter === 'month') return orders.filter(o => getLocalDateStr(new Date(o.createdAt)).startsWith(monthStr));
    return orders;
  }, [orders, filter]);

  return (
    <div className="pt-8 px-4 md:px-12 max-w-7xl mx-auto lg:pl-32 min-h-screen pb-32">
      <div className="flex flex-col md:flex-row justify-between items-baseline mb-12 gap-8">
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
          History<span className="text-yellow-500">.</span>
        </h2>
        <div className="flex gap-2">
          {(['all', 'today', 'month'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-black text-white' : 'bg-white text-gray-400 border border-gray-100 hover:border-gray-300'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-gray-300 uppercase">{t.dashboard.orderNo}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-300 uppercase">Customer</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-300 uppercase">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-300 uppercase">{t.dashboard.total}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-300 uppercase">{t.dashboard.status}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-300 uppercase">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-bold">
              {filtered.map(order => (
                <tr key={order.id} className="hover:bg-gray-50/20">
                  <td className="px-8 py-6 font-black text-sm">{order.orderNumber}</td>
                  <td className="px-8 py-6 text-sm">{order.customerName}</td>
                  <td className="px-8 py-6 text-[11px] uppercase text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-8 py-6 text-base font-black">{order.total.toFixed(2)}€</td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${order.status === 'completed' ? 'bg-green-50 text-green-500' : 'bg-yellow-50 text-yellow-600'}`}>
                      {order.status === 'completed' ? t.dashboard.completed : t.dashboard.processing}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-[10px] font-black uppercase text-gray-400">
                    {order.paymentMethod === 'online' ? 'Card' : 'Cash'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center py-12 text-gray-300 font-black uppercase tracking-widest text-sm">No orders found</p>
          )}
        </div>
      )}
    </div>
  );
}
