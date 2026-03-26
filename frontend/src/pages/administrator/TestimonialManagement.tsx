import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


import { toast } from '@/components/ui/use-toast';
import {
  MessageSquare,
  Star,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  Loader2,
  User,
  Calendar,
  ThumbsUp,
  AlertCircle,
  TrendingUp,
  Quote,
  Mail
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface Testimonial {
  id: string;
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

const TestimonialManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch testimonials
  const { data: testimonials, isLoading } = useQuery<Testimonial[]>({
    queryKey: ['admin-testimonials', searchTerm, statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await adminAPI.getTestimonials(params);
      return response.data.results || response.data;
    },
  });

  // Approve testimonial mutation
  const approveTestimonialMutation = useMutation({
    mutationFn: async (testimonialId: string) => {
      return adminAPI.approveTestimonial(testimonialId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
      setIsDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Testimonial approved successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to approve testimonial',
        variant: 'destructive',
      });
    },
  });

  // Reject testimonial mutation
  const rejectTestimonialMutation = useMutation({
    mutationFn: async (testimonialId: string) => {
      return adminAPI.rejectTestimonial(testimonialId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
      setIsDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Testimonial rejected successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to reject testimonial',
        variant: 'destructive',
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-900/40 text-yellow-300 border-yellow-600/40';
      case 'approved': return 'bg-green-900/40 text-green-300 border-green-600/40';
      case 'rejected': return 'bg-red-900/40 text-red-300 border-red-600/40';
      default: return 'bg-gray-800/40 text-gray-300 border-gray-600/40';
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300'
              }`}
          />
        ))}
      </div>
    );
  };

  // Calculations
  const allTestimonials = testimonials || [];
  const pendingTestimonials = allTestimonials.filter(t => t.status === 'pending');
  const approvedTestimonials = allTestimonials.filter(t => t.status === 'approved');
  const rejectedTestimonials = allTestimonials.filter(t => t.status === 'rejected');
  const averageRating = allTestimonials.length > 0
    ? (allTestimonials.reduce((sum, t) => sum + t.rating, 0) / allTestimonials.length).toFixed(1)
    : 0;

  // Filter testimonials
  const getFilteredTestimonials = () => {
    return allTestimonials.filter(testimonial => {
      const matchesSearch = !searchTerm ||
        testimonial.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${testimonial.user.first_name || ''} ${testimonial.user.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        testimonial.comment.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || testimonial.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const filteredTestimonials = getFilteredTestimonials();

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

  return (
    <div className="flex-1 space-y-4 relative min-h-screen bg-gradient-to-br from-[#0B0F14] via-[#0D1219] to-[#0F141B] text-[#E6EDF3] pt-1 sm:pt-4">
      {/* Animated background blobs */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-16 right-10 w-[520px] h-[520px] bg-[rgba(60,179,113,0.16)] rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-16 left-12 w-[520px] h-[520px] bg-[rgba(255,215,0,0.10)] rounded-full blur-3xl animate-pulse"></div>
      </div>
      <div className="relative z-10 px-4 md:px-8 w-full max-w-full">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mt-4 sm:mt-6">
            <div className="pb-2">
              <motion.h1
                className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent leading-loose" style={{ lineHeight: '1.4' }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                Testimonial Management
              </motion.h1>
              <motion.p
                className="text-xl text-gray-300 mt-2 font-medium leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Review and manage customer testimonials and feedback
              </motion.p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <motion.div whileHover={{ scale: 1.02, y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
              <div className="bg-[#0F1720] border border-white/[0.08] rounded-2xl p-6 shadow-xl hover:border-yellow-500/30 transition-all duration-300 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-300/80 text-sm font-medium">Pending Review</p>
                    <p className="text-3xl font-bold text-white mt-1">{pendingTestimonials.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-500 to-amber-600 p-3 rounded-xl shadow-lg">
                    <AlertCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02, y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
              <div className="bg-[#0F1720] border border-white/[0.08] rounded-2xl p-6 shadow-xl hover:border-emerald-500/30 transition-all duration-300 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-300/80 text-sm font-medium">Approved</p>
                    <p className="text-3xl font-bold text-white mt-1">{approvedTestimonials.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Published testimonials</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-3 rounded-xl shadow-lg">
                    <ThumbsUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02, y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
              <div className="bg-[#0F1720] border border-white/[0.08] rounded-2xl p-6 shadow-xl hover:border-blue-500/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-300/80 text-sm font-medium">Average Rating</p>
                    <p className="text-3xl font-bold text-white mt-1">{averageRating}</p>
                    <p className="text-xs text-gray-500 mt-1">Out of 5.0 stars</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                    <Star className="h-6 w-6 text-white fill-white" />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02, y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
              <div className="bg-[#0F1720] border border-white/[0.08] rounded-2xl p-6 shadow-xl hover:border-violet-500/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-violet-300/80 text-sm font-medium">Total Reviews</p>
                    <p className="text-3xl font-bold text-white mt-1">{allTestimonials.length}</p>
                    <p className="text-xs text-gray-500 mt-1">All testimonials</p>
                  </div>
                  <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-3 rounded-xl shadow-lg">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Filters */}
          <div className="bg-[#0F1720] border border-white/[0.08] rounded-2xl shadow-xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by email, name, or comment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 h-11 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white/5 text-white placeholder-gray-500 transition-all duration-300"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 h-11 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white/5 text-white transition-all duration-300"
              >
                <option value="all" className="bg-[#0F1720]">All Status</option>
                <option value="pending" className="bg-[#0F1720]">Pending</option>
                <option value="approved" className="bg-[#0F1720]">Approved</option>
                <option value="rejected" className="bg-[#0F1720]">Rejected</option>
              </select>
            </div>
          </div>

          {/* Testimonials List */}
          <div className="bg-[#0F1720] border border-white/[0.08] rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Customer Testimonials</h3>
              <span className="text-sm text-emerald-100">{filteredTestimonials.length} testimonials</span>
            </div>
            <div className="p-0">
              {filteredTestimonials.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <div className="bg-emerald-900/30 rounded-full p-4 w-16 h-16 flex items-center justify-center mb-4">
                    <MessageSquare className="h-6 w-6 text-emerald-400" />
                  </div>
                  <p className="text-gray-300 font-medium">No testimonials found</p>
                  <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {filteredTestimonials.map((testimonial) => (
                    <motion.div
                      key={testimonial.id}
                      className="p-6 hover:bg-white/[0.03] transition-all duration-300"
                      whileHover={{ scale: 1.002 }}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                        {/* Left Section - Testimonial Content */}
                        <div className="flex-1 space-y-4">
                          <div className="flex items-start gap-4">
                            <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-3 rounded-2xl shadow-xl flex-shrink-0">
                              <User className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h3 className="text-lg font-bold text-gray-100">
                                  {testimonial.user.first_name || testimonial.user.last_name
                                    ? `${testimonial.user.first_name || ''} ${testimonial.user.last_name || ''}`.trim()
                                    : testimonial.user.email}
                                </h3>
                                <Badge className={`${getStatusColor(testimonial.status)} border text-xs`}>
                                  {testimonial.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-400 mb-2">{testimonial.user.email}</p>
                              <div className="flex items-center gap-3">
                                {renderStars(testimonial.rating)}
                                <span className="text-sm text-gray-500">
                                  {format(new Date(testimonial.created_at), 'PPp')}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06]">
                            <p className="text-gray-300 leading-relaxed">{testimonial.comment}</p>
                          </div>
                        </div>

                        {/* Right Section - Actions */}
                        <div className="lg:w-48 space-y-2">
                          {testimonial.status === 'pending' ? (
                            <>
                              <Button
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                                onClick={() => approveTestimonialMutation.mutate(testimonial.id)}
                                disabled={approveTestimonialMutation.isPending}
                              >
                                {approveTestimonialMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Approve
                              </Button>
                              <Button
                                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                                onClick={() => rejectTestimonialMutation.mutate(testimonial.id)}
                                disabled={rejectTestimonialMutation.isPending}
                              >
                                {rejectTestimonialMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4 mr-2" />
                                )}
                                Reject
                              </Button>
                            </>
                          ) : (
                            <Button
                              className="w-full bg-white/10 border border-white/10 text-gray-300 hover:bg-white/15 hover:text-white transition-all"
                              onClick={() => {
                                setSelectedTestimonial(testimonial);
                                setIsDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {isDialogOpen && selectedTestimonial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={() => setIsDialogOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-gradient-to-br from-[#0F1720] via-[#1A2533] to-[#0F1720] rounded-2xl shadow-2xl border border-gray-700/50 w-full max-w-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/40">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-900/20">
                    <MessageSquare className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-100 italic">Testimonial Details</h2>
                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mt-0.5">Customer review & rating</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDialogOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-full"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-8 sidebar-scrollbar overflow-y-auto max-h-[70vh]">
                {/* Customer Info & Rating */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-800/20 rounded-2xl p-5 border border-gray-700/30">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <User className="h-4 w-4 text-emerald-400" />
                      Customer
                    </h3>
                    <p className="text-lg font-bold text-gray-100">
                      {selectedTestimonial.user.first_name || selectedTestimonial.user.last_name
                        ? `${selectedTestimonial.user.first_name || ''} ${selectedTestimonial.user.last_name || ''}`.trim()
                        : 'Anonymous'}
                    </p>
                    <p className="text-sm text-gray-400 flex items-center gap-2 mt-2">
                      <Mail className="h-3.5 w-3.5 text-gray-500" />
                      {selectedTestimonial.user.email}
                    </p>
                    <p className="text-[10px] text-emerald-400/70 font-mono uppercase mt-2">User ID: #{selectedTestimonial.user.id}</p>
                  </div>

                  <div className="bg-gray-800/20 rounded-2xl p-5 border border-gray-700/30">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <Star className="h-4 w-4 text-yellow-400" />
                      Rating & Status
                    </h3>
                    <div className="flex items-center gap-3 mb-4">
                      {renderStars(selectedTestimonial.rating)}
                      <span className="text-sm font-bold text-yellow-400 font-mono">{selectedTestimonial.rating}/5</span>
                    </div>
                    <Badge className={`${getStatusColor(selectedTestimonial.status)} border text-xs px-3 py-1 rounded-full font-bold uppercase tracking-widest`}>
                      {selectedTestimonial.status}
                    </Badge>
                  </div>
                </div>

                {/* Comment */}
                <div className="mb-8">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Quote className="h-4 w-4 text-emerald-400" />
                    Customer Comment
                  </h3>
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 border-l-4 border-l-emerald-500/50 relative overflow-hidden">
                    <Quote className="absolute top-3 right-4 h-20 w-20 text-emerald-900/20" />
                    <p className="text-gray-300 leading-relaxed italic relative z-10">"{selectedTestimonial.comment}"</p>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-700/50">
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Submitted</p>
                    <p className="text-sm font-bold text-gray-300">{format(new Date(selectedTestimonial.created_at), 'PPp')}</p>
                  </div>
                  <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-700/50">
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Last Updated</p>
                    <p className="text-sm font-bold text-gray-300">{format(new Date(selectedTestimonial.updated_at), 'PPp')}</p>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              {selectedTestimonial.status === 'pending' && (
                <div className="p-6 bg-gray-900/60 border-t border-gray-700/50 flex gap-4">
                  <Button
                    className="flex-1 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 rounded-xl"
                    onClick={() => rejectTestimonialMutation.mutate(selectedTestimonial.id)}
                    disabled={rejectTestimonialMutation.isPending}
                  >
                    {rejectTestimonialMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Reject
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20"
                    onClick={() => approveTestimonialMutation.mutate(selectedTestimonial.id)}
                    disabled={approveTestimonialMutation.isPending}
                  >
                    {approveTestimonialMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Approve
                  </Button>
                </div>
              )}
              {selectedTestimonial.status !== 'pending' && (
                <div className="p-6 bg-gray-900/60 border-t border-gray-700/50">
                  <Button
                    className="w-full bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Close
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

export default TestimonialManagement;
