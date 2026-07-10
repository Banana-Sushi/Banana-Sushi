'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';

function VerifyContent() {
  const { t } = useAppContext();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }

    fetch('/api/customer/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => setStatus(res.ok ? 'success' : 'error'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="pt-[100px] md:pt-[130px] min-h-screen px-4 flex items-center justify-center">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-8">{t.account.verifyTitle}</h1>

        {status === 'loading' && (
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" />
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-gray-700 font-bold mb-8">{t.account.verifySuccess}</p>
            <Link href="/account/login" className="bg-black text-white px-8 py-4 rounded-full font-black uppercase tracking-[0.2em] text-[11px] hover:bg-yellow-500 hover:text-black transition-all inline-block">
              {t.account.verifyGoToLogin}
            </Link>
          </>
        )}

        {status === 'error' && (
          <p className="text-red-500 font-bold">{t.account.verifyError}</p>
        )}
      </div>
    </div>
  );
}

export default function AccountVerifyPage() {
  return (
    <Suspense fallback={<div className="pt-[130px] min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>}>
      <VerifyContent />
    </Suspense>
  );
}
