'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface DashboardOrdersContextValue {
  hasNewOrder: boolean;
  markNewOrder: () => void;
  clearNewOrder: () => void;
}

const DashboardOrdersContext = createContext<DashboardOrdersContextValue | null>(null);

export function DashboardOrdersProvider({ children }: { children: React.ReactNode }) {
  const [hasNewOrder, setHasNewOrder] = useState(false);

  const markNewOrder = useCallback(() => setHasNewOrder(true), []);
  const clearNewOrder = useCallback(() => setHasNewOrder(false), []);

  return (
    <DashboardOrdersContext.Provider value={{ hasNewOrder, markNewOrder, clearNewOrder }}>
      {children}
    </DashboardOrdersContext.Provider>
  );
}

export function useDashboardOrders() {
  const ctx = useContext(DashboardOrdersContext);
  if (!ctx) throw new Error('useDashboardOrders must be used within DashboardOrdersProvider');
  return ctx;
}
