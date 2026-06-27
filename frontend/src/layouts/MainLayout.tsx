import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '@/components/navigation/Navbar';
import Footer from '@/components/navigation/Footer';
import VendorApprovalPopup from '@/components/admin/VendorApprovalPopup';

const MainLayout = () => {
  const location = useLocation();
  const hideFooter = location.pathname.startsWith('/messages') || location.pathname.startsWith('/buyer/dashboard') || location.pathname.startsWith('/store');
  const isStorefront = location.pathname.startsWith('/store');

  return (
    <div className={`min-h-[100dvh] flex flex-col ${hideFooter ? 'bg-[#070B0F]' : 'bg-white'}`}>
      <Navbar />
      <VendorApprovalPopup />
      <main className={`flex-grow ${isStorefront ? 'pt-0' : 'pt-16'} ${hideFooter ? 'flex flex-col min-h-0' : ''}`}>
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};

export default MainLayout;