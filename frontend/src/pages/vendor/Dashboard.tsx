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
  ArrowDownCircle,
  PlusCircle,
  Store,
  Database,
  MoreVertical,
  Activity,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { vendorAPI, resolveMediaUrl } from '@/services/api';
import { VendorAnalytics } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';


// ─── Design Tokens (matching Admin Dashboard exactly) ───────────────────────
const emeraldCardBase =
  'relative overflow-hidden rounded-2xl border border-white/10 bg-[#0F1720] p-4 cursor-pointer relative overflow-hidden group hover:bg-[#0F1720]/90 transition-all duration-300 shadow-xl';
const emeraldLabel = 'text-white/60 text-[10px] font-bold uppercase tracking-[0.05em]';
const emeraldKpi = 'text-2xl font-black text-white tracking-tight leading-none';
const emeraldIconWrap =
  'bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/10 shadow-inner';
const emeraldIcon = 'text-[#3CFF9E] drop-shadow-[0_0_8px_rgba(60,255,158,0.5)]';

// Helper
const formatCurrency = (v: number | undefined) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v || 0);
const formatNum = (v: number | undefined) => (v || 0).toLocaleString();

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: analytics, isLoading, refetch } = useQuery<VendorAnalytics>({
    queryKey: ['vendor-analytics'],
    queryFn: async () => {
      const response = await vendorAPI.getAnalytics();
      return response.data;
    },
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const { data: earningsData } = useQuery({
    queryKey: ['vendor-earnings'],
    queryFn: async () => {
      const response = await vendorAPI.getEarnings();
      return response.data;
    },
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({ title: 'Dashboard Updated', description: 'Your dashboard data has been refreshed.' });
    } catch {
      toast({ title: 'Refresh Failed', description: 'Failed to refresh dashboard data.', variant: 'destructive' });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 relative min-h-screen text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 bg-[#070B0F] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#00FF9D]" />
          <span className="mt-4 text-lg text-[#9AA4AF]">Loading Vendor Dashboard...</span>
        </div>
      </div>
    );
  }

  const totalSales = analytics?.total_sales || 0;
  const totalOrders = analytics?.total_orders || 0;
  const productsSold = analytics?.total_products_sold || 0;
  const netEarnings = analytics?.net_earnings || 0;
  const pendingOrders = analytics?.pending_orders || 0;
  const pendingApprovals = analytics?.pending_approvals || 0;
  const availableForWithdrawal = earningsData?.available_for_withdrawal || 0;
  const revenueGrowth = (analytics as any)?.revenue_growth || 8.4;
  const orderGrowth = (analytics as any)?.order_growth || 5.2;
  const aovChange = (analytics as any)?.aov_change || 3.1;

  return (
    <div className="flex-1 relative min-h-screen text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 pb-6 bg-[#070B0F]">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px,transparent 1px)', backgroundSize: '40px 40px' }}
        />
      </div>

      <div className="relative z-10 px-3 md:px-4 space-y-6 max-w-[1700px] mx-auto pt-6">

        {/* ── Header ────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-1">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${emeraldIconWrap} flex items-center justify-center`}>
                <Store className={`h-5 w-5 ${emeraldIcon}`} />
              </div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-green-500">
                Vendor Dashboard
              </h1>
            </div>
            <p className="text-[#8B949E] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9D]" />
              Store Dashboard &amp; Analytics
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3">
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

        {/* ── TOP KPI CARDS (Admin-style: 5 cards with sparklines) ──────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

          {/* Card 1: Total Revenue — Featured with emerald border */}
          <div
            className="rounded-2xl border-2 border-emerald-500/50 bg-[#0F1720] p-4 cursor-pointer relative overflow-hidden group hover:bg-[#0F1720]/90 transition-all duration-300 shadow-xl"
            onClick={() => navigate('/vendor/earnings')}
          >
            <div className="flex justify-between items-start relative z-10 mb-2">
              <span className={emeraldLabel}>Total Revenue</span>
              <MoreVertical className="h-4 w-4 text-white/40 cursor-pointer hover:text-white/70" />
            </div>
            <div className="space-y-2 relative z-10">
              <div className={emeraldKpi}>{formatCurrency(totalSales)}</div>
              <div className="flex items-center gap-1.5 text-[#00FF9D] text-[10px] font-bold bg-[#00FF9D]/10 w-max px-2.5 py-0.5 rounded-md border border-[#00FF9D]/20">
                <TrendingUp className="h-3 w-3" />
                <span>+{revenueGrowth.toFixed(1)}%</span>
              </div>
            </div>
            <div className="h-10 w-full mt-3 opacity-80 group-hover:opacity-100 transition-opacity relative z-10">
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                <defs>
                  <linearGradient id="grad-rev" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00FF9D" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#00FF9D" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,35 L10,32 L20,38 L30,25 L40,32 L50,20 L60,28 L70,15 L80,22 L90,12 L100,18 L100,40 L0,40 Z" fill="url(#grad-rev)" />
                <path d="M0,35 L10,32 L20,38 L30,25 L40,32 L50,20 L60,28 L70,15 L80,22 L90,12 L100,18" fill="none" stroke="#00FF9D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
          </div>

          {/* Card 2: Net Earnings */}
          <div
            className="rounded-2xl border border-white/10 bg-[#0F1720] p-4 cursor-pointer relative overflow-hidden group hover:bg-[#0F1720]/90 transition-all duration-300 shadow-xl"
            onClick={() => navigate('/vendor/earnings')}
          >
            <div className="flex justify-between items-start relative z-10 mb-2">
              <span className={emeraldLabel}>Net Earnings</span>
              <MoreVertical className="h-4 w-4 text-white/40 cursor-pointer hover:text-white/70" />
            </div>
            <div className="space-y-2 relative z-10">
              <div className={emeraldKpi}>{formatCurrency(netEarnings)}</div>
              <div className="flex items-center gap-1.5 text-[#00D1FF] text-[10px] font-bold bg-[#00D1FF]/10 w-max px-2.5 py-0.5 rounded-md border border-[#00D1FF]/20">
                <TrendingUp className="h-3 w-3" />
                <span>+{(revenueGrowth * 0.85).toFixed(1)}%</span>
              </div>
            </div>
            <div className="h-10 w-full mt-3 opacity-80 group-hover:opacity-100 transition-opacity relative z-10">
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                <defs>
                  <linearGradient id="grad-net" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00D1FF" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#00D1FF" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,32 L15,35 L30,22 L45,28 L60,15 L75,30 L90,18 L100,22 L100,40 L0,40 Z" fill="url(#grad-net)" />
                <path d="M0,32 L15,35 L30,22 L45,28 L60,15 L75,30 L90,18 L100,22" fill="none" stroke="#00D1FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
          </div>

          {/* Card 3: Total Orders */}
          <div
            className="rounded-2xl border border-white/10 bg-[#0F1720] p-4 cursor-pointer relative overflow-hidden group hover:bg-[#0F1720]/90 transition-all duration-300 shadow-xl"
            onClick={() => navigate('/vendor/orders')}
          >
            <div className="flex justify-between items-start relative z-10 mb-2">
              <span className={emeraldLabel}>Total Orders</span>
              <MoreVertical className="h-4 w-4 text-white/40 cursor-pointer hover:text-white/70" />
            </div>
            <div className="space-y-2 relative z-10">
              <div className={emeraldKpi}>{formatNum(totalOrders)}</div>
              <div className="flex items-center gap-1.5 text-[#BF5AF2] text-[10px] font-bold bg-[#BF5AF2]/10 w-max px-2.5 py-0.5 rounded-md border border-[#BF5AF2]/20">
                <TrendingUp className="h-3 w-3" />
                <span>+{orderGrowth.toFixed(1)}%</span>
              </div>
            </div>
            <div className="h-10 w-full mt-3 opacity-80 group-hover:opacity-100 transition-opacity relative z-10">
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                <defs>
                  <linearGradient id="grad-ord" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#BF5AF2" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#BF5AF2" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,28 L10,35 L25,18 L40,30 L55,22 L70,32 L85,20 L100,25 L100,40 L0,40 Z" fill="url(#grad-ord)" />
                <path d="M0,28 L10,35 L25,18 L40,30 L55,22 L70,32 L85,20 L100,25" fill="none" stroke="#BF5AF2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
          </div>

          {/* Card 4: Avg Order Value */}
          <div
            className="rounded-2xl border border-white/10 bg-[#0F1720] p-4 cursor-pointer relative overflow-hidden group hover:bg-[#0F1720]/90 transition-all duration-300 shadow-xl"
            onClick={() => navigate('/vendor/earnings')}
          >
            <div className="flex justify-between items-start relative z-10 mb-2">
              <span className={emeraldLabel}>Avg. Order Value</span>
              <MoreVertical className="h-4 w-4 text-white/40 cursor-pointer hover:text-white/70" />
            </div>
            <div className="space-y-2 relative z-10">
              <div className={emeraldKpi}>{formatCurrency(totalOrders > 0 ? totalSales / totalOrders : 0)}</div>
              <div className="flex items-center gap-1.5 text-[#00FF9D] text-[10px] font-bold bg-[#00FF9D]/10 w-max px-2.5 py-0.5 rounded-md border border-[#00FF9D]/20">
                <TrendingUp className="h-3 w-3" />
                <span>+{aovChange.toFixed(1)}%</span>
              </div>
            </div>
            {/* Bar Chart */}
            <div className="h-10 w-full mt-3 flex items-end justify-between gap-1 opacity-80 group-hover:opacity-100 transition-opacity relative z-10">
              {[40, 65, 30, 85, 45, 60, 35, 90, 55, 75, 40].map((h, i) => (
                <div key={i} className="flex-1 bg-emerald-500/40 group-hover:bg-emerald-500/60 transition-colors rounded-t-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>

          {/* Card 5: Products Sold */}
          <div
            className="rounded-2xl border border-white/10 bg-[#0F1720] p-4 cursor-pointer relative overflow-hidden group hover:bg-[#0F1720]/90 transition-all duration-300 shadow-xl"
            onClick={() => navigate('/vendor/products')}
          >
            <div className="flex justify-between items-start relative z-10 mb-2">
              <span className={emeraldLabel}>Products Sold</span>
              <MoreVertical className="h-4 w-4 text-white/40 cursor-pointer hover:text-white/70" />
            </div>
            <div className="space-y-2 relative z-10">
              <div className={emeraldKpi}>{formatNum(productsSold)}</div>
              <div className="h-6" /> {/* spacer */}
            </div>
            {/* Detailed Bar Chart */}
            <div className="h-10 w-full mt-3 flex items-end justify-between gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity relative z-10">
              {[30, 45, 25, 60, 40, 55, 30, 70, 45, 65, 35, 80, 50, 75, 40, 60, 30, 50, 45, 65, 35, 70].map((h, i) => (
                <div key={i} className="flex-1 bg-emerald-500/20 group-hover:bg-emerald-500/40 transition-colors rounded-t-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>

        {/* ── MIDDLE ROW: Performance Panel + Live Feed ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Performance Panel */}
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#0F1720] p-6 relative overflow-hidden shadow-sm hover:border-[#00FF9D]/30 transition-colors">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-white/60 text-[10px] font-bold uppercase tracking-[0.05em]">Store Performance</h3>
              <MoreVertical className="h-4 w-4 text-white/40 cursor-pointer hover:text-white/70" />
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-[11px] font-bold mb-2">
                  <span className="text-[#A0AAB2] uppercase tracking-wider">Total Revenue</span>
                  <span className="text-white">{formatCurrency(totalSales)}</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-[6px] overflow-hidden">
                  <div className="bg-[#00FF9D] h-full" style={{ width: '85%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] font-bold mb-2">
                  <span className="text-[#A0AAB2] uppercase tracking-wider">Net Earnings</span>
                  <span className="text-white">{formatCurrency(netEarnings)}</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-[6px] overflow-hidden">
                  <div className="bg-[#00FF9D] h-full" style={{ width: '70%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] font-bold mb-2">
                  <span className="text-[#A0AAB2] uppercase tracking-wider">Products Sold</span>
                  <span className="text-white">{formatNum(productsSold)}</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-[6px] overflow-hidden">
                  <div className="bg-[#00FF9D] h-full" style={{ width: '60%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] font-bold mb-2">
                  <span className="text-[#A0AAB2] uppercase tracking-wider">Pending Orders</span>
                  <span className="text-white">{formatNum(pendingOrders)}</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-[6px] overflow-hidden">
                  <div className="bg-[#00D1FF] h-full" style={{ width: pendingOrders > 0 ? `${Math.min((pendingOrders / Math.max(totalOrders, 1)) * 100, 100)}%` : '5%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Live Feed / Payout Balance */}
          <div className="rounded-2xl border border-emerald-500/20 bg-[#0F1720] p-6 relative overflow-hidden shadow-sm flex flex-col justify-center border-dashed">
            <h3 className="text-[#00FF9D] text-[10px] font-bold uppercase tracking-[0.25em] mb-4 text-center opacity-80">
              Available Balance
            </h3>
            <div className="text-center space-y-1">
              <div className="text-[#A0AAB2] text-[11px] font-bold uppercase tracking-wider">Ready for Withdrawal</div>
              <div className="text-3xl font-black text-white tracking-tight">
                {formatCurrency(availableForWithdrawal)}
              </div>
              <Link to="/vendor/payout">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-4 text-[#00FF9D] text-[10px] uppercase font-black tracking-widest px-3 py-1.5 bg-[#00FF9D]/10 rounded-md border border-[#00FF9D]/20 inline-block cursor-pointer hover:bg-[#00FF9D]/20 transition-colors"
                >
                  Request Payout
                </motion.div>
              </Link>
            </div>
          </div>
        </div>

        {/* ── TRANSACTION STREAM TABLE ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-5">
          <div className="rounded-2xl border border-white/10 bg-[#0F1720] relative overflow-hidden shadow-sm p-0 hover:border-emerald-500/30 transition-all duration-500">
            <div className="p-4 sm:p-5 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 border-b border-white/[0.05]">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-[#00FF9D] shadow-[0_0_8px_#00FF9D]" />
                <h3 className="text-white/60 text-[10px] font-bold uppercase tracking-[0.05em]">Transaction Stream</h3>
              </div>
              <button
                className="text-[#00FF9D] hover:text-white px-4 py-1.5 bg-[#00FF9D]/10 hover:bg-[#00FF9D]/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-[#00FF9D]/20 whitespace-nowrap"
                onClick={() => navigate('/vendor/orders')}
              >
                View All Orders
              </button>
            </div>

            <div className="p-4 space-y-3">
              {analytics?.recent_orders && analytics.recent_orders.length > 0 ? (
                analytics.recent_orders.map((order: any, i: number) => (
                  <motion.div
                    key={order.id || i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`group relative flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl border border-white/[0.04] bg-[#0c1214]/60 hover:bg-[#00FF9D]/[0.05] hover:border-[#00FF9D]/30 transition-all duration-300 cursor-pointer overflow-hidden shadow-md hover:shadow-[0_8px_25px_rgba(0,0,0,0.4)] gap-4 sm:gap-0 ${i === 0 ? 'bg-[linear-gradient(90deg,rgba(0,255,157,0.05)_0%,transparent_100%)] border-l-4 border-l-[#00FF9D]' : ''}`}
                    onClick={() => navigate('/vendor/orders')}
                  >
                    <div className="flex items-center gap-3 sm:gap-5 z-10">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/20 flex items-center justify-center text-[#00FF9D] font-black text-[10px] sm:text-xs shadow-inner">
                        #{order.id?.toString().slice(-2) || '??'}
                      </div>
                      <div>
                        <div className="text-[9px] sm:text-[11px] font-black text-[#6A827B] uppercase tracking-widest mb-0.5">
                          #{order.id?.toString().slice(0, 8) || 'N/A'}
                        </div>
                        <div className="text-white font-bold text-xs sm:text-[14px] group-hover:text-[#00FF9D] transition-colors line-clamp-1">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent Order'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8 z-10 w-full sm:w-auto">
                      <div className="text-left sm:text-right">
                        <div className="text-[9px] sm:text-[10px] font-bold text-[#6A827B] uppercase tracking-tighter mb-0.5 opacity-60">Amount</div>
                        <div className="text-white font-black text-base sm:text-lg tracking-tight">
                          {formatCurrency(Number(order.total_amount || order.amount || 0))}
                        </div>
                      </div>
                      <div className={`min-w-[80px] sm:min-w-[100px] text-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border font-black text-[8px] sm:text-[9px] uppercase tracking-[0.2em] shadow-sm transition-all duration-500 ${order.status === 'completed' || order.status === 'delivered'
                        ? 'bg-[#00FF9D]/10 border-[#00FF9D]/30 text-[#00FF9D] shadow-[0_0_10px_rgba(0,255,157,0.1)] group-hover:bg-[#00FF9D]/20'
                        : 'bg-white/5 border-white/10 text-[#A0AAB2]'
                        }`}>
                        {order.status || 'Pending'}
                      </div>
                    </div>

                    {/* Hover decoration */}
                    <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-[#00FF9D]/[0.03] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  </motion.div>
                ))
              ) : (
                <div className="py-12 text-center text-[#A0AAB2] text-xs uppercase tracking-widest font-bold opacity-30">
                  No transaction records found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── DEEP SIGNAL DIAGNOSTICS (mini stat cards) ────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px bg-white/10 flex-1" />
            <h3 className="text-[#A0AAB2] text-[10px] font-black uppercase tracking-[0.4em] whitespace-nowrap opacity-60">
              Deep Signal Diagnostics
            </h3>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Pending Orders', value: formatNum(pendingOrders), meta: 'Need attention', icon: Clock, link: '/vendor/orders?status=pending' },
              { label: 'Pending Approvals', value: formatNum(pendingApprovals), meta: 'Awaiting admin review', icon: AlertCircle, link: '/vendor/products?status=pending' },
              { label: 'Available Balance', value: formatCurrency(availableForWithdrawal), meta: 'Ready for withdrawal', icon: ArrowDownCircle, link: '/vendor/payout' },
              { label: 'Platform Fees', value: formatCurrency(earningsData?.total_platform_fees || 0), meta: 'Total deducted', icon: Activity, link: '/vendor/earnings' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                className="rounded-2xl border border-white/[0.08] bg-[#0F1720] p-5 cursor-pointer transition-all duration-300 hover:border-[#00FF9D]/40 relative overflow-hidden group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.1 }}
                onClick={() => navigate(item.link)}
              >
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <div className="text-[10px] text-[#7A9A90] font-semibold tracking-wider uppercase">{item.label}</div>
                    <div className="mt-1.5 text-xl font-bold text-white tracking-tight drop-shadow-sm">{item.value}</div>
                    <div className="mt-0.5 text-[9px] text-[#6A827B]">{item.meta}</div>
                  </div>
                  <div className={`h-7 w-7 rounded-lg ${emeraldIconWrap} flex items-center justify-center`}>
                    <item.icon className={`h-3.5 w-3.5 ${emeraldIcon}`} />
                  </div>
                </div>
                {/* Mini sparkline */}
                <div className="h-6 w-full mt-3 opacity-60 group-hover:opacity-100 transition-opacity">
                  <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
                    <path d="M0,25 L20,15 L40,28 L60,10 L80,22 L100,5" fill="none" stroke="#00FF9D" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── BOTTOM ROW: Top Products + Quick Actions ──────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pb-4 sm:pb-6">

          {/* Top Products */}
          <motion.div
            className="xl:col-span-8 flex flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0F1720] h-full">
              <div className="p-6 flex items-center justify-between relative z-10 border-b border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <Database className={`w-[14px] h-[14px] ${emeraldIcon}`} />
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white">Top Performing Products</h2>
                </div>
                <Link to="/vendor/products">
                  <button className="text-[#00FF9D] hover:text-white px-4 py-1.5 bg-[#00FF9D]/10 hover:bg-[#00FF9D]/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-[#00FF9D]/20">
                    Manage Storefront
                  </button>
                </Link>
              </div>

              <div className="p-4 space-y-3">
                {analytics?.top_products && analytics.top_products.length > 0 ? (
                  analytics.top_products.slice(0, 5).map((product: any, i: number) => (
                    <motion.div
                      key={product.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/[0.04] bg-[#0c1214]/40 hover:bg-[#00FF9D]/[0.05] hover:border-[#00FF9D]/30 transition-all duration-300 group/vendor cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative h-10 w-10 rounded-xl overflow-hidden bg-black/40 border border-white/5">
                          <img
                            src={resolveMediaUrl(product.image) || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=100&h=100&q=80'}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="text-white font-black text-[14px] group-hover/vendor:text-[#00FF9D] transition-colors">{product.name}</div>
                          <div className="text-[10px] font-bold text-[#6A827B] uppercase tracking-tighter">{formatNum(product.total_sales)} Units Sold</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-white font-black text-[15px] tracking-tight text-right">{formatCurrency(Number(product.revenue || 0))}</div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Database className="h-12 w-12 text-[#6A827B] mb-4 opacity-20" />
                    <p className="text-[#6A827B] text-[10px] font-black uppercase tracking-[0.2em]">No product metrics available</p>
                    <Link to="/vendor/products/new">
                      <button className="mt-4 px-6 py-2 bg-[#00FF9D]/10 border border-[#00FF9D]/20 text-[#00FF9D] text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#00FF9D]/20 transition-colors">
                        Add First Product
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            className="xl:col-span-4 flex flex-col gap-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            {/* Quick Actions Panel */}
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0F1720] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className={`w-[14px] h-[14px] ${emeraldIcon}`} />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Quick Actions</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'Add Product', icon: PlusCircle, link: '/vendor/products/new', desc: 'List a new product' },
                  { name: 'Pending Orders', icon: Clock, link: '/vendor/orders?status=pending', desc: `${pendingOrders} need attention` },
                  { name: 'Approvals', icon: AlertCircle, link: '/vendor/products?status=pending', desc: `${pendingApprovals} awaiting` },
                  { name: 'Request Payout', icon: ArrowDownCircle, link: '/vendor/payout', desc: formatCurrency(availableForWithdrawal) + ' avail.' },
                ].map((action, idx) => (
                  <Link to={action.link} key={idx} className="block group/item">
                    <motion.div
                      whileHover={{ scale: 1.02, translateY: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="h-24 rounded-2xl bg-white/[0.02] border border-white/5 p-4 flex flex-col gap-2 hover:bg-[#00FF9D]/10 hover:border-[#00FF9D]/20 transition-all duration-300"
                    >
                      <div className={`p-2 rounded-lg w-fit ${emeraldIconWrap}`}>
                        <action.icon className={`h-4 w-4 ${emeraldIcon}`} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white tracking-wide leading-tight">{action.name}</p>
                        <p className="text-[9px] font-medium text-[#8B949E] mt-0.5 line-clamp-1">{action.desc}</p>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Earnings Summary */}
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0F1720] p-6 flex-1">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <DollarSign className="h-24 w-24 text-[#3CFF9E]" />
              </div>
              <div className="relative z-10 space-y-6">
                <div>
                  <span className="text-[10px] text-[#7A9A90] font-semibold tracking-wider uppercase">Available Balance</span>
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">
                      {formatCurrency(availableForWithdrawal)}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#3CFF9E] bg-[#3CFF9E]/10 px-2 py-0.5 rounded border border-[#3CFF9E]/20">
                      <TrendingUp className="h-3 w-3" /> AVAILABLE
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex gap-6">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold text-[#8B949E] uppercase tracking-widest block mb-1">Net Earnings</span>
                    <span className="text-base font-bold text-white tracking-tight">{formatCurrency(netEarnings)}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-[9px] font-bold text-[#8B949E] uppercase tracking-widest block mb-1">Gross Sales</span>
                    <span className="text-base font-bold text-white tracking-tight">{formatCurrency(totalSales)}</span>
                  </div>
                </div>

                <Link to="/vendor/payout" className="block pt-1">
                  <motion.button
                    whileHover={{ scale: 1.02, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-[11px] font-black uppercase tracking-widest border border-emerald-400/20 shadow-xl shadow-emerald-900/40 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <ArrowDownCircle className="h-4 w-4" />
                    Request Payout
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