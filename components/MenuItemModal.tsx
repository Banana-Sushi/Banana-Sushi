'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Addon, MenuItem, getDiscountedPrice, getAppliedItemDiscount } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { Icons } from './Icons';

interface Props {
  item: MenuItem;
  onClose: () => void;
}

export const MenuItemModal = ({ item, onClose }: Props) => {
  const { lang, t, addToCart, discounts } = useAppContext();
  const [selectedOptional, setSelectedOptional] = useState<Addon[]>([]);
  const [selectedMandatory, setSelectedMandatory] = useState<Addon[]>([]);
  const [validationError, setValidationError] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    setQuantity(1);
    setSelectedOptional([]);
    setSelectedMandatory([]);
    setValidationError('');
  }, [item]);

  const appliedDiscount = getAppliedItemDiscount(item, discounts);
  const discountedBase = getDiscountedPrice(item, discounts);
  const hasDiscount = discountedBase < item.price;
  const addonTotal =
    selectedMandatory.reduce((s, a) => s + a.price, 0) +
    selectedOptional.reduce((s, a) => s + a.price, 0);
  const totalPrice = (discountedBase + addonTotal) * quantity;

  const hasMandatory = (item.addonsMandatory?.length ?? 0) > 0;
  const hasOptional = (item.addonsOptional?.length ?? 0) > 0;

  const toggleAddon = (addon: Addon, list: Addon[], setList: React.Dispatch<React.SetStateAction<Addon[]>>) => {
    setList((prev) =>
      prev.some((a) => a.name === addon.name)
        ? prev.filter((a) => a.name !== addon.name)
        : [...prev, addon],
    );
  };

  const handleAdd = () => {
    if (hasMandatory && selectedMandatory.length === 0) {
      setValidationError(lang === 'de' ? 'Bitte wähle mindestens eine Option.' : 'Please select at least one option.');
      return;
    }
    setValidationError('');
    addToCart(item, selectedOptional, selectedMandatory, quantity);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-56 w-full shrink-0">
          {item.image ? (
            <Image src={item.image} alt={item.name[lang]} fill className="object-cover" sizes="448px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100">
              <span className="text-5xl text-gray-300">🍽</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 shadow-lg backdrop-blur-md transition-all hover:bg-white"
          >
            <Icons.Close />
          </button>
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-xl bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur-md">
            {hasDiscount && <span className="text-[9px] text-gray-400 line-through">{item.price.toFixed(2)}€</span>}
            <span className="text-sm font-black">{totalPrice.toFixed(2)}€</span>
          </div>
          {hasDiscount && appliedDiscount && (
            <div className="absolute bottom-4 left-4 rounded-xl bg-yellow-500 px-2 py-1 text-[8px] font-black uppercase text-black">
              {appliedDiscount.discountType === 'percentage'
                ? `-${appliedDiscount.discountValue}%`
                : `-${appliedDiscount.discountValue?.toFixed(2)}€`}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-8">
          <div>
            <p className="mb-2 text-[9px] font-black uppercase tracking-[0.3em] text-yellow-500">{item.category}</p>
            <h2 className="mb-3 text-2xl font-black uppercase tracking-tight">{item.name[lang]}</h2>
            <p className="text-sm font-bold uppercase leading-relaxed tracking-tight text-gray-400">
              {item.description[lang]}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">
              {lang === 'de' ? 'Menge' : 'Quantity'}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-lg font-black transition-all hover:border-black"
              >
                −
              </button>
              <span className="min-w-8 text-center text-lg font-black">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((prev) => prev + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-lg font-black transition-all hover:border-black"
              >
                +
              </button>
            </div>
          </div>

          {hasMandatory && (
            <div>
              <p className="mb-3 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest">
                {lang === 'de' ? 'Option wählen' : 'Choose Option'}
                <span className="text-xs text-red-500">*</span>
              </p>
              <div className="space-y-2">
                {item.addonsMandatory!.map((addon) => {
                  const checked = selectedMandatory.some((a) => a.name === addon.name);
                  return (
                    <label
                      key={addon.name}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-3 transition-all ${
                        checked ? 'border-black bg-black/5' : 'border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            toggleAddon(addon, selectedMandatory, setSelectedMandatory);
                            setValidationError('');
                          }}
                          className="accent-black"
                        />
                        <span className="text-sm font-bold">{addon.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-gray-400">
                        {addon.price > 0 ? `+${addon.price.toFixed(2)}€` : lang === 'de' ? 'Gratis' : 'Free'}
                      </span>
                    </label>
                  );
                })}
              </div>
              {validationError && <p className="mt-2 text-[10px] font-black uppercase text-red-500">{validationError}</p>}
            </div>
          )}

          {hasOptional && (
            <div>
              <p className="mb-3 text-[9px] font-black uppercase tracking-widest text-gray-400">
                {lang === 'de' ? 'Extras (optional)' : 'Extras (optional)'}
              </p>
              <div className="space-y-2">
                {item.addonsOptional!.map((addon) => {
                  const checked = selectedOptional.some((a) => a.name === addon.name);
                  return (
                    <label
                      key={addon.name}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-3 transition-all ${
                        checked ? 'border-black bg-black/5' : 'border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAddon(addon, selectedOptional, setSelectedOptional)}
                          className="accent-black"
                        />
                        <span className="text-sm font-bold">{addon.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-gray-400">
                        {addon.price > 0 ? `+${addon.price.toFixed(2)}€` : lang === 'de' ? 'Gratis' : 'Free'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-50 px-8 pb-8 pt-4">
          <button
            onClick={handleAdd}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black py-5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-yellow-500 hover:text-black"
          >
            <Icons.Plus /> {lang === 'de' ? 'Zur Bestellung hinzufügen' : 'Add to Order'} · {totalPrice.toFixed(2)}€
          </button>
        </div>
      </div>
    </div>
  );
};
