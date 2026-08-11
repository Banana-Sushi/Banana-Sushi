'use client';

import { useDashboardOrders } from '@/context/DashboardOrdersContext';

export function SessionExpiredModal() {
  const { sessionExpired } = useDashboardOrders();

  if (!sessionExpired) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-zoom-in p-8 md:p-10 text-center">
        <h2 className="text-2xl font-black uppercase tracking-tight mb-3">Session Expired</h2>
        <p className="text-sm font-bold text-gray-400 mb-8">
          You&apos;ve been logged out. Please log in again to keep receiving live orders.
        </p>
        <a
          href="/dashboard/login"
          className="block w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-800 transition-all"
        >
          Log In
        </a>
      </div>
    </div>
  );
}
