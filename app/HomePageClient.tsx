'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { MenuCard } from '@/components/MenuCard';
import { MenuItem } from '@/types';

export const HomePageClient = ({ featuredItems }: { featuredItems: MenuItem[] }) => {
  const { t } = useAppContext();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.replace('#', '');
        setTimeout(() => {
          const el = document.getElementById(id);
          if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
        }, 100);
      }
    }
  }, [pathname]);

  return (
    <div className="animate-fade-in pt-[60px] md:pt-[80px]">
      {/* Hero */}
      <section id="hero" className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=1600"
            alt="Sushi"
            fill
            className="object-cover brightness-[0.3]"
            priority
          />
        </div>
        <div className="relative z-10 text-center text-white px-4 max-w-6xl">
          <h1 className="text-4xl md:text-[8rem] font-black tracking-tighter leading-[0.85] uppercase mb-8 md:mb-10">
            FRISCHES SUSHI<span className="text-yellow-500">.</span>
          </h1>
          <p className="text-sm md:text-xl font-bold text-gray-300 max-w-xl mx-auto mb-10 md:mb-14 uppercase leading-relaxed">
            {t.home.heroSub}
          </p>
          <Link href="/menu" className="inline-block bg-white text-black px-10 md:px-14 py-4 md:py-6 rounded-full text-[10px] font-black uppercase tracking-[0.3em] hover:bg-yellow-500 transition-all shadow-2xl">
            {t.home.viewMenu}
          </Link>
        </div>
      </section>

      {/* Menu Highlights */}
      <section id="menu-highlights" className="py-24 px-4 md:px-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black uppercase mb-4 tracking-tighter">{t.menu.title}</h2>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">{t.menu.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
            {featuredItems.map(item => <MenuCard key={item.id} item={item} />)}
          </div>
          <div className="mt-16 text-center">
            <Link href="/menu" className="inline-block bg-black text-white px-10 md:px-14 py-4 md:py-6 rounded-full text-[10px] font-black uppercase tracking-[0.3em] hover:bg-yellow-500 hover:text-black transition-all shadow-xl">
              {t.home.viewMenu} →
            </Link>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-24 px-4 md:px-20 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-10">{t.nav.about}</h2>
          <p className="text-lg md:text-2xl text-gray-400 font-bold leading-relaxed italic uppercase tracking-tight">
            &ldquo;Qualität, die man schmeckt. Leidenschaft, die man sieht. Sushi, das man liebt. BANANA Sushi steht für kreative Fusionen und absolute Frische.&rdquo;
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="py-24 px-4 md:px-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black uppercase mb-4 tracking-tighter">{t.nav.gallery}</h2>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Art on a plate</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&q=80&w=800',
              'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=800',
              'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?auto=format&fit=crop&q=80&w=800',
              'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800',
            ].map((src, i) => (
              <div key={i} className="relative h-64 md:h-80 rounded-[2rem] overflow-hidden">
                <Image src={src} alt="Gallery" fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-24 px-4 md:px-20 bg-gray-50">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 md:gap-24">
          <div className="space-y-12">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">{t.nav.contact}</h2>
            <div className="space-y-6 uppercase font-black tracking-widest text-[10px]">
              <div>
                <p className="text-gray-300 mb-2">{t.home.address}</p>
                <p className="text-lg md:text-xl text-black">Sushi-Allee 42, 10115 Berlin</p>
              </div>
              <div>
                <p className="text-gray-300 mb-2">{t.home.openingHours}</p>
                <p className="text-lg md:text-xl text-black">Daily 12:00 – 22:00</p>
              </div>
              <div>
                <p className="text-gray-300 mb-2">Phone</p>
                <p className="text-lg md:text-xl text-black">+49 (0) 30 123 456 78</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-sm border border-gray-100">
            <form className="space-y-4" onSubmit={e => e.preventDefault()}>
              <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] mb-6">Send us a message</p>
              <input required placeholder="Name" className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-xs" />
              <input required type="email" placeholder="Email" className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-xs" />
              <textarea required placeholder="Message" rows={4} className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-xs resize-none" />
              <button type="submit" className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-yellow-500 hover:text-black transition-all">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};
