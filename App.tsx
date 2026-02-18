
import React, { useState, createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Language, MenuItem, OrderStatus, Order } from './types';
import { translations } from './translations';

// --- Constants ---
const DELIVERY_FEE = 2.90;

// --- Mock Data ---
const INITIAL_MENU: MenuItem[] = [
  { id: '1', name: { de: 'Sunset Roll', en: 'Sunset Roll' }, description: { de: 'Tempura Garnele, Avocado, Lachs-Topping & Spicy Mayo.', en: 'Tempura shrimp, avocado, salmon topping & spicy mayo.' }, price: 14.50, category: 'Sushi', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=800', isFeatured: true },
  { id: '2', name: { de: 'Ocean Bowl', en: 'Ocean Bowl' }, description: { de: 'Frischer Thunfisch, Edamame, Wakame, Avocado auf Sushi-Reis.', en: 'Fresh tuna, edamame, wakame, avocado on sushi rice.' }, price: 16.90, category: 'Bowls', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800', isFeatured: true },
  { id: '3', name: { de: 'Mango Lassi Roll', en: 'Mango Lassi Roll' }, description: { de: 'Süße Mango, Frischkäse & Gurke.', en: 'Sweet mango, cream cheese & cucumber.' }, price: 12.50, category: 'Sushi', image: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?auto=format&fit=crop&q=80&w=800', isFeatured: true },
  { id: '4', name: { de: 'Crunchy Tiger', en: 'Crunchy Tiger' }, description: { de: 'Garnelen Tempura, Gurke, Panko-Kruste.', en: 'Shrimp tempura, cucumber, panko crust.' }, price: 13.50, category: 'Sushi', image: 'https://images.unsplash.com/photo-1617196034183-421b4917c92d?auto=format&fit=crop&q=80&w=800', isFeatured: true },
  { id: '5', name: { de: 'Salmon Nigiri', en: 'Salmon Nigiri' }, description: { de: '2 Stück feiner Lachs auf Reis.', en: '2 pieces of fine salmon on rice.' }, price: 5.50, category: 'Sushi', image: 'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?auto=format&fit=crop&q=80&w=800' },
  { id: '6', name: { de: 'Tuna Sashimi', en: 'Tuna Sashimi' }, description: { de: '5 Scheiben frischer Thunfisch.', en: '5 slices of fresh tuna.' }, price: 12.00, category: 'Sushi', image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=800' },
  { id: '7', name: { de: 'Veggie Garden Bowl', en: 'Veggie Garden Bowl' }, description: { de: 'Tofu, Edamame, Mais, Gurke & Ponzu.', en: 'Tofu, edamame, corn, cucumber & ponzu.' }, price: 14.00, category: 'Bowls', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800' },
  { id: '8', name: { de: 'Matcha Tea', en: 'Matcha Tea' }, description: { de: 'Heißer japanischer Grüntee.', en: 'Hot Japanese green tea.' }, price: 4.50, category: 'Drinks', image: 'https://images.unsplash.com/photo-1582722872445-41ca501ea14b?auto=format&fit=crop&q=80&w=800' },
  { id: '9', name: { de: 'Ebi Tempura', en: 'Ebi Tempura' }, description: { de: '4 knusprig gebackene Garnelen.', en: '4 crispy baked prawns.' }, price: 8.90, category: 'Sushi', image: 'https://images.unsplash.com/photo-1590483734724-383b9f4a536b?auto=format&fit=crop&q=80&w=800' },
  { id: '10', name: { de: 'Cucumber Maki', en: 'Cucumber Maki' }, description: { de: '6 klassische Gurkenrollen.', en: '6 classic cucumber rolls.' }, price: 4.20, category: 'Sushi', image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&q=80&w=800' }
];

const generateMockOrders = (): Order[] => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterdayStr = new Date(now.setDate(now.getDate() - 1)).toISOString().split('T')[0];
  
  return [
    { id: 'o1', orderNumber: 'BNN-9921', time: '12:30', date: todayStr, customerName: 'Alice Smith', phone: '0151123456', address: 'Main St 1', zipCode: '10115', city: 'Berlin', type: 'delivery', paymentMethod: 'online', status: 'new', items: [{ menuItemId: '1', quantity: 2, price: 14.50 }], total: 31.90 },
    { id: 'o2', orderNumber: 'BNN-9922', time: '14:15', date: todayStr, customerName: 'Bob Jones', phone: '0151123457', address: 'Oak Ave 5', zipCode: '10115', city: 'Berlin', type: 'delivery', paymentMethod: 'cash', status: 'processing', items: [{ menuItemId: '2', quantity: 1, price: 16.90 }], total: 19.80 },
    { id: 'o3', orderNumber: 'BNN-8812', time: '19:45', date: yesterdayStr, customerName: 'Charlie Brown', phone: '0151123458', address: 'Park Rd 12', zipCode: '10115', city: 'Berlin', type: 'delivery', paymentMethod: 'online', status: 'delivered', items: [{ menuItemId: '3', quantity: 3, price: 12.50 }], total: 40.40 },
  ];
};

// --- Context ---
interface AppContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: any;
  menu: MenuItem[];
  setMenu: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  cart: { item: MenuItem; quantity: number }[];
  addToCart: (item: MenuItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within Provider");
  return context;
};

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('de');
  const [menu, setMenu] = useState<MenuItem[]>(INITIAL_MENU);
  const [orders, setOrders] = useState<Order[]>(generateMockOrders());
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: string }[]>([]);

  const t = translations[lang];

  const addToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
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
    <AppContext.Provider value={{ lang, setLang, t, menu, setMenu, orders, setOrders, cart, addToCart, removeFromCart, clearCart, addToast }}>
      {children}
      <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-2">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.msg} type={toast.type} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </AppContext.Provider>
  );
};

// --- Icons ---
const Icons = {
  Cart: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>,
  MapPin: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
  Clock: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
  ArrowLeft: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>,
  Instagram: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
  Facebook: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
  Edit: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Close: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Stats: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="18" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="2" y="13" width="4" height="8"/></svg>
};

// --- Reusable UI ---
const Toast: React.FC<{ message: string, type: string, onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className={`px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-up bg-black text-white`}>
      <div className={`w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse`}></div>
      <p className="font-black uppercase tracking-widest text-[9px]">{message}</p>
    </div>
  );
};

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => { 
    if (!hash) window.scrollTo(0, 0); 
  }, [pathname, hash]);
  return null;
};

