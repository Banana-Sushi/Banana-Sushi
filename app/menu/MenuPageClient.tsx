'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { MenuCard } from '@/components/MenuCard';
import { MenuItemModal } from '@/components/MenuItemModal';
import { Icons } from '@/components/Icons';
import { MenuItem } from '@/types';

export const MenuPageClient = ({ items }: { items: MenuItem[] }) => {
  const { t } = useAppContext();
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const categories = ['All', ...Array.from(new Set(items.map(m => m.category)))];
  const filtered = activeCategory === 'All' ? items : items.filter(m => m.category === activeCategory);

  return (
    <div className="pt-[100px] md:pt-[130px] px-4 md:px-20 pb-32 animate-fade-in">
      <div className="max-w-7xl mx-auto mb-12">
        <Link href="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
          <Icons.ArrowLeft /> Back
        </Link>
      </div>
      <div className="text-center mb-20">
        <h2 className="text-5xl md:text-[8rem] font-black uppercase mb-10 tracking-tighter leading-none">{t.menu.title}</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === c ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 max-w-[1600px] mx-auto">
        {filtered.map(item => (
          <MenuCard key={item.id} item={item} onOpenDetail={setSelectedItem} />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-center text-gray-300 font-black uppercase tracking-widest py-20">No items available</p>
      )}

      {selectedItem && (
        <MenuItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
};
