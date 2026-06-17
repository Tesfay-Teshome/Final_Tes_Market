import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { RootState } from '@/store';
import { notificationsAPI, resolveMediaUrl } from '@/services/api';
import {
  LayoutDashboard,
  Package,
  ListTree,
  ShoppingBag,
  DollarSign,
  Home,
  Settings,
  Plus,
  TrendingUp,
  Bell,
  MessageSquare,
  Star,
  Zap,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';



interface VendorSidebarProps {
  className?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
}

const VendorSidebar = ({ className, onClose, showCloseButton = false }: VendorSidebarProps) => {
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.user);
  const profileImage = resolveMediaUrl(user?.profile_image);

  // Live unread notification count (polls every 30s)
  const { data: unreadData } = useQuery<{ unread_count: number }>({
    queryKey: ['sidebar-unread-count'],
    queryFn: async () => {
      const res = await notificationsAPI.getUnreadCount();
      return res.data;
    },
    refetchInterval: 30_000,
    retry: false,
  });
  const unreadCount = unreadData?.unread_count ?? 0;

  const quickActions = [
    {
      to: '/vendor/products/new',
      icon: Plus,
      label: 'Add Product',
      color: 'from-blue-500 to-purple-600',
      description: 'Create new product'
    },
    {
      to: '/vendor/storefront/wizard',
      icon: Star,
      label: 'Create Storefront',
      color: 'from-fuchsia-500 to-pink-600',
      description: 'Design your store'
    },
    {
      to: '/vendor/orders?status=pending',
      icon: Zap,
      label: 'Pending Orders',
      color: 'from-orange-500 to-red-600',
      description: 'View pending orders'
    },
    {
      to: '/vendor/earnings',
      icon: TrendingUp,
      label: 'View Earnings',
      color: 'from-green-500 to-emerald-600',
      description: 'Check your earnings'
    },
  ];

  const links = [
    {
      to: '/',
      icon: Home,
      label: 'Home',
    },
    {
      to: '/vendor',
      icon: LayoutDashboard,
      label: 'Dashboard',
    },
    {
      to: '/vendor/products',
      icon: Package,
      label: 'Products',
    },
    {
      to: '/vendor/categories',
      icon: ListTree,
      label: 'Categories',
    },
    {
      to: '/vendor/orders',
      icon: ShoppingBag,
      label: 'Orders',
    },
    {
      to: '/vendor/storefront/wizard',
      icon: Star,
      label: 'Storefront',
    },
    {
      to: '/vendor/notifications',
      icon: Bell,
      label: 'Notifications',
    },
    {
      to: '/vendor/earnings',
      icon: DollarSign,
      label: 'Earnings',
    },
    {
      to: '/vendor/payout',
      icon: Wallet,
      label: 'Withdraw',
    },
    {
      to: '/vendor/settings',
      icon: Settings,
      label: 'Settings',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/vendor' && location.pathname === '/vendor') return true;
    if (path !== '/vendor' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div
      className={cn(
        'relative flex h-full w-64 flex-col overflow-hidden border-r border-emerald-700 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-800 shadow-2xl transform transition-all duration-300 ease-in-out',
        className
      )}
    >
      {showCloseButton && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 p-2 text-white transition-all duration-200 ease-in-out hover:bg-white/20 hover:scale-110"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <nav className="h-full flex flex-col">
        {/* Vendor Profile Header (sticky) */}
        <div className="p-4 border-b border-emerald-800/60 sticky top-0 z-10 bg-emerald-900/90 backdrop-blur supports-[backdrop-filter]:bg-emerald-900/75">
          <div className="flex items-center space-x-3 mb-3">
            <div className="relative">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={user?.first_name || user?.username || 'Vendor'}
                  className="w-10 h-10 rounded-full border-2 border-emerald-400 object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 flex items-center justify-center border-2 border-emerald-400">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-emerald-950 animate-pulse"></div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-white truncate">
                {user?.full_name || user?.username || 'Vendor'}
              </h2>
            </div>
          </div>
          <div className="bg-gradient-to-r from-emerald-500/15 to-green-500/15 rounded-lg p-2 border border-emerald-500/30">
            <h3 className="text-xs font-medium bg-gradient-to-r from-emerald-300 to-green-300 bg-clip-text text-transparent mb-1">
              Vendor Panel
            </h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-emerald-100/80">Online & Active</span>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto sidebar-scrollbar vendor-sidebar-scrollbar">
          {/* Quick Actions */}
          <div className="p-4 border-b border-emerald-800/60">
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
              <Zap className="w-4 h-4 mr-2 text-yellow-400" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className={`group flex items-center p-2 rounded-lg bg-gradient-to-r ${action.color} hover:shadow-lg transition-all duration-300 hover:scale-105`}
                >
                  <action.icon className="w-4 h-4 text-white mr-2" />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-white">{action.label}</div>
                    <div className="text-xs text-white/80">{action.description}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-2 space-y-1">
            {links.map((link) => {
              const active = location.pathname === link.to ||
                (link.to !== '/' && link.to !== '/vendor' && location.pathname.startsWith(link.to));
              const isNotifications = link.to === '/vendor/notifications';
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                    active
                      ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg'
                      : 'text-emerald-100/80 hover:bg-emerald-400/10 hover:text-white'
                  }`}
                >
                  <link.icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110 ${
                    active ? 'text-white' : 'text-emerald-200/70'
                  }`} />
                  <span>{link.label}</span>
                  {/* Notification badge */}
                  {isNotifications && unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  {/* Active dot (only when no badge shown) */}
                  {active && !(isNotifications && unreadCount > 0) && (
                    <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Footer with notifications */}
          <div className="p-4 border-t border-emerald-800/60">
            <div className="flex items-center justify-between">
              <Link
                to="/vendor/notifications"
                className="flex items-center p-2 rounded-lg hover:bg-emerald-400/10 transition-colors"
              >
                <Bell className={`w-4 h-4 mr-2 ${unreadCount > 0 ? 'text-red-400 animate-pulse' : 'text-emerald-200/80'}`} />
                <span className="text-xs text-emerald-100/80">Notifications</span>
                {unreadCount > 0 ? (
                  <span className="ml-2 bg-red-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : (
                  <div className="ml-2 w-2 h-2 bg-emerald-400/50 rounded-full"></div>
                )}
              </Link>
              <Link
                to="/messages"
                className="flex items-center p-2 rounded-lg hover:bg-emerald-400/10 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-emerald-200/80 mr-2" />
                <span className="text-xs text-emerald-100/80">Messages</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default VendorSidebar;