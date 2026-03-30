import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '@/components/navigation/Navbar';
import Footer from '@/components/navigation/Footer';

const MainLayout = () => {
  const location = useLocation();
  const hideFooter = location.pathname.startsWith('/messages') || location.pathname.startsWith('/buyer/dashboard') || location.pathname.startsWith('/store');
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16">
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};

export default MainLayout;