import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import '@/globals.css';
import { AppProvider } from '@/context/AppContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ToastContainer } from '@/components/Toast';
import { BackToTop } from '@/components/BackToTop';
import { StickyCartMobile } from '@/components/StickyCartMobile';

const inter = Inter({ subsets: ['latin'], weight: ['400', '700', '900'] });

export const metadata: Metadata = {
  title: 'Banana Sushi — Premium Sushi Delivery',
  description: 'Fresh sushi delivered to your door. Order online at Banana Sushi Berlin.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={`${inter.className} bg-white overflow-x-hidden selection:bg-yellow-200`}>
        <AppProvider>
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
