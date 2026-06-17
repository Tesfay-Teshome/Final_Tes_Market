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
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  Clock,
  CreditCard,
  Database,
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
  Users,
  TrendingUp,
  Eye,
  Settings,
  MoreVertical,
  DollarSign,
  Package as PackageIcon,
  Check,
  Verified,
  Award,
  Shield,
  Sparkles,
  Wallet,
  AlertOctagon,
  UserPlus,
  BoxIcon,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

/**
 * PREMIUM DARK LUXURY PALETTE (Matching Homepage)
 * Deep dark emerald with champagne gold accents
 */
const LUX = {
  // Backgrounds - Dark Emerald
  bgPrimary: '#04130E',
  bgSecondary: '#061A14',
  bgCard: 'linear-gradient(145deg, rgba(4, 19, 14, 0.95), rgba(5, 30, 22, 0.98))',
  bgCardHover: 'linear-gradient(145deg, rgba(6, 35, 26, 0.98), rgba(4, 19, 14, 0.95))',
  bgGlass: 'rgba(4, 19, 14, 0.85)',
  bgSidebar: 'linear-gradient(180deg, #02150F 0%, #04130E 50%, #031210 100%)',

  // Emerald tones - Darker shades
  emeraldDarkest: '#02150F',
  emeraldDeep: '#042A20',
  emerald: '#064E3B',
  emeraldSoft: '#065F46',
  emeraldGlow: '#00FFB2',
  emeraldMuted: '#145C4A',

  // Gold accents - Champagne gold (matching homepage)
  gold: '#C9A24B',
  goldSoft: '#E6CE91',
  goldGlow: '#FFD700',
  goldMuted: 'rgba(201, 162, 75, 0.12)',

  // Text
  textPrimary: '#F4F6F8',
  textSecondary: '#A8B5BE',
  textMuted: '#5A7A6D',

  // Borders
  border: 'rgba(0, 255, 178, 0.08)',
  borderHover: 'rgba(0, 255, 178, 0.2)',
  borderGold: 'rgba(201, 162, 75, 0.2)',

  // Gradients
  gradientHeader: 'linear-gradient(120deg, #04130E 0%, #052820 50%, #04130E 100%)',
  gradientCard: 'linear-gradient(145deg, rgba(0, 255, 178, 0.02) 0%, transparent 50%)',
  gradientGold: 'linear-gradient(135deg, #C9A24B 0%, #E6CE91 50%, #C9A24B 100%)',
};

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
  buyer?: { id?: string; email?: string; full_name?: string };
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
  total_users: number;
  new_users_today: number;
  active_users: number;
  user_growth: number;
  total_vendors: number;
  pending_vendor_approvals: number;
  active_vendors: number;
  vendor_growth: number;
  total_products: number;
  pending_product_approvals: number;
  out_of_stock_products: number;
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  order_growth: number;
  total_sales: number;
  platform_revenue: number;
  pending_payouts: number;
  pending_payout_amount: number;
  pending_payouts_count: number;
  revenue_growth: number;
  conversion_rate: number;
  conversion_rate_change: number;
  average_order_value: number;
  aov_change: number;
  refund_requests: number;
  open_disputes: number;
  recent_activities: ActivityItem[];
  recent_users: Array<{ id: string; email: string; full_name?: string; date_joined: string }>;
  sales_over_time: Array<{ date: string; value: number }>;
  top_products: Array<{ id: string; name: string; sales: number; revenue: number }>;
  top_vendors: Array<{ id: string; name: string; sales: number; revenue: number }>;
  system_status: { database: SystemStatus; api: SystemStatus; storage: SystemStatus; last_checked: string };
}

const formatNumber = (value: number | undefined): string => (value || 0).toLocaleString();

const formatCurrency = (value: number | undefined): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

