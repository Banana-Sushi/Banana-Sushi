'use client';

import { useEffect, useState, useMemo } from 'react';
import { Order } from '@/types';
import { useAppContext } from '@/context/AppContext';

// ── Types ────────────────────────────────────────────────────────────────────

interface ReportOrder {
  orderNumber: string;
  date: string;
  total: number;
  paymentMethod: string;
  customerName: string;
}

interface ReportData {
  period: { start: string; end: string };
  totalOrders: number;
  totalRevenue: number;
  deliveryFees: number;
  couponDiscounts?: number;
  subtotalRevenue: number;
  cashOrders: { count: number; total: number };
  onlineOrders: { count: number; total: number };
  pickupOrders: { count: number; total: number };
  vatRate: number;
  vatAmount: number;
  netRevenue: number;
  orders: ReportOrder[];
}

interface FinancialReport {
  id: string;
  start_date: string;
  end_date: string;
  generated_at: string;
  generated_by: string;
  report_data: ReportData;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

const fmt    = (n: number) => n.toFixed(2) + ' €';
const fmtDate = (s: string) => new Date(s).toLocaleDateString('de-DE');

function paymentLabel(method: string) {
  if (method === 'cash')          return 'Bar';
  if (method === 'online')        return 'Online';
  if (method === 'pickup_online') return 'Abholung (Online)';
  if (method === 'pickup_cash')   return 'Abholung (Bar)';
  return method;
}

// ── Print: build HTML string with inline styles (no page artifact) ────────────

function buildReportHTML(report: FinancialReport): string {
  const rd = report.report_data;

  const row = (label: string, value: string, bold = false, indent = false) =>
    `<tr>
      <td style="padding:8px 0 8px ${indent ? '20px' : '0'};color:${indent ? '#9ca3af' : '#374151'};font-size:13px">${label}</td>
      <td style="padding:8px 0;text-align:right;font-weight:${bold ? '900' : '500'};font-size:${bold ? '17px' : '13px'}">${value}</td>
    </tr>`;

  const payBlock = (label: string, count: number, total: number) =>
    `<div style="background:#f9fafb;border-radius:14px;padding:16px">
      <div style="font-size:9px;font-weight:900;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">${label}</div>
      <div style="font-size:19px;font-weight:900">${fmt(total)}</div>
      <div style="font-size:9px;color:#9ca3af;margin-top:4px">${count} Bestellungen</div>
    </div>`;

  const orderRows = rd.orders.map(o =>
    `<tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:6px 8px 6px 0;color:#6b7280;font-size:11px">${o.orderNumber}</td>
      <td style="padding:6px 8px 6px 0;color:#6b7280;font-size:11px;white-space:nowrap">${fmtDate(o.date)}</td>
      <td style="padding:6px 8px 6px 0;font-size:11px;font-weight:500">${o.customerName}</td>
      <td style="padding:6px 8px 6px 0;color:#6b7280;font-size:11px">${paymentLabel(o.paymentMethod)}</td>
      <td style="padding:6px 0;text-align:right;font-weight:700;font-size:11px">${fmt(o.total)}</td>
    </tr>`
  ).join('');

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;font-size:13px">

      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #000">
        <div style="display:flex;align-items:center;gap:16px">
          <img src="/logo.png" width="56" height="56" style="width:56px;height:56px;object-fit:contain"/>
          <div>
            <div style="font-size:22px;font-weight:900;letter-spacing:-.5px">Sushi Banana</div>
            <div style="color:#6b7280;font-size:12px;margin-top:2px">Finanzbericht · ${fmtDate(rd.period.start)} — ${fmtDate(rd.period.end)}</div>
          </div>
        </div>
        <div style="text-align:right;font-size:10px;color:#9ca3af;line-height:1.6">
          Erstellt am ${fmtDate(report.generated_at)}<br/>von ${report.generated_by}
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:32px">
        <tbody>
          ${row('Bestellungen gesamt', String(rd.totalOrders))}
          ${row('Bruttoumsatz', fmt(rd.totalRevenue), true)}
          ${row('davon Liefergebühren', fmt(rd.deliveryFees), false, true)}
          ${row('davon Speisen &amp; Getränke', fmt(rd.subtotalRevenue), false, true)}
          ${rd.couponDiscounts && rd.couponDiscounts > 0 ? row('davon Rabatte', '-' + fmt(rd.couponDiscounts), false, true) : ''}
        </tbody>
      </table>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:32px">
        ${payBlock('Barzahlung', rd.cashOrders.count, rd.cashOrders.total)}
        ${payBlock('Online', rd.onlineOrders.count, rd.onlineOrders.total)}
        ${payBlock('Abholung', rd.pickupOrders.count, rd.pickupOrders.total)}
      </div>

      <div style="border-top:2px solid #000;padding-top:16px;margin-bottom:32px">
        <table style="width:100%;border-collapse:collapse">
          <tbody>
            ${row(`MwSt. ${(rd.vatRate * 100).toFixed(0)} %`, fmt(rd.vatAmount))}
            ${row('Nettoumsatz', fmt(rd.netRevenue), true)}
          </tbody>
        </table>
      </div>

      ${rd.orders.length > 0 ? `
        <div style="font-size:10px;font-weight:900;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px">
          Einzelne Bestellungen (${rd.orders.length})
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:2px solid #000">
              <th style="padding:8px 8px 8px 0;font-size:10px;text-transform:uppercase;text-align:left;font-weight:900">Nr.</th>
              <th style="padding:8px 8px 8px 0;font-size:10px;text-transform:uppercase;text-align:left;font-weight:900">Datum</th>
              <th style="padding:8px 8px 8px 0;font-size:10px;text-transform:uppercase;text-align:left;font-weight:900">Kunde</th>
              <th style="padding:8px 8px 8px 0;font-size:10px;text-transform:uppercase;text-align:left;font-weight:900">Zahlung</th>
              <th style="padding:8px 0;font-size:10px;text-transform:uppercase;text-align:right;font-weight:900">Betrag</th>
            </tr>
          </thead>
          <tbody>${orderRows}</tbody>
        </table>
      ` : ''}
    </div>`;
}

function triggerPrint(report: FinancialReport) {
  const newTitle = `Finanzbericht_${report.report_data.period.start}_${report.report_data.period.end}`;

  if (!document.getElementById('__print_styles')) {
    const style = document.createElement('style');
    style.id = '__print_styles';
    style.textContent = `@page{margin:15mm}@media print{body>*:not(#__print_portal){display:none!important}#__print_portal{display:block!important;position:static!important;width:100%!important;background:white!important}}`;
    document.head.appendChild(style);
  }

  document.getElementById('__print_portal')?.remove();
  const portal = document.createElement('div');
  portal.id = '__print_portal';
  portal.innerHTML = buildReportHTML(report);
  portal.style.cssText = 'position:absolute;left:-9999px;top:0;width:210mm';
  document.body.appendChild(portal);

  const doPrint = () => {
    // document.title = x is silently ignored when no <title> element exists in <head>.
    // Next.js may remove it on pages without metadata — so create one explicitly if missing.
    let titleEl = document.head.querySelector<HTMLTitleElement>('title');
    if (!titleEl) {
      titleEl = document.createElement('title');
      document.head.appendChild(titleEl);
    }
    const origTitle = titleEl.textContent ?? '';
    titleEl.textContent = newTitle;

    window.print();

    window.addEventListener('afterprint', () => {
      titleEl!.textContent = origTitle;
      document.getElementById('__print_portal')?.remove();
    }, { once: true });
  };

  const img = portal.querySelector('img') as HTMLImageElement | null;
  if (img && !img.complete) {
    img.onload = doPrint;
    img.onerror = doPrint;
  } else {
    doPrint();
  }
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const { t } = useAppContext();

  const [orders, setOrders]               = useState<Order[]>([]);
  const [loading, setLoading]             = useState(true);
  const [startDate, setStartDate]         = useState('');
  const [endDate, setEndDate]             = useState('');
  const [generating, setGenerating]       = useState(false);
  const [genError, setGenError]           = useState('');
  const [reports, setReports]             = useState<FinancialReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [viewingId, setViewingId]         = useState<string | null>(null);
  const [reportsPage, setReportsPage]     = useState(1);
  const REPORTS_PER_PAGE = 10;

  useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => { setOrders(data.map(mapOrder)); setLoading(false); });
  }, []);

  useEffect(() => {
    fetch('/api/reports')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setReports(data); setReportsLoading(false); })
      .catch(() => setReportsLoading(false));
  }, []);

  async function generateReport() {
    if (!startDate || !endDate) return;
    setGenError('');
    setGenerating(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      });
      const data = await res.json();
      if (!res.ok) { setGenError(data.error ?? 'Fehler'); return; }
      setReports(prev => [data, ...prev]);
      setReportsPage(1);
      triggerPrint(data);
    } finally {
      setGenerating(false);
    }
  }

  async function viewReport(id: string) {
    setViewingId(id);
    try {
      const res = await fetch(`/api/reports/${id}`);
      const data = await res.json();
      if (res.ok) triggerPrint(data);
    } finally {
      setViewingId(null);
    }
  }

  const stats = useMemo(() => {
    const getLocalDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayStr = getLocalDateStr(new Date());
    const monthStr = todayStr.substring(0, 7);

    const todayOrders = orders.filter(o => getLocalDateStr(new Date(o.createdAt)) === todayStr);
    const monthOrders = orders.filter(o => getLocalDateStr(new Date(o.createdAt)).startsWith(monthStr));

    const revenueTotal = orders.reduce((acc, o) => acc + o.total, 0);
    const onlineCount  = orders.filter(o => o.paymentMethod === 'online').length;
    const cashCount    = orders.filter(o => o.paymentMethod === 'cash').length;

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
                    <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${(item.quantity / stats.maxQty) * 100}%` }} />
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

      {/* ── Financial Report Section ──────────────────────────────────────── */}
      <div className="mt-12">
        <h2 className="text-4xl md:text-6xl font-black uppercase mb-8 tracking-tighter">
          {t.stats.financialReport}<span className="text-yellow-500">.</span>
        </h2>

        {/* Generate form */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm mb-6">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-6">
            {t.stats.generateReport}
          </p>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Von</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:border-black"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Bis</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:border-black"
              />
            </div>
            <button
              onClick={generateReport}
              disabled={generating || !startDate || !endDate}
              className="px-6 py-2 bg-black text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Lädt…
                </span>
              ) : t.stats.generateReport}
            </button>
          </div>
          {genError && <p className="mt-3 text-xs text-red-500 font-medium">{genError}</p>}
        </div>

        {/* History */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-6">
            {t.stats.reportHistory}
          </p>
          {reportsLoading ? (
            <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin" />
          ) : reports.length === 0 ? (
            <p className="text-gray-300 font-black text-sm uppercase">Noch keine Berichte.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-black text-left">
                    <th className="py-2 pr-4 font-black uppercase tracking-wider">Zeitraum</th>
                    <th className="py-2 pr-4 font-black uppercase tracking-wider">Erstellt am</th>
                    <th className="py-2 pr-4 font-black uppercase tracking-wider">Erstellt von</th>
                    <th className="py-2 font-black uppercase tracking-wider" />
                  </tr>
                </thead>
                <tbody>
                  {reports
                    .slice((reportsPage - 1) * REPORTS_PER_PAGE, reportsPage * REPORTS_PER_PAGE)
                    .map(r => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 pr-4 font-medium">
                        {fmtDate(r.start_date)} — {fmtDate(r.end_date)}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500">{fmtDate(r.generated_at)}</td>
                      <td className="py-2.5 pr-4 text-gray-500 truncate max-w-[180px]">{r.generated_by}</td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => viewReport(r.id)}
                          disabled={viewingId === r.id}
                          className="px-3 py-1 bg-black text-white text-[9px] font-black uppercase tracking-wider rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40"
                        >
                          {viewingId === r.id ? '…' : 'PDF'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reports.length > REPORTS_PER_PAGE && (
                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={() => setReportsPage(p => Math.max(1, p - 1))}
                    disabled={reportsPage === 1}
                    className="px-4 py-2 bg-gray-100 text-black text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t.stats.prevPage}
                  </button>
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                    {t.stats.pageOf
                      .replace('{current}', String(reportsPage))
                      .replace('{total}', String(Math.ceil(reports.length / REPORTS_PER_PAGE)))}
                  </p>
                  <button
                    onClick={() =>
                      setReportsPage(p =>
                        Math.min(Math.ceil(reports.length / REPORTS_PER_PAGE), p + 1)
                      )
                    }
                    disabled={reportsPage >= Math.ceil(reports.length / REPORTS_PER_PAGE)}
                    className="px-4 py-2 bg-gray-100 text-black text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t.stats.nextPage}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
