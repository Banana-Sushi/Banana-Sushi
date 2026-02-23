'use client';

import Image from 'next/image';
import { MenuItem } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { Icons } from './Icons';

export const MenuCard = ({ item }: { item: MenuItem }) => {
  const { addToCart, lang, t } = useAppContext();
  return (
    <div className="group bg-white rounded-[2rem] border border-gray-100 overflow-hidden hover:shadow-xl transition-all animate-zoom-in flex flex-col h-full">
      <div className="relative h-56 md:h-64 overflow-hidden shrink-0">
        <Image
          src={item.image}
          alt={item.name[lang]}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black shadow-sm">
          {item.price.toFixed(2)}€
        </div>
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-xl font-black uppercase tracking-tight mb-2 truncate">{item.name[lang]}</h3>
        <p className="text-gray-400 font-bold text-xs mb-6 line-clamp-2 uppercase tracking-tight leading-relaxed flex-1">
          {item.description[lang]}
        </p>
        <button
          onClick={() => addToCart(item)}
          className="w-full bg-black text-white py-4 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-yellow-500 hover:text-black transition-all flex items-center justify-center gap-2"
        >
          <Icons.Plus /> {t.menu.addToCart}
        </button>
      </div>
    </div>
  );
};
