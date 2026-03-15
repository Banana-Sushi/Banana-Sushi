'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { MenuCard } from '@/components/MenuCard';
import { MenuItemModal } from '@/components/MenuItemModal';
import { MenuItem } from '@/types';

const DEFAULTS = {
  hero_title: 'FRISCHES SUSHI.',
  hero_subtitle_de: 'Banana Sushi kombiniert traditionelle Handwerkskunst mit modernem Flair. Exklusiv als Lieferservice.',
  hero_subtitle_en: 'Banana Sushi combines traditional craftsmanship with modern flair. Delivery exclusive.',
  hero_image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=1600',
  about_heading: 'Passion on a plate.',
  about_text_de: '„Qualität, die man schmeckt. Leidenschaft, die man sieht. Sushi, das man liebt. BANANA Sushi steht für kreative Fusionen und absolute Frische."',
  about_text_en: '"Quality you can taste. Passion you can see. Sushi you will love. BANANA Sushi stands for creative fusions and absolute freshness."',
  about_image: 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?auto=format&fit=crop&q=80&w=1200',
  gallery_subtitle: 'Art on a plate',
  gallery_1: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&q=80&w=800',
  gallery_2: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=800',
  gallery_3: 'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?auto=format&fit=crop&q=80&w=800',
  gallery_4: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800',
  contact_address: 'Sushi-Allee 42, 10115 Berlin',
  contact_hours: 'Daily 12:00 – 22:00',
  contact_phone: '+49 (0) 30 123 456 78',
};

function c(content: Record<string, string>, key: keyof typeof DEFAULTS): string {
  return content[key] || DEFAULTS[key];
}

export const HomePageClient = ({
  featuredItems,
  content,
}: {
  featuredItems: MenuItem[];
  content: Record<string, string>;
}) => {
  const { t, lang, addToast } = useAppContext();
  const pathname = usePathname();
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      if (!res.ok) throw new Error('Failed to send message');
      setContactSent(true);
      setContactForm({ name: '', email: '', message: '' });
    } catch {
      addToast('Failed to send message. Please try again.', 'error');
    } finally {
      setContactLoading(false);
    }
  };

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

  const heroSubtitle = lang === 'de' ? c(content, 'hero_subtitle_de') : c(content, 'hero_subtitle_en');
  const aboutText = lang === 'de' ? c(content, 'about_text_de') : c(content, 'about_text_en');

  return (
    <div className="animate-fade-in pt-[56px] md:pt-[68px]">
      {/* Hero */}
      <section id="hero" className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src={c(content, 'hero_image')}
            alt="Sushi"
            fill
            className="object-cover brightness-[0.3]"
            priority
          />
        </div>
        <div className="relative z-10 text-center text-white px-4 max-w-6xl">
          <h1 className="text-4xl md:text-[8rem] font-black tracking-tighter leading-[0.85] uppercase mb-8 md:mb-10">
            {c(content, 'hero_title')}<span className="text-yellow-500">.</span>
          </h1>
          <p className="text-sm md:text-xl font-bold text-gray-300 max-w-xl mx-auto mb-10 md:mb-14 uppercase leading-relaxed">
            {heroSubtitle}
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
            {featuredItems.map(item => <MenuCard key={item.id} item={item} onOpenDetail={setSelectedItem} />)}
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
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="relative h-80 md:h-[480px] rounded-[3rem] overflow-hidden">
            <Image
              src={c(content, 'about_image')}
              alt="Sushi chef"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div>
            <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] mb-6">{t.nav.about}</p>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-8 leading-none">
              {c(content, 'about_heading')}<span className="text-yellow-500">.</span>
            </h2>
            <p className="text-lg text-gray-400 font-bold leading-relaxed italic uppercase tracking-tight">
              {aboutText}
            </p>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="py-24 px-4 md:px-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black uppercase mb-4 tracking-tighter">{t.nav.gallery}</h2>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">{c(content, 'gallery_subtitle')}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {(['gallery_1', 'gallery_2', 'gallery_3', 'gallery_4'] as const).map((key, i) => (
              <div key={i} className="relative h-64 md:h-80 rounded-[2rem] overflow-hidden">
                <Image src={c(content, key)} alt="Gallery" fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
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
                <p className="text-lg md:text-xl text-black">{c(content, 'contact_address')}</p>
              </div>
              <div>
                <p className="text-gray-300 mb-2">{t.home.openingHours}</p>
                <p className="text-lg md:text-xl text-black whitespace-pre-line">{c(content, 'contact_hours')}</p>
              </div>
              <div>
                <p className="text-gray-300 mb-2">Phone</p>
                <p className="text-lg md:text-xl text-black">{c(content, 'contact_phone')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-sm border border-gray-100">
            {contactSent ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em]">Message Sent!</p>
                <p className="font-bold text-sm text-gray-400">We&apos;ll get back to you soon.</p>
                <button onClick={() => setContactSent(false)} className="text-[10px] font-black uppercase tracking-widest border-b-2 border-black pb-0.5 hover:text-yellow-500 hover:border-yellow-500 transition-all">
                  Send another
                </button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleContactSubmit}>
                <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] mb-6">Send us a message</p>
                <input
                  required
                  placeholder="Name"
                  value={contactForm.name}
                  onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-xs"
                />
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={contactForm.email}
                  onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-xs"
                />
                <textarea
                  required
                  placeholder="Message"
                  rows={4}
                  value={contactForm.message}
                  onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-xs resize-none"
                />
                <button
                  type="submit"
                  disabled={contactLoading}
                  className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {contactLoading ? '...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {selectedItem && (
        <MenuItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
};
