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
      className="group h-full cursor-pointer overflow-hidden rounded-[2rem] border border-gray-200 bg-white text-slate-900 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
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

      <div className="flex flex-col gap-4 p-5 md:hidden">
        <div className="relative h-40 w-full overflow-hidden rounded-[2rem] bg-gray-100">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name[lang]}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-200">
              <span className="text-5xl text-gray-400">🍽</span>
            </div>
          )}
          {hasDiscount && !isTwoForOne && (
            <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-500 shadow-sm">
              {discountLabel}
            </div>
          )}
          {isTwoForOne && (
            <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-500 shadow-sm">
              {discountLabel}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex rounded-full bg-black/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              {item.category}
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 line-clamp-2">
              {item.name[lang]}
            </h3>
            <p className="mt-3 text-sm font-bold uppercase leading-relaxed tracking-tight text-slate-500 line-clamp-2">
              {item.description[lang]}
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <div>
              {hasDiscount ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-400 line-through">{item.price.toFixed(2)}€</span>
                  <span className="text-lg font-black text-slate-900">{discountedPrice.toFixed(2)}€</span>
                </div>
              ) : (
                <span className="text-lg font-black text-slate-900">{item.price.toFixed(2)}€</span>
              )}
            </div>
            <button
              onClick={handleAddToCart}
              className="rounded-full bg-black px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white transition-all hover:bg-yellow-400 hover:text-black"
            >
              {hasAddons ? (lang === 'de' ? 'Optionen wählen' : 'Choose Options') : t.menu.addToCart}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
