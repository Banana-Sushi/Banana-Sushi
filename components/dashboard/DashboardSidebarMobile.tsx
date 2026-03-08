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
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 text-gray-300 hover:text-black transition-colors"
        >
          <Icons.LogOut />
          <span className="text-[7px] font-black uppercase tracking-widest">{t.dashboard.logout}</span>
        </button>
      </div>

      {/* Mobile lang toggle — top-right corner */}
      <button
        onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
        className="fixed top-4 right-4 lg:hidden z-50 bg-white border border-gray-200 shadow-sm rounded-full w-10 h-10 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-black hover:border-black transition-colors print:hidden"
      >
        {lang === 'de' ? 'EN' : 'DE'}
      </button>

      {/* Mobile user info — top-left corner */}
      <div className="fixed top-4 left-4 lg:hidden z-50 bg-white border border-gray-200 shadow-sm rounded-full pl-1 pr-3 h-10 flex items-center gap-2 print:hidden">
        <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-yellow-400 text-[10px] font-black shrink-0">
          {displayName.charAt(0)}
        </div>
        <div className="leading-tight">
          <p className="text-[8px] font-black uppercase tracking-widest text-black">{displayName}</p>
          <p className="text-[7px] font-black uppercase tracking-widest text-yellow-500">{role}</p>
        </div>
      </div>
    </>
  );
};
