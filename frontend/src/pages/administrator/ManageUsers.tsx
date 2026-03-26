import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Search, UserX, UserCheck, Mail, Phone, Filter, Download, Plus, Users, Lock, MapPin, Store, FileText, Camera, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminAPI, resolveMediaUrl } from '@/services/api';
import { User as UserType } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Form validation schema
const createUserSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .refine((val) => !val.includes('@'), 'Username cannot contain @ symbol'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string().min(1, 'Confirm password is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  user_type: z.enum(['buyer', 'vendor']),
  store_name: z.string().optional(),
  store_description: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
}).refine(
  (data) => {
    if (data.user_type === 'vendor') {
      return !!data.store_name && !!data.store_description;
    }
    return true;
  },
  {
    message: "Store information is required for vendors",
    path: ["store_name"],
  }
);

type CreateUserFormData = z.infer<typeof createUserSchema>;

const ManageUsers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userType, setUserType] = useState<'buyer' | 'vendor'>('buyer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if we're on the /new route to show add user form
  const isAddUserRoute = location.pathname.includes('/new');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await adminAPI.getUsers();
      return Array.isArray(response.data) ? response.data : []; // Ensure this returns an array
    },
  });

  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    return users.filter(user => {
      const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && user.is_active) ||
        (statusFilter === 'inactive' && !user.is_active);
      
      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  const updateUserStatusMutation = useMutation<void, Error, { userId: string; isActive: boolean }>({
    mutationFn: async ({ userId, isActive }) => {
      await adminAPI.updateUserStatus(userId, isActive);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Success',
        description: 'User status updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleToggleUserStatus = (userId: string, isActive: boolean) => {
    updateUserStatusMutation.mutate({ userId, isActive });
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      user_type: 'buyer',
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      const formData = new FormData();
      formData.append('username', data.username);
      formData.append('email', data.email);
      formData.append('password', data.password);
      formData.append('confirm_password', data.confirm_password);
      formData.append('first_name', data.first_name);
      formData.append('last_name', data.last_name);
      formData.append('user_type', data.user_type);
      
      if (data.store_name) formData.append('store_name', data.store_name);
      if (data.store_description) formData.append('store_description', data.store_description);
      if (data.phone) formData.append('phone', data.phone);
      if (data.address) formData.append('address', data.address);
      if (profileImage) formData.append('profile_image', profileImage);
      
      return adminAPI.createUser(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Success',
        description: 'User created successfully.',
      });
      handleCloseModal();
      resetForm();
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to create user';
      
      if (error.response?.data) {
        const data = error.response.data;
        
        // Handle field-specific validation errors
        if (data.email) {
          errorMessage = data.email;
        } else if (data.username) {
          errorMessage = data.username;
        } else if (data.password) {
          errorMessage = data.password;
        } else if (data.store_name) {
          errorMessage = data.store_name;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (typeof data === 'string') {
          errorMessage = data;
        }
      }
      
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
    setUserType('buyer');
    setProfileImage(null);
    setProfileImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCloseModal = () => {
    setShowAddUserModal(false);
    if (isAddUserRoute) {
      navigate('/administrator/users');
    }
    resetForm();
  };

  const onSubmit = async (data: CreateUserFormData) => {
    setIsSubmitting(true);
    try {
      await createUserMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
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
                Manage Users
              </h1>
              <p className="text-xl text-gray-300 mt-2 font-medium leading-relaxed">Review and manage user accounts across the platform</p>
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
              onClick={() => setShowAddUserModal(true)}
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-300 py-2 px-3 sm:px-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </motion.div>
        

      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card 
          className="bg-gradient-to-br from-emerald-600 to-emerald-700/95 backdrop-blur-sm text-white border-2 border-emerald-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300 cursor-pointer transform hover:scale-105"
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Total Users</p>
                <p className="text-2xl font-bold">{Array.isArray(users) ? users.length : 0}</p>
              </div>
              <Users className="h-8 w-8 text-emerald-200" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className="bg-gradient-to-br from-green-600 to-green-700/95 backdrop-blur-sm text-white border-2 border-green-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300 cursor-pointer transform hover:scale-105"
          onClick={() => setStatusFilter('active')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Active Users</p>
                <p className="text-2xl font-bold">{Array.isArray(users) ? users.filter(u => u.is_active).length : 0}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className="bg-gradient-to-br from-orange-600 to-red-600/95 backdrop-blur-sm text-white border-2 border-orange-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300 cursor-pointer transform hover:scale-105"
          onClick={() => setStatusFilter('inactive')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Inactive Users</p>
                <p className="text-2xl font-bold">{Array.isArray(users) ? users.filter(u => !u.is_active).length : 0}</p>
              </div>
              <UserX className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-600 to-purple-700/95 backdrop-blur-sm text-white border-2 border-violet-500/40 shadow-2xl hover:shadow-3xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-violet-100 text-sm font-medium">New Today</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <Plus className="h-8 w-8 text-violet-200" />
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
            placeholder="Search users by name, email, or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 h-12 border-2 border-gray-600/50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-800/80 backdrop-blur-sm text-white placeholder-gray-400 shadow-lg transition-all duration-300"
          />
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
        </div>
        <Button className="px-6 h-12 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.06)] text-[#B6EBD3] hover:bg-[rgba(255,255,255,0.12)] hover:text-[#E9FFF4] transition-all duration-300 shadow-lg backdrop-blur-sm rounded-full font-medium">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </motion.div>

      {/* Users Table */}
      <motion.div 
        className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">Users Directory</h3>
        </div>
        <div className="overflow-x-auto max-w-full">
          <table className="w-full divide-y divide-gray-700/50">
            <thead className="bg-gradient-to-r from-gray-800/80 to-gray-700/80">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider w-48">
                  User
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider w-24">
                  Type
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider w-56">
                  Contact
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider w-24">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider w-28">
                  Joined
                </th>
                <th className="px-3 py-3 text-right text-xs font-bold text-gray-200 uppercase tracking-wider w-32">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800/50 divide-y divide-gray-700/30">
              {Array.isArray(filteredUsers) ? filteredUsers.map((user: UserType, index) => (
                <motion.tr 
                  key={user.id}
                  className="hover:bg-gradient-to-r hover:from-emerald-900/30 hover:to-green-900/30 transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      {resolveMediaUrl(user.profile_image) ? (
                        <motion.img
                          src={resolveMediaUrl(user.profile_image)!}
                          alt={user.username}
                          className="h-10 w-10 rounded-full border-2 border-blue-200 shadow-md"
                          whileHover={{ scale: 1.1 }}
                        />
                      ) : (
                        <motion.div 
                          className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-md"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                        >
                          <User className="h-5 w-5 text-white" />
                        </motion.div>
                      )}
                      <div className="ml-3">
                        <div className="text-sm font-bold text-gray-100">
                          {user.full_name || user.username}
                        </div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-4 font-bold rounded-full bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md">
                      {user.user_type}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center text-xs text-gray-300">
                        <Mail className="h-3 w-3 mr-1.5 text-blue-400" />
                        {user.email}
                      </div>
                      {user.phone && (
                        <div className="flex items-center text-xs text-gray-300">
                          <Phone className="h-3 w-3 mr-1.5 text-green-400" />
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <motion.span
                      className={`px-2 py-1 inline-flex text-xs leading-4 font-bold rounded-full shadow-md ${
                        user.is_active
                          ? 'bg-gradient-to-r from-green-400 to-green-600 text-white'
                          : 'bg-gradient-to-r from-red-400 to-red-600 text-white'
                      }`}
                      whileHover={{ scale: 1.05 }}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </motion.span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-300 font-medium">
                    {user.date_joined ? new Date(user.date_joined).toLocaleDateString() : 
                     user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-right text-xs font-medium">
                    <motion.button
                      onClick={() => handleToggleUserStatus(user.id, !user.is_active)}
                      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 shadow-md hover:shadow-lg ${
                        user.is_active
                          ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                          : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {user.is_active ? (
                        <>
                          <UserX className="h-3 w-3 mr-1.5" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-3 w-3 mr-1.5" />
                          Activate
                        </>
                      )}
                    </motion.button>
                  </td>
                </motion.tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center space-y-3"
                    >
                      <Users className="h-12 w-12 text-gray-400" />
                      <p className="text-gray-400 font-medium">No users found</p>
                      <p className="text-gray-500 text-sm">Try adjusting your search criteria</p>
                    </motion.div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Add User Modal */}
      {(showAddUserModal || isAddUserRoute) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseModal}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-auto max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Gradient */}
            <div className="relative overflow-hidden rounded-t-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 opacity-90"></div>
              <div className="absolute inset-0">
                <div className="absolute top-4 right-12 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute bottom-4 left-12 w-16 h-16 bg-yellow-300/20 rounded-full blur-lg animate-bounce"></div>
              </div>
              <div className="relative z-10 px-8 py-6 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: 360 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
                >
                  <Plus className="w-8 h-8 text-white" />
                </motion.div>
                <h2 className="text-3xl font-bold text-white mb-2">Create New User</h2>
                <p className="text-blue-100 text-lg">Add a new member to the TesMarket platform</p>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* User Type Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Account Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <motion.button
                      type="button"
                      onClick={() => { setUserType('buyer'); setValue('user_type', 'buyer'); }}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${userType === 'buyer' ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100 shadow-lg ring-2 ring-emerald-500/20' : 'border-gray-300 hover:border-emerald-400 hover:shadow-md bg-white'}`}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <User className={`h-7 w-7 mx-auto mb-2 ${userType === 'buyer' ? 'text-blue-600' : 'text-gray-400'}`} />
                      <p className={`text-sm font-bold ${userType === 'buyer' ? 'text-blue-600' : 'text-gray-600'}`}>Buyer Account</p>
                      <p className={`text-xs mt-1 ${userType === 'buyer' ? 'text-blue-500' : 'text-gray-500'}`}>Shop & Discover</p>
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => { setUserType('vendor'); setValue('user_type', 'vendor'); }}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${userType === 'vendor' ? 'border-green-500 bg-gradient-to-br from-green-50 to-green-100 shadow-lg ring-2 ring-green-500/20' : 'border-gray-300 hover:border-green-400 hover:shadow-md bg-white'}`}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Store className={`h-7 w-7 mx-auto mb-2 ${userType === 'vendor' ? 'text-purple-600' : 'text-gray-400'}`} />
                      <p className={`text-sm font-bold ${userType === 'vendor' ? 'text-purple-600' : 'text-gray-600'}`}>Vendor Account</p>
                      <p className={`text-xs mt-1 ${userType === 'vendor' ? 'text-purple-500' : 'text-gray-500'}`}>Sell & Grow</p>
                    </motion.button>
                  </div>
                </div>

                {/* Profile Image Upload */}
                <div className="bg-gradient-to-br from-gray-50 to-emerald-50/30 border-2 border-dashed border-gray-300 rounded-xl p-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <Camera className="h-4 w-4 mr-2 text-gray-600" />
                    Profile Image (Optional)
                  </label>
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      {profileImagePreview ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg"
                        >
                          <img src={profileImagePreview} alt="Profile preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={removeProfileImage}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-md transition-all duration-300 hover:scale-110"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </motion.div>
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-4 border-white shadow-lg flex items-center justify-center">
                          <User className="h-8 w-8 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      <motion.button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center px-4 py-3 border-2 border-gray-300 hover:border-blue-500 bg-white rounded-lg text-sm font-medium text-gray-700 hover:text-blue-600 transition-all duration-300 w-full"
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Camera className="h-5 w-5 mr-2" />
                        {profileImage ? 'Change Profile Image' : 'Upload Profile Image'}
                      </motion.button>
                      <p className="text-xs text-gray-500 mt-2 text-center">PNG, JPG up to 5MB</p>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-5">
                  {/* Username Field */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Username *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        {...register('username')}
                        placeholder="Choose a unique username"
                        className="pl-10 pr-4 w-full py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm"
                      />
                    </div>
                    {errors.username && <p className="mt-1 text-xs text-red-600 flex items-center"><span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>{errors.username.message}</p>}
                  </div>

                  {/* First Name and Last Name Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">First Name *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          {...register('first_name')}
                          placeholder="First name"
                          className="pl-10 pr-4 w-full py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm"
                        />
                      </div>
                      {errors.first_name && <p className="mt-1 text-xs text-red-600 flex items-center"><span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>{errors.first_name.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          {...register('last_name')}
                          placeholder="Last name"
                          className="pl-10 pr-4 w-full py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm"
                        />
                      </div>
                      {errors.last_name && <p className="mt-1 text-xs text-red-600 flex items-center"><span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>{errors.last_name.message}</p>}
                    </div>
                  </div>

                  {/* Email Field */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        {...register('email')}
                        type="email"
                        placeholder="Enter email address"
                        className="pl-10 pr-4 w-full py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm"
                      />
                    </div>
                    {errors.email && <p className="mt-1 text-xs text-red-600 flex items-center"><span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>{errors.email.message}</p>}
                  </div>

                  {/* Password Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          {...register('password')}
                          type="password"
                          placeholder="Enter password"
                          className="pl-10 pr-4 w-full py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm"
                        />
                      </div>
                      {errors.password && <p className="mt-1 text-xs text-red-600 flex items-center"><span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>{errors.password.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password *</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          {...register('confirm_password')}
                          type="password"
                          placeholder="Confirm password"
                          className="pl-10 pr-4 w-full py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm"
                        />
                      </div>
                      {errors.confirm_password && <p className="mt-1 text-xs text-red-600 flex items-center"><span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>{errors.confirm_password.message}</p>}
                    </div>
                  </div>

                  {/* Phone Field */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        {...register('phone')}
                        placeholder="+1 (555) 000-0000"
                        className="pl-10 pr-4 w-full py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm"
                      />
                    </div>
                    {errors.phone && <p className="mt-1 text-xs text-red-600 flex items-center"><span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>{errors.phone.message}</p>}
                  </div>

                  {/* Address Field */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <textarea
                        {...register('address')}
                        placeholder="Enter full address"
                        rows={3}
                        className="pl-10 pr-4 w-full py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm resize-none"
                      />
                    </div>
                    {errors.address && <p className="mt-1 text-xs text-red-600 flex items-center"><span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>{errors.address.message}</p>}
                  </div>
                </div>

                {/* Vendor-specific fields */}
                {userType === 'vendor' && (
                  <div className="grid grid-cols-1 gap-5 pt-6 mt-6 border-t-2 border-gray-200">
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-emerald-800 mb-1 flex items-center">
                        <Store className="h-4 w-4 mr-2" />
                        Vendor Store Information
                      </p>
                      <p className="text-xs text-purple-600">Complete your store details to start selling</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Store Name *</label>
                    <div className="relative">
                      <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input {...register('store_name')} placeholder="Enter store name" className="pl-10 pr-4 w-full py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
                    </div>
                    {errors.store_name && <p className="mt-1 text-xs text-red-600">{errors.store_name.message}</p>}
                  </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Store Description *</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <textarea {...register('store_description')} placeholder="Describe the store" rows={3} className="pl-10 pr-4 w-full py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none" />
                    </div>
                    {errors.store_description && <p className="mt-1 text-xs text-red-600">{errors.store_description.message}</p>}
                  </div>
                </div>
              )}

              <input type="hidden" {...register('user_type')} />

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6">
                  <motion.button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:via-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="mr-2"
                        >
                          ⏳
                        </motion.span>
                        Creating...
                      </span>
                    ) : (
                      'Create User'
                    )}
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
        </motion.div>
      </div>
    </div>
  );
};

export default ManageUsers;