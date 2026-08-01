'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Icons } from '@/components/Icons';

const PASSWORD_RULES = [
  { key: 'length',  label: { de: 'Mindestens 8 Zeichen',       en: 'At least 8 characters'        }, test: (p: string) => p.length >= 8 },
  { key: 'upper',   label: { de: 'Einen Großbuchstaben (A–Z)',  en: 'One uppercase letter (A–Z)'   }, test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower',   label: { de: 'Einen Kleinbuchstaben (a–z)', en: 'One lowercase letter (a–z)'   }, test: (p: string) => /[a-z]/.test(p) },
  { key: 'number',  label: { de: 'Eine Zahl (0–9)',             en: 'One number (0–9)'             }, test: (p: string) => /[0-9]/.test(p) },
  { key: 'symbol',  label: { de: 'Ein Sonderzeichen (!@#$…)',   en: 'One special character (!@#$…)' }, test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function passwordStrength(password: string): number {
  return PASSWORD_RULES.filter(r => r.test(password)).length;
}

function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every(r => r.test(password));
}

function ResetPasswordForm() {
  const { t, lang } = useAppContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid(password)) {
      setError(lang === 'de'
        ? 'Das Passwort erfüllt nicht alle Anforderungen.'
        : 'Password does not meet all requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError(t.account.passwordMismatch);
      return;
    }

    setLoading(true);

    const res = await fetch('/api/customer/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? t.account.resetPasswordError);
      return;
    }

    setSuccess(true);
  };

  const inputClass = "w-full p-5 rounded-2xl border border-gray-100 outline-none font-bold shadow-sm placeholder:text-gray-300 text-sm focus:border-black transition-colors";
  const strength = passwordStrength(password);
  const strengthColors = ['bg-gray-200', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-lime-400', 'bg-green-500'];
  const passwordTouched = password.length > 0;
  const passwordMatchOk = confirmPassword.length > 0 && password === confirmPassword;
  const passwordMatchFail = confirmPassword.length > 0 && password !== confirmPassword;

  if (!token) {
    return (
      <div className="pt-[100px] md:pt-[130px] min-h-screen px-4 flex items-center justify-center">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-8">{t.account.resetPasswordTitle}</h1>
          <p className="text-red-500 font-bold mb-8">{t.account.resetPasswordError}</p>
          <Link href="/account/forgot-password" className="bg-black text-white px-8 py-4 rounded-full font-black uppercase tracking-[0.2em] text-[11px] hover:bg-yellow-500 hover:text-black transition-all inline-block">
            {t.account.forgotPasswordBtn}
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="pt-[100px] md:pt-[130px] min-h-screen px-4 flex items-center justify-center">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-8">
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-3">{t.account.resetPasswordTitle}</h2>
          <p className="text-gray-500 font-bold text-sm leading-relaxed mb-8">{t.account.resetPasswordSuccess}</p>
          <button
            onClick={() => router.push('/account/login')}
            className="inline-block bg-black text-white px-8 py-4 rounded-full font-black uppercase tracking-[0.2em] text-[11px] hover:bg-yellow-500 hover:text-black transition-all"
          >
            {t.account.loginBtn}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-[100px] md:pt-[130px] min-h-screen px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">{t.account.resetPasswordTitle}</h1>
        <p className="text-gray-400 text-sm font-bold mb-10">{t.account.resetPasswordHint}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <input
                required
                type={showPassword ? 'text' : 'password'}
                placeholder={t.account.newPassword}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`${inputClass} pr-14 ${passwordTouched && !isPasswordValid(password) ? 'border-orange-300' : passwordTouched && isPasswordValid(password) ? 'border-green-300' : ''}`}
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

            {passwordTouched && (
              <div className="mt-2 mb-3">
                <div className="flex gap-1 mb-3">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColors[strength] : 'bg-gray-100'}`} />
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {PASSWORD_RULES.map(rule => {
                    const passed = rule.test(password);
                    return (
                      <div key={rule.key} className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black transition-colors ${passed ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {passed ? '✓' : '·'}
                        </span>
                        <span className={`text-[11px] font-bold transition-colors ${passed ? 'text-green-600' : 'text-gray-400'}`}>
                          {rule.label[lang as 'de' | 'en'] ?? rule.label.de}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <input
              required
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder={t.account.confirmPassword}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className={`${inputClass} ${passwordMatchOk ? 'pr-20' : 'pr-14'} ${passwordMatchFail ? 'border-red-300' : passwordMatchOk ? 'border-green-300' : ''}`}
            />
            {passwordMatchOk && (
              <span className="absolute right-12 top-1/2 -translate-y-1/2 text-green-500">
                <Icons.Check />
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowConfirmPassword(v => !v)}
              tabIndex={-1}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-black transition-colors"
            >
              {showConfirmPassword ? <Icons.EyeOff /> : <Icons.Eye />}
            </button>
          </div>
          {passwordMatchFail && (
            <p className="text-red-500 text-[11px] font-black uppercase tracking-widest -mt-1">{t.account.passwordMismatch}</p>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-red-600 text-xs font-black uppercase tracking-widest">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-50"
          >
            {loading ? '...' : t.account.resetPasswordBtn}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="pt-[130px] min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
