import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  DollarSign,
  Package,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle,
  ChevronRight,
  Loader2,
  RefreshCcw,
  Eye,
  ArrowDownCircle,
  CreditCard,
  Users as UsersIcon,
  PlusCircle,
  Settings,
  Store,
  ArrowRight,
  Sparkles,
  Database
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { vendorAPI, resolveMediaUrl } from '@/services/api';
import { VendorAnalytics } from '@/types';
// import FadeIn from '@/components/animations/FadeIn'; // Not used in current implementation
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import bannerImage from '../images/banner.jpeg';

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: analytics, isLoading, refetch } = useQuery<VendorAnalytics>({
    queryKey: ['vendor-analytics'],
    queryFn: async () => {
      const response = await vendorAPI.getAnalytics();
      console.log('📊 Vendor Analytics Data:', response.data);
      return response.data;
    },
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // 1 minute
  });

  // Earnings data query
  const { data: earningsData } = useQuery({
    queryKey: ['vendor-earnings'],
    queryFn: async () => {
      const response = await vendorAPI.getEarnings();
      console.log('💰 Vendor Earnings Data:', response.data);
      return response.data;
    },
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: 'Dashboard Updated',
        description: 'Your dashboard data has been refreshed.',
      });
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh dashboard data.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 relative min-h-screen text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 pb-12 bg-[#070B0F] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#00FF9D]" />
            <span className="mt-4 text-lg text-[#9AA4AF]">Loading Vendor Dashboard...</span>
          </div>
        </motion.div>

        {/* Mobile Refresh Button Below Banner */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 md:hidden z-50">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-white border border-emerald-500/20 shadow-lg backdrop-blur-md font-bold px-6"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#00FF9D]" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh Data
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Calculate real-time stats with proper formatting
  const totalSales = analytics?.total_sales || 0;
  const totalOrders = analytics?.total_orders || 0;
  const productsSold = analytics?.total_products_sold || 0;
  const netEarnings = analytics?.net_earnings || 0;
  const platformFees = analytics?.platform_fees || 0;
  const pendingOrders = analytics?.pending_orders || 0;
  const pendingApprovals = analytics?.pending_approvals || 0;
  const availableForWithdrawal = earningsData?.available_for_withdrawal || 0;

  const stats = [
    {
      name: 'Total Sales',
      value: `$${Number(totalSales).toFixed(2)}`,
      icon: DollarSign,
      theme: '#00FF9D',
      link: '/vendor/earnings',
      description: 'Gross revenue'
    },
    {
      name: 'Total Orders',
      value: totalOrders,
      icon: Package,
      theme: '#3B82F6',
      link: '/vendor/orders',
      description: 'All orders received'
    },
    {
      name: 'Products Sold',
      value: productsSold,
      icon: ShoppingBag,
      theme: '#F59E0B',
      link: '/vendor/products',
      description: 'Total units sold'
    },
    {
      name: 'Net Earnings',
      value: `$${Number(netEarnings).toFixed(2)}`,
      icon: TrendingUp,
      theme: '#D946EF',
      link: '/vendor/earnings',
      description: 'After commission'
    },
  ];

  // Style tokens from Administrator Dashboard
  const emeraldCardBase = "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0F1720] p-5 cursor-pointer group transition-all duration-300 shadow-lg";
  const emeraldLabel = "text-[#8B949E] text-[10px] font-bold uppercase tracking-wider";
  const emeraldMeta = "text-[#6A827B]";
  const emeraldKpi = "text-[32px] font-bold text-white tracking-tight drop-shadow-sm";
  const emeraldIconWrap = "h-8 w-8 rounded-lg bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/10 flex items-center justify-center shadow-inner group-hover:border-[#3CFF9E]/40 transition-all";
  const emeraldIcon = "text-[#3CFF9E] h-4 w-4 drop-shadow-[0_0_8px_rgba(60,255,158,0.5)] transition-colors";

  const emeraldQuickAction = "bg-[rgba(255,255,255,0.08)] border border-[#00FF9D]/[0.15] hover:bg-[#00FF9D]/20 shadow-[0_0_10px_rgba(0,255,157,0.1)]";

  const quickActions = [
    {
      name: 'Add New Product',
      description: 'List a new product for sale',
      icon: PlusCircle,
      link: '/vendor/products/new',
      color: emeraldQuickAction,
    },
    {
      name: 'Pending Orders',
      description: `${pendingOrders} orders need attention`,
      icon: Clock,
      link: '/vendor/orders?status=pending',
      color: emeraldQuickAction,
    },
    {
      name: 'Product Approvals',
      description: `${pendingApprovals} products awaiting approval`,
      icon: AlertCircle,
      link: '/vendor/products?status=pending',
      color: emeraldQuickAction,
    },
    {
      name: 'Request Payout',
      description: `$${Number(availableForWithdrawal).toFixed(2)} available`,
      icon: ArrowDownCircle,
      link: '/vendor/payout',
      color: emeraldQuickAction,
    },
  ];




  return (
    <div className="flex-1 relative min-h-screen text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 pb-12 bg-[#070B0F]">
      {/* Premium Background Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Subtle grid and noise texture overlay for high-end feel without extreme light orbs */}
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
          style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-[1700px] mx-auto pt-8">
        {/* Header / Hero Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/20 flex items-center justify-center shadow-inner">
                <Store className="h-5 w-5 text-[#3CFF9E]" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent leading-relaxed py-2">Vendor Dashboard</h1>
            </div>
            <p className="text-gray-400 mt-1 font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9D]" />
              Store Dashboard & Analytics
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3"
          >
            <motion.button
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-xs font-black uppercase tracking-widest hover:from-emerald-500 hover:to-emerald-700 border border-emerald-400/20 shadow-lg shadow-emerald-900/20 transition-all duration-300 flex items-center gap-2"
              onClick={handleRefresh}
              disabled={isRefreshing}
              whileHover={{ scale: 1.02, translateY: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </motion.button>
            <Link to="/vendor/products/new">
              <motion.button
                className="h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-xs font-black uppercase tracking-widest hover:from-emerald-500 hover:to-emerald-700 border border-emerald-400/20 shadow-lg shadow-emerald-900/20 transition-all duration-300 flex items-center gap-2"
                whileHover={{ scale: 1.02, translateY: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <PlusCircle className="h-4 w-4" />
                List Product
              </motion.button>
            </Link>
          </motion.div>
        </div>

        {/* Top KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              style={{ '--hover-color': `${stat.theme}66` } as any}
              className={`${emeraldCardBase} hover:border-[var(--hover-color)]`}
              onClick={() => navigate(stat.link)}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={emeraldLabel}>{stat.name}</span>
                <div
                  className="h-8 w-8 rounded-lg bg-gradient-to-br from-[rgba(255,255,255,0.05)] to-transparent border flex items-center justify-center shadow-inner transition-all group-hover:scale-110"
                  style={{ borderColor: `${stat.theme}22`, color: stat.theme }}
                >
                  <stat.icon className="h-4 w-4" style={{ filter: `drop-shadow(0 0 8px ${stat.theme}88)` }} />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className={emeraldKpi}>{stat.value}</h3>
                <p className="text-[10px] text-[#8B949E] tracking-tight opacity-80 group-hover:opacity-100 transition-opacity">
                  {stat.description}
                </p>
              </div>
              {/* Decorative gradient corner */}
              <div
                className="absolute -bottom-10 -right-10 w-24 h-24 rounded-full blur-3xl transition-all duration-700 group-hover:scale-150"
                style={{ backgroundColor: `${stat.theme}11` }}
              />
            </motion.div>
          ))}
        </div>

        {/* Main Dashboard Content Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

          {/* LEFT COLUMN: Activity & Orders */}
          <div className="xl:col-span-8 flex flex-col">

            {/* Recent Orders Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={`${emeraldCardBase} overflow-hidden flex-1`}
            >
              <div className="px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 bg-[#070b14]/50 backdrop-blur-sm border-b border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-[#00FF9D] shadow-[0_0_10px_#00FF9D] animate-pulse"></div>
                  <h2 className="text-white font-bold tracking-tight text-base sm:text-lg">Recent Orders</h2>
                </div>
                <Link to="/vendor/orders">
                  <button
                    className="text-emerald-400 hover:text-white px-4 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-500/20 whitespace-nowrap"
                  >
                    View All
                  </button>
                </Link>
              </div>
              <div className="p-6 space-y-4">
                {analytics?.recent_orders?.length ? analytics.recent_orders.map((order, idx) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + (idx * 0.1) }}
                    className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl border border-white/[0.04] bg-[#0c1214]/60 hover:bg-[#00FF9D]/[0.05] hover:border-[#00FF9D]/30 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/20 flex items-center justify-center font-bold text-emerald-400 text-xs shadow-inner">
                        #{order.id.toString().slice(-3)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Order #{order.id}</p>
                        <p className="text-[#A0AAB2] text-xs font-medium">{order.created_at}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-lg font-bold text-white tracking-tight">${Number(order.total_amount || order.amount || 0).toFixed(2)}</p>
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${order.status === 'delivered'
                          ? 'bg-[#00FF9D]/10 text-[#00FF9D] border-[#00FF9D]/20 shadow-[0_0_10px_rgba(0,255,157,0.1)]'
                          : 'bg-white/5 text-[#A0AAB2] border-white/10'
                          }`}>
                          {order.status}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#8B949E] group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.div>
                )) : (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/[0.05]">
                      <ShoppingBag className="h-8 w-8 text-[#586069]" />
                    </div>
                    <p className="text-[#8B949E] text-sm font-medium">No recent transactions found.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Quick Actions & Payouts */}
          <div className="xl:col-span-4 flex flex-col">

            {/* Quick Actions Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className={`${emeraldCardBase} flex-1`}
            >
              <div className="p-6">
                <h2 className={emeraldLabel + " mb-8 opacity-60"}>Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {quickActions.map((action, idx) => (
                    <Link to={action.link} key={idx} className="block group/item">
                      <motion.div
                        whileHover={{ scale: 1.02, translateY: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className={`h-24 rounded-2xl bg-white/[0.02] border border-white/5 p-4 flex items-center gap-4 hover:bg-[#00FF9D]/10 hover:border-[#00FF9D]/20 transition-all duration-300`}
                      >
                        <div className={`p-2.5 rounded-lg ${emeraldIconWrap} group-hover/item:border-[#3CFF9E]/30`}>
                          <action.icon className={`h-4 w-4 ${emeraldIcon} group-hover/item:text-white`} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white tracking-wide leading-tight">{action.name}</p>
                          <p className="text-[10px] font-medium text-[#8B949E] mt-0.5 line-clamp-1">{action.description}</p>
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>

          </div>
        </div>

        {/* BOTTOM ROW: Products & Financials Unified for Alignment */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mt-8">
          {/* Product Performance Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className={`${emeraldCardBase} xl:col-span-8 h-full`}
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Database className={`w-[14px] h-[14px] ${emeraldIcon}`} />
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white">Top Performing Products</h2>
                </div>
                <Link to="/vendor/products">
                  <button
                    className="text-emerald-400 hover:text-white px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-500/20"
                  >
                    Manage Storefront
                  </button>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analytics?.top_products?.slice(0, 4).map((product, idx) => (
                  <motion.div
                    key={product.id}
                    whileHover={{ scale: 1.02, translateY: -2 }}
                    className="flex items-center justify-between p-4 rounded-2xl border border-white/[0.04] bg-[#0c1214]/40 hover:bg-[#00FF9D]/[0.05] hover:border-[#00FF9D]/30 transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-black/40 border border-white/5">
                        <img
                          src={resolveMediaUrl(product.image) || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=100&h=100&q=80'}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">{product.name}</h3>
                        <div className="text-[10px] font-medium text-[#6A827B] uppercase tracking-wide mt-1">{product.total_sales} Units Sold</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] font-bold text-[#6A827B] uppercase tracking-widest opacity-60 mb-0.5">Revenue</div>
                      <span className="text-white font-bold text-sm tracking-tight">${Number(product.revenue || 0).toFixed(2)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Earnings & Financial Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className={`${emeraldCardBase} xl:col-span-4 before:from-[#3CFF9E]/10 h-full`}
          >
            <div className="p-8">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <DollarSign className="h-24 w-24 text-[#3CFF9E]" />
              </div>

              <div className="relative z-10 space-y-8">
                <div>
                  <span className={emeraldLabel}>Available Balance</span>
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-[32px] font-bold text-white tracking-tight drop-shadow-md">
                      ${Number(availableForWithdrawal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#3CFF9E] bg-[#3CFF9E]/10 px-2 py-0.5 rounded border border-[#3CFF9E]/20">
                      <TrendingUp className="h-3 w-3" /> AVAILABLE
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex gap-8">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold text-[#8B949E] uppercase tracking-widest block mb-1">Platform Fees</span>
                    <span className="text-lg font-bold text-white tracking-tight">${Number(platformFees).toFixed(2)}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-[9px] font-bold text-[#8B949E] uppercase tracking-widest block mb-1">Gross Sales</span>
                    <span className="text-lg font-bold text-white tracking-tight">${Number(totalSales).toFixed(2)}</span>
                  </div>
                </div>

                <Link to="/vendor/payout" className="block pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-[11px] font-black uppercase tracking-widest border border-emerald-400/20 shadow-xl shadow-emerald-900/40 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <ArrowDownCircle className="h-4 w-4" />
                    Request Immediate Payout
                  </motion.button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;