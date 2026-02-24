'use client';

import { useEffect, useState, useMemo } from 'react';
import { Order } from '@/types';
import { useAppContext } from '@/context/AppContext';

function mapOrder(raw: any): Order {
  return {
    id: raw.id,
    orderNumber: raw.order_number,
    customerName: raw.customer_name,
    phone: raw.phone,
    address: raw.address,
    zipCode: raw.zip_code,
    city: raw.city,
    paymentMethod: raw.payment_method,
    status: raw.status,
    items: raw.items,
    subtotal: Number(raw.subtotal),
    deliveryFee: Number(raw.delivery_fee),
    total: Number(raw.total),
    createdAt: raw.created_at,
  };
}

export default function StatsPage() {
  const { t } = useAppContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => { setOrders(data.map(mapOrder)); setLoading(false); });
  }, []);

  const stats = useMemo(() => {
    const getLocalDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayStr = getLocalDateStr(new Date());
    const monthStr = todayStr.substring(0, 7);

    const todayOrders = orders.filter(o => getLocalDateStr(new Date(o.createdAt)) === todayStr);
    const monthOrders = orders.filter(o => getLocalDateStr(new Date(o.createdAt)).startsWith(monthStr));

    return {
      revenueToday: todayOrders.reduce((acc, o) => acc + o.total, 0),
      revenueMonth: monthOrders.reduce((acc, o) => acc + o.total, 0),
      ordersToday: todayOrders.length,
      ordersMonth: monthOrders.length,
      ordersTotal: orders.length,
    };
  }, [orders]);

  return (
    <div className="pt-[100px] px-4 md:px-12 max-w-7xl mx-auto lg:pl-32 min-h-screen pb-32">
      <h2 className="text-4xl md:text-6xl font-black uppercase mb-12 tracking-tighter">
        Statistics<span className="text-yellow-500">.</span>
      </h2>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
              <p className="text-[10px] font-black text-gray-300 uppercase mb-4 tracking-widest">{t.dashboard.revenueToday}</p>
              <p className="text-5xl font-black tracking-tighter">{stats.revenueToday.toFixed(2)}€</p>
              <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-3">{stats.ordersToday} orders today</p>
            </div>
            <div className="bg-black text-white p-10 rounded-[2.5rem] shadow-2xl text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">{t.dashboard.revenueMonth}</p>
              <p className="text-5xl font-black tracking-tighter text-yellow-400">{stats.revenueMonth.toFixed(2)}€</p>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-3">{stats.ordersMonth} orders this month</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
