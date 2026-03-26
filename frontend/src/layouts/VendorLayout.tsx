import { ReactNode, useState } from 'react';
import { Menu } from 'lucide-react';
import VendorSidebar from '@/components/navigation/VendorSidebar';
import NotificationPopup from '@/components/vendor/NotificationPopup';

interface VendorLayoutProps {
  children: ReactNode;
}

const VendorLayout = ({ children }: VendorLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#070B0F] flex flex-col overflow-x-hidden">
      <div className="relative flex flex-1 overflow-x-hidden">
        {!isSidebarOpen && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsSidebarOpen(true);
            }}
            className="md:hidden fixed top-4 left-4 z-[60] rounded-xl bg-[#0F1720]/90 backdrop-blur-md border border-[#3CFF9E]/20 px-3 py-2 text-[#3CFF9E] shadow-lg shadow-emerald-900/20 focus:outline-none focus:ring-2 focus:ring-[#3CFF9E]/40"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className="hidden md:block md:fixed md:inset-y-0 md:top-0 md:left-0 md:z-30">
          <VendorSidebar />
        </div>

        {isSidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsSidebarOpen(false);
              }}
            />
            <VendorSidebar
              className="md:hidden fixed top-0 left-0 bottom-0 z-40"
              showCloseButton
              onClose={() => setIsSidebarOpen(false)}
            />
          </>
        )}

        <main className="flex-1 w-full min-h-screen md:ml-64 overflow-x-hidden">
          {children}
        </main>
      </div>
      {/* Notification popup for shipping requests */}
      <NotificationPopup />
    </div>
  );
};

export default VendorLayout;