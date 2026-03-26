import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCircle,
  Package,
  Loader2,
  AlertCircle,
  Clock,
  X,
  Check,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  related_id?: string;
  created_at: string;
  time_ago: string;
  requires_confirmation: boolean;
  confirmed_by_vendor: boolean;
  confirmed_at?: string;
  admin_notified_of_confirmation: boolean;
}

const darkCard = "relative overflow-hidden rounded-3xl border border-white/[0.04] bg-[#0c1214]/70 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]";

const Notifications = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['vendor-notifications'],
    queryFn: async () => {
      const response = await api.get('/api/notifications/');
      return response.data;
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/api/notifications/${id}/mark_as_read/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-notifications'] });
    },
  });

  const confirmNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/api/notifications/${id}/confirm_notification/`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-notifications'] });
      toast({ title: 'Notification Confirmed', description: data.message });
      setSelectedNotification(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to confirm notification',
        variant: 'destructive',
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/notifications/mark_all_as_read/');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-notifications'] });
      toast({ title: 'All Cleared', description: 'All notifications marked as read.' });
    },
  });

  const getNotificationIcon = (type: string, requiresConfirmation: boolean) => {
    if (requiresConfirmation) return <AlertCircle className="h-5 w-5 text-amber-400" />;
    switch (type) {
      case 'order': return <Package className="h-5 w-5 text-[#3CFF9E]" />;
      default: return <Bell className="h-5 w-5 text-violet-400" />;
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

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;
  const pendingConfirmations = notifications?.filter(
    (n) => n.requires_confirmation && !n.confirmed_by_vendor
  ).length || 0;

  return (
    <div className="flex-1 relative min-h-screen text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 pb-12 bg-[#070B0F]">
      {/* Premium Background Layer */}
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
                <Bell className="h-5 w-5 text-[#3CFF9E]" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Notifications</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[#8B949E] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3CFF9E] animate-pulse" />
                {unreadCount} Unread
              </p>
              {pendingConfirmations > 0 && (
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {pendingConfirmations} Require Action
                </span>
              )}
            </div>
          </motion.div>

          {unreadCount > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="h-11 px-6 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[#8B949E] text-xs font-black uppercase tracking-widest hover:bg-white/[0.06] hover:text-white transition-all"
            >
              {markAllAsReadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : 'Mark All Read'}
            </motion.button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-4 max-w-4xl">
          {notifications && notifications.length > 0 ? (
            notifications.map((notification, idx) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`group relative overflow-hidden rounded-3xl border transition-all duration-300 p-6 ${!notification.is_read
                  ? 'border-[#3CFF9E]/20 bg-[#0c1214]/70 backdrop-blur-3xl shadow-[0_0_30px_rgba(60,255,158,0.05)]'
                  : 'border-white/[0.04] bg-[#0c1214]/50 backdrop-blur-xl'
                  } ${notification.requires_confirmation && !notification.confirmed_by_vendor
                    ? 'ring-2 ring-amber-400/20'
                    : ''
                  }`}
              >
                {/* Unread indicator */}
                {!notification.is_read && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#3CFF9E] to-emerald-700 rounded-l-3xl" />
                )}

                <div className="flex items-start gap-5">
                  <div className={`flex-shrink-0 p-3 rounded-2xl border ${notification.requires_confirmation && !notification.confirmed_by_vendor
                    ? 'bg-amber-500/10 border-amber-500/20'
                    : !notification.is_read
                      ? 'bg-[#3CFF9E]/10 border-[#3CFF9E]/20'
                      : 'bg-white/[0.03] border-white/5'
                    }`}>
                    {getNotificationIcon(notification.notification_type, notification.requires_confirmation)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h3 className={`text-[13px] font-black uppercase tracking-wide mb-1 ${!notification.is_read ? 'text-white' : 'text-white/70'}`}>
                          {notification.title}
                        </h3>
                        <p className="text-[#8B949E] text-xs font-medium leading-relaxed whitespace-pre-wrap">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-[#586069] font-bold uppercase tracking-wider">
                          <Clock className="h-3 w-3" />
                          <span>{notification.time_ago}</span>
                          {notification.requires_confirmation && (
                            <>
                              <span>•</span>
                              <span className="text-amber-400">Requires Confirmation</span>
                            </>
                          )}
                        </div>
                      </div>

                      {!notification.is_read && (
                        <button
                          onClick={() => markAsReadMutation.mutate(notification.id)}
                          className="flex-shrink-0 p-2 rounded-xl bg-white/[0.03] border border-white/5 text-[#8B949E] hover:text-white hover:bg-white/[0.08] transition-all"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {notification.requires_confirmation && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        {notification.confirmed_by_vendor ? (
                          <div className="flex items-center gap-2 text-[#3CFF9E]">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-[11px] font-black uppercase tracking-widest">
                              Confirmed {notification.confirmed_at && `• ${format(new Date(notification.confirmed_at), 'MMM dd, yyyy')}`}
                            </span>
                          </div>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedNotification(notification)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-800 text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg border border-amber-400/20 transition-all"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Confirm Receipt & Ship Order
                          </motion.button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-24 text-center rounded-3xl border border-white/[0.04] bg-[#0c1214]/50 backdrop-blur-xl"
            >
              <div className="w-20 h-20 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-6 border border-white/[0.05]">
                <Bell className="h-10 w-10 text-[#586069]" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-[0.2em] text-white mb-2">No Notifications</h3>
              <p className="text-[#8B949E] text-sm font-medium italic">You have no new notifications at this time.</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {selectedNotification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#070B0F]/90 backdrop-blur-xl flex items-center justify-center p-4 z-[100]"
            onClick={() => setSelectedNotification(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#0F1720] border border-white/10 rounded-3xl max-w-lg w-full shadow-[0_0_100px_rgba(0,0,0,0.5)] p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle className="h-5 w-5 text-amber-400" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Confirm Notification</h3>
                </div>
                <button onClick={() => setSelectedNotification(null)} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
                  <X className="h-5 w-5 text-[#8B949E]" />
                </button>
              </div>

              <div className="mb-6">
                <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 mb-4">
                  <p className="text-[11px] font-black text-amber-400 uppercase tracking-widest mb-2">{selectedNotification.title}</p>
                  <p className="text-[#8B949E] text-sm font-medium whitespace-pre-wrap">{selectedNotification.message}</p>
                </div>
                <p className="text-[#8B949E] text-xs font-medium leading-relaxed">
                  By confirming, you acknowledge receipt and commit to processing the shipping request. The administrator will be immediately notified.
                </p>
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedNotification(null)}
                  className="flex-1 py-3.5 bg-white/[0.04] border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => confirmNotificationMutation.mutate(selectedNotification.id)}
                  disabled={confirmNotificationMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-2xl border border-emerald-400/20 disabled:opacity-50 transition-all"
                >
                  {confirmNotificationMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Confirm & Notify Admin
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Notifications;
