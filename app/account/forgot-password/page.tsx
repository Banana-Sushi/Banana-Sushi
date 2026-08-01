'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';

export default function ForgotPasswordPage() {
  const { t } = useAppContext();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await fetch('/api/customer/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    setLoading(false);
    setSuccess(true);
  };

  const inputClass = "w-full p-5 rounded-2xl border border-gray-100 outline-none font-bold shadow-sm placeholder:text-gray-300 text-sm focus:border-black transition-colors";

  if (success) {
    return (
      <div className="pt-[100px] md:pt-[130px] min-h-screen px-4 flex items-center justify-center">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-8">
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-3">{t.account.forgotPasswordTitle}</h2>
          <p className="text-gray-500 font-bold text-sm leading-relaxed mb-8">{t.account.forgotPasswordSuccess}</p>
          <Link
            href="/account/login"
            className="inline-block bg-black text-white px-8 py-4 rounded-full font-black uppercase tracking-[0.2em] text-[11px] hover:bg-yellow-500 hover:text-black transition-all"
          >
            {t.account.loginBtn}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-[100px] md:pt-[130px] min-h-screen px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">{t.account.forgotPasswordTitle}</h1>
        <p className="text-gray-400 text-sm font-bold mb-10">{t.account.forgotPasswordHint}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            required
            type="email"
            placeholder={t.account.email}
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={inputClass}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-50"
          >
            {loading ? '...' : t.account.forgotPasswordBtn}
          </button>

          <Link
            href="/account/login"
            className="block text-center text-gray-400 text-xs font-bold underline underline-offset-2 hover:text-black transition-colors pt-2"
          >
            {t.account.backToLogin}
          </Link>
        </form>
      </div>
    </div>
  );
}
