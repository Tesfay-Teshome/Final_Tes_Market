import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import AdministratorHeader from '@/components/navigation/AdministratorHeader';
import AdministratorSidebar from '@/components/navigation/AdministratorSidebar';
import VendorApprovalPopup from '@/components/admin/VendorApprovalPopup';

const AdministratorLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0F14] via-[#0F141B] to-[#0B0F14]">
      <AdministratorHeader />
      <VendorApprovalPopup />
      <div className="relative flex min-h-screen">
        {/* Mobile Toolbar (Secondary navbar for menu toggle) */}
        {!isSidebarOpen && (
          <div className="md:hidden fixed top-16 left-0 right-0 z-40 h-14 bg-[rgba(20,30,40,0.55)] backdrop-blur-md border-b border-[rgba(0,255,180,0.10)] flex items-center px-4">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsSidebarOpen(true);
              }}
              className="rounded-lg bg-[rgba(20,30,40,0.55)] border border-[rgba(0,255,180,0.10)] px-3 py-2 text-emerald-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="hidden md:block md:fixed md:inset-y-0 md:top-16 md:left-0 md:z-30">
          <AdministratorSidebar />
        </div>

        {isSidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/50 md:hidden"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsSidebarOpen(false);
              }}
            />
            <AdministratorSidebar
              className="md:hidden fixed top-16 left-0 bottom-0 z-40"
              showCloseButton
              onClose={() => setIsSidebarOpen(false)}
            />
          </>
        )}

        <main className="w-full min-h-screen md:ml-64 overflow-x-hidden pt-[120px] md:pt-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdministratorLayout;