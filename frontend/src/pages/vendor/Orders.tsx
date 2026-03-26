import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Truck, Loader2, Search, Filter, CheckCircle, Clock, AlertCircle, Eye, User, Mail, Phone, MapPin, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { vendorAPI } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface OrderItem {
  id: string;
  product: {
    id: string;
    name: string;
    image: string;
    price: number;
  };
  quantity: number;
  price: number;
  vendor_earning: number;
}

interface Order {
  id: string;
  order_number: string;
  status: 'pending' | 'payment_confirmed' | 'awaiting_approval' | 'approved' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  total_amount: number;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  customer: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
  };
  shipping_address: {
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  admin_approved: boolean;
  admin_approved_by_name?: string;
  admin_approval_date?: string;
  admin_notes?: string;
  vendor_can_process: boolean;
  processing_started_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  progress_percentage: number;
  can_vendor_process: boolean;
  tracking_number?: string;
}

const ORDER_STATUSES = [
  { value: 'all', label: 'All Orders' },
  { value: 'pending', label: 'Pending Payment' },
  { value: 'payment_confirmed', label: 'Payment Confirmed' },
  { value: 'awaiting_approval', label: 'Awaiting Admin Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

const VendorOrders = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [trackingNumber, setTrackingNumber] = useState('');

  const { data: ordersData, isLoading, isError, refetch } = useQuery({
    queryKey: ['vendor-orders', statusFilter, searchTerm, dateRange],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;
      if (dateRange.start) params.start_date = dateRange.start;
      if (dateRange.end) params.end_date = dateRange.end;

      const response = await vendorAPI.getOrders(params);
      return response.data;
    },
  });

  // Mutations for order processing
  const startProcessingMutation = useMutation({
    mutationFn: (orderId: string) => vendorAPI.startProcessing(orderId),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Order processing started.',
      });
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to start processing.',
        variant: 'destructive',
      });
    },
  });

  const markShippedMutation = useMutation({
    mutationFn: ({ orderId, trackingNumber }: { orderId: string; trackingNumber: string }) =>
      vendorAPI.markShipped(orderId, trackingNumber),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Order marked as shipped.',
      });
      setTrackingNumber('');
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to mark as shipped.',
        variant: 'destructive',
      });
    },
  });

  // Admin will confirm delivery after vendor ships
  // Vendor cannot mark as delivered anymore

  // Note: updateOrderStatus method needs to be added to vendorAPI if not present
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      // This method may need to be implemented in the API service
      console.log('Updating order status:', orderId, status);
      toast({
        title: 'Success',
        description: 'Order status updated successfully.',
      });
      refetch();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 backdrop-blur-md inline-block';
    const label = ORDER_STATUSES.find(s => s.value === status)?.label || status;
    let colorClass = '';

    switch (status) {
      case 'pending':
        colorClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
        break;
      case 'payment_confirmed':
        colorClass = 'bg-[#3CFF9E]/10 text-[#3CFF9E] border-[#3CFF9E]/20 shadow-[0_0_15px_rgba(60,255,158,0.1)]';
        break;
      case 'awaiting_approval':
        colorClass = 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]';
        break;
      case 'approved':
      case 'processing':
      case 'shipped':
        colorClass = 'bg-[#3CFF9E]/20 text-white border-[#3CFF9E]/30 shadow-[0_0_20px_rgba(60,255,158,0.15)]';
        break;
      case 'delivered':
        colorClass = 'bg-emerald-500/20 text-[#3CFF9E] border-emerald-500/30 shadow-[0_0_20px_rgba(34,197,94,0.1)]';
        break;
      case 'cancelled':
      case 'refunded':
        colorClass = 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]';
        break;
      default:
        colorClass = 'bg-white/5 text-gray-400 border-white/10';
    }

    return <span className={`${baseClasses} ${colorClass}`}>{label}</span>;
  };

  const getProgressBar = (order: Order) => {
    const percentage = order.progress_percentage;
    return (
      <div className="w-full space-y-2">
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">Order Progress</span>
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{percentage}%</span>
        </div>
        <div className="w-full bg-white/[0.03] rounded-full h-1.5 border border-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
          />
        </div>
      </div>
    );
  };

  const getActionButtons = (order: Order) => {
    const buttons = [];

    if (order.status === 'awaiting_approval') {
      buttons.push(
        <div key="waiting" className="flex items-center bg-orange-500/10 border border-orange-500/20 text-orange-400 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider">
          <Clock className="h-3.5 w-3.5 mr-2" />
          Awaiting Admin Approval
        </div>
      );
    }

    if (order.can_vendor_process && order.status === 'approved') {
      buttons.push(
        <motion.button
          key="start-processing"
          whileHover={{ scale: 1.02, translateY: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => startProcessingMutation.mutate(order.id)}
          disabled={startProcessingMutation.isPending}
          className="flex items-center px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-900/20 border border-emerald-400/20 disabled:opacity-50 transition-all font-sans"
        >
          <CheckCircle className="h-3.5 w-3.5 mr-2" />
          Start Processing
        </motion.button>
      );
    }

    if (order.status === 'processing') {
      buttons.push(
        <div key="ship-form" className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-48">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#586069]" />
            <input
              type="text"
              placeholder="TRACKING NUMBER"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-[11px] font-bold text-white placeholder-[#586069] focus:outline-none focus:border-emerald-500/50 transition-all uppercase tracking-tight"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => markShippedMutation.mutate({ orderId: order.id, trackingNumber })}
            disabled={markShippedMutation.isPending || !trackingNumber}
            className="w-full sm:w-auto flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-emerald-900/40 border border-emerald-400/20 disabled:opacity-50 disabled:grayscale transition-all font-sans"
          >
            <Truck className="h-3.5 w-3.5 mr-2" />
            Ship Order
          </motion.button>
        </div>
      );
    }

    if (order.status === 'shipped') {
      buttons.push(
        <div
          key="waiting-delivery"
          className="flex items-center px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-[#3CFF9E] text-[11px] font-black uppercase tracking-wider rounded-xl"
        >
          <Package className="h-3.5 w-3.5 mr-2 text-emerald-400" />
          Pending Delivery Confirmation
        </div>
      );
    }

    return buttons;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 flex items-center justify-center p-3 sm:p-6">
        <div className="text-center">
          <div className="bg-gradient-to-r from-emerald-700 via-green-800 to-emerald-900 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center shadow-2xl">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-semibold bg-gradient-to-r from-emerald-700 via-green-800 to-emerald-900 bg-clip-text text-transparent">
            Loading your orders...
          </h2>
          <p className="text-gray-600 mt-2">Please wait while we fetch your order data</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 flex items-center justify-center p-6">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200/50 p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent mb-2">
              Something went wrong
            </h3>
            <p className="text-gray-600 mb-6">Error loading orders. Please try again later.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const orders = ordersData || [];

  return (
    <div className="flex-1 relative min-h-screen text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 pb-12 bg-[#070B0F]">
      {/* Premium Background Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
          style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Focal point glow orbs */}
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[20%] -right-[5%] w-[35%] h-[35%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-[1700px] mx-auto pt-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/20 flex items-center justify-center shadow-inner">
                <Package className="h-5 w-5 text-[#3CFF9E]" />
              </div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-green-500">
                Orders
              </h1>
            </div>
            <p className="text-gray-400 mt-1 font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9D]" />
              Review and manage your store's orders
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto"
          >
            <div className="relative w-full sm:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#586069] group-focus-within:text-[#3CFF9E] transition-colors" />
              <input
                type="text"
                placeholder="Search orders..."
                className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs font-bold text-white placeholder-[#586069] focus:outline-none focus:border-[#3CFF9E]/50 transition-all uppercase tracking-widest backdrop-blur-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </motion.div>
        </div>

        {/* Intelligence Filters Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-8 rounded-2xl border border-white/[0.08] bg-[#0F1720] p-6 shadow-lg"
          >
            <div className="flex items-center gap-2 mb-6">
              <Clock className="h-3.5 w-3.5 text-[#3CFF9E]" />
              <h2 className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Date Range</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <span className="text-[9px] font-black text-[#586069] uppercase tracking-widest ml-1">START DATE</span>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-xs font-bold text-[#8B949E] focus:outline-none focus:border-[#3CFF9E]/50 transition-all inverse-color-scheme"
                />
              </div>
              <div className="space-y-2">
                <span className="text-[9px] font-black text-[#586069] uppercase tracking-widest ml-1">END DATE</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-xs font-bold text-[#8B949E] focus:outline-none focus:border-[#3CFF9E]/50 transition-all inverse-color-scheme"
                  min={dateRange.start}
                />
              </div>
              <div className="flex items-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDateRange({ start: '', end: '' })}
                  className="w-full py-3.5 bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] text-[#8B949E] text-xs font-bold rounded-xl transition-all"
                >
                  Clear Dates
                </motion.button>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-4 rounded-2xl border border-white/[0.08] bg-[#0F1720] p-6 shadow-lg"
          >
            <div className="flex items-center gap-2 mb-6">
              <Filter className="h-3.5 w-3.5 text-[#3CFF9E]" />
              <h2 className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Filter by Status</h2>
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3.5 text-xs font-bold text-[#8B949E] focus:outline-none focus:border-[#3CFF9E]/50 transition-all uppercase tracking-widest"
              >
                {ORDER_STATUSES.map((status) => (
                  <option key={status.value} value={status.value} className="bg-[#0F1720] text-white">
                    {status.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#586069]">
                <Filter className="h-4 w-4 text-[#3CFF9E]/40" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Order List */}
        <div className="space-y-6">
          {orders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-24 text-center glassmorphic-card"
            >
              <div className="w-20 h-20 bg-emerald-500/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/10">
                <Package className="h-10 w-10 text-[#586069]" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-[0.2em] text-white mb-2">No Orders Found</h3>
              <p className="text-[#8B949E] text-sm font-medium italic">No orders match the current filter criteria.</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {orders.map((order: Order, idx: number) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0F1720] p-6 hover:border-[#3CFF9E]/30 transition-all duration-300 shadow-lg"
                >
                  {/* Subtle hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#3CFF9E]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative z-10 flex flex-col xl:flex-row gap-8">
                    {/* DETAILS SECTION */}
                    <div className="xl:w-[20%] space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider leading-tight">Order ID</p>
                          <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">#{order.id}</h3>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider leading-tight">Date Placed</p>
                        <p className="text-xs font-semibold text-white/80">{format(new Date(order.created_at), 'MMM dd, yyyy • HH:mm')}</p>
                      </div>
                      <div className="pt-2">
                        {getStatusBadge(order.status)}
                      </div>
                    </div>

                    {/* ITEMS & SUMMARY SECTION */}
                    <div className="xl:w-[60%] flex flex-col gap-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <p className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Items</p>
                          <div className="space-y-3">
                            {order.items.slice(0, 2).map((item) => (
                              <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                                <img src={item.product.image} className="w-10 h-10 rounded-lg object-cover shadow-sm border border-white/10" alt="" />
                                <div>
                                  <p className="text-xs font-bold text-white tracking-tight truncate max-w-[150px]">{item.product.name}</p>
                                  <p className="text-[10px] font-semibold text-[#8B949E] uppercase">QTY: {item.quantity}</p>
                                </div>
                              </div>
                            ))}
                            {order.items.length > 2 && (
                              <p className="text-[9px] font-black text-emerald-400/60 uppercase tracking-widest pl-2">+{order.items.length - 2} Additional Units</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <p className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Customer Info</p>
                          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-emerald-400 opacity-50" />
                              <p className="text-xs font-bold text-white truncate">{order.customer.full_name}</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="h-3 w-3 text-emerald-400 opacity-50 mt-0.5" />
                              <p className="text-[10px] font-medium text-[#8B949E] line-clamp-2">
                                {order.shipping_address.city}, {order.shipping_address.postal_code}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center bg-white/[0.02] rounded-xl border border-white/5 p-4">
                        {getProgressBar(order)}
                        <div className="flex justify-between sm:justify-end items-center gap-8 px-4">
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider leading-tight">TOTAL AMOUNT</p>
                            <p className="text-xl font-bold text-white tracking-tight">${Number(order.total_amount).toFixed(2)}</p>
                          </div>
                          <div className="text-right border-l border-white/10 pl-6">
                            <p className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider leading-tight">YOUR EARNING</p>
                            <p className="text-lg font-bold text-emerald-400 tracking-tight">${Number(order.items.reduce((sum, item) => sum + (Number(item.vendor_earning) || 0), 0)).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ACTIONS SECTION */}
                    <div className="xl:w-[20%] flex flex-col justify-center gap-3">
                      {getActionButtons(order)}
                      <motion.button
                        whileHover={{ scale: 1.02, translateY: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedOrder(order)}
                        className="flex items-center justify-center px-5 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all"
                      >
                        <Eye className="h-4 w-4 mr-2 text-[#8B949E]" />
                        View Details
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order Details Overlay */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#070B0F]/90 backdrop-blur-xl flex items-center justify-center p-4 z-[100]"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#0F1720] border border-white/10 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-20 bg-[#0F1720]/80 backdrop-blur-xl border-b border-white/5 p-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/20 flex items-center justify-center">
                    <Eye className="h-5 w-5 text-[#3CFF9E]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-green-500">Order Details</h2>
                    <p className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider leading-none mt-1">Order #{selectedOrder.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                >
                  <X className="h-5 w-5 text-[#8B949E]" />
                </button>
              </div>

              <div className="p-8 space-y-10">
                {/* Visual Status Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                    <p className="text-[10px] font-black text-[#586069] uppercase tracking-widest">Order Status</p>
                    <div className="pt-1">
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                  </div>
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                    <p className="text-[10px] font-black text-[#586069] uppercase tracking-widest">Date Placed</p>
                    <p className="text-sm font-black text-white uppercase">{format(new Date(selectedOrder.created_at), 'PPP ')}</p>
                    <p className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest">{format(new Date(selectedOrder.created_at), 'hh:mm:ss a')}</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                    <p className="text-[10px] font-black text-[#586069] uppercase tracking-widest">Payment Details</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-black text-white tracking-widest">${selectedOrder.total_amount}</p>
                      <p className="text-[10px] font-black text-[#3CFF9E] uppercase tracking-widest">Verified</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left: Customer & Address */}
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-[#122A20]/20 border border-emerald-500/20">
                      <div className="flex items-center gap-3 mb-6">
                        <User className="h-4 w-4 text-emerald-400" />
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Customer Info</h3>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-black text-emerald-400/50 uppercase tracking-widest mb-1">NAME</p>
                          <p className="text-sm font-black text-white uppercase tracking-tight">{selectedOrder.customer.full_name}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-emerald-400/50 uppercase tracking-widest mb-1">EMAIL</p>
                          <p className="text-sm font-black text-[#3CFF9E] truncate lowercase">{selectedOrder.customer.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-3 mb-6">
                        <MapPin className="h-4 w-4 text-[#8B949E]" />
                        <h3 className="text-xs font-black text-[#8B949E] uppercase tracking-widest">Shipping Address</h3>
                      </div>
                      <div className="text-xs font-bold text-white leading-relaxed space-y-1">
                        <p>{selectedOrder.shipping_address.address_line1}</p>
                        {selectedOrder.shipping_address.address_line2 && <p>{selectedOrder.shipping_address.address_line2}</p>}
                        <p className="text-emerald-400">{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state}</p>
                        <p>{selectedOrder.shipping_address.postal_code}, {selectedOrder.shipping_address.country}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Item Breakdown */}
                  <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
                    <div className="p-5 border-b border-white/5 bg-white/[0.01]">
                      <h3 className="text-xs font-black text-white uppercase tracking-widest">Order Items</h3>
                    </div>
                    <div className="divide-y divide-white/5">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="p-5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <img src={item.product.image} className="w-12 h-12 rounded-xl object-cover border border-white/10" alt="" />
                            <div>
                              <h4 className="text-[11px] font-black text-white uppercase tracking-tight">{item.product.name}</h4>
                              <p className="text-[9px] font-bold text-[#8B949E] uppercase">Unit Prop: ${item.product.price} × {item.quantity}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-white">${item.price}</p>
                            <p className="text-[9px] font-black text-[#3CFF9E] uppercase tracking-tighter">Earn: ${item.vendor_earning}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-6 bg-emerald-500/5 border-t border-emerald-500/10 flex justify-between items-center">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">YOUR EARNING</p>
                      <p className="text-xl font-black text-[#3CFF9E] tracking-widest">
                        ${selectedOrder.items.reduce((sum, item) => sum + (Number(item.vendor_earning) || 0), 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Internal Comms / Admin Feedback */}
                {selectedOrder.admin_notes && (
                  <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="h-3.5 w-3.5 text-blue-400" />
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Admin Notes</span>
                    </div>
                    <p className="text-xs font-medium text-white/80 leading-relaxed italic">{selectedOrder.admin_notes}</p>
                  </div>
                )}

              </div>

              <div className="p-8 bg-[#070B0F]/50 border-t border-white/5 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedOrder(null)}
                  className="px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorOrders;