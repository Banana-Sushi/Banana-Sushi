'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { useDashboardOrders } from '@/context/DashboardOrdersContext';
import { Icons } from '../Icons';

export const DashboardSidebar = ({ role }: { role?: 'admin' | 'staff' | null }) => {
  const { t, lang, setLang } = useAppContext();
  const pathname = usePathname();
  const router = useRouter();
  const { hasNewOrder, clearNewOrder } = useDashboardOrders();

  useEffect(() => {
    if (pathname === '/dashboard/orders') clearNewOrder();
  }, [pathname, clearNewOrder]);

  const links = [
    { to: '/dashboard/orders', label: t.dashboard.orders, icon: <Icons.Clock />, adminOnly: false },
    { to: '/dashboard/history', label: t.dashboard.history, icon: <Icons.Cart />, adminOnly: false },
    { to: '/dashboard/stats', label: t.dashboard.stats, icon: <Icons.Stats />, adminOnly: true },
    { to: '/dashboard/menu', label: t.dashboard.menuMgmt, icon: <Icons.Edit />, adminOnly: true },
    { to: '/dashboard/discounts', label: t.dashboard.discounts, icon: <Icons.Percent />, adminOnly: true },
    { to: '/dashboard/gutschein', label: t.dashboard.gutschein, icon: <Icons.Ticket />, adminOnly: true },
    { to: '/dashboard/content', label: 'Content', icon: <Icons.Content />, adminOnly: true },
    { to: '/dashboard/staff', label: t.dashboard.staff, icon: <Icons.Users />, adminOnly: true },
    { to: '/dashboard/qrcode', label: t.dashboard.qrCode, icon: <Icons.QRCode />, adminOnly: true },
  ].filter(l => !l.adminOnly || role === 'admin');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/dashboard/login');
  };

  if (pathname === '/dashboard/login') return null;

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-24 hidden lg:flex flex-col items-center py-10 bg-black border-r border-gray-900 z-50 print:hidden">
      <div className="mb-10">
        <Image src="/logo.png" alt="Sushi Banana" width={80} height={80} className="w-20 h-auto" />
      </div>
      <div className="flex flex-col gap-10 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        {links.map(link => (
          <Link
            key={link.to}
            href={link.to}
            className={`group relative flex flex-col items-center gap-2 transition-all ${pathname === link.to ? 'text-yellow-500' : 'text-gray-500 hover:text-white'}`}
          >
            <div className={`absolute -left-6 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-yellow-500 rounded-r-full transition-transform ${pathname === link.to ? 'scale-y-100' : 'scale-y-0'}`} />
            <div className="relative">
              {link.icon}
              {link.to === '/dashboard/orders' && hasNewOrder && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-black animate-pulse" />
              )}
            </div>
            <span className="text-[7px] font-black uppercase tracking-widest">{link.label}</span>
          </Link>
        ))}
      </div>
      <div className="flex flex-col items-center gap-6">
        <button
          onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
          className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
        >
          {lang === 'de' ? 'EN' : 'DE'}
        </button>
        <button
          onClick={handleLogout}
          className="text-gray-600 hover:text-white transition-colors flex flex-col items-center gap-2"
        >
          <Icons.LogOut />
          <span className="text-[7px] font-black uppercase tracking-widest">{t.dashboard.logout}</span>
        </button>
      </div>
    </aside>
  );
};
