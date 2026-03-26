import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import api, { adminAPI, resolveMediaUrl } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import {
  CreditCard,
  Clock,
  CheckCircle,
  CheckCircle2,
  ExternalLink,
  XCircle,
  Search,
  Filter,
  Download,
  Eye,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Loader2,
  BarChart3,
  Activity,
  Wallet,
  ShoppingBag,
  Package,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  FileText,
  ArrowRight,
  Building2,
  Receipt,
  Printer,
  Store,
  X
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface Order {
  id: string;
  user: {
    id: string;
    email: string;
    username?: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
  items: OrderItem[];
  total_amount: number;
  status: string;
  shipping_address?: string | {
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  created_at: string;
  updated_at: string;
  payment_method?: string;
}

interface OrderItem {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
    image?: string;
    vendor: {
      id: string;
      username: string;
      email: string;
      store_name?: string;
    };
  };
  quantity: number;
  price: number;
  vendor_earning: number;
  platform_fee: number;
}

interface VendorPayout {
  id: string;
  vendor: {
    id: string;
    username: string;
    full_name?: string;
    email: string;
    store_name?: string;
    phone?: string;
  };
  amount: number;
  status: 'pending' | 'approved' | 'completed' | 'rejected' | 'paid' | 'cancelled';
  request_date: string;
  payout_date?: string;
  payout_reference?: string;
  admin_notes?: string;
  vendor_notes?: string;
  created_at: string;
  updated_at: string;
  completed_by?: string | null;
  approved_by?: string | null;
}

const TransactionManagement = () => {
  // Get authentication state
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('purchases'); // purchases, payouts
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<VendorPayout | null>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Function to print invoice in a new window
  const handlePrintInvoice = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the invoice');
      return;
    }

    // Format address helper
    const formatAddress = (addr: any) => {
      if (typeof addr === 'string') return addr;
      if (!addr) return 'N/A';
      const parts = [];
      if (addr.address_line1) parts.push(addr.address_line1);
      if (addr.address_line2) parts.push(addr.address_line2);
      if (addr.city || addr.state || addr.postal_code) {
        parts.push([addr.city, addr.state, addr.postal_code].filter(Boolean).join(', '));
      }
      if (addr.country) parts.push(addr.country);
      return parts.join('<br>');
    };

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice #${order.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 15px; color: #333; font-size: 13px; }
          .invoice-container { max-width: 750px; margin: 0 auto; }
          .header { border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 15px; }
          .header h1 { color: #6366f1; font-size: 28px; margin-bottom: 3px; }
          .header p { color: #666; font-size: 13px; }
          .company-info { margin-top: 6px; font-size: 11px; color: #666; }
          .invoice-details { display: flex; justify-content: space-between; margin-bottom: 15px; }
          .invoice-info { text-align: right; }
          .invoice-info h2 { color: #6366f1; font-size: 20px; margin-bottom: 6px; }
          .invoice-info p { margin: 3px 0; font-size: 12px; }
          .status-badge { display: inline-block; padding: 3px 10px; border-radius: 15px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
          .status-delivered { background: #d1fae5; color: #065f46; }
          .status-processing { background: #dbeafe; color: #1e40af; }
          .status-cancelled { background: #fee2e2; color: #991b1b; }
          .customer-section { display: flex; gap: 15px; margin-bottom: 15px; }
          .customer-box { flex: 1; background: #f9fafb; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb; }
          .customer-box h3 { color: #4f46e5; margin-bottom: 8px; font-size: 14px; }
          .customer-box p { margin: 4px 0; font-size: 12px; }
          .customer-box strong { color: #111; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .items-table th { background: #6366f1; color: white; padding: 8px; text-align: left; font-weight: 600; font-size: 12px; }
          .items-table td { padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
          .items-table tr:nth-child(even) { background: #f9fafb; }
          .items-table img { width: 40px; height: 40px; object-fit: cover; border-radius: 3px; }
          .totals { display: flex; justify-content: flex-end; margin-bottom: 15px; }
          .totals-box { width: 250px; background: #f0f9ff; padding: 12px; border-radius: 6px; border: 1px solid #bfdbfe; }
          .totals-row { display: flex; justify-content: space-between; margin: 6px 0; padding: 4px 0; font-size: 12px; }
          .totals-row.total { border-top: 2px solid #6366f1; padding-top: 8px; margin-top: 8px; font-size: 14px; font-weight: bold; color: #6366f1; }
          .footer { text-align: center; padding-top: 15px; border-top: 1px solid #e5e7eb; color: #666; font-size: 11px; margin-top: 10px; }
          @media print {
            body { padding: 10px; font-size: 12px; }
            .no-print { display: none; }
            .invoice-container { max-width: 100%; }
            .header { margin-bottom: 10px; padding-bottom: 8px; }
            .customer-section { margin-bottom: 10px; }
            .items-table { margin-bottom: 10px; }
            .totals { margin-bottom: 10px; }
            .footer { margin-top: 5px; padding-top: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <h1>TesMarket</h1>
            <p>Your Trusted Online Marketplace</p>
            <div class="company-info">
              <p>Email: support@tesmarket.com | Phone: +291992846900</p>
              <p>Address: Bishoftu, Zuquala</p>
            </div>
          </div>
          <div class="invoice-details">
            <div><h2>INVOICE</h2></div>
            <div class="invoice-info">
              <p><strong>Invoice #:</strong> ${order.id}</p>
              <p><strong>Date:</strong> ${format(new Date(order.created_at), 'MMMM dd, yyyy')}</p>
              <p><strong>Time:</strong> ${format(new Date(order.created_at), 'hh:mm a')}</p>
              <p style="margin-top: 10px;"><span class="status-badge status-${order.status}">${order.status.toUpperCase()}</span></p>
            </div>
          </div>
          <div class="customer-section">
            <div class="customer-box">
              <h3>Bill To / Buyer Information</h3>
              <p style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #111;">
                ${getBuyerName(order.user)}
              </p>
              <p><strong>Email:</strong> ${order.user?.email || 'N/A'}</p>
              <p><strong>Phone:</strong> ${order.user?.phone || 'N/A'}</p>
              <p><strong>Customer ID:</strong> #${order.user?.id || 'N/A'}</p>
              <p><strong>Order Date:</strong> ${format(new Date(order.created_at), 'MMMM dd, yyyy - hh:mm a')}</p>
            </div>
            <div class="customer-box">
              <h3>Ship To</h3>
              <p>${formatAddress(order.shipping_address) || 'Same as billing address'}</p>
              ${order.payment_method ? `<p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;"><strong>Payment Method:</strong> ${order.payment_method}</p>` : ''}
            </div>
          </div>
          <table class="items-table">
            <thead>
              <tr><th>Product</th><th>Quantity</th><th>Unit Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td><strong>${item.product?.name || 'Product'}</strong>${item.product?.vendor ? `<br><small style="color: #666;">by ${getVendorName(item.product.vendor)}</small>` : ''}</td>
                  <td>${item.quantity}</td>
                  <td>$${(Number(item.price || 0) / item.quantity).toFixed(2)}</td>
                  <td><strong>$${Number(item.price || 0).toFixed(2)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div class="totals-box">
              <div class="totals-row"><span>Subtotal:</span><span>$${Number(order.total_amount || 0).toFixed(2)}</span></div>
              <div class="totals-row"><span>Shipping:</span><span>$0.00</span></div>
              <div class="totals-row"><span>Tax:</span><span>$0.00</span></div>
              <div class="totals-row total"><span>Total:</span><span>$${Number(order.total_amount || 0).toFixed(2)}</span></div>
            </div>
          </div>
          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>For questions about this invoice, please contact us at support@tesmarket.com</p>
            <p style="margin-top: 10px; color: #999;">This is a computer-generated invoice. No signature required.</p>
          </div>
        </div>
        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 500); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
  };

  // Fetch buyer orders (purchases)
  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['admin-orders', searchTerm, statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await adminAPI.getOrders(params);
      const data = response.data;
      // Ensure we always return an array
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.results)) return data.results;
      return [];
    },
    enabled: isAuthenticated && !!user, // Only fetch when authenticated
    retry: false, // Don't retry on 401 errors
  });

  // Fetch vendor payouts
  const { data: payouts, isLoading: payoutsLoading, error: payoutsError } = useQuery<VendorPayout[]>({
    queryKey: ['admin-payouts', searchTerm, statusFilter],
    queryFn: async () => {
      console.log('💰 Fetching vendor payouts...');
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      try {
        const response = await adminAPI.getPayouts(params);
        console.log('💰 Payouts API Response:', response);
        console.log('💰 Payouts Data:', response.data);

        const data = response.data;

        // Backend returns payouts in 'payout_requests' field
        if (data?.payout_requests && Array.isArray(data.payout_requests)) {
          console.log(`✅ Payouts from payout_requests: ${data.payout_requests.length} items`);
          console.log('📊 RAW First payout data from backend:', JSON.stringify(data.payout_requests[0], null, 2));

          // Map backend structure to frontend interface
          const mappedPayouts = data.payout_requests.map((payout: any, index: number) => {
            // The backend returns vendor data in vendor_info nested object
            const vendorInfo = payout.vendor_info || {};

            // Validate and parse dates properly  
            const requestedAt = payout.created_at && payout.created_at !== 'null' ? payout.created_at : null;
            const completedAt = payout.completed_at && payout.completed_at !== 'null' ? payout.completed_at : null;

            console.log(`\n🔍 MAPPING PAYOUT #${index + 1} (ID: ${payout.id})`);
            console.log('📥 RAW Backend Data:');
            console.log('  - payout:', payout);
            console.log('  - vendor_info:', vendorInfo);
            console.log('  - vendor_info.full_name:', vendorInfo.full_name, '(type:', typeof vendorInfo.full_name, ')');
            console.log('  - vendor_info.email:', vendorInfo.email, '(type:', typeof vendorInfo.email, ')');
            console.log('  - vendor_info.username:', vendorInfo.username, '(type:', typeof vendorInfo.username, ')');
            console.log('  - vendor_info.store_name:', vendorInfo.store_name, '(type:', typeof vendorInfo.store_name, ')');
            console.log('  - vendor_info.phone:', vendorInfo.phone, '(type:', typeof vendorInfo.phone, ')');
            console.log('  - created_at:', payout.created_at);
            console.log('  - completed_at:', payout.completed_at);

            const adminInfo = payout.admin_info || {};

            const mapped = {
              id: payout.id,
              vendor: {
                id: vendorInfo.id || payout.vendor,
                username: vendorInfo.username || 'N/A',
                full_name: vendorInfo.full_name || 'N/A',
                email: vendorInfo.email || 'N/A',
                store_name: vendorInfo.store_name || 'N/A',
                phone: vendorInfo.phone || 'N/A'
              },
              amount: payout.amount || 0,
              status: payout.status,
              request_date: requestedAt,
              payout_date: completedAt,
              payout_reference: payout.payout_reference || '',
              admin_notes: payout.admin_notes || '',
              vendor_notes: payout.notes || '',
              created_at: requestedAt,
              updated_at: completedAt || requestedAt,
              completed_by: adminInfo.completed_by_name || null,
              approved_by: adminInfo.approved_by_name || null
            };

            console.log('📤 MAPPED Frontend Data:');
            console.log('  - full_name:', mapped.vendor.full_name);
            console.log('  - email:', mapped.vendor.email);
            console.log('  - username:', mapped.vendor.username);
            console.log('  - store_name:', mapped.vendor.store_name);
            console.log('  - phone:', mapped.vendor.phone);
            console.log('  - created_at:', mapped.created_at);

            return mapped;
          });

          console.log('\n✅ ALL MAPPED PAYOUTS:', mappedPayouts);
          return mappedPayouts;
        }

        // Fallback for direct array
        if (Array.isArray(data)) {
          console.log(`✅ Payouts array: ${data.length} items`);
          return data;
        }
        if (Array.isArray(data?.results)) {
          console.log(`✅ Payouts results: ${data.results.length} items`);
          return data.results;
        }

        console.log('⚠️ No payouts found in response');
        console.log('Response structure:', Object.keys(data || {}));
        return [];
      } catch (error) {
        console.error('❌ Payouts API Error:', error);
        throw error;
      }
    },
    enabled: isAuthenticated && !!user, // Only fetch when authenticated
    retry: false, // Don't retry on 401 errors
  });

  const isLoading = ordersLoading || payoutsLoading;

  // Fetch dashboard metrics for real-time calculations
  const { data: dashboardMetrics } = useQuery({
    queryKey: ['admin-dashboard-metrics'],
    queryFn: async () => {
      const response = await adminAPI.getDashboard();
      return response.data;
    },
    enabled: isAuthenticated && !!user, // Only fetch when authenticated
    retry: false, // Don't retry on 401 errors
  });

  // Approve payout mutation
  const approvePayoutMutation = useMutation({
    mutationFn: async ({ payoutId, notes }: { payoutId: string, notes?: string }) => {
      return adminAPI.approvePayout(payoutId, { admin_notes: notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-metrics'] });
      setIsPayoutDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Payout approved successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to approve payout',
        variant: 'destructive',
      });
    },
  });

  // Reject payout mutation
  const rejectPayoutMutation = useMutation({
    mutationFn: async ({ payoutId, notes }: { payoutId: string, notes: string }) => {
      return adminAPI.rejectPayout(payoutId, { admin_notes: notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-metrics'] });
      setIsPayoutDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Payout rejected successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to reject payout',
        variant: 'destructive',
      });
    },
  });

  // Handle view order
  const handleViewOrder = (order: Order) => {
    console.log('=== ORDER DATA DEBUG ===');
    console.log('Full Order:', order);
    console.log('User Object:', order.user);
    console.log('Full Name:', order.user?.full_name);
    console.log('First Name:', order.user?.first_name);
    console.log('Last Name:', order.user?.last_name);
    console.log('Username:', order.user?.username);
    console.log('Email:', order.user?.email);
    console.log('Phone:', order.user?.phone);
    console.log('========================');
    setSelectedOrder(order);
    setIsOrderDialogOpen(true);
  };

  // Helper function to get buyer's name
  const getBuyerName = (user: any) => {
    // Priority 1: Full name (from User.full_name field)
    if (user?.full_name && user.full_name.trim()) {
      return user.full_name;
    }
    // Priority 2: First name + Last name
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    // Priority 3: First name only
    if (user?.first_name) {
      return user.first_name;
    }
    // Priority 4: Last name only
    if (user?.last_name) {
      return user.last_name;
    }
    // Priority 5: Username
    if (user?.username) {
      return user.username;
    }
    // Fallback
    return 'Unknown User';
  };

  // Helper function to get vendor's name
  const getVendorName = (vendor: any) => {
    // Priority 1: Full name (from User.full_name field)
    if (vendor?.full_name && vendor.full_name.trim()) {
      return vendor.full_name;
    }
    // Priority 2: First name + Last name
    if (vendor?.first_name && vendor?.last_name) {
      return `${vendor.first_name} ${vendor.last_name}`;
    }
    // Priority 3: First name only
    if (vendor?.first_name) {
      return vendor.first_name;
    }
    // Priority 4: Last name only
    if (vendor?.last_name) {
      return vendor.last_name;
    }
    // Priority 5: Username
    if (vendor?.username) {
      return vendor.username;
    }
    // Priority 6: Store name as last resort
    if (vendor?.store_name) {
      return vendor.store_name;
    }
    // Fallback
    return 'Unknown Vendor';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      // Order statuses
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      // Payout statuses
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'processed': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-emerald-100 text-emerald-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'stripe': return '💳';
      case 'paypal': return '🅿️';
      case 'bank_transfer': return '🏦';
      default: return '💰';
    }
  };

  // Real-time calculations
  const allOrders = Array.isArray(orders) ? orders : [];
  const allPayouts = Array.isArray(payouts) ? payouts : [];

  // Calculate total buyer purchases (all orders)
  const totalBuyerPurchases = allOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

  // Calculate total platform fees from all orders
  const totalPlatformFees = allOrders.reduce((sum, order) => {
    const orderFees = (order.items || []).reduce((itemSum, item) =>
      itemSum + Number(item.platform_fee || 0), 0
    );
    return sum + orderFees;
  }, 0);

  // Today's revenue
  const todayOrders = allOrders.filter(order =>
    new Date(order.created_at).toDateString() === new Date().toDateString()
  );
  const todayRevenue = todayOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

  // Payout calculations (backend statuses: pending, approved, completed)
  // Handle both 'completed' and 'completed' for backward compatibility
  const pendingPayouts = allPayouts.filter(p => p.status === 'pending');
  const approvedPayouts = allPayouts.filter(p =>
    p.status === 'approved' ||
    p.status === 'completed' ||
    p.status === 'paid'
  );

  const totalPendingPayouts = pendingPayouts.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalCompletedPayouts = approvedPayouts.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  console.log('💵 Payout Calculations:');
  console.log('  Pending Payouts:', pendingPayouts.length, '- $' + totalPendingPayouts.toFixed(2));
  console.log('  Completed Payouts:', approvedPayouts.length, '- $' + totalCompletedPayouts.toFixed(2));

  // Filter data based on type filter
  const getFilteredOrders = () => {
    return allOrders.filter(order => {
      const matchesSearch = !searchTerm ||
        order.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${order.user.first_name || ''} ${order.user.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toString().includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const getFilteredPayouts = () => {
    return allPayouts.filter(payout => {
      const matchesSearch = !searchTerm ||
        payout.vendor.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payout.vendor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (payout.vendor.store_name && payout.vendor.store_name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || payout.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const filteredOrders = getFilteredOrders();
  const filteredPayouts = getFilteredPayouts();
  const displayData = typeFilter === 'purchases' ? filteredOrders : filteredPayouts;

  // Debug logging
  console.log('🔍 Transaction Management Debug:');
  console.log('  Type Filter:', typeFilter);
  console.log('  All Orders:', allOrders.length);
  console.log('  All Payouts:', allPayouts.length);
  console.log('  Filtered Orders:', filteredOrders.length);
  console.log('  Filtered Payouts:', filteredPayouts.length);
  console.log('  Display Data:', displayData.length);
  console.log('  Payouts Loading:', payoutsLoading);
  console.log('  Payouts Error:', payoutsError);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050B18] via-[#07182B] to-[#050B18] flex items-center justify-center p-3 sm:p-6">
        <div className="text-center">
          <div className="bg-gradient-to-r from-emerald-600 via-green-700 to-emerald-800 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center shadow-2xl shadow-emerald-500/20">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-semibold bg-gradient-to-r from-emerald-700 via-green-800 to-emerald-900 bg-clip-text text-transparent">
            Loading transactions...
          </h2>
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

      <div className="relative z-10 px-4 md:px-8 w-full max-w-full pb-16 sm:pb-20 pt-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-4">
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-green-500"
              >
                Transaction Management
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-gray-400 mt-1 font-medium"
              >
                Monitor and manage all payment transactions in real-time
              </motion.p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Button
                variant="outline"
                className="bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.06)] text-[#B6EBD3] hover:bg-[rgba(255,255,255,0.12)] hover:text-[#E9FFF4] transition-all duration-300 shadow-lg backdrop-blur-sm rounded-full font-medium"
              >
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Export Report</span>
                <span className="sm:hidden">Export</span>
              </Button>
              <Button
                variant="outline"
                className="bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.06)] text-[#B6EBD3] hover:bg-[rgba(255,255,255,0.12)] hover:text-[#E9FFF4] transition-all duration-300 shadow-lg backdrop-blur-sm rounded-full font-medium"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-orders', 'admin-payouts'] })}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">Sync</span>
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700/95 backdrop-blur-sm text-white border-2 border-emerald-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium">Total Purchases</p>
                    <p className="text-2xl font-bold">${totalBuyerPurchases.toFixed(2)}</p>
                    <p className="text-[10px] text-emerald-100/60 mt-1 uppercase font-bold">{allOrders.length} orders</p>
                  </div>
                  <ShoppingBag className="h-8 w-8 text-emerald-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-600 to-red-600/95 backdrop-blur-sm text-white border-2 border-orange-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Platform Fees</p>
                    <p className="text-2xl font-bold">${totalPlatformFees.toFixed(2)}</p>
                    <p className="text-[10px] text-orange-100/60 mt-1 uppercase font-bold">Total earnings</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-600 to-green-700/95 backdrop-blur-sm text-white border-2 border-green-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Today's Revenue</p>
                    <p className="text-2xl font-bold">${todayRevenue.toFixed(2)}</p>
                    <p className="text-[10px] text-green-100/60 mt-1 uppercase font-bold">{todayOrders.length} orders</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-violet-600 to-purple-700/95 backdrop-blur-sm text-white border-2 border-violet-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-violet-100 text-sm font-medium">Pending Payouts</p>
                    <p className="text-2xl font-bold">${totalPendingPayouts.toFixed(2)}</p>
                    <p className="text-[10px] text-violet-100/60 mt-1 uppercase font-bold">{pendingPayouts.length} requests</p>
                  </div>
                  <Clock className="h-8 w-8 text-violet-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-600 to-indigo-700/95 backdrop-blur-sm text-white border-2 border-blue-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Paid Withdrawals</p>
                    <p className="text-2xl font-bold">${totalCompletedPayouts.toFixed(2)}</p>
                    <p className="text-[10px] text-blue-100/60 mt-1 uppercase font-bold">{approvedPayouts.length} completed</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Filters */}
          <motion.div
            className="flex flex-col md:flex-row gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search by ID, email, or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 h-12 border-2 border-gray-600/50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-800/80 backdrop-blur-sm text-white placeholder-gray-400 shadow-lg transition-all duration-300"
              />
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-12 w-full sm:w-52 border-2 border-gray-600/50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-800/80 backdrop-blur-sm text-white shadow-lg transition-all duration-300">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0F1720] border-gray-700 text-gray-100">
                  <SelectItem value="purchases">🛍️ Buyer Purchases</SelectItem>
                  <SelectItem value="payouts">💰 Vendor Payouts</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-12 w-full sm:w-40 border-2 border-gray-600/50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-800/80 backdrop-blur-sm text-white shadow-lg transition-all duration-300">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0F1720] border-gray-700 text-gray-100">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">⏳ Pending</SelectItem>
                  <SelectItem value="awaiting_approval">⏰ Awaiting Approval</SelectItem>
                  <SelectItem value="approved">✅ Approved</SelectItem>
                  <SelectItem value="processing">🔄 Processing</SelectItem>
                  <SelectItem value="shipped">📦 Shipped</SelectItem>
                  <SelectItem value="delivered">🏁 Delivered</SelectItem>
                  <SelectItem value="paid">💸 Paid Out</SelectItem>
                  <SelectItem value="rejected">🚫 Rejected</SelectItem>
                  <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Button
                className="h-12 px-6 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.06)] text-[#B6EBD3] hover:bg-[rgba(255,255,255,0.12)] hover:text-[#E9FFF4] transition-all duration-300 shadow-lg backdrop-blur-sm rounded-full font-medium"
              >
                <Filter className="w-4 h-4 mr-2" />
                Advanced
              </Button>
            </div>
          </motion.div>

          {/* Transactions & Payouts List */}
          <motion.div
            className="bg-[#111827]/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-[#374151] overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <div className="bg-gradient-to-r from-[#10b981] to-[#059669] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {typeFilter === 'purchases' ? (
                  <ShoppingBag className="h-6 w-6 text-white" />
                ) : (
                  <Wallet className="h-6 w-6 text-white" />
                )}
                <h3 className="text-lg font-semibold text-white">
                  {typeFilter === 'purchases' ? 'Buyer Purchases' : 'Vendor Payout Requests'} ({displayData.length})
                </h3>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-sm text-emerald-50/90 font-medium bg-black/10 px-4 py-1.5 rounded-full border border-white/5">
                <span>{displayData.length} records found</span>
              </div>
            </div>

            <div className="p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-12 w-12 text-emerald-500 animate-spin mb-4" />
                  <p className="text-gray-400 font-medium animate-pulse">Syncing data...</p>
                </div>
              ) : displayData.length === 0 ? (
                <div className="text-center py-12">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center space-y-3"
                  >
                    <ShoppingBag className="h-12 w-12 text-gray-500" />
                    <p className="text-gray-100 font-medium">No records found</p>
                    <p className="text-gray-400 text-sm">Try adjusting your filters or search terms</p>
                  </motion.div>
                </div>
              ) : (
                <div className="space-y-4">
                  {typeFilter === 'purchases' ? (
                    filteredOrders.map((order: Order) => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="overflow-hidden hover:shadow-xl hover:shadow-emerald-900/10 transition-all duration-300 bg-gray-900/40 border border-gray-700/50 backdrop-blur-md rounded-2xl"
                      >
                        {/* Card Header */}
                        <div className="bg-gray-800/40 px-5 py-3 border-b border-gray-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <h3 className="text-sm font-bold text-gray-100 flex items-center gap-1.5">
                              <span className="text-emerald-500">#{order.id}</span>
                            </h3>
                            <div className="h-3 w-px bg-gray-700 hidden sm:block"></div>
                            <p className="text-xs text-gray-400 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {order.created_at ? format(new Date(order.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${getStatusColor(order.status)}`}>
                              {order.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-700/50">
                          {/* 1. Details Section (Left) - 20% */}
                          <div className="w-full md:w-[20%] p-5 space-y-5">
                            <div className="flex justify-between items-center bg-gray-900/20 p-3 rounded-xl border border-gray-700/30">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                  <User className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold text-gray-200 truncate">{getBuyerName(order.user)}</span>
                                  <span className="text-[10px] text-gray-400 truncate">{order.user.email}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 2. Items/Summary Section (Middle) - 60% */}
                          <div className="w-full md:w-[60%] p-5 bg-black/5">
                            <div className="flex items-center space-x-2 mb-4">
                              <Package className="h-4 w-4 text-emerald-400" />
                              <span className="text-xs font-bold text-gray-300 uppercase">Items & Summary</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2 max-h-[100px] overflow-y-auto sidebar-scrollbar pr-2">
                                {order.items?.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center space-x-2 truncate">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                                      <span className="text-gray-300 truncate">{item.product.name}</span>
                                      <span className="text-gray-500 font-mono">x{item.quantity}</span>
                                    </div>
                                    <span className="text-white font-bold whitespace-nowrap">${Number(item.price).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex flex-col justify-end space-y-3 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-gray-700/50 md:pl-4">
                                <div className="flex justify-between items-center text-right">
                                  <p className="text-[10px] text-gray-500 uppercase font-black">Platform Fee</p>
                                  <p className="text-xs text-emerald-400 font-black">
                                    ${(order.items || []).reduce((sum, item) => sum + Number(item.platform_fee || 0), 0).toFixed(2)}
                                  </p>
                                </div>
                                <div className="flex justify-between items-center text-right">
                                  <p className="text-[10px] text-gray-500 uppercase font-black">Total Amount</p>
                                  <p className="text-2xl font-black text-white">${Number(order.total_amount || 0).toFixed(2)}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 3. Actions Section (Right) - 20% */}
                          <div className="w-full md:w-[20%] p-5 flex flex-col justify-center bg-gray-900/40 border-l border-gray-700/50">
                            <div className="space-y-3">
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 text-center">Controls</p>
                              <motion.button
                                className="w-full h-11 inline-flex items-center justify-center px-4 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 shadow-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white hover:from-emerald-500 hover:to-emerald-700 border border-emerald-400/20 shadow-emerald-900/20"
                                onClick={() => handleViewOrder(order)}
                                whileHover={{ scale: 1.02, translateY: -1 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Invoice
                              </motion.button>
                              <div className="flex items-center justify-center gap-1.5 pt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[8px] font-bold text-emerald-400/70 uppercase tracking-tighter italic">Ready</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    filteredPayouts.map((payout: VendorPayout) => (
                      <motion.div
                        key={payout.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="overflow-hidden hover:shadow-xl hover:shadow-violet-900/10 transition-all duration-300 bg-gray-900/40 border border-gray-700/50 backdrop-blur-md rounded-2xl"
                      >
                        {/* Card Header */}
                        <div className="bg-gray-800/40 px-5 py-3 border-b border-gray-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <h3 className="text-sm font-bold text-gray-100 flex items-center gap-1.5">
                              <span className="text-violet-500">#{payout.id}</span>
                            </h3>
                            <div className="h-3 w-px bg-gray-700 hidden sm:block"></div>
                            <p className="text-xs text-gray-400 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {payout.created_at ? format(new Date(payout.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${getStatusColor(payout.status)}`}>
                              {payout.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-700/50">
                          {/* 1. Details Section (Left) - 20% */}
                          <div className="w-full md:w-[20%] p-5 space-y-5">
                            <div className="flex justify-between items-center bg-gray-900/20 p-3 rounded-xl border border-gray-700/30">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                                  <Building2 className="w-4 h-4 text-violet-400" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold text-gray-200 truncate">{payout.vendor.store_name || 'N/A'}</span>
                                  <span className="text-[10px] text-gray-400 truncate">{payout.vendor.full_name || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 2. Vendor Info Section (Middle) - 60% */}
                          <div className="w-full md:w-[60%] p-5 bg-black/5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <div className="flex items-center space-x-2 mb-3">
                                  <Activity className="h-4 w-4 text-violet-400" />
                                  <span className="text-xs font-bold text-gray-300 uppercase">Vendor Contact</span>
                                </div>
                                <div className="space-y-1.5 text-xs text-gray-400">
                                  <div className="flex items-center space-x-2">
                                    <Mail className="h-3 w-3" />
                                    <span>{payout.vendor.email || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Phone className="h-3 w-3" />
                                    <span>{payout.vendor.phone || 'N/A'}</span>
                                  </div>
                                </div>
                                {payout.vendor_notes && (
                                  <div className="mt-3 p-2 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                                    <p className="text-[10px] font-bold text-violet-400 uppercase italic line-clamp-1">"{payout.vendor_notes}"</p>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col justify-end text-right border-t md:border-t-0 md:border-l border-gray-700/50 md:pl-6 space-y-1">
                                <p className="text-[10px] text-gray-500 uppercase font-black">Requested Payout</p>
                                <p className="text-3xl font-black text-emerald-400">${Number(payout.amount || 0).toFixed(2)}</p>
                              </div>
                            </div>
                          </div>

                          {/* 3. Actions Section (Right) - 20% */}
                          <div className="w-full md:w-[20%] p-5 flex flex-col justify-center bg-gray-900/40 border-l border-gray-700/50">
                            <div className="space-y-2.5">
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 text-center">Payouts</p>
                              {payout.status === 'pending' ? (
                                <div className="space-y-2">
                                  <motion.button
                                    className="w-full h-11 inline-flex items-center justify-center px-4 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 shadow-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white hover:from-emerald-500 hover:to-emerald-700 border border-emerald-400/20 shadow-emerald-900/20"
                                    onClick={() => {
                                      setSelectedPayout(payout);
                                      setIsPayoutDialogOpen(true);
                                    }}
                                    whileHover={{ scale: 1.02, translateY: -1 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                  </motion.button>
                                  <motion.button
                                    className="w-full h-9 inline-flex items-center justify-center px-4 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all duration-300 bg-gray-800/80 text-gray-400 hover:bg-red-500/20 hover:text-red-400 border border-gray-700 hover:border-red-500/40"
                                    onClick={() => {
                                      setSelectedPayout(payout);
                                      setIsPayoutDialogOpen(true);
                                    }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <XCircle className="h-3.5 w-3.5 mr-2" />
                                    Reject
                                  </motion.button>
                                </div>
                              ) : (
                                <motion.button
                                  className="w-full h-11 inline-flex items-center justify-center px-4 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 shadow-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white hover:from-emerald-500 hover:to-emerald-700 border border-emerald-400/20 shadow-emerald-900/20"
                                  onClick={() => {
                                    setSelectedPayout(payout);
                                    setIsPayoutDialogOpen(true);
                                  }}
                                  whileHover={{ scale: 1.02, translateY: -1 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Details
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Invoice Modal */}
      <AnimatePresence>
        {isOrderDialogOpen && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 print:p-0"
            onClick={() => setIsOrderDialogOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-gradient-to-br from-[#0F1720] via-[#1A2533] to-[#0F1720] rounded-2xl shadow-2xl border border-gray-700/50 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col print:max-h-none print:overflow-visible print:shadow-none print:rounded-none print:border-none print:bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header - Hide on print */}
              <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/40 print:hidden">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-900/20">
                    <Receipt className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-100 italic">Invoice #{selectedOrder.id}</h2>
                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mt-0.5">Purchase details & receipt</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => handlePrintInvoice(selectedOrder)}
                    className="bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-xl px-4"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <button
                    onClick={() => setIsOrderDialogOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-full"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Invoice Content - Scrollable for web, visible for print */}
              <div className="flex-1 overflow-y-auto p-8 sidebar-scrollbar print:p-0 print:overflow-visible print:bg-white print:text-black">
                {/* Print Styles */}
                <style>{`
                  @media print {
                    .sidebar-scrollbar { overflow: visible !important; }
                    .print-black { color: #000 !important; }
                    .print-border { border: 1px solid #ddd !important; }
                    .print-bg-gray { background-color: #f8f9fa !important; }
                  }
                `}</style>

                {/* Header Section */}
                <div className="mb-10 flex justify-between items-start border-b border-gray-700/50 pb-8 print:border-gray-200">
                  <div className="space-y-4">
                    <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent print:text-emerald-700">
                      TesMarket
                    </h1>
                    <div className="space-y-1 text-sm text-gray-400 print:text-gray-700">
                      <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-emerald-500" /> support@tesmarket.com</p>
                      <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-emerald-500" /> +291992846900</p>
                      <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-emerald-500" /> Bishoftu, Zuquala</p>
                    </div>
                  </div>

                  <div className="text-right space-y-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl print:bg-gray-100 print:border-gray-200">
                      <p className="text-3xl font-black text-emerald-400 tracking-tighter print:text-emerald-700 uppercase">INVOICE</p>
                    </div>
                    <div className="space-y-1 text-xs font-medium text-gray-500 print:text-gray-700 uppercase tracking-widest">
                      <p><span className="text-gray-400 mr-2">ID:</span> {selectedOrder.id}</p>
                      <p><span className="text-gray-400 mr-2">Date:</span> {format(new Date(selectedOrder.created_at), 'MMM dd, yyyy')}</p>
                      <p><span className="text-gray-400 mr-2">Time:</span> {format(new Date(selectedOrder.created_at), 'hh:mm a')}</p>
                    </div>
                    <div className="pt-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${selectedOrder.status === 'completed' || selectedOrder.status === 'delivered'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : selectedOrder.status === 'processing'
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                          : selectedOrder.status === 'cancelled'
                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        }`}>
                        {selectedOrder.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  <div className="bg-gray-800/20 rounded-2xl p-6 border border-gray-700/30 print:bg-gray-50 print:border-gray-100">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <User className="h-4 w-4 text-emerald-400" />
                      Buyer Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-lg font-bold text-gray-100 print:text-black">{getBuyerName(selectedOrder.user)}</p>
                        <p className="text-xs text-emerald-400/70 font-mono mt-0.5">ID: #{selectedOrder.user?.id || 'N/A'}</p>
                      </div>
                      <div className="space-y-2 pt-4 border-t border-gray-700/50 print:border-gray-200">
                        <p className="text-sm text-gray-300 print:text-gray-700 flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-gray-500" /> {selectedOrder.user?.email || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-300 print:text-gray-700 flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-gray-500" /> {selectedOrder.user?.phone || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800/20 rounded-2xl p-6 border border-gray-700/30 print:bg-gray-50 print:border-gray-100">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <MapPin className="h-4 w-4 text-blue-400" />
                      Shipping Details
                    </h3>
                    <div className="space-y-4">
                      {selectedOrder.shipping_address ? (
                        <div className="text-sm text-gray-300 print:text-black leading-relaxed">
                          {typeof selectedOrder.shipping_address === 'string' ? (
                            <p>{selectedOrder.shipping_address}</p>
                          ) : (
                            <div className="space-y-1">
                              <p className="font-semibold">{selectedOrder.shipping_address.address_line1}</p>
                              {selectedOrder.shipping_address.address_line2 && (
                                <p>{selectedOrder.shipping_address.address_line2}</p>
                              )}
                              <p>
                                {[selectedOrder.shipping_address.city, selectedOrder.shipping_address.state, selectedOrder.shipping_address.postal_code]
                                  .filter(Boolean)
                                  .join(', ')}
                              </p>
                              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mt-1">
                                {selectedOrder.shipping_address.country}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Same as billing address</p>
                      )}

                      {selectedOrder.payment_method && (
                        <div className="pt-4 border-t border-gray-700/50 print:border-gray-200">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter mb-1">Payment Method</p>
                          <div className="flex items-center gap-2 text-sm text-gray-200 print:text-black font-bold">
                            <CreditCard className="h-4 w-4 text-emerald-400" />
                            {selectedOrder.payment_method}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-10 space-y-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Package className="h-4 w-4 text-emerald-400" />
                    Order items
                  </h3>
                  <div className="border border-gray-700/50 rounded-2xl overflow-hidden print:border-gray-200">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-800/40 print:bg-gray-100">
                          <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest print:text-black">Product</th>
                          <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center print:text-black">Qty</th>
                          <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right print:text-black">Price</th>
                          <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right print:text-black">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/30 print:divide-gray-100">
                        {selectedOrder.items.map((item) => (
                          <tr key={item.id} className="hover:bg-white/[0.02] transition-colors print:bg-white">
                            <td className="p-4">
                              <div className="flex items-center gap-4">
                                {item.product.image && (
                                  <img
                                    src={resolveMediaUrl(item.product.image) || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=64&h=64&fit=crop'}
                                    alt={item.product.name}
                                    className="w-12 h-12 rounded-lg object-cover border border-gray-700/50 print:border-gray-200"
                                    onError={(e) => {
                                      const el = e.target as HTMLImageElement;
                                      const fallback = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=64&h=64&fit=crop';
                                      if (el.src !== fallback) el.src = fallback;
                                    }}
                                  />
                                )}
                                <div>
                                  <p className="font-bold text-gray-100 text-sm print:text-black leading-snug">{item.product.name}</p>
                                  {item.product.vendor && (
                                    <p className="text-[10px] text-emerald-400/70 font-bold uppercase mt-1 flex items-center gap-1">
                                      <Building2 className="h-3 w-3" />
                                      {getVendorName(item.product.vendor)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-center font-mono text-gray-300 print:text-black">{item.quantity}</td>
                            <td className="p-4 text-right font-mono text-gray-300 print:text-black">
                              ${(Number(item.price || 0) / item.quantity).toFixed(2)}
                            </td>
                            <td className="p-4 text-right font-black text-emerald-400 font-mono print:text-black">
                              ${Number(item.price || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-700/50 print:border-gray-200">
                  <div className="w-full max-w-[320px] bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-2xl p-6 border border-emerald-500/20 shadow-inner print:bg-gray-50 print:border-gray-200">
                    <div className="space-y-4">
                      <div className="flex justify-between text-xs font-medium uppercase tracking-widest text-gray-500">
                        <span>Subtotal</span>
                        <span className="text-gray-200 print:text-black font-mono">${Number(selectedOrder.total_amount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-medium uppercase tracking-widest text-gray-500">
                        <span>Shipping</span>
                        <span className="text-gray-200 print:text-black font-mono">$0.00</span>
                      </div>
                      <div className="flex justify-between text-xs font-medium uppercase tracking-widest text-gray-500">
                        <span>Tax (0%)</span>
                        <span className="text-gray-200 print:text-black font-mono">$0.00</span>
                      </div>
                      <div className="pt-4 border-t border-emerald-500/30 flex justify-between items-center">
                        <span className="text-sm font-black text-emerald-400 uppercase tracking-tighter">Total Amount</span>
                        <span className="text-2xl font-black text-emerald-400 font-mono tracking-tighter print:text-black">
                          ${Number(selectedOrder.total_amount || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-16 text-center border-t border-gray-700/30 pt-8 print:border-gray-100">
                  <p className="text-sm font-bold text-gray-400 print:text-gray-600">Thank you for your purchase!</p>
                  <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">
                    For questions about this invoice, contact support@tesmarket.com
                  </p>
                  <div className="mt-8 opacity-20 hover:opacity-100 transition-opacity">
                    <p className="text-[9px] text-gray-600 font-mono uppercase tracking-tighter">
                      Computer Generated Document • Verified by TesMarket Secure Payments
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payout Details Modal */}
      <AnimatePresence>
        {isPayoutDialogOpen && selectedPayout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={() => setIsPayoutDialogOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-gradient-to-br from-[#0F1720] via-[#1A2533] to-[#0F1720] rounded-2xl shadow-2xl border border-gray-700/50 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/40">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-lg shadow-purple-900/20">
                    <Wallet className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-100 italic">Payout Request #{selectedPayout.id}</h2>
                    <p className="text-xs text-purple-400 font-bold uppercase tracking-widest mt-0.5">Vendor withdrawal details</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPayoutDialogOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-full"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 sidebar-scrollbar">
                {/* Status & Summary Header */}
                <div className="mb-10 flex justify-between items-start border-b border-gray-700/50 pb-8">
                  <div className="space-y-4">
                    <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 to-fuchsia-500 bg-clip-text text-transparent">
                      TesMarket
                    </h1>
                    <p className="text-sm text-gray-400 font-medium uppercase tracking-widest">Vendor Payout System</p>
                  </div>

                  <div className="text-right space-y-3">
                    <div className="bg-purple-500/10 border border-purple-500/20 px-6 py-3 rounded-2xl">
                      <p className="text-3xl font-black text-purple-400 tracking-tighter uppercase">PAYOUT</p>
                    </div>
                    <div className="space-y-1 text-xs font-medium text-gray-500 uppercase tracking-widest">
                      <p><span className="text-gray-400 mr-2">Request #:</span> {selectedPayout.id}</p>
                      <p><span className="text-gray-400 mr-2">Date:</span> {selectedPayout.created_at ? format(new Date(selectedPayout.created_at), 'MMM dd, yyyy') : 'N/A'}</p>
                    </div>
                    <div className="pt-2">
                      <Badge className={`px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-widest ${getStatusColor(selectedPayout.status)}`}>
                        {selectedPayout.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  {/* Vendor Details */}
                  <div className="bg-gray-800/20 rounded-2xl p-6 border border-gray-700/30">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <Store className="h-4 w-4 text-purple-400" />
                      Vendor Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-lg font-bold text-gray-100">{selectedPayout.vendor.full_name || 'N/A'}</p>
                        <p className="text-xs text-purple-400 font-bold uppercase tracking-widest mt-1 italic">{selectedPayout.vendor.store_name || 'N/A'}</p>
                      </div>
                      <div className="space-y-3 pt-4 border-t border-gray-700/50">
                        <p className="text-sm text-gray-300 flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-gray-500" /> {selectedPayout.vendor.email || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-300 flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-gray-500" /> {selectedPayout.vendor.phone || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-300 flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-gray-500" /> <span className="text-gray-500 mr-1">@</span>{selectedPayout.vendor.username || 'N/A'}
                        </p>
                        <p className="text-[10px] text-purple-400/70 font-mono uppercase mt-2">Vendor ID: #{selectedPayout.vendor.id}</p>
                      </div>
                    </div>
                  </div>

                  {/* Payout Details */}
                  <div className="bg-emerald-500/5 rounded-2xl p-6 border border-emerald-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Wallet className="h-24 w-24 text-emerald-400" />
                    </div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-6">
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                      Payout Amount
                    </h3>
                    <div className="text-center py-4 bg-emerald-950/20 rounded-2xl border border-emerald-500/10 shadow-inner mb-6">
                      <p className="text-6xl font-black text-emerald-400 font-mono tracking-tighter">
                        ${Number(selectedPayout.amount || 0).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-emerald-500/60 font-bold uppercase tracking-[0.2em] mt-2">Requested withdrawal</p>
                    </div>
                    {selectedPayout.payout_reference && (
                      <div className="pt-4 border-t border-emerald-500/20">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Reference ID</p>
                        <p className="text-sm font-mono font-bold text-gray-300 bg-gray-900/50 border border-gray-700 px-4 py-2.5 rounded-xl">
                          {selectedPayout.payout_reference}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Processing Timeline */}
                <div className="bg-gray-800/20 rounded-2xl p-6 border border-gray-700/30 mb-8">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Clock className="h-4 w-4 text-blue-400" />
                    Processing Timeline
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-900/40 p-3 rounded-xl border border-gray-700/50">
                      <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Requested At</p>
                      <p className="text-sm font-bold text-gray-300">
                        {selectedPayout.created_at ? format(new Date(selectedPayout.created_at), 'PPp') : 'N/A'}
                      </p>
                    </div>
                    {selectedPayout.payout_date && (
                      <div className="bg-gray-900/40 p-3 rounded-xl border border-gray-700/50">
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Completed At</p>
                        <p className="text-sm font-bold text-gray-300">
                          {format(new Date(selectedPayout.payout_date), 'PPp')}
                        </p>
                      </div>
                    )}
                    {(selectedPayout.completed_by || selectedPayout.approved_by) && (
                      <div className="bg-gray-900/40 p-3 rounded-xl border border-gray-700/50">
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Processed By</p>
                        <p className="text-sm font-bold text-blue-400 flex items-center gap-2">
                          <User className="h-3.5 w-3.5" />
                          {selectedPayout.completed_by || selectedPayout.approved_by}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes Section */}
                {(selectedPayout.vendor_notes || selectedPayout.admin_notes) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    {selectedPayout.vendor_notes && (
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                          <FileText className="h-3.5 w-4 text-purple-400" />
                          Vendor Remarks
                        </h4>
                        <div className="bg-purple-500/5 border border-purple-500/20 p-4 rounded-xl text-sm text-gray-300 italic leading-relaxed">
                          "{selectedPayout.vendor_notes}"
                        </div>
                      </div>
                    )}

                    {selectedPayout.admin_notes && (
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                          <Activity className="h-3.5 w-4 text-amber-400" />
                          Internal Admin Notes
                        </h4>
                        <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl text-sm text-gray-300 border-l-4 border-l-amber-500/50">
                          {selectedPayout.admin_notes}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Section */}
                <div className="mt-12 text-center border-t border-gray-700/30 pt-8">
                  <p className="text-sm font-bold text-gray-400 italic">Thank you for your partnership with TesMarket!</p>
                  <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">
                    For reconciliation issues, contact finance@tesmarket.com
                  </p>
                  <div className="mt-10 opacity-30">
                    <p className="text-[9px] text-gray-600 font-mono uppercase tracking-tighter">
                      Official Disbursement Record • Secure Protocol X-455
                    </p>
                  </div>
                </div>
              </div>

              {/* Payout Action Footer? (Optional if you want sticky actions like Payouts.tsx) */}
              {selectedPayout.status === 'pending' && (
                <div className="p-6 bg-gray-900/60 border-t border-gray-700/50 flex gap-4">
                  <Button
                    onClick={() => {
                      // Logic for rejection if needed here, 
                      // though it's usually handled by another modal or inline
                      toast({ title: "Action Required", description: "Use the action buttons in the main table to approve or reject." });
                    }}
                    variant="outline"
                    className="flex-1 bg-gray-800 border-gray-700 text-gray-400 rounded-xl"
                  >
                    Quick Reject (Soon)
                  </Button>
                  <Button
                    onClick={() => {
                      // Logic for approval
                      toast({ title: "Action Required", description: "Use the action buttons in the main table to approve or reject." });
                    }}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20"
                  >
                    Approve Request
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TransactionManagement;
