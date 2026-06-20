import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
    Package,
    ShoppingCart,
    Heart,
    CreditCard,
    Settings,
    User,
    TrendingUp,
    Clock,
    CheckCircle,
    XCircle,
    DollarSign,
    Eye,
    Trash2,
    Filter,
    ArrowRight,
    Sparkles,
    ShoppingBag,
    LayoutDashboard,
    Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RootState } from '@/store';
import { useQuery } from '@tanstack/react-query';
import { buyerAPI, cartAPI, ordersAPI, adminAPI, resolveMediaUrl } from '@/services/api';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

const Dashboard = () => {
    const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
    const cartItems = useSelector((state: RootState) => state.cart?.items ?? []);
    const [selectedFilter, setSelectedFilter] = useState<string>('all');
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleConfirmReceipt = async (orderId: number) => {
        try {
            toast({
                title: 'Confirming Receipt',
                description: 'Please wait while we confirm your order receipt...',
            });
            // Call API to confirm receipt - update order status to delivered
            await adminAPI.updateOrderStatus(orderId, 'delivered');
            toast({
                title: 'Success',
                description: 'Order receipt confirmed successfully!',
            });
            refetchOrders();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to confirm receipt. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const handleRateVendor = (order: any) => {
        // Navigate to rating page or open rating modal
        // For now, navigate to order details where rating can be done
        navigate(`/orders/${order.id}?rate=true`);
    };

    // Fetch user orders
    const { data: ordersData, refetch: refetchOrders } = useQuery({
        queryKey: ['buyer-orders'],
        queryFn: () => buyerAPI.getOrders(),
        enabled: isAuthenticated,
    });

    // Fetch cart data
    const { data: cartData } = useQuery({
        queryKey: ['cart'],
        queryFn: () => cartAPI.get(),
        enabled: isAuthenticated,
    });

    const orders = Array.isArray(ordersData?.data) ? ordersData.data : ((ordersData as any)?.data?.results || (ordersData as any)?.data?.data || (ordersData as any)?.results || (ordersData as any)?.data || []);

    // Debug: Log orders to see their structure
    console.log('📊 Dashboard Orders:', orders);

    const totalOrders = orders.length;
    const pendingOrders = orders.filter((order: any) => {
        return !order.admin_approved || order.status === 'pending' || order.status === 'awaiting_approval' || order.status === 'payment_confirmed';
    }).length;
    const approvedOrders = orders.filter((order: any) => (order.status === 'approved' || order.status === 'processing' || order.status === 'shipped') && order.admin_approved).length;
    const processingOrders = orders.filter((order: any) => order.status === 'processing' || order.status === 'shipped').length;
    const completedOrders = orders.filter((order: any) => order.status === 'completed' || order.status === 'delivered').length;
    const rejectedOrders = orders.filter((order: any) => order.status === 'rejected' || order.status === 'cancelled').length;
    const totalSpent = orders.reduce((sum: number, order: any) => sum + (Number(order.total_amount) || 0), 0);

    // Filter orders based on selected filter
    const getFilteredOrders = () => {
        // Always show all orders regardless of filter
        return orders;
    };

    const stats = [
        {
            title: 'Total Orders',
            value: totalOrders,
            icon: Package,
            color: 'bg-emerald-500',
            textColor: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            filter: 'all'
        },
        {
            title: 'Pending Orders',
            value: pendingOrders,
            icon: Clock,
            color: 'bg-yellow-500',
            textColor: 'text-yellow-600',
            bgColor: 'bg-yellow-50',
            filter: 'pending'
        },
        {
            title: 'Approved',
            value: approvedOrders,
            icon: CheckCircle,
            color: 'bg-green-500',
            textColor: 'text-green-600',
            bgColor: 'bg-green-50',
            filter: 'approved'
        },
        {
            title: 'Processing',
            value: processingOrders,
            icon: TrendingUp,
            color: 'bg-purple-500',
            textColor: 'text-purple-600',
            bgColor: 'bg-purple-50',
            filter: 'processing'
        },
        {
            title: 'Completed',
            value: completedOrders,
            icon: CheckCircle,
            color: 'bg-green-500',
            textColor: 'text-green-600',
            bgColor: 'bg-green-50',
            filter: 'completed'
        },
        {
            title: 'Total Spent',
            value: `$${totalSpent.toFixed(2)}`,
            icon: DollarSign,
            color: 'bg-indigo-500',
            textColor: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
            filter: 'all'
        },
        {
            title: 'Cart Items',
            value: cartItems.length,
            icon: ShoppingCart,
            color: 'bg-red-500',
            textColor: 'text-red-600',
            bgColor: 'bg-red-50'
        }
    ];

    const quickActions = [
        {
            title: 'View All Orders',
            description: 'Track your order status and history',
            icon: Package,
            link: '/orders',
            color: 'from-emerald-500 to-emerald-600'
        },
        {
            title: 'Shopping Cart',
            description: 'Review items and checkout',
            icon: ShoppingCart,
            link: '/cart',
            color: 'from-green-500 to-green-600'
        },
        {
            title: 'Wishlist',
            description: 'View saved items',
            icon: Heart,
            link: '/wishlist',
            color: 'from-red-500 to-red-600'
        },
        {
            title: 'Payment Methods',
            description: 'Manage payment options',
            icon: CreditCard,
            link: '/buyer/payment-methods',
            color: 'from-purple-500 to-purple-600'
        },
        {
            title: 'Profile Settings',
            description: 'Update your account information',
            icon: Settings,
            link: '/profile',
            color: 'from-gray-500 to-gray-600'
        },
        {
            title: 'Browse Products',
            description: 'Discover new products',
            icon: Eye,
            link: '/products',
            color: 'from-indigo-500 to-indigo-600'
        }
    ];

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
            case 'awaiting_approval':
                return <Clock className="h-4 w-4 text-yellow-500" />;
            case 'approved':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'processing':
                return <TrendingUp className="h-4 w-4 text-emerald-500" />;
            case 'shipped':
                return <TrendingUp className="h-4 w-4 text-blue-500" />;
            case 'delivered':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'completed':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'cancelled':
            case 'rejected':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusText = (status: string, adminApproved: boolean) => {
        if (status === 'pending' || status === 'awaiting_approval') {
            return 'Awaiting Admin Approval';
        }
        if (status === 'approved' && adminApproved) {
            return 'Approved - Preparing to Ship';
        }
        if (status === 'processing') {
            return 'Processing - Being Shipped';
        }
        if (status === 'shipped') {
            return 'Shipped - In Transit';
        }
        if (status === 'delivered') {
            return 'Delivered Successfully';
        }
        if (status === 'completed') {
            return 'Order Completed';
        }
        if (status === 'cancelled' || status === 'rejected') {
            return 'Cancelled';
        }
        return 'Processing';
    };

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
                            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/20 flex items-center justify-center shadow-lg shadow-emerald-900/10">
                                <User className="h-5 w-5 text-[#3CFF9E]" />
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                                Welcome back, {user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.first_name || user?.username}!
                            </h1>
                        </div>
                        <p className="text-[#8B949E] text-sm font-medium flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9D]" />
                            Your Personal Shopping Dashboard
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-3"
                    >
                        <Link to="/products">
                            <motion.button
                                className="h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-xs font-black uppercase tracking-widest hover:from-emerald-500 hover:to-emerald-700 border border-emerald-400/20 shadow-lg shadow-emerald-900/20 transition-all duration-300 flex items-center gap-2"
                                whileHover={{ scale: 1.02, translateY: -2 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <ShoppingCart className="h-4 w-4" />
                                Start Shopping
                            </motion.button>
                        </Link>
                    </motion.div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-10">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            whileHover={{ y: -4 }}
                            className="group relative rounded-xl p-4 overflow-hidden cursor-pointer transition-all duration-500"
                            style={{
                                background: 'linear-gradient(145deg, rgba(4, 19, 14, 0.95), rgba(5, 30, 22, 0.98))',
                                border: '1px solid rgba(0, 255, 178, 0.08)',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.02)',
                            }}
                            onClick={() => {
                                if ((stat as any).filter) {
                                    setSelectedFilter((stat as any).filter);
                                } else if (stat.title === 'Cart Items') {
                                    navigate('/cart');
                                }
                            }}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: '#E6CE91' }}>
                                        {stat.title}
                                    </span>
                                    <div className="mt-1.5 text-xl font-bold tracking-tight font-serif" style={{ color: '#F4F6F8' }}>
                                        {stat.value}
                                    </div>
                                </div>
                                <div
                                    className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{
                                        background: 'linear-gradient(135deg, #064E3B, #042A20)',
                                        boxShadow: '0 8px 24px -8px #064E3B',
                                    }}
                                >
                                    <stat.icon className="h-4 w-4" style={{ color: '#E6CE91' }} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* LEFT COLUMN: Activity/Orders */}
                    <div className="xl:col-span-8 space-y-8">

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="rounded-3xl border border-white/[0.05] bg-[#0F1720]/40 backdrop-blur-xl overflow-hidden shadow-2xl"
                        >
                            <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                        <Package className="h-4 w-4 text-emerald-400" />
                                    </div>
                                    <h2 className="text-lg font-black text-white tracking-tight">
                                        {selectedFilter === 'all' ? 'Recent Activity' : `${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Orders`}
                                    </h2>
                                </div>
                                {selectedFilter !== 'all' && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        onClick={() => setSelectedFilter('all')}
                                        className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest flex items-center gap-1.5"
                                    >
                                        <Filter className="h-3 w-3" /> Reset Filter
                                    </motion.button>
                                )}
                            </div>

                            <div className="p-6 space-y-4">
                                {getFilteredOrders().length ? getFilteredOrders().slice(0, 8).map((order: any, idx: number) => (
                                    <motion.div
                                        key={order.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.6 + (idx * 0.05) }}
                                        className="group bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl border border-white/[0.03] p-3 sm:p-4 flex items-center justify-between transition-all duration-300"
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4">
                                            {/* Product Image */}
                                            {order.items && order.items.length > 0 && (
                                                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden border border-white/[0.1] flex-shrink-0 bg-gray-900">
                                                    <img
                                                        src={resolveMediaUrl(order.items[0].product?.image) || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=64&h=64&fit=crop'}
                                                        alt={order.items[0].product?.name || 'Product'}
                                                        className="h-full w-full object-cover"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 sm:gap-4">
                                                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gray-900 border border-white/[0.1] flex items-center justify-center flex-shrink-0">
                                                    {getStatusIcon(order.status)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs sm:text-sm font-black text-white group-hover:text-emerald-400 transition-colors">Order #{order.id}</p>
                                                        <span className="text-[9px] sm:text-[10px] font-bold text-[#586069]">• {new Date(order.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-[9px] sm:text-[10px] font-bold text-[#8B949E] uppercase tracking-tight mt-0.5">
                                                        {getStatusText(order.status, order.admin_approved)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-sm font-black text-white">${Number(order.total_amount || 0).toFixed(2)}</p>
                                                {order.items && (
                                                    <p className="text-[9px] font-bold text-[#586069] uppercase">{order.items.length} ITEM(S)</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Link to={`/orders/${order.id}`}>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all"
                                                    >
                                                        <Eye className="h-3.5 w-3.5 text-[#8B949E] group-hover:text-emerald-400" />
                                                    </motion.button>
                                                </Link>
                                                {order.status === 'shipped' && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleConfirmReceipt(order.id)}
                                                        className="p-2 rounded-lg bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 hover:border-green-500/50 transition-all text-green-400"
                                                        title="Confirm Receipt"
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </motion.button>
                                                )}
                                                {(order.status === 'completed' || order.status === 'delivered') && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleRateVendor(order)}
                                                        className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 hover:border-yellow-500/50 transition-all text-yellow-400"
                                                        title="Rate Vendor"
                                                    >
                                                        <Star className="h-4 w-4" />
                                                    </motion.button>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )) : (
                                    <div className="py-20 text-center space-y-4">
                                        <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-2 border border-white/[0.05]">
                                            <ShoppingBag className="h-8 w-8 text-[#586069]" />
                                        </div>
                                        <div>
                                            <p className="text-[#8B949E] text-sm font-black uppercase tracking-widest">No orders found</p>
                                            <Link to="/products" className="text-emerald-400 text-xs font-bold hover:underline mt-2 inline-block">Explore our products</Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* RIGHT COLUMN: Quick Actions */}
                    <div className="xl:col-span-4 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 }}
                            className="rounded-3xl border border-white/[0.05] bg-[#1A2533]/40 backdrop-blur-xl p-6 shadow-2xl"
                        >
                            <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-6 opacity-60">Operations Center</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {quickActions.map((action, idx) => (
                                    <Link to={action.link} key={idx} className="block">
                                        <motion.div
                                            whileHover={{ scale: 1.05, translateY: -2 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="h-32 rounded-2xl bg-white/[0.03] border border-white/[0.05] p-4 flex flex-col justify-between hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-300"
                                        >
                                            <div className="p-2 w-max rounded-lg bg-gray-900 border border-white/[0.05]">
                                                <action.icon className="h-4 w-4 text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-white uppercase tracking-tight leading-tight">{action.title}</p>
                                                <p className="text-[9px] font-bold text-[#8B949E] mt-1 line-clamp-1 italic">{action.description}</p>
                                            </div>
                                        </motion.div>
                                    </Link>
                                ))}
                            </div>
                        </motion.div>

                        {/* Recommendation / Support Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.8 }}
                            className="rounded-3xl border border-[#3CFF9E]/10 bg-gradient-to-br from-[#0c1214] to-[#010a08] p-8 text-center relative overflow-hidden shadow-2xl"
                        >
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#00FF9D]/10 rounded-full blur-3xl animate-pulse" />
                            <div className="relative z-10">
                                <Sparkles className="h-8 w-8 text-[#3CFF9E] mx-auto mb-4" />
                                <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">Exclusive Deals</h3>
                                <p className="text-[10px] text-[#8B949E] font-medium px-4 leading-relaxed italic">Check out our latest arrivals and premium curated collections just for you.</p>
                                <Link to="/products" className="block mt-6">
                                    <motion.button
                                        whileHover={{ scale: 1.02, translateY: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-[11px] font-black uppercase tracking-widest border border-emerald-400/20 shadow-xl shadow-emerald-900/40"
                                    >
                                        View Collections
                                    </motion.button>
                                </Link>
                            </div>
                        </motion.div>

                        {/* Account Quality Utility */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1 }}
                            className="rounded-3xl border border-white/[0.05] bg-white/[0.02] p-5 flex items-center gap-4 group"
                        >
                            <div className="h-10 w-10 rounded-xl bg-white/[0.05] flex items-center justify-center border border-white/[0.05] group-hover:bg-emerald-500/10 transition-all">
                                <Settings className="h-5 w-5 text-[#8B949E] group-hover:text-emerald-400" />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-black text-white uppercase tracking-[0.1em]">Account Settings</p>
                                <Link to="/profile" className="text-[9px] font-bold text-[#8B949E] hover:text-[#00FF9D] transition-colors">Manage your preferences →</Link>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;