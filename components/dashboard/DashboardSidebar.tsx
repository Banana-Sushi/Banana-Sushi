'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Icons } from '../Icons';

export const DashboardSidebar = () => {
  const { t } = useAppContext();
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { to: '/dashboard/orders', label: t.dashboard.orders, icon: <Icons.Clock /> },
    { to: '/dashboard/history', label: t.dashboard.history, icon: <Icons.Cart /> },
    { to: '/dashboard/stats', label: t.dashboard.stats, icon: <Icons.Stats /> },
    { to: '/dashboard/menu', label: t.dashboard.menuMgmt, icon: <Icons.Edit /> },
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/dashboard/login');
  };

  if (pathname === '/dashboard/login') return null;

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-24 hidden lg:flex flex-col items-center py-10 bg-black border-r border-gray-900 z-50 print:hidden">
      <div className="mb-10">
        <Image src="/logo.png" alt="Banana Sushi" width={72} height={72} className="w-16 h-auto" />
      </div>
      <div className="flex flex-col gap-10 flex-1">
        {links.map(link => (
          <Link
            key={link.to}
            href={link.to}
            className={`group relative flex flex-col items-center gap-2 transition-all ${pathname === link.to ? 'text-yellow-500' : 'text-gray-500 hover:text-white'}`}
          >
            <div className={`absolute -left-6 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-yellow-500 rounded-r-full transition-transform ${pathname === link.to ? 'scale-y-100' : 'scale-y-0'}`} />
            {link.icon}
            <span className="text-[7px] font-black uppercase tracking-widest">{link.label}</span>
          </Link>
        ))}
      </div>
      <button
        onClick={handleLogout}
        className="text-gray-600 hover:text-white transition-colors flex flex-col items-center gap-2"
      >
        <Icons.LogOut />
        <span className="text-[7px] font-black uppercase tracking-widest">{t.dashboard.logout}</span>
      </button>
    </aside>
  );
};
