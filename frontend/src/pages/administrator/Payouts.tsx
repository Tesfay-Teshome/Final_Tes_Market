import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  Clock,
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Filter,
  Search,
  Loader2,
  ArrowUpCircle,
  User,
  Calendar,
  CreditCard,
  Building2,
  Activity,
  Store,
  Mail,
  Phone
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';


interface PayoutRequest {
  id: string;
  vendor: number;
  vendor_info: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    store_name: string;
    commission_rate: number;
    payment_method: string;
  };
  amount: string | number; // DecimalField from Django serializes as string
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  notes?: string;
  admin_notes?: string;
  payout_reference?: string;
  payout_date?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  approved_by?: any;
  completed_at?: string;
  completed_by?: any;
  payment_method?: string;  // Vendor's chosen payment method
  payment_details?: {      // Vendor's payment details
    [key: string]: any;
  };
  receipt_info?: {
    receipt_number: string;
    transaction_id: string;
    payment_method: string;
    payment_destination: any;
    gross_amount: string;
    processing_fee: string;
    net_amount: string;
    payment_status: string;
    issued_at: string;
    payment_completed_at: string;
  };
}

interface PayoutData {
  payout_requests: PayoutRequest[];
  total_count: number;
  pending_count: number;
  approved_count: number;
  completed_count: number;
}

