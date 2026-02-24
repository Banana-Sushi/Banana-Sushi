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
    <footer className="bg-black text-white print:hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-20 pt-20 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-16">
          {/* Col 1 — Brand */}
          <div className="space-y-6">
            <Link href="/" className="text-2xl font-black uppercase tracking-tighter">
              BANANA SUSHI<span className="text-yellow-500">.</span>
            </Link>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-widest leading-relaxed max-w-xs">
              Creative fusions. Absolute freshness. Delivered straight to your door.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-yellow-500 hover:text-black transition-all">
                <Icons.Instagram />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-yellow-500 hover:text-black transition-all">
                <Icons.Facebook />
              </a>
            </div>
          </div>

          {/* Col 2 — Navigation */}
          <div className="space-y-6">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500">Navigation</p>
            <ul className="space-y-3">
              {[
                { href: '/', label: t.nav.home },
                { href: '/menu', label: t.nav.menu },
                { href: '/#about', label: t.nav.about },
                { href: '/#contact', label: t.nav.contact },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-gray-400 font-bold text-sm uppercase tracking-widest hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="pt-2 border-t border-white/10 space-y-3">
              <Link href="/impressum" className="block text-gray-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">
                {t.footer.impressum}
              </Link>
              <Link href="/datenschutz" className="block text-gray-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">
                {t.footer.privacy}
              </Link>
            </div>
          </div>

          {/* Col 3 — Contact & Hours */}
          <div className="space-y-6">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500">Contact</p>
            <div className="space-y-4 text-sm font-bold text-gray-400 uppercase tracking-widest">
              <div>
                <p className="text-[9px] text-gray-600 mb-1">Address</p>
                <p className="text-white">Sushi-Allee 42</p>
                <p className="text-white">10115 Berlin</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-600 mb-1">Phone</p>
                <p className="text-white">+49 (0) 30 123 456 78</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-600 mb-1">{t.home.openingHours}</p>
                <p className="text-white">Daily 12:00 – 22:00</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
            © {new Date().getFullYear()} Banana Sushi · {t.footer.rights}
          </p>
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
            Made with ❤ in Berlin
          </p>
        </div>
      </div>
    </footer>
  );
};
