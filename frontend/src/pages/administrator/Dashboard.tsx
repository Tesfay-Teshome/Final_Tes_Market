import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminAPI, notificationsAPI, resolveMediaUrl } from '@/services/api';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import PremiumChart from '@/components/charts/PremiumChart';
import {
  Activity,
  Bell,
  AlertCircle,
  AlertTriangle,
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  BarChart2,
  CheckCircle2,
  Clock,
  CreditCard,
  Database,
  ExternalLink,
  HardDrive,
  Loader2,
  Package,
  PlusCircle,
  RefreshCcw,
  RefreshCw,
  Server,
  ShoppingBag,
  ShoppingCart,
  Store,
  UserCheck,
  User,
  Users,
  MousePointerClick,
  TrendingUp,
  Eye,
  Settings,
  Sparkles,
  LayoutGrid,
  DollarSign,
  Search,
  MoreVertical
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

// Define the type for the activity icon mapping
const getActivityIcon = (type: string): React.ReactNode => {
  switch (type) {
    case 'order':
      return <ShoppingCart className="h-4 w-4" />;
    case 'user':
      return <Users className="h-4 w-4" />;
    case 'product':
      return <Package className="h-4 w-4" />;
    case 'payment':
      return <CreditCard className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

// UI Components
interface BaseProps {
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

// Skeleton component for loading states
// Kept for future use in loading states
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Skeleton = ({ className = '', ...props }: BaseProps) => (
  <div
    className={`animate-pulse bg-muted rounded-md ${className}`}
    {...props}
  />
);

// Button component
// Note: Custom Button component was removed since we're importing the official Button component

// Note: Custom Card components were removed since we're importing the official components from the UI library

// System status badge component
const SystemStatusBadge = ({ status }: { status: SystemStatus }) => {
  const statusColors = {
    online: 'bg-[#00E5A8]',
    degraded: 'bg-[#2A7F6E]',
    offline: 'bg-[rgba(0,229,168,0.35)]'
  };

  return (
    <div className="flex items-center">
      <div className={`h-2 w-2 rounded-full ${statusColors[status] || 'bg-gray-500'}`} />
      <span className="ml-2 text-xs capitalize text-[#E6EDF3]">{status}</span>
    </div>
  );
};

// Types
type SystemStatus = 'online' | 'offline' | 'degraded';

type ActivityType = 'order' | 'user' | 'vendor' | 'product' | 'payment' | 'system';

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  link?: string;
}

interface AdminDashboardRecentOrder {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  buyer?: {
    id?: string;
    email?: string;
    full_name?: string;
  };
  link?: string;
  transaction_id?: string;
  payment_method?: string;
}

interface AdminDashboardHealth {
  api: SystemStatus;
  database: SystemStatus;
  storage: SystemStatus;
  last_checked: string;
}

interface DashboardNotification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  time_ago?: string;
}

interface DashboardMetrics {
  // User Metrics
  total_users: number;
  new_users_today: number;
  active_users: number;
  user_growth: number;

  // Vendor Metrics
  total_vendors: number;
  pending_vendor_approvals: number;
  active_vendors: number;
  vendor_growth: number;

  // Product Metrics
  total_products: number;
  pending_product_approvals: number;
  out_of_stock_products: number;

  // Order Metrics
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  order_growth: number;

  // Financial Metrics
  total_sales: number;
  platform_revenue: number;
  pending_payouts: number;
  pending_payout_amount: number;
  pending_payouts_count: number;
  revenue_growth: number;

  // Performance Metrics
  conversion_rate: number;
  conversion_rate_change: number;
  average_order_value: number;
  aov_change: number;

  // System Metrics
  refund_requests: number;
  open_disputes: number;

  // Recent Activities & Lists
  recent_activities: ActivityItem[];
  recent_users: Array<{ id: string; email: string; full_name?: string; date_joined: string }>;

  // Charts Data
  sales_over_time: Array<{ date: string; value: number }>;
  top_products: Array<{ id: string; name: string; sales: number; revenue: number }>;
  top_vendors: Array<{ id: string; name: string; sales: number; revenue: number }>;

  // System Status
  system_status: {
    database: SystemStatus;
    api: SystemStatus;
    storage: SystemStatus;
    last_checked: string;
  };
}

// Helper function to safely format numbers with fallback to 0
const formatNumber = (value: number | undefined): string => {
  return (value || 0).toLocaleString();
};

// Helper function to format currency values
const formatCurrency = (value: number | undefined): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
};

const Dashboard = () => {
  // State hooks must be called at the top level
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date(),
  });

  const getDashboardRangeParam = () => {
    const from = dateRange?.from;
    const to = dateRange?.to;
    if (!(from instanceof Date) || !(to instanceof Date)) return '30d';
    const diffDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
    if (diffDays <= 7) return '7d';
    if (diffDays <= 30) return '30d';
    if (diffDays <= 90) return '90d';
    return '90d';
  };

  // Navigation
  const navigate = useNavigate(); // Used in quickActions
  const user = useSelector((state: RootState) => state.auth.user);

  // Simple toast implementation
  const showToast = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 p-4 rounded-md border bg-[#0A1A14]/90 border-[#3CFF9E]/20 shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(60,255,158,0.2)] ${variant === 'destructive' ? 'ring-1 ring-[rgba(0,255,180,0.18)]' : ''}`;
    toast.innerHTML = `
      <h4 class="font-medium">${title}</h4>
      <p class="text-sm">${description}</p>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  // Default metrics data
  const defaultMetrics: DashboardMetrics = {
    total_users: 0,
    new_users_today: 0,
    active_users: 0,
    user_growth: 0,

    total_vendors: 0,
    active_vendors: 0,
    pending_vendor_approvals: 0,
    vendor_growth: 0,
    total_products: 0,
    pending_product_approvals: 0,
    out_of_stock_products: 0,
    total_orders: 0,
    pending_orders: 0,
    completed_orders: 0,
    cancelled_orders: 0,
    order_growth: 0,
    total_sales: 0,
    platform_revenue: 0,
    pending_payouts: 0,
    pending_payout_amount: 0,
    pending_payouts_count: 0,
    revenue_growth: 0,
    refund_requests: 0,
    open_disputes: 0,

    conversion_rate: 0,
    conversion_rate_change: 0,
    average_order_value: 0,
    aov_change: 0,
    recent_activities: [],
    recent_users: [],
    sales_over_time: [],
    top_products: [],
    top_vendors: [],
    system_status: {
      database: 'online',
      api: 'online',
      storage: 'online',
      last_checked: new Date().toISOString(),
    },
  };

  // Fetch metrics data with proper type assertion
  const metricsQuery = useQuery({
    queryKey: ['admin-metrics', getDashboardRangeParam()],
    queryFn: async () => {
      const response = await adminAPI.getMetrics({
        range: getDashboardRangeParam(),
        group_by: 'day',
      });
      console.log('Metrics response:', response);
      return response.data || {};
    },
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const transactionsQuery = useQuery({
    queryKey: ['admin-dashboard-transactions'],
    queryFn: async () => {
      const response = await adminAPI.getOrders({ limit: 20 });
      return response.data || {};
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: 2,
  });

  const healthQuery = useQuery({
    queryKey: ['admin-dashboard-health'],
    queryFn: async () => {
      const response = await adminAPI.getHealth();
      return response.data || {};
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    retry: 1,
  });

  const notificationsQuery = useQuery({
    queryKey: ['admin-dashboard-notifications'],
    queryFn: async (): Promise<DashboardNotification[]> => {
      const response = await notificationsAPI.getAll();
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: false,
  });

  const { data: metricsResponse, isError, refetch, isRefetching, isLoading } = metricsQuery;

  // Map backend response to frontend metrics structure with proper structure and fallbacks
  const legacyResponse = (metricsResponse as any)?.legacy || metricsResponse || {};
  const v2Metrics = (metricsResponse as any)?.metrics || {};
  const v2Charts = (metricsResponse as any)?.charts || {};
  const v2Lists = (metricsResponse as any)?.lists || {};

  const userMetrics = v2Metrics?.user_metrics || (legacyResponse as any)?.user_metrics || {};
  const vendorMetrics = v2Metrics?.vendor_metrics || (legacyResponse as any)?.vendor_metrics || {};
  const productMetrics = v2Metrics?.product_metrics || (legacyResponse as any)?.product_metrics || {};
  const orderMetrics = v2Metrics?.order_metrics || (legacyResponse as any)?.order_metrics || {};
  const financialMetrics = v2Metrics?.financial_metrics || (legacyResponse as any)?.financial_metrics || {};
  const performanceMetrics = v2Metrics?.performance_metrics || (legacyResponse as any)?.performance_metrics || {};
  const systemMetrics = v2Metrics?.system_metrics || (legacyResponse as any)?.system_metrics || {};

  const pendingPayoutAmount =
    financialMetrics?.pending_payout_amount ??
    (legacyResponse as any)?.pending_payout_amount ??
    undefined;
  const pendingPayoutCount =
    financialMetrics?.pending_payouts_count ??
    financialMetrics?.pending_payouts ??
    (legacyResponse as any)?.pending_payouts ??
    0;

  const typedMetrics: DashboardMetrics = {
    ...defaultMetrics,

    // User metrics
    total_users: Number(userMetrics?.total_users ?? (legacyResponse as any)?.total_users ?? (metricsResponse as any)?.total_users ?? 0),
    new_users_today: Number(userMetrics?.new_users_today ?? (legacyResponse as any)?.new_users_today ?? 0),
    active_users: Number(userMetrics?.active_users ?? (legacyResponse as any)?.active_users ?? 0),
    user_growth: Number(userMetrics?.user_growth ?? (legacyResponse as any)?.user_growth ?? 0),

    // Vendor metrics
    total_vendors: Number(vendorMetrics?.total_vendors ?? (legacyResponse as any)?.total_vendors ?? (metricsResponse as any)?.total_vendors ?? 0),
    pending_vendor_approvals: Number(
      vendorMetrics?.pending_vendor_approvals ??
      (legacyResponse as any)?.pending_vendor_approvals ??
      (legacyResponse as any)?.pending_approvals ??
      0
    ),
    active_vendors: Number(vendorMetrics?.active_vendors ?? (legacyResponse as any)?.active_vendors ?? 0),
    vendor_growth: Number(vendorMetrics?.vendor_growth ?? (legacyResponse as any)?.vendor_growth ?? 0),

    // Product metrics
    total_products: Number(productMetrics?.total_products ?? (legacyResponse as any)?.total_products ?? (metricsResponse as any)?.total_products ?? 0),
    pending_product_approvals: Number(
      productMetrics?.pending_product_approvals ??
      (legacyResponse as any)?.pending_product_approvals ??
      (legacyResponse as any)?.pending_approvals ??
      0
    ),
    out_of_stock_products: Number(productMetrics?.out_of_stock_products ?? (legacyResponse as any)?.out_of_stock_products ?? 0),

    // Order metrics
    total_orders: Number(orderMetrics?.total_orders ?? (legacyResponse as any)?.total_orders ?? (metricsResponse as any)?.total_orders ?? 0),
    pending_orders: Number(orderMetrics?.pending_orders ?? (legacyResponse as any)?.pending_orders ?? 0),
    completed_orders: Number(orderMetrics?.completed_orders ?? (legacyResponse as any)?.completed_orders ?? 0),
    cancelled_orders: Number(orderMetrics?.cancelled_orders ?? (legacyResponse as any)?.cancelled_orders ?? 0),
    order_growth: Number(orderMetrics?.order_growth ?? (legacyResponse as any)?.order_growth ?? 0),

    // Financial metrics
    total_sales: parseFloat(String(financialMetrics?.total_sales ?? (legacyResponse as any)?.total_sales ?? (metricsResponse as any)?.total_sales ?? financialMetrics?.revenue ?? (legacyResponse as any)?.revenue ?? '0')),
    platform_revenue: parseFloat(String(financialMetrics?.platform_revenue ?? (legacyResponse as any)?.platform_revenue ?? (legacyResponse as any)?.total_commission ?? (metricsResponse as any)?.platform_revenue ?? '0')),
    pending_payout_amount: parseFloat(String(pendingPayoutAmount ?? 0)),
    pending_payouts_count: Number(pendingPayoutCount ?? 0),
    pending_payouts: parseFloat(String(pendingPayoutAmount ?? 0)),
    revenue_growth: parseFloat(String(financialMetrics?.revenue_growth ?? (legacyResponse as any)?.revenue_growth ?? '0')),

    // Performance metrics
    conversion_rate: parseFloat(String(performanceMetrics?.conversion_rate ?? (legacyResponse as any)?.conversion_rate ?? '0')),
    conversion_rate_change: parseFloat(String(performanceMetrics?.conversion_rate_change ?? (legacyResponse as any)?.conversion_rate_change ?? '0')),
    average_order_value: parseFloat(String(financialMetrics?.average_order_value ?? performanceMetrics?.average_order_value ?? (legacyResponse as any)?.average_order_value ?? '0')),
    aov_change: parseFloat(String(financialMetrics?.aov_change ?? performanceMetrics?.aov_change ?? (legacyResponse as any)?.aov_change ?? '0')),

    // System metrics
    refund_requests: Number(systemMetrics?.refund_requests ?? (legacyResponse as any)?.refund_requests ?? 0),
    open_disputes: Number(systemMetrics?.open_disputes ?? (legacyResponse as any)?.open_disputes ?? 0),

    // Recent activities
    recent_activities: Array.isArray(v2Lists?.recent_activities)
      ? v2Lists.recent_activities
      : (Array.isArray((legacyResponse as any)?.recent_activities)
        ? (legacyResponse as any).recent_activities
        : (Array.isArray((legacyResponse as any)?.activities)
          ? (legacyResponse as any).activities
          : (Array.isArray((metricsResponse as any)?.recent_activities)
            ? (metricsResponse as any).recent_activities
            : []))),

    recent_users: Array.isArray(v2Lists?.recent_users)
      ? v2Lists.recent_users
      : (Array.isArray((legacyResponse as any)?.recent_users)
        ? (legacyResponse as any).recent_users
        : (Array.isArray((legacyResponse as any)?.users)
          ? (legacyResponse as any).users
          : (Array.isArray((metricsResponse as any)?.recent_users)
            ? (metricsResponse as any).recent_users
            : []))),

    // Charts data
    sales_over_time: Array.isArray(v2Charts?.sales_over_time)
      ? v2Charts.sales_over_time
      : (Array.isArray((legacyResponse as any)?.sales_over_time)
        ? (legacyResponse as any).sales_over_time
        : ((legacyResponse as any)?.sales_data || [])),

    top_products: Array.isArray(v2Lists?.top_products)
      ? v2Lists.top_products
      : (Array.isArray((legacyResponse as any)?.top_products)
        ? (legacyResponse as any).top_products
        : ((legacyResponse as any)?.popular_products || [])),

    top_vendors: Array.isArray(v2Lists?.top_vendors)
      ? v2Lists.top_vendors
      : (Array.isArray((legacyResponse as any)?.top_vendors)
        ? (legacyResponse as any).top_vendors
        : ((legacyResponse as any)?.popular_vendors || [])),

    // System status
    system_status: (metricsResponse as any)?.system_status || (legacyResponse as any)?.system_status || {
      database: (legacyResponse as any)?.database_status || 'online',
      api: (legacyResponse as any)?.api_status || 'online',
      storage: (legacyResponse as any)?.storage_status || 'online',
      last_checked: (legacyResponse as any)?.last_status_check || new Date().toISOString()
    },
  };

  const recentOrders: AdminDashboardRecentOrder[] = (() => {
    const orders = Array.isArray((transactionsQuery.data as any)?.results)
      ? (transactionsQuery.data as any).results
      : Array.isArray(transactionsQuery.data)
        ? transactionsQuery.data
        : [];

    return orders.map((order: any) => ({
      id: order.id,
      status: order.status,
      total_amount: order.total_amount || 0,
      created_at: order.created_at,
      buyer: order.customer || order.user || order.buyer,
      link: `/administrator/orders/${order.id}`,
    }));
  })();

  const dashboardNotifications: DashboardNotification[] = Array.isArray(notificationsQuery.data)
    ? (notificationsQuery.data as DashboardNotification[])
    : [];

  const unreadNotificationsCount = dashboardNotifications.filter((n: DashboardNotification) => !n.is_read).length;

  // Stats cards data - used in the stats grid
  const stats = [
    // Users
    {
      name: 'Total Users',
      value: formatNumber(typedMetrics.total_users || 0),
      change: typedMetrics.user_growth || 0,
      icon: Users,
      iconClass: 'text-emerald-500',
      color: 'from-emerald-500 via-emerald-400 to-emerald-600',
      link: '/administrator/users',
      description: `${formatNumber(typedMetrics.active_users || 0)} active`
    },
    {
      name: 'New Users Today',
      value: formatNumber(typedMetrics.new_users_today || 0),
      change: 0,
      icon: UserCheck,
      iconClass: 'text-emerald-500',
      color: 'from-emerald-500 via-emerald-400 to-emerald-600',
      link: '/administrator/users?filter=new',
      description: 'Signed up today'
    },
    // Vendors
    {
      name: 'Total Vendors',
      value: formatNumber(typedMetrics.total_vendors || 0),
      change: typedMetrics.vendor_growth || 0,
      icon: Store,
      iconClass: 'text-emerald-500',
      color: 'from-emerald-500 via-emerald-400 to-emerald-600',
      link: '/administrator/vendors',
      description: `${formatNumber(typedMetrics.active_vendors || 0)} active`
    },
    {
      name: 'Pending Approvals',
      value: formatNumber(typedMetrics.pending_vendor_approvals || 0),
      change: 0,
      icon: UserCheck,
      iconClass: 'text-emerald-500',
      color: 'from-emerald-600 via-emerald-500 to-emerald-700',
      link: '/administrator/vendors?status=pending',
      description: 'Vendor applications'
    },
    // Products
    {
      name: 'Total Products',
      value: formatNumber(typedMetrics.total_products || 0),
      change: 0,
      icon: ShoppingBag,
      iconClass: 'text-emerald-500',
      color: 'from-emerald-500 via-emerald-400 to-emerald-600',
      link: '/administrator/products',
      description: `${formatNumber(typedMetrics.pending_product_approvals || 0)} pending approval`
    },
    {
      name: 'Out of Stock',
      value: formatNumber(typedMetrics.out_of_stock_products || 0),
      change: 0,
      icon: Package,
      iconClass: 'text-emerald-500',
      color: 'from-emerald-600 via-emerald-500 to-emerald-700',
      link: '/administrator/products?filter=outofstock',
      description: 'Products out of stock'
    },
    // Orders
    {
      name: 'Total Orders',
      value: formatNumber(typedMetrics.total_orders || 0),
      change: typedMetrics.order_growth || 0,
      icon: ShoppingCart,
      iconClass: 'text-emerald-500',
      color: 'from-emerald-500 via-emerald-400 to-emerald-600',
      link: '/administrator/orders',
      description: `${formatNumber(typedMetrics.pending_orders || 0)} pending`
    },
    {
      name: 'Completed Orders',
      value: formatNumber(typedMetrics.completed_orders || 0),
      change: 0,
      icon: CheckCircle2,
      iconClass: 'text-emerald-500',
      color: 'from-emerald-400 via-green-500 to-teal-600',
      link: '/administrator/orders?status=completed',
      description: 'Successfully delivered'
    },
    // Financial
    {
      name: 'Total Sales',
      value: formatCurrency(typedMetrics.total_sales || 0),
      change: typedMetrics.revenue_growth || 0,
      icon: CreditCard,
      iconClass: 'text-emerald-500',
      color: 'from-emerald-500 to-green-600',
      link: '/administrator/transactions',
      description: `Revenue: ${formatCurrency(typedMetrics.platform_revenue || 0)}`
    },
    {
      name: 'Pending Payouts',
      value: formatCurrency(typedMetrics.pending_payout_amount || typedMetrics.pending_payouts || 0),
      change: 0,
      icon: Clock,
      iconClass: 'text-emerald-500',
      color: 'from-emerald-600 via-emerald-500 to-emerald-700',
      link: '/administrator/payouts',
      description: `${formatNumber(typedMetrics.pending_payouts_count || 0)} payouts pending`
    },
    // Support
    {
      name: 'Refund Requests',
      value: formatNumber(typedMetrics.refund_requests || 0),
      change: 0,
      icon: RefreshCw,
      iconClass: 'text-emerald-500',
      color: 'from-emerald-600 via-emerald-500 to-emerald-700',
      link: '/administrator/refunds',
      description: 'Refund requests'
    },
    {
      name: 'Open Disputes',
      value: formatNumber(typedMetrics.open_disputes || 0),
      change: 0,
      icon: AlertTriangle,
      iconClass: 'text-emerald-500',
      color: 'from-emerald-600 via-emerald-500 to-emerald-700',
      link: '/administrator/disputes',
      description: 'Customer disputes'
    }
  ];

  // Get status color
  const getStatusColor = (status: SystemStatus) => {
    switch (status) {
      case 'online':
        return 'bg-[#00E5A8]';
      case 'degraded':
        return 'bg-[#2A7F6E]';
      case 'offline':
        return 'bg-[rgba(0,229,168,0.35)]';
      default:
        return 'bg-gray-500';
    }
  };

  // Error state
  if (isError) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h2 className="text-2xl font-bold">Error loading dashboard</h2>
        <p className="text-muted-foreground">
          We couldn't load the dashboard data. Please try again.
        </p>
        <Button onClick={() => refetch()} className="mt-4">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  // Moved to the top of the component
  // const [activeTab, setActiveTab] = useState('overview');
  // const [dateRange, setDateRange] = useState({
  //   from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
  //   to: new Date(),
  // });

  const systemStatus: AdminDashboardHealth = {
    ...{
      api: 'online' as const,
      database: 'online' as const,
      storage: 'online' as const,
      last_checked: new Date().toISOString(),
    },
    ...(typedMetrics.system_status || {}),
    ...((healthQuery.data as any) || {}),
  };

  // System status items for the status panel
  const systemStatusItems = [
    {
      name: 'API',
      status: systemStatus.api,
      description: 'REST API service',
      icon: Server,
      iconClass: 'text-[#00E5A8]'
    },
    {
      name: 'Database',
      status: systemStatus.database,
      description: 'Database connection',
      icon: Database,
      iconClass: 'text-[#00C896]'
    },
    {
      name: 'Storage',
      status: systemStatus.storage,
      description: 'File storage',
      icon: HardDrive,
      iconClass: 'text-[#2A7F6E]'
    }
  ];

  // Quick actions with proper type annotations
  const quickActions = [
    {
      name: 'Add Product',
      icon: PlusCircle,
      action: () => navigate('/administrator/products/new'),
      color: 'bg-[rgba(255,255,255,0.08)] border border-[#00FF9D]/[0.15] hover:bg-[#00FF9D]/20 shadow-[0_0_10px_rgba(0,255,157,0.1)]',
      description: 'Create a new product listing'
    },
    {
      name: 'Manage Vendors',
      icon: Store,
      action: () => navigate('/administrator/vendors'),
      color: 'bg-[rgba(255,255,255,0.08)] border border-[#00FF9D]/[0.15] hover:bg-[#00FF9D]/20 shadow-[0_0_10px_rgba(0,255,157,0.1)]',
      description: 'View and manage vendors'
    },
    {
      name: 'View Orders',
      icon: ShoppingBag,
      action: () => navigate('/administrator/orders'),
      color: 'bg-[rgba(255,255,255,0.08)] border border-[#00FF9D]/[0.15] hover:bg-[#00FF9D]/20 shadow-[0_0_10px_rgba(0,255,157,0.1)]',
      description: 'View and process orders'
    },
    {
      name: 'Settings',
      icon: Settings,
      action: () => navigate('/administrator/settings'),
      color: 'bg-[rgba(255,255,255,0.08)] border border-[#00FF9D]/[0.15] hover:bg-[#00FF9D]/20 shadow-[0_0_10px_rgba(0,255,157,0.1)]',
      description: 'Configure platform settings'
    }
  ];

  // Type for quick actions
  interface QuickAction {
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    action: () => void;
    color: string;
    description?: string;
  }

  const salesSeries = Array.isArray(typedMetrics.sales_over_time) ? typedMetrics.sales_over_time : [];
  const salesValues = salesSeries.map((p) => Number(p.value) || 0);
  const maxSalesValue = Math.max(1, ...salesValues);
  const sparklinePoints = salesSeries.length
    ? salesSeries
      .map((p, i) => {
        const x = (i / Math.max(1, salesSeries.length - 1)) * 100;
        const y = 100 - ((Number(p.value) || 0) / maxSalesValue) * 100;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ')
    : '';

  const emeraldCardBase = "relative overflow-hidden rounded-3xl border border-white/[0.04] bg-[#0c1214]/60 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.04] before:to-transparent before:pointer-events-none group hover:border-[#3CFF9E]/20 hover:bg-[#0c1318]/90 transition-all duration-500 transform-gpu hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(60,255,158,0.1)]";
  const emeraldLabel = "text-[#7A9A90] font-semibold tracking-wider uppercase text-[10px]";
  const emeraldMeta = "text-[#6A827B]";
  const emeraldKpi = "text-white font-black tracking-tight drop-shadow-sm";
  const emeraldIconWrap = "bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]";
  const emeraldIcon = "text-[#3CFF9E] drop-shadow-[0_0_8px_rgba(60,255,158,0.5)]";

  return (
    <div className="flex-1 relative min-h-screen text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 pb-6">
      {/* Clean, deep dark solid background based on the image */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Subtle grid and noise texture overlay for high-end feel without extreme light orbs */}
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>


      {/* Loading state */}
      {isLoading && (
        <div className="flex h-40 w-full items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#00FF9D]" />
            <span className="mt-4 text-lg text-[#9AA4AF]">Loading dashboard metrics...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {
        isError && !isLoading && (
          <div className={`${emeraldCardBase} text-[#E9FFF4] px-4 py-3 rounded-md my-4 backdrop-blur-[18px]`}>
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              <div className="font-medium">Error</div>
            </div>
            <div className="mt-2">
              Failed to load dashboard metrics. Please try refreshing the page.
              <Button variant="outline" size="sm" className="mt-2 ml-2" onClick={() => window.location.reload()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </div>
        )
      }

      {/* Emerald E-COM Specific Layout */}
      {
        !isLoading && !isError && (
          <div className="px-3 md:px-4 space-y-6 max-w-[1700px] mx-auto relative z-10 pt-6">

            {/* TOP KPI CARDS: Matching image reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Card 1: Total Revenue */}
              <div className="rounded-2xl border-2 border-emerald-500/50 bg-[#0F1720] p-4 cursor-pointer relative overflow-hidden group hover:bg-[#0F1720]/90 transition-all duration-300 shadow-xl" onClick={() => navigate('/administrator/transactions')}>
                <div className="flex justify-between items-start relative z-10 mb-2">
                  <span className="text-white/60 text-[10px] font-bold uppercase tracking-[0.05em]">Total Revenue</span>
                  <MoreVertical className="h-4 w-4 text-white/40 cursor-pointer hover:text-white/70" />
                </div>
                <div className="space-y-2 relative z-10">
                  <div className="text-2xl font-black text-white tracking-tight leading-none">{formatCurrency(typedMetrics.total_sales)}</div>
                  <div className="flex items-center gap-1.5 text-[#00FF9D] text-[10px] font-bold bg-[#00FF9D]/10 w-max px-2.5 py-0.5 rounded-md border border-[#00FF9D]/20">
                    <TrendingUp className="h-3 w-3" />
                    <span>+{(typedMetrics.revenue_growth || 18.2).toFixed(1)}%</span>
                  </div>
                </div>
                {/* Line Chart with Gradient Fill */}
                <div className="h-10 w-full mt-3 opacity-80 group-hover:opacity-100 transition-opacity relative z-10">
                  <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                    <defs>
                      <linearGradient id="gradient-emerald" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#00FF9D" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#00FF9D" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,35 L10,32 L20,38 L30,25 L40,32 L50,20 L60,28 L70,15 L80,22 L90,12 L100,18 L100,40 L0,40 Z" fill="url(#gradient-emerald)" />
                    <path d="M0,35 L10,32 L20,38 L30,25 L40,32 L50,20 L60,28 L70,15 L80,22 L90,12 L100,18" fill="none" stroke="#00FF9D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
              </div>

              {/* Card 2: Net Sales */}
              <div className="rounded-2xl border border-white/10 bg-[#0F1720] p-4 cursor-pointer relative overflow-hidden group hover:bg-[#0F1720]/90 transition-all duration-300 shadow-xl" onClick={() => navigate('/administrator/transactions')}>
                <div className="flex justify-between items-start relative z-10 mb-2">
                  <span className="text-white/60 text-[10px] font-bold uppercase tracking-[0.05em]">Net Sales</span>
                  <MoreVertical className="h-4 w-4 text-white/40 cursor-pointer hover:text-white/70" />
                </div>
                <div className="space-y-2 relative z-10">
                  <div className="text-2xl font-black text-white tracking-tight leading-none">{formatCurrency(typedMetrics.platform_revenue)}</div>
                  <div className="flex items-center gap-1.5 text-[#00D1FF] text-[10px] font-bold bg-[#00D1FF]/10 w-max px-2.5 py-0.5 rounded-md border border-[#00D1FF]/20">
                    <TrendingUp className="h-3 w-3" />
                    <span>+{(typedMetrics.revenue_growth || 12.5).toFixed(1)}%</span>
                  </div>
                </div>
                {/* Line Chart with Gradient Fill */}
                <div className="h-10 w-full mt-3 opacity-80 group-hover:opacity-100 transition-opacity relative z-10">
                  <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                    <defs>
                      <linearGradient id="gradient-blue" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#00D1FF" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#00D1FF" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,32 L15,35 L30,22 L45,28 L60,15 L75,30 L90,18 L100,22 L100,40 L0,40 Z" fill="url(#gradient-blue)" />
                    <path d="M0,32 L15,35 L30,22 L45,28 L60,15 L75,30 L90,18 L100,22" fill="none" stroke="#00D1FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
              </div>

              {/* Card 3: Orders */}
              <div className="rounded-2xl border border-white/10 bg-[#0F1720] p-4 cursor-pointer relative overflow-hidden group hover:bg-[#0F1720]/90 transition-all duration-300 shadow-xl" onClick={() => navigate('/administrator/orders')}>
                <div className="flex justify-between items-start relative z-10 mb-2">
                  <span className="text-white/60 text-[10px] font-bold uppercase tracking-[0.05em]">Orders</span>
                  <MoreVertical className="h-4 w-4 text-white/40 cursor-pointer hover:text-white/70" />
                </div>
                <div className="space-y-2 relative z-10">
                  <div className="text-2xl font-black text-white tracking-tight leading-none">{formatNumber(typedMetrics.total_orders || 14890)}</div>
                  <div className="flex items-center gap-1.5 text-[#BF5AF2] text-[10px] font-bold bg-[#BF5AF2]/10 w-max px-2.5 py-0.5 rounded-md border border-[#BF5AF2]/20">
                    <TrendingUp className="h-3 w-3" />
                    <span>+{(typedMetrics.order_growth || 9.1).toFixed(1)}%</span>
                  </div>
                </div>
                {/* Line Chart with Gradient Fill */}
                <div className="h-10 w-full mt-3 opacity-80 group-hover:opacity-100 transition-opacity relative z-10">
                  <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                    <defs>
                      <linearGradient id="gradient-purple" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#BF5AF2" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#BF5AF2" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,28 L10,35 L25,18 L40,30 L55,22 L70,32 L85,20 L100,25 L100,40 L0,40 Z" fill="url(#gradient-purple)" />
                    <path d="M0,28 L10,35 L25,18 L40,30 L55,22 L70,32 L85,20 L100,25" fill="none" stroke="#BF5AF2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
              </div>

              {/* Card 4: Avg. Order Value */}
              <div className="rounded-2xl border border-white/10 bg-[#0F1720] p-4 cursor-pointer relative overflow-hidden group hover:bg-[#0F1720]/90 transition-all duration-300 shadow-xl">
                <div className="flex justify-between items-start relative z-10 mb-2">
                  <span className="text-white/60 text-[10px] font-bold uppercase tracking-[0.05em]">Avg. Order Value</span>
                  <MoreVertical className="h-4 w-4 text-white/40 cursor-pointer hover:text-white/70" />
                </div>
                <div className="space-y-2 relative z-10">
                  <div className="text-2xl font-black text-white tracking-tight leading-none">{formatCurrency(typedMetrics.average_order_value || 97.75)}</div>
                  <div className="flex items-center gap-1.5 text-[#00FF9D] text-[10px] font-bold bg-[#00FF9D]/10 w-max px-2.5 py-0.5 rounded-md border border-[#00FF9D]/20">
                    <TrendingUp className="h-3 w-3" />
                    <span>+{(typedMetrics.aov_change || 0).toFixed(1)}%</span>
                  </div>
                </div>
                {/* Bar Chart */}
                <div className="h-10 w-full mt-3 flex items-end justify-between gap-1 opacity-80 group-hover:opacity-100 transition-opacity relative z-10">
                  {[40, 65, 30, 85, 45, 60, 35, 90, 55, 75, 40].map((h, i) => (
                    <div key={i} className="flex-1 bg-emerald-500/40 group-hover:bg-emerald-500/60 transition-colors rounded-t-sm" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>

              {/* Card 5: New Customers */}
              <div className="rounded-2xl border border-white/10 bg-[#0F1720] p-4 cursor-pointer relative overflow-hidden group hover:bg-[#0F1720]/90 transition-all duration-300 shadow-xl">
                <div className="flex justify-between items-start relative z-10 mb-2">
                  <span className="text-white/60 text-[10px] font-bold uppercase tracking-[0.05em]">New Customers</span>
                  <MoreVertical className="h-4 w-4 text-white/40 cursor-pointer hover:text-white/70" />
                </div>
                <div className="space-y-2 relative z-10">
                  <div className="text-2xl font-black text-white tracking-tight leading-none">{formatNumber(typedMetrics.new_users_today || 0)}</div>
                  <div className="h-6" /> {/* Spacer to match growth badge height */}
                </div>
                {/* Detailed Bar Chart */}
                <div className="h-10 w-full mt-3 flex items-end justify-between gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity relative z-10">
                  {[30, 45, 25, 60, 40, 55, 30, 70, 45, 65, 35, 80, 50, 75, 40, 60, 30, 50, 45, 65, 35, 70].map((h, i) => (
                    <div key={i} className="flex-1 bg-emerald-500/20 group-hover:bg-emerald-500/40 transition-colors rounded-t-sm" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>

            {/* MIDDLE ROW: Chart + Right Panel */}
            < div className="grid grid-cols-1 lg:grid-cols-3 gap-5" >
              {/* Sales Over Time Chart */}
              < div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(0,0,0,0.4)_100%)] p-6 relative overflow-hidden shadow-lg h-[450px] flex flex-col hover:border-[#00FF9D]/30 transition-colors" >
                <div className="flex justify-between items-start mb-6 z-10 relative">
                  <div>
                    <h2 className="text-[#A0AAB2] text-xs font-semibold tracking-wide uppercase mb-2">Sales Over Time</h2>
                    <div className="flex items-center gap-3">
                      <span className="text-[28px] font-bold text-white tracking-tight drop-shadow-md">{formatCurrency(typedMetrics.total_sales)}</span>
                      <span className="flex items-center gap-1 text-[#00FF9D] text-[11px] font-bold bg-[#00FF9D]/10 px-2 py-0.5 rounded-md">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                        {(typedMetrics.revenue_growth || 18.2).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="hidden sm:flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white opacity-20"></span>
                      <span className="text-[#A0AAB2] text-xs font-medium">Previous</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 mx-4">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00FF9D] shadow-[0_0_8px_#00FF9D]"></span>
                      <span className="text-white text-xs font-medium">Current</span>
                    </div>
                    <button className="text-[#A0AAB2] hover:text-white px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded pl-4 pr-3 text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors border border-white/5">
                      Trailing View <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                  </div>
                </div>
                <div className="flex-1 w-full relative z-10 min-h-0">
                  <PremiumChart
                    data={{
                      labels: typedMetrics.sales_over_time?.map(i => new Date(i.date).toLocaleDateString()) || [],
                      datasets: [
                        {
                          label: 'Previous',
                          data: typedMetrics.sales_over_time?.map(i => Number(i.value) * 0.8) || [],
                          borderColor: 'rgba(255,255,255,0.15)',
                          backgroundColor: 'transparent',
                          borderDash: [5, 5],
                          borderWidth: 2,
                          pointRadius: 0,
                          tension: 0.4,
                        },
                        {
                          label: 'Current',
                          data: typedMetrics.sales_over_time?.map(i => Number(i.value)) || [],
                          borderColor: '#00FF9D',
                          backgroundColor: (context: any) => {
                            const ctx = context.chart.ctx;
                            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                            gradient.addColorStop(0, 'rgba(0, 255, 157, 0.4)');
                            gradient.addColorStop(1, 'rgba(0, 255, 157, 0.0)');
                            return gradient;
                          },
                          tension: 0.4,
                          borderWidth: 3,
                          pointRadius: 0,
                          pointHoverRadius: 6,
                          pointHoverBackgroundColor: '#00FF9D',
                          pointHoverBorderColor: '#fff',
                          fill: true,
                          yAxisID: 'y',
                        }
                      ]
                    }}
                    height={300}
                    showLegend={false}
                    theme="dark"
                  />
                </div>
              </div>

              {/* Performance Panel Stack */}
              <div className="space-y-5 flex flex-col min-h-[450px]">
                {/* Top Performance */}
                <div className="rounded-2xl border border-white/10 bg-[#0F1720] p-6 relative overflow-hidden shadow-sm flex-[1.2] hover:border-[#00FF9D]/30 transition-colors">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-white/60 text-[10px] font-bold uppercase tracking-[0.05em]">Top Performance</h3>
                    <MoreVertical className="h-4 w-4 text-white/40 cursor-pointer hover:text-white/70" />
                  </div>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-[11px] font-bold mb-2">
                        <span className="text-[#A0AAB2] uppercase tracking-wider">Total Users</span>
                        <span className="text-white">{formatNumber(typedMetrics.total_users)}</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-[6px] overflow-hidden">
                        <div className="bg-[#00FF9D] h-full" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-bold mb-2">
                        <span className="text-[#A0AAB2] uppercase tracking-wider">Active Vendors</span>
                        <span className="text-white">{formatNumber(typedMetrics.active_vendors)}</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-[6px] overflow-hidden">
                        <div className="bg-[#00FF9D] h-full" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-bold mb-2">
                        <span className="text-[#A0AAB2] uppercase tracking-wider">Active Products</span>
                        <span className="text-white">{formatNumber(typedMetrics.total_products - typedMetrics.out_of_stock_products)}</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-[6px] overflow-hidden">
                        <div className="bg-[#00FF9D] h-full" style={{ width: '92%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Feed */}
                <div className="rounded-2xl border border-emerald-500/20 bg-[#0F1720] p-6 relative overflow-hidden shadow-sm flex-[0.8] flex flex-col justify-center border-dashed">
                  <h3 className="text-[#00FF9D] text-[10px] font-bold uppercase tracking-[0.25em] mb-4 text-center opacity-80">Live Feed</h3>

                  {
                    recentOrders.length > 0 ? (
                      <div className="text-center space-y-1">
                        <div className="text-[#A0AAB2] text-[11px] font-bold uppercase tracking-wider">New order from {recentOrders[0].buyer?.full_name?.split(' ')[0] || 'Customer'}</div>
                        <div className="text-3xl font-black text-white tracking-tight">
                          +{formatCurrency(Number(recentOrders[0].total_amount) || 0)}
                        </div>
                        <div className="text-[#00FF9D] text-[10px] uppercase font-black tracking-widest mt-3 px-3 py-1 bg-[#00FF9D]/10 rounded-md border border-[#00FF9D]/20 inline-block">Order Processed</div>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00FF9D]/10 mx-auto mb-3">
                          <Loader2 className="h-5 w-5 animate-spin text-[#00FF9D]" />
                        </div>
                        <div className="text-[#00FF9D] text-[10px] uppercase font-bold tracking-widest opacity-60">Listening...</div>
                      </div>
                    )
                  }
                </div>
              </div>
            </div>

            {/* BOTTOM ROW: Tables & Sparkline */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Transaction Stream Table */}
              <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-[#0F1720] relative overflow-hidden shadow-sm p-0 hover:border-emerald-500/30 transition-all duration-500">
                <div className="p-4 sm:p-5 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 border-b border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-[#00FF9D] shadow-[0_0_8px_#00FF9D]"></div>
                    <h3 className="text-white/60 text-[10px] font-bold uppercase tracking-[0.05em]">Transaction Stream</h3>
                  </div>
                  <button className="text-[#00FF9D] hover:text-white px-4 py-1.5 bg-[#00FF9D]/10 hover:bg-[#00FF9D]/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-[#00FF9D]/20 whitespace-nowrap" onClick={() => navigate('/administrator/orders')}>View Registry</button>
                </div>

                <div className="p-4 space-y-3">
                  {recentOrders.length > 0 ? (
                    recentOrders.map((order, i) => (
                      <motion.div
                        key={order.id || i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`group relative flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl border border-white/[0.04] bg-[#0c1214]/60 hover:bg-[#00FF9D]/[0.05] hover:border-[#00FF9D]/30 transition-all duration-300 cursor-pointer overflow-hidden shadow-md hover:shadow-[0_8px_25px_rgba(0,0,0,0.4)] gap-4 sm:gap-0 ${i === 0 ? 'bg-[linear-gradient(90deg,rgba(0,255,157,0.05)_0%,transparent_100%)] border-l-4 border-l-[#00FF9D]' : ''}`}
                        onClick={() => order.link && navigate(order.link)}
                      >
                        <div className="flex items-center gap-3 sm:gap-5 z-10">
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/20 flex items-center justify-center text-[#00FF9D] font-black text-[10px] sm:text-xs shadow-inner">
                            {order.buyer?.full_name?.charAt(0) || 'G'}
                          </div>
                          <div>
                            <div className="text-[9px] sm:text-[11px] font-black text-[#6A827B] uppercase tracking-widest mb-0.5">#{String(order.id).slice(0, 8)}</div>
                            <div className="text-white font-bold text-xs sm:text-[14px] group-hover:text-[#00FF9D] transition-colors line-clamp-1">{order.buyer?.full_name || order.buyer?.email || 'Guest Participant'}</div>
                          </div>
                        </div>

                        <div className="hidden lg:block z-10">
                          <div className="text-[10px] font-bold text-[#6A827B] uppercase tracking-tighter mb-0.5 opacity-60 text-center">Processing Date</div>
                          <div className="text-[#A0AAB2] text-xs font-medium">{new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8 z-10 w-full sm:w-auto">
                          <div className="text-left sm:text-right">
                            <div className="text-[9px] sm:text-[10px] font-bold text-[#6A827B] uppercase tracking-tighter mb-0.5 opacity-60">Amount</div>
                            <div className="text-white font-black text-base sm:text-lg tracking-tight">{formatCurrency(Number(order.total_amount))}</div>
                          </div>
                          <div className={`min-w-[80px] sm:min-w-[100px] text-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border font-black text-[8px] sm:text-[9px] uppercase tracking-[0.2em] shadow-sm transition-all duration-500 ${order.status === 'completed' || order.status === 'delivered'
                            ? 'bg-[#00FF9D]/10 border-[#00FF9D]/30 text-[#00FF9D] shadow-[0_0_10px_rgba(0,255,157,0.1)] group-hover:bg-[#00FF9D]/20'
                            : 'bg-white/5 border-white/10 text-[#A0AAB2]'
                            }`}>
                            {order.status || 'Pending'}
                          </div>
                        </div>

                        {/* Subtle hover background decoration */}
                        {/* Subtle hover background decoration */}
                        <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-[#00FF9D]/[0.03] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-[#A0AAB2] text-xs uppercase tracking-widest font-bold opacity-30">No transaction records found</div>
                  )}
                </div>
              </div>
            </div>

            {/* Legacy Metric Preservation Data - Dense View */}
            <div className="mt-12 pt-6 border-t border-white/5 opacity-80 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6 px-4">
                <div className="h-px bg-white/10 flex-1"></div>
                <h3 className="text-[#A0AAB2] text-[10px] font-black uppercase tracking-[0.4em] whitespace-nowrap opacity-60">Deep Signal Diagnostics</h3>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>

              {/* Refactored GRID for Additional Metrics - Unified and Aligned */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Pending Payouts */}
                <motion.div
                  className="rounded-2xl border border-white/[0.08] bg-[#0F1720] p-5 cursor-pointer transition-all duration-300 hover:border-[#00FF9D]/40 relative overflow-hidden group"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => navigate('/administrator/payouts')}
                >
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <div className={`text-[10px] ${emeraldLabel}`}>Pending Payouts</div>
                      <div className={`mt-1.5 text-xl font-bold ${emeraldKpi}`}>{formatCurrency(typedMetrics.pending_payout_amount || typedMetrics.pending_payouts || 0)}</div>
                      <div className={`mt-0.5 text-[9px] ${emeraldMeta}`}>{formatNumber(typedMetrics.pending_payouts_count || 0)} pending</div>
                    </div>
                    <div className={`h-7 w-7 rounded-lg ${emeraldIconWrap} flex items-center justify-center`}>
                      <Clock className={`h-3.5 w-3.5 ${emeraldIcon}`} />
                    </div>
                  </div>
                  {/* Mini Sparkline */}
                  <div className="h-6 w-full mt-3 opacity-60 group-hover:opacity-100 transition-opacity">
                    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
                      <path d="M0,25 L20,15 L40,28 L60,10 L80,22 L100,5" fill="none" stroke="#00FF9D" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </div>
                </motion.div>

                {/* Card 2: Out of Stock */}
                <motion.div
                  className="rounded-2xl border border-white/[0.08] bg-[#0F1720] p-5 cursor-pointer transition-all duration-300 hover:border-[#00FF9D]/40 relative overflow-hidden group"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  onClick={() => navigate('/administrator/products')}
                >
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <div className={`text-[10px] ${emeraldLabel}`}>Out of Stock</div>
                      <div className={`mt-1.5 text-xl font-bold ${emeraldKpi}`}>{formatNumber(typedMetrics.out_of_stock_products)}</div>
                      <div className={`mt-0.5 text-[9px] ${emeraldMeta}`}>Items to restock</div>
                    </div>
                    <div className={`h-7 w-7 rounded-lg ${emeraldIconWrap} flex items-center justify-center`}>
                      <Package className={`h-3.5 w-3.5 ${emeraldIcon}`} />
                    </div>
                  </div>
                  {/* Mini Sparkline */}
                  <div className="h-6 w-full mt-3 opacity-60 group-hover:opacity-100 transition-opacity">
                    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
                      <path d="M0,5 L20,25 L40,10 L60,20 L80,5 L100,15" fill="none" stroke="#00FF9D" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </div>
                </motion.div>

                <motion.div
                  className="rounded-2xl border border-white/[0.08] bg-[#0F1720] p-5 cursor-pointer transition-all duration-300 hover:border-[#00FF9D]/40 relative overflow-hidden group"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => navigate('/administrator/vendors')}
                >
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <div className={`text-[10px] ${emeraldLabel}`}>Vendor Approvals</div>
                      <div className={`mt-1.5 text-xl font-bold ${emeraldKpi}`}>{formatNumber(typedMetrics.pending_vendor_approvals)}</div>
                      <div className={`mt-0.5 text-[9px] ${emeraldMeta}`}>Applications pending</div>
                    </div>
                    <div className={`h-7 w-7 rounded-lg ${emeraldIconWrap} flex items-center justify-center`}>
                      <UserCheck className={`h-3.5 w-3.5 ${emeraldIcon}`} />
                    </div>
                  </div>
                  {/* Mini Sparkline */}
                  <div className="h-6 w-full mt-3 opacity-60 group-hover:opacity-100 transition-opacity">
                    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
                      <path d="M0,20 L25,5 L50,15 L75,5 L100,20" fill="none" stroke="#00FF9D" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </div>
                </motion.div>

                <motion.div
                  className="rounded-2xl border border-white/[0.08] bg-[#0F1720] p-5 cursor-pointer transition-all duration-300 hover:border-[#00FF9D]/40 relative overflow-hidden group"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  onClick={() => navigate('/administrator/transactions')}
                >
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <div className={`text-[10px] ${emeraldLabel}`}>Open Disputes</div>
                      <div className={`mt-1.5 text-xl font-bold ${emeraldKpi}`}>{formatNumber(typedMetrics.open_disputes)}</div>
                      <div className={`mt-0.5 text-[9px] ${emeraldMeta}`}>Requiring attention</div>
                    </div>
                    <div className={`h-7 w-7 rounded-lg ${emeraldIconWrap} flex items-center justify-center`}>
                      <AlertTriangle className={`h-3.5 w-3.5 ${emeraldIcon}`} />
                    </div>
                  </div>
                  {/* Mini Sparkline */}
                  <div className="h-6 w-full mt-3 opacity-60 group-hover:opacity-100 transition-opacity">
                    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
                      <path d="M0,10 L20,20 L40,5 L60,25 L80,10 L100,20" fill="none" stroke="#00FF9D" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </div>
                </motion.div>
              </div>

              {/* SECOND ROW of Additional Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {stats
                  .filter((item) => !['Total Users', 'Total Vendors', 'Total Sales', 'Pending Payouts', 'Completed Orders', 'Out of Stock', 'Pending Approvals'].includes(item.name))
                  .slice(0, 4)
                  .map((item, idx) => (
                    <motion.div
                      key={idx}
                      className="rounded-2xl border border-white/[0.08] bg-[#0F1720] p-5 cursor-pointer transition-all duration-300 hover:border-[#00FF9D]/40 relative overflow-hidden group"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + idx * 0.1 }}
                    >
                      <div className="flex justify-between items-start relative z-10">
                        <div>
                          <div className={`text-[10px] ${emeraldLabel}`}>{item.name}</div>
                          <div className={`mt-1.5 text-xl font-bold ${emeraldKpi}`}>{item.value}</div>
                          <div className={`mt-0.5 text-[9px] ${emeraldMeta}`}>{item.description}</div>
                        </div>
                        <div className={`h-7 w-7 rounded-lg ${emeraldIconWrap} flex items-center justify-center`}>
                          <item.icon className={`h-3.5 w-3.5 ${emeraldIcon}`} />
                        </div>
                      </div>
                      {/* Mini Sparkline Line */}
                      <div className="h-6 w-full mt-3 opacity-60 group-hover:opacity-100 transition-opacity">
                        <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
                          <path d="M0,15 L25,10 L50,22 L75,8 L100,15" fill="none" stroke="#00FF9D" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                        </svg>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>

            {/* BOTTOM ROW: Data Tables & Side Lists */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6 pb-4 sm:pb-6">
              {/* LEFT: Top Vendors */}
              <motion.div
                className="xl:col-span-8 flex flex-col"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0F1720] h-full">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(0,255,157,0.06),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                  <div className="p-6 flex items-center justify-between relative z-10 border-b border-white/[0.05]">
                    <div className="flex items-center gap-3">
                      <Database className={`w-[14px] h-[14px] ${emeraldIcon}`} />
                      <h2 className={`text-xs font-black uppercase tracking-[0.2em] ${emeraldKpi}`}>Top Asset performance</h2>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    {metricsQuery.isLoading ? (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin text-[#00FF9D] mr-3" />
                        <span className="text-[#6A827B] text-[10px] font-black uppercase tracking-widest">Compiling Data...</span>
                      </div>
                    ) : typedMetrics.top_vendors && typedMetrics.top_vendors.length > 0 ? (
                      typedMetrics.top_vendors.slice(0, 5).map((vendor, i) => (
                        <motion.div
                          key={vendor.id}
                          className="flex items-center justify-between p-4 rounded-xl border border-white/[0.04] bg-[#0c1214]/40 hover:bg-[#00FF9D]/[0.05] hover:border-[#00FF9D]/30 transition-all duration-300 group/vendor cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/20 flex items-center justify-center text-[#00FF9D] font-black text-xs shadow-inner">
                              {(vendor.name || 'V').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-white font-black text-[14px] group-hover/vendor:text-[#00FF9D] transition-colors">{vendor.name}</div>
                              <div className="text-[10px] font-bold text-[#6A827B] uppercase tracking-tighter">{formatNumber(vendor.sales)} Transactions</div>
                            </div>
                          </div>
                          <div>
                            <div className="text-white font-black text-[15px] tracking-tight text-right">{formatCurrency(Number(vendor.revenue))}</div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20">
                        <Database className="h-12 w-12 text-[#6A827B] mb-4 opacity-20" />
                        <p className="text-[#6A827B] text-[10px] font-black uppercase tracking-[0.2em]">No performance metrics available</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* RIGHT: Combined Users & Activity */}
              <motion.div
                className="xl:col-span-4 flex flex-col gap-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                {/* Recent Users List */}
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0F1720] p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className={`w-[14px] h-[14px] ${emeraldIcon}`} />
                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${emeraldKpi}`}>Recent Signups</h3>
                  </div>
                  <div className="space-y-3">
                    {typedMetrics.recent_users && typedMetrics.recent_users.length > 0 ? (
                      typedMetrics.recent_users.slice(0, 4).map((user: any, idx: number) => (
                        <div key={user.id || idx} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                          <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-[10px] font-bold">
                            {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold text-white truncate">{user.full_name || user.email}</div>
                            <div className="text-[9px] text-[#A0AAB2]">{user.email}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-[10px] text-[#A0AAB2]">No recent signups</div>
                    )}
                  </div>
                </div>

                {/* Activity Log */}
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0F1720] p-6 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Activity className={`w-[14px] h-[14px] ${emeraldIcon}`} />
                      <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${emeraldKpi}`}>Activity Log</h3>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {typedMetrics.recent_activities.length > 0 ? (
                      typedMetrics.recent_activities.slice(0, 4).map((a, idx) => (
                        <div key={a.id || idx} className="flex items-start gap-3">
                          <div className={`h-8 w-8 rounded-lg ${emeraldIconWrap} flex items-center justify-center flex-shrink-0`}>
                            {getActivityIcon(a.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold text-white truncate">{a.title}</div>
                            <div className="text-[9px] text-[#A0AAB2] line-clamp-1">{a.description}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-[10px] text-[#A0AAB2]">No signals detected</div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )
      }
    </div>
  );
};

export default Dashboard;