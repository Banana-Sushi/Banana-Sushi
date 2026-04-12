import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import '@/globals.css';
import { AppProvider } from '@/context/AppContext';
import { LangSync } from '@/components/LangSync';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ToastContainer } from '@/components/Toast';
import { BackToTop } from '@/components/BackToTop';
import { StickyCartMobile } from '@/components/StickyCartMobile';

const inter = Inter({ subsets: ['latin'], weight: ['400', '700', '900'] });

export const metadata: Metadata = {
  title: 'Sushi Banana — Passion on a plate',
  description: 'Fresh sushi delivered to your door. Order online at Sushi Banana Berlin.',
  icons: {
    icon: '/logo.png',
    apple: [{ url: '/logo.png', sizes: '512x512', type: 'image/png' }],
  },
  openGraph: {
    images: [{ url: '/logo.png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-white overflow-x-hidden selection:bg-yellow-200`}>
        <AppProvider>
          <LangSync />
          <Navbar />
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
