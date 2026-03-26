import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Package,
  Truck,
  Eye,
  Search,
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Calendar,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  PlayCircle,
  CheckCircle2,
  Loader2,
  Settings,
  ArrowRight,
  Plus,
  Phone,
  Mail,
  MapPin,
  User,
  X,
  ExternalLink,
  Activity,
  UserCheck,
  Store
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { adminAPI, resolveMediaUrl } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  shipping_address?: {
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  } | string;
  tracking_number?: string;
  payment_method?: string;
  customer: {
    id: string;
    full_name: string;
    email: string;
  };
  items: Array<{
    id: string;
    product: {
      name: string;
      image: string;
      vendor?: {
        id: string;
        store_name: string;
        full_name: string;
        email?: string;
        phone?: string;
      };
    };
    quantity: number;
    price: number;
  }>;
  admin_approved: boolean;
  admin_approved_by_name?: string;
  admin_approval_date?: string;
  admin_notes?: string;
  progress_percentage: number;
  vendor?: {
    id: string;
    store_name: string;
    full_name: string;
  };
}

const OrderManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'ship' | 'details' | 'process' | 'complete' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [approvalNotes, setApprovalNotes] = useState('');

  // Fetch orders using adminAPI
  const { data: orders, isLoading, error, refetch } = useQuery<Order[]>({
    queryKey: ['admin-orders', statusFilter, searchTerm, dateRange],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending_approval') {
          params.approval_status = 'pending';
        } else {
          params.status = statusFilter;
        }
      }
      if (searchTerm) params.search = searchTerm;
      if (dateRange.start) params.start_date = dateRange.start;
      if (dateRange.end) params.end_date = dateRange.end;

      const response = await adminAPI.getOrders(params);
      return response.data;
    },
  });

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (!orders) return { total: 0, pending: 0, approved: 0, revenue: 0 };

    return {
      total: orders.length,
      pending: orders.filter((o: Order) => o.status === 'awaiting_approval').length,
      approved: orders.filter((o: Order) => o.admin_approved).length,
      revenue: orders.reduce((sum: number, o: Order) => sum + parseFloat(o.total_amount.toString()), 0)
    };
  }, [orders]);

  // Approve order mutation
  const approveOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await adminAPI.approveOrder(orderId, 'Approved by admin');
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Order approved successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedOrder(null);
      setApprovalNotes('');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to approve order',
        variant: 'destructive',
      });
    },
  });

  // Reject order mutation
  const rejectOrderMutation = useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: string; notes: string }) => {
      return await adminAPI.rejectOrder(orderId, notes);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Order rejected successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedOrder(null);
      setApprovalNotes('');
      setActionType(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to reject order',
        variant: 'destructive',
      });
    },
  });

  // Mark order as in process mutation
  const processOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await adminAPI.updateOrderStatus(orderId, 'processing', 'Order processing started by admin');
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Order marked as in process',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedOrder(null);
      setApprovalNotes('');
      setActionType(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive',
      });
    },
  });

  // Mark as delivered mutation
  const markDeliveredMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await adminAPI.updateOrderStatus(orderId, 'delivered', 'Order marked as delivered by admin');
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Order marked as delivered',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedOrder(null);
      setApprovalNotes('');
      setActionType(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to mark order as delivered',
        variant: 'destructive',
      });
    },
  });

  // Complete order mutation
  const finalizeOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await adminAPI.updateOrderStatus(orderId, 'completed', 'Order finalized and marked completed by admin');
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Order marked as completed',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedOrder(null);
      setApprovalNotes('');
      setActionType(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to mark order as completed',
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = (status: string, isSmall: boolean = false) => {
    const px = isSmall ? 'px-2.5' : 'px-3';
    const py = isSmall ? 'py-1' : 'py-1';
    const textSize = isSmall ? 'text-[10px]' : 'text-xs';
    const shadowStyle = isSmall ? 'shadow' : 'shadow-sm';
    const baseClasses = `inline-flex items-center ${px} ${py} rounded-full ${textSize} font-bold border-2 ${shadowStyle}`;

    switch (status) {
      case 'pending':
        return `${baseClasses} bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border-amber-200 shadow-amber-100`;
      case 'payment_confirmed':
        return `${baseClasses} bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200 shadow-blue-100`;
      case 'awaiting_approval':
        return `${baseClasses} bg-gradient-to-r from-orange-50 to-red-50 text-orange-700 border-orange-200 shadow-orange-100 animate-pulse`;
      case 'approved':
        return `${baseClasses} bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-emerald-200 shadow-emerald-100`;
      case 'processing':
        return `${baseClasses} bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-700 border-cyan-200 shadow-cyan-100`;
      case 'shipped':
        return `${baseClasses} bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border-indigo-200 shadow-indigo-100`;
      case 'delivered':
        return `${baseClasses} bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 border-teal-200 shadow-teal-100`;
      case 'completed':
        return `${baseClasses} bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border-emerald-300 shadow-emerald-200`;
      case 'cancelled':
        return `${baseClasses} bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700 border-gray-200 shadow-gray-100`;
      case 'rejected':
        return `${baseClasses} bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200 shadow-red-100`;
      case 'refunded':
        return `${baseClasses} bg-gradient-to-r from-pink-50 to-rose-50 text-pink-700 border-pink-200 shadow-pink-100`;
      default:
        return `${baseClasses} bg-gray-50 text-gray-500 border-gray-100`;
    }
  };

  const getStatusIcon = (status: string) => {
    const iconClasses = "w-3.5 h-3.5 mr-1";
    switch (status) {
      case 'pending':
        return <Clock className={iconClasses} />;
      case 'payment_confirmed':
        return <DollarSign className={iconClasses} />;
      case 'awaiting_approval':
        return <AlertCircle className={iconClasses} />;
      case 'approved':
        return <CheckCircle className={iconClasses} />;
      case 'processing':
        return <Package className={iconClasses} />;
      case 'shipped':
        return <Truck className={iconClasses} />;
      case 'delivered':
        return <CheckCircle2 className={iconClasses} />;
      case 'completed':
        return <CheckCircle className={`${iconClasses} text-emerald-600`} />;
      case 'cancelled':
        return <XCircle className={iconClasses} />;
      default:
        return <Clock className={iconClasses} />;
    }
  };

  const getProgressBar = (percentage: number, status: string) => {
    const getProgressColor = () => {
      if (percentage === 100) return 'from-emerald-500 via-green-500 to-teal-600';
      if (percentage >= 80) return 'from-indigo-500 via-blue-500 to-cyan-600';
      if (percentage >= 60) return 'from-cyan-500 via-blue-500 to-indigo-600';
      if (percentage >= 40) return 'from-emerald-500 via-green-500 to-teal-600';
      if (percentage >= 20) return 'from-blue-500 via-indigo-500 to-purple-600';
      return 'from-amber-500 via-orange-500 to-red-600';
    };

    return (
      <div className="w-full bg-gradient-to-r from-gray-100 to-gray-200 shadow-inner rounded-full h-4 relative">
        <div
          className={`bg-gradient-to-r ${getProgressColor()} shadow-lg h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
          style={{ width: `${percentage}%` }}
        >
          {percentage > 20 && (
            <span className="text-white text-xs font-bold">{percentage}%</span>
          )}
        </div>
        {percentage <= 20 && (
          <span className="absolute right-2 top-0.5 text-gray-600 text-xs font-bold">{percentage}%</span>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-12 w-12 border-4 border-t-transparent border-r-transparent border-b-transparent border-l-[#3CFF9E]"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading orders</h3>
              <p className="mt-1 text-sm text-red-700">
                {error instanceof Error ? error.message : 'Failed to load orders'}
              </p>
              <Button onClick={() => refetch()} className="mt-2" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 relative min-h-screen bg-gradient-to-br from-[#0B0F14] via-[#0D1219] to-[#0F141B] text-[#E6EDF3] pt-1 sm:pt-4 pb-16 sm:pb-20">
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-16 right-10 w-[520px] h-[520px] bg-[rgba(60,179,113,0.16)] rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-16 left-12 w-[520px] h-[520px] bg-[rgba(255,215,0,0.10)] rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 px-4 md:px-8 w-full max-w-full pb-16 sm:pb-20">
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header (Manage Users style) */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mt-2 sm:mt-0"
          >
            <div className="pb-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent leading-loose" style={{ lineHeight: '1.4' }}>
                Order Management
              </h1>
              <p className="text-xl text-gray-300 mt-2 font-medium leading-relaxed">Review, approve, and process customer orders</p>
            </div>
            {/* Removed duplicated small stats cards above action buttons */}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            className="flex items-center space-x-2 sm:space-x-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              onClick={() => refetch()}
              className="bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-600/50 shadow-lg hover:shadow-xl transition-all duration-300 py-2 px-3 sm:px-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button className="bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-600/50 shadow-lg hover:shadow-xl transition-all duration-300 py-2 px-3 sm:px-4">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export Orders</span>
              <span className="sm:hidden">Export</span>
            </Button>
          </motion.div>


          {/* Stats Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700/95 backdrop-blur-sm text-white border-2 border-emerald-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium">Total Orders</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-emerald-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-600 to-red-600/95 backdrop-blur-sm text-white border-2 border-orange-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Pending Approval</p>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-600 to-green-700/95 backdrop-blur-sm text-white border-2 border-green-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Approved Orders</p>
                    <p className="text-2xl font-bold">{stats.approved}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-violet-600 to-purple-700/95 backdrop-blur-sm text-white border-2 border-violet-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-violet-100 text-sm font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold">${stats.revenue.toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-violet-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            className="flex flex-col md:flex-row gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search orders by customer name, email, or order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 h-12 border-2 border-gray-600/50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-800/80 backdrop-blur-sm text-white placeholder-gray-400 shadow-lg transition-all duration-300"
              />
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 h-12 border-2 border-gray-600/50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-800/80 backdrop-blur-sm text-white shadow-lg transition-all duration-300"
            >
              <option value="all">All Orders</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
            </select>
            <Button className="px-6 h-12 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.06)] text-[#B6EBD3] hover:bg-[rgba(255,255,255,0.12)] hover:text-[#E9FFF4] transition-all duration-300 shadow-lg backdrop-blur-sm rounded-full font-medium">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </motion.div>

          {/* Orders Table */}
          <motion.div
            className="bg-[#111827] backdrop-blur-xl rounded-2xl shadow-2xl border border-[#374151] overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="bg-gradient-to-r from-[#10b981] to-[#059669] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ShoppingCart className="h-6 w-6 text-white" />
                <h3 className="text-lg font-semibold text-white">Orders Directory ({orders?.length || 0})</h3>
              </div>
              <Link
                to="/administrator/orders/all"
                className="inline-flex items-center text-sm font-medium text-white hover:text-emerald-100 bg-black/10 hover:bg-black/20 px-4 py-1.5 rounded-full transition-all duration-300"
              >
                View All <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </div>
            <div className="p-6">
              {!orders || orders.length === 0 ? (
                <div className="text-center py-12">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center space-y-3"
                  >
                    <ShoppingCart className="h-12 w-12 text-gray-400" />
                    <p className="text-gray-100 font-medium">No orders found</p>
                    <p className="text-gray-400 text-sm">
                      {statusFilter !== 'all'
                        ? `No orders with status "${statusFilter}"`
                        : 'No orders have been placed yet.'
                      }
                    </p>
                  </motion.div>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.slice(0, 4).map((order: Order) => (
                    <Card key={order.id} className="overflow-hidden hover:shadow-xl hover:shadow-emerald-900/10 transition-all duration-300 bg-gray-900/40 border border-gray-700/50 backdrop-blur-md">

                      {/* Card Header */}
                      <div className="bg-gray-800/40 px-5 py-3 border-b border-gray-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <h3 className="text-sm font-bold text-gray-100 flex items-center gap-1.5">
                            <span className="text-emerald-500">#{order.id}</span>
                          </h3>
                          <div className="h-3 w-px bg-gray-700 hidden sm:block"></div>
                          <p className="text-xs text-gray-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        <div>
                          <span className={getStatusBadge(order.status, true)}>
                            {getStatusIcon(order.status)}
                            {order.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-700/50">

                          {/* 1. Details Section (Left) - 30% */}
                          <div className="w-full md:w-[30%] p-5 space-y-5">
                            <div className="flex justify-between items-center bg-gray-900/20 p-3 rounded-xl border border-gray-700/30">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                  <User className="w-4 h-4 text-blue-400" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-gray-200">{order.customer.full_name}</span>
                                  <span className="text-[10px] text-gray-400">{order.customer.email}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-between items-center bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                              <span className="text-[10px] uppercase text-gray-500 font-bold tracking-widest flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Total
                              </span>
                              <span className="text-base font-black text-emerald-400 font-mono">${order.total_amount}</span>
                            </div>

                            {/* Progress bar */}
                            <div>
                              <div className="flex justify-between items-end mb-1.5">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Progress</p>
                                <p className="text-[10px] font-bold text-emerald-400">{order.progress_percentage}%</p>
                              </div>
                              {getProgressBar(order.progress_percentage, order.status)}
                            </div>
                          </div>

                          {/* 2. Items Section (Middle) - 45% */}
                          <div className="w-full md:w-[45%] p-5 bg-gray-900/20">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5" /> Items ({order.items.length})
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                              {order.items.slice(0, 2).map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30 border border-gray-700/30 hover:bg-gray-800/60 transition-colors">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <img
                                      src={resolveMediaUrl(item.product.image) || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=64&h=64&fit=crop'}
                                      alt={item.product.name}
                                      className="w-8 h-8 rounded border border-gray-700/50 object-cover shrink-0"
                                      title={item.product.name}
                                      onError={(e) => {
                                        const el = e.target as HTMLImageElement;
                                        const fallback = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=64&h=64&fit=crop';
                                        if (el.src !== fallback) el.src = fallback;
                                      }}
                                    />
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-gray-200 truncate uppercase">{item.product.name}</p>
                                      <p className="text-[10px] text-gray-500 font-mono">Qty: {item.quantity}</p>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-xs font-bold text-emerald-400 font-mono">${(Number(item.price) / item.quantity).toFixed(2)}</p>
                                    <p className="text-[8px] text-gray-500 uppercase tracking-widest">each</p>
                                  </div>
                                </div>
                              ))}
                              {order.items.length > 2 && (
                                <div className="text-center py-1 bg-gray-900/30 rounded-lg border border-gray-700/30">
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    +{order.items.length - 2} more item{order.items.length - 2 > 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}
                            </div>

                            {order.admin_notes && (
                              <div className="mt-4 p-2.5 bg-emerald-500/5 rounded-lg border border-emerald-500/10 flex items-start gap-2">
                                <Activity className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-gray-400 italic line-clamp-2">"{order.admin_notes}"</p>
                              </div>
                            )}
                          </div>

                          {/* 3. Actions Section (Right) - 25% */}
                          <div className="w-full md:w-[25%] p-5 flex flex-col justify-between bg-gray-900/40">
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Actions</p>

                              {/* View Details Button - Always Available */}
                              <motion.button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setActionType('details');
                                }}
                                className="w-full inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-lg font-bold transition-all duration-300 shadow bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-white border border-gray-700"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1.5" />
                                View Details
                              </motion.button>

                              {/* APPROVE BUTTON - Show for pending orders */}
                              {(order.status === 'pending' || order.status === 'awaiting_approval' || !order.admin_approved) && (
                                <motion.button
                                  onClick={() => approveOrderMutation.mutate(order.id)}
                                  disabled={approveOrderMutation.isPending}
                                  className="w-full inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-lg font-bold transition-all duration-300 shadow bg-emerald-600 border border-emerald-500 text-white hover:bg-emerald-500 disabled:opacity-50"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  {approveOrderMutation.isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                  )}
                                  Approve
                                </motion.button>
                              )}

                              {/* REJECT BUTTON - Show for pending orders */}
                              {(order.status === 'pending' || order.status === 'awaiting_approval' || !order.admin_approved) && (
                                <motion.button
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setActionType('reject');
                                  }}
                                  className="w-full inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-lg font-bold transition-all duration-300 shadow bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 hover:text-red-400"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                  Reject
                                </motion.button>
                              )}

                              {/* START PROCESSING BUTTON - Show for approved orders */}
                              {order.admin_approved && (order.status === 'approved' || order.status === 'pending') && (
                                <motion.button
                                  onClick={() => processOrderMutation.mutate(order.id)}
                                  disabled={processOrderMutation.isPending}
                                  className="w-full inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-lg font-bold transition-all duration-300 shadow bg-emerald-600 border border-emerald-500 text-white hover:bg-emerald-500 disabled:opacity-50"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  {processOrderMutation.isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                  ) : (
                                    <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
                                  )}
                                  Process Order
                                </motion.button>
                              )}

                              {/* MARK AS SHIPPED BUTTON - Show for processing orders */}
                              {order.status === 'processing' && (
                                <motion.button
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setActionType('details');
                                  }}
                                  className="w-full inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-lg font-bold transition-all duration-300 shadow bg-emerald-600 border border-emerald-500 text-white hover:bg-emerald-500"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <Truck className="h-3.5 w-3.5 mr-1.5" />
                                  Mark Shipped
                                </motion.button>
                              )}

                              {/* MARK AS DELIVERED BUTTON - Show for shipped orders */}
                              {order.status === 'shipped' && (
                                <motion.button
                                  onClick={() => markDeliveredMutation.mutate(order.id)}
                                  disabled={markDeliveredMutation.isPending}
                                  className="w-full inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-lg font-bold transition-all duration-300 shadow bg-emerald-600 border border-emerald-500 text-white hover:bg-emerald-500 disabled:opacity-50"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  {markDeliveredMutation.isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                  )}
                                  Mark Delivered
                                </motion.button>
                              )}
                            </div>

                            {/* Status Indicators at the bottom */}
                            <div className="mt-4 space-y-1.5">
                              {order.admin_approved && (
                                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 py-1.5 px-2 bg-emerald-500/10 rounded border border-emerald-500/20">
                                  <UserCheck className="h-3 w-3 shrink-0" />
                                  <span className="truncate">Approved: Admin</span>
                                </div>
                              )}

                              {order.status === 'delivered' && (
                                <div className="flex items-center gap-1.5 text-[10px] text-purple-400 py-1.5 px-2 bg-purple-500/10 rounded border border-purple-500/20">
                                  <Package className="h-3 w-3 shrink-0" />
                                  <span>Delivered</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Order Details Modal */}
          {selectedOrder && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[99999]"
              onClick={() => {
                setSelectedOrder(null);
                setActionType(null);
                setApprovalNotes('');
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-gradient-to-br from-[#0F1720] via-[#1A2533] to-[#0F1720] rounded-2xl shadow-2xl border border-gray-700/50 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/40">
                  <div>
                    <h2 className="text-xl font-bold text-emerald-400">Order #{selectedOrder.id}</h2>
                    <p className="text-xs text-gray-400 mt-1">Placed on {format(new Date(selectedOrder.created_at), 'PPP p')}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedOrder(null);
                      setActionType(null);
                      setApprovalNotes('');
                    }}
                    className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-full"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                {/* Modal Content - Scrollable area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 sidebar-scrollbar">
                  {actionType && actionType !== 'details' && (
                    <div className="p-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 space-y-4">
                      <h3 className="text-lg font-semibold text-emerald-300 flex items-center gap-2">
                        {actionType === 'approve' && <><CheckCircle2 className="h-5 w-5" /> Approve Order</>}
                        {actionType === 'reject' && <><XCircle className="h-5 w-5 text-red-400" /> Reject Order</>}
                        {actionType === 'process' && <><PlayCircle className="h-5 w-5" /> Start Processing</>}
                        {actionType === 'complete' && <><CheckCircle2 className="h-5 w-5" /> Complete Order</>}
                      </h3>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                          Admin Notes {actionType === 'reject' ? '(Required)' : '(Optional)'}
                        </label>
                        <textarea
                          value={approvalNotes}
                          onChange={(e) => setApprovalNotes(e.target.value)}
                          className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-gray-600"
                          rows={3}
                          placeholder={
                            actionType === 'approve' ? 'Add notes about this approval...' :
                              actionType === 'reject' ? 'Please provide a reason for rejection...' :
                                actionType === 'process' ? 'Add notes about processing...' :
                                  'Add completion notes...'
                          }
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        {actionType === 'approve' && (
                          <Button
                            onClick={() => approveOrderMutation.mutate(selectedOrder.id)}
                            disabled={approveOrderMutation.isPending}
                            className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-900/20"
                          >
                            {approveOrderMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            Approve Now
                          </Button>
                        )}

                        {actionType === 'reject' && (
                          <Button
                            onClick={() => {
                              if (approvalNotes.trim()) {
                                adminAPI.updateOrderStatus(selectedOrder.id, 'cancelled', approvalNotes);
                                setActionType(null);
                                setApprovalNotes('');
                                refetch();
                              }
                            }}
                            disabled={!approvalNotes.trim()}
                            className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-900/20"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject Order
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          onClick={() => {
                            setActionType('details');
                            setApprovalNotes('');
                          }}
                          className="px-6 text-gray-400 hover:text-white"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Details View */}
                  <div className="space-y-8">
                    {/* Customer & Order Metadata */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-800/30 rounded-2xl p-5 border border-gray-700/30">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <User className="h-4 w-4 text-emerald-400" />
                          Customer info
                        </h3>
                        <div className="space-y-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-100">{selectedOrder.customer.full_name}</span>
                            <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                              <Mail className="h-3 w-3" /> {selectedOrder.customer.email}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-gray-700/50">
                            <span className="text-xs text-gray-500 font-medium">Shipping Address</span>
                            <div className="mt-1.5 text-sm text-gray-300 bg-gray-900/30 p-3 rounded-lg border border-gray-700/20">
                              {typeof selectedOrder.shipping_address === 'string' ? (
                                <p>{selectedOrder.shipping_address}</p>
                              ) : selectedOrder.shipping_address ? (
                                <>
                                  <p>{selectedOrder.shipping_address.address_line1}</p>
                                  {selectedOrder.shipping_address.address_line2 && (
                                    <p className="text-gray-400">{selectedOrder.shipping_address.address_line2}</p>
                                  )}
                                  <p>{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} {selectedOrder.shipping_address.postal_code}</p>
                                  <p className="text-gray-400">{selectedOrder.shipping_address.country}</p>
                                </>
                              ) : (
                                <p className="text-gray-500 italic">No address provided</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-800/30 rounded-2xl p-5 border border-gray-700/30">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Activity className="h-4 w-4 text-blue-400" />
                          Order Status
                        </h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Current Phase</span>
                            <span className={getStatusBadge(selectedOrder.status)}>
                              {getStatusIcon(selectedOrder.status)}
                              <span className="ml-1.5 capitalize">{selectedOrder.status.replace('_', ' ')}</span>
                            </span>
                          </div>

                          {selectedOrder.tracking_number && (
                            <div className="pt-3 border-t border-gray-700/50">
                              <span className="text-xs text-gray-500 font-medium">Tracking Number</span>
                              <div className="mt-1.5 flex items-center justify-between">
                                <span className="font-mono text-sm text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                  {selectedOrder.tracking_number}
                                </span>
                                <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-400 hover:text-white">
                                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Track
                                </Button>
                              </div>
                            </div>
                          )}

                          <div className="pt-3 border-t border-gray-700/50 flex justify-between items-center text-sm text-gray-400">
                            <span>Payment Method</span>
                            <span className="text-gray-200 capitalize">{selectedOrder.payment_method || 'Standard'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order Items Table */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <Package className="h-4 w-4 text-purple-400" />
                        Order Items
                      </h3>
                      <div className="bg-gray-800/20 rounded-2xl border border-gray-700/30 overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-gray-900/60 text-gray-400 text-xs font-bold uppercase">
                            <tr>
                              <th className="px-5 py-3">Product</th>
                              <th className="px-5 py-3 text-center">Qty</th>
                              <th className="px-5 py-3 text-right">Price</th>
                              <th className="px-5 py-3 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700/50">
                            {selectedOrder.items.map((item) => (
                              <tr key={item.id} className="hover:bg-gray-800/30 transition-colors group">
                                <td className="px-5 py-4">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-gray-200 group-hover:text-emerald-400 transition-colors uppercase">{item.product.name}</span>
                                    {item.product.vendor && (
                                      <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                        <Store className="h-2.5 w-2.5" />
                                        {item.product.vendor.store_name || item.product.vendor.full_name}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-center font-bold text-gray-400">x{item.quantity}</td>
                                <td className="px-5 py-4 text-right text-gray-300 font-mono">${(Number(item.price) / item.quantity).toFixed(2)}</td>
                                <td className="px-5 py-4 text-right font-bold text-emerald-400 font-mono">
                                  ${Number(item.price).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-900/60 font-bold border-t border-gray-700">
                            <tr>
                              <td colSpan={3} className="px-5 py-4 text-right text-gray-400">Grand Total</td>
                              <td className="px-5 py-4 text-right text-emerald-400 text-lg font-mono">${Number(selectedOrder.total_amount).toFixed(2)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Activity Log / Notes (if any) */}
                    {selectedOrder.admin_approved && (
                      <div className="p-4 bg-gray-900/30 rounded-xl border border-gray-700/30 flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                          <UserCheck className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-200">Order Approved by Admin</p>
                          <p className="text-xs text-gray-500 mt-0.5">Approved by: {selectedOrder.admin_approved_by_name || 'System'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 bg-gray-900/60 border-t border-gray-700/50 flex gap-3">
                  <Button
                    onClick={() => {
                      setSelectedOrder(null);
                      setActionType(null);
                    }}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl"
                  >
                    Close
                  </Button>

                  {/* Quick Actions if pending */}
                  {selectedOrder.status === 'awaiting_approval' && !actionType && (
                    <Button
                      onClick={() => setActionType('approve')}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-900/20 rounded-xl"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve Order
                    </Button>
                  )}

                  {selectedOrder.status === 'shipped' && !actionType && (
                    <Button
                      onClick={() => markDeliveredMutation.mutate(selectedOrder.id)}
                      disabled={markDeliveredMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/20 rounded-xl"
                    >
                      {markDeliveredMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      Mark Delivered
                    </Button>
                  )}

                  {selectedOrder.status === 'delivered' && !actionType && (
                    <Button
                      onClick={() => finalizeOrderMutation.mutate(selectedOrder.id)}
                      disabled={finalizeOrderMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-900/20 rounded-xl"
                    >
                      {finalizeOrderMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Mark Completed
                    </Button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </div >
    </div >
  );
};

export default OrderManagement;