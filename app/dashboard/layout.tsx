import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardSidebarMobile } from '@/components/dashboard/DashboardSidebarMobile';
import { DashboardNotificationProvider } from '@/components/dashboard/DashboardNotificationProvider';
import { SessionExpiredModal } from '@/components/dashboard/SessionExpiredModal';
import { DashboardOrdersProvider } from '@/context/DashboardOrdersContext';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const user = token ? await verifyToken(token) : null;
  const role = (user?.role ?? null) as 'admin' | 'staff' | null;

  return (
    <div className="min-h-screen bg-gray-50 selection:bg-yellow-200">
      <DashboardOrdersProvider>
        <DashboardSidebar role={role} />
        <DashboardSidebarMobile role={role} />
        {user ? (
          <DashboardNotificationProvider>
            <div className="animate-fade-in">{children}</div>
          </DashboardNotificationProvider>
        ) : (
          <div className="animate-fade-in">{children}</div>
        )}
        {user && <SessionExpiredModal />}
      </DashboardOrdersProvider>
    </div>
  );
}
