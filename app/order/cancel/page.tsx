'use client';

import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';

export default function CancelPage() {
  const { t } = useAppContext();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-20 px-4 text-center animate-fade-in">
      <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-10 text-4xl shadow-lg">
        ✕
      </div>
      <h2 className="text-4xl md:text-5xl font-black uppercase mb-6 tracking-tighter">Payment Cancelled</h2>
      <p className="text-gray-500 font-bold uppercase tracking-wide max-w-md mb-12 text-sm">
        Your payment was cancelled. Your cart is still saved — you can try again.
      </p>
      <div className="flex gap-4">
        <Link href="/order" className="bg-black text-white px-10 py-5 rounded-full font-black uppercase tracking-widest text-[11px] hover:bg-yellow-500 hover:text-black transition-all">
          Try Again
        </Link>
        <Link href="/" className="bg-gray-100 text-black px-10 py-5 rounded-full font-black uppercase tracking-widest text-[11px] hover:bg-gray-200 transition-all">
          {t.checkout.backHome}
        </Link>
      </div>
    </div>
  );
}