const Dashboard = () => {
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

  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  const showToast = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
    const toastEl = document.createElement('div');
    toastEl.className = `fixed top-4 right-4 p-4 rounded-2xl border backdrop-blur-xl z-50 ${variant === 'destructive' ? 'border-red-500/30 bg-red-900/20' : 'border-emerald-500/30 bg-emerald-900/20'}`;
    toastEl.innerHTML = `<h4 class="font-semibold text-white">${title}</h4><p class="text-sm text-gray-400">${description}</p>`;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
  };

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
    conversion_rate: 0,
    conversion_rate_change: 0,
    average_order_value: 0,
    aov_change: 0,
    refund_requests: 0,
    open_disputes: 0,
    recent_activities: [],
    recent_users: [],
    sales_over_time: [],
    top_products: [],
    top_vendors: [],
    system_status: { database: 'online', api: 'online', storage: 'online', last_checked: new Date().toISOString() },
  };

  const metricsQuery = useQuery({
    queryKey: ['admin-metrics', getDashboardRangeParam()],
    queryFn: async () => {
      const response = await adminAPI.getMetrics({ range: getDashboardRangeParam(), group_by: 'day' });
      return response.data || {};
    },
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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

  const pendingPayoutAmount = financialMetrics?.pending_payout_amount ?? (legacyResponse as any)?.pending_payout_amount ?? undefined;
  const pendingPayoutCount = financialMetrics?.pending_payouts_count ?? financialMetrics?.pending_payouts ?? (legacyResponse as any)?.pending_payouts ?? 0;

  const typedMetrics: DashboardMetrics = {
    ...defaultMetrics,
    total_users: Number(userMetrics?.total_users ?? (legacyResponse as any)?.total_users ?? (metricsResponse as any)?.total_users ?? 0),
    new_users_today: Number(userMetrics?.new_users_today ?? (legacyResponse as any)?.new_users_today ?? 0),
    active_users: Number(userMetrics?.active_users ?? (legacyResponse as any)?.active_users ?? 0),
    user_growth: Number(userMetrics?.user_growth ?? (legacyResponse as any)?.user_growth ?? 0),
    total_vendors: Number(vendorMetrics?.total_vendors ?? (legacyResponse as any)?.total_vendors ?? (metricsResponse as any)?.total_vendors ?? 0),
    pending_vendor_approvals: Number(vendorMetrics?.pending_vendor_approvals ?? (legacyResponse as any)?.pending_vendor_approvals ?? (legacyResponse as any)?.pending_approvals ?? 0),
    active_vendors: Number(vendorMetrics?.active_vendors ?? (legacyResponse as any)?.active_vendors ?? 0),
    vendor_growth: Number(vendorMetrics?.vendor_growth ?? (legacyResponse as any)?.vendor_growth ?? 0),
    total_products: Number(productMetrics?.total_products ?? (legacyResponse as any)?.total_products ?? (metricsResponse as any)?.total_products ?? 0),
    pending_product_approvals: Number(productMetrics?.pending_product_approvals ?? (legacyResponse as any)?.pending_product_approvals ?? (legacyResponse as any)?.pending_approvals ?? 0),
    out_of_stock_products: Number(productMetrics?.out_of_stock_products ?? (legacyResponse as any)?.out_of_stock_products ?? 0),
    total_orders: Number(orderMetrics?.total_orders ?? (legacyResponse as any)?.total_orders ?? (metricsResponse as any)?.total_orders ?? 0),
    pending_orders: Number(orderMetrics?.pending_orders ?? (legacyResponse as any)?.pending_orders ?? 0),
    completed_orders: Number(orderMetrics?.completed_orders ?? (legacyResponse as any)?.completed_orders ?? 0),
    cancelled_orders: Number(orderMetrics?.cancelled_orders ?? (legacyResponse as any)?.cancelled_orders ?? 0),
    order_growth: Number(orderMetrics?.order_growth ?? (legacyResponse as any)?.order_growth ?? 0),
    total_sales: parseFloat(String(financialMetrics?.total_sales ?? (legacyResponse as any)?.total_sales ?? (metricsResponse as any)?.total_sales ?? financialMetrics?.revenue ?? (legacyResponse as any)?.revenue ?? '0')),
    platform_revenue: parseFloat(String(financialMetrics?.platform_revenue ?? (legacyResponse as any)?.platform_revenue ?? (legacyResponse as any)?.total_commission ?? (metricsResponse as any)?.platform_revenue ?? '0')),
    pending_payout_amount: parseFloat(String(pendingPayoutAmount ?? 0)),
    pending_payouts_count: Number(pendingPayoutCount ?? 0),
    pending_payouts: parseFloat(String(pendingPayoutAmount ?? 0)),
    revenue_growth: parseFloat(String(financialMetrics?.revenue_growth ?? (legacyResponse as any)?.revenue_growth ?? '0')),
    conversion_rate: parseFloat(String(performanceMetrics?.conversion_rate ?? (legacyResponse as any)?.conversion_rate ?? '0')),
    conversion_rate_change: parseFloat(String(performanceMetrics?.conversion_rate_change ?? (legacyResponse as any)?.conversion_rate_change ?? '0')),
    average_order_value: parseFloat(String(financialMetrics?.average_order_value ?? performanceMetrics?.average_order_value ?? (legacyResponse as any)?.average_order_value ?? '0')),
    aov_change: parseFloat(String(financialMetrics?.aov_change ?? performanceMetrics?.aov_change ?? (legacyResponse as any)?.aov_change ?? '0')),
    refund_requests: Number(systemMetrics?.refund_requests ?? (legacyResponse as any)?.refund_requests ?? 0),
    open_disputes: Number(systemMetrics?.open_disputes ?? (legacyResponse as any)?.open_disputes ?? 0),
    recent_activities: Array.isArray(v2Lists?.recent_activities) ? v2Lists.recent_activities : Array.isArray((legacyResponse as any)?.recent_activities) ? (legacyResponse as any).recent_activities : Array.isArray((legacyResponse as any)?.activities) ? (legacyResponse as any).activities : Array.isArray((metricsResponse as any)?.recent_activities) ? (metricsResponse as any).recent_activities : [],
    recent_users: Array.isArray(v2Lists?.recent_users) ? v2Lists.recent_users : Array.isArray((legacyResponse as any)?.recent_users) ? (legacyResponse as any).recent_users : Array.isArray((legacyResponse as any)?.users) ? (legacyResponse as any).users : Array.isArray((metricsResponse as any)?.recent_users) ? (metricsResponse as any).recent_users : [],
    sales_over_time: Array.isArray(v2Charts?.sales_over_time) ? v2Charts.sales_over_time : Array.isArray((legacyResponse as any)?.sales_over_time) ? (legacyResponse as any).sales_over_time : (legacyResponse as any)?.sales_data || [],
    top_products: Array.isArray(v2Lists?.top_products) ? v2Lists.top_products : Array.isArray((legacyResponse as any)?.top_products) ? (legacyResponse as any).top_products : (legacyResponse as any)?.popular_products || [],
    top_vendors: Array.isArray(v2Lists?.top_vendors) ? v2Lists.top_vendors : Array.isArray((legacyResponse as any)?.top_vendors) ? (legacyResponse as any).top_vendors : (legacyResponse as any)?.popular_vendors || [],
    system_status: (metricsResponse as any)?.system_status || (legacyResponse as any)?.system_status || { database: (legacyResponse as any)?.database_status || 'online', api: (legacyResponse as any)?.api_status || 'online', storage: (legacyResponse as any)?.storage_status || 'online', last_checked: (legacyResponse as any)?.last_status_check || new Date().toISOString() },
  };

  const recentOrders: AdminDashboardRecentOrder[] = (() => {
    const orders = Array.isArray((transactionsQuery.data as any)?.results) ? (transactionsQuery.data as any).results : Array.isArray(transactionsQuery.data) ? transactionsQuery.data : [];
    return orders.map((order: any) => ({
      id: order.id,
      status: order.status,
      total_amount: order.total_amount || 0,
      created_at: order.created_at,
      buyer: order.customer || order.user || order.buyer,
      link: `/administrator/orders/${order.id}`,
    }));
  })();

  const getStatusColor = (status: SystemStatus) => {
    switch (status) {
      case 'online':
        return LUX.emeraldGlow;
      case 'degraded':
        return LUX.gold;
      case 'offline':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const systemStatus: AdminDashboardHealth = {
    ...{ api: 'online' as const, database: 'online' as const, storage: 'online' as const, last_checked: new Date().toISOString() },
    ...(typedMetrics.system_status || {}),
    ...((healthQuery.data as any) || {}),
  };

  const systemStatusItems = [
    { name: 'API', status: systemStatus.api, icon: Server },
    { name: 'Database', status: systemStatus.database, icon: Database },
    { name: 'Storage', status: systemStatus.storage, icon: HardDrive },
  ];

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: LUX.bgPrimary }}>
        <motion.div
          className="text-center p-10 rounded-3xl border max-w-md mx-4"
          style={{
            background: LUX.bgCard,
            borderColor: LUX.border,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(220,38,38,0.1)' }}
          >
            <AlertTriangle className="w-8 h-8" style={{ color: '#ef4444' }} />
          </div>
          <h2 className="text-2xl font-serif font-bold mb-2" style={{ color: LUX.textPrimary }}>
            Something went wrong
          </h2>
          <p className="mb-6" style={{ color: LUX.textSecondary }}>
            We couldn't load the dashboard data. Please try again.
          </p>
          <button
            onClick={() => refetch()}
            className="px-7 py-3 rounded-xl font-semibold text-sm tracking-wide transition-all shadow-lg"
            style={{ background: LUX.gradientGold, color: LUX.emeraldDarkest }}
          >
            <RefreshCcw className="mr-2 h-4 w-4 inline" /> Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ background: LUX.bgPrimary }}>
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{ background: `radial-gradient(circle, ${LUX.emeraldGlow}, transparent 70%)` }}
        />
        <div
          className="absolute bottom-1/4 right-0 w-[500px] h-[500px] rounded-full opacity-[0.02]"
          style={{ background: `radial-gradient(circle, ${LUX.gold}, transparent 70%)` }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.015]"
          style={{ background: `radial-gradient(ellipse at center, ${LUX.emerald}, transparent 60%)` }}
        />
      </div>

      {/* LUXURY HEADER */}
      <section className="relative overflow-hidden pt-6 pb-4">
        <div className="absolute inset-0" style={{ background: LUX.gradientHeader }} />
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{ background: `radial-gradient(80% 60% at 90% 10%, rgba(201,162,75,0.08), transparent 50%)` }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)` }}
        />

        <div className="relative max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{ background: LUX.gradientGold, boxShadow: '0 0 20px rgba(201,162,75,0.3)' }}
                >
                  <Sparkles className="h-4 w-4" style={{ color: LUX.emeraldDarkest }} />
                </div>
                <span
                  className="text-[10px] font-semibold tracking-[0.28em] uppercase"
                  style={{ color: LUX.goldSoft }}
                >
                  Administration Hub
                </span>
              </div>
              <h1
                className="font-serif text-2xl md:text-3xl font-semibold tracking-tight"
                style={{ color: LUX.textPrimary }}
              >
                Dashboard Overview
              </h1>
              <p className="mt-1 text-sm" style={{ color: LUX.textSecondary }}>
                Monitor your platform performance in real-time
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex items-center gap-3"
            >
              {/* System Status Pills */}
              <div className="hidden lg:flex items-center gap-2">
                {systemStatusItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border"
                    style={{ background: LUX.bgGlass, borderColor: LUX.border }}
                  >
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ background: getStatusColor(item.status), boxShadow: `0 0 8px ${getStatusColor(item.status)}` }}
                    />
                    <span className="text-[10px] font-medium" style={{ color: LUX.textSecondary }}>
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all border backdrop-blur-md disabled:opacity-50"
                style={{ background: LUX.bgGlass, borderColor: LUX.border, color: LUX.goldSoft }}
              >
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <Link
                to="/administrator/settings"
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all border backdrop-blur-md"
                style={{ background: LUX.bgGlass, borderColor: LUX.border, color: LUX.goldSoft }}
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {isLoading && (
        <div className="flex h-60 w-full items-center justify-center" style={{ background: LUX.bgPrimary }}>
          <div className="flex flex-col items-center">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ background: LUX.emeraldGlow }}
              />
              <Loader2 className="h-10 w-10 animate-spin relative" style={{ color: LUX.emeraldGlow }} />
            </div>
            <span className="mt-6 text-sm font-medium" style={{ color: LUX.textSecondary }}>
              Loading metrics...
            </span>
          </div>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="relative max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

          {/* ROW 1 - PRIMARY REVENUE & ORDERS (4 cards, landscape - wider) */}
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Total Revenue */}
              <motion.div
                className="group relative rounded-xl p-4 overflow-hidden cursor-pointer transition-all duration-500"
                style={{
                  background: LUX.bgCard,
                  border: `1px solid ${LUX.border}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.02)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                whileHover={{ y: -4, boxShadow: `0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px ${LUX.borderHover}` }}
                onClick={() => navigate('/administrator/transactions')}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: LUX.goldSoft }}>
                      Total Revenue
                    </span>
                    <div className="mt-1.5 text-xl font-bold tracking-tight font-serif" style={{ color: LUX.textPrimary }}>
                      {formatCurrency(typedMetrics.total_sales)}
                    </div>
                  </div>
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`,
                      boxShadow: `0 8px 24px -8px ${LUX.emerald}`,
                    }}
                  >
                    <DollarSign className="h-4 w-4" style={{ color: LUX.goldSoft }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded"
                    style={{
                      background: 'rgba(0,229,168,0.1)',
                      color: LUX.emeraldGlow,
                      border: '1px solid rgba(0,229,168,0.2)',
                    }}
                  >
                    <TrendingUp className="h-2.5 w-2.5" />
                    +{(typedMetrics.revenue_growth || 18.2).toFixed(1)}%
                  </div>
                  <svg viewBox="0 0 80 24" className="w-16 h-6 opacity-60">
                    <path d="M0,20 L12,14 L24,22 L36,10 L48,16 L60,6 L72,12 L80,4" fill="none" stroke={LUX.emeraldGlow} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
              </motion.div>

              {/* Platform Revenue */}
              <motion.div
                className="group relative rounded-xl p-4 overflow-hidden cursor-pointer transition-all duration-500"
                style={{
                  background: LUX.bgCard,
                  border: `1px solid ${LUX.border}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                whileHover={{ y: -4, boxShadow: `0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px ${LUX.borderHover}` }}
                onClick={() => navigate('/administrator/transactions')}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: LUX.goldSoft }}>
                      Platform Revenue
                    </span>
                    <div className="mt-1.5 text-xl font-bold tracking-tight font-serif" style={{ color: LUX.textPrimary }}>
                      {formatCurrency(typedMetrics.platform_revenue)}
                    </div>
                  </div>
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: LUX.gradientGold, boxShadow: '0 8px 24px rgba(201,162,75,0.25)' }}
                  >
                    <Award className="h-4 w-4" style={{ color: LUX.emeraldDarkest }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded"
                    style={{ background: LUX.goldMuted, color: LUX.goldSoft, border: `1px solid ${LUX.borderGold}` }}
                  >
                    <TrendingUp className="h-2.5 w-2.5" />
                    +{(typedMetrics.revenue_growth || 12.5).toFixed(1)}%
                  </div>
                  <svg viewBox="0 0 80 24" className="w-16 h-6 opacity-60">
                    <path d="M0,18 L16,20 L32,10 L48,14 L64,5 L80,10" fill="none" stroke={LUX.gold} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
              </motion.div>

              {/* Total Orders */}
              <motion.div
                className="group relative rounded-xl p-4 overflow-hidden cursor-pointer transition-all duration-500"
                style={{
                  background: LUX.bgCard,
                  border: `1px solid ${LUX.border}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                whileHover={{ y: -4, boxShadow: `0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px ${LUX.borderHover}` }}
                onClick={() => navigate('/administrator/orders')}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: LUX.goldSoft }}>
                      Total Orders
                    </span>
                    <div className="mt-1.5 text-xl font-bold tracking-tight font-serif" style={{ color: LUX.textPrimary }}>
                      {formatNumber(typedMetrics.total_orders || 0)}
                    </div>
                  </div>
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', boxShadow: '0 8px 24px rgba(139,92,246,0.25)' }}
                  >
                    <ShoppingCart className="h-4 w-4" style={{ color: '#FDE68A' }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded"
                    style={{ background: 'rgba(139,92,246,0.1)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.2)' }}
                  >
                    <TrendingUp className="h-2.5 w-2.5" />
                    +{(typedMetrics.order_growth || 9.1).toFixed(1)}%
                  </div>
                  <svg viewBox="0 0 80 24" className="w-16 h-6 opacity-60">
                    <path d="M0,15 L20,10 L40,18 L60,6 L80,12" fill="none" stroke="#8B5CF6" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
              </motion.div>

              {/* Avg. Order Value */}
              <motion.div
                className="group relative rounded-xl p-4 overflow-hidden cursor-pointer transition-all duration-500"
                style={{
                  background: LUX.bgCard,
                  border: `1px solid ${LUX.border}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                whileHover={{ y: -4, boxShadow: `0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px ${LUX.borderHover}` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: LUX.goldSoft }}>
                      Avg. Order Value
                    </span>
                    <div className="mt-1.5 text-xl font-bold tracking-tight font-serif" style={{ color: LUX.textPrimary }}>
                      {formatCurrency(typedMetrics.average_order_value || 97.75)}
                    </div>
                  </div>
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`,
                    }}
                  >
                    <BarChart2 className="h-4 w-4" style={{ color: LUX.goldSoft }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded"
                    style={{
                      background: 'rgba(0,229,168,0.1)',
                      color: LUX.emeraldGlow,
                      border: '1px solid rgba(0,229,168,0.2)',
                    }}
                  >
                    <TrendingUp className="h-2.5 w-2.5" />
                    +{(typedMetrics.aov_change || 0).toFixed(1)}%
                  </div>
                  <div className="flex items-end gap-0.5 h-5 opacity-70">
                    {[35, 55, 40, 70, 50].map((h, i) => (
                      <div
                        key={i}
                        className="w-1.5 rounded-t"
                        style={{ height: `${h}%`, background: i === 3 ? LUX.emeraldGlow : 'rgba(0,229,168,0.3)' }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ROW 2 - SECONDARY METRICS (6 cards, landscape) */}
          <section>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Pending Approvals */}
              <motion.div
                className="group relative rounded-xl p-4 overflow-hidden cursor-pointer transition-all duration-500"
                style={{
                  background: LUX.bgCard,
                  border: `1px solid ${LUX.border}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                whileHover={{ y: -4, boxShadow: `0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px ${LUX.borderHover}` }}
                onClick={() => navigate('/administrator/vendors?status=pending')}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: LUX.goldSoft }}>
                      Pending
                    </span>
                    <div className="mt-1.5 text-xl font-bold tracking-tight font-serif" style={{ color: LUX.textPrimary }}>
                      {formatNumber(typedMetrics.pending_vendor_approvals)}
                    </div>
                  </div>
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(201,162,75,0.1)' }}
                  >
                    <Clock className="h-4 w-4" style={{ color: LUX.gold }} />
                  </div>
                </div>
                <div className="text-[10px]" style={{ color: LUX.textMuted }}>
                  Vendor approvals
                </div>
              </motion.div>

              {/* Vendors */}
              <motion.div
                className="group relative rounded-xl p-4 overflow-hidden cursor-pointer transition-all duration-500"
                style={{
                  background: LUX.bgCard,
                  border: `1px solid ${LUX.border}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                whileHover={{ y: -4, boxShadow: `0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px ${LUX.borderHover}` }}
                onClick={() => navigate('/administrator/vendors')}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: LUX.goldSoft }}>
                      Vendors
                    </span>
                    <div className="mt-1.5 text-xl font-bold tracking-tight font-serif" style={{ color: LUX.textPrimary }}>
                      {formatNumber(typedMetrics.total_vendors)}
                    </div>
                  </div>
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: LUX.goldMuted }}
                  >
                    <Store className="h-4 w-4" style={{ color: LUX.gold }} />
                  </div>
                </div>
                <div className="text-[10px]" style={{ color: LUX.textMuted }}>
                  {formatNumber(typedMetrics.active_vendors)} active
                </div>
              </motion.div>

              {/* Products */}
              <motion.div
                className="group relative rounded-xl p-4 overflow-hidden cursor-pointer transition-all duration-500"
                style={{
                  background: LUX.bgCard,
                  border: `1px solid ${LUX.border}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                whileHover={{ y: -4, boxShadow: `0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px ${LUX.borderHover}` }}
                onClick={() => navigate('/administrator/products')}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: LUX.goldSoft }}>
                      Products
                    </span>
                    <div className="mt-1.5 text-xl font-bold tracking-tight font-serif" style={{ color: LUX.textPrimary }}>
                      {formatNumber(typedMetrics.total_products)}
                    </div>
                  </div>
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: LUX.goldMuted }}
                  >
                    <Package className="h-4 w-4" style={{ color: LUX.gold }} />
                  </div>
                </div>
                <div className="text-[10px]" style={{ color: LUX.textMuted }}>
                  {formatNumber(typedMetrics.out_of_stock_products)} out of stock
                </div>
              </motion.div>

              {/* Completed Orders */}
              <motion.div
                className="group relative rounded-xl p-4 overflow-hidden cursor-pointer transition-all duration-500"
                style={{
                  background: LUX.bgCard,
                  border: `1px solid ${LUX.border}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                whileHover={{ y: -4, boxShadow: `0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px ${LUX.borderHover}` }}
                onClick={() => navigate('/administrator/orders?status=completed')}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: LUX.goldSoft }}>
                      Completed
                    </span>
                    <div className="mt-1.5 text-xl font-bold tracking-tight font-serif" style={{ color: LUX.textPrimary }}>
                      {formatNumber(typedMetrics.completed_orders)}
                    </div>
                  </div>
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(0,229,168,0.1)' }}
                  >
                    <CheckCircle2 className="h-4 w-4" style={{ color: LUX.emeraldGlow }} />
                  </div>
                </div>
                <div className="text-[10px]" style={{ color: LUX.textMuted }}>
                  Orders delivered
                </div>
              </motion.div>

              {/* Pending Approvals */}
              <motion.div
                className="group relative rounded-xl p-4 overflow-hidden cursor-pointer transition-all duration-500"
                style={{
                  background: LUX.bgCard,
                  border: `1px solid ${LUX.border}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.55 }}
                whileHover={{ y: -4, boxShadow: `0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px ${LUX.borderHover}` }}
                onClick={() => navigate('/administrator/vendors?status=pending')}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: LUX.goldSoft }}>
                      Pending
                    </span>
                    <div className="mt-1.5 text-xl font-bold tracking-tight font-serif" style={{ color: LUX.textPrimary }}>
                      {formatNumber(typedMetrics.pending_vendor_approvals)}
                    </div>
                  </div>
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(201,162,75,0.1)' }}
                  >
                    <Clock className="h-4 w-4" style={{ color: LUX.gold }} />
                  </div>
                </div>
                <div className="text-[10px]" style={{ color: LUX.textMuted }}>
                  Vendor approvals
                </div>
              </motion.div>

              {/* Disputes */}
              <motion.div
                className="group relative rounded-xl p-4 overflow-hidden cursor-pointer transition-all duration-500"
                style={{
                  background: LUX.bgCard,
                  border: `1px solid ${LUX.border}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                whileHover={{ y: -4, boxShadow: `0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px ${LUX.borderHover}` }}
                onClick={() => navigate('/administrator/disputes')}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: '#f87171' }}>
                      Disputes
                    </span>
                    <div className="mt-1.5 text-xl font-bold tracking-tight font-serif" style={{ color: LUX.textPrimary }}>
                      {formatNumber(typedMetrics.open_disputes)}
                    </div>
                  </div>
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(239,68,68,0.1)' }}
                  >
                    <AlertTriangle className="h-4 w-4" style={{ color: '#ef4444' }} />
                  </div>
                </div>
                <div className="text-[10px]" style={{ color: LUX.textMuted }}>
                  Needs attention
                </div>
              </motion.div>
            </div>
          </section>

          {/* CHART + PERFORMANCE */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Sales Chart */}
            <motion.div
              className="lg:col-span-2 rounded-2xl p-5 backdrop-blur-xl border transition-all duration-500"
              style={{
                background: LUX.bgCard,
                borderColor: LUX.border,
                boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4" style={{ color: LUX.gold }} />
                    <span
                      className="text-[10px] font-semibold tracking-[0.24em] uppercase"
                      style={{ color: LUX.goldSoft }}
                    >
                      Sales Analytics
                    </span>
                  </div>
                  <h3 className="font-serif text-lg font-semibold" style={{ color: LUX.textPrimary }}>
                    Revenue Over Time
                  </h3>
                </div>
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-px border-t-2 border-dashed" style={{ borderColor: LUX.gold }} />
                    <span className="text-[10px]" style={{ color: LUX.textMuted }}>
                      Previous
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: LUX.emeraldGlow, boxShadow: `0 0 10px ${LUX.emeraldGlow}` }}
                    />
                    <span className="text-[10px] font-semibold" style={{ color: LUX.textPrimary }}>
                      Current
                    </span>
                  </div>
                </div>
              </div>

              <div className="min-h-[260px]">
                <PremiumChart
                  data={{
                    labels: typedMetrics.sales_over_time?.map((i) => new Date(i.date).toLocaleDateString()) || [],
                    datasets: [
                      {
                        label: 'Previous',
                        data: typedMetrics.sales_over_time?.map((i) => Number(i.value) * 0.8) || [],
                        borderColor: LUX.gold,
                        backgroundColor: 'transparent',
                        borderDash: [5, 5],
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.4,
                      },
                      {
                        label: 'Current',
                        data: typedMetrics.sales_over_time?.map((i) => Number(i.value)) || [],
                        borderColor: LUX.emeraldGlow,
                        backgroundColor: (context: any) => {
                          const ctx = context.chart.ctx;
                          const gradient = ctx.createLinearGradient(0, 0, 0, 260);
                          gradient.addColorStop(0, 'rgba(0,255,178,0.3)');
                          gradient.addColorStop(1, 'rgba(0,255,178,0)');
                          return gradient;
                        },
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: LUX.emeraldGlow,
                        pointHoverBorderColor: '#fff',
                        fill: true,
                        yAxisID: 'y',
                      },
                    ],
                  }}
                  height={260}
                  showLegend={false}
                  theme="dark"
                />
              </div>
            </motion.div>

            {/* Performance Panel */}
            <motion.div className="space-y-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }}>
              {/* Platform Health */}
              <div
                className="rounded-2xl p-5 backdrop-blur-xl border"
                style={{ background: LUX.bgCard, borderColor: LUX.border, boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                    style={{ background: LUX.gradientGold }}
                  >
                    <TrendingUp className="h-4 w-4" style={{ color: LUX.emeraldDarkest }} />
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold tracking-[0.2em] uppercase" style={{ color: LUX.goldSoft }}>
                      Platform Health
                    </span>
                    <h3 className="font-serif text-sm font-semibold" style={{ color: LUX.textPrimary }}>
                      Performance
                    </h3>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      label: 'Total Users',
                      value: formatNumber(typedMetrics.total_users),
                      pct: 85,
                      color: LUX.emeraldGlow,
                    },
                    {
                      label: 'Active Vendors',
                      value: formatNumber(typedMetrics.active_vendors),
                      pct: 65,
                      color: LUX.gold,
                    },
                    {
                      label: 'Active Products',
                      value: formatNumber(typedMetrics.total_products - typedMetrics.out_of_stock_products),
                      pct: 92,
                      color: LUX.emeraldGlow,
                    },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs font-medium mb-2">
                        <span style={{ color: LUX.textMuted }}>{item.label}</span>
                        <span style={{ color: LUX.textPrimary }}>{item.value}</span>
                      </div>
                      <div className="w-full rounded-full h-[5px]" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${item.pct}%`, background: item.color, boxShadow: `0 0 10px ${item.color}40` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Feed */}
              <div
                className="rounded-2xl p-5 border border-dashed backdrop-blur-xl"
                style={{ background: LUX.bgCard, borderColor: LUX.borderGold }}
              >
                <div className="text-center">
                  <span className="text-[9px] font-bold tracking-[0.28em] uppercase" style={{ color: LUX.goldSoft }}>
                    Live Feed
                  </span>

                  {recentOrders.length > 0 ? (
                    <>
                      <div className="mt-4 text-[11px]" style={{ color: LUX.textMuted }}>
                        New order from {recentOrders[0].buyer?.full_name?.split(' ')[0] || 'Customer'}
                      </div>
                      <div className="mt-2 text-2xl font-bold font-serif" style={{ color: LUX.emeraldGlow }}>
                        +{formatCurrency(Number(recentOrders[0].total_amount) || 0)}
                      </div>
                      <div
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider"
                        style={{
                          background: 'rgba(0,229,168,0.1)',
                          color: LUX.emeraldGlow,
                          border: '1px solid rgba(0,229,168,0.2)',
                        }}
                      >
                        <Check className="h-3 w-3" /> Order Processed
                      </div>
                    </>
                  ) : (
                    <div className="mt-4 flex flex-col items-center">
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(201,162,75,0.1)' }}
                      >
                        <Loader2 className="h-5 w-5 animate-spin" style={{ color: LUX.gold }} />
                      </div>
                      <div className="mt-3 text-[10px] font-bold tracking-widest uppercase" style={{ color: LUX.gold }}>
                        Listening...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </section>

          {/* ROW 3 - ADDITIONAL METRICS + NEW CUSTOMERS (Below Chart) */}
          <section>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Pending Payouts */}
              <motion.div
                className="group relative rounded-xl p-4 overflow-hidden cursor-pointer transition-all duration-500"
                style={{
                  background: LUX.bgCard,
                  border: `1px solid ${LUX.border}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.65 }}
                whileHover={{ y: -4, boxShadow: `0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px ${LUX.borderHover}` }}
                onClick={() => navigate('/administrator/payouts')}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: LUX.goldSoft }}>
                      Pending Payouts
                    </span>
                    <div className="mt-1.5 text-xl font-bold tracking-tight font-serif" style={{ color: LUX.textPrimary }}>
                      {formatCurrency(typedMetrics.pending_payout_amount || 0)}
                    </div>
                  </div>
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: LUX.goldMuted }}
                  >
                    <Wallet className="h-4 w-4" style={{ color: LUX.gold }} />
                  </div>
                </div>
                <div className="text-[10px]" style={{ color: LUX.textMuted }}>
                  {formatNumber(typedMetrics.pending_payouts_count || 0)} pending
                </div>
              </motion.div>

              {/* New Customers */}
              <motion.div
                className="group relative rounded-xl p-4 overflow-hidden cursor-pointer transition-all duration-500"
                style={{
                  background: LUX.bgCard,
                  border: `1px solid ${LUX.border}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                whileHover={{ y: -4, boxShadow: `0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px ${LUX.borderHover}` }}
                onClick={() => navigate('/administrator/users')}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: LUX.goldSoft }}>
                      New Customers
                    </span>
                    <div className="mt-1.5 text-xl font-bold tracking-tight font-serif" style={{ color: LUX.textPrimary }}>
                      {formatNumber(typedMetrics.new_users_today || 0)}
                    </div>
                  </div>
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: LUX.goldMuted }}
                  >
                    <UserPlus className="h-4 w-4" style={{ color: LUX.gold }} />
                  </div>
                </div>
                <div className="text-[10px]" style={{ color: LUX.textMuted }}>
                  Today
                </div>
              </motion.div>

              {/* Out of Stock */}
              <motion.div
                className="group relative rounded-xl p-4 overflow-hidden cursor-pointer transition-all duration-500"
                style={{
                  background: LUX.bgCard,
                  border: `1px solid ${LUX.border}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.75 }}
                whileHover={{ y: -4, boxShadow: `0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px ${LUX.borderHover}` }}
                onClick={() => navigate('/administrator/products')}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: '#f87171' }}>
                      Out of Stock
                    </span>
                    <div className="mt-1.5 text-xl font-bold tracking-tight font-serif" style={{ color: LUX.textPrimary }}>
                      {formatNumber(typedMetrics.out_of_stock_products)}
                    </div>
                  </div>
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(239,68,68,0.1)' }}
                  >
                    <BoxIcon className="h-4 w-4" style={{ color: '#ef4444' }} />
                  </div>
                </div>
                <div className="text-[10px]" style={{ color: LUX.textMuted }}>
                  Items to restock
                </div>
              </motion.div>

              {/* Vendor Approvals */}
              <motion.div
                className="group relative rounded-xl p-4 overflow-hidden cursor-pointer transition-all duration-500"
                style={{
                  background: LUX.bgCard,
                  border: `1px solid ${LUX.border}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                whileHover={{ y: -4, boxShadow: `0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px ${LUX.borderHover}` }}
                onClick={() => navigate('/administrator/vendors')}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: LUX.goldSoft }}>
                      Vendor Approvals
                    </span>
                    <div className="mt-1.5 text-xl font-bold tracking-tight font-serif" style={{ color: LUX.textPrimary }}>
                      {formatNumber(typedMetrics.pending_vendor_approvals)}
                    </div>
                  </div>
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: LUX.goldMuted }}
                  >
                    <UserCheck className="h-4 w-4" style={{ color: LUX.gold }} />
                  </div>
                </div>
                <div className="text-[10px]" style={{ color: LUX.textMuted }}>
                  Pending applications
                </div>
              </motion.div>

              {/* Refund Requests */}
              <motion.div
                className="group relative rounded-xl p-4 overflow-hidden cursor-pointer transition-all duration-500"
                style={{
                  background: LUX.bgCard,
                  border: `1px solid ${LUX.border}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.85 }}
                whileHover={{ y: -4, boxShadow: `0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px ${LUX.borderHover}` }}
                onClick={() => navigate('/administrator/refunds')}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: LUX.goldSoft }}>
                      Refund Requests
                    </span>
                    <div className="mt-1.5 text-xl font-bold tracking-tight font-serif" style={{ color: LUX.textPrimary }}>
                      {formatNumber(typedMetrics.refund_requests)}
                    </div>
                  </div>
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(251,146,60,0.1)' }}
                  >
                    <RefreshCcw className="h-4 w-4" style={{ color: '#fb923c' }} />
                  </div>
                </div>
                <div className="text-[10px]" style={{ color: LUX.textMuted }}>
                  Pending refunds
                </div>
              </motion.div>
            </div>
          </section>

          {/* TRANSACTION STREAM */}
          <section>
            <motion.div
              className="rounded-2xl overflow-hidden backdrop-blur-xl border"
              style={{ background: LUX.bgCard, borderColor: LUX.border, boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.75 }}
            >
              <div
                className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b"
                style={{ borderColor: LUX.border }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-2 w-2 rounded-full animate-pulse"
                    style={{ background: LUX.emeraldGlow, boxShadow: `0 0 12px ${LUX.emeraldGlow}` }}
                  />
                  <div>
                    <span className="text-[9px] font-semibold tracking-[0.2em] uppercase" style={{ color: LUX.goldSoft }}>
                      Real-time
                    </span>
                    <h3 className="font-serif text-lg font-semibold" style={{ color: LUX.textPrimary }}>
                      Transaction Stream
                    </h3>
                  </div>
                </div>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all border"
                  style={{ background: 'rgba(201,162,75,0.1)', borderColor: LUX.borderGold, color: LUX.goldSoft }}
                  onClick={() => navigate('/administrator/orders')}
                >
                  View All <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="p-4 space-y-2">
                {recentOrders.length > 0 ? (
                  recentOrders.slice(0, 6).map((order, i) => (
                    <motion.div
                      key={order.id || i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-300"
                      style={{
                        background: i === 0 ? 'linear-gradient(90deg, rgba(0,229,168,0.08), transparent)' : 'rgba(4, 19, 14, 0.3)',
                        borderColor: i === 0 ? 'rgba(0,229,168,0.2)' : LUX.border,
                        borderLeftWidth: i === 0 ? '3px' : '1px',
                        borderLeftColor: i === 0 ? LUX.emeraldGlow : LUX.border,
                      }}
                      whileHover={{ background: 'rgba(6, 35, 26, 0.5)', borderColor: LUX.borderHover }}
                      onClick={() => order.link && navigate(order.link)}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm"
                          style={{ background: LUX.gradientGold, color: LUX.emeraldDarkest }}
                        >
                          {order.buyer?.full_name?.charAt(0) || 'G'}
                        </div>
                        <div>
                          <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: LUX.goldSoft }}>
                            #{String(order.id).slice(0, 8)}
                          </div>
                          <div className="font-semibold text-sm" style={{ color: LUX.textPrimary }}>
                            {order.buyer?.full_name || order.buyer?.email || 'Guest'}
                          </div>
                        </div>
                      </div>

                      <div className="hidden md:flex items-center gap-8">
                        <div className="text-center">
                          <div className="text-[9px] uppercase tracking-tight" style={{ color: LUX.textMuted }}>
                            Date
                          </div>
                          <div className="text-xs font-medium" style={{ color: LUX.textPrimary }}>
                            {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] uppercase tracking-tight" style={{ color: LUX.textMuted }}>
                            Amount
                          </div>
                          <div className="font-bold text-lg font-serif" style={{ color: LUX.emeraldGlow }}>
                            {formatCurrency(Number(order.total_amount))}
                          </div>
                        </div>
                        <div
                          className="min-w-[90px] text-center px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider"
                          style={{
                            background:
                              order.status === 'completed' || order.status === 'delivered' ? 'rgba(0,229,168,0.1)' : 'rgba(255,255,255,0.03)',
                            borderColor:
                              order.status === 'completed' || order.status === 'delivered' ? 'rgba(0,229,168,0.2)' : LUX.border,
                            color: order.status === 'completed' || order.status === 'delivered' ? LUX.emeraldGlow : LUX.textMuted,
                          }}
                        >
                          {order.status || 'Pending'}
                        </div>
                      </div>

                      <div className="flex sm:hidden items-center justify-between w-full mt-3 pt-3 border-t" style={{ borderColor: LUX.border }}>
                        <div className="font-bold" style={{ color: LUX.emeraldGlow }}>
                          {formatCurrency(Number(order.total_amount))}
                        </div>
                        <div
                          className="px-2 py-1 rounded text-[9px] font-bold uppercase"
                          style={{ background: 'rgba(0,229,168,0.1)', color: LUX.emeraldGlow }}
                        >
                          {order.status || 'Pending'}
                        </div>
                      </div>

                      <div
                        className="absolute top-0 right-0 w-20 h-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,229,168,0.05))' }}
                      />
                    </motion.div>
                  ))
                ) : (
                  <div className="py-16 text-center">
                    <PackageIcon className="h-12 w-12 mx-auto mb-3 opacity-20" style={{ color: LUX.textMuted }} />
                    <p className="text-xs uppercase tracking-widest" style={{ color: LUX.textMuted }}>
                      No transactions found
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </section>

          {/* BOTTOM ROW: Vendors + Activity */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 pb-6">
            {/* Top Vendors */}
            <motion.div
              className="lg:col-span-2 rounded-2xl p-5 backdrop-blur-xl border"
              style={{ background: LUX.bgCard, borderColor: LUX.border, boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`,
                      boxShadow: `0 8px 24px -8px ${LUX.emerald}`,
                    }}
                  >
                    <Verified className="h-4 w-4" style={{ color: LUX.goldSoft }} />
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold tracking-[0.2em] uppercase" style={{ color: LUX.goldSoft }}>
                      Top Performers
                    </span>
                    <h3 className="font-serif text-lg font-semibold" style={{ color: LUX.textPrimary }}>
                      Vendor Performance
                    </h3>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {metricsQuery.isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin mr-3" style={{ color: LUX.emeraldGlow }} />
                    <span className="text-sm" style={{ color: LUX.textMuted }}>Loading...</span>
                  </div>
                ) : typedMetrics.top_vendors && typedMetrics.top_vendors.length > 0 ? (
                  typedMetrics.top_vendors.slice(0, 5).map((vendor, i) => (
                    <div
                      key={vendor.id}
                      className="group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer"
                      style={{ borderColor: LUX.border, background: 'rgba(4, 19, 14, 0.3)' }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs"
                          style={{
                            background: i < 3 ? `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})` : LUX.goldMuted,
                            color: i < 3 ? LUX.goldSoft : LUX.textPrimary,
                          }}
                        >
                          {(vendor.name || 'V').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-sm" style={{ color: LUX.textPrimary }}>
                            {vendor.name}
                          </div>
                          <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: LUX.gold }}>
                            {formatNumber(vendor.sales)} Transactions
                          </div>
                        </div>
                      </div>
                      <div className="font-bold font-serif" style={{ color: LUX.emeraldGlow }}>
                        {formatCurrency(Number(vendor.revenue))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-16 text-center">
                    <Store className="h-12 w-12 mx-auto mb-3 opacity-20" style={{ color: LUX.textMuted }} />
                    <p className="text-xs uppercase tracking-widest" style={{ color: LUX.textMuted }}>No vendor metrics</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Right Column */}
            <div className="space-y-5">
              {/* Recent Users */}
              <motion.div
                className="rounded-2xl p-5 backdrop-blur-xl border"
                style={{ background: LUX.bgCard, borderColor: LUX.border }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.85 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: LUX.goldMuted }}>
                    <Users className="h-4 w-4" style={{ color: LUX.gold }} />
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold tracking-[0.2em] uppercase" style={{ color: LUX.goldSoft }}>
                      Community
                    </span>
                    <h3 className="font-serif text-sm font-semibold" style={{ color: LUX.textPrimary }}>
                      Recent Signups
                    </h3>
                  </div>
                </div>

                <div className="space-y-2">
                  {typedMetrics.recent_users && typedMetrics.recent_users.length > 0 ? (
                    typedMetrics.recent_users.slice(0, 4).map((user: any, idx: number) => (
                      <div
                        key={user.id || idx}
                        className="flex items-center gap-3 p-2.5 rounded-lg border"
                        style={{ borderColor: LUX.border, background: 'rgba(4, 19, 14, 0.3)' }}
                      >
                        <div
                          className="h-9 w-9 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ background: LUX.goldMuted, color: LUX.goldSoft }}
                        >
                          {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate" style={{ color: LUX.textPrimary }}>
                            {user.full_name || user.email}
                          </div>
                          <div className="text-[10px]" style={{ color: LUX.textMuted }}>
                            {user.email}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-4 text-xs" style={{ color: LUX.textMuted }}>
                      No recent signups
                    </p>
                  )}
                </div>
              </motion.div>

              {/* Activity Log */}
              <motion.div
                className="rounded-2xl p-5 backdrop-blur-xl border"
                style={{ background: LUX.bgCard, borderColor: LUX.border }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: LUX.goldMuted }}>
                    <Activity className="h-4 w-4" style={{ color: LUX.gold }} />
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold tracking-[0.2em] uppercase" style={{ color: LUX.goldSoft }}>
                      Activity
                    </span>
                    <h3 className="font-serif text-sm font-semibold" style={{ color: LUX.textPrimary }}>
                      Recent Actions
                    </h3>
                  </div>
                </div>

                <div className="space-y-3">
                  {typedMetrics.recent_activities.length > 0 ? (
                    typedMetrics.recent_activities.slice(0, 4).map((a, idx) => (
                      <div key={a.id || idx} className="flex items-start gap-3">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: LUX.goldMuted }}
                        >
                          {getActivityIcon(a.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate" style={{ color: LUX.textPrimary }}>
                            {a.title}
                          </div>
                          <div className="text-[10px] line-clamp-1" style={{ color: LUX.textMuted }}>
                            {a.description}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-4 text-xs" style={{ color: LUX.textMuted }}>
                      No recent activity
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default Dashboard;