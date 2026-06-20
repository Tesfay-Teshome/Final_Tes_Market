import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorAPI } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import {
  DollarSign,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  Wallet,
  Send,
  Download,
  Building2,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  ArrowDownCircle,
  X,
  ShieldCheck,
  Receipt,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

interface PaymentMethodDetails {
  [key: string]: any;
}

interface PaymentMethodData {
  payment_method: string;
  payment_details: PaymentMethodDetails;
}

interface PayoutRequest {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  notes?: string;
  admin_notes?: string;
  payout_reference?: string;
  created_at: string;
  completed_at?: string;
  receipt_info?: {
    receipt_number: string;
    transaction_id: string;
    net_amount: string;
    issued_at: string;
  };
}

interface EarningsData {
  total_earnings: number;
  available_balance: number;
  pending_balance: number;
  total_withdrawn: number;
  total_orders: number;
}

interface PayoutHistoryResponse {
  results: PayoutRequest[];
}

const Payout = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  // Withdrawal form states synced with Earnings.tsx
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [paymentMethodType, setPaymentMethodType] = useState('bank_transfer');
  const [paymentDetails, setPaymentDetails] = useState<PaymentMethodDetails>({});

  const { data: earningsData, isLoading: earningsLoading } = useQuery<EarningsData>({
    queryKey: ['vendor-earnings'],
    queryFn: async () => {
      const response = await vendorAPI.getVendorEarnings();
      return response.data;
    },
  });

  const { data: payoutHistory } = useQuery<PayoutHistoryResponse>({
    queryKey: ['vendor-payout-history'],
    queryFn: async () => {
      const response = await vendorAPI.getPayoutHistory();
      return response.data;
    },
  });

  const { data: paymentMethod, isLoading: paymentMethodLoading } = useQuery<PaymentMethodData>({
    queryKey: ['vendor-payment-method'],
    queryFn: async () => {
      const response = await vendorAPI.getPaymentMethod();
      return response.data;
    },
  });

  const requestPayoutMutation = useMutation({
    mutationFn: (data: { amount: number; notes?: string; payment_method?: string; payment_details?: any }) =>
      vendorAPI.requestPayout(data),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Withdrawal requested successfully.' });
      setShowRequestModal(false);
      setWithdrawAmount('');
      setWithdrawNotes('');
      queryClient.invalidateQueries({ queryKey: ['vendor-earnings'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-payout-history'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: 'Failed to request withdrawal.', variant: 'destructive' });
    },
  });

  const updatePaymentMethodMutation = useMutation({
    mutationFn: (data: { payment_method: string; payment_details: any }) =>
      vendorAPI.updatePaymentMethod(data),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Vault updated successfully.' });
      setShowPaymentMethodModal(false);
      queryClient.invalidateQueries({ queryKey: ['vendor-payment-method'] });
    },
  });

  const handleDownloadReceipt = async (payoutId: string) => {
    try {
      const response = await vendorAPI.downloadReceipt(payoutId);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(response.data);
        printWindow.document.close();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to download receipt.', variant: 'destructive' });
    }
  };

  const handleRequestWithdrawal = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 100) {
      toast({ title: 'Error', description: 'Minimum withdrawal is $100.', variant: 'destructive' });
      return;
    }

    if (amount > (earningsData?.available_balance || 0)) {
      toast({ title: 'Insufficient Funds', description: 'You cannot withdraw more than your available balance.', variant: 'destructive' });
      return;
    }

    requestPayoutMutation.mutate({
      amount,
      notes: withdrawNotes,
      payment_method: paymentMethodType,
      payment_details: paymentDetails
    });
  };

  if (earningsLoading || paymentMethodLoading) {
    return (
      <div className="min-h-screen text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 bg-[#070B0F] flex items-center justify-center p-3 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
            style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" />
        </div>
        <div className="text-center relative z-10">
          <div className="h-20 w-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-8 animate-pulse">
            <Loader2 className="h-8 w-8 text-[#00FF9D] animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-white uppercase tracking-widest">
            Loading Payout Vault...
          </h2>
          <p className="text-[10px] font-black text-[#8B949E] uppercase tracking-[0.2em] mt-3">Establishing secure connection protocols</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative min-h-screen text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 pb-4 sm:pb-6 bg-[#070B0F]">
      {/* Premium Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
          style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-[1700px] mx-auto pt-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent leading-relaxed py-2">Payouts</h1>
            <p className="text-gray-400 mt-1 font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Securely manage your earnings and withdrawals
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowRequestModal(true)}
            className="h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-xs font-black uppercase tracking-widest border border-emerald-400/20 shadow-lg shadow-emerald-900/20 transition-all duration-300"
          >
            Request Withdrawal
          </motion.button>
        </div>

        {/* Balance Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700/95 backdrop-blur-sm text-white border-2 border-emerald-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Available Balance</p>
                  <p className="text-2xl font-bold">${earningsData?.available_balance ? Number(earningsData.available_balance).toFixed(2) : '0.00'}</p>
                  <p className="text-[10px] text-emerald-100/60 mt-1 uppercase font-bold">Ready to withdraw</p>
                </div>
                <Wallet className="h-8 w-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-600 to-red-600/95 backdrop-blur-sm text-white border-2 border-orange-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Pending Settlement</p>
                  <p className="text-2xl font-bold">${earningsData?.pending_balance ? Number(earningsData.pending_balance).toFixed(2) : '0.00'}</p>
                  <p className="text-[10px] text-orange-100/60 mt-1 uppercase font-bold">In pending requests</p>
                </div>
                <Clock className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600 to-green-700/95 backdrop-blur-sm text-white border-2 border-green-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Earnings</p>
                  <p className="text-2xl font-bold">${earningsData?.total_earnings ? Number(earningsData.total_earnings).toFixed(2) : '0.00'}</p>
                  <p className="text-[10px] text-green-100/60 mt-1 uppercase font-bold">Lifetime revenue</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-600 to-purple-700/95 backdrop-blur-sm text-white border-2 border-violet-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-violet-100 text-sm font-medium">Total Withdrawn</p>
                  <p className="text-2xl font-bold">${earningsData?.total_withdrawn ? Number(earningsData.total_withdrawn).toFixed(2) : '0.00'}</p>
                  <p className="text-[10px] text-violet-100/60 mt-1 uppercase font-bold">Paid to you</p>
                </div>
                <Download className="h-8 w-8 text-violet-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Payment Method Vault */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0F1720] p-6 h-full relative overflow-hidden group hover:border-[#00FF9D]/40 transition-all duration-300 shadow-lg">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-[12px] font-bold uppercase tracking-wider text-[#8B949E]">Payment Method</h2>
                <button
                  onClick={() => setShowPaymentMethodModal(true)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] transition-all"
                >
                  <Plus className="h-4 w-4 text-[#3CFF9E]" />
                </button>
              </div>

              {paymentMethod?.payment_method ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#122A20] to-[#0A140F] flex items-center justify-center border border-[#3CFF9E]/20 shadow-inner">
                      <CreditCard className="h-6 w-6 text-[#3CFF9E]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white uppercase tracking-wide">{paymentMethod.payment_method.replace('_', ' ')}</p>
                      <p className="text-[10px] font-medium text-[#8B949E] uppercase tracking-wider mt-1">Primary Method</p>
                    </div>
                  </div>
                  <div className="space-y-3 px-1">
                    {Object.entries(paymentMethod.payment_details).map(([key, val], idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-white/[0.03]">
                        <span className="text-[10px] font-bold text-[#586069] uppercase tracking-widest">{key.replace('_', ' ')}</span>
                        <span className="text-[10px] font-mono text-white/80">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-white/[0.02] border border-dashed border-white/10 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-6 w-6 text-[#586069]" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#586069]">No Payment Method Linked</p>
                  <button onClick={() => setShowPaymentMethodModal(true)} className="mt-4 text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:underline">Link Payment Method</button>
                </div>
              )}
            </div>
          </div>

          {/* Disbursement Registry */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0F1720] shadow-lg overflow-hidden h-full group">
              <div className="p-6 border-b border-white/[0.05] flex items-center justify-between">
                <h2 className="text-[12px] font-bold uppercase tracking-wider text-[#8B949E]">Payout History</h2>
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left min-w-[600px]">
                  <thead>
                    <tr className="bg-white/[0.01] text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">
                      <th className="p-6">Transaction ID</th>
                      <th className="p-6 text-right">Amount ($)</th>
                      <th className="p-6 text-right">Status</th>
                      <th className="p-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {payoutHistory?.results?.map((p, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors group/row">
                        <td className="p-6">
                          <div className="text-[11px] font-mono text-white/90 group-hover/row:text-[#3CFF9E] transition-colors">#EXT-{p.id?.toString().slice(0, 8).toUpperCase() || 'N/A'}</div>
                          <div className="text-[10px] font-medium text-[#8B949E] mt-1">{p.created_at ? format(new Date(p.created_at), 'MMM dd, yyyy') : 'N/A'}</div>
                        </td>
                        <td className="p-6 text-right text-[14px] font-bold text-white">${(p.amount || 0).toLocaleString()}</td>
                        <td className="p-6 text-right">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all duration-300 ${p.status === 'completed' ? 'text-[#00FF9D] border-[#00FF9D]/20 bg-[#00FF9D]/10 shadow-[0_0_10px_rgba(0,255,157,0.1)]' :
                            p.status === 'pending' ? 'text-amber-400 border-amber-400/20 bg-amber-400/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]' :
                              'text-red-400 border-red-400/20 bg-red-400/10'
                            }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-6 text-right">
                          {p.status === 'completed' && (
                            <button
                              onClick={() => handleDownloadReceipt(p.id)}
                              className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/[0.03] border border-white/5 text-[#3CFF9E] opacity-0 group-hover/row:opacity-100 transition-all hover:bg-[#3CFF9E]/10 hover:border-[#3CFF9E]/30"
                            >
                              <Receipt className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Modal (Synchronized with Earnings.tsx) */}
      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-2xl bg-[#0F1720] border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider">Request Payout</h3>
                  <p className="text-[10px] font-black text-[#8B949E] uppercase tracking-[0.2em] mt-2">Submit a payout request to withdraw your earnings</p>
                </div>
                <button onClick={() => setShowRequestModal(false)} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all">
                  <X className="h-5 w-5 text-white/50" />
                </button>
              </div>

              <div className="space-y-8">
                {/* Amount Input */}
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">Withdrawal Amount</label>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Available: ${earningsData?.available_balance ? Number(earningsData.available_balance).toFixed(2) : '0.00'}</span>
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
                <div className="space-y-4 p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
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
                    onClick={() => setShowRequestModal(false)}
                    className="flex-1 h-14 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRequestWithdrawal}
                    disabled={requestPayoutMutation.isPending || !paymentMethodType}
                    className="flex-[2] h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white border border-emerald-400/20 hover:from-emerald-500 hover:to-emerald-700 transition-all shadow-xl shadow-emerald-900/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {requestPayoutMutation.isPending ? (
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
      </AnimatePresence>

      {/* Payment Method Modal */}
      <AnimatePresence>
        {showPaymentMethodModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-xl bg-[#0F1720] border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-white uppercase tracking-wider">Configure Payout Method</h3>
                <button onClick={() => setShowPaymentMethodModal(false)} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all">
                  <X className="h-5 w-5 text-white/50" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setPaymentMethodType('bank_transfer')}
                    className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-3 ${paymentMethodType === 'bank_transfer' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/5'}`}
                  >
                    <Building2 className="h-6 w-6" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Bank Transfer</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethodType('paypal')}
                    className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-3 ${paymentMethodType === 'paypal' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/5'}`}
                  >
                    <CreditCard className="h-6 w-6" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">PayPal</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {paymentMethodType === 'bank_transfer' ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest">Bank Name</label>
                        <input
                          type="text"
                          value={paymentDetails.bank_name || ''}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, bank_name: e.target.value })}
                          className="w-full px-5 py-3.5 bg-white/[0.02] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                          placeholder="e.g. Global Trade Bank"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest">Account Number / IBAN</label>
                        <input
                          type="text"
                          value={paymentDetails.account_number || ''}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, account_number: e.target.value })}
                          className="w-full px-5 py-3.5 bg-white/[0.02] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                          placeholder="International format preferred"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest">Account Holder Name</label>
                        <input
                          type="text"
                          value={paymentDetails.account_holder || ''}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, account_holder: e.target.value })}
                          className="w-full px-5 py-3.5 bg-white/[0.02] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                          placeholder="Legal name on account"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest">PayPal Email Address</label>
                      <input
                        type="email"
                        value={paymentDetails.paypal_email || ''}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, paypal_email: e.target.value })}
                        className="w-full px-5 py-3.5 bg-white/[0.02] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50"
                        placeholder="your@email.com"
                      />
                    </div>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updatePaymentMethodMutation.mutate({ payment_method: paymentMethodType, payment_details: paymentDetails })}
                  disabled={updatePaymentMethodMutation.isPending}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-[13px] font-as-black uppercase tracking-widest transition-all duration-300 shadow-xl shadow-emerald-900/40 border border-emerald-400/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {updatePaymentMethodMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Payment Method
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Payout;
