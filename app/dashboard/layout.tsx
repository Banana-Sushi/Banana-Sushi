import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardSidebarMobile } from '@/components/dashboard/DashboardSidebarMobile';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 selection:bg-yellow-200">
      <DashboardSidebar />
      <DashboardSidebarMobile />
      <div className="animate-fade-in">{children}</div>
    </div>
  );
}
