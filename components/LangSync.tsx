'use client';

import { useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';

export function LangSync() {
  const { lang } = useAppContext();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