const MenuCard: React.FC<{ item: MenuItem }> = ({ item }) => {
  const { addToCart, lang, t } = useAppContext();
  return (
    <div className="group bg-white rounded-[2rem] border border-gray-100 overflow-hidden hover:shadow-xl transition-all animate-zoom-in flex flex-col h-full">
      <div className="relative h-56 md:h-64 overflow-hidden shrink-0">
        <img src={item.image} alt={item.name[lang]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black shadow-sm">
          {item.price.toFixed(2)}€
        </div>
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-xl font-black uppercase tracking-tight mb-2 truncate">{item.name[lang]}</h3>
        <p className="text-gray-400 font-bold text-xs mb-6 line-clamp-2 uppercase tracking-tight leading-relaxed flex-1">{item.description[lang]}</p>
        <button onClick={() => addToCart(item)} className="w-full bg-black text-white py-4 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-yellow-500 hover:text-black transition-all flex items-center justify-center gap-2">
          <Icons.Plus /> {t.menu.addToCart}
        </button>
      </div>
    </div>
  );
};

// --- Navbar ---
const Navbar: React.FC = () => {
  const { lang, setLang, t, cart } = useAppContext();
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    if (isDashboard) {
      setIsVisible(true);
      return;
    }
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const scrollToSection = (id: string) => {
    if (location.pathname !== '/') {
      window.location.href = `/#${id}`;
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <nav 
      style={{ transform: `translateY(${isVisible ? '0' : '-100%'})` }}
      className={`bg-white/95 backdrop-blur-md border-b border-gray-100 fixed top-0 right-0 z-50 px-4 md:px-12 py-3 md:py-5 flex justify-between items-center transition-transform duration-300 shadow-sm ${isDashboard ? 'lg:left-24 left-0' : 'left-0'}`}
    >
      <Link to="/" className="text-xl md:text-2xl font-black tracking-tighter uppercase whitespace-nowrap">
        BANANA SUSHI<span className="text-yellow-500">.</span>
      </Link>
      
      <div className="flex-1 hidden md:flex items-center justify-center mx-4">
        <div className="flex items-center gap-8 lg:gap-12">
          {!isDashboard ? (
            <>
              <Link to="/menu" className="text-[11px] font-black text-gray-400 hover:text-black transition-colors uppercase tracking-[0.2em]">{t.nav.menu}</Link>
              <button onClick={() => scrollToSection('about')} className="text-[11px] font-black text-gray-400 hover:text-black transition-colors uppercase tracking-[0.2em]">{t.nav.about}</button>
              <button onClick={() => scrollToSection('gallery')} className="text-[11px] font-black text-gray-400 hover:text-black transition-colors uppercase tracking-[0.2em]">{t.nav.gallery}</button>
              <button onClick={() => scrollToSection('contact')} className="text-[11px] font-black text-gray-400 hover:text-black transition-colors uppercase tracking-[0.2em]">{t.nav.contact}</button>
            </>
          ) : (
            <div className="flex items-center gap-8">
              <Link to="/dashboard/orders" className={`text-[11px] font-black uppercase tracking-[0.2em] ${location.pathname === '/dashboard/orders' ? 'text-black' : 'text-gray-300'}`}>{t.dashboard.orders}</Link>
              <Link to="/dashboard/history" className={`text-[11px] font-black uppercase tracking-[0.2em] ${location.pathname === '/dashboard/history' ? 'text-black' : 'text-gray-300'}`}>{t.dashboard.history}</Link>
              <Link to="/dashboard/stats" className={`text-[11px] font-black uppercase tracking-[0.2em] ${location.pathname === '/dashboard/stats' ? 'text-black' : 'text-gray-300'}`}>{t.dashboard.stats}</Link>
              <Link to="/dashboard/menu" className={`text-[11px] font-black uppercase tracking-[0.2em] ${location.pathname === '/dashboard/menu' ? 'text-black' : 'text-gray-300'}`}>{t.dashboard.menuMgmt}</Link>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <button onClick={() => setLang(lang === 'de' ? 'en' : 'de')} className="text-[11px] font-black text-gray-400 hover:text-black uppercase tracking-[0.2em] p-1.5 transition-colors">
          {lang === 'de' ? 'EN' : 'DE'}
        </button>
        {!isDashboard && (
          <Link to="/order" className="group relative bg-black text-white px-5 md:px-7 py-2.5 md:py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500 hover:text-black transition-all flex items-center gap-2">
            <Icons.Cart />
            <span className="hidden sm:inline">{t.nav.orderNow}</span>
            {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[9px] w-5 h-5 flex items-center justify-center rounded-full font-black border-2 border-white">{cart.reduce((acc, c) => acc + c.quantity, 0)}</span>}
          </Link>
        )}
      </div>
    </nav>
  );
};

// --- Home Page ---
// --- Menu Highlights Component (Home Page) ---
const MenuHighlights = () => {
  const { t, menu } = useAppContext();
  const featured = menu.filter(m => m.isFeatured).slice(0, 4);

  return (
    <section id="menu-highlights" className="py-24 px-4 md:px-20 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-black uppercase mb-4 tracking-tighter">{t.menu.title}</h2>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">{t.menu.subtitle}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {featured.map(item => <MenuCard key={item.id} item={item} />)}
        </div>
        <div className="mt-16 text-center">
          <Link to="/menu" className="inline-block bg-black text-white px-10 md:px-14 py-4 md:py-6 rounded-full text-[10px] font-black uppercase tracking-[0.3em] hover:bg-yellow-500 hover:text-black transition-all shadow-xl">
            {t.home.viewMenu} →
          </Link>
        </div>
      </div>
    </section>
  );
};

// --- Home Page ---
const OnePageHome = () => {
  const { t } = useAppContext();
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash;
    if (hash) {
      const id = hash.replace('#', '');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          const offset = 80;
          const bodyRect = document.body.getBoundingClientRect().top;
          const elementRect = element.getBoundingClientRect().top;
          const elementPosition = elementRect - bodyRect;
          const offsetPosition = elementPosition - offset;
          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [location.hash]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  return (
    <div className="animate-fade-in pt-[60px] md:pt-[80px]">
      {/* Hero */}
      <section id="hero" className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=1600" className="w-full h-full object-cover brightness-[0.3]" alt="Sushi" />
        </div>
        <div className="relative z-10 text-center text-white px-4 max-w-6xl">
          <h1 className="text-4xl md:text-[8rem] font-black tracking-tighter leading-[0.85] uppercase mb-8 md:mb-10">FRISCHES SUSHI<span className="text-yellow-500">.</span></h1>
          <p className="text-sm md:text-xl font-bold text-gray-300 max-w-xl mx-auto mb-10 md:mb-14 uppercase leading-relaxed">{t.home.heroSub}</p>
          <Link to="/menu" className="inline-block bg-white text-black px-10 md:px-14 py-4 md:py-6 rounded-full text-[10px] font-black uppercase tracking-[0.3em] hover:bg-yellow-500 transition-all shadow-2xl">{t.home.viewMenu}</Link>
        </div>
      </section>

      {/* Menu Highlights */}
      <MenuHighlights />

      {/* About */}
      <section id="about" className="py-24 px-4 md:px-20 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-10">{t.nav.about}</h2>
          <p className="text-lg md:text-2xl text-gray-400 font-bold leading-relaxed italic uppercase tracking-tight">"Qualität, die man schmeckt. Leidenschaft, die man sieht. Sushi, das man liebt. BANANA Sushi steht für kreative Fusionen und absolute Frische."</p>
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="py-24 px-4 md:px-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black uppercase mb-4 tracking-tighter">{t.nav.gallery}</h2>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Art on a plate</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            <img src="https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&q=80&w=800" className="w-full h-64 md:h-80 object-cover rounded-[2rem]" alt="" />
            <img src="https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=800" className="w-full h-64 md:h-80 object-cover rounded-[2rem]" alt="" />
            <img src="https://images.unsplash.com/photo-1583623025817-d180a2221d0a?auto=format&fit=crop&q=80&w=800" className="w-full h-64 md:h-80 object-cover rounded-[2rem]" alt="" />
            <img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800" className="w-full h-64 md:h-80 object-cover rounded-[2rem]" alt="" />
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-24 px-4 md:px-20 bg-gray-50">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 md:gap-24">
          <div className="space-y-12">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">{t.nav.contact}</h2>
            <div className="space-y-6 uppercase font-black tracking-widest text-[10px]">
              <div>
                <p className="text-gray-300 mb-2">{t.home.address}</p>
                <p className="text-lg md:text-xl text-black">Sushi-Allee 42, 10115 Berlin</p>
              </div>
              <div>
                <p className="text-gray-300 mb-2">{t.home.openingHours}</p>
                <p className="text-lg md:text-xl text-black">Daily 12:00 - 22:00</p>
              </div>
              <div>
                <p className="text-gray-300 mb-2">Phone</p>
                <p className="text-lg md:text-xl text-black">+49 (0) 30 123 456 78</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-sm border border-gray-100">
             <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Message sent!'); }}>
                <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] mb-6">Send us a message</p>
                <input required placeholder="Name" className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-xs" />
                <input required type="email" placeholder="Email" className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-xs" />
                <textarea required placeholder="Message" rows={4} className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-xs resize-none"></textarea>
                <button type="submit" className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-yellow-500 hover:text-black transition-all">Send Message</button>
             </form>
          </div>
        </div>
      </section>
    </div>
  );
};

const MenuPage = () => {
  const { t, menu, lang } = useAppContext();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const categories = ['All', ...Array.from(new Set(menu.map(m => m.category)))];
  const filteredMenu = activeCategory === 'All' ? menu : menu.filter(m => m.category === activeCategory);
  
  return (
    <div className="pt-[100px] md:pt-[130px] px-4 md:px-20 pb-32 animate-fade-in">
       <div className="max-w-7xl mx-auto mb-12">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
            <Icons.ArrowLeft /> Back
          </button>
       </div>
       <div className="text-center mb-20">
          <h2 className="text-5xl md:text-[8rem] font-black uppercase mb-10 tracking-tighter leading-none">{t.menu.title}</h2>
          <div className="flex flex-wrap justify-center gap-3">
             {categories.map(c => (
               <button key={c} onClick={() => setActiveCategory(c)} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === c ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{c}</button>
             ))}
          </div>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 max-w-[1600px] mx-auto">
          {filteredMenu.map(item => <MenuCard key={item.id} item={item} onSelect={() => {}} />)}
       </div>
    </div>
  );
};

// --- Checkout ---
const OrderPage = () => {
  const { cart, removeFromCart, clearCart, t, setOrders, lang } = useAppContext();
  const [success, setSuccess] = useState(false);
  const total = cart.reduce((acc, c) => acc + (c.item.price * c.quantity), 0) + DELIVERY_FEE;
  
  if (success) return <div className="min-h-screen flex flex-col items-center justify-center pt-20 px-4 text-center animate-fade-in">
    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-8 text-3xl">✓</div>
    <h2 className="text-4xl md:text-5xl font-black uppercase mb-6 tracking-tighter">{t.checkout.success}</h2>
    <p className="text-gray-400 font-bold uppercase tracking-widest max-w-lg mb-12 text-sm">{t.checkout.successSub}</p>
    <Link to="/" className="bg-black text-white px-12 py-5 rounded-full font-black uppercase tracking-widest text-[11px]">{t.checkout.backHome}</Link>
  </div>;

  return (
    <div className="pt-[100px] md:pt-[130px] px-4 md:px-20 pb-32 max-w-7xl mx-auto animate-fade-in">
       <h2 className="text-4xl md:text-5xl font-black uppercase mb-16 tracking-tighter">{t.checkout.title}</h2>
       {cart.length === 0 ? (
         <div className="text-center py-24">
            <p className="text-gray-200 font-black text-4xl md:text-6xl uppercase tracking-tighter mb-8">{t.checkout.empty}</p>
            <Link to="/menu" className="text-black font-black uppercase tracking-[0.2em] text-[11px] border-b-2 border-black pb-1 hover:text-yellow-500 hover:border-yellow-500 transition-all">{t.checkout.browseMenu}</Link>
         </div>
       ) : (
         <div className="flex flex-col lg:flex-row gap-16">
            <div className="flex-1 space-y-8 bg-white p-8 md:p-12 rounded-[2.5rem] border border-gray-100 shadow-sm">
               {cart.map(c => (
                 <div key={c.item.id} className="flex justify-between items-center py-6 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-5"><img src={c.item.image} className="w-16 h-16 rounded-2xl object-cover" /><div className="font-black uppercase"><p className="text-sm">{c.item.name[lang]}</p><p className="text-gray-300 text-[10px] mt-1">{c.quantity}x {c.item.price.toFixed(2)}€</p></div></div>
                    <div className="flex items-center gap-6"><span className="font-black text-base">{(c.item.price * c.quantity).toFixed(2)}€</span><button onClick={() => removeFromCart(c.item.id)} className="text-red-400 hover:text-red-600 transition-colors"><Icons.Trash /></button></div>
                 </div>
               ))}
               <div className="pt-8 border-t border-gray-100 flex justify-between items-baseline font-black">
                 <span className="text-gray-400 uppercase tracking-widest text-[10px]">{t.checkout.total}</span>
                 <span className="text-3xl text-black">{total.toFixed(2)}€</span>
               </div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); setSuccess(true); clearCart(); }} className="w-full lg:w-[420px] space-y-5 bg-gray-50 p-8 md:p-10 rounded-[2.5rem]">
                <input required placeholder={t.checkout.name} className="w-full p-5 rounded-2xl border-none outline-none font-bold shadow-inner placeholder:text-gray-300 text-sm" />
                <input required placeholder={t.checkout.phone} className="w-full p-5 rounded-2xl border-none outline-none font-bold shadow-inner placeholder:text-gray-300 text-sm" />
                <input required placeholder={t.checkout.address} className="w-full p-5 rounded-2xl border-none outline-none font-bold shadow-inner placeholder:text-gray-300 text-sm" />
                <div className="flex gap-3"><input required placeholder="ZIP" className="w-1/3 p-5 rounded-2xl border-none outline-none font-bold shadow-inner placeholder:text-gray-300 text-sm" /><input required placeholder="City" className="w-2/3 p-5 rounded-2xl border-none outline-none font-bold shadow-inner placeholder:text-gray-300 text-sm" /></div>
                <div className="pt-6 space-y-4">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{t.checkout.payment}</p>
                  <label className="flex items-center gap-4 bg-white p-4 rounded-xl cursor-pointer font-black text-[11px] uppercase border border-transparent has-[:checked]:border-yellow-500 transition-all">
                    <input type="radio" name="payment" value="online" defaultChecked className="accent-black" /> {t.checkout.online}
                  </label>
                  <label className="flex items-center gap-4 bg-white p-4 rounded-xl cursor-pointer font-black text-[11px] uppercase border border-transparent has-[:checked]:border-yellow-500 transition-all">
                    <input type="radio" name="payment" value="cash" className="accent-black" /> {t.checkout.cash}
                  </label>
                </div>
                <button type="submit" className="w-full bg-black text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] mt-6 hover:bg-yellow-500 hover:text-black transition-all shadow-xl">{t.checkout.placeOrder}</button>
            </form>
         </div>
       )}
    </div>
  );
};

// --- Staff Dashboard ---
const DashboardSummary: React.FC<{ activeFilter: string, onFilterChange: (f: string) => void }> = ({ activeFilter, onFilterChange }) => {
  const { orders } = useAppContext();
  const summary = useMemo(() => ({
    live: orders.filter(o => o.status !== 'delivered').length,
    doing: orders.filter(o => o.status === 'processing' || o.status === 'on_the_way').length,
    done: orders.filter(o => o.status === 'delivered').length,
  }), [orders]);
  return (
    <div className="grid grid-cols-3 gap-4 mb-10">
      <button 
        onClick={() => onFilterChange('live')}
        className={`p-6 rounded-3xl border transition-all text-center ${activeFilter === 'live' ? 'bg-black text-white border-black shadow-xl scale-105' : 'bg-white border-gray-100 shadow-sm text-black hover:border-gray-300'}`}
      >
        <p className={`text-[9px] font-black uppercase mb-2 ${activeFilter === 'live' ? 'text-gray-400' : 'text-gray-300'}`}>LIVE</p>
        <p className="text-3xl font-black">{summary.live}</p>
      </button>
      <button 
        onClick={() => onFilterChange('doing')}
        className={`p-6 rounded-3xl border transition-all text-center ${activeFilter === 'doing' ? 'bg-blue-500 text-white border-blue-500 shadow-xl scale-105' : 'bg-white border-gray-100 shadow-sm text-black hover:border-gray-300'}`}
      >
        <p className={`text-[9px] font-black uppercase mb-2 ${activeFilter === 'doing' ? 'text-blue-100' : 'text-gray-300'}`}>DOING</p>
        <p className={`text-3xl font-black ${activeFilter === 'doing' ? 'text-white' : 'text-blue-500'}`}>{summary.doing}</p>
      </button>
      <button 
        onClick={() => onFilterChange('done')}
        className={`p-6 rounded-3xl border transition-all text-center ${activeFilter === 'done' ? 'bg-green-500 text-white border-green-500 shadow-xl scale-105' : 'bg-white border-gray-100 shadow-sm text-black hover:border-gray-300'}`}
      >
        <p className={`text-[9px] font-black uppercase mb-2 ${activeFilter === 'done' ? 'text-green-100' : 'text-gray-300'}`}>DONE</p>
        <p className={`text-3xl font-black ${activeFilter === 'done' ? 'text-white' : 'text-green-500'}`}>{summary.done}</p>
      </button>
    </div>
  );
};

const DashboardOrders = () => {
  const { orders, t } = useAppContext();
  const [activeFilter, setActiveFilter] = useState('live');

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'live') return orders.filter(o => o.status !== 'delivered');
    if (activeFilter === 'doing') return orders.filter(o => o.status === 'processing' || o.status === 'on_the_way');
    if (activeFilter === 'done') return orders.filter(o => o.status === 'delivered');
    return orders;
  }, [orders, activeFilter]);

  return (
    <div className="pt-[100px] px-4 md:px-12 max-w-7xl mx-auto lg:pl-32 min-h-screen pb-32">
      <div className="mb-10">
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">Live Orders<span className="text-yellow-500">.</span></h2>
      </div>
      <DashboardSummary activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredOrders.map(order => (
          <Link key={order.id} to={`/dashboard/order/${order.id}`} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${order.status === 'new' ? 'bg-blue-500' : order.status === 'delivered' ? 'bg-green-500' : 'bg-yellow-400'}`}></div>
            <p className="text-[9px] font-black text-gray-300 uppercase mb-1">{order.orderNumber} • {order.time}</p>
            <h3 className="text-xl font-black uppercase mb-6 truncate">{order.customerName}</h3>
            <div className="flex justify-between items-center">
              <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${
                order.status === 'new' ? 'bg-blue-50 text-blue-500' : 
                order.status === 'delivered' ? 'bg-green-50 text-green-500' : 
                'bg-yellow-50 text-yellow-500'
              }`}>{order.status.replace('_', ' ')}</span>
              <span className="font-black text-lg">{order.total.toFixed(2)}€</span>
            </div>
          </Link>
        ))}
      </div>
      {filteredOrders.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-300 font-black uppercase tracking-widest text-sm">No orders found in this category</p>
        </div>
      )}
    </div>
  );
};

