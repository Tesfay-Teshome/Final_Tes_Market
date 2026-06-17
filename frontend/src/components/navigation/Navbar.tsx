import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ShoppingBag,
  Heart,
  ShoppingCart,
  User,
  Store,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  Bell,
  MessageSquare,
  Star
} from 'lucide-react';
import { RootState } from '@/store';
import { useDispatch } from 'react-redux';
import { logout } from '@/store/slices/authSlice';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import tesLogo from '@/pages/images/ChatGPT Image Nov 17, 2025, 04_28_14 PM.png';
import { resolveMediaUrl, storeReviewAPI } from '@/services/api';

/**
 * Luxury palette tokens matching the Home page design.
 * Deep emerald + champagne gold accents = premium, editorial feel.
 */
const LUX = {
  ink: '#04130E',
  emeraldDeep: '#022C22',
  emerald: '#064E3B',
  emeraldSoft: '#065F46',
  gold: '#C9A24B',
  goldSoft: '#E6CE91',
  cream: '#F7F3EC',
  paper: '#FBF9F4',
};

const Navbar = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const cartItems = useSelector((state: RootState) => state.cart?.items ?? []);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [avatarOk, setAvatarOk] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const userImage = resolveMediaUrl(user?.profile_image);

  const [pendingReviewNotification, setPendingReviewNotification] = useState<any>(null);

  useEffect(() => {
    const pendingReview = notifications.find((n: any) => n.notification_type === 'store_review' && !n.confirmed_by_vendor);
    if (pendingReview) {
      setPendingReviewNotification(pendingReview);
    } else {
      setPendingReviewNotification(null);
    }
  }, [notifications]);

  const handleApproveReview = async (reviewId: string | number, notificationId: string | number) => {
    try {
      await storeReviewAPI.approveReview(reviewId);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, confirmed_by_vendor: true, is_read: true } : n));
      setUnreadNotifications(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to approve review', err);
    }
  };

  const handleRejectReview = async (reviewId: string | number, notificationId: string | number) => {
    try {
      await storeReviewAPI.rejectReview(reviewId);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, confirmed_by_vendor: true, is_read: true } : n));
      setUnreadNotifications(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to reject review', err);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    try {
      const { notificationsAPI } = await import('@/services/api');
      if (!notification.is_read) {
        await notificationsAPI.markAsRead(notification.id);
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
        setUnreadNotifications(prev => Math.max(0, prev - 1));
      }
      
      setIsNotificationsOpen(false);

      const userType = user?.user_type;
      const orderId = notification.related_order_id || notification.related_id;
      
      if (userType === 'vendor') {
        if (notification.notification_type === 'store_review') {
          return;
        }
        window.location.href = orderId ? `/vendor/orders?order=${orderId}` : '/vendor/orders';
      } else if (userType === 'administrator') {
        if (notification.notification_type?.startsWith('payout') || notification.title?.toLowerCase().includes('payout')) {
          window.location.href = '/administrator/payouts';
        } else {
          window.location.href = orderId ? `/administrator/order-management?order=${orderId}` : '/administrator/order-management';
        }
      } else {
        // Buyer
        window.location.href = orderId ? `/orders/${orderId}` : '/orders';
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadNotifications(0);
      return;
    }

    try {
      const { notificationsAPI } = await import('@/services/api');
      const response = await notificationsAPI.getAll();
      const notificationsData = Array.isArray(response.data) ? response.data : [];
      setNotifications(notificationsData);

      try {
        const unreadResponse = await notificationsAPI.getUnreadCount();
        setUnreadNotifications(unreadResponse.data.unread_count || 0);
      } catch (e) {
        setUnreadNotifications(notificationsData.filter((n: any) => !n.is_read).length);
      }
    } catch (e) {
      setNotifications([]);
      setUnreadNotifications(0);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let notificationInterval: NodeJS.Timeout;

    if (isAuthenticated) {
      const initialFetchTimeout = setTimeout(() => {
        fetchNotifications().catch(() => {});
      }, 3000);

      notificationInterval = setInterval(() => {
        fetchNotifications().catch(() => {});
      }, 30000);

      return () => {
        clearTimeout(initialFetchTimeout);
        if (notificationInterval) clearInterval(notificationInterval);
      };
    }
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => {
    const markAllAsRead = async () => {
      if (isNotificationsOpen && unreadNotifications > 0) {
        try {
          const { notificationsAPI } = await import('@/services/api');
          await notificationsAPI.markAllAsRead();

          setNotifications(prev =>
            prev.map(n => ({
              ...n,
              is_read: true
            }))
          );
          setUnreadNotifications(0);

        } catch (e) {
          console.error('Error marking notifications as read:', e);
        }
      }
    };

    markAllAsRead();
  }, [isNotificationsOpen, unreadNotifications]);

  const handleLogout = () => {
    dispatch(logout());
    setIsUserMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      if (isUserMenuOpen && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }

      if (isNotificationsOpen && notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen, isNotificationsOpen]);

  const menuVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 shadow-2xl" style={{ background: `linear-gradient(135deg, ${LUX.ink}, ${LUX.emeraldDeep})` }}>
      {/* Subtle gold top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)` }} />

      <nav className="h-[80px] flex items-center">
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-full">
            {/* Logo and Primary Navigation */}
            <div className="flex items-center h-full flex-shrink-0">
              <Link
                to="/"
                className="flex items-center h-full px-1 sm:px-2 transition-all duration-300 group"
              >
                <div className="relative flex-shrink-0 overflow-visible">
                  <img
                    src={tesLogo}
                    alt="TesMarket"
                    className="block h-[100px] sm:h-[120px] md:h-[120px] lg:h-[120px] w-auto object-contain drop-shadow-lg"
                  />
                </div>
              </Link>

              <div className="hidden lg:flex items-center h-full ml-6 xl:ml-8 space-x-2 md:space-x-10">
                {['Products', 'Categories', 'Vendors', 'About', 'Contact'].map((item) => (
                  <motion.div key={item} whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
                    <Link
                      to={`/${item.toLowerCase()}`}
                      className="flex items-center px-0 py-0 text-white/90 hover:text-white text-[17px] lg:text-[18px] xl:text-[19px] font-semibold tracking-wide transition-all duration-300 whitespace-nowrap relative group"
                    >
                      <span className="relative">
                        {item}
                        <span className="absolute -bottom-1 left-0 w-0 h-[2px] group-hover:w-full transition-all duration-400 ease-in-out rounded-full" style={{ background: LUX.goldSoft }} />
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* User Navigation */}
            <div className="flex items-center h-full space-x-0.5 sm:space-x-1">
              {isAuthenticated ? (
                <>
                  {/* Messages */}
                  <div className="flex relative h-full items-center">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                      <Link
                        to="/messages"
                        className="p-1.5 lg:p-2 text-white/80 hover:text-white relative flex items-center justify-center h-full rounded-lg transition-all duration-300 group backdrop-blur-sm"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                        aria-label="Messages"
                      >
                        <MessageSquare className="w-5 h-5 lg:w-6 lg:h-6 group-hover:scale-105 transition-transform duration-300" />
                      </Link>
                    </motion.div>
                  </div>

                  {/* Notifications */}
                  <div className="flex relative h-full items-center" ref={notificationsRef}>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                      <button
                        onClick={() => {
                          const nextOpen = !isNotificationsOpen;
                          setIsNotificationsOpen(nextOpen);
                          setIsUserMenuOpen(false);
                          if (nextOpen) {
                            fetchNotifications().catch(() => {});
                          }
                        }}
                        className="p-1.5 lg:p-2 text-white/80 hover:text-white relative flex items-center justify-center h-full rounded-lg transition-all duration-300 group backdrop-blur-sm border border-transparent hover:border-white/20"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                        aria-label="Notifications"
                        title="Notifications"
                      >
                        <Bell className="w-5 h-5 lg:w-6 lg:h-6 group-hover:scale-105 transition-transform duration-300" />
                        {unreadNotifications > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 text-white text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-bold shadow-lg animate-pulse" style={{ background: LUX.gold }}>
                            {unreadNotifications > 9 ? '9+' : unreadNotifications}
                          </span>
                        )}
                      </button>
                    </motion.div>

                    <AnimatePresence>
                      {isNotificationsOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl overflow-hidden z-50 border"
                          style={{ background: LUX.paper, borderColor: `${LUX.gold}33`, maxHeight: '400px' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Gold accent line */}
                          <div className="h-px" style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)` }} />

                          <div className="p-4 border-b" style={{ borderColor: `${LUX.gold}20`, background: LUX.cream }}>
                            <div className="flex justify-between items-center">
                              <h3 className="text-lg font-serif font-semibold" style={{ color: LUX.emeraldDeep }}>Notifications</h3>
                              {unreadNotifications > 0 && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const { notificationsAPI } = await import('@/services/api');
                                      await notificationsAPI.markAllAsRead();
                                      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                                      setUnreadNotifications(0);
                                    } catch (error) {
                                      console.error('Error marking all as read:', error);
                                    }
                                  }}
                                  className="text-xs font-semibold tracking-wide transition-colors"
                                  style={{ color: LUX.gold }}
                                >
                                  Mark all read
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="max-h-96 overflow-y-auto divide-y" style={{ borderColor: `${LUX.gold}15` }}>
                            {notifications.length > 0 ? (
                              [...notifications]
                                .sort((a: any, b: any) => {
                                  if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
                                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                                })
                                .map((notification) => (
                                <div
                                  key={notification.id}
                                  className={`p-4 transition-colors ${!notification.is_read ? 'bg-emerald-50/50' : ''}`}
                                  style={{ borderBottom: `1px solid ${LUX.gold}15` }}
                                  onClick={() => handleNotificationClick(notification)}
                                >
                                  <div className="flex items-start">
                                    <div className="flex-shrink-0 mt-0.5">
                                      <div
                                        className="h-9 w-9 rounded-full flex items-center justify-center"
                                        style={{
                                          background: notification.notification_type === 'order' ? `rgba(6,78,59,0.1)` : `rgba(201,162,75,0.15)`,
                                          color: notification.notification_type === 'order' ? LUX.emerald : LUX.gold
                                        }}
                                      >
                                        <Bell className="h-4 w-4" />
                                      </div>
                                    </div>
                                    <div className="ml-3 flex-1 min-w-0">
                                      <p className="text-sm font-semibold truncate" style={{ color: LUX.emeraldDeep }}>
                                        {notification.title}
                                      </p>
                                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                                        {notification.message}
                                      </p>
                                      <div className="mt-1 flex items-center justify-between">
                                        <span className="text-xs text-gray-400">
                                          {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {!notification.is_read && (
                                          <span
                                            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold"
                                            style={{ background: `${LUX.gold}20`, color: LUX.gold }}
                                          >
                                            New
                                          </span>
                                        )}
                                      </div>
                                      {notification.notification_type === 'store_review' && !notification.confirmed_by_vendor && (
                                        <div className="mt-2 flex items-center gap-2">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleApproveReview(notification.related_id, notification.id); }}
                                            className="px-3 py-1 text-xs font-semibold text-white rounded-lg shadow transition-colors"
                                            style={{ background: `linear-gradient(135deg, ${LUX.emeraldSoft}, ${LUX.emeraldDeep})` }}
                                          >
                                            Approve
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleRejectReview(notification.related_id, notification.id); }}
                                            className="px-3 py-1 text-xs font-semibold rounded-lg transition-colors"
                                            style={{ color: '#dc2626', background: 'rgba(220,38,38,0.1)' }}
                                          >
                                            Reject
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-6 text-center">
                                <Bell className="mx-auto h-10 w-10 text-gray-400" />
                                <h3 className="mt-2 text-sm font-semibold" style={{ color: LUX.emeraldDeep }}>No notifications</h3>
                                <p className="mt-1 text-sm text-gray-500">You don't have any notifications yet.</p>
                              </div>
                            )}
                          </div>

                          <div className="p-3 text-center border-t" style={{ borderColor: `${LUX.gold}20`, background: LUX.cream }}>
                            <Link
                              to="/notifications"
                              className="inline-flex items-center justify-center w-full text-sm font-semibold hover:opacity-80 transition-opacity"
                              style={{ color: LUX.emerald }}
                              onClick={async (e) => {
                                e.preventDefault();
                                setIsNotificationsOpen(false);
                                if (unreadNotifications > 0) {
                                  try {
                                    const { notificationsAPI } = await import('@/services/api');
                                    await notificationsAPI.markAllAsRead();
                                    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                                    setUnreadNotifications(0);
                                  } catch (error) {
                                    console.error('Error marking all as read:', error);
                                  }
                                }
                                window.location.href = '/notifications';
                              }}
                            >
                              View all notifications
                              <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Mobile Avatar */}
                  <div className="flex sm:hidden items-center">
                    <Link
                      to="/profile"
                      className="p-1.5 text-white/80 hover:text-white relative flex items-center justify-center h-full rounded-full transition-all duration-300"
                      aria-label="Profile"
                      title="Profile"
                    >
                      {user && userImage && avatarOk ? (
                        <div className="relative h-8 w-8 rounded-full shadow-lg overflow-hidden border-2" style={{ borderColor: LUX.gold }}>
                          <img
                            src={userImage}
                            alt={user.username}
                            className="h-full w-full rounded-full object-cover"
                            onError={() => setAvatarOk(false)}
                          />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full flex items-center justify-center border-2 shadow-lg" style={{ borderColor: LUX.gold, background: 'rgba(255,255,255,0.1)' }}>
                          <User className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </Link>
                  </div>

                  {/* Administrator Link */}
                  {user?.user_type === 'administrator' && (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                      <Link
                        to="/administrator"
                        className="hidden lg:flex text-white/80 hover:text-white transition-all duration-300 p-1.5 lg:p-2 rounded-lg group backdrop-blur-sm"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                        title="Admin Dashboard"
                      >
                        <LayoutDashboard className="h-5 w-5 lg:h-6 lg:h-6 group-hover:scale-105 transition-transform duration-300" />
                      </Link>
                    </motion.div>
                  )}

                  {/* Vendor Link */}
                  {user?.user_type === 'vendor' && (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                      <Link
                        to="/vendor"
                        className="hidden lg:flex text-white/80 hover:text-white transition-all duration-300 p-1.5 lg:p-2 rounded-lg group backdrop-blur-sm"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                        title="Vendor Dashboard"
                      >
                        <Store className="h-5 w-5 lg:h-6 lg:h-6 group-hover:scale-105 transition-transform duration-300" />
                      </Link>
                    </motion.div>
                  )}

                  {/* Buyer Links */}
                  {user?.user_type === 'buyer' && (
                    <>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                        <Link
                          to="/buyer/dashboard"
                          className="hidden lg:flex text-white/80 hover:text-white transition-all duration-300 relative group p-1.5 lg:p-2 rounded-lg backdrop-blur-sm"
                          style={{ background: 'rgba(255,255,255,0.05)' }}
                          title="My Dashboard"
                        >
                          <LayoutDashboard className="h-5 w-5 lg:h-6 lg:h-6 group-hover:scale-105 transition-transform duration-300" />
                        </Link>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                        <Link
                          to="/wishlist"
                          className="hidden lg:flex text-white/80 hover:text-white transition-all duration-300 relative group p-1.5 lg:p-2 rounded-lg backdrop-blur-sm"
                          style={{ background: 'rgba(255,255,255,0.05)' }}
                          title="Wishlist"
                        >
                          <Heart className="h-5 w-5 lg:h-6 lg:h-6 group-hover:scale-105 transition-transform duration-300" />
                        </Link>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                        <Link
                          to="/cart"
                          className="flex text-white/80 hover:text-white transition-all duration-300 relative group p-1.5 lg:p-2 rounded-lg backdrop-blur-sm"
                          style={{ background: 'rgba(255,255,255,0.05)' }}
                          title="Shopping Cart"
                        >
                          <ShoppingCart className="h-5 w-5 lg:h-6 lg:h-6 group-hover:scale-105 transition-transform duration-300" />
                          {(Array.isArray(cartItems) ? cartItems.length : 0) > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 text-white text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-bold shadow-lg animate-pulse" style={{ background: LUX.gold }}>
                              {Array.isArray(cartItems) ? cartItems.length : 0}
                            </span>
                          )}
                        </Link>
                      </motion.div>
                    </>
                  )}

                  {/* User Menu */}
                  <div className="hidden sm:flex relative h-full items-center" ref={userMenuRef}>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
                      <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center h-full px-1 sm:px-2 py-1 text-white/80 hover:text-white transition-all duration-300 focus:outline-none rounded-lg backdrop-blur-sm group border border-transparent hover:border-white/20"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                      >
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          {user && userImage && avatarOk ? (
                            <div className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-full shadow-lg overflow-hidden flex-shrink-0 border-2" style={{ borderColor: LUX.goldSoft }}>
                              <img
                                src={userImage}
                                alt={user.username}
                                className="h-full w-full rounded-full object-cover"
                                onError={() => setAvatarOk(false)}
                              />
                            </div>
                          ) : (
                            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center border-2 shadow-lg group-hover:scale-105 transition-transform duration-300 flex-shrink-0" style={{ borderColor: LUX.gold, background: 'rgba(255,255,255,0.1)' }}>
                              <User className="h-4 w-4 text-white" />
                            </div>
                          )}
                          <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 transition-all duration-300 ${isUserMenuOpen ? 'rotate-180' : ''} group-hover:scale-105 hidden sm:block`} />
                        </div>
                      </button>
                    </motion.div>

                    <AnimatePresence>
                      {isUserMenuOpen && (
                        <motion.div
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          variants={menuVariants}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none border overflow-hidden"
                          style={{ background: LUX.paper, borderColor: `${LUX.gold}33` }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Gold accent line */}
                          <div className="h-px" style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)` }} />

                          {/* Dropdown header */}
                          <div className="px-4 py-3 border-b" style={{ borderColor: `${LUX.gold}20`, background: LUX.cream }}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                {user && userImage && avatarOk ? (
                                  <div className="relative h-10 w-10 rounded-full overflow-hidden border-2" style={{ borderColor: LUX.gold }}>
                                    <img
                                      src={userImage}
                                      alt={user.username}
                                      className="h-full w-full rounded-full object-cover"
                                      onError={() => setAvatarOk(false)}
                                    />
                                  </div>
                                ) : (
                                  <div className="h-10 w-10 rounded-full flex items-center justify-center border-2" style={{ borderColor: LUX.gold, background: 'rgba(6,78,59,0.1)' }}>
                                    <User className="h-5 w-5" style={{ color: LUX.emerald }} />
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-serif font-semibold" style={{ color: LUX.emeraldDeep }}>
                                    {user?.first_name && user?.last_name
                                      ? `${user.first_name} ${user.last_name}`
                                      : user?.username}
                                  </p>
                                  <p className="text-xs text-gray-500 capitalize">{user?.user_type}</p>
                                </div>
                              </div>
                              <button
                                aria-label="Close menu"
                                title="Close"
                                className="p-1 rounded hover:bg-gray-100 text-gray-600"
                                onClick={() => setIsUserMenuOpen(false)}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                          </div>

                          <div className="py-1">
                            <Link
                              to="/profile"
                              className="flex items-center px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                              style={{ color: LUX.emeraldDeep }}
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <Settings className="h-4 w-4 mr-2" style={{ color: LUX.gold }} />
                              Profile Settings
                            </Link>

                            <Link
                              to="/orders"
                              className="flex items-center px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                              style={{ color: LUX.emeraldDeep }}
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <Package className="h-4 w-4 mr-2" style={{ color: LUX.gold }} />
                              My Orders
                            </Link>

                            <button
                              onClick={handleLogout}
                              className="flex items-center w-full px-4 py-2.5 text-sm hover:bg-red-50 transition-colors text-red-600"
                            >
                              <LogOut className="h-4 w-4 mr-2" />
                              Logout
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <div className="hidden sm:flex items-center space-x-3 lg:space-x-4">
                  <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
                    <Link
                      to="/login"
                      className="text-white/90 hover:text-white px-4 lg:px-5 py-2 rounded-full text-[15px] lg:text-[16px] font-semibold tracking-wide transition-all duration-300 border hover:bg-white/5 backdrop-blur-sm whitespace-nowrap"
                      style={{ borderColor: `${LUX.gold}50` }}
                    >
                      Login
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
                    <Link
                      to="/register"
                      className="px-4 lg:px-5 py-2 rounded-full transition-all duration-300 text-[15px] lg:text-[16px] font-semibold tracking-wide shadow-lg hover:shadow-xl whitespace-nowrap"
                      style={{ background: LUX.goldSoft, color: LUX.emeraldDeep }}
                    >
                      Register
                    </Link>
                  </motion.div>
                </div>
              )}

              {/* Mobile menu button */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} transition={{ duration: 0.2 }}>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-3 rounded-lg text-white hover:text-white transition-all duration-300 border-2 border-transparent hover:border-white/20 backdrop-blur-sm"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  {isMobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="md:hidden border-t shadow-2xl absolute left-0 right-0 top-full z-50 backdrop-blur-xl overflow-hidden"
              style={{ background: `linear-gradient(180deg, ${LUX.ink}, ${LUX.emeraldDeep})`, borderColor: `${LUX.gold}20`, maxHeight: 'calc(100vh - 80px)' }}
            >
              {/* Gold accent line */}
              <div className="h-px" style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)` }} />

              <div className="px-4 py-4 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 96px)' }}>
                {/* Navigation Links */}
                <div className="space-y-2">
                  {[
                    { to: '/products', icon: Package, label: 'Products' },
                    { to: '/categories', icon: LayoutDashboard, label: 'Categories' },
                    { to: '/vendors', icon: Store, label: 'Vendors' },
                    { to: '/about', icon: User, label: 'About Us' },
                    { to: '/contact', icon: MessageSquare, label: 'Contact' },
                  ].map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="flex items-center px-4 py-3 rounded-xl text-base font-semibold text-white/90 hover:text-white transition-all duration-300 border-l-2 border-transparent group"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" style={{ color: LUX.goldSoft }} />
                      {item.label}
                    </Link>
                  ))}
                </div>

                {/* User-specific mobile menu items */}
                {isAuthenticated && (
                  <>
                    <div className="border-t pt-4 mt-4" style={{ borderColor: `${LUX.gold}30` }}>
                      <div className="px-4 py-2">
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: LUX.goldSoft }}>Account</p>
                      </div>

                      {/* User Info */}
                      <div className="flex items-center px-4 py-3 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        {user && userImage ? (
                          <img
                            src={userImage}
                            alt={user.username}
                            className="h-10 w-10 rounded-full object-cover border-2"
                            style={{ borderColor: LUX.gold }}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full flex items-center justify-center border-2" style={{ borderColor: LUX.gold, background: 'rgba(255,255,255,0.1)' }}>
                            <User className="h-5 w-5 text-white" />
                          </div>
                        )}
                        <div className="ml-3">
                          <p className="text-sm font-semibold text-white">{user?.username}</p>
                          <p className="text-xs text-white/60 truncate">{user?.email}</p>
                        </div>
                      </div>

                      {/* Account Actions */}
                      <div className="space-y-2">
                        <Link
                          to="/profile"
                          className="flex items-center px-4 py-3 rounded-xl text-base font-semibold text-white/90 hover:text-white transition-all duration-300"
                          style={{ background: 'rgba(255,255,255,0.03)' }}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Settings className="h-5 w-5 mr-3" style={{ color: LUX.goldSoft }} />
                          Profile Settings
                        </Link>

                        <Link
                          to="/orders"
                          className="flex items-center px-4 py-3 rounded-xl text-base font-semibold text-white/90 hover:text-white transition-all duration-300"
                          style={{ background: 'rgba(255,255,255,0.03)' }}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Package className="h-5 w-5 mr-3" style={{ color: LUX.goldSoft }} />
                          My Orders
                        </Link>

                        <Link
                          to="/messages"
                          className="flex items-center px-4 py-3 rounded-xl text-base font-semibold text-white/90 hover:text-white transition-all duration-300"
                          style={{ background: 'rgba(255,255,255,0.03)' }}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <MessageSquare className="h-5 w-5 mr-3" style={{ color: LUX.goldSoft }} />
                          Messages
                        </Link>

                        {/* Role-specific links */}
                        {user?.user_type === 'administrator' && (
                          <Link
                            to="/administrator"
                            className="flex items-center px-4 py-3 rounded-xl text-base font-semibold text-white/90 hover:text-white transition-all duration-300"
                            style={{ background: 'rgba(255,255,255,0.03)' }}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <LayoutDashboard className="h-5 w-5 mr-3" style={{ color: LUX.goldSoft }} />
                            Admin Dashboard
                          </Link>
                        )}

                        {user?.user_type === 'vendor' && (
                          <Link
                            to="/vendor"
                            className="flex items-center px-4 py-3 rounded-xl text-base font-semibold text-white/90 hover:text-white transition-all duration-300"
                            style={{ background: 'rgba(255,255,255,0.03)' }}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Store className="h-5 w-5 mr-3" style={{ color: LUX.goldSoft }} />
                            Vendor Dashboard
                          </Link>
                        )}

                        {user?.user_type === 'buyer' && (
                          <>
                            <Link
                              to="/buyer/dashboard"
                              className="flex items-center px-4 py-3 rounded-xl text-base font-semibold text-white/90 hover:text-white transition-all duration-300"
                              style={{ background: 'rgba(255,255,255,0.03)' }}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <LayoutDashboard className="h-5 w-5 mr-3" style={{ color: LUX.goldSoft }} />
                              My Dashboard
                            </Link>
                            <Link
                              to="/wishlist"
                              className="flex items-center px-4 py-3 rounded-xl text-base font-semibold text-white/90 hover:text-white transition-all duration-300"
                              style={{ background: 'rgba(255,255,255,0.03)' }}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <Heart className="h-5 w-5 mr-3" style={{ color: LUX.goldSoft }} />
                              Wishlist
                            </Link>
                            <Link
                              to="/cart"
                              className="flex items-center px-4 py-3 rounded-xl text-base font-semibold text-white/90 hover:text-white transition-all duration-300"
                              style={{ background: 'rgba(255,255,255,0.03)' }}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <ShoppingCart className="h-5 w-5 mr-3" style={{ color: LUX.goldSoft }} />
                              Shopping Cart
                              {(Array.isArray(cartItems) ? cartItems.length : 0) > 0 && (
                                <span className="ml-auto text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse" style={{ background: LUX.gold, color: LUX.emeraldDeep }}>
                                  {Array.isArray(cartItems) ? cartItems.length : 0}
                                </span>
                              )}
                            </Link>
                          </>
                        )}

                        <button
                          onClick={() => {
                            handleLogout();
                            setIsMobileMenuOpen(false);
                          }}
                          className="flex items-center w-full px-4 py-3 rounded-xl text-base font-semibold text-red-400 hover:text-red-300 transition-all duration-300"
                          style={{ background: 'rgba(220,38,38,0.1)' }}
                        >
                          <LogOut className="h-5 w-5 mr-3" />
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Login/Register for non-authenticated users */}
                {!isAuthenticated && (
                  <div className="border-t pt-4 mt-4" style={{ borderColor: `${LUX.gold}30` }}>
                    <div className="px-4 py-2">
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: LUX.goldSoft }}>Get Started</p>
                    </div>
                    <div className="space-y-3">
                      <Link
                        to="/login"
                        className="flex items-center justify-center px-4 py-3 rounded-xl text-base font-semibold text-white transition-all duration-300 border-2"
                        style={{ background: 'rgba(255,255,255,0.05)', borderColor: `${LUX.gold}50` }}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <User className="h-5 w-5 mr-3" style={{ color: LUX.goldSoft }} />
                        Login
                      </Link>
                      <Link
                        to="/register"
                        className="flex items-center justify-center px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 shadow-lg"
                        style={{ background: LUX.goldSoft, color: LUX.emeraldDeep }}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <User className="h-5 w-5 mr-3" />
                        Register
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Vendor Store Review Popup */}
        <AnimatePresence>
          {pendingReviewNotification && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-6 right-6 z-[200] max-w-sm w-full rounded-3xl shadow-2xl border overflow-hidden"
              style={{ background: LUX.paper, borderColor: `${LUX.gold}30` }}
            >
              {/* Gold accent line */}
              <div className="h-px" style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)` }} />

              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${LUX.gold}20` }}
                  >
                    <Star className="w-5 h-5 fill-current" style={{ color: LUX.gold }} />
                  </div>
                  <div>
                    <h4 className="font-serif font-semibold" style={{ color: LUX.emeraldDeep }}>{pendingReviewNotification.title}</h4>
                    <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: LUX.gold }}>Action Required</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  {pendingReviewNotification.message}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApproveReview(pendingReviewNotification.related_id, pendingReviewNotification.id)}
                    className="flex-1 py-2.5 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:-translate-y-0.5"
                    style={{ background: `linear-gradient(135deg, ${LUX.emeraldSoft}, ${LUX.emeraldDeep})` }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectReview(pendingReviewNotification.related_id, pendingReviewNotification.id)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{ color: '#dc2626', background: 'rgba(220,38,38,0.08)' }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </div>
  );
};

export default Navbar;
