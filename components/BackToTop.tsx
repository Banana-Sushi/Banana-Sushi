'use client';

import { useState, useEffect } from 'react';
import { Icons } from './Icons';

export const BackToTop = () => {
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
      className="fixed bottom-24 right-8 z-[150] bg-white text-black w-12 h-12 rounded-full shadow-2xl flex items-center justify-center hover:bg-yellow-500 transition-all animate-slide-up border border-gray-100 group print:hidden"
    >
      <Icons.ChevronUp />
    </button>
  );
};
