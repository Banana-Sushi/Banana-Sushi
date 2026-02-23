'use client';

import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';

export default function SuccessPage() {
  const { t } = useAppContext();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-20 px-4 text-center animate-fade-in">
      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-10 text-4xl shadow-lg">
        ✓
      </div>
      <h2 className="text-4xl md:text-5xl font-black uppercase mb-6 tracking-tighter">{t.checkout.success}</h2>
      <p className="text-gray-500 font-bold uppercase tracking-wide max-w-md mb-4 text-sm leading-relaxed">
        {t.checkout.successSub}
      </p>
      <p className="text-gray-400 font-bold text-xs uppercase tracking-widest max-w-xs mb-12 bg-yellow-50 border border-yellow-200 px-5 py-3 rounded-2xl">
        {t.checkout.successSpam}
      </p>
      <Link href="/" className="bg-black text-white px-12 py-5 rounded-full font-black uppercase tracking-widest text-[11px] hover:bg-yellow-500 hover:text-black transition-all">
        {t.checkout.backHome}
      </Link>
    </div>
  );
}
