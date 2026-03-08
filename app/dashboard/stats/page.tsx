'use client';

import { useEffect, useState, useMemo } from 'react';
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

    const revenueTotal = orders.reduce((acc, o) => acc + o.total, 0);
    const avgOrder = orders.length > 0 ? revenueTotal / orders.length : 0;
    const onlineCount = orders.filter(o => o.paymentMethod === 'online').length;
    const cashCount = orders.filter(o => o.paymentMethod === 'cash').length;

    // Top items by quantity sold
    const itemMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    orders.forEach(o => {
      o.items.forEach((item: any) => {
        if (!itemMap[item.name]) itemMap[item.name] = { name: item.name, quantity: 0, revenue: 0 };
        itemMap[item.name].quantity += item.quantity;
        itemMap[item.name].revenue += item.price * item.quantity;
      });
    });
    const topItems = Object.values(itemMap).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    const maxQty = topItems[0]?.quantity ?? 1;

    // Last 7 days
    const last7: { label: string; revenue: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = getLocalDateStr(d);
      const dayOrders = orders.filter(o => getLocalDateStr(new Date(o.createdAt)) === dStr);
      last7.push({
        label: d.toLocaleDateString('de-DE', { weekday: 'short' }),
        revenue: dayOrders.reduce((acc, o) => acc + o.total, 0),
        count: dayOrders.length,
      });
    }
    const maxRevenue = Math.max(...last7.map(d => d.revenue), 1);

    return {
      revenueToday: todayOrders.reduce((acc, o) => acc + o.total, 0),
      revenueMonth: monthOrders.reduce((acc, o) => acc + o.total, 0),
      ordersToday: todayOrders.length,
      ordersMonth: monthOrders.length,
      ordersTotal: orders.length,
      revenueTotal,
      avgOrder,
      onlineCount,
      cashCount,
      topItems,
      maxQty,
      last7,
      maxRevenue,
    };
  }, [orders]);

  if (loading) {
    return (
      <div className="pt-8 px-4 md:px-12 max-w-7xl mx-auto lg:pl-32 min-h-screen pb-32 flex justify-center items-start">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const onlinePct = stats.ordersTotal > 0 ? Math.round((stats.onlineCount / stats.ordersTotal) * 100) : 0;

  return (
    <div className="pt-8 px-4 md:px-12 max-w-7xl mx-auto lg:pl-32 min-h-screen pb-32">
      <h2 className="text-4xl md:text-6xl font-black uppercase mb-12 tracking-tighter">
        Statistics<span className="text-yellow-500">.</span>
      </h2>

      {/* Revenue row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
          <p className="text-[9px] font-black text-gray-300 uppercase mb-3 tracking-widest">Today</p>
          <p className="text-3xl font-black tracking-tighter">{stats.revenueToday.toFixed(2)}€</p>
          <p className="text-[9px] font-black text-gray-300 uppercase mt-2">{stats.ordersToday} orders</p>
        </div>
        <div className="bg-black text-white p-6 rounded-[2rem] shadow-xl text-center">
          <p className="text-[9px] font-black text-gray-400 uppercase mb-3 tracking-widest">This Month</p>
          <p className="text-3xl font-black tracking-tighter text-yellow-400">{stats.revenueMonth.toFixed(2)}€</p>
          <p className="text-[9px] font-black text-gray-400 uppercase mt-2">{stats.ordersMonth} orders</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Last 7 days bar chart */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-6">Last 7 Days</p>
          <div className="flex items-end justify-between gap-2 h-28">
            {stats.last7.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[8px] font-black text-gray-400">{day.revenue > 0 ? `${day.revenue.toFixed(0)}€` : ''}</span>
                <div className="w-full rounded-t-lg bg-yellow-400 transition-all" style={{ height: `${Math.max((day.revenue / stats.maxRevenue) * 80, day.revenue > 0 ? 4 : 0)}px` }} />
                <span className="text-[8px] font-black text-gray-400 uppercase">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top items */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-6">Top Items</p>
          {stats.topItems.length === 0 ? (
            <p className="text-gray-300 font-black text-sm uppercase">No data yet</p>
          ) : (
            <div className="space-y-4">
              {stats.topItems.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-black uppercase">
                    <span className="text-gray-700 truncate pr-2">{item.name}</span>
                    <span className="text-gray-400 whitespace-nowrap">{item.quantity}x · {item.revenue.toFixed(2)}€</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${(item.quantity / stats.maxQty) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment split */}
      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-6">Payment Method Split</p>
        <div className="flex items-center gap-6">
          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden flex">
            <div className="h-full bg-black rounded-l-full transition-all" style={{ width: `${onlinePct}%` }} />
            <div className="h-full bg-yellow-400 flex-1 rounded-r-full" />
          </div>
          <div className="flex gap-6 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-black" />
              <span className="text-[10px] font-black uppercase text-gray-600">Online {onlinePct}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span className="text-[10px] font-black uppercase text-gray-600">Cash {100 - onlinePct}%</span>
            </div>
          </div>
        </div>
        <div className="flex gap-8 mt-5">
          <p className="text-[10px] font-black text-gray-300 uppercase">{stats.onlineCount} online orders</p>
          <p className="text-[10px] font-black text-gray-300 uppercase">{stats.cashCount} cash orders</p>
        </div>
      </div>
    </div>
  );
}
