'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Icons } from './Icons';

const CONTACT_DEFAULTS = {
  contact_address: 'Sushi-Allee 42, 10115 Berlin',
  contact_hours: 'Daily 12:00 – 22:00',
  contact_phone: '+49 (0) 30 123 456 78',
};

export const Footer = () => {
  const { t } = useAppContext();
  const pathname = usePathname();
  const [contact, setContact] = useState(CONTACT_DEFAULTS);

  useEffect(() => {
    fetch('/api/content')
      .then(r => r.json())
      .then(data => {
        setContact({
          contact_address: data.contact_address || CONTACT_DEFAULTS.contact_address,
          contact_hours: data.contact_hours || CONTACT_DEFAULTS.contact_hours,
          contact_phone: data.contact_phone || CONTACT_DEFAULTS.contact_phone,
        });
      })
      .catch(() => {});
  }, []);

  if (pathname.startsWith('/dashboard')) return null;

  return (
    <footer className="bg-black text-white print:hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-20 pt-20 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-16">
          {/* Col 1 — Brand */}
          <div className="space-y-6">
            <Link href="/">
              <Image src="/logo.png" alt="Banana Sushi" width={160} height={50} className="h-14 w-auto" />
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
          </div>

          {/* Col 3 — Contact & Hours */}
          <div className="space-y-6">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500">Contact</p>
            <div className="space-y-4 text-sm font-bold text-gray-400 uppercase tracking-widest">
              <div>
                <p className="text-[9px] text-gray-600 mb-1">Address</p>
                <p className="text-white">{contact.contact_address}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-600 mb-1">Phone</p>
                <p className="text-white">{contact.contact_phone}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-600 mb-1">{t.home.openingHours}</p>
                <p className="text-white">{contact.contact_hours}</p>
              </div>
            </div>
          </div>
        </div>


        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
            © {new Date().getFullYear()} Banana Sushi · {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
};
