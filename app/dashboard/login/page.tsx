'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';

export default function LoginPage() {
  const { t, addToast } = useAppContext();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      router.push('/dashboard/orders');
      router.refresh();
    } catch (err: any) {
      addToast(err.message, 'error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
      <div className="max-w-md w-full p-12 md:p-16 rounded-[3rem] border border-gray-100 shadow-2xl text-center">
        <h2 className="text-3xl font-black uppercase mb-10 tracking-tighter">
          STAFF PORTAL<span className="text-yellow-500">.</span>
        </h2>
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="text-left space-y-1.5">
            <label className="text-[9px] font-black uppercase text-gray-400 ml-1">{t.dashboard.email}</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl p-5 outline-none font-bold text-sm"
              placeholder="staff@banana-sushi.de"
            />
          </div>
          <div className="text-left space-y-1.5">
            <label className="text-[9px] font-black uppercase text-gray-400 ml-1">{t.dashboard.password}</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl p-5 outline-none font-bold text-sm"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] mt-4 hover:bg-yellow-500 hover:text-black transition-all shadow-xl disabled:opacity-50"
          >
            {loading ? '...' : t.dashboard.loginBtn}
          </button>
        </form>
      </div>
    </div>
  );
}
