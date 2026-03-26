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
} from 'lucide-react';
import { RootState } from '@/store';
import { useDispatch } from 'react-redux';
import { logout } from '@/store/slices/authSlice';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import tesLogo from '@/pages/images/ChatGPT Image Nov 17, 2025, 04_28_14 PM.png';
import { resolveMediaUrl } from '@/services/api';

const Navbar = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const cartItems = useSelector((state: RootState) => state.cart?.items ?? []);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [avatarOk, setAvatarOk] = useState(true);
  // Notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const userImage = resolveMediaUrl(user?.profile_image);

  // Fetch notifications and unread messages count
  useEffect(() => {
    let notificationInterval: NodeJS.Timeout;
    let messageInterval: NodeJS.Timeout;
    
    const fetchNotifications = async () => {
      if (isAuthenticated) {
        try {
          const { notificationsAPI } = await import('@/services/api');
          const response = await notificationsAPI.getAll();
          const notificationsData = Array.isArray(response.data) ? response.data : [];
          setNotifications(notificationsData);
          
          // Get unread count from the API if available, or calculate from notifications
          try {
            const unreadResponse = await notificationsAPI.getUnreadCount();
            setUnreadNotifications(unreadResponse.data.unread_count || 0);
          } catch (e) {
            // Fallback in case unread count endpoint fails
            setUnreadNotifications(notificationsData.filter((n: any) => !n.is_read).length);
          }
        } catch (e) {
          console.error('Error fetching notifications:', e);
          setNotifications([]);
          setUnreadNotifications(0);
        }
      } else {
        // Reset notifications if user is not authenticated
        setNotifications([]);
        setUnreadNotifications(0);
      }
    };

    const fetchUnreadMessages = async () => {
      if (isAuthenticated) {
        try {
          const { messagingAPI } = await import('@/services/api');
          const conversations = await messagingAPI.getConversations();
          const conversationsData = Array.isArray(conversations.data) ? conversations.data : [];
          const unreadCount = conversationsData.filter((conv: any) => conv.unread_count > 0).length || 0;
          setUnreadMessages(unreadCount);
        } catch (e) {
          console.error('Error fetching unread messages:', e);
          setUnreadMessages(0);
        }
      } else {
        setUnreadMessages(0);
      }
    };
    
    // Initial fetches with error handling
    if (isAuthenticated) {
      fetchNotifications().catch(console.error);
      fetchUnreadMessages().catch(console.error);
      
      // Set up intervals for periodic updates (every 30 seconds)
      notificationInterval = setInterval(() => {
        fetchNotifications().catch(console.error);
      }, 30000);
      messageInterval = setInterval(() => {
        fetchUnreadMessages().catch(console.error);
      }, 30000);
    }

    return () => {
      if (notificationInterval) clearInterval(notificationInterval);
      if (messageInterval) clearInterval(messageInterval);
    };
  }, [isAuthenticated]);

  // Mark all notifications as read when dropdown is opened
  useEffect(() => {
    const markAllAsRead = async () => {
      if (isNotificationsOpen && unreadNotifications > 0) {
        try {
          const { notificationsAPI } = await import('@/services/api');
          await notificationsAPI.markAllAsRead();
          
          // Update local state to reflect read status
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

  // Close user dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      
      // Close user menu if clicked outside
      if (isUserMenuOpen && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
      
      // Close notifications if clicked outside
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
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-800 shadow-xl">
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
                <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
                  <Link
                    to="/products"
                    className="flex items-center px-0 py-0 text-emerald-50 hover:text-white text-[17px] lg:text-[18px] xl:text-[19px] font-bold tracking-wide transition-all duration-300 whitespace-nowrap relative group"
                  >
                    <span className="relative">
                      Products
                      <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-white/80 group-hover:w-full transition-all duration-400 ease-in-out rounded-full"></span>
                    </span>
                  </Link>
                </motion.div>
                <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
                  <Link
                    to="/categories"
                    className="flex items-center px-0 py-0 text-emerald-50 hover:text-white text-[17px] lg:text-[18px] xl:text-[19px] font-bold tracking-wide transition-all duration-300 whitespace-nowrap relative group"
                  >
                    <span className="relative">
                      Categories
                      <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-white/80 group-hover:w-full transition-all duration-400 ease-in-out rounded-full"></span>
                    </span>
                  </Link>
                </motion.div>
                <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
                  <Link
                    to="/vendors"
                    className="flex items-center px-0 py-0 text-emerald-50 hover:text-white text-[17px] lg:text-[18px] xl:text-[19px] font-bold tracking-wide transition-all duration-300 whitespace-nowrap relative group"
                  >
                    <span className="relative">
                      Vendors
                      <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-white/80 group-hover:w-full transition-all duration-400 ease-in-out rounded-full"></span>
                    </span>
                  </Link>
                </motion.div>
                <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
                  <Link
                    to="/about"
                    className="flex items-center px-0 py-0 text-emerald-50 hover:text-white text-[17px] lg:text-[18px] xl:text-[19px] font-bold tracking-wide transition-all duration-300 whitespace-nowrap relative group"
                  >
                    <span className="relative">
                      About
                      <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-white/80 group-hover:w-full transition-all duration-400 ease-in-out rounded-full"></span>
                    </span>
                  </Link>
                </motion.div>
                <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
                  <Link
                    to="/contact"
                    className="flex items-center px-0 py-0 text-emerald-50 hover:text-white text-[17px] lg:text-[18px] xl:text-[19px] font-bold tracking-wide transition-all duration-300 whitespace-nowrap relative group"
                  >
                    <span className="relative">
                      Contact
                      <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-white/80 group-hover:w-full transition-all duration-400 ease-in-out rounded-full"></span>
                    </span>
                  </Link>
                </motion.div>
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
                        className="p-1.5 lg:p-2 text-white hover:text-emerald-100 relative flex items-center justify-center h-full rounded-lg hover:bg-white/10 backdrop-blur-sm transition-all duration-300 group"
                        aria-label="Messages"
                      >
                        <MessageSquare className="w-5 h-5 lg:w-6 lg:h-6 group-hover:scale-105 transition-transform duration-300" />
                        {unreadMessages > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 bg-blue-500 text-white text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-bold shadow-lg animate-pulse">
                            {unreadMessages > 9 ? '9+' : unreadMessages}
                          </span>
                        )}
                      </Link>
                    </motion.div>
                  </div>

                  {/* Notifications */}
                  <div className="flex relative h-full items-center" ref={notificationsRef}>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                      <button
                        onClick={() => {
                          setIsNotificationsOpen(!isNotificationsOpen);
                          setIsUserMenuOpen(false);
                        }}
                        className="p-1.5 lg:p-2 text-white hover:text-emerald-100 relative flex items-center justify-center h-full rounded-lg hover:bg-white/10 backdrop-blur-sm transition-all duration-300 group border border-transparent hover:border-white/20"
                        aria-label="Notifications"
                        title="Notifications"
                      >
                        <Bell className="w-5 h-5 lg:w-6 lg:h-6 group-hover:scale-105 transition-transform duration-300" />
                        {unreadNotifications > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-bold shadow-lg animate-pulse">
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
                            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl overflow-hidden z-50 border border-gray-200"
                            style={{ maxHeight: '400px' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="p-4 border-b border-gray-200 bg-white">
                              <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
                                {unreadNotifications > 0 && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
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
                                      } catch (error) {
                                        console.error('Error marking all as read:', error);
                                      }
                                    }}
                                    className="text-sm text-primary-600 hover:text-primary-800"
                                  >
                                    Mark all as read
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                              {notifications.length > 0 ? (
                                notifications.map((notification) => (
                                  <div
                                    key={notification.id}
                                    className={`p-4 hover:bg-gray-50 transition-colors ${
                                      !notification.is_read ? 'bg-blue-50' : ''
                                    }`}
                                    onClick={async () => {
                                      try {
                                        const { notificationsAPI } = await import('@/services/api');
                                        if (!notification.is_read) {
                                          await notificationsAPI.markAsRead(notification.id);
                                          setNotifications(prev => 
                                            prev.map(n => 
                                              n.id === notification.id 
                                                ? { ...n, is_read: true } 
                                                : n
                                            )
                                          );
                                          setUnreadNotifications(prev => Math.max(0, prev - 1));
                                        }
                                        // Navigate to the related item if applicable
                                        if (notification.related_id) {
                                          // You can add navigation logic here based on notification type
                                          // For example: navigate(`/order/${notification.related_id}`);
                                        }
                                      } catch (error) {
                                        console.error('Error handling notification click:', error);
                                      }
                                    }}
                                  >
                                    <div className="flex items-start">
                                      <div className="flex-shrink-0 mt-0.5">
                                        <div className={`h-9 w-9 rounded-full flex items-center justify-center ${
                                          notification.notification_type === 'order' 
                                            ? 'bg-green-100 text-green-600' 
                                            : notification.notification_type === 'system'
                                            ? 'bg-blue-100 text-blue-600'
                                            : 'bg-primary-100 text-primary-600'
                                        }`}>
                                          <Bell className="h-4 w-4" />
                                        </div>
                                      </div>
                                      <div className="ml-3 flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
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
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                                              New
                                            </span>
                                          )}
                                       </div>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-6 text-center">
                                  <Bell className="mx-auto h-10 w-10 text-gray-400" />
                                  <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
                                  <p className="mt-1 text-sm text-gray-500">You don't have any notifications yet.</p>
                                </div>
                              )}
                            </div>
                            <div className="p-3 bg-gray-50 text-center border-t border-gray-200">
                              <Link
                                to="/notifications"
                                className="inline-flex items-center justify-center w-full text-sm font-medium text-primary-600 hover:text-primary-800"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  setIsNotificationsOpen(false);
                                  
                                  // Mark all as read when going to notifications page
                                  if (unreadNotifications > 0) {
                                    try {
                                      const { notificationsAPI } = await import('@/services/api');
                                      await notificationsAPI.markAllAsRead();
                                      setNotifications(prev => 
                                        prev.map(n => ({ ...n, is_read: true }))
                                      );
                                      setUnreadNotifications(0);
                                    } catch (error) {
                                      console.error('Error marking all as read:', error);
                                    }
                                  }
                                  
                                  // Navigate to notifications page
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

                  {/* Mobile Avatar (visible only on mobile) */}
                  <div className="flex sm:hidden items-center">
                    <Link
                      to="/profile"
                      className="p-1.5 text-white hover:text-emerald-100 relative flex items-center justify-center h-full rounded-full hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
                      aria-label="Profile"
                      title="Profile"
                    >
                      {user && userImage && avatarOk ? (
                        <div className="relative h-8 w-8 rounded-full shadow-lg overflow-hidden">
                          <img
                            src={userImage}
                            alt={user.username}
                            className="h-full w-full rounded-full object-cover"
                            onError={() => setAvatarOk(false)}
                          />
                          <div
                            className="pointer-events-none absolute inset-0 rounded-full animate-[spin_4s_linear_infinite]"
                            style={{
                              background: 'conic-gradient(at top left, #34d399, #06b6d4, #8b5cf6, #f43f5e, #34d399)',
                              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black 0)',
                              mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black 0)'
                            }}
                          />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center border-2 border-white shadow-lg">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </Link>
                  </div>

                  {/* Administrator Link - Hidden on mobile */}
                  {user?.user_type === 'administrator' && (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                      <Link
                        to="/administrator"
                        className="hidden lg:flex text-white hover:text-emerald-100 transition-all duration-300 p-1.5 lg:p-2 rounded-lg hover:bg-white/10 backdrop-blur-sm group"
                        title="Admin Dashboard"
                      >
                        <LayoutDashboard className="h-5 w-5 lg:h-6 lg:w-6 group-hover:scale-105 transition-transform duration-300" />
                      </Link>
                    </motion.div>
                  )}

                  {/* Vendor Link - Hidden on mobile */}
                  {user?.user_type === 'vendor' && (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                      <Link
                        to="/vendor"
                        className="hidden lg:flex text-white hover:text-emerald-100 transition-all duration-300 p-1.5 lg:p-2 rounded-lg hover:bg-white/10 backdrop-blur-sm group"
                        title="Vendor Dashboard"
                      >
                        <Store className="h-5 w-5 lg:h-6 lg:w-6 group-hover:scale-105 transition-transform duration-300" />
                      </Link>
                    </motion.div>
                  )}

                  {/* Buyer Links */}
                  {user?.user_type === 'buyer' && (
                    <>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                        <Link
                          to="/buyer/dashboard"
                          className="hidden lg:flex text-white hover:text-emerald-100 transition-all duration-300 relative group p-1.5 lg:p-2 rounded-lg hover:bg-white/10 backdrop-blur-sm"
                          title="My Dashboard"
                        >
                          <LayoutDashboard className="h-5 w-5 lg:h-6 lg:w-6 group-hover:scale-105 transition-transform duration-300" />
                        </Link>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                        <Link
                          to="/wishlist"
                          className="hidden lg:flex text-white hover:text-emerald-100 transition-all duration-300 relative group p-1.5 lg:p-2 rounded-lg hover:bg-white/10 backdrop-blur-sm"
                          title="Wishlist"
                        >
                          <Heart className="h-5 w-5 lg:h-6 lg:w-6 group-hover:scale-105 transition-transform duration-300" />
                        </Link>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                        <Link
                          to="/cart"
                          className="flex text-white hover:text-emerald-100 transition-all duration-300 relative group p-1.5 lg:p-2 rounded-lg hover:bg-white/10 backdrop-blur-sm"
                          title="Shopping Cart"
                        >
                          <ShoppingCart className="h-5 w-5 lg:h-6 lg:w-6 group-hover:scale-105 transition-transform duration-300" />
                          { (Array.isArray(cartItems) ? cartItems.length : 0) > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-bold shadow-lg animate-pulse">
                              {Array.isArray(cartItems) ? cartItems.length : 0}
                            </span>
                          )}
                        </Link>
                      </motion.div>
                    </>
                  )}

                  {/* User Menu - Hidden on mobile */}
                  <div className="hidden sm:flex relative h-full items-center" ref={userMenuRef}>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
                      <button 
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center h-full px-1 sm:px-2 py-1 text-white hover:text-emerald-100 transition-all duration-300 focus:outline-none rounded-lg hover:bg-white/10 backdrop-blur-sm group border border-transparent hover:border-white/20"
                      >
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          {user && userImage && avatarOk ? (
                            <div className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-full shadow-lg overflow-hidden flex-shrink-0">
                              <img
                                src={userImage}
                                alt={user.username}
                                className="h-full w-full rounded-full object-cover"
                                onError={() => setAvatarOk(false)}
                              />
                              <div
                                className="pointer-events-none absolute inset-0 rounded-full animate-[spin_4s_linear_infinite]"
                                style={{
                                  background: 'conic-gradient(at top left, #34d399, #06b6d4, #8b5cf6, #f43f5e, #34d399)',
                                  WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black 0)',
                                  mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black 0)'
                                }}
                              />
                            </div>
                          ) : (
                            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/20 flex items-center justify-center border-2 border-white shadow-lg group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
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
                          className="absolute right-0 top-full mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Dropdown header with user profile */}
                          <div className="px-4 py-3 border-b border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                {user && userImage && avatarOk ? (
                                  <div className="relative h-10 w-10 rounded-full overflow-hidden">
                                    <img
                                      src={userImage}
                                      alt={user.username}
                                      className="h-full w-full rounded-full object-cover"
                                      onError={() => setAvatarOk(false)}
                                    />
                                    <div
                                      className="pointer-events-none absolute inset-0 rounded-full animate-[spin_4s_linear_infinite]"
                                      style={{
                                        background: 'conic-gradient(at top left, #34d399, #06b6d4, #8b5cf6, #f43f5e, #34d399)',
                                        WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black 0)',
                                        mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black 0)'
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-emerald-500">
                                    <User className="h-5 w-5 text-emerald-600" />
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-bold text-gray-900">
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
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Profile Settings
                            </Link>
                            
                            <Link
                              to="/orders"
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <Package className="h-4 w-4 mr-2" />
                              My Orders
                            </Link>
                            
                            <button
                              onClick={handleLogout}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
                      className="text-emerald-50 hover:text-white px-4 lg:px-5 py-2 rounded-full text-[17px] lg:text-[18px] xl:text-[19px] font-bold tracking-wide transition-all duration-300 hover:bg-white/15 ring-1 ring-white/0 hover:ring-white/20 backdrop-blur-sm whitespace-nowrap"
                    >
                      Login
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
                    <Link
                      to="/register"
                      className="bg-white text-emerald-700 px-4 lg:px-5 py-2 rounded-full hover:bg-emerald-50 hover:text-emerald-800 transition-all duration-300 text-[17px] lg:text-[18px] xl:text-[19px] font-bold tracking-wide shadow-lg hover:shadow-xl whitespace-nowrap border border-white"
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
                  className="md:hidden p-3 rounded-lg text-white hover:text-emerald-100 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 border-2 border-transparent hover:border-white/20"
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
              className="md:hidden bg-gradient-to-b from-emerald-700 via-emerald-600 to-emerald-800 border-t border-white/20 shadow-2xl absolute left-0 right-0 top-full z-50 backdrop-blur-lg"
              style={{ maxHeight: 'calc(100vh - 80px)' }}
            >
              <div className="px-4 py-4 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 96px)' }}>
                {/* Navigation Links */}
                <div className="space-y-2">
                  <Link
                    to="/products"
                    className="flex items-center px-4 py-3 rounded-lg text-base font-bold text-white hover:text-emerald-100 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 border-l-4 border-transparent hover:border-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Package className="h-5 w-5 mr-3" />
                    Products
                  </Link>
                  <Link
                    to="/categories"
                    className="flex items-center px-4 py-3 rounded-lg text-base font-bold text-white hover:text-emerald-100 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 border-l-4 border-transparent hover:border-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-5 w-5 mr-3" />
                    Categories
                  </Link>
                  <Link
                    to="/vendors"
                    className="flex items-center px-4 py-3 rounded-lg text-base font-bold text-white hover:text-emerald-100 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 border-l-4 border-transparent hover:border-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Store className="h-5 w-5 mr-3" />
                    Vendors
                  </Link>
                  <Link
                    to="/about"
                    className="flex items-center px-4 py-3 rounded-lg text-base font-bold text-white hover:text-emerald-100 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 border-l-4 border-transparent hover:border-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    About Us
                  </Link>
                  <Link
                    to="/contact"
                    className="flex items-center px-4 py-3 rounded-lg text-base font-bold text-white hover:text-emerald-100 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 border-l-4 border-transparent hover:border-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Contact
                  </Link>
                </div>

                {/* User-specific mobile menu items */}
                {isAuthenticated && (
                  <>
                    <div className="border-t border-white/20 pt-4 mt-4">
                      <div className="px-4 py-2">
                        <p className="text-sm font-bold text-white/80 uppercase tracking-wide">Account</p>
                      </div>
                      
                      {/* User Info */}
                      <div className="flex items-center px-4 py-3 bg-white/10 backdrop-blur-sm rounded-lg mb-2">
                        {user && userImage ? (
                          <img
                            src={userImage}
                            alt={user.username}
                            className="h-10 w-10 rounded-full object-cover border-2 border-white"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center border-2 border-white">
                            <User className="h-5 w-5 text-white" />
                          </div>
                        )}
                        <div className="ml-3">
                          <p className="text-sm font-bold text-white">{user?.username}</p>
                          <p className="text-xs text-white/70 truncate">{user?.email}</p>
                        </div>
                      </div>

                      {/* Account Actions */}
                      <div className="space-y-2">
                        <Link
                          to="/profile"
                          className="flex items-center px-4 py-3 rounded-lg text-base font-bold text-white hover:text-emerald-100 hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Settings className="h-5 w-5 mr-3" />
                          Profile Settings
                        </Link>
                        
                        <Link
                          to="/orders"
                          className="flex items-center px-4 py-3 rounded-lg text-base font-bold text-white hover:text-emerald-100 hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Package className="h-5 w-5 mr-3" />
                          My Orders
                        </Link>

                        <Link
                          to="/messages"
                          className="flex items-center px-4 py-3 rounded-lg text-base font-bold text-white hover:text-emerald-100 hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <MessageSquare className="h-5 w-5 mr-3" />
                          Messages
                          {unreadMessages > 0 && (
                            <span className="ml-auto bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
                              {unreadMessages > 9 ? '9+' : unreadMessages}
                            </span>
                          )}
                        </Link>

                        {/* Role-specific links */}
                        {user?.user_type === 'administrator' && (
                          <Link
                            to="/administrator"
                            className="flex items-center px-4 py-3 rounded-lg text-base font-bold text-white hover:text-emerald-100 hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <LayoutDashboard className="h-5 w-5 mr-3" />
                            Admin Dashboard
                          </Link>
                        )}

                        {user?.user_type === 'vendor' && (
                          <Link
                            to="/vendor"
                            className="flex items-center px-4 py-3 rounded-lg text-base font-bold text-white hover:text-emerald-100 hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Store className="h-5 w-5 mr-3" />
                            Vendor Dashboard
                          </Link>
                        )}

                        {user?.user_type === 'buyer' && (
                          <>
                            <Link
                              to="/buyer/dashboard"
                              className="flex items-center px-4 py-3 rounded-lg text-base font-bold text-white hover:text-emerald-100 hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <LayoutDashboard className="h-5 w-5 mr-3" />
                              My Dashboard
                            </Link>
                            <Link
                              to="/wishlist"
                              className="flex items-center px-4 py-3 rounded-lg text-base font-bold text-white hover:text-emerald-100 hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <Heart className="h-5 w-5 mr-3" />
                              Wishlist
                            </Link>
                            <Link
                              to="/cart"
                              className="flex items-center px-4 py-3 rounded-lg text-base font-bold text-white hover:text-emerald-100 hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <ShoppingCart className="h-5 w-5 mr-3" />
                              Shopping Cart
                              {(Array.isArray(cartItems) ? cartItems.length : 0) > 0 && (
                                <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
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
                          className="flex items-center w-full px-4 py-3 rounded-lg text-base font-bold text-red-300 hover:text-red-100 hover:bg-red-500/20 backdrop-blur-sm transition-all duration-300"
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
                  <div className="border-t border-white/20 pt-4 mt-4">
                    <div className="px-4 py-2">
                      <p className="text-sm font-bold text-white/80 uppercase tracking-wide">Get Started</p>
                    </div>
                    <div className="space-y-3">
                      <Link
                        to="/login"
                        className="flex items-center px-4 py-3 rounded-lg text-base font-bold text-white hover:text-emerald-100 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 border-2 border-white/30 hover:border-white/50"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <User className="h-5 w-5 mr-3" />
                        Login
                      </Link>
                      <Link
                        to="/register"
                        className="flex items-center px-4 py-3 rounded-lg text-base font-bold bg-white text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-300 shadow-lg border-2 border-white"
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
      </nav>
    </div>
  );
};

export default Navbar;