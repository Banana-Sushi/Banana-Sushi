'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Icons } from './Icons';

export const Navbar = () => {
  const { lang, setLang, t, cart } = useAppContext();
  const pathname = usePathname();
  const isDashboard = pathname.startsWith('/dashboard');

  // No navbar on login page — standalone full-screen form
  if (pathname === '/dashboard/login') return null;

  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const totalItems = cart.reduce((acc, c) => acc + c.quantity, 0);

  useEffect(() => {
    if (isDashboard) { setIsVisible(true); return; }
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsVisible(currentScrollY <= lastScrollY || currentScrollY <= 100);
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isDashboard]);

  const scrollTo = (id: string) => {
    if (pathname !== '/') { window.location.href = `/#${id}`; return; }
    const el = document.getElementById(id);
    if (el) {
      const offset = 80;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
    }
  };

  return (
    <nav
      style={{ transform: `translateY(${isVisible ? '0' : '-100%'})` }}
      className={`bg-white/95 backdrop-blur-md border-b border-gray-100 fixed top-0 right-0 z-50 px-4 md:px-12 py-2 md:py-3 flex justify-between items-center transition-transform duration-300 shadow-sm print:hidden ${isDashboard ? 'lg:left-24 left-0' : 'left-0'}`}
    >
      <Link href="/">
        <Image src="/logo.png" alt="Banana Sushi" width={240} height={60} className="h-12 md:h-16 w-auto" priority />
      </Link>

      <div className="flex-1 hidden md:flex items-center justify-center mx-4">
        <div className="flex items-center gap-8 lg:gap-12">
          {!isDashboard ? (
            <>
              <Link href="/menu" className="text-[11px] font-black text-gray-400 hover:text-black transition-colors uppercase tracking-[0.2em]">{t.nav.menu}</Link>
              <button onClick={() => scrollTo('about')} className="text-[11px] font-black text-gray-400 hover:text-black transition-colors uppercase tracking-[0.2em]">{t.nav.about}</button>
              <button onClick={() => scrollTo('gallery')} className="text-[11px] font-black text-gray-400 hover:text-black transition-colors uppercase tracking-[0.2em]">{t.nav.gallery}</button>
              <button onClick={() => scrollTo('contact')} className="text-[11px] font-black text-gray-400 hover:text-black transition-colors uppercase tracking-[0.2em]">{t.nav.contact}</button>
            </>
          ) : (
            <div className="flex items-center gap-8">
              <Link href="/dashboard/orders" className={`text-[11px] font-black uppercase tracking-[0.2em] ${pathname === '/dashboard/orders' ? 'text-black' : 'text-gray-300 hover:text-black'}`}>{t.dashboard.orders}</Link>
              <Link href="/dashboard/history" className={`text-[11px] font-black uppercase tracking-[0.2em] ${pathname === '/dashboard/history' ? 'text-black' : 'text-gray-300 hover:text-black'}`}>{t.dashboard.history}</Link>
              <Link href="/dashboard/stats" className={`text-[11px] font-black uppercase tracking-[0.2em] ${pathname === '/dashboard/stats' ? 'text-black' : 'text-gray-300 hover:text-black'}`}>{t.dashboard.stats}</Link>
              <Link href="/dashboard/menu" className={`text-[11px] font-black uppercase tracking-[0.2em] ${pathname === '/dashboard/menu' ? 'text-black' : 'text-gray-300 hover:text-black'}`}>{t.dashboard.menuMgmt}</Link>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <button onClick={() => setLang(lang === 'de' ? 'en' : 'de')} className="text-[11px] font-black text-gray-400 hover:text-black uppercase tracking-[0.2em] p-1.5 transition-colors">
          {lang === 'de' ? 'EN' : 'DE'}
        </button>
        {!isDashboard && (
          <Link href="/order" className="group relative bg-black text-white px-5 md:px-7 py-2.5 md:py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500 hover:text-black transition-all flex items-center gap-2">
            <Icons.Cart />
            <span className="hidden sm:inline">{t.nav.orderNow}</span>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[9px] w-5 h-5 flex items-center justify-center rounded-full font-black border-2 border-white">
                {totalItems}
              </span>
            )}
          </Link>
        )}
      </div>
    </nav>
  );
};
