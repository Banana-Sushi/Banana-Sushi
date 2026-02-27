'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, MenuItem } from '@/types';
import { translations } from '@/translations';

interface CartItem {
  item: MenuItem;
  quantity: number;
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
  addToCart: (item: MenuItem) => void;
  removeFromCart: (id: string) => void;
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>('de');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as Language;
    if (savedLang === 'de' || savedLang === 'en') setLangState(savedLang);
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) setCart(JSON.parse(savedCart));
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

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) return prev.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { item, quantity: 1 }];
    });
    addToast(lang === 'de' ? `${item.name.de} hinzugefügt` : `${item.name.en} added`);
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.item.id !== id));
  const clearCart = () => setCart([]);

  return (
    <AppContext.Provider value={{ lang, setLang, t, cart, addToCart, removeFromCart, clearCart, toasts, addToast, removeToast }}>
      {children}
    </AppContext.Provider>
  );
};
