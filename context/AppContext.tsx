'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Addon, Language, MenuItem, getDiscountedPrice } from '@/types';
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
  addToCart: (item: MenuItem, selectedOptionalAddons?: Addon[], selectedMandatoryAddons?: Addon[]) => void;
  removeFromCart: (cartKey: string) => void;
  clearCart: () => void;
  toasts: Toast[];
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: number) => void;
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

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as Language;
    if (savedLang === 'de' || savedLang === 'en') setLangState(savedLang);
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        // Normalize old cart format that used selectedMandatoryAddon (singular)
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
  ) => {
    const cartKey = buildCartKey(item.id, selectedOptionalAddons, selectedMandatoryAddons);
    const discountedBase = getDiscountedPrice(item);
    const addonPrice =
      selectedMandatoryAddons.reduce((s, a) => s + a.price, 0) +
      selectedOptionalAddons.reduce((s, a) => s + a.price, 0);
    const effectivePrice = Math.round((discountedBase + addonPrice) * 100) / 100;

    setCart(prev => {
      const existing = prev.find(c => c.cartKey === cartKey);
      if (existing) {
        return prev.map(c =>
          c.cartKey === cartKey ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, { cartKey, item, quantity: 1, selectedOptionalAddons, selectedMandatoryAddons, effectivePrice }];
    });
    addToast(lang === 'de' ? `${item.name.de} hinzugefügt` : `${item.name.en} added`);
  };

  const removeFromCart = (cartKey: string) => setCart(prev => prev.filter(c => c.cartKey !== cartKey));
  const clearCart = () => setCart([]);

  return (
    <AppContext.Provider value={{ lang, setLang, t, cart, addToCart, removeFromCart, clearCart, toasts, addToast, removeToast }}>
      {children}
    </AppContext.Provider>
  );
};
