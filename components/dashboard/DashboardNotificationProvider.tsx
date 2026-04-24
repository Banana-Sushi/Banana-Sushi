'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export function playAlert() {
  try {
    const ctx = new AudioContext();

    function tone(freq: number, start: number, duration: number, vol: number) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.start(start);
      osc.stop(start + duration);
    }

    const t = ctx.currentTime;
    tone(880,  t,        0.6, 0.4);  // A5 — first tone
    tone(1320, t + 0.55, 1.4, 0.35); // E6 — second tone, higher, long decay
  } catch {}
}

function showBrowserNotification(orderNumber: string, customerName: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  new Notification('New Order!', {
    body: `Order #${orderNumber} from ${customerName}`,
    icon: '/favicon.ico',
    tag: `order-${orderNumber}`,
  });
}

export function DashboardNotificationProvider({ children }: { children: React.ReactNode }) {
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel('dashboard-global-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        const o = payload.new as any;
        if (o.status === 'pending') return;
        if (seenIds.current.has(o.id)) return;
        seenIds.current.add(o.id);
        playAlert();
        showBrowserNotification(o.order_number, o.customer_name);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
        const o = payload.new as any;
        if (seenIds.current.has(o.id)) return;
        if (o.status !== 'processing') return;
        seenIds.current.add(o.id);
        playAlert();
        showBrowserNotification(o.order_number, o.customer_name);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return <>{children}</>;
}
