'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Icons } from '../Icons';

export const DashboardSidebarMobile = ({ role }: { role?: 'admin' | 'staff' | null }) => {
  const { t } = useAppContext();
  const pathname = usePathname();

  const links = [
    { to: '/dashboard/orders', label: t.dashboard.orders, icon: <Icons.Clock />, adminOnly: false },
    { to: '/dashboard/history', label: t.dashboard.history, icon: <Icons.Cart />, adminOnly: false },
    { to: '/dashboard/stats', label: t.dashboard.stats, icon: <Icons.Stats />, adminOnly: true },
    { to: '/dashboard/menu', label: t.dashboard.menuMgmt, icon: <Icons.Edit />, adminOnly: true },
    { to: '/dashboard/content', label: 'Content', icon: <Icons.Content />, adminOnly: true },
    { to: '/dashboard/staff', label: t.dashboard.staff, icon: <Icons.Users />, adminOnly: true },
  ].filter(l => !l.adminOnly || role === 'admin');

  if (pathname === '/dashboard/login') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t border-gray-100 z-50 flex justify-around py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] print:hidden">
      {links.map(link => (
        <Link
          key={link.to}
          href={link.to}
          className={`flex flex-col items-center gap-1 ${pathname === link.to ? 'text-black' : 'text-gray-300'}`}
        >
          {link.icon}
          <span className="text-[7px] font-black uppercase tracking-widest">{link.label}</span>
        </Link>
      ))}
    </div>
  );
};
