'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { MenuItem } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { Icons } from './Icons';

interface Props {
  item: MenuItem;
  onClose: () => void;
}

export const MenuItemModal = ({ item, onClose }: Props) => {
  const { lang, t, addToCart, addToast } = useAppContext();

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleAdd = () => {
    addToCart(item);
    addToast(`${item.name[lang]} added to cart`, 'success');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-zoom-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative h-64 w-full">
          <Image
            src={item.image}
            alt={item.name[lang]}
            fill
            className="object-cover"
            sizes="448px"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center hover:bg-white transition-all shadow-lg"
          >
            <Icons.Close />
          </button>
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-sm font-black shadow-sm">
            {item.price.toFixed(2)}€
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <p className="text-[9px] font-black text-yellow-500 uppercase tracking-[0.3em] mb-2">{item.category}</p>
          <h2 className="text-2xl font-black uppercase tracking-tight mb-3">{item.name[lang]}</h2>
          <p className="text-gray-400 font-bold text-sm leading-relaxed uppercase tracking-tight mb-8">
            {item.description[lang]}
          </p>
          <button
            onClick={handleAdd}
            className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-yellow-500 hover:text-black transition-all flex items-center justify-center gap-2"
          >
            <Icons.Plus /> {t.menu.addToCart}
          </button>
        </div>
      </div>
    </div>
  );
};
