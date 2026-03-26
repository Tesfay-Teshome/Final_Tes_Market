import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Filter,
  Search,
  Eye,
  Calendar,
  DollarSign,
  MapPin,
  Truck,
  Store,
  Printer
} from 'lucide-react';
import { RootState } from '@/store';
import { adminAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import OrderFlowDiagram from '@/components/order/OrderFlowDiagram';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Orders = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['buyer-orders', statusFilter, searchTerm],
    queryFn: () => adminAPI.getBuyerOrders(),
    enabled: isAuthenticated,
  });

  // Handle invoice printing with custom print function (no API needed)
  const handlePrintInvoice = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print invoices');
      return;
    }

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice #${order.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
          .header { text-align: center; border-bottom: 3px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
          .company-name { font-size: 32px; font-weight: bold; color: #6366f1; margin-bottom: 8px; }
          .company-tagline { color: #666; margin-bottom: 5px; }
          .company-contact { font-size: 12px; color: #888; }
          .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .customer-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .items-table th { background: #6366f1; color: white; padding: 12px; text-align: left; }
          .items-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
          .items-table tr:nth-child(even) { background: #f9fafb; }
          .totals-box { background: #f0f9ff; border: 2px solid #bfdbfe; padding: 20px; border-radius: 8px; margin-left: auto; width: 300px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .total-row.grand { font-weight: bold; font-size: 18px; border-top: 2px solid #6366f1; padding-top: 8px; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-approved { background: #d1fae5; color: #065f46; }
          .status-processing { background: #dbeafe; color: #1e40af; }
          .status-completed { background: #d1fae5; color: #065f46; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #666; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <!-- Company Header -->
        <div class="header">
          <div class="company-name">TesMarket</div>
          <div class="company-tagline">Your Trusted Marketplace</div>
          <div class="company-contact">Email: admin@tesmarket.com | Phone: +251992846900</div>
        </div>

        <!-- Invoice Details -->
        <div class="invoice-details">
          <div>
            <h3>Invoice Details</h3>
            <p><strong>Invoice #:</strong> INV-${order.id}</p>
            <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
            <p><strong>Status:</strong> <span class="status-badge status-${order.status}">${order.status.toUpperCase()}</span></p>
            ${order.tracking_number ? `<p><strong>Tracking #:</strong> ${order.tracking_number}</p>` : ''}
          </div>
          <div style="text-align: right;">
            <p><strong>Print Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Print Time:</strong> ${new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        <!-- Customer Information -->
        <div class="customer-box">
          <h3 style="margin-bottom: 15px;">Bill To:</h3>
          <p><strong>${order.user?.full_name || `${order.user?.first_name || ''} ${order.user?.last_name || ''}`.trim() || order.user?.username || 'Customer'}</strong></p>
          <p>Email: ${order.user?.email || 'N/A'}</p>
          ${order.user?.phone ? `<p>Phone: ${order.user.phone}</p>` : ''}
          <p>Order Date: ${new Date(order.created_at).toLocaleDateString()}</p>
          
          ${order.shipping_address ? `
            <div style="margin-top: 15px;">
              <p><strong>Shipping Address:</strong></p>
              ${typeof order.shipping_address === 'string' ?
          `<p>${order.shipping_address}</p>` :
          `<div>
                  ${order.shipping_address.address_line1 ? `<p>${order.shipping_address.address_line1}</p>` : ''}
                  ${order.shipping_address.address_line2 ? `<p>${order.shipping_address.address_line2}</p>` : ''}
                  <p>
                    ${order.shipping_address.city ? `${order.shipping_address.city}, ` : ''}
                    ${order.shipping_address.state ? `${order.shipping_address.state} ` : ''}
                    ${order.shipping_address.postal_code || ''}
                  </p>
                  ${order.shipping_address.country ? `<p>${order.shipping_address.country}</p>` : ''}
                </div>`
        }
            </div>
          ` : '<p style="margin-top: 15px;"><strong>Shipping Address:</strong> Same as billing address</p>'}
        </div>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items?.map((item: any) => `
              <tr>
                <td>
                  <strong>${item.product?.name || 'Product'}</strong>
                  ${item.product?.description ? `<br><small style="color: #666;">${item.product.description.substring(0, 60)}...</small>` : ''}
                </td>
                <td>${(() => {
            // Resolve vendor name robustly and explicitly avoid category fields
            const product = item?.product || {};
            const directVendor = item?.vendor || {};
            const productVendor = product?.vendor || {};

            // Prefer vendor attached to the item, then product.vendor
            const v = (directVendor && (directVendor.store_name || directVendor.username || (directVendor.first_name && directVendor.last_name ? `${directVendor.first_name} ${directVendor.last_name}` : '') || directVendor.first_name || directVendor.last_name || directVendor.name || directVendor.email))
              || (productVendor && (productVendor.store_name || productVendor.username || (productVendor.first_name && productVendor.last_name ? `${productVendor.first_name} ${productVendor.last_name}` : '') || productVendor.first_name || productVendor.last_name || productVendor.name || productVendor.email))
              || product.vendor_name
              || product.seller_name
              || 'Vendor';

            return v;
          })()}</td>
                <td>${item.quantity || 1}</td>
                <td>$${(Number(item.price || 0) / (item.quantity || 1)).toFixed(2)}</td>
                <td>$${Number(item.price || 0).toFixed(2)}</td>
              </tr>
            `).join('') || '<tr><td colspan="5">No items found</td></tr>'}
          </tbody>
        </table>

        <!-- Totals -->
        <div class="totals-box">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>$${Number(order.total_amount || 0).toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>Shipping:</span>
            <span>$0.00</span>
          </div>
          <div class="total-row">
            <span>Tax:</span>
            <span>$0.00</span>
          </div>
          <div class="total-row grand">
            <span>Grand Total:</span>
            <span>$${Number(order.total_amount || 0).toFixed(2)}</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>For questions about this invoice, please contact us at admin@tesmarket.com</p>
        </div>

        <script>
          window.onload = function() { 
            setTimeout(function() { 
              window.print(); 
            }, 500); 
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
  };

  const orders = ordersData?.data || [];

  // Filter orders based on status and search
  const filteredOrders = orders.filter((order: any) => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch = searchTerm === '' ||
      order.id.toString().includes(searchTerm) ||
      order.items?.some((item: any) =>
        item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    return matchesStatus && matchesSearch;
  });

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
        return <Truck className="h-4 w-4 text-blue-500" />;
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

  const getStatusBadge = (status: string, adminApproved: boolean) => {
    if (status === 'pending' || status === 'awaiting_approval') {
      return <Badge className="bg-yellow-100 text-yellow-800">Awaiting Approval</Badge>;
    }
    if (status === 'approved' && adminApproved) {
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
    }
    if (status === 'processing') {
      return <Badge className="bg-emerald-100 text-emerald-800">Processing</Badge>;
    }
    if (status === 'shipped') {
      return <Badge className="bg-blue-100 text-blue-800">Shipped</Badge>;
    }
    if (status === 'delivered') {
      return <Badge className="bg-green-100 text-green-800">Delivered</Badge>;
    }
    if (status === 'completed') {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    }
    if (status === 'cancelled' || status === 'rejected') {
      return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800">Processing</Badge>;
  };

  const getStatusText = (status: string, adminApproved: boolean) => {
    if (status === 'pending' || status === 'awaiting_approval') {
      return 'Your order is awaiting admin approval';
    }
    if (status === 'approved' && adminApproved) {
      return 'Order approved - preparing for shipment';
    }
    if (status === 'processing') {
      return 'Order is being processed and shipped';
    }
    if (status === 'shipped') {
      return 'Order has been shipped and is in transit';
    }
    if (status === 'delivered') {
      return 'Order has been delivered successfully';
    }
    if (status === 'completed') {
      return 'Order completed - Thank you for your purchase!';
    }
    if (status === 'cancelled' || status === 'rejected') {
      return 'Order was cancelled';
    }
    return 'Order is being processed';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070B0F] flex items-center justify-center">
        <div className="h-20 w-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center animate-pulse">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B0F] text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 pb-12 relative overflow-hidden">
      {/* Premium Background Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
          style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] -right-[5%] w-[35%] h-[35%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10 max-w-[1400px]">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/20 flex items-center justify-center shadow-lg">
                <Package className="h-5 w-5 text-[#3CFF9E]" />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight uppercase">My Orders</h1>
            </div>
            <p className="text-[#8B949E] text-sm font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9D]" />
              Track and manage your orders
            </p>
          </motion.div>
        </div>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="rounded-3xl border border-white/[0.05] bg-[#0F1720]/60 backdrop-blur-xl p-5 shadow-2xl group hover:border-emerald-500/30 transition-all duration-500">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Package className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-[10px] font-black text-[#586069] uppercase tracking-[0.2em]">Total Orders</span>
            </div>
            <h3 className="text-2xl font-black text-white tracking-tighter">{orders.length}</h3>
          </div>

          <div className="rounded-3xl border border-white/[0.05] bg-[#0F1720]/60 backdrop-blur-xl p-5 shadow-2xl group hover:border-yellow-500/30 transition-all duration-500">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <Clock className="h-4 w-4 text-yellow-400" />
              </div>
              <span className="text-[10px] font-black text-[#586069] uppercase tracking-[0.2em]">Pending</span>
            </div>
            <h3 className="text-2xl font-black text-white tracking-tighter">
              {orders.filter((o: any) => o.status === 'pending' || o.status === 'awaiting_approval').length}
            </h3>
          </div>

          <div className="rounded-3xl border border-white/[0.05] bg-[#0F1720]/60 backdrop-blur-xl p-5 shadow-2xl group hover:border-green-500/30 transition-all duration-500">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
                <CheckCircle className="h-4 w-4 text-green-400" />
              </div>
              <span className="text-[10px] font-black text-[#586069] uppercase tracking-[0.2em]">Completed</span>
            </div>
            <h3 className="text-2xl font-black text-white tracking-tighter">
              {orders.filter((o: any) => o.status === 'completed' || o.status === 'delivered').length}
            </h3>
          </div>

          <div className="rounded-3xl border border-white/[0.05] bg-[#0F1720]/60 backdrop-blur-xl p-5 shadow-2xl group hover:border-purple-500/30 transition-all duration-500">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <DollarSign className="h-4 w-4 text-purple-400" />
              </div>
              <span className="text-[10px] font-black text-[#586069] uppercase tracking-[0.2em]">Total Spent</span>
            </div>
            <h3 className="text-2xl font-black text-white tracking-tighter">
              ${orders.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0).toFixed(0)}
            </h3>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          className="flex flex-col md:flex-row gap-4 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="relative flex-1 group">
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#0F1720]/40 border border-white/[0.05] rounded-2xl focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-white placeholder-[#586069] backdrop-blur-xl transition-all duration-300"
            />
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-[#586069] group-hover:text-emerald-400 transition-colors" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 h-full py-3 rounded-2xl bg-[#0F1720]/40 border-white/[0.05] text-white focus:ring-1 focus:ring-emerald-500/50 backdrop-blur-xl">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-[#0F1720] border-white/[0.1] text-[#E6E8EA]">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Orders List */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {filteredOrders.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.05] bg-[#0F1720]/40 backdrop-blur-xl p-16 text-center shadow-2xl">
              <div className="w-20 h-20 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-6 border border-white/[0.05]">
                <Package className="h-10 w-10 text-[#586069]" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">No orders found</h3>
              <p className="text-[#8B949E] text-sm font-medium mb-8">
                {orders.length === 0 ? "You haven't placed any orders yet." : "No orders match your current filters."}
              </p>
              <Button
                onClick={() => window.location.href = '/products'}
                className="h-12 px-8 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-xs font-black uppercase tracking-widest hover:from-emerald-500 hover:to-emerald-700 transition-all shadow-xl shadow-emerald-900/20"
              >
                Start Shopping
              </Button>
            </div>
          ) : (
            filteredOrders.map((order: any, index: number) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group lg:relative"
              >
                <div className="rounded-3xl border border-white/[0.05] bg-[#0F1720]/40 backdrop-blur-xl overflow-hidden shadow-2xl hover:border-emerald-500/30 transition-all duration-500">
                  {/* Item Header */}
                  <div className="px-6 py-5 bg-white/[0.02] border-b border-white/[0.05] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-gray-900 border border-white/[0.1] flex items-center justify-center">
                        {getStatusIcon(order.status)}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-black text-white tracking-tight uppercase group-hover:text-emerald-400 transition-colors">Order #{order.id}</h3>
                          <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            {order.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-[10px] font-bold text-[#586069] uppercase tracking-wider">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            {new Date(order.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="h-3 w-3" />
                            ${Number(order.total_amount || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-start md:items-end gap-2">
                      <p className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest leading-none">
                        {getStatusText(order.status, order.admin_approved)}
                      </p>
                      {/* Progress Dots */}
                      <div className="flex items-center gap-1.5 mt-1">
                        {['ordered', 'approved', 'processing', 'shipped', 'delivered'].map((step, i) => {
                          const isActive = i <= (['pending', 'approved', 'processing', 'shipped', 'delivered', 'completed'].indexOf(order.status === 'completed' ? 'delivered' : order.status));
                          return (
                            <div key={step} className={`h-1 rounded-full transition-all duration-500 ${isActive ? 'w-4 bg-emerald-500' : 'w-1 bg-white/[0.1]'}`} />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Items Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.03] rounded-2xl hover:bg-white/[0.05] transition-all">
                          <img
                            src={item.product?.image || '/placeholder-image.jpg'}
                            alt=""
                            className="h-16 w-16 object-cover rounded-xl border border-white/[0.05]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-white truncate">{item.product?.name}</p>
                            <p className="text-[10px] font-bold text-[#586069] uppercase mt-0.5">Qty: {item.quantity}</p>
                            <p className="text-[11px] font-black text-emerald-400 mt-1">${Number(item.price).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer Info */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-6 border-t border-white/[0.05] gap-4 text-xs font-bold text-[#586069] uppercase tracking-widest">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Package className="h-3 w-3" />
                          {order.items?.length || 0} ITEMS
                        </div>
                        {order.shipping_address && (
                          <div className="flex items-center gap-2 max-w-xs truncate">
                            <MapPin className="h-3 w-3" />
                            {typeof order.shipping_address === 'string' ? order.shipping_address : order.shipping_address.city}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                          className="h-10 px-6 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all flex items-center gap-2"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {expandedOrderId === order.id ? 'Hide Details' : 'Details'}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePrintInvoice(order)}
                          className="h-10 px-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[#8B949E] hover:text-white hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedOrderId === order.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="px-6 pb-6 bg-emerald-500/[0.02] border-t border-white/[0.05]"
                    >
                      <div className="pt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-emerald-400" />
                              Shipping Logistics
                            </h4>
                            <div className="text-[11px] font-bold text-[#8B949E] space-y-1">
                              {typeof order.shipping_address === 'string' ? (
                                <p>{order.shipping_address}</p>
                              ) : (
                                <>
                                  <p>{order.shipping_address?.address_line1}</p>
                                  <p>{order.shipping_address?.city}, {order.shipping_address?.state}</p>
                                  <p>{order.shipping_address?.postal_code}, {order.shipping_address?.country}</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {order.items?.map((item: any, idx: number) => (
                            <div key={idx} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                  <Store className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-white uppercase tracking-tight">{item.product?.vendor?.store_name || 'Vendor'}</p>
                                  <p className="text-[9px] font-bold text-[#586069] uppercase mt-0.5 italic">{item.product?.vendor?.email}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[11px] font-black text-emerald-400">${Number(item.price).toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </motion.div>

      </div>
    </div>
  );
};

export default Orders;