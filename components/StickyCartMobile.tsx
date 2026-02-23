'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Icons } from './Icons';

export const StickyCartMobile = () => {
  const { cart, t } = useAppContext();
  const pathname = usePathname();
  const totalItems = cart.reduce((acc, c) => acc + c.quantity, 0);

  if (totalItems === 0 || pathname.startsWith('/dashboard') || pathname === '/order') return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-[90] lg:hidden animate-slide-up print:hidden">
      <Link href="/order" className="bg-black text-white p-5 rounded-[2rem] flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="bg-yellow-500 text-black w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs">
            {totalItems}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">{t.nav.orderNow}</span>
        </div>
        <Icons.ChevronRight />
      </Link>
    </div>
  );
};
