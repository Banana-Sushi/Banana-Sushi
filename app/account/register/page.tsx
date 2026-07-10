'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';

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

export default function AccountRegisterPage() {
  const { t, lang } = useAppContext();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
    birthdate: '',
    phone: '',
    street: '',
    zip: '',
    city: '',
    marketingConsent: false,
    discountEmailsConsent: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid(form.password)) {
      setError(lang === 'de'
        ? 'Das Passwort erfüllt nicht alle Anforderungen.'
        : 'Password does not meet all requirements.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError(t.account.passwordMismatch);
      return;
    }

    if (!form.marketingConsent) {
      setError(t.account.termsRequired);
      return;
    }

    setLoading(true);

    const { confirmPassword, ...payload } = form;
    const res = await fetch('/api/customer/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Registration failed');
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <div className="pt-[100px] md:pt-[130px] min-h-screen px-4 flex items-center justify-center">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-8">
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-3">{t.account.registerTitle}</h2>
          <p className="text-gray-500 font-bold text-sm leading-relaxed mb-8">{t.account.registerSuccess}</p>
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

  const inputClass = "w-full p-5 rounded-2xl border border-gray-100 outline-none font-bold shadow-sm placeholder:text-gray-300 text-sm focus:border-black transition-colors";
  const strength = passwordStrength(form.password);
  const strengthColors = ['bg-gray-200', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-lime-400', 'bg-green-500'];
  const passwordTouched = form.password.length > 0;

  const passwordMatchOk = form.confirmPassword.length > 0 && form.password === form.confirmPassword;
  const passwordMatchFail = form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  return (
    <div className="pt-[100px] md:pt-[130px] px-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">{t.account.registerTitle}</h1>
        <p className="text-gray-400 text-sm font-bold mb-10">
          {t.account.hasAccount}{' '}
          <Link href="/account/login" className="text-black underline underline-offset-2 hover:text-yellow-500 transition-colors">
            {t.account.login}
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Personal info */}
          <div className="grid grid-cols-2 gap-4">
            <input
              required
              placeholder={t.account.firstName}
              value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })}
              className={inputClass}
            />
            <input
              required
              placeholder={t.account.lastName}
              value={form.lastName}
              onChange={e => setForm({ ...form, lastName: e.target.value })}
              className={inputClass}
            />
          </div>

          <input
            required
            type="email"
            placeholder={t.account.email}
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className={inputClass}
          />

          {/* Password */}
          <div>
            <input
              required
              type="password"
              placeholder={t.account.password}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className={`${inputClass} ${passwordTouched && !isPasswordValid(form.password) ? 'border-orange-300' : passwordTouched && isPasswordValid(form.password) ? 'border-green-300' : ''}`}
            />

            {/* Strength bar */}
            {passwordTouched && (
              <div className="mt-2 mb-3">
                <div className="flex gap-1 mb-3">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColors[strength] : 'bg-gray-100'}`} />
                  ))}
                </div>
                {/* Requirements checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {PASSWORD_RULES.map(rule => {
                    const passed = rule.test(form.password);
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

          {/* Confirm password */}
          <div className="relative">
            <input
              required
              type="password"
              placeholder={t.account.confirmPassword}
              value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              className={`${inputClass} ${passwordMatchFail ? 'border-red-300' : passwordMatchOk ? 'border-green-300' : ''}`}
            />
            {passwordMatchOk && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </span>
            )}
          </div>
          {passwordMatchFail && (
            <p className="text-red-500 text-[11px] font-black uppercase tracking-widest -mt-1">{t.account.passwordMismatch}</p>
          )}

          {/* Optional fields */}
          <div className="grid grid-cols-2 gap-4">
            <select
              value={form.gender}
              onChange={e => setForm({ ...form, gender: e.target.value })}
              className={`${inputClass} text-gray-700 appearance-none bg-white`}
            >
              <option value="">{t.account.gender}</option>
              <option value="male">{lang === 'de' ? 'Männlich' : 'Male'}</option>
              <option value="female">{lang === 'de' ? 'Weiblich' : 'Female'}</option>
              <option value="other">{lang === 'de' ? 'Divers' : 'Other'}</option>
            </select>
            <input
              type="date"
              value={form.birthdate}
              onChange={e => setForm({ ...form, birthdate: e.target.value })}
              className={`${inputClass} text-gray-700`}
            />
          </div>

          <input
            type="tel"
            placeholder={t.account.phone}
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            className={inputClass}
          />

          {/* Address section */}
          <div className="pt-2">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3">
              {lang === 'de' ? 'Hauptadresse' : 'Main Address'}
            </p>
          </div>

          <input
            required
            placeholder={t.account.street}
            value={form.street}
            onChange={e => setForm({ ...form, street: e.target.value })}
            className={inputClass}
          />
          <div className="flex gap-3">
            <input
              required
              placeholder={t.account.zip}
              value={form.zip}
              onChange={e => setForm({ ...form, zip: e.target.value })}
              className="w-1/3 p-5 rounded-2xl border border-gray-100 outline-none font-bold shadow-sm placeholder:text-gray-300 text-sm focus:border-black transition-colors"
            />
            <input
              required
              placeholder={t.account.city}
              value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })}
              className="w-2/3 p-5 rounded-2xl border border-gray-100 outline-none font-bold shadow-sm placeholder:text-gray-300 text-sm focus:border-black transition-colors"
            />
          </div>

          {/* Consent checkboxes */}
          <div className="space-y-3 pt-2">
            {/* Terms — required */}
            <label className={`flex items-start gap-3 p-4 rounded-2xl cursor-pointer transition-colors ${form.marketingConsent ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 border border-transparent'}`}>
              <input
                type="checkbox"
                checked={form.marketingConsent}
                onChange={e => setForm({ ...form, marketingConsent: e.target.checked })}
                className="mt-0.5 accent-black w-4 h-4 shrink-0"
              />
              <span className="text-xs font-bold text-gray-700 leading-relaxed">
                {lang === 'de' ? (
                  <>
                    Ich akzeptiere die{' '}
                    <a href="/agb" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-yellow-600 transition-colors" onClick={e => e.stopPropagation()}>
                      AGB
                    </a>
                    . Meine Daten können für Marketingzwecke verwendet werden.
                  </>
                ) : (
                  <>
                    I accept the{' '}
                    <a href="/agb" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-yellow-600 transition-colors" onClick={e => e.stopPropagation()}>
                      Terms & Conditions
                    </a>
                    . My data may be used for marketing purposes.
                  </>
                )}
                <span className="text-red-500 ml-1">*</span>
              </span>
            </label>

            {/* Discount emails — optional */}
            <label className={`flex items-start gap-3 p-4 rounded-2xl cursor-pointer transition-colors ${form.discountEmailsConsent ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 border border-transparent'}`}>
              <input
                type="checkbox"
                checked={form.discountEmailsConsent}
                onChange={e => setForm({ ...form, discountEmailsConsent: e.target.checked })}
                className="mt-0.5 accent-black w-4 h-4 shrink-0"
              />
              <span className="text-xs font-bold text-gray-600 leading-relaxed">{t.account.discountEmails}</span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-red-600 text-xs font-black uppercase tracking-widest">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-50 mt-2"
          >
            {loading ? '...' : t.account.registerBtn}
          </button>
        </form>
      </div>
    </div>
  );
}
