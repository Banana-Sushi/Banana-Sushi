'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useDashboardOrders } from '@/context/DashboardOrdersContext';

// Chrome mutes any AudioContext created outside of a user gesture (e.g. from
// a WebSocket callback firing when a new order arrives). Reusing one
// instance that was unlocked by an earlier click/keydown keeps it audible
// for the rest of the tab's lifetime.
let audioContext: AudioContext | null = null;

function unlockAudioContext() {
  if (!audioContext) audioContext = new AudioContext();
}

function playTone(ctx: AudioContext, freq: number, start: number, duration: number, volume: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.type = 'sine';
  oscillator.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

export function playOrderBeep() {
  try {
    const ctx = audioContext ?? (audioContext = new AudioContext());
    const now = ctx.currentTime;
    playTone(ctx, 880,  now,        0.6, 0.7);  // A5
    playTone(ctx, 1320, now + 0.6,  0.6, 0.7);  // E6
    playTone(ctx, 880,  now + 1.2,  0.6, 0.7);  // A5
    playTone(ctx, 1320, now + 1.8,  0.6, 0.7);  // E6
    playTone(ctx, 880,  now + 2.4,  0.6, 0.7);  // A5
    playTone(ctx, 1320, now + 3.0,  1.6, 0.6);  // E6 — final tone, long decay
  } catch {}
}

function notifyDesktop(orderNumber: string, customerName: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  new Notification('New Order!', {
    body: `Order #${orderNumber} from ${customerName}`,
    icon: '/favicon.ico',
    tag: `order-${orderNumber}`,
  });
}

// An order becomes something staff needs to act on exactly once:
// - Cash / pickup-cash orders are inserted directly with status 'processing'.
// - Online / pickup-online orders are inserted as 'pending' and only flip to
//   'processing' once Stripe's webhook confirms payment succeeded.
// Either way, the first time an order's status is 'processing' is the moment
// to alert — regardless of which payment option the customer picked.
function isNewlyProcessing(order: { status?: string }): boolean {
  return order.status === 'processing';
}

export function DashboardNotificationProvider({ children }: { children: React.ReactNode }) {
  const alertedOrderIds = useRef<Set<string>>(new Set());
  const seededRef = useRef(false);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const { markNewOrder, markSessionExpired, clearSessionExpired } = useDashboardOrders();

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    document.addEventListener('click', unlockAudioContext);
    document.addEventListener('keydown', unlockAudioContext);

    const alertOnce = (order: any) => {
      if (!order?.id || !isNewlyProcessing(order) || alertedOrderIds.current.has(order.id)) return;
      alertedOrderIds.current.add(order.id);
      playOrderBeep();
      if (pathnameRef.current !== '/dashboard/orders') markNewOrder();
      if (order.order_number && order.customer_name) {
        notifyDesktop(order.order_number, order.customer_name);
      }
    };

    // Realtime postgres_changes events don't replay if the tab's WebSocket
    // was briefly disconnected (sleep/wake, wifi blip, backgrounded tab) when
    // an order came in — that alert is then lost for good. This poll is a
    // backstop: it re-checks for any 'processing' order we haven't alerted on
    // yet, catching whatever the socket missed.
    const checkForMissedOrders = async () => {
      try {
        const res = await fetch('/api/orders');
        if (res.status === 401) { markSessionExpired(); return; }
        if (!res.ok) return;
        clearSessionExpired();
        const orders = await res.json();
        if (!Array.isArray(orders)) return;
        if (!seededRef.current) {
          // Don't alert for orders that were already processing before the dashboard opened.
          orders.forEach((o: any) => { if (o?.id && isNewlyProcessing(o)) alertedOrderIds.current.add(o.id); });
          seededRef.current = true;
          return;
        }
        orders.forEach(alertOnce);
      } catch {}
    };

    void checkForMissedOrders();

    const channel = supabase
      .channel('dashboard-order-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, ({ new: order }) => alertOnce(order))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, ({ new: order }) => alertOnce(order))
      .subscribe();

    const poller = window.setInterval(() => { void checkForMissedOrders(); }, 20000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void checkForMissedOrders();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('click', unlockAudioContext);
      document.removeEventListener('keydown', unlockAudioContext);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      window.clearInterval(poller);
      supabase.removeChannel(channel);
    };
  }, []);

  return <>{children}</>;
}
