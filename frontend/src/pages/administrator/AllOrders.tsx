import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle,
    Clock,
    Package,
    Truck,
    Eye,
    Search,
    Filter,
    Download,
    DollarSign,
    ShoppingCart,
    User,
    ArrowLeft,
    CheckCircle2,
    PlayCircle,
    XCircle,
    Loader2,
    Activity,
    X,
    UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { adminAPI, resolveMediaUrl } from '@/services/api';

interface OrderItem {
    id: string;
    product: {
        name: string;
        image: string;
    };
    quantity: number;
    price: number;
}

interface Order {
    id: string;
    status: string;
    total_amount: number;
    created_at: string;
    customer: {
        full_name: string;
        email: string;
    };
    vendor: {
        store_name: string;
    };
    items: OrderItem[];
    progress_percentage: number;
    admin_approved: boolean;
    admin_approved_by_name: string | null;
    admin_notes: string | null;
    payment_method?: string;
    shipping_address?: {
        address_line1: string;
        address_line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
    } | string;
}

const AllOrders = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [actionType, setActionType] = useState<'details' | 'reject' | null>(null);
    const [approvalNotes, setApprovalNotes] = useState('');

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: ordersData, isLoading } = useQuery({
        queryKey: ['adminOrders'],
        queryFn: adminAPI.getOrders,
    });

    const orders = ordersData?.data || [];

    const filteredOrders = orders.filter((order: Order) => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            String(order.id).toLowerCase().includes(searchLower) ||
            (order.customer?.full_name || '').toLowerCase().includes(searchLower) ||
            (order.customer?.email || '').toLowerCase().includes(searchLower);

        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Sort orders to put pending/new orders first
    const sortedOrders = useMemo(() => {
        return [...filteredOrders].sort((a: Order, b: Order) => {
            // Priority: not admin_approved first, then by status priority, then by date (newest first)
            const aPriority = !a.admin_approved || a.status === 'pending' || a.status === 'awaiting_approval' || a.status === 'payment_confirmed' ? 1 : 0;
            const bPriority = !b.admin_approved || b.status === 'pending' || b.status === 'awaiting_approval' || b.status === 'payment_confirmed' ? 1 : 0;

            if (aPriority !== bPriority) {
                return bPriority - aPriority; // Higher priority first
            }

            // If same priority, sort by date (newest first)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [filteredOrders]);

    const invalidateOrders = () => {
        queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
        queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    };

    const approveOrderMutation = useMutation({
        mutationFn: (orderId: string) => adminAPI.approveOrder(orderId, 'Approved by admin'),
        onSuccess: () => {
            toast({ title: 'Success', description: 'Order approved efficiently' });
            invalidateOrders();
        },
        onError: () => toast({ title: 'Error', description: 'Failed to approve order', variant: 'destructive' })
    });

    const rejectOrderMutation = useMutation({
        mutationFn: (orderId: string) => adminAPI.rejectOrder(orderId, approvalNotes),
        onSuccess: () => {
            toast({ title: 'Success', description: 'Order rejected' });
            setActionType(null);
            setSelectedOrder(null);
            setApprovalNotes('');
            invalidateOrders();
        },
        onError: () => toast({ title: 'Error', description: 'Failed to reject order', variant: 'destructive' })
    });

    const processOrderMutation = useMutation({
        mutationFn: (orderId: string) => adminAPI.updateOrderStatus(orderId, 'processing'),
        onSuccess: () => {
            toast({ title: 'Success', description: 'Vendor notified' });
            invalidateOrders();
        },
        onError: () => toast({ title: 'Error', description: 'Failed to process order', variant: 'destructive' })
    });

    const shipOrderMutation = useMutation({
        mutationFn: ({ orderId, trackingNumber }: { orderId: string; trackingNumber: string }) => adminAPI.shipOrder(orderId, trackingNumber),
        onSuccess: () => {
            toast({ title: 'Success', description: 'Order marked as shipped' });
            invalidateOrders();
        },
        onError: () => toast({ title: 'Error', description: 'Failed to ship order', variant: 'destructive' })
    });

    const completeOrderMutation = useMutation({
        mutationFn: (orderId: string) => adminAPI.completeOrder(orderId),
        onSuccess: () => {
            toast({ title: 'Success', description: 'Order marked delivered' });
            invalidateOrders();
        },
        onError: () => toast({ title: 'Error', description: 'Failed to complete order', variant: 'destructive' })
    });

    const finalizeOrderMutation = useMutation({
        mutationFn: (orderId: string) => adminAPI.updateOrderStatus(orderId, 'completed'),
        onSuccess: () => {
            toast({ title: 'Success', description: 'Order completed successfully' });
            invalidateOrders();
        },
        onError: () => toast({ title: 'Error', description: 'Failed to finalize order', variant: 'destructive' })
    });

    const stats = useMemo(() => {
        if (!orders) return { total: 0, pending: 0, completed: 0, revenue: 0 };
        const typedOrders = orders as Order[];
        return {
            total: typedOrders.length,
            pending: typedOrders.filter((o: Order) => o.status === 'awaiting_approval').length,
            completed: typedOrders.filter((o: Order) => o.status === 'completed' || o.status === 'delivered').length,
            revenue: typedOrders.filter((o: Order) => o.status !== 'cancelled' && o.status !== 'rejected')
                .reduce((sum: number, o: Order) => sum + Number(o.total_amount), 0)
        };
    }, [orders]);

    const getStatusBadge = (status: string) => {
        const badges: Record<string, string> = {
            pending: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
            awaiting_approval: 'bg-orange-500/10 text-orange-500 border border-orange-500/20',
            approved: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
            processing: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
            shipped: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20',
            delivered: 'bg-teal-500/10 text-teal-500 border border-teal-500/20',
            completed: 'bg-emerald-600/20 text-emerald-600 border border-emerald-600/30',
            cancelled: 'bg-red-500/10 text-red-500 border border-red-500/20',
            rejected: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
            refunded: 'bg-pink-500/10 text-pink-500 border border-pink-500/20'
        };
        return `inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold ${badges[status] || 'bg-gray-500/10 text-gray-500 border border-gray-500/20'} shadow-lg transform hover:scale-105 transition-transform duration-300`;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock className="w-3.5 h-3.5 mr-1" />;
            case 'approved': return <CheckCircle className="w-3.5 h-3.5 mr-1" />;
            case 'processing': return <Package className="w-3.5 h-3.5 mr-1" />;
            case 'shipped': return <Truck className="w-3.5 h-3.5 mr-1" />;
            case 'delivered': return <CheckCircle2 className="w-3.5 h-3.5 mr-1" />;
            case 'completed': return <CheckCircle className="w-3.5 h-3.5 mr-1" />;
            case 'cancelled':
            case 'rejected':
                return <XCircle className="w-3.5 h-3.5 mr-1" />;
            default: return <Clock className="w-3.5 h-3.5 mr-1" />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
                    <p className="text-gray-400 font-medium animate-pulse">Loading orders index...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#070B0F] relative overflow-hidden">
            {/* Subtle animated background elements matching OrderManagement */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
                <div className="absolute top-16 right-10 w-[520px] h-[520px] bg-[rgba(60,179,113,0.16)] rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-16 left-12 w-[520px] h-[520px] bg-[rgba(255,215,0,0.10)] rounded-full blur-3xl animate-pulse"></div>
            </div>

            <div className="relative z-10 px-4 md:px-8 w-full max-w-full pb-4 sm:pb-6 pt-6">
                <div className="space-y-8">
                    {/* Header section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-4">
                        <div>
                            <Link to="/administrator/orders" className="inline-flex items-center text-sm font-medium text-emerald-500 hover:text-emerald-400 mb-2 transition-colors">
                                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                            </Link>
                            <motion.h1
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-green-500"
                            >
                                All Orders
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="text-gray-400 mt-1"
                            >
                                Manage and view a complete history of all platform orders
                            </motion.p>
                        </div>
                    </div>

                    {/* Filters */}
                    <motion.div
                        className="flex flex-col md:flex-row gap-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
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
                        <button className="px-6 h-12 inline-flex items-center justify-center bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.06)] text-[#B6EBD3] hover:bg-[rgba(255,255,255,0.12)] hover:text-[#E9FFF4] transition-all duration-300 shadow-lg backdrop-blur-sm rounded-full font-medium">
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </button>
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
                                        <p className="text-green-100 text-sm font-medium">Completed/Delivered</p>
                                        <p className="text-2xl font-bold">{stats.completed}</p>
                                    </div>
                                    <CheckCircle className="h-8 w-8 text-green-200" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-violet-600 to-purple-700/95 backdrop-blur-sm text-white border-2 border-violet-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-violet-100 text-sm font-medium">Platform Revenue</p>
                                        <p className="text-2xl font-bold">${stats.revenue.toFixed(2)}</p>
                                    </div>
                                    <DollarSign className="h-8 w-8 text-violet-200" />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Orders Data Table */}
                    <motion.div
                        className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4">
                            <div className="flex items-center space-x-3">
                                <ShoppingCart className="h-6 w-6 text-white" />
                                <h3 className="text-lg font-semibold text-white">Orders List ({sortedOrders?.length || 0})</h3>
                            </div>
                        </div>

                        <div className="overflow-x-auto max-w-full">
                            <table className="w-full divide-y divide-gray-700/50">
                                <thead className="bg-gradient-to-r from-gray-800/80 to-gray-700/80">
                                    <tr>
                                        <th className="px-4 py-4 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Order ID</th>
                                        <th className="px-4 py-4 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Customer</th>
                                        <th className="px-4 py-4 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Date</th>
                                        <th className="px-4 py-4 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Amount</th>
                                        <th className="px-4 py-4 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-4 text-right text-xs font-bold text-gray-200 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-gray-800/50 divide-y divide-gray-700/30">
                                    {sortedOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                                <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                                No orders found matching your search.
                                            </td>
                                        </tr>
                                    ) : (
                                        sortedOrders.map((order: Order, index: number) => (
                                            <motion.tr
                                                key={order.id}
                                                className="hover:bg-gray-700/30 transition-colors cursor-pointer"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                onClick={() => {
                                                    setSelectedOrder(order);
                                                    setActionType('details');
                                                }}
                                            >
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <span className="text-sm font-bold text-emerald-400">#{order.id}</span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 mr-3">
                                                            <User className="h-4 w-4 text-blue-400" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-gray-200">{order.customer.full_name}</div>
                                                            <div className="text-xs text-gray-500">{order.customer.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-300">{format(new Date(order.created_at), 'MMM d, yyyy')}</div>
                                                    <div className="text-xs text-gray-500">{format(new Date(order.created_at), 'h:mm a')}</div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <span className="text-sm font-bold text-emerald-400 font-mono">${order.total_amount}</span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <span className={getStatusBadge(order.status).replace('px-4', 'px-3')}>
                                                        {getStatusIcon(order.status)}
                                                        {order.status.replace('_', ' ').toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedOrder(order);
                                                            setActionType('details');
                                                        }}
                                                        className="text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center"
                                                    >
                                                        <Eye className="w-4 h-4 mr-1" /> View
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>

                    {/* Order Details Modal (Same as OrderManagement.tsx) */}
                    <AnimatePresence>
                        {selectedOrder && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 z-[99999]"
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
                                    onClick={e => e.stopPropagation()}
                                >
                                    {actionType === 'details' ? (
                                        <>
                                            <div className="bg-gray-900/40 p-6 border-b border-gray-700/50 flex justify-between items-center sticky top-0 z-10">
                                                <div>
                                                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-green-500 flex items-center gap-2">
                                                        <ShoppingCart className="w-6 h-6 text-emerald-500" />
                                                        Order Details
                                                    </h2>
                                                    <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                                                        <span className="font-mono bg-gray-800 px-2 py-0.5 rounded text-emerald-400">#{selectedOrder.id}</span>
                                                        • {format(new Date(selectedOrder.created_at), 'MMM d, yyyy h:mm a')}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedOrder(null)}
                                                    className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
                                                >
                                                    <X className="w-6 h-6" />
                                                </button>
                                            </div>

                                            <div className="p-6 overflow-y-auto sidebar-scrollbar space-y-6">
                                                {/* Status Section */}
                                                <div className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
                                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <Activity className="w-4 h-4" />
                                                        Current Status
                                                    </h3>
                                                    <div className="flex items-center gap-4 flex-wrap">
                                                        <span className={getStatusBadge(selectedOrder.status)}>
                                                            {getStatusIcon(selectedOrder.status)}
                                                            {selectedOrder.status.replace('_', ' ').toUpperCase()}
                                                        </span>
                                                        {selectedOrder.admin_approved && (
                                                            <div className="flex items-center text-emerald-500 text-sm bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                                                                <UserCheck className="h-4 w-4 mr-1.5" />
                                                                Approved by {selectedOrder.admin_approved_by_name || 'Admin'}
                                                            </div>
                                                        )}
                                                        {selectedOrder.status === 'delivered' && (
                                                            <div className="flex items-center text-purple-500 text-sm bg-purple-500/10 px-3 py-1.5 rounded-full border border-purple-500/20">
                                                                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                                                Delivered
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Order Details Grid */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Customer Info */}
                                                    <div className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
                                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                            <User className="w-4 h-4" />
                                                            Customer Information
                                                        </h3>
                                                        <div className="space-y-3">
                                                            <div>
                                                                <p className="text-xs text-gray-500 font-medium">Name</p>
                                                                <p className="font-semibold text-gray-200">{selectedOrder.customer.full_name}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500 font-medium">Email</p>
                                                                <p className="font-medium text-blue-400">{selectedOrder.customer.email}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Payment Info */}
                                                    <div className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
                                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                            <DollarSign className="w-4 h-4" />
                                                            Payment Details
                                                        </h3>
                                                        <div className="space-y-3">
                                                            <div>
                                                                <p className="text-xs text-gray-500 font-medium">Total Amount</p>
                                                                <p className="text-xl font-bold text-emerald-400 font-mono">${selectedOrder.total_amount}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500 font-medium">Method</p>
                                                                <p className="font-medium text-gray-200 uppercase">{selectedOrder.payment_method || 'N/A'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Order Items */}
                                                <div className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
                                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                        <Package className="w-4 h-4" />
                                                        Order Items ({selectedOrder.items.length})
                                                    </h3>
                                                    <div className="space-y-3">
                                                        {selectedOrder.items.map((item, index) => (
                                                            <div key={item.id || index} className="flex items-center gap-4 bg-gray-900/40 p-3 rounded-xl border border-gray-700/50">
                                                                <img
                                                                    src={resolveMediaUrl(item.product.image) || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=64&h=64&fit=crop'}
                                                                    alt={item.product.name}
                                                                    className="w-12 h-12 rounded-lg object-cover border border-gray-600/50 shadow-md bg-gray-800"
                                                                    onError={(e) => {
                                                                        const el = e.target as HTMLImageElement;
                                                                        const fallback = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=64&h=64&fit=crop';
                                                                        if (el.src !== fallback) el.src = fallback;
                                                                    }}
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-bold text-gray-200 truncate uppercase text-sm">{item.product.name}</p>
                                                                    <div className="flex items-center gap-3 mt-1">
                                                                        <p className="text-xs font-mono text-gray-400">Qty: {item.quantity}</p>
                                                                        <p className="text-xs font-mono text-emerald-400">${(Number(item.price) / item.quantity).toFixed(2)} / ea</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="font-bold text-emerald-400 font-mono text-lg">${Number(item.price).toFixed(2)}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Admin Notes */}
                                                {selectedOrder.admin_notes && (
                                                    <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                                                        <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                            <Activity className="h-4 w-4" />
                                                            Admin Notes
                                                        </p>
                                                        <p className="text-sm text-gray-300 italic">"{selectedOrder.admin_notes}"</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-gray-900/60 p-6 border-t border-gray-700/50 flex flex-wrap gap-3 justify-end sticky bottom-0 z-10">
                                                <button
                                                    onClick={() => setSelectedOrder(null)}
                                                    className="px-6 py-2.5 rounded-xl font-bold bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700 transition-all duration-300"
                                                >
                                                    Close
                                                </button>
                                                {/* Quick Actions based on status */}
                                                {(selectedOrder.status === 'pending' || selectedOrder.status === 'awaiting_approval' || !selectedOrder.admin_approved) && (
                                                    <button
                                                        onClick={() => approveOrderMutation.mutate(selectedOrder.id)}
                                                        disabled={approveOrderMutation.isPending}
                                                        className="inline-flex items-center px-6 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all duration-300 shadow-lg border border-emerald-500"
                                                    >
                                                        {approveOrderMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                                        Approve Order
                                                    </button>
                                                )}
                                                {selectedOrder.status === 'shipped' && (
                                                    <button
                                                        onClick={() => completeOrderMutation.mutate(selectedOrder.id)}
                                                        disabled={completeOrderMutation.isPending}
                                                        className="inline-flex items-center px-6 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all duration-300 shadow-lg border border-emerald-500"
                                                    >
                                                        {completeOrderMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                                        Mark Delivered
                                                    </button>
                                                )}
                                                {selectedOrder.status === 'delivered' && (
                                                    <button
                                                        onClick={() => finalizeOrderMutation.mutate(selectedOrder.id)}
                                                        disabled={finalizeOrderMutation.isPending}
                                                        className="inline-flex items-center px-6 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all duration-300 shadow-lg border border-emerald-500"
                                                    >
                                                        {finalizeOrderMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                                        Mark Completed
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="bg-gray-900/40 p-6 border-b border-gray-700/50">
                                                <h2 className="text-2xl font-bold text-red-500 flex items-center gap-2">
                                                    <XCircle className="w-6 h-6" />
                                                    Reject Order #{selectedOrder.id}
                                                </h2>
                                            </div>
                                            <div className="p-6">
                                                <label className="block text-sm font-semibold text-gray-300 mb-2">Reason for Rejection *</label>
                                                <textarea
                                                    value={approvalNotes}
                                                    onChange={(e) => setApprovalNotes(e.target.value)}
                                                    placeholder="Please provide a detailed reason for rejecting this order..."
                                                    className="w-full h-32 p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300"
                                                />
                                                <div className="mt-6 flex justify-end gap-3">
                                                    <button
                                                        onClick={() => {
                                                            setActionType('details');
                                                            setApprovalNotes('');
                                                        }}
                                                        className="px-6 py-2.5 rounded-xl font-bold bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-all duration-300"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => rejectOrderMutation.mutate(selectedOrder.id)}
                                                        disabled={!approvalNotes.trim() || rejectOrderMutation.isPending}
                                                        className="inline-flex items-center px-6 py-2.5 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-red-500"
                                                    >
                                                        {rejectOrderMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                        Confirm Rejection
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default AllOrders;