const Payouts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch payout requests
  const {
    data: payoutData,
    isLoading,
    error,
    refetch
  } = useQuery<PayoutData>({
    queryKey: ['admin-payouts', statusFilter],
    queryFn: async () => {
      const response = await adminAPI.getPayoutRequests(statusFilter);
      console.log('💰 Admin Payouts Response:', response.data);
      return response.data;
    },
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Approve payout mutation
  const approveMutation = useMutation({
    mutationFn: async (data: { payoutId: string; admin_notes?: string }) => {
      const response = await adminAPI.approvePayout(data.payoutId, { admin_notes: data.admin_notes });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Payout Approved',
        description: 'The payout request has been approved successfully.',
      });
      setShowModal(false);
      setSelectedPayout(null);
      setAdminNotes('');
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.non_field_errors?.[0] ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        'Failed to approve payout request.';
      toast({
        title: 'Approval Failed',
        description: errorMsg,
        variant: 'destructive',
      });
      // Refresh data to show current status
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
    },
  });

  // Reject payout mutation
  const rejectMutation = useMutation({
    mutationFn: async (data: { payoutId: string; admin_notes: string }) => {
      const response = await adminAPI.rejectPayout(data.payoutId, { admin_notes: data.admin_notes });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Payout Rejected',
        description: 'The payout request has been rejected.',
      });
      setShowModal(false);
      setSelectedPayout(null);
      setAdminNotes('');
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.non_field_errors?.[0] ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        'Failed to reject payout request.';
      toast({
        title: 'Rejection Failed',
        description: errorMsg,
        variant: 'destructive',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
    },
  });

  // Process payout mutation - AUTOMATED (no manual input needed)
  const processMutation = useMutation({
    mutationFn: async (payoutId: string) => {
      const response = await adminAPI.processPayout(payoutId, {
        payout_reference: ''
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: '💰 Payout Completed Successfully',
        description: `Payment sent! Receipt #${data.receipt?.receipt_number}. Transaction ID: ${data.receipt?.transaction_id}`,
      });
      setShowModal(false);
      setSelectedPayout(null);
      setAdminNotes('');
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error ||
        error.response?.data?.detail ||
        'Failed to process payout.';
      toast({
        title: 'Processing Failed',
        description: errorMsg,
        variant: 'destructive',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
    },
  });

  const handleAction = (action: 'approve' | 'reject' | 'process') => {
    if (!selectedPayout) return;

    switch (action) {
      case 'approve':
        approveMutation.mutate({
          payoutId: selectedPayout.id,
          admin_notes: adminNotes || undefined,
        });
        break;
      case 'reject':
        if (!adminNotes.trim()) {
          toast({
            title: 'Notes Required',
            description: 'Please provide a reason for rejection.',
            variant: 'destructive',
          });
          return;
        }
        rejectMutation.mutate({
          payoutId: selectedPayout.id,
          admin_notes: adminNotes
        });
        break;
      case 'process':
        // Automated processing - no manual input needed!
        if (confirm('Process this payout automatically?\n\nThe system will:\n• Retrieve vendor payment details\n• Generate transaction ID\n• Calculate processing fee (2%)\n• Create professional receipt\n• Send notification to vendor')) {
          processMutation.mutate(selectedPayout.id);
        }
        break;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-blue-400" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'approved':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const filteredPayouts = payoutData?.payout_requests?.filter(payout => {
    const firstName = payout.vendor_info?.first_name || '';
    const lastName = payout.vendor_info?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const vendorEmail = payout.vendor_info?.email || '';
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendorEmail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0B0F14] via-[#0D1219] to-[#0F141B]">
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0B0F14] via-[#0D1219] to-[#0F141B]">
        <div className="text-center p-8 bg-[#0F1720] border border-white/[0.08] rounded-2xl">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-medium text-gray-200">Error Loading Payouts</h3>
          <p className="mt-2 text-sm text-gray-400">Failed to load payout requests. Please try again.</p>
          <button onClick={() => refetch()} className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 relative min-h-screen bg-gradient-to-br from-[#0B0F14] via-[#0D1219] to-[#0F141B] text-[#E6EDF3] pt-1 sm:pt-4">
      {/* Animated background blobs */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-16 right-10 w-[520px] h-[520px] bg-[rgba(60,179,113,0.16)] rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-16 left-12 w-[520px] h-[520px] bg-[rgba(255,215,0,0.10)] rounded-full blur-3xl animate-pulse"></div>
      </div>
      <div className="relative z-10 px-4 md:px-8 w-full max-w-full">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 sm:mt-6">
            <div className="pb-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent leading-loose" style={{ lineHeight: '1.4' }}>
                Payout Management
              </h1>
              <p className="text-xl text-gray-300 mt-2 font-medium leading-relaxed">Review and process vendor payout requests</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => refetch()}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 text-sm sm:text-base"
              >
                <ArrowUpCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">↻</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl p-4 sm:p-6 shadow-xl shadow-yellow-900/30 border border-yellow-400/20 text-white cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-yellow-100 truncate">Pending</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1">{payoutData?.pending_count || 0}</p>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-white/20 flex-shrink-0 ml-3">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-4 sm:p-6 shadow-xl shadow-emerald-900/30 border border-emerald-400/20 text-white cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-emerald-100 truncate">Approved</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1">{payoutData?.approved_count || 0}</p>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-white/20 flex-shrink-0 ml-3">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-4 sm:p-6 shadow-xl shadow-blue-900/30 border border-blue-400/20 text-white cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-blue-100 truncate">Completed</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1">{payoutData?.completed_count || 0}</p>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-white/20 flex-shrink-0 ml-3">
                  <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-4 sm:p-6 shadow-xl shadow-purple-900/30 border border-violet-400/20 text-white cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-violet-100 truncate">Total</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1">{payoutData?.total_count || 0}</p>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-white/20 flex-shrink-0 ml-3">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Filters */}
          <div className="bg-[#0F1720] border border-white/[0.08] rounded-2xl shadow-xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Status Filter */}
              <div className="flex items-center space-x-2 min-w-0">
                <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 sm:px-4 py-2 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white/5 text-white text-sm sm:text-base min-w-0 flex-1 sm:flex-initial"
                >
                  <option value="all" className="bg-[#0F1720]">All Status</option>
                  <option value="pending" className="bg-[#0F1720]">Pending</option>
                  <option value="approved" className="bg-[#0F1720]">Approved</option>
                  <option value="completed" className="bg-[#0F1720]">Completed</option>
                  <option value="rejected" className="bg-[#0F1720]">Rejected</option>
                </select>
              </div>

              {/* Search */}
              <div className="flex-1 relative min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by vendor name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white/5 text-white placeholder-gray-500 text-sm sm:text-base"
                />
              </div>
            </div>
          </div>

          {/* Approved Payouts - Ready to Process */}
          {filteredPayouts.filter(p => p.status === 'approved').length > 0 && (
            <div className="bg-[#0F1720] border border-emerald-500/30 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent flex items-center space-x-2">
                    <CreditCard className="h-6 w-6 text-emerald-400" />
                    <span>Approved Payouts - Ready to Process</span>
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">Review payment details and process approved withdrawals</p>
                </div>
                <span className="px-4 py-2 bg-blue-900/40 text-blue-300 border border-blue-600/40 rounded-full font-bold text-lg">
                  {filteredPayouts.filter(p => p.status === 'approved').length}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredPayouts.filter(p => p.status === 'approved').map((payout) => (
                  <div key={payout.id} className="bg-[#070B14] rounded-xl shadow-lg border border-white/[0.08] p-6 hover:border-emerald-500/30 transition-all">
                    {/* Vendor Info Header */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/[0.08]">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-100">
                            {payout.vendor_info?.first_name && payout.vendor_info?.last_name
                              ? `${payout.vendor_info.first_name} ${payout.vendor_info.last_name}`
                              : payout.vendor_info?.username || 'N/A'
                            }
                          </p>
                          <p className="text-sm text-gray-400">{payout.vendor_info?.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-400">${Number(payout.amount).toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Request #{payout.id}</p>
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-gray-200 mb-3 flex items-center space-x-2">
                        <Building2 className="h-5 w-5 text-yellow-400" />
                        <span>Payment Destination</span>
                      </h4>

                      {payout.payment_method && payout.payment_details ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between bg-white/5 rounded p-2">
                            <span className="text-sm text-gray-400">Method:</span>
                            <span className="font-semibold text-gray-200 capitalize">{payout.payment_method.replace('_', ' ')}</span>
                          </div>

                          {/* Bank Transfer Details */}
                          {payout.payment_method === 'bank_transfer' && (
                            <>
                              <div className="flex items-center justify-between bg-white rounded p-2">
                                <span className="text-sm text-gray-600">Bank:</span>
                                <span className="font-semibold">{payout.payment_details.bank_name}</span>
                              </div>
                              <div className="flex items-center justify-between bg-white rounded p-2">
                                <span className="text-sm text-gray-600">Account Name:</span>
                                <span className="font-semibold">{payout.payment_details.account_name}</span>
                              </div>
                              <div className="flex items-center justify-between bg-white rounded p-2">
                                <span className="text-sm text-gray-600">Account Number:</span>
                                <span className="font-mono font-semibold">{payout.payment_details.account_number}</span>
                              </div>
                              {payout.payment_details.swift_code && (
                                <div className="flex items-center justify-between bg-white rounded p-2">
                                  <span className="text-sm text-gray-600">SWIFT/BIC:</span>
                                  <span className="font-mono font-semibold">{payout.payment_details.swift_code}</span>
                                </div>
                              )}
                            </>
                          )}

                          {/* Visa Card Details */}
                          {payout.payment_method === 'visa_card' && (
                            <>
                              <div className="flex items-center justify-between bg-white rounded p-2">
                                <span className="text-sm text-gray-600">Cardholder:</span>
                                <span className="font-semibold">{payout.payment_details.card_holder_name}</span>
                              </div>
                              <div className="flex items-center justify-between bg-white rounded p-2">
                                <span className="text-sm text-gray-600">Card Number:</span>
                                <span className="font-mono font-semibold">**** **** **** {payout.payment_details.card_number?.slice(-4)}</span>
                              </div>
                            </>
                          )}

                          {/* PayPal Details */}
                          {payout.payment_method === 'paypal' && (
                            <div className="flex items-center justify-between bg-white rounded p-2">
                              <span className="text-sm text-gray-600">PayPal Email:</span>
                              <span className="font-semibold">{payout.payment_details.paypal_email}</span>
                            </div>
                          )}

                          {/* Mobile Money Details */}
                          {payout.payment_method === 'mobile_money' && (
                            <>
                              <div className="flex items-center justify-between bg-white rounded p-2">
                                <span className="text-sm text-gray-600">Provider:</span>
                                <span className="font-semibold">{payout.payment_details.provider}</span>
                              </div>
                              <div className="flex items-center justify-between bg-white rounded p-2">
                                <span className="text-sm text-gray-600">Phone:</span>
                                <span className="font-mono font-semibold">{payout.payment_details.phone_number}</span>
                              </div>
                            </>
                          )}

                          {/* Wise Details */}
                          {payout.payment_method === 'wise' && (
                            <div className="flex items-center justify-between bg-white rounded p-2">
                              <span className="text-sm text-gray-600">Wise Email:</span>
                              <span className="font-semibold">{payout.payment_details.wise_email}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-3 text-yellow-700">
                          <AlertCircle className="h-5 w-5 mx-auto mb-1" />
                          <p className="text-sm">No payment details provided</p>
                        </div>
                      )}
                    </div>

                    {/* Vendor Notes */}
                    {payout.notes && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <p className="text-sm text-gray-600 font-medium">Vendor Notes:</p>
                        <p className="text-sm text-gray-800 mt-1">{payout.notes}</p>
                      </div>
                    )}

                    {/* Process Payment Button */}
                    <button
                      onClick={() => {
                        setSelectedPayout(payout);
                        handleAction('process');
                      }}
                      disabled={processMutation.isPending}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg"
                    >
                      {processMutation.isPending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Processing Payment...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-5 w-5" />
                          <span className="font-semibold">🚀 Process Payment (Automated)</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payout Requests Table */}
          <div className="bg-[#0F1720] border border-white/[0.08] rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white">Payout Requests</h2>
            </div>

            {filteredPayouts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/[0.03] border-b border-white/[0.06]">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-gray-400">Vendor</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-400">Amount</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-400">Status</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-400">Requested</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {filteredPayouts.map((payout) => (
                      <tr key={payout.id} className="hover:bg-white/[0.03] transition-all">
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
                              <User className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-200">
                                {payout.vendor_info?.first_name && payout.vendor_info?.last_name
                                  ? `${payout.vendor_info.first_name} ${payout.vendor_info.last_name}`
                                  : payout.vendor_info?.first_name || payout.vendor_info?.last_name || payout.vendor_info?.username || 'N/A'
                                }
                              </p>
                              <p className="text-sm text-gray-500">{payout.vendor_info?.email || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-lg font-bold text-emerald-400">
                            ${Number(payout.amount).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(payout.status)}`}>
                              {getStatusIcon(payout.status)}
                              <span className="capitalize">{payout.status}</span>
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2 text-gray-400">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(payout.created_at), 'MMM d, yyyy')}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <button
                            onClick={async () => {
                              await refetch();
                              setSelectedPayout(payout);
                              setAdminNotes(payout.admin_notes || '');
                              setShowModal(true);
                            }}
                            className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 py-2 rounded-lg hover:from-emerald-700 hover:to-green-700 transition-all flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            <span>Review</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p className="text-lg font-medium text-gray-300">No payout requests found</p>
                <p className="text-sm text-gray-500">Payout requests will appear here when vendors submit them</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showModal && selectedPayout && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[99999]"
          onClick={() => {
            setShowModal(false);
            setAdminNotes('');
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
                <h2 className="text-xl font-bold text-emerald-400">Review Payout Request</h2>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Request ID: #{selectedPayout.id}</p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setAdminNotes('');
                }}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-full"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content - Scrollable area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 sidebar-scrollbar">
              {/* Current Status Alert */}
              {selectedPayout.status !== 'pending' && (
                <div className={`p-4 rounded-xl border flex items-start gap-4 ${selectedPayout.status === 'approved' ? 'bg-blue-500/5 border-blue-500/20 text-blue-400' :
                  selectedPayout.status === 'rejected' ? 'bg-red-500/5 border-red-500/20 text-red-400' :
                    selectedPayout.status === 'completed' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' :
                      'bg-gray-500/5 border-gray-500/20 text-gray-400'
                  }`}>
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">
                    This payout has already been <span className="uppercase font-bold">{selectedPayout.status}</span>.
                    {selectedPayout.status === 'approved' && ' You can mark it as completed once payment is sent.'}
                  </p>
                </div>
              )}

              {/* Vendor & Payout Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800/30 rounded-2xl p-5 border border-gray-700/30">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Store className="h-4 w-4 text-emerald-400" />
                    Vendor info
                  </h3>
                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-100">
                        {selectedPayout.vendor_info?.first_name && selectedPayout.vendor_info?.last_name
                          ? `${selectedPayout.vendor_info.first_name} ${selectedPayout.vendor_info.last_name}`
                          : selectedPayout.vendor_info?.first_name || selectedPayout.vendor_info?.last_name || selectedPayout.vendor_info?.username || 'N/A'
                        }
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <Mail className="h-3 w-3" /> {selectedPayout.vendor_info?.email || 'N/A'}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-gray-700/50 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Store Name</span>
                        <span className="text-gray-200 font-medium">{selectedPayout.vendor_info?.store_name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Commission Rate</span>
                        <span className="text-emerald-400 font-bold">{selectedPayout.vendor_info?.commission_rate || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/30 rounded-2xl p-5 border border-gray-700/30">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-400" />
                    Payout Details
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Amount</span>
                      <span className="text-2xl font-black text-emerald-400 font-mono">
                        ${Number(selectedPayout.amount).toFixed(2)}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-gray-700/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">Current Status</span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(selectedPayout.status)}`}>
                          {getStatusIcon(selectedPayout.status)}
                          <span className="capitalize">{selectedPayout.status}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Payment Method</span>
                        <span className="text-gray-200 capitalize bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
                          {selectedPayout.vendor_info?.payment_method?.replace('_', ' ') || 'Not Set'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Receipt Information (if completed) */}
              {selectedPayout.receipt_info && (
                <div className="bg-emerald-500/5 rounded-2xl p-6 border border-emerald-500/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <CreditCard className="h-16 w-16 text-emerald-400" />
                  </div>

                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <h3 className="text-lg font-bold text-emerald-300 flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment Receipt
                    </h3>
                    <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-lg shadow-emerald-900/40">
                      ✓ PAID
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 relative z-10">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Receipt Number</span>
                      <p className="font-mono text-sm text-blue-400 font-bold bg-blue-400/5 border border-blue-400/20 px-3 py-1.5 rounded-lg">
                        {selectedPayout.receipt_info.receipt_number}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Transaction ID</span>
                      <p className="font-mono text-[11px] text-gray-300 bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-lg truncate">
                        {selectedPayout.receipt_info.transaction_id}
                      </p>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                      <span className="text-xs text-gray-500">Gross Amount</span>
                      <span className="text-sm font-bold text-gray-200">${Number(selectedPayout.receipt_info.gross_amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                      <span className="text-xs text-gray-500">Processing Fee (2%)</span>
                      <span className="text-sm font-bold text-red-400">-${Number(selectedPayout.receipt_info.processing_fee).toFixed(2)}</span>
                    </div>

                    <div className="md:col-span-2 bg-gradient-to-r from-emerald-600/20 to-green-600/20 rounded-xl p-4 border border-emerald-500/30 flex justify-between items-center mt-2 shadow-inner">
                      <div>
                        <p className="text-[10px] font-bold text-emerald-400/60 uppercase">Net Amount Sent</p>
                        <p className="text-2xl font-black text-emerald-400 font-mono tracking-tighter">
                          ${Number(selectedPayout.receipt_info.net_amount).toFixed(2)}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                        <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Vendor & Admin Notes */}
              <div className="space-y-6 pt-2">
                {selectedPayout.notes && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      Vendor Notes
                    </h4>
                    <div className="bg-gray-900/50 border border-gray-700 p-4 rounded-xl text-sm text-gray-300 italic">
                      "{selectedPayout.notes}"
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    Admin Process Notes {selectedPayout.status === 'pending' && <span className="text-red-400 lowercase italic">(required for rejection)</span>}
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add internal notes or feedback for the vendor..."
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-gray-600 min-h-[100px] text-sm sidebar-scrollbar"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-gray-900/60 border-t border-gray-700/50 flex gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowModal(false);
                  setSelectedPayout(null);
                  setAdminNotes('');
                }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl border-gray-700"
              >
                Cancel
              </Button>

              {selectedPayout.status === 'pending' && (
                <>
                  <Button
                    onClick={() => handleAction('reject')}
                    disabled={rejectMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-900/20 rounded-xl"
                  >
                    {rejectMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleAction('approve')}
                    disabled={approveMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-900/20 rounded-xl font-bold"
                  >
                    {approveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Approve Request
                  </Button>
                </>
              )}

              {selectedPayout.status === 'approved' && (
                <Button
                  onClick={() => handleAction('process')}
                  disabled={approveMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-900/20 rounded-xl font-bold"
                >
                  {approveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Mark as Paid
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default Payouts;
