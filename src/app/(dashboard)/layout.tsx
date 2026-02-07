import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:top-16 md:bottom-0 border-r bg-card overflow-y-auto">
          <Sidebar />
        </aside>

        {/* Main content */}
        <main className="flex-1 md:pl-64">
          <div className="container py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
