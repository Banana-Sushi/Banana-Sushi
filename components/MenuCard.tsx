'use client';

import Image from 'next/image';
import { MenuItem, getDiscountedPrice } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { Icons } from './Icons';

interface Props {
  item: MenuItem;
  onOpenDetail?: (item: MenuItem) => void;
}

export const MenuCard = ({ item, onOpenDetail }: Props) => {
  const { addToCart, lang, t } = useAppContext();
  const discountedPrice = getDiscountedPrice(item);
  const hasDiscount = discountedPrice < item.price;
  const hasAddons =
    (item.addonsOptional?.length ?? 0) > 0 ||
    (item.addonsMandatory?.length ?? 0) > 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasAddons) {
      onOpenDetail?.(item);
    } else {
      addToCart(item);
    }
  };

  return (
    <div
      className="group bg-white rounded-[2rem] border border-gray-100 overflow-hidden hover:shadow-xl transition-all animate-zoom-in flex flex-col h-full cursor-pointer"
      onClick={() => onOpenDetail?.(item)}
    >
      <div className="relative h-56 md:h-64 overflow-hidden shrink-0">
        <Image
          src={item.image}
          alt={item.name[lang]}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        {/* Discount overlay banner */}
        {hasDiscount && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-yellow-400 to-yellow-400/90 py-3 px-4 flex items-center justify-between">
            <span className="text-black font-black text-sm uppercase tracking-tight">
              {item.discountType === 'percentage'
                ? `${item.discountValue}% OFF`
                : `-${item.discountValue?.toFixed(2)}€`}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-black/50 font-black text-xs line-through">{item.price.toFixed(2)}€</span>
              <span className="text-black font-black text-base">{discountedPrice.toFixed(2)}€</span>
            </div>
          </div>
        )}
        {/* Price badge — shown only when no discount */}
        {!hasDiscount && (
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm">
            <span className="text-[10px] font-black">{discountedPrice.toFixed(2)}€</span>
          </div>
        )}
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-xl font-black uppercase tracking-tight mb-2 truncate">{item.name[lang]}</h3>
        <p className="text-gray-400 font-bold text-xs mb-6 line-clamp-2 uppercase tracking-tight leading-relaxed flex-1">
          {item.description[lang]}
        </p>
        <button
          onClick={handleAddToCart}
          className="w-full bg-black text-white py-4 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-yellow-500 hover:text-black transition-all flex items-center justify-center gap-2"
        >
          <Icons.Plus /> {hasAddons ? (lang === 'de' ? 'Optionen wählen' : 'Choose Options') : t.menu.addToCart}
        </button>
      </div>
    </div>
  );
};
