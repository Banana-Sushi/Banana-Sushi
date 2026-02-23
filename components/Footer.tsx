'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Icons } from './Icons';

export const Footer = () => {
  const { t } = useAppContext();
  const pathname = usePathname();
  if (pathname.startsWith('/dashboard')) return null;

  return (
    <footer className="bg-white border-t border-gray-100 py-20 px-4 md:px-20 print:hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
        <div className="text-center md:text-left">
          <Link href="/" className="text-xl font-black uppercase">
            BANANA SUSHI<span className="text-yellow-500">.</span>
          </Link>
          <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-6">
            © {new Date().getFullYear()} {t.footer.rights}
          </p>
        </div>
        <div className="flex gap-4">
          <a href="#" className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center hover:bg-black hover:text-white transition-all">
            <Icons.Facebook />
          </a>
          <a href="#" className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center hover:bg-black hover:text-white transition-all">
            <Icons.Instagram />
          </a>
        </div>

      </div>
    </footer>
  );
};
