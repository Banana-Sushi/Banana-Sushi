'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface DashboardOrdersContextValue {
  hasNewOrder: boolean;
  markNewOrder: () => void;
  clearNewOrder: () => void;
  sessionExpired: boolean;
  markSessionExpired: () => void;
  clearSessionExpired: () => void;
}

const DashboardOrdersContext = createContext<DashboardOrdersContextValue | null>(null);

export function DashboardOrdersProvider({ children }: { children: React.ReactNode }) {
  const [hasNewOrder, setHasNewOrder] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const markNewOrder = useCallback(() => setHasNewOrder(true), []);
  const clearNewOrder = useCallback(() => setHasNewOrder(false), []);
  const markSessionExpired = useCallback(() => setSessionExpired(true), []);
  const clearSessionExpired = useCallback(() => setSessionExpired(false), []);

  return (
    <DashboardOrdersContext.Provider value={{ hasNewOrder, markNewOrder, clearNewOrder, sessionExpired, markSessionExpired, clearSessionExpired }}>
      {children}
    </DashboardOrdersContext.Provider>
  );
}

export function useDashboardOrders() {
  const ctx = useContext(DashboardOrdersContext);
  if (!ctx) throw new Error('useDashboardOrders must be used within DashboardOrdersProvider');
  return ctx;
}
