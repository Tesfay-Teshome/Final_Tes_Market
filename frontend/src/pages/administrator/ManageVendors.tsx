import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Store, Search, Filter, Download, Plus, Users, UserCheck, UserX, Building2, Mail, Phone, Calendar, Eye, User, Lock, MapPin, FileText, Camera, X } from 'lucide-react';
import { adminAPI, resolveMediaUrl } from '@/services/api';
import { Vendor, VendorResponse, VendorListResponse } from '@/types/vendor';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Form validation schema for adding vendors
const createVendorSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string().min(1, 'Confirm password is required'),
  full_name: z.string().min(1, 'Full name is required'),
  store_name: z.string().min(1, 'Store name is required'),
  store_description: z.string().min(1, 'Store description is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type CreateVendorFormData = z.infer<typeof createVendorSchema>;

const ManageVendors = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showVendorDetailsModal, setShowVendorDetailsModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch vendors
  const { 
    data: vendors, 
    isLoading, 
    error: vendorsError, 
    refetch 
  } = useQuery<VendorListResponse>({
    queryKey: ['vendors', statusFilter, searchTerm],
    queryFn: async () => {
      try {
        const response = await adminAPI.getVendors({ 
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: searchTerm 
        });

        // Log full response for debugging
        console.log('Full API Response:', response);

        // Check if response is JSON
        if (typeof response.data === 'object') {
          // Strict type guard
          if ('results' in response.data) {
            return {
              count: response.data.count || 0,
              results: response.data.results || []
            };
          } else if (Array.isArray(response.data)) {
            // Fallback for direct array response
            return {
              count: response.data.length,
              results: response.data
            };
          }
        }
        
        throw new Error('Invalid API response structure: ' + JSON.stringify(response));
      } catch (error) {
        console.error('Vendor fetch error:', error);
        
        // Additional error logging
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
          });
        }
        
        return { count: 0, results: [] };
      }
    },
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: true,
  });

  const approveVendor = useMutation<VendorResponse, Error, string>({
    mutationFn: async (id) => {
      const response = await adminAPI.approveVendor(id);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({
        title: "Success",
        description: `Vendor ${data?.full_name || 'approved'} successfully approved`,
        variant: "default"
      });
      // Switch to approved tab to see the result
      setStatusFilter('approved');
    },
    onError: (error) => {
      console.error('Error approving vendor:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const rejectVendor = useMutation<VendorResponse, Error, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      if (!reason.trim()) {
        throw new Error('Please provide a reason for rejection');
      }
      const response = await adminAPI.rejectVendor(id, reason);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({
        title: "Success",
        description: `Vendor ${data?.full_name || 'rejected'} successfully rejected`,
        variant: "default"
      });
      // Switch to rejected tab to see the result
      setStatusFilter('rejected');
    },
    onError: (error) => {
      console.error('Error rejecting vendor:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateVendorFormData>({
    resolver: zodResolver(createVendorSchema),
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: CreateVendorFormData) => {
      const formData = new FormData();
      formData.append('email', data.email);
      formData.append('password', data.password);
      formData.append('confirm_password', data.confirm_password);
      formData.append('full_name', data.full_name);
      formData.append('user_type', 'vendor');
      formData.append('store_name', data.store_name);
      formData.append('store_description', data.store_description);
      if (data.phone) formData.append('phone', data.phone);
      if (data.address) formData.append('address', data.address);
      if (profileImage) formData.append('profile_image', profileImage);
      
      return adminAPI.createUser(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({
        title: 'Success',
        description: 'Vendor created successfully and is pending approval.',
      });
      handleCloseModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          'Failed to create vendor';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Profile image must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image file',
          variant: 'destructive',
        });
        return;
      }
      
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfileImage = () => {
    setProfileImage(null);
    setProfileImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    reset();
    setProfileImage(null);
    setProfileImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCloseModal = () => {
    setShowAddVendorModal(false);
    resetForm();
  };

  const onSubmit = async (data: CreateVendorFormData) => {
    setIsSubmitting(true);
    try {
      await createVendorMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = (id: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason !== null) {
      rejectVendor.mutate({ id, reason });
    }
  };

  const handleViewVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowVendorDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowVendorDetailsModal(false);
    setSelectedVendor(null);
  };

  const filteredVendors = useMemo(() => {
    return (vendors?.results || []).filter((vendor: Vendor) => {
      const matchesSearch = vendor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vendors?.results, searchTerm, statusFilter]);

  useEffect(() => {
    refetch();
  }, [statusFilter, refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-12 w-12 border-4 border-gradient-to-r from-blue-500 to-purple-500 border-t-transparent"
        />
      </div>
    );
  }

  if (vendorsError) {
    return (
      <motion.div 
        className="flex items-center justify-center min-h-screen"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-center p-8 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border border-red-200">
          <div className="text-red-600 text-xl font-bold mb-2">Error Loading Vendors</div>
          <p className="text-red-500">Please try refreshing the page</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex-1 space-y-4 relative min-h-screen bg-gradient-to-br from-[#0B0F14] via-[#0D1219] to-[#0F141B] text-[#E6EDF3] pt-1 sm:pt-4">
      {/* Subtle animated background elements */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-16 right-10 w-[520px] h-[520px] bg-[rgba(60,179,113,0.16)] rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-16 left-12 w-[520px] h-[520px] bg-[rgba(255,215,0,0.10)] rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 px-4 md:px-8 w-full max-w-full">
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
      {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mt-4 sm:mt-6"
          >
            <div className="pb-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent leading-loose" style={{ lineHeight: '1.4' }}>
                Manage Vendors
              </h1>
              <p className="text-xl text-gray-300 mt-2 font-medium leading-relaxed">Review and manage vendor applications and accounts</p>
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
        <Button variant="outline" className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-none hover:shadow-lg transition-all duration-300 py-2 px-3 sm:px-4">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        <Button 
          onClick={() => setShowAddVendorModal(true)}
          className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-300 py-2 px-3 sm:px-4"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Vendor
        </Button>
      </motion.div>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card 
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Vendors</p>
                <p className="text-2xl font-bold">{vendors?.count || 0}</p>
              </div>
              <Building2 className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
          onClick={() => setStatusFilter('pending')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold">{filteredVendors.filter(v => v.status === 'pending').length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-yellow-200" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
          onClick={() => setStatusFilter('approved')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Approved</p>
                <p className="text-2xl font-bold">{filteredVendors.filter(v => v.status === 'approved').length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className="bg-gradient-to-br from-red-500 to-red-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
          onClick={() => setStatusFilter('rejected')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Rejected</p>
                <p className="text-2xl font-bold">{filteredVendors.filter(v => v.status === 'rejected').length}</p>
              </div>
              <UserX className="h-8 w-8 text-red-200" />
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
            placeholder="Search vendors by name, email, or store..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 h-12 border-2 border-gray-600/50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-800/80 backdrop-blur-sm text-white placeholder-gray-400 shadow-lg transition-all duration-300"
          />
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-6 h-12 border-2 border-gray-600/50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-800/80 backdrop-blur-sm text-white shadow-lg transition-all duration-300"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <Button className="px-6 h-12 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.06)] text-[#B6EBD3] hover:bg-[rgba(255,255,255,0.12)] hover:text-[#E9FFF4] transition-all duration-300 shadow-lg backdrop-blur-sm rounded-full font-medium">
          <Filter className="w-4 h-4 mr-2" />
          More Filters
        </Button>
      </motion.div>

      {/* Vendors Table */}
      <motion.div 
        className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">Vendor Applications</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gradient-to-r from-gray-800 to-gray-900">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Vendor Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-900/50 divide-y divide-gray-700">
              {filteredVendors.length > 0 ? (
                filteredVendors.map((vendor, index) => (
                  <motion.tr 
                    key={vendor.id}
                    className="hover:bg-gradient-to-r hover:from-gray-800/50 hover:to-gray-700/50 transition-all duration-300"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {resolveMediaUrl(vendor.profile_image) ? (
                          <motion.img 
                            src={resolveMediaUrl(vendor.profile_image)!} 
                            alt={vendor.full_name || 'Vendor'}
                            className="h-12 w-12 rounded-full object-cover border-2 border-purple-200 shadow-md"
                            whileHover={{ scale: 1.1 }}
                          />
                        ) : (
                          <motion.div 
                            className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-md"
                            whileHover={{ scale: 1.1, rotate: 5 }}
                          >
                            <span className="text-white text-lg font-bold">
                              {(vendor.full_name || vendor.email).charAt(0).toUpperCase()}
                            </span>
                          </motion.div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-100">
                            {vendor.full_name || vendor.email.split('@')[0]}
                          </div>
                          {vendor.store_name && (
                            <div className="text-sm text-gray-300 font-medium flex items-center">
                              <Store className="h-3 w-3 mr-1" />
                              {vendor.store_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center text-sm text-gray-300">
                          <Mail className="h-4 w-4 mr-2 text-blue-400" />
                          {vendor.email}
                        </div>
                        {vendor.phone && (
                          <div className="flex items-center text-sm text-gray-300">
                            <Phone className="h-4 w-4 mr-2 text-green-400" />
                            {vendor.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <motion.span 
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full shadow-md ${
                          vendor.status === 'approved' ? 'bg-gradient-to-r from-green-800/90 to-green-900/90 text-white' :
                          vendor.status === 'pending' ? 'bg-gradient-to-r from-yellow-800/90 to-amber-900/90 text-white' :
                          'bg-gradient-to-r from-red-800/90 to-red-900/90 text-white'
                        }`}
                        whileHover={{ scale: 1.05 }}
                      >
                        {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                      </motion.span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <motion.button
                          onClick={() => handleViewVendor(vendor)}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all duration-300 shadow-md hover:shadow-lg font-medium flex items-center space-x-2"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="text-sm">View</span>
                        </motion.button>
                        {vendor.status === 'pending' && (
                          <>
                            <motion.button
                              onClick={() => approveVendor.mutate(vendor.id)}
                              className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-md hover:shadow-lg font-medium"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <UserCheck className="h-4 w-4 mr-1 inline" />
                              Approve
                            </motion.button>
                            <motion.button
                              onClick={() => handleReject(vendor.id)}
                              className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-md hover:shadow-lg font-medium"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <UserX className="h-4 w-4 mr-1 inline" />
                              Reject
                            </motion.button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center space-y-3"
                    >
                      <Building2 className="h-12 w-12 text-gray-400" />
                      <p className="text-gray-500 font-medium">No vendors found</p>
                      <p className="text-gray-400 text-sm">Try adjusting your search criteria</p>
                    </motion.div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Add Vendor Modal */}
      {showAddVendorModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCloseModal}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Add New Vendor</h2>
              <p className="text-gray-600">Create a new vendor account</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Profile Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profile Image (Optional)</label>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {profileImagePreview ? (
                      <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
                        <img src={profileImagePreview} alt="Profile preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={removeProfileImage} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                          <X className="h-2 w-2" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center px-3 py-2 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 text-sm">
                      <Camera className="h-4 w-4 mr-2" />
                      {profileImage ? 'Change Image' : 'Upload Image'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Fields in Two Columns */}
              <div className="grid grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input {...register('full_name')} placeholder="Enter full name" className="pl-10 pr-4 w-full py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" />
                    </div>
                    {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input {...register('email')} type="email" placeholder="Enter email address" className="pl-10 pr-4 w-full py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" />
                    </div>
                    {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input {...register('password')} type="password" placeholder="Enter password" className="pl-10 pr-4 w-full py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" />
                    </div>
                    {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone (Optional)</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input {...register('phone')} placeholder="Enter phone number" className="pl-10 pr-4 w-full py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" />
                    </div>
                    {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input {...register('confirm_password')} type="password" placeholder="Confirm password" className="pl-10 pr-4 w-full py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" />
                    </div>
                    {errors.confirm_password && <p className="mt-1 text-xs text-red-600">{errors.confirm_password.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Store Name</label>
                    <div className="relative">
                      <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input {...register('store_name')} placeholder="Enter store name" className="pl-10 pr-4 w-full py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" />
                    </div>
                    {errors.store_name && <p className="mt-1 text-xs text-red-600">{errors.store_name.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address (Optional)</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <textarea {...register('address')} placeholder="Enter address" rows={2} className="pl-10 pr-4 w-full py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none" />
                    </div>
                    {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>}
                  </div>
                </div>
              </div>

              {/* Store Description - Full Width */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Store Description</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <textarea {...register('store_description')} placeholder="Describe the store and what it sells" rows={3} className="pl-10 pr-4 w-full py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none" />
                </div>
                {errors.store_description && <p className="mt-1 text-xs text-red-600">{errors.store_description.message}</p>}
              </div>

              <div className="flex space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1" disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Vendor'}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Vendor Details Modal */}
      {showVendorDetailsModal && selectedVendor && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]"
          onClick={handleCloseDetailsModal}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto backdrop-blur-xl scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-600 to-green-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border-2 border-emerald-500/30">
                {resolveMediaUrl(selectedVendor.profile_image) ? (
                  <img 
                    src={resolveMediaUrl(selectedVendor.profile_image)!} 
                    alt={selectedVendor.full_name || 'Vendor'}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-emerald-200" />
                )}
              </div>
              <motion.span 
                className={`inline-flex px-4 py-2 text-sm font-bold rounded-full mt-3 shadow-lg ${
                  selectedVendor?.status === 'approved' ? 'bg-gradient-to-r from-green-800/90 to-green-900/90 text-white' :
                  selectedVendor?.status === 'pending' ? 'bg-gradient-to-r from-yellow-800/90 to-amber-900/90 text-white' :
                  'bg-gradient-to-r from-red-800/90 to-red-900/90 text-white'
                }`}
              >
                {selectedVendor?.status ? selectedVendor.status.charAt(0).toUpperCase() + selectedVendor.status.slice(1) : 'Unknown'}
              </motion.span>
            </div>

            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-emerald-200 mb-3 flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-blue-400" />
                  Contact Information
                </h3>
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-3 border border-gray-700/30">
                  <div>
                    <span className="text-sm font-medium text-gray-400">Full Name:</span>
                    <p className="text-sm text-gray-200 mt-1">{selectedVendor?.full_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-400">Store Name:</span>
                    <p className="text-sm text-gray-200 mt-1">{selectedVendor?.store_name || 'Not provided'}</p>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-blue-400 mr-3" />
                    <span className="text-sm font-medium text-gray-400">Email:</span>
                    <span className="ml-2 text-sm text-gray-200">{selectedVendor?.email}</span>
                  </div>
                  {(selectedVendor.phone || (selectedVendor as any).phone_number) && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-green-400 mr-3" />
                      <span className="text-sm font-medium text-gray-400">Phone:</span>
                      <span className="ml-2 text-sm text-gray-200">{selectedVendor.phone || (selectedVendor as any).phone_number}</span>
                    </div>
                  )}
                  {selectedVendor.address && (
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 text-purple-400 mr-3 mt-0.5" />
                      <div>
                        <span className="text-sm font-medium text-gray-400">Address:</span>
                        <p className="text-sm text-gray-200 mt-1">{selectedVendor.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Store Information */}
              <div>
                <h3 className="text-lg font-semibold text-emerald-200 mb-3 flex items-center">
                  <Store className="h-5 w-5 mr-2 text-purple-400" />
                  Store Information
                </h3>
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-3 border border-gray-700/30">
                  <div>
                    <span className="text-sm font-medium text-gray-400">Store Name:</span>
                    <p className="text-sm text-gray-200 mt-1">{selectedVendor.store_name || 'Not provided'}</p>
                  </div>
                  {selectedVendor.store_description && (
                    <div>
                      <span className="text-sm font-medium text-gray-400">Description:</span>
                      <p className="text-sm text-gray-200 mt-1">{selectedVendor.store_description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Information */}
              <div>
                <h3 className="text-lg font-semibold text-emerald-200 mb-3 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-green-400" />
                  Account Information
                </h3>
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-3 border border-gray-700/30">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-green-400 mr-3" />
                    <span className="text-sm font-medium text-gray-400">Joined:</span>
                    <span className="ml-2 text-sm text-gray-200">
                      {selectedVendor.date_joined ? new Date(selectedVendor.date_joined).toLocaleDateString() : 
                       selectedVendor.created_at ? new Date(selectedVendor.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-sm font-medium text-gray-400">Username:</span>
                    <span className="ml-2 text-sm text-gray-200">{selectedVendor.username || 'Not set'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-6 mt-6 border-t border-gray-700">
              <Button 
                type="button" 
                onClick={handleCloseDetailsModal} 
                className="flex-1 px-6 py-3 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.06)] text-[#B6EBD3] hover:bg-[rgba(255,255,255,0.12)] hover:text-[#E9FFF4] transition-all duration-300 shadow-lg backdrop-blur-sm rounded-full font-medium"
              >
                Close
              </Button>
              {selectedVendor.status === 'pending' && (
                <>
                  <Button 
                    onClick={() => {
                      rejectVendor.mutate({ id: selectedVendor.id, reason: 'Rejected by admin' });
                      handleCloseDetailsModal();
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-full font-medium shadow-lg transition-all duration-300"
                  >
                    Reject
                  </Button>
                  <Button 
                    onClick={() => {
                      approveVendor.mutate(selectedVendor.id);
                      handleCloseDetailsModal();
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-full font-medium shadow-lg transition-all duration-300"
                  >
                    Approve
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
        </motion.div>
      </div>
    </div>
  );
};

export default ManageVendors;