import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  BarChart3,
  Settings,
  Building2,
  CreditCard,
  MessageSquare,
  Home,
  ShoppingBag,
  FolderTree,
  Shield,
  TrendingUp,
  Bell,
  Zap,
  Crown,
  ClipboardList,
  User,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveMediaUrl } from '@/services/api';

import tesLogo from '@/pages/images/ChatGPT Image Nov 17, 2025, 04_28_14 PM.png';

interface AdministratorSidebarProps {
  className?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
}

const AdministratorSidebar = ({ className, onClose, showCloseButton = false }: AdministratorSidebarProps) => {
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.user);
  const profileImage = resolveMediaUrl(user?.profile_image);

  const quickActions = [
    {
      to: '/administrator/users/new',
      icon: Users,
      label: 'Add User',
      color: 'from-emerald-500 to-emerald-600',
      description: 'Create new user'
    },
    {
      to: '/administrator/vendors?status=pending',
      icon: Building2,
      label: 'Pending Vendors',
      color: 'from-emerald-500 to-green-600',
      description: 'Review applications'
    },
    {
      to: '/administrator/transactions?status=pending',
      icon: CreditCard,
      label: 'Approve Payments',
      color: 'from-green-500 to-emerald-600',
      description: 'Process transactions'
    },
  ];

  const links = [
    {
      to: '/',
      icon: Home,
      label: 'Home',
    },
    {
      to: '/administrator',
      icon: LayoutDashboard,
      label: 'Dashboard',
    },
    {
      to: '/administrator/users',
      icon: Users,
      label: 'Users',
    },
    {
      to: '/administrator/vendors',
      icon: Users,
      label: 'Vendors',
    },
    {
      to: '/administrator/products',
      icon: ShoppingBag,
      label: 'Products',
    },
    {
      to: '/administrator/categories',
      icon: FolderTree,
      label: 'Categories',
    },
    {
      to: '/administrator/orders',
      icon: ClipboardList,
      label: 'Order Management',
    },
    {
      to: '/administrator/transactions',
      icon: CreditCard,
      label: 'Transactions',
    },
    {
      to: '/administrator/payouts',
      icon: DollarSign,
      label: 'Payouts',
    },
    {
      to: '/administrator/testimonials',
      icon: MessageSquare,
      label: 'Testimonials',
    },
    {
      to: '/administrator/settings',
      icon: Settings,
      label: 'Settings',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/administrator' && location.pathname === '/administrator') return true;
    if (path !== '/administrator' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <aside
      className={cn(
        'relative flex h-full w-64 flex-col overflow-hidden border-r border-emerald-400/20 bg-gradient-to-b from-emerald-950 via-emerald-950/30 to-emerald-950 backdrop-blur-xl shadow-2xl shadow-emerald-500/10',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-black/40" />
      {showCloseButton && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-[rgba(0,255,180,0.14)] bg-[rgba(20,30,40,0.55)] p-2 text-[#E6EDF3] transition hover:bg-[rgba(20,30,40,0.75)]"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <div className="relative h-full flex flex-col">
        {/* Admin Profile Header (sticky) */}
        <div className="p-6 border-b border-[rgba(0,255,180,0.10)] sticky top-0 z-10 bg-[rgba(20,30,40,0.55)] backdrop-blur-md">

          <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(20,30,40,0.55)] border border-[rgba(0,255,180,0.10)] hover:bg-[rgba(20,30,40,0.75)] transition-colors cursor-pointer group">
            <div className="relative">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={user?.first_name || 'Admin'}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/20 group-hover:ring-emerald-500/50 transition-all"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center"><User className="w-4 h-4 text-white" /></div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0B0F14]"></div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                {user?.full_name || `${user?.first_name} ${user?.last_name}`.trim() || 'Administrator'}
              </h2>
              <p className="text-[10px] text-emerald-100/80 truncate">Super Admin</p>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto sidebar-scrollbar admin-sidebar-scrollbar">
          {/* Quick Actions */}
          <div className="p-4 border-b border-emerald-400/20">
            <h3 className="text-sm font-bold text-[#E6EDF3] mb-3 flex items-center">
              <Zap className="w-4 h-4 mr-2 text-[#00E5A8]" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="group flex items-center gap-3 p-3 rounded-2xl bg-[rgba(20,30,40,0.55)] border border-emerald-400/10 hover:bg-emerald-500/10 hover:border-emerald-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20"
                >
                  <div className={`h-9 w-9 rounded-xl bg-gradient-to-r ${action.color} flex items-center justify-center shadow-lg shadow-black/20 border border-[rgba(0,255,180,0.14)] group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[#E6EDF3] truncate">{action.label}</div>
                    <div className="text-xs text-emerald-100/80 truncate">{action.description}</div>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-emerald-400/80 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 space-y-1">
            {links.map((link) => {
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${active
                    ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-400/30 text-white shadow-lg shadow-emerald-500/20'
                    : 'border border-transparent text-[#E6EDF3] hover:bg-emerald-500/10 hover:text-white hover:border-emerald-400/20'
                    }`}
                >
                  <link.icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-all group-hover:scale-110 ${active ? 'text-emerald-300' : 'text-emerald-200/70'
                    }`} />
                  <span>{link.label}</span>
                  {active && (
                    <div className="ml-auto w-2 h-2 bg-emerald-300 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer with system status */}
          <div className="p-4 border-t border-[rgba(0,255,180,0.10)]">
            <div className="flex items-center justify-between">
              <Link
                to="/administrator/notifications"
                className="flex items-center p-2 rounded-xl hover:bg-[rgba(0,229,168,0.08)] border border-transparent hover:border-[rgba(0,255,180,0.12)] transition-colors"
              >
                <Bell className="w-4 h-4 text-emerald-200/80 mr-2" />
                <span className="text-xs text-emerald-100/80">Alerts</span>
                <div className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              </Link>
              <Link
                to="/administrator/analytics"
                className="flex items-center p-2 rounded-xl hover:bg-[rgba(0,229,168,0.08)] border border-transparent hover:border-[rgba(0,255,180,0.12)] transition-colors"
              >
                <TrendingUp className="w-4 h-4 text-emerald-200/80 mr-2" />
                <span className="text-xs text-emerald-100/80">Analytics</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AdministratorSidebar;