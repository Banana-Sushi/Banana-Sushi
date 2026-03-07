import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { cookies } from 'next/headers';
import '@/globals.css';
import { AppProvider } from '@/context/AppContext';
import { LangSync } from '@/components/LangSync';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ToastContainer } from '@/components/Toast';
import { BackToTop } from '@/components/BackToTop';
import { StickyCartMobile } from '@/components/StickyCartMobile';
import { verifyToken } from '@/lib/auth';

const inter = Inter({ subsets: ['latin'], weight: ['400', '700', '900'] });

export const metadata: Metadata = {
  title: 'Banana Sushi — Premium Sushi Delivery',
  description: 'Fresh sushi delivered to your door. Order online at Banana Sushi Berlin.',
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png' }],
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    images: [{ url: '/logo.png' }],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  const role = (user?.role ?? null) as 'admin' | 'staff' | null;

  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${inter.className} bg-white overflow-x-hidden selection:bg-yellow-200`}>
        <AppProvider>
          <LangSync />
          <Navbar role={role} />
          <main className="min-h-screen flex flex-col">
            {children}
          </main>
          <Footer />
          <BackToTop />
          <StickyCartMobile />
          <ToastContainer />
        </AppProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
