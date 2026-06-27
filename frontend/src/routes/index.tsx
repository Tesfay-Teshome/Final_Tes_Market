import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import AdministratorLayout from '@/layouts/AdministratorLayout';
import VendorLayout from '@/layouts/VendorLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Unauthorized from '@/pages/auth/Unauthorized';

// Pages
import Home from '@/pages/Home';
import Products from '@/pages/Products';
import Categories from '@/pages/Categories';
import Vendors from '@/pages/Vendors';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import ProductDetails from '@/pages/ProductDetails';
import PublicVendorProducts from '@/pages/VendorProducts';
import Register from '@/pages/auth/Register';
import Cart from '@/pages/buyer/Cart';
import Checkout from '@/pages/buyer/Checkout';
import OrderSuccess from '@/pages/buyer/OrderSuccess';
import Orders from '@/pages/buyer/Orders';
import Profile from '@/pages/Profile';
import Wishlist from '@/pages/buyer/Wishlist';
import BuyerDashboard from '@/pages/buyer/Dashboard';
import PaymentMethods from '@/pages/buyer/PaymentMethods';
import NotificationsPage from '@/pages/NotificationsPage';
import MessagesPage from '@/pages/MessagesPage';
import StorefrontPage from '@/pages/storefront/StorefrontPage';
import StorefrontPreview from '../pages/storefront/StorefrontPreview';

// Administrator Pages
import AdminDashboard from '@/pages/administrator/Dashboard';
import ManageUsers from '@/pages/administrator/ManageUsers';
import ManageProducts from '@/pages/administrator/ManageProducts';
import ManageCategories from '@/pages/administrator/ManageCategories';
import ManageVendors from '@/pages/administrator/ManageVendors';
import AdminSettings from '@/pages/administrator/Settings';
import AdminVendorEarnings from '@/pages/administrator/VendorEarnings';
import TransactionManagement from '@/pages/administrator/TransactionManagement';
import TestimonialManagement from '@/pages/administrator/TestimonialManagement';
import OrderManagement from '@/pages/administrator/OrderManagement';
import AllOrders from '@/pages/administrator/AllOrders';
import AdminPayouts from '@/pages/administrator/Payouts';

// Vendor Pages
import VendorDashboard from '@/pages/vendor/Dashboard';
import VendorProducts from '@/pages/vendor/Products';
import VendorProductCreate from '@/pages/vendor/ProductCreate';
import VendorProductEdit from '@/pages/vendor/ProductEdit';
import VendorOrders from '@/pages/vendor/Orders';
import VendorEarnings from '@/pages/vendor/Earnings';
import VendorCategories from '@/pages/vendor/Categories';
import VendorCategoryCreate from '@/pages/vendor/CategoryCreate';
import VendorNotifications from '@/pages/vendor/Notifications';
import EarningsBreakdown from '@/pages/vendor/EarningsBreakdown';
import VendorPayout from '@/pages/vendor/Payout';
import Login from '@/pages/auth/Login';
import VendorApprovalPending from '@/pages/auth/VendorApprovalPending';
import StorefrontWizard from '@/pages/vendor/StorefrontWizard';
import VendorCoupons from '@/pages/vendor/VendorCoupons';

// Lazy load VendorSettings to avoid import issues
const VendorSettings = React.lazy(() => import('@/pages/vendor/Settings'));

const AppRoutes = () => {
  return (
    <Routes>
      {/* Profile Route - accessible to all authenticated users */}
      <Route element={<ProtectedRoute children={undefined} />}>
        <Route path="profile" element={<Profile />} />
      </Route>
      {/* Public Routes */}
      <Route path="unauthorized" element={<Unauthorized />} />
      <Route element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:slug" element={<ProductDetails />} />
        <Route path="vendor/:vendorId/products" element={<PublicVendorProducts />} />
        <Route path="categories" element={<Categories />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="vendor-approval-pending" element={<VendorApprovalPending />} />

        {/* Public Storefront Routes */}
        <Route path="store/:slug" element={<StorefrontPage />} />
        <Route path="store/:slug/preview" element={<StorefrontPreview />} />

        {/* Protected Buyer Routes */}
        <Route element={<ProtectedRoute children={undefined} />}>
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="order-success" element={<OrderSuccess />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<Orders />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="buyer/dashboard" element={<BuyerDashboard />} />
          <Route path="dashboard" element={<BuyerDashboard />} />
          <Route path="buyer/payment-methods" element={<PaymentMethods />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="messages/:conversationId" element={<MessagesPage />} />
        </Route>
      </Route>

      {/* Administrator Routes */}
      <Route
        element={
          <ProtectedRoute requiredRole="administrator" unauthorizedRedirect="/unauthorized">
            <AdministratorLayout />
          </ProtectedRoute>
        }
      >
        <Route path="administrator">
          <Route index element={<AdminDashboard />} />
          <Route path="users">
            <Route index element={<ManageUsers />} />
            <Route path="new" element={<ManageUsers />} />
          </Route>
          <Route path="products">
            <Route index element={<ManageProducts />} />
            <Route path="new" element={<VendorProductCreate />} />
            <Route path="edit/:id" element={<VendorProductEdit />} />
          </Route>
          <Route path="categories">
            <Route index element={<ManageCategories />} />
            <Route path="new" element={<VendorCategoryCreate />} />
          </Route>
          <Route path="orders">
            <Route index element={<OrderManagement />} />
            <Route path="all" element={<AllOrders />} />
          </Route>
          <Route path="transactions" element={<TransactionManagement />} />
          <Route path="testimonials" element={<TestimonialManagement />} />
          <Route path="vendors" element={<ManageVendors />} />
          <Route path="vendor-earnings" element={<AdminVendorEarnings />} />
          <Route path="payouts" element={<AdminPayouts />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Route>

      {/* Vendor Routes */}
      <Route element={<ProtectedRoute requiredRole="vendor" unauthorizedRedirect="/unauthorized" />}>
        <Route
          element={
            <VendorLayout>
              <Outlet />
            </VendorLayout>
          }
        >
          <Route path="vendor">
            <Route index element={<VendorDashboard />} />
            <Route path="products" element={<VendorProducts />} />
            <Route path="products/new" element={<VendorProductCreate />} />
            <Route path="products/edit/:id" element={<VendorProductEdit />} />
            <Route path="categories" element={<VendorCategories />} />
            <Route path="categories/new" element={<VendorCategoryCreate />} />
            <Route path="orders" element={<VendorOrders />} />
            <Route path="notifications" element={<VendorNotifications />} />
            <Route path="earnings" element={<VendorEarnings />} />
            <Route path="earnings-breakdown" element={<EarningsBreakdown />} />
            <Route path="payout" element={<VendorPayout />} />
            <Route path="storefront/wizard" element={<StorefrontWizard />} />
            <Route path="settings" element={
              <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div></div>}>
                <VendorSettings />
              </React.Suspense>
            } />
            <Route path="coupons" element={<VendorCoupons />} />
          </Route>
          {/* Alias path to match plan */}
          <Route path="dashboard/storefront/wizard" element={<StorefrontWizard />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default AppRoutes;