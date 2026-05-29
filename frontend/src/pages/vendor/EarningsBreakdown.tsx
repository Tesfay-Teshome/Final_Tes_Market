import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vendorAPI, resolveMediaUrl } from '@/services/api';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Percent,
  BarChart3,
  Package,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface EarningsData {
  total_earnings: number;
  total_sales: number;
  platform_fees: number;
  net_earnings: number;
  pending_payouts: number;
  paid_payouts: number;
  earnings_growth: number;
  commission_rate: number;
  next_payout_date: string;
  monthly_breakdown: MonthlyEarning[];
  recent_payouts: Payout[];
  top_products: ProductEarning[];
}

interface MonthlyEarning {
  month: string;
  gross_sales: number;
  platform_fees: number;
  net_earnings: number;
  orders_count: number;
}

interface Payout {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'cancelled';
  payout_date?: string;
  payout_reference?: string;
  admin_note?: string;
  created_at: string;
}

interface ProductEarning {
  product: { id: string; name: string; image: string };
  total_sales: number;
  total_earnings: number;
  orders_count: number;
  commission_paid: number;
}

const darkCard = "relative overflow-hidden rounded-2xl border border-white/[0.04] bg-[#0F1720]/70 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]";

const EarningsBreakdown = () => {
  const [timeRange, setTimeRange] = useState('last_6_months');

  const { data: earnings, isLoading } = useQuery<EarningsData>({
    queryKey: ['vendor-earnings-breakdown', timeRange],
    queryFn: async () => {
      const response = await vendorAPI.getEarningsBreakdown(timeRange);
      return response.data;
    },
  });

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'pending': return 'text-amber-400 border-amber-400/20 bg-amber-400/10';
      case 'processing': return 'text-blue-400 border-blue-400/20 bg-blue-400/10';
      case 'paid': return 'text-[#3CFF9E] border-[#3CFF9E]/20 bg-[#3CFF9E]/10';
      case 'cancelled': return 'text-rose-400 border-rose-500/20 bg-rose-500/10';
      default: return 'text-[#8B949E] border-white/10 bg-white/5';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-amber-400" />;
      case 'processing': return <AlertCircle className="h-4 w-4 text-blue-400" />;
      case 'paid': return <CheckCircle className="h-4 w-4 text-[#3CFF9E]" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-rose-400" />;
      default: return <Clock className="h-4 w-4 text-[#8B949E]" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070B0F] flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-[60px] rounded-full animate-pulse" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="relative h-16 w-16 rounded-2xl border-2 border-t-[#3CFF9E] border-r-transparent border-b-emerald-900 border-l-transparent"
          />
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Total Sales',
      value: `$${earnings?.total_sales?.toFixed(2) || '0.00'}`,
      sub: earnings?.earnings_growth && earnings.earnings_growth > 0
        ? `+${earnings.earnings_growth.toFixed(1)}% from last period`
        : `${earnings?.earnings_growth?.toFixed(1) || '0'}% from last period`,
      icon: DollarSign,
      borderClass: 'border-2 border-emerald-500/50',
      iconWrapClass: 'bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/10',
      iconColor: 'text-[#3CFF9E] drop-shadow-[0_0_8px_rgba(60,255,158,0.5)]',
      badgeClass: 'text-[#00FF9D] bg-[#00FF9D]/10 border border-[#00FF9D]/20',
      sparklineStroke: '#00FF9D',
      sparklinePath: 'M0,35 L20,25 L40,30 L60,15 L80,25 L100,10',
      trend: (earnings?.earnings_growth || 0) > 0,
    },
    {
      title: 'Platform Fees',
      value: `$${earnings?.platform_fees?.toFixed(2) || '0.00'}`,
      sub: `${earnings?.commission_rate || 0}% commission rate`,
      icon: Percent,
      borderClass: 'border border-white/10',
      iconWrapClass: 'bg-amber-500/10 border border-amber-500/20',
      iconColor: 'text-amber-500',
      badgeClass: 'text-amber-500 bg-amber-500/10 border border-amber-500/20',
      sparklineStroke: '#ffa500',
      sparklinePath: 'M0,30 L25,35 L50,20 L75,28 L100,15',
      trend: null,
    },
    {
      title: 'Net Earnings',
      value: `$${earnings?.net_earnings?.toFixed(2) || '0.00'}`,
      sub: 'After platform fees',
      icon: TrendingUp,
      borderClass: 'border border-white/10',
      iconWrapClass: 'bg-blue-500/10 border border-blue-500/20',
      iconColor: 'text-blue-400',
      badgeClass: 'text-blue-400 bg-blue-500/10 border border-blue-500/20',
      sparklineStroke: '#00D1FF',
      sparklinePath: 'M0,35 L20,30 L40,38 L60,20 L80,25 L100,15',
      trend: true,
    },
    {
      title: 'Pending Payouts',
      value: `$${earnings?.pending_payouts?.toFixed(2) || '0.00'}`,
      sub: `Next: ${earnings?.next_payout_date ? format(new Date(earnings.next_payout_date), 'MMM dd, yyyy') : 'TBD'}`,
      icon: Clock,
      borderClass: 'border border-white/10',
      iconWrapClass: 'bg-purple-500/10 border border-purple-500/20',
      iconColor: 'text-purple-400',
      badgeClass: 'text-purple-400 bg-purple-500/10 border border-purple-500/20',
      sparklineStroke: '#BF5AF2',
      sparklinePath: 'M0,32 L20,38 L40,22 L60,30 L80,18 L100,25',
      trend: null,
    },
  ];

  return (
    <div className="flex-1 relative min-h-screen text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 pb-12 bg-[#070B0F]">
      {/* Premium Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
          style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[20%] -right-[5%] w-[35%] h-[35%] bg-violet-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-[1700px] mx-auto pt-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-2">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/20 flex items-center justify-center shadow-lg">
                <BarChart3 className="h-5 w-5 text-[#3CFF9E]" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Earnings Breakdown</h1>
            </div>
            <p className="text-[#8B949E] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Detailed Breakdown of Your Store's Earnings
            </p>
          </motion.div>

          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-[#3CFF9E]/50 transition-all appearance-none"
            >
              <option value="last_month" className="bg-[#0D1117]">Last Month</option>
              <option value="last_3_months" className="bg-[#0D1117]">Last 3 Months</option>
              <option value="last_6_months" className="bg-[#0D1117]">Last 6 Months</option>
              <option value="last_year" className="bg-[#0D1117]">Last Year</option>
              <option value="all_time" className="bg-[#0D1117]">All Time</option>
            </select>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] border border-white/10 text-[#8B949E] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/[0.08] hover:text-white transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </motion.button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
          {kpiCards.map((kpi, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={`relative overflow-hidden rounded-2xl ${kpi.borderClass} bg-[#0F1720] p-5 cursor-pointer group hover:bg-[#0F1720]/90 transition-all duration-300 shadow-xl`}
            >
              <div className="flex justify-between items-start mb-2 relative z-10">
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-[0.05em]">{kpi.title}</span>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shadow-inner ${kpi.iconWrapClass}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
                </div>
              </div>
              <div className="space-y-1 relative z-10">
                <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-3">{kpi.value}</h3>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className="text-[10px] font-bold text-white/50 tracking-tight truncate">
                    {kpi.sub}
                  </p>
                  {kpi.trend !== null && (
                    <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] font-bold ${kpi.badgeClass}`}>
                      {kpi.trend ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    </div>
                  )}
                </div>
              </div>
              <div className="h-8 w-full mt-2 opacity-40 group-hover:opacity-60 transition-opacity relative z-10">
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                  <path d={kpi.sparklinePath} fill="none" stroke={kpi.sparklineStroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Monthly Breakdown & Recent Payouts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Breakdown */}
          <div className={`${darkCard} p-6`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-[#3CFF9E]/10 border border-[#3CFF9E]/20">
                <BarChart3 className="h-4 w-4 text-[#3CFF9E]" />
              </div>
              <div>
                <h2 className="text-[11px] font-black text-white uppercase tracking-wider">Monthly Breakdown</h2>
                <p className="text-[9px] font-bold text-[#8B949E] uppercase tracking-widest">Earnings by month</p>
              </div>
            </div>
            <div className="space-y-3">
              {earnings?.monthly_breakdown?.length === 0 || !earnings?.monthly_breakdown ? (
                <div className="py-10 text-center">
                  <BarChart3 className="h-10 w-10 text-[#586069] mx-auto mb-3" />
                  <p className="text-[#8B949E] text-xs font-medium">No monthly data available</p>
                </div>
              ) : earnings?.monthly_breakdown?.map((month, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                  <div>
                    <p className="text-[11px] font-black text-white uppercase tracking-wider">{month.month}</p>
                    <p className="text-[10px] font-bold text-[#8B949E] mt-0.5">{month.orders_count} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-black text-white">${month.net_earnings.toFixed(2)}</p>
                    <p className="text-[9px] font-bold text-[#586069] mt-0.5">
                      Gross: ${month.gross_sales.toFixed(2)} · Fees: -${month.platform_fees.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Payouts */}
          <div className={`${darkCard} p-6`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <CreditCard className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <h2 className="text-[11px] font-black text-white uppercase tracking-wider">Recent Payouts</h2>
                <p className="text-[9px] font-bold text-[#8B949E] uppercase tracking-widest">Payout history</p>
              </div>
            </div>
            <div className="space-y-3">
              {!earnings?.recent_payouts?.length ? (
                <div className="py-10 text-center">
                  <CreditCard className="h-10 w-10 text-[#586069] mx-auto mb-3" />
                  <p className="text-[#8B949E] text-xs font-medium">No payouts yet</p>
                </div>
              ) : earnings?.recent_payouts?.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
                      {getStatusIcon(payout.status)}
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-white">${payout.amount.toFixed(2)}</p>
                      <p className="text-[10px] font-bold text-[#8B949E]">
                        {formatDistanceToNow(new Date(payout.created_at), { addSuffix: true })}
                      </p>
                      {payout.payout_reference && (
                        <p className="text-[9px] font-bold text-[#586069]">Ref: {payout.payout_reference}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyles(payout.status)}`}>
                      {payout.status}
                    </span>
                    {payout.payout_date && (
                      <p className="text-[9px] font-bold text-[#586069] mt-1">
                        {format(new Date(payout.payout_date), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Earning Products */}
        <div className={`${darkCard} p-6`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Package className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-[11px] font-black text-white uppercase tracking-wider">Top Earning Products</h2>
              <p className="text-[9px] font-bold text-[#8B949E] uppercase tracking-widest">Products generating the most revenue</p>
            </div>
          </div>

          {!earnings?.top_products?.length ? (
            <div className="py-10 text-center">
              <BarChart3 className="h-10 w-10 text-[#586069] mx-auto mb-3" />
              <p className="text-[#8B949E] text-xs font-medium">No product earnings data yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {earnings?.top_products?.map((product, index) => (
                <div key={product.product.id} className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#3CFF9E]/20 transition-all group">
                  <div className="text-2xl font-black text-[#3CFF9E] w-8 flex-shrink-0 font-mono">
                    #{index + 1}
                  </div>
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0">
                    <img
                      src={resolveMediaUrl(product.product.image) || '/placeholder.jpg'}
                      alt={product.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-white uppercase tracking-tight truncate group-hover:text-[#3CFF9E] transition-colors">
                      {product.product.name}
                    </p>
                    <p className="text-[10px] font-bold text-[#8B949E] mt-0.5">{product.orders_count} orders</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[16px] font-black text-white">${product.total_earnings.toFixed(2)}</p>
                    <p className="text-[9px] font-bold text-[#8B949E]">Sales: ${product.total_sales.toFixed(2)}</p>
                    <p className="text-[9px] font-bold text-rose-400">Fees: -${product.commission_paid.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EarningsBreakdown;
