import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, CreditCard, Clock, CheckCircle, AlertCircle, Loader2, ArrowDownCircle, X, Send, Percent, Layers, Award, Wallet, ArrowUpRight } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { vendorAPI } from '@/services/api';
import { format } from 'date-fns';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartData,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Payment {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  date: string;
  description: string;
}

interface PayoutRequest {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requested_at: string;
  completed_at?: string;
  admin_notes?: string;
}

interface CommissionData {
  base_rate: number;
  current_effective_rate: number;
  total_sales_volume: number;
  active_tier?: {
    name: string;
    rate: number;
    min_sales: number;
  };
  active_rules: Array<{
    name: string;
    type: string;
    rate: number;
    priority: number;
  }>;
}

interface EarningsData {
  total_earnings: number;
  total_platform_fees: number;
  available_for_withdrawal: number;
  total_withdrawn: number;
  pending_balance: number;
  earnings_breakdown: Array<{
    order_id: string;
    product_name: string;
    quantity: number;
    gross_amount: number;
    platform_fee: number;
    net_earning: number;
    commission_rate: number;
    date: string;
    status: string;
  }>;
  payout_requests: PayoutRequest[];
  commission_rate: number;
}

const Earnings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [paymentMethodType, setPaymentMethodType] = useState('');
  const [paymentDetails, setPaymentDetails] = useState<Record<string, string>>({});
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowWithdrawModal(false);
      }
    };

    if (showWithdrawModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showWithdrawModal]);

  const {
    data: earningsData,
    isLoading,
    error,
    refetch,
    isError,
    isRefetching
  } = useQuery<EarningsData | null>({
    queryKey: ['vendor-earnings'],
    queryFn: async () => {
      try {
        const response = await vendorAPI.getEarnings();
        console.log('💰 Vendor Earnings Response:', response.data);
        return response.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('Error fetching earnings:', errorMessage);
        throw new Error(`Failed to load earnings data: ${errorMessage}`);
      }
    },
    retry: 2, // Retry failed requests 2 times
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const { data: commissionData } = useQuery<CommissionData>({
    queryKey: ['vendor-commission-status'],
    queryFn: async () => {
      const response = await vendorAPI.getCommissionStatus();
      return response.data;
    }
  });

  // Withdrawal mutation
  const withdrawalMutation = useMutation({
    mutationFn: async (data: { amount: number; notes?: string; payment_method?: string; payment_details?: any }) => {
      const response = await vendorAPI.requestPayout(data);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Withdrawal Requested',
        description: 'Your withdrawal request has been submitted for admin approval.',
      });
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setWithdrawNotes('');
      queryClient.invalidateQueries({ queryKey: ['vendor-earnings'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Withdrawal Failed',
        description: error.response?.data?.error || 'Failed to submit withdrawal request.',
        variant: 'destructive',
      });
    },
  });

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid withdrawal amount.',
        variant: 'destructive',
      });
      return;
    }

    if (amount < 100) {
      toast({
        title: 'Minimum Amount Met',
        description: 'The minimum withdrawal amount is $100.',
        variant: 'destructive',
      });
      return;
    }


    if (amount > (earningsData?.available_for_withdrawal || 0)) {
      toast({
        title: 'Insufficient Funds',
        description: 'Withdrawal amount exceeds available balance.',
        variant: 'destructive',
      });
      return;
    }

    withdrawalMutation.mutate({
      amount,
      notes: withdrawNotes,
      payment_method: paymentMethodType,
      payment_details: paymentDetails
    });
  };

  // Generate daily chart data from earnings breakdown
  const generateDailyData = (): {
    labels: string[];
    data: number[];
    details: Array<{ date: string; fullDate: string; amount: number; count: number; products: string }>;
    maxIndex?: number;
    minIndex?: number;
  } => {
    if (!earningsData?.earnings_breakdown?.length) {
      console.log('📊 No earnings breakdown data available for chart');
      return { labels: [], data: [], details: [] };
    }

    console.log('📊 Processing earnings breakdown:', earningsData.earnings_breakdown.length, 'items');

    // Group earnings by day with proper date sorting
    const dailyEarnings: { [key: string]: { amount: number; date: Date; count: number; products: string[] } } = {};

    earningsData.earnings_breakdown.forEach(earning => {
      const date = new Date(earning.date);
      const dayKey = format(date, 'yyyy-MM-dd');
      const dayLabel = format(date, 'MMM dd, yyyy');

      if (!dailyEarnings[dayKey]) {
        dailyEarnings[dayKey] = {
          amount: 0,
          date: date,
          count: 0,
          products: []
        };
      }
      dailyEarnings[dayKey].amount += earning.net_earning;
      dailyEarnings[dayKey].count += 1;
      dailyEarnings[dayKey].products.push(earning.product_name);

      console.log(`  ${dayLabel}: +$${earning.net_earning.toFixed(2)} (${earning.product_name})`);
    });

    // Sort by actual date (chronologically from earliest to latest)
    const sortedEntries = Object.entries(dailyEarnings)
      .sort((a, b) => a[1].date.getTime() - b[1].date.getTime());

    const labels = sortedEntries.map(([key, value]) => format(value.date, 'MMM dd'));
    const data = sortedEntries.map(([key, value]) => value.amount);
    const details = sortedEntries.map(([key, value]) => ({
      date: format(value.date, 'MMM dd, yyyy'),
      fullDate: format(value.date, 'EEEE, MMMM dd, yyyy'),
      amount: value.amount,
      count: value.count,
      products: value.products.slice(0, 3).join(', ') + (value.products.length > 3 ? '...' : '')
    }));

    // Find highest and lowest earning days
    const maxEarning = Math.max(...data);
    const minEarning = Math.min(...data);
    const maxIndex = data.indexOf(maxEarning);
    const minIndex = data.indexOf(minEarning);

    console.log('📊 Chart Summary:');
    console.log(`  📅 Date Range: ${labels[0]} to ${labels[labels.length - 1]}`);
    console.log(`  📈 Best Day: ${details[maxIndex].fullDate} - $${maxEarning.toFixed(2)}`);
    console.log(`  📉 Lowest Day: ${details[minIndex].fullDate} - $${minEarning.toFixed(2)}`);
    console.log(`  📊 Total Days: ${labels.length}`);

    return { labels, data, details, maxIndex, minIndex };
  };

  const { labels: chartLabels, data: chartDataPoints, details: chartDetails, maxIndex, minIndex } = generateDailyData();

  // Create colors for each data point (highlight best and worst days)
  const pointColors = chartDataPoints.map((_, index) => {
    if (index === maxIndex) return 'rgb(34, 197, 94)'; // Green for best day
    if (index === minIndex) return 'rgb(239, 68, 68)'; // Red for lowest day
    return 'rgb(16, 185, 129)'; // Emerald for normal days
  });

  const pointSizes = chartDataPoints.map((_, index) => {
    if (index === maxIndex || index === minIndex) return 8; // Larger for best/worst
    return 4; // Normal size
  });

  const chartData: ChartData<'line'> = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Daily Earnings ($)',
        data: chartDataPoints,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: pointColors,
        pointBorderColor: pointColors,
        pointRadius: pointSizes,
        pointHoverRadius: pointSizes.map(s => s + 3),
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0D1117',
        titleColor: '#3CFF9E',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          title: (context: any) => {
            const index = context[0].dataIndex;
            return chartDetails[index]?.fullDate || context[0].label;
          },
          label: (context: any) => {
            const index = context.dataIndex;
            const detail = chartDetails[index];
            if (!detail) return `$${context.parsed.y.toFixed(2)}`;

            return [
              `💰 Earnings: $${detail.amount.toFixed(2)}`,
              `📦 Orders: ${detail.count}`,
              `🛍️ Products: ${detail.products}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#8B949E',
          font: { size: 10, weight: 'bold' as const },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.03)',
        },
        ticks: {
          color: '#8B949E',
          font: { size: 10, weight: 'bold' as const },
          callback: (value: any) => `$${value}`,
        },
      },
    },
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-red-600';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070B0F] flex items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="relative z-10 text-center">
          <div className="h-20 w-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-8 animate-pulse">
            <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-white uppercase tracking-widest">Loading Analytics</h2>
          <p className="text-[10px] font-black text-[#8B949E] uppercase tracking-[0.2em] mt-3">Synthesizing your financial data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B0F] text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 px-4 sm:px-8 py-8 relative overflow-hidden">
      {/* Premium Background Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
          style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Available Balance */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl bg-emerald-600 p-5 relative overflow-hidden cursor-pointer group hover:scale-[1.02] transition-all duration-300 shadow-xl border-none">
            <div className="flex justify-between items-start mb-2">
              <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">Available for Withdrawal</span>
              <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shadow-inner">
                <Wallet className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="text-[28px] font-extrabold text-white tracking-tight mb-2">${earningsData?.available_for_withdrawal ? Number(earningsData.available_for_withdrawal).toFixed(2) : '0.00'}</div>
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="w-full mt-2 py-3 bg-white/10 hover:bg-emerald-500/20 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all border border-white/10 hover:border-emerald-500/30 active:scale-[0.98] shadow-lg"
            >
              Request Withdrawal
            </button>
          </motion.div>

          {/* Pending Balance */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl bg-orange-500 p-5 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 shadow-xl border-none">
            <div className="flex justify-between items-start mb-2">
              <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">Pending Balance</span>
              <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shadow-inner">
                <Clock className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="text-[28px] font-extrabold text-white tracking-tight mb-2">${earningsData?.pending_balance ? Number(earningsData.pending_balance).toFixed(2) : '0.00'}</div>
            <div className="mt-2 px-3 py-1.5 bg-white/10 rounded-lg text-center border border-white/10">
              <span className="text-[9px] font-bold text-white uppercase tracking-wider">In pending requests</span>
            </div>
          </motion.div>

          {/* Total Earnings */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl bg-blue-600 p-5 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 shadow-xl border-none">
            <div className="flex justify-between items-start mb-2">
              <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">Total Earnings</span>
              <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shadow-inner">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="text-[28px] font-extrabold text-white tracking-tight mb-2">${earningsData?.total_earnings ? Number(earningsData.total_earnings).toFixed(2) : '0.00'}</div>
            <div className="mt-2 px-3 py-1.5 bg-white/10 rounded-lg text-center border border-white/10">
              <span className="text-[9px] font-bold text-white uppercase tracking-wider">Lifetime revenue</span>
            </div>
          </motion.div>

          {/* Total Withdrawn */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl bg-purple-600 p-5 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 shadow-xl border-none">
            <div className="flex justify-between items-start mb-2">
              <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">Total Withdrawn</span>
              <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shadow-inner">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="text-[28px] font-extrabold text-white tracking-tight mb-2">${earningsData?.total_withdrawn ? Number(earningsData.total_withdrawn).toFixed(2) : '0.00'}</div>
            <div className="mt-2 px-3 py-1.5 bg-white/10 rounded-lg text-center border border-white/10">
              <span className="text-[9px] font-bold text-white uppercase tracking-wider">Paid to you</span>
            </div>
          </motion.div>
        </div>

        {/* Chart Section */}
        <div className="bg-[#0F1720] border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">Earnings Trend</h2>
              <p className="text-[9px] font-bold text-[#8B949E] uppercase tracking-widest mt-2">Historical revenue and order distribution</p>
            </div>
            {chartLabels.length > 0 && (
              <div className="px-4 py-2 bg-white/5 rounded-full border border-white/10">
                <span className="text-[9px] font-bold text-[#8B949E] uppercase tracking-widest">Last {chartLabels.length} Days</span>
              </div>
            )}
          </div>
          <div className="h-96 w-full">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Commission Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[#0D1117] border border-white/10 rounded-[32px] p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Percent className="h-5 w-5 text-indigo-400" />
                </div>
                <span className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest">Base Rate: {commissionData?.base_rate}%</span>
              </div>
              <p className="text-[9px] font-bold text-[#8B949E] uppercase tracking-widest mb-2">Platform Fee</p>
              <div className="flex items-end gap-2 mb-4">
                <span className="text-2xl font-black text-white">{commissionData?.current_effective_rate}%</span>
              </div>
              {commissionData?.active_tier && (
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-1">
                    <Award className="h-3 w-3 mr-2" />
                    Tier: {commissionData.active_tier.name}
                  </div>
                  <p className="text-[9px] text-[#8B949E] font-bold">
                    Threshold: ${commissionData.active_tier.min_sales} → {commissionData.active_tier.rate}%
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#0D1117] border border-white/10 rounded-[32px] p-6 shadow-2xl lg:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <Layers className="h-5 w-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Active Protocols</h3>
                </div>
                <span className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest">Sales: ${commissionData?.total_sales_volume.toFixed(2)}</span>
              </div>

              {commissionData?.active_rules && commissionData.active_rules.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {commissionData.active_rules.map((rule: any, i: number) => (
                    <div key={i} className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex justify-between items-center group hover:border-purple-500/30 transition-all">
                      <div>
                        <p className="text-[10px] font-black text-white uppercase tracking-widest">{rule.name}</p>
                        <p className="text-[9px] text-[#8B949E] font-bold mt-1">{rule.type}</p>
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[10px] font-black text-purple-400">
                        {rule.rate}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 bg-white/[0.01] border border-white/5 border-dashed rounded-3xl">
                  <p className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">No custom protocols active</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Withdrawal Requests */}
        <div className="bg-[#0F1720] border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">Withdrawal History</h2>
              <p className="text-[9px] font-bold text-[#8B949E] uppercase tracking-widest mt-2">Monitor your disbursement status</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-white/50" />
            </div>
          </div>

          <div className="space-y-4">
            {earningsData?.payout_requests?.length ? (
              earningsData.payout_requests.map((request) => (
                <div key={request.id} className="group bg-white/[0.02] border border-white/5 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:bg-white/[0.04] transition-all hover:border-white/10">
                  <div className="flex items-center gap-6">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all ${request.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                      request.status === 'approved' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                        request.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                          'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                      {request.status === 'pending' && <Clock className="h-5 w-5" />}
                      {request.status === 'approved' && <ArrowUpRight className="h-5 w-5" />}
                      {request.status === 'completed' && <CheckCircle className="h-5 w-5" />}
                      {request.status === 'rejected' && <AlertCircle className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <p className="text-lg font-bold text-white tracking-tight">${request.amount.toFixed(2)}</p>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${request.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                          request.status === 'approved' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                            request.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                              'bg-red-500/10 border-red-500/20 text-red-500'
                          }`}>
                          {request.status}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">
                        Requested {format(new Date(request.requested_at), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {request.admin_notes && (
                      <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 max-w-[200px]">
                        <p className="text-[9px] text-[#8B949E] italic leading-relaxed">"{request.admin_notes}"</p>
                      </div>
                    )}
                    {request.completed_at && (
                      <p className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest opacity-50">
                        {request.status === 'completed' ? 'Finalized' : 'Updated'} {format(new Date(request.completed_at), 'MMM d')}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-white/[0.01] border border-white/5 border-dashed rounded-[32px]">
                <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                  <ArrowDownCircle className="h-8 w-8 text-white/20" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">No Withdrawal Protocol</h3>
                <p className="text-[10px] font-black text-[#8B949E] uppercase tracking-wider mt-2">Submit your first request once balance is available</p>
              </div>
            )}
          </div>
        </div>

        {/* Earnings Breakdown Table */}
        <div className="bg-[#0F1720] border border-white/[0.08] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">Protocol Detailed Breakdown</h2>
              <p className="text-[10px] font-black text-[#8B949E] uppercase tracking-[0.2em] mt-2">Granular audit of individual sales and platform fees</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Layers className="h-5 w-5 text-white/50" />
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-separate border-spacing-y-3">
              <thead>
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-[#8B949E] uppercase tracking-widest">Transaction ID</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[#8B949E] uppercase tracking-widest">Asset Name</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[#8B949E] uppercase tracking-widest">Gross Value</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[#8B949E] uppercase tracking-widest">Platform Fee</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[#8B949E] uppercase tracking-widest text-[#3CFF9E]">Net Proceeds</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[#8B949E] uppercase tracking-widest">Date Block</th>
                </tr>
              </thead>
              <tbody>
                {earningsData?.earnings_breakdown?.length ? (
                  earningsData.earnings_breakdown.map((earning, index) => (
                    <tr key={index} className="group bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                      <td className="px-6 py-5 rounded-l-2xl border-y border-l border-white/5 font-mono text-xs text-white/60 group-hover:text-white">#{earning.order_id}</td>
                      <td className="px-6 py-5 border-y border-white/5 text-xs font-bold text-white">{earning.product_name}</td>
                      <td className="px-6 py-5 border-y border-white/5 text-xs font-black text-white/80">${earning.gross_amount.toFixed(2)}</td>
                      <td className="px-6 py-5 border-y border-white/5 text-xs font-black text-red-400/80">-${earning.platform_fee.toFixed(2)}</td>
                      <td className="px-6 py-5 border-y border-white/5 text-sm font-black text-[#3CFF9E]">${earning.net_earning.toFixed(2)}</td>
                      <td className="px-6 py-5 rounded-r-2xl border-y border-r border-white/5 text-[10px] font-bold text-[#8B949E] uppercase tracking-tighter">
                        {format(new Date(earning.date), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-20 bg-white/[0.01] border border-white/5 border-dashed rounded-[32px]">
                      <p className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">No transactions detected in current cycle</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Request Withdrawal Modal */}
        {showWithdrawModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              ref={modalRef}
              className="w-full max-w-2xl bg-[#0D1117] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl p-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider">Request Payout</h3>
                  <p className="text-[10px] font-black text-[#8B949E] uppercase tracking-[0.2em] mt-2">Submit a payout request to withdraw your earnings</p>
                </div>
                <button onClick={() => setShowWithdrawModal(false)} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all">
                  <X className="h-5 w-5 text-white/50" />
                </button>
              </div>

              <div className="space-y-8">
                {/* Amount Input */}
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">Withdrawal Amount</label>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Available: ${earningsData?.available_for_withdrawal ? Number(earningsData.available_for_withdrawal).toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-[#3CFF9E]/40 group-focus-within:text-[#3CFF9E] transition-colors">$</span>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full pl-12 pr-6 py-5 bg-white/[0.02] border border-white/10 rounded-2xl text-4xl font-black text-white focus:outline-none focus:border-[#3CFF9E]/50 focus:bg-white/[0.04] transition-all shadow-inner"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-[9px] font-black text-amber-500/80 uppercase tracking-wider text-center">Minimum withdrawal amount: $100.00</span>
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div className="space-y-4 p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-[#3CFF9E]/10 flex items-center justify-center border border-[#3CFF9E]/20">
                      <CreditCard className="h-4 w-4 text-[#3CFF9E]" />
                    </div>
                    <label className="text-[10px] font-black text-white uppercase tracking-widest">Payment Destination</label>
                  </div>

                  <div className="relative">
                    <select
                      value={paymentMethodType}
                      onChange={(e) => {
                        setPaymentMethodType(e.target.value);
                        setPaymentDetails({});
                      }}
                      className="w-full px-6 py-4 bg-[#070B0F] border border-white/10 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-[#3CFF9E]/50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="" disabled className="bg-[#0D1117]">Select method...</option>
                      <option value="bank_transfer" className="bg-[#0D1117]">Bank Transfer</option>
                      <option value="visa_card" className="bg-[#0D1117]">Visa / MasterCard</option>
                      <option value="paypal" className="bg-[#0D1117]">PayPal</option>
                      <option value="mobile_money" className="bg-[#0D1117]">Mobile Money</option>
                      <option value="wise" className="bg-[#0D1117]">Wise (TransferWise)</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ArrowDownCircle className="h-4 w-4 text-[#8B949E]" />
                    </div>
                  </div>

                  {/* Dynamic Fields Section */}
                  <AnimatePresence mode="wait">
                    {paymentMethodType === 'bank_transfer' && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Bank Name"
                            value={paymentDetails.bank_name || ''}
                            onChange={(e) => setPaymentDetails({ ...paymentDetails, bank_name: e.target.value })}
                            className="bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#3CFF9E]/50 outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Account Holder"
                            value={paymentDetails.account_name || ''}
                            onChange={(e) => setPaymentDetails({ ...paymentDetails, account_name: e.target.value })}
                            className="bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#3CFF9E]/50 outline-none"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Account Number"
                          value={paymentDetails.account_number || ''}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, account_number: e.target.value })}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#3CFF9E]/50 outline-none font-mono"
                        />
                        <input
                          type="text"
                          placeholder="SWIFT / BIC Code (Optional)"
                          value={paymentDetails.swift_bic_code || ''}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, swift_bic_code: e.target.value })}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#3CFF9E]/50 outline-none"
                        />
                      </motion.div>
                    )}

                    {paymentMethodType === 'visa_card' && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3 pt-2">
                        <input
                          type="text"
                          placeholder="Cardholder Name"
                          value={paymentDetails.card_holder_name || ''}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, card_holder_name: e.target.value })}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#3CFF9E]/50 outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Card Number"
                          value={paymentDetails.card_number || ''}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, card_number: e.target.value })}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#3CFF9E]/50 outline-none font-mono"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="MM/YY"
                            value={paymentDetails.expiry || ''}
                            onChange={(e) => setPaymentDetails({ ...paymentDetails, expiry: e.target.value })}
                            className="bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#3CFF9E]/50 outline-none text-center"
                          />
                          <input
                            type="text"
                            placeholder="CVV"
                            value={paymentDetails.cvv || ''}
                            onChange={(e) => setPaymentDetails({ ...paymentDetails, cvv: e.target.value })}
                            className="bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#3CFF9E]/50 outline-none text-center"
                          />
                        </div>
                      </motion.div>
                    )}

                    {paymentMethodType === 'paypal' && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3 pt-2">
                        <input
                          type="email"
                          placeholder="PayPal Email Address"
                          value={paymentDetails.paypal_email || ''}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, paypal_email: e.target.value })}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-6 py-4 text-sm text-white focus:border-[#3CFF9E]/50 outline-none"
                        />
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider ml-1">Must be a verified account</p>
                      </motion.div>
                    )}

                    {paymentMethodType === 'mobile_money' && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3 pt-2">
                        <input
                          type="text"
                          placeholder="Provider (e.g. M-Pesa, MTN)"
                          value={paymentDetails.provider || ''}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, provider: e.target.value })}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#3CFF9E]/50 outline-none"
                        />
                        <input
                          type="tel"
                          placeholder="Phone Number"
                          value={paymentDetails.phone_number || ''}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, phone_number: e.target.value })}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#3CFF9E]/50 outline-none font-mono"
                        />
                      </motion.div>
                    )}

                    {paymentMethodType === 'wise' && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3 pt-2">
                        <input
                          type="email"
                          placeholder="Wise Email Address"
                          value={paymentDetails.wise_email || ''}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, wise_email: e.target.value })}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-6 py-4 text-sm text-white focus:border-[#3CFF9E]/50 outline-none"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Notes */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">Protocol Notes (Optional)</label>
                  <textarea
                    value={withdrawNotes}
                    onChange={(e) => setWithdrawNotes(e.target.value)}
                    className="w-full px-6 py-4 bg-white/[0.02] border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:border-[#3CFF9E]/50 h-24 resize-none"
                    placeholder="Enter additional details for admin processing..."
                  />
                </div>

                {/* Submit */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowWithdrawModal(false)}
                    className="flex-1 h-14 rounded-full bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleWithdraw}
                    disabled={withdrawalMutation.isPending || !paymentMethodType}
                    className="flex-[2] h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white border border-emerald-400/20 hover:from-emerald-500 hover:to-emerald-700 transition-all shadow-xl shadow-emerald-900/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {withdrawalMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Processing...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 text-emerald-100" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Submit Request</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Earnings;