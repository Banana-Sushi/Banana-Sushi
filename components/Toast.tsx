'use client';

import { useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';

const ToastItem = ({ id, msg, type }: { id: number; msg: string; type: string }) => {
  const { removeToast } = useAppContext();
  useEffect(() => {
    const timer = setTimeout(() => removeToast(id), 3000);
    return () => clearTimeout(timer);
  }, [id, removeToast]);

  return (
    <div className="px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-up bg-black text-white">
      <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${type === 'error' ? 'bg-red-400' : 'bg-yellow-500'}`} />
      <p className="font-black uppercase tracking-widest text-[9px]">{msg}</p>
    </div>
  );
};

export const ToastContainer = () => {
  const { toasts } = useAppContext();
  return (
    <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-2 print:hidden">
      {toasts.map(t => <ToastItem key={t.id} {...t} />)}
    </div>
  );
};
