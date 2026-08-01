'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Icons } from '@/components/Icons';

function LoginForm() {
  const { t, lang } = useAppContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/account';

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startCountdown(secs: number) {
    setCountdown(secs);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setError(null);
          setRemaining(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function formatCountdown(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (countdown > 0) return;
    setLoading(true);
    setError(null);
    setRemaining(null);

    const res = await fetch('/api/customer/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (res.status === 429) {
      setError(data.error);
      if (data.retryAfter) startCountdown(data.retryAfter);
      return;
    }

    if (!res.ok) {
      setError(data.error ?? 'Login failed');
      if (typeof data.remaining === 'number') setRemaining(data.remaining);
      return;
    }

    router.push(redirect);
    router.refresh();
  };

  const isLocked = countdown > 0;
  const inputClass = "w-full p-5 rounded-2xl border border-gray-100 outline-none font-bold shadow-sm placeholder:text-gray-300 text-sm focus:border-black transition-colors";

  return (
    <div className="pt-[100px] md:pt-[130px] min-h-screen px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">{t.account.loginTitle}</h1>
        <p className="text-gray-400 text-sm font-bold mb-10">
          {t.account.noAccount}{' '}
          <Link href="/account/register" className="text-black underline underline-offset-2 hover:text-yellow-500 transition-colors">
            {t.account.createAccount}
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            required
            type="email"
            placeholder={t.account.email}
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            disabled={isLocked}
            className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          <div className="relative">
            <input
              required
              type={showPassword ? 'text' : 'password'}
              placeholder={t.account.password}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              disabled={isLocked}
              className={`${inputClass} pr-14 disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              tabIndex={-1}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-black transition-colors"
            >
              {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
            </button>
          </div>

          <div className="text-right -mt-1">
            <Link href="/account/forgot-password" className="text-gray-400 text-xs font-bold underline underline-offset-2 hover:text-black transition-colors">
              {t.account.forgotPassword}
            </Link>
          </div>

          {/* Remaining attempts warning */}
          {remaining !== null && remaining <= 3 && remaining > 0 && !isLocked && (
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3">
              <span className="text-orange-500 text-lg">⚠️</span>
              <p className="text-orange-700 text-xs font-black uppercase tracking-widest">
                {lang === 'de'
                  ? `Noch ${remaining} Versuch${remaining !== 1 ? 'e' : ''} übrig`
                  : `${remaining} attempt${remaining !== 1 ? 's' : ''} remaining`}
              </p>
            </div>
          )}

          {/* Locked-out countdown */}
          {isLocked && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-red-700 text-xs font-black uppercase tracking-widest">
                  {lang === 'de' ? 'Zu viele Versuche' : 'Too many attempts'}
                </p>
                <span className="font-black text-red-600 text-xl tabular-nums">
                  {formatCountdown(countdown)}
                </span>
              </div>
              <div className="w-full bg-red-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-red-400 rounded-full transition-all duration-1000"
                  style={{ width: `${(countdown / (Math.round(countdown / 60) * 60 || 900)) * 100}%` }}
                />
              </div>
              <p className="text-red-400 text-[11px] font-bold mt-2">
                {error}
              </p>
            </div>
          )}

          {/* Generic error (not lockout) */}
          {error && !isLocked && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <p className="text-red-600 text-xs font-black uppercase tracking-widest">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isLocked}
            className="w-full bg-black text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white"
          >
            {isLocked
              ? (lang === 'de' ? `Gesperrt · ${formatCountdown(countdown)}` : `Locked · ${formatCountdown(countdown)}`)
              : loading ? '...' : t.account.loginBtn}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AccountLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
