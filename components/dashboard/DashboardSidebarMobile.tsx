'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Icons } from '../Icons';

export const DashboardSidebarMobile = ({ role, email }: { role?: 'admin' | 'staff' | null; email?: string | null }) => {
  const { t, lang, setLang } = useAppContext();
  const pathname = usePathname();
  const router = useRouter();

  const displayName = email ? (email.split('@')[0].split('.')[0].charAt(0).toUpperCase() + email.split('@')[0].split('.')[0].slice(1)) : 'User';

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/dashboard/login');
  };

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
    <>
      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t border-gray-100 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] print:hidden">
        {/* User info strip */}
        <div className="flex items-center justify-between px-5 pt-2 pb-1 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center text-yellow-400 text-[8px] font-black shrink-0">
              {displayName.charAt(0)}
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-black">{displayName}</span>
            <span className="text-[7px] font-black uppercase tracking-widest text-yellow-500">{role}</span>
          </div>
          <button
            onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
            className="text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
          >
            {lang === 'de' ? 'EN' : 'DE'}
          </button>
        </div>
        {/* Nav links */}
        <div className="flex justify-around py-3">
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
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 text-gray-300 hover:text-black transition-colors"
          >
            <Icons.LogOut />
            <span className="text-[7px] font-black uppercase tracking-widest">{t.dashboard.logout}</span>
          </button>
        </div>
      </div>
    </>
  );
};