const DashboardStats = () => {
  const { orders, t } = useAppContext();
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7);
  const stats = useMemo(() => {
    const todayOrders = orders.filter(o => o.date === today);
    const monthOrders = orders.filter(o => o.date.startsWith(currentMonth));
    const revenueToday = todayOrders.reduce((acc, o) => acc + o.total, 0);
    const revenueMonth = monthOrders.reduce((acc, o) => acc + o.total, 0);
    return { revenueToday, revenueMonth, profit: (revenueMonth * 0.6) };
  }, [orders, today, currentMonth]);
  return (
    <div className="pt-[100px] px-4 md:px-12 max-w-7xl mx-auto lg:pl-32 min-h-screen pb-32">
      <h2 className="text-4xl md:text-6xl font-black uppercase mb-12 tracking-tighter">Statistics<span className="text-yellow-500">.</span></h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
          <p className="text-[10px] font-black text-gray-300 uppercase mb-4">{t.dashboard.revenueToday}</p>
          <p className="text-4xl font-black tracking-tighter">{stats.revenueToday.toFixed(2)}€</p>
        </div>
        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
          <p className="text-[10px] font-black text-gray-300 uppercase mb-4">{t.dashboard.revenueMonth}</p>
          <p className="text-4xl font-black tracking-tighter text-yellow-600">{stats.revenueMonth.toFixed(2)}€</p>
        </div>
        <div className="bg-black text-white p-10 rounded-[2.5rem] shadow-2xl text-center">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-4">Gross Profit</p>
          <p className="text-4xl font-black tracking-tighter text-green-400">{stats.profit.toFixed(2)}€</p>
        </div>
      </div>
    </div>
  );
};

