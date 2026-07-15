'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { MenuCard } from '@/components/MenuCard';
import { MenuItemModal } from '@/components/MenuItemModal';
import { Icons } from '@/components/Icons';
import { MenuItem } from '@/types';

export const MenuPageClient = ({ items }: { items: MenuItem[] }) => {
  const { t, lang } = useAppContext();
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isFilterFixed, setIsFilterFixed] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const lastScrollTop = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      const isDown = currentScroll > lastScrollTop.current;
      if (isDown && currentScroll > 80) {
        setIsFilterFixed(true);
      } else if (!isDown) {
        setIsFilterFixed(false);
      }
      lastScrollTop.current = currentScroll;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const categories = useMemo(() => ['All', ...Array.from(new Set(items.map((m) => m.category).filter(Boolean)))], [items]);
  const filtered = useMemo(
    () => (activeCategory === 'All' ? items : items.filter((m) => m.category === activeCategory)),
    [activeCategory, items],
  );

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const deltaX = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(deltaX) < 60) {
      touchStartX.current = null;
      return;
    }

    const currentIndex = categories.indexOf(activeCategory);
    if (deltaX < 0 && currentIndex < categories.length - 1) {
      setActiveCategory(categories[currentIndex + 1]);
    } else if (deltaX > 0 && currentIndex > 0) {
      setActiveCategory(categories[currentIndex - 1]);
    }

    touchStartX.current = null;
  };

  return (
    <div
      className="pt-[100px] md:pt-[130px] px-4 md:px-20 pb-32 animate-fade-in"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="max-w-7xl mx-auto mb-8 md:mb-12">
        <Link href="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
          <Icons.ArrowLeft /> {lang === 'de' ? 'Zurück' : 'Back'}
        </Link>
      </div>

      <div className="text-center mb-10 md:mb-16">
        <h2 className="text-4xl sm:text-5xl md:text-[6rem] lg:text-[8rem] font-black uppercase mb-8 md:mb-10 tracking-tighter leading-none">
          {t.menu.title}
        </h2>
        <p className="text-sm text-gray-400 font-medium uppercase tracking-[0.3em] mb-6 md:hidden">
          {lang === 'de' ? 'Wische nach links oder rechts, um Kategorien zu wechseln' : 'Swipe left or right to browse categories'}
        </p>

        <div className="relative">
          <div
            className={`left-0 right-0 mx-auto w-full max-w-5xl px-4 md:px-20 transition-all duration-300 ease-out ${
              isFilterFixed ? 'fixed top-0 z-50' : 'relative'
            }`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="rounded-full border border-gray-200 bg-white/95 p-2 shadow-lg backdrop-blur-md">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {categories.map((category) => {
                  const isActive = activeCategory === category;
                  return (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`whitespace-nowrap rounded-full px-4 py-3 text-[10px] font-black uppercase tracking-[0.25em] transition-all duration-300 md:px-6 ${
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

          {isFilterFixed && <div className="h-[90px] md:h-[90px]" />}
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((item) => (
          <MenuCard key={item.id} item={item} onOpenDetail={setSelectedItem} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-20 text-center text-lg font-black uppercase tracking-[0.3em] text-gray-300">
          {lang === 'de' ? 'Keine Artikel verfügbar' : 'No items available'}
        </p>
      )}

      {selectedItem && <MenuItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  );
};
