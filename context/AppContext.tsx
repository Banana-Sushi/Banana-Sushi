'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Addon, Discount, Language, MenuItem, getAppliedItemDiscount, getDiscountedPrice } from '@/types';
import { translations } from '@/translations';

export interface CartItem {
  cartKey: string;
  item: MenuItem;
  quantity: number;
  selectedOptionalAddons: Addon[];
  selectedMandatoryAddons: Addon[];
  effectivePrice: number;
}

interface Toast {
  id: number;
  msg: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: typeof translations['de'];
  cart: CartItem[];
  addToCart: (item: MenuItem, selectedOptionalAddons?: Addon[], selectedMandatoryAddons?: Addon[], quantity?: number) => void;
  removeFromCart: (cartKey: string) => void;
  clearCart: () => void;
  toasts: Toast[];
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: number) => void;
  discounts: Discount[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

function buildCartKey(itemId: string, optionalAddons: Addon[], mandatoryAddons: Addon[]): string {
  const opts = [...optionalAddons].sort((a, b) => a.name.localeCompare(b.name)).map(a => a.name).join(',');
  const mand = [...mandatoryAddons].sort((a, b) => a.name.localeCompare(b.name)).map(a => a.name).join(',');
  return `${itemId}|${mand}|${opts}`;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>('de');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as Language;
    if (savedLang === 'de' || savedLang === 'en') setLangState(savedLang);
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart).map((c: any) => ({
          ...c,
          selectedMandatoryAddons:
            c.selectedMandatoryAddons ??
            (c.selectedMandatoryAddon ? [c.selectedMandatoryAddon] : []),
          selectedOptionalAddons: c.selectedOptionalAddons ?? [],
        }));
        setCart(parsed);
      }
    } catch {}
    fetch('/api/discounts?active=true')
      .then(r => r.ok ? r.json() : [])
      .then(setDiscounts)
      .catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem('lang', l);
  };

  const t = translations[lang];

  const addToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => removeToast(id), 3500);
  };

  const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const addToCart = (
    item: MenuItem,
    selectedOptionalAddons: Addon[] = [],
    selectedMandatoryAddons: Addon[] = [],
    quantity = 1,
  ) => {
    const normalizedQuantity = Math.max(1, Math.floor(quantity));

    setCart(prev => {
      let next = [...prev];

      for (let index = 0; index < normalizedQuantity; index += 1) {
        const cartKey = buildCartKey(item.id, selectedOptionalAddons, selectedMandatoryAddons);
        const appliedDiscount = getAppliedItemDiscount(item, discounts);
        const isTwoForOne = appliedDiscount?.discountType === 'two_for_one';
        const discountedBase = getDiscountedPrice(item, discounts);
        const addonPrice =
          selectedMandatoryAddons.reduce((s, a) => s + a.price, 0) +
          selectedOptionalAddons.reduce((s, a) => s + a.price, 0);
        const effectivePrice = Math.round((discountedBase + addonPrice) * 100) / 100;
        const existing = next.find(c => c.cartKey === cartKey);

        if (existing) {
          next = next.map(c =>
            c.cartKey === cartKey ? { ...c, quantity: c.quantity + 1 } : c,
          );
        } else {
          next = [...next, { cartKey, item, quantity: 1, selectedOptionalAddons, selectedMandatoryAddons, effectivePrice }];
        }

        if (isTwoForOne) {
          const freeKey = `${cartKey}|free`;
          const existingFree = next.find(c => c.cartKey === freeKey);
          if (existingFree) {
            next = next.map(c =>
              c.cartKey === freeKey ? { ...c, quantity: c.quantity + 1 } : c,
            );
          } else {
            next = [...next, {
              cartKey: freeKey,
              item,
              quantity: 1,
              selectedOptionalAddons,
              selectedMandatoryAddons,
              effectivePrice: 0,
            }];
          }
        }
      }

      return next;
    });
    addToast(lang === 'de' ? `${item.name.de} hinzugefügt` : `${item.name.en} added`);
  };

  const removeFromCart = (cartKey: string) => setCart(prev => prev.filter(c => c.cartKey !== cartKey));
  const clearCart = () => setCart([]);

  return (
    <AppContext.Provider value={{ lang, setLang, t, cart, addToCart, removeFromCart, clearCart, toasts, addToast, removeToast, discounts }}>
      {children}
    </AppContext.Provider>
  );
};