const DashboardHistory = () => {
  const { orders, t } = useAppContext();
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const filtered = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (filter === 'today') return orders.filter(o => o.date === todayStr);
    if (filter === 'month') return orders.filter(o => o.date.startsWith(todayStr.substring(0, 7)));
    return orders;
  }, [orders, filter]);
  return (
    <div className="pt-[100px] px-4 md:px-12 max-w-7xl mx-auto lg:pl-32 min-h-screen pb-32">
      <div className="flex flex-col md:flex-row justify-between items-baseline mb-12 gap-8">
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">History<span className="text-yellow-500">.</span></h2>
        <div className="flex gap-2">
          {['all', 'today', 'month'].map(f => (
            <button key={f} onClick={() => setFilter(f as any)} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-black text-white' : 'bg-white text-gray-400 border border-gray-100'}`}>{f}</button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[700px]">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-gray-300 uppercase">Order</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-300 uppercase">Date</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-300 uppercase">Total</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-300 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 font-bold">
            {filtered.map(order => (
              <tr key={order.id} className="hover:bg-gray-50/20">
                <td className="px-8 py-6 font-black">{order.orderNumber}</td>
                <td className="px-8 py-6 text-[11px] uppercase">{order.date}</td>
                <td className="px-8 py-6 text-base font-black">{order.total.toFixed(2)}€</td>
                <td className="px-8 py-6"><span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${order.status === 'delivered' ? 'bg-green-50 text-green-500' : 'bg-blue-50 text-blue-500'}`}>{order.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DashboardOrderDetails = () => {
  const { id } = useParams();
  const { orders, setOrders, menu, lang, t } = useAppContext();
  const order = orders.find(o => o.id === id);
  if (!order) return <div className="pt-40 lg:pl-32">Order not found</div>;
  const updateStatus = (status: OrderStatus) => setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  return (
    <div className="pt-[100px] px-4 md:px-12 max-w-4xl mx-auto lg:pl-32 min-h-screen pb-32">
       <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-2xl">
          <h2 className="text-3xl font-black uppercase mb-10 tracking-tight">{order.orderNumber}</h2>
          <div className="space-y-8 mb-12">
             <div className="grid grid-cols-2 gap-8 uppercase font-black tracking-tight text-[11px]">
                <div><p className="text-gray-300 mb-1">Customer</p><p className="text-base">{order.customerName}</p><p className="text-gray-400 mt-1">{order.phone}</p></div>
                <div><p className="text-gray-300 mb-1">Address</p><p className="text-base">{order.address}</p><p className="text-gray-400 mt-1">{order.zipCode} {order.city}</p></div>
             </div>
             <div className="border-t border-gray-50 pt-8 space-y-4">
                {order.items.map((oi, i) => {
                  const m = menu.find(x => x.id === oi.menuItemId);
                  return <div key={i} className="flex justify-between font-bold text-sm uppercase"><span>{oi.quantity}x {m?.name[lang]}</span><span>{(oi.price * oi.quantity).toFixed(2)}€</span></div>
                })}
                <div className="pt-6 border-t border-gray-50 flex justify-between font-black text-2xl tracking-tighter"><span>TOTAL</span><span>{order.total.toFixed(2)}€</span></div>
             </div>
          </div>
          <div className="flex flex-wrap gap-3">
             {(['processing', 'on_the_way', 'delivered'] as OrderStatus[]).map(s => (
               <button key={s} onClick={() => updateStatus(s)} className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${order.status === s ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{s.replace('_', ' ')}</button>
             ))}
          </div>
       </div>
    </div>
  );
};

const DashboardMenuMgmt = () => {
  const { menu, setMenu, lang, t } = useAppContext();
  const remove = (id: string) => setMenu(p => p.filter(m => m.id !== id));
  return (
    <div className="pt-[100px] px-4 md:px-12 max-w-7xl mx-auto lg:pl-32 min-h-screen pb-32">
       <div className="flex justify-between items-end mb-12">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">Menu Management</h2>
          <button className="bg-black text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg">+ {t.dashboard.addNewItem}</button>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {menu.map(item => (
            <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-gray-100 flex gap-5 items-center hover:shadow-lg transition-all">
               <img src={item.image} className="w-20 h-20 rounded-2xl object-cover shadow-sm" alt="" />
               <div className="flex-1 overflow-hidden font-black uppercase">
                  <h4 className="text-sm truncate tracking-tight">{item.name[lang]}</h4>
                  <p className="text-gray-400 text-[10px] mt-0.5">{item.price.toFixed(2)}€</p>
                  <div className="flex gap-2 mt-3"><button className="p-2.5 bg-gray-50 rounded-xl hover:bg-black hover:text-white transition-all"><Icons.Edit /></button><button onClick={() => remove(item.id)} className="p-2.5 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Icons.Trash /></button></div>
               </div>
            </div>
          ))}
       </div>
    </div>
  );
};

const DashboardLogin = () => {
  const { t } = useAppContext();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
      <div className="max-w-md w-full p-12 md:p-16 rounded-[3rem] border border-gray-100 shadow-2xl text-center">
        <h2 className="text-3xl font-black uppercase mb-10 tracking-tighter">STAFF PORTAL<span className="text-yellow-500">.</span></h2>
        <div className="space-y-5">
          <div className="text-left space-y-1.5"><label className="text-[9px] font-black uppercase text-gray-400 ml-1">{t.dashboard.email}</label><input type="email" defaultValue="staff@banana-sushi.de" className="w-full bg-gray-50 border-none rounded-2xl p-5 outline-none font-bold text-sm" /></div>
          <div className="text-left space-y-1.5"><label className="text-[9px] font-black uppercase text-gray-400 ml-1">{t.dashboard.password}</label><input type="password" defaultValue="password123" className="w-full bg-gray-50 border-none rounded-2xl p-5 outline-none font-bold text-sm" /></div>
          <button onClick={() => navigate('/dashboard/orders')} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] mt-4 hover:bg-yellow-500 hover:text-black transition-all shadow-xl">{t.dashboard.loginBtn}</button>
        </div>
      </div>
    </div>
  );
};

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gray-50 selection:bg-yellow-200">
    <DashboardSidebar />
    <DashboardSidebarMobile />
    <div className="animate-fade-in">{children}</div>
  </div>
);

// --- Dashboard Sidebar Components ---
const DashboardSidebar = () => {
  const { t } = useAppContext();
  const location = useLocation();
  const links = [
    { to: '/dashboard/orders', label: t.dashboard.orders, icon: <Icons.Clock /> },
    { to: '/dashboard/history', label: t.dashboard.history, icon: <Icons.Cart /> },
    { to: '/dashboard/stats', label: t.dashboard.stats, icon: <Icons.Stats /> },
    { to: '/dashboard/menu', label: t.dashboard.menuMgmt, icon: <Icons.Edit /> },
  ];
  return (
    <aside className="fixed top-0 left-0 bottom-0 w-24 hidden lg:flex flex-col items-center py-10 bg-black border-r border-gray-900 z-50">
      <Link to="/" className="text-yellow-500 font-black text-2xl mb-16">B.</Link>
      <div className="flex flex-col gap-10">
        {links.map(link => (
          <Link key={link.to} to={link.to} className={`group relative flex flex-col items-center gap-2 transition-all ${location.pathname === link.to ? 'text-yellow-500' : 'text-gray-500 hover:text-white'}`}>
            <div className={`absolute -left-6 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-yellow-500 rounded-r-full transition-transform ${location.pathname === link.to ? 'scale-y-100' : 'scale-y-0'}`}></div>
            {link.icon}
            <span className="text-[7px] font-black uppercase tracking-widest">{link.label}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
};

const DashboardSidebarMobile = () => {
  const { t } = useAppContext();
  const location = useLocation();
  const links = [
    { to: '/dashboard/orders', label: t.dashboard.orders, icon: <Icons.Clock /> },
    { to: '/dashboard/history', label: t.dashboard.history, icon: <Icons.Cart /> },
    { to: '/dashboard/stats', label: t.dashboard.stats, icon: <Icons.Stats /> },
    { to: '/dashboard/menu', label: t.dashboard.menuMgmt, icon: <Icons.Edit /> },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t border-gray-100 z-50 flex justify-around py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {links.map(link => (
        <Link key={link.to} to={link.to} className={`flex flex-col items-center gap-1 ${location.pathname === link.to ? 'text-black' : 'text-gray-300'}`}>
          {link.icon}
          <span className="text-[7px] font-black uppercase tracking-widest">{link.label}</span>
        </Link>
      ))}
    </div>
  );
};

// --- Footer ---
const Footer = () => {
  const { t } = useAppContext();
  const location = useLocation();
  if (location.pathname.startsWith('/dashboard')) return null;
  return (
    <footer className="bg-white border-t border-gray-100 py-20 px-4 md:px-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
        <div className="text-center md:text-left">
          <Link to="/" className="text-xl font-black uppercase">BANANA SUSHI<span className="text-yellow-500">.</span></Link>
          <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-6">© {new Date().getFullYear()} {t.footer.rights}</p>
        </div>
        <div className="flex gap-4">
          <a href="#" className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center hover:bg-black hover:text-white transition-all"><Icons.Facebook /></a>
          <a href="#" className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center hover:bg-black hover:text-white transition-all"><Icons.Instagram /></a>
        </div>
        <div className="text-center md:text-right font-black uppercase text-[9px] text-gray-400 tracking-[0.2em] space-y-2">
          <Link to="/dashboard/login" className="block text-black hover:text-yellow-500 transition-colors uppercase tracking-widest">{t.nav.dashboard} Access</Link>
        </div>
      </div>
    </footer>
  );
};

const StickyCartMobile: React.FC = () => {
  const { cart, t } = useAppContext();
  const location = useLocation();
  if (cart.length === 0 || location.pathname.startsWith('/dashboard') || location.pathname === '/order') return null;
  return (
    <div className="fixed bottom-6 left-4 right-4 z-[90] lg:hidden animate-slide-up">
      <Link to="/order" className="bg-black text-white p-5 rounded-[2rem] flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4"><div className="bg-yellow-500 text-black w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs">{cart.reduce((acc, c) => acc + c.quantity, 0)}</div><span className="text-[10px] font-black uppercase tracking-widest">{t.nav.orderNow}</span></div>
        <Icons.ChevronRight />
      </Link>
    </div>
  );
};

const BackToTop = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const handleScroll = () => setShow(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  if (!show) return null;
  return (
    <button 
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-24 right-8 z-[150] bg-white text-black w-12 h-12 rounded-full shadow-2xl flex items-center justify-center hover:bg-yellow-500 transition-all animate-slide-up border border-gray-100 group"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 transition-transform group-hover:-translate-y-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
    </button>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <ScrollToTop />
        <div className="min-h-screen flex flex-col bg-white overflow-x-hidden selection:bg-yellow-200">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<OnePageHome />} />
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/order" element={<OrderPage />} />
              <Route path="/dashboard/login" element={<DashboardLogin />} />
              <Route path="/dashboard/orders" element={<DashboardLayout><DashboardOrders /></DashboardLayout>} />
              <Route path="/dashboard/history" element={<DashboardLayout><DashboardHistory /></DashboardLayout>} />
              <Route path="/dashboard/stats" element={<DashboardLayout><DashboardStats /></DashboardLayout>} />
              <Route path="/dashboard/order/:id" element={<DashboardLayout><DashboardOrderDetails /></DashboardLayout>} />
              <Route path="/dashboard/menu" element={<DashboardLayout><DashboardMenuMgmt /></DashboardLayout>} />
            </Routes>
          </main>
          <BackToTop />
          <StickyCartMobile />
          <Footer />
        </div>
      </Router>
      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
        .animate-zoom-in { animation: zoom-in 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </AppProvider>
  );
};

export default App;
