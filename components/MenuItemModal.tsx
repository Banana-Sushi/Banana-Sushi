'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Addon, MenuItem, getDiscountedPrice } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { Icons } from './Icons';

interface Props {
  item: MenuItem;
  onClose: () => void;
}

export const MenuItemModal = ({ item, onClose }: Props) => {
  const { lang, t, addToCart } = useAppContext();
  const [selectedOptional, setSelectedOptional] = useState<Addon[]>([]);
  const [selectedMandatory, setSelectedMandatory] = useState<Addon[]>([]);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const discountedBase = getDiscountedPrice(item);
  const hasDiscount = discountedBase < item.price;
  const addonTotal =
    selectedMandatory.reduce((s, a) => s + a.price, 0) +
    selectedOptional.reduce((s, a) => s + a.price, 0);
  const totalPrice = discountedBase + addonTotal;

  const hasMandatory = (item.addonsMandatory?.length ?? 0) > 0;
  const hasOptional = (item.addonsOptional?.length ?? 0) > 0;

  const toggleAddon = (addon: Addon, list: Addon[], setList: React.Dispatch<React.SetStateAction<Addon[]>>) => {
    setList(prev =>
      prev.some(a => a.name === addon.name)
        ? prev.filter(a => a.name !== addon.name)
        : [...prev, addon],
    );
  };

  const handleAdd = () => {
    if (hasMandatory && selectedMandatory.length === 0) {
      setValidationError(lang === 'de' ? 'Bitte wähle mindestens eine Option.' : 'Please select at least one option.');
      return;
    }
    setValidationError('');
    addToCart(item, selectedOptional, selectedMandatory);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-zoom-in flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative h-56 w-full shrink-0">
          <Image src={item.image} alt={item.name[lang]} fill className="object-cover" sizes="448px" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center hover:bg-white transition-all shadow-lg"
          >
            <Icons.Close />
          </button>
          {/* Price badge */}
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-2">
            {hasDiscount && (
              <span className="text-[9px] line-through text-gray-400">{item.price.toFixed(2)}€</span>
            )}
            <span className="text-sm font-black">{totalPrice.toFixed(2)}€</span>
          </div>
          {/* Discount badge */}
          {hasDiscount && (
            <div className="absolute bottom-4 left-4 bg-yellow-500 text-black px-2 py-1 rounded-xl text-[8px] font-black uppercase">
              {item.discountType === 'percentage'
                ? `-${item.discountValue}%`
                : `-${item.discountValue?.toFixed(2)}€`}
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-8 space-y-6">
          <div>
            <p className="text-[9px] font-black text-yellow-500 uppercase tracking-[0.3em] mb-2">{item.category}</p>
            <h2 className="text-2xl font-black uppercase tracking-tight mb-3">{item.name[lang]}</h2>
            <p className="text-gray-400 font-bold text-sm leading-relaxed uppercase tracking-tight">
              {item.description[lang]}
            </p>
          </div>

          {/* Mandatory add-ons — radio */}
          {hasMandatory && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest mb-3 flex items-center gap-1">
                {lang === 'de' ? 'Option wählen' : 'Choose Option'}
                <span className="text-red-500 text-xs">*</span>
              </p>
              <div className="space-y-2">
                {item.addonsMandatory!.map(addon => {
                  const checked = selectedMandatory.some(a => a.name === addon.name);
                  return (
                    <label
                      key={addon.name}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        checked ? 'border-black bg-black/5' : 'border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => { toggleAddon(addon, selectedMandatory, setSelectedMandatory); setValidationError(''); }}
                          className="accent-black"
                        />
                        <span className="font-bold text-sm">{addon.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-gray-400">
                        {addon.price > 0 ? `+${addon.price.toFixed(2)}€` : (lang === 'de' ? 'Gratis' : 'Free')}
                      </span>
                    </label>
                  );
                })}
              </div>
              {validationError && (
                <p className="text-red-500 text-[10px] font-black uppercase mt-2">{validationError}</p>
              )}
            </div>
          )}

          {/* Optional add-ons — checkboxes */}
          {hasOptional && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest mb-3 text-gray-400">
                {lang === 'de' ? 'Extras (optional)' : 'Extras (optional)'}
              </p>
              <div className="space-y-2">
                {item.addonsOptional!.map(addon => {
                  const checked = selectedOptional.some(a => a.name === addon.name);
                  return (
                    <label
                      key={addon.name}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
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
                        <span className="font-bold text-sm">{addon.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-gray-400">
                        {addon.price > 0 ? `+${addon.price.toFixed(2)}€` : (lang === 'de' ? 'Gratis' : 'Free')}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sticky add button */}
        <div className="px-8 pb-8 pt-4 shrink-0 border-t border-gray-50">
          <button
            onClick={handleAdd}
            className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-yellow-500 hover:text-black transition-all flex items-center justify-center gap-2"
          >
            <Icons.Plus /> {t.menu.addToCart} · {totalPrice.toFixed(2)}€
          </button>
        </div>
      </div>
    </div>
  );
};
