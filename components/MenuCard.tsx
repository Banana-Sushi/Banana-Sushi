'use client';

import Image from 'next/image';
import { MenuItem, getDiscountedPrice, getAppliedItemDiscount } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { Icons } from './Icons';

interface Props {
  item: MenuItem;
  onOpenDetail?: (item: MenuItem) => void;
}

export const MenuCard = ({ item, onOpenDetail }: Props) => {
  const { addToCart, lang, t, discounts } = useAppContext();
  const appliedDiscount = getAppliedItemDiscount(item, discounts);
  const discountedPrice = getDiscountedPrice(item, discounts);
  const isTwoForOne = appliedDiscount?.discountType === 'two_for_one';
  const hasDiscount = appliedDiscount !== null && (discountedPrice < item.price || isTwoForOne);

  let discountLabel = '';
  if (appliedDiscount) {
    if (appliedDiscount.discountType === 'percentage') {
      discountLabel = `${appliedDiscount.discountValue}% OFF`;
    } else if (appliedDiscount.discountType === 'fixed') {
      discountLabel = `-${appliedDiscount.discountValue?.toFixed(2)}€`;
    } else if (appliedDiscount.discountType === 'two_for_one') {
      discountLabel = lang === 'de' ? '2×1' : '2 for 1';
    }
  }

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
      className="group h-full cursor-pointer overflow-hidden text-slate-900 transition-all duration-300 md:rounded-[2rem] md:border md:border-gray-200 md:bg-white md:shadow-sm md:hover:-translate-y-1 md:hover:shadow-xl"
      onClick={() => onOpenDetail?.(item)}
    >
      <div className="hidden md:block">
        <div className="relative h-56 overflow-hidden">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name[lang]}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100">
              <span className="text-5xl text-gray-400">🍽</span>
            </div>
          )}
          {hasDiscount && !isTwoForOne && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-yellow-400 to-yellow-400/90 py-3 px-4 flex items-center justify-between">
              <span className="text-black font-black text-sm uppercase tracking-tight">
                {discountLabel}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-black/50 font-black text-xs line-through">{item.price.toFixed(2)}€</span>
                <span className="text-black font-black text-base">{discountedPrice.toFixed(2)}€</span>
              </div>
            </div>
          )}
          {isTwoForOne && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-yellow-400 to-yellow-400/90 py-3 px-4 flex items-center justify-between">
              <span className="text-black font-black text-sm uppercase tracking-tight">{discountLabel}</span>
              <span className="text-black font-black text-base">{item.price.toFixed(2)}€</span>
            </div>
          )}
          {!hasDiscount && (
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm">
              <span className="text-[10px] font-black">{item.price.toFixed(2)}€</span>
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

      <div className="flex items-center gap-4 border-b border-gray-100 py-5 md:hidden">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-black uppercase tracking-tight text-slate-900">
            {item.name[lang]}
          </h3>
          <p className="mt-1 line-clamp-1 text-xs font-semibold text-gray-400">
            {item.description[lang]}
          </p>
          <div className="mt-2">
            {hasDiscount ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-gray-300 line-through">{item.price.toFixed(2)}€</span>
                <span className="text-sm font-black text-amber-600">{discountedPrice.toFixed(2)}€</span>
              </div>
            ) : (
              <span className="text-sm font-black text-amber-600">{item.price.toFixed(2)}€</span>
            )}
          </div>
        </div>

        <div className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-2xl bg-yellow-50">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name[lang]}
              fill
              className="object-cover"
              sizes="112px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl text-gray-300">🍽</div>
          )}
          {(hasDiscount || isTwoForOne) && (
            <div className="absolute left-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-[8px] font-black uppercase tracking-tight text-yellow-500 shadow-sm">
              {discountLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
