import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { CreditsProvider } from '@/components/providers/credits-provider';
import { VisitTracker } from '@/components/providers/visit-tracker';
import { HelpModeOverlay } from '@/components/layout/help-mode-overlay';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <CreditsProvider>
      <VisitTracker />
      <HelpModeOverlay />
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          {/* Desktop Sidebar */}
          <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:top-14 md:bottom-0 border-r bg-card overflow-y-auto sidebar-scroll">
            <Sidebar />
          </aside>

          {/* Main content */}
          <main className="flex-1 md:pl-64 min-w-0 overflow-x-hidden">
            <div className="px-4 py-4 md:px-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </CreditsProvider>
  );
}
