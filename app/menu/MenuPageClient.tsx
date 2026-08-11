'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { MenuCard } from '@/components/MenuCard';
import { MenuItemModal } from '@/components/MenuItemModal';
import { Icons } from '@/components/Icons';
import { MenuItem } from '@/types';

export const MenuPageClient = ({ items, categoryOrder }: { items: MenuItem[]; categoryOrder: string[] }) => {
  const { t, lang } = useAppContext();
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const categoryBarAnchorRef = useRef<HTMLDivElement | null>(null);
  const isFirstRender = useRef(true);
  const endOfListRef = useRef<HTMLDivElement | null>(null);
  const hasLeftTopRef = useRef(false);

  const categories = useMemo(() => {
    const present = new Set(items.map((m) => m.category).filter(Boolean));
    const ordered = categoryOrder.filter((c) => present.has(c));
    const unordered = Array.from(present).filter((c) => !categoryOrder.includes(c));
    return [...ordered, ...unordered];
  }, [items, categoryOrder]);
  const [activeCategory, setActiveCategory] = useState(() => categories[0] ?? '');
  const filtered = useMemo(
    () => items.filter((m) => m.category === activeCategory),
    [activeCategory, items],
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const anchor = categoryBarAnchorRef.current;
    if (!anchor) return;

    const anchorTop = anchor.getBoundingClientRect().top + window.scrollY;
    if (window.scrollY > anchorTop) {
      window.scrollTo({ top: anchorTop, behavior: 'smooth' });
    }
  }, [activeCategory]);

  useEffect(() => {
    hasLeftTopRef.current = false;
    const node = endOfListRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          hasLeftTopRef.current = true;
          return;
        }

        if (!hasLeftTopRef.current) return;

        const currentIndex = categories.indexOf(activeCategory);
        if (currentIndex < categories.length - 1) {
          setActiveCategory(categories[currentIndex + 1]);
        }
      },
      { threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [activeCategory, categories]);

  return (
    <div className="pt-[100px] md:pt-[130px] px-4 md:px-20 pb-32 animate-fade-in">
      <div className="max-w-7xl mx-auto mb-8 md:mb-12">
        <Link href="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
          <Icons.ArrowLeft /> {lang === 'de' ? 'Zurück' : 'Back'}
        </Link>
      </div>

      <div className="text-center mb-10 md:mb-16">
        <h2 className="text-4xl sm:text-5xl md:text-[6rem] lg:text-[8rem] font-black uppercase mb-8 md:mb-10 tracking-tighter leading-none">
          {t.menu.title}
        </h2>
      </div>

      <div ref={categoryBarAnchorRef} />

      {/* Desktop / tablet pill filter */}
      <div className="sticky top-0 z-50 mx-auto mb-16 hidden w-full max-w-5xl px-20 py-2 md:block">
        <div className="rounded-full border border-gray-200 bg-white/95 p-2 shadow-lg backdrop-blur-md">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((category) => {
              const isActive = activeCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`whitespace-nowrap rounded-full px-6 py-3 text-[10px] font-black uppercase tracking-[0.25em] transition-all duration-300 ${
                    isActive
                      ? 'bg-black text-white shadow-md'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-black'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile underline tab filter */}
      <div className="sticky top-0 z-50 -mx-4 mb-4 border-b border-gray-200 bg-white/95 px-4 backdrop-blur-md md:hidden">
        <div className="flex gap-6 overflow-x-auto scrollbar-hide">
          {categories.map((category) => {
            const isActive = activeCategory === category;
            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`whitespace-nowrap border-b-2 py-4 text-xs font-black uppercase tracking-wide transition-colors duration-200 ${
                  isActive ? 'border-black text-black' : 'border-transparent text-gray-400'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4 px-1 md:hidden">
        <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-900">{activeCategory}</h3>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-0 md:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((item) => (
          <MenuCard key={item.id} item={item} onOpenDetail={setSelectedItem} />
        ))}
      </div>

      <div ref={endOfListRef} />

      {filtered.length === 0 && (
        <p className="py-20 text-center text-lg font-black uppercase tracking-[0.3em] text-gray-300">
          {lang === 'de' ? 'Keine Artikel verfügbar' : 'No items available'}
        </p>
      )}

      {selectedItem && <MenuItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  );
};
