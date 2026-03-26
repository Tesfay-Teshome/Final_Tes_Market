import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hooks';
import { CheckCircle, XCircle, User, AlertTriangle, Package, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI, resolveMediaUrl } from '@/services/api';
import { User as UserType, Product } from '@/types';
import { RootState } from '@/store';


// Mock toast function for notifications
const toast = (options: { title: string; description?: string; variant?: string }) => {
  console.log('Toast:', options);
  // In a real app, this would show a toast notification
  return {
    dismiss: () => {}
  };
};

type ProductWithVendor = Omit<Product, 'vendor' | 'category' | 'image'> & {
  vendor?: (UserType & { display_name?: string }) | null;
  vendor_id?: string;
  vendor_email?: string;
  vendor_name?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
  } | null;
  category_name?: string | null;
  image?: string;
  status?: string;
  approval_status?: string;
  price?: number;
  display_price?: string;
  display_category?: string;
  display_vendor?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  images?: Array<{ image: string }>;
};

interface VendorProducts {
  vendor: UserType;
  products: ProductWithVendor[];
}

type ProductsByVendor = Record<string, VendorProducts>;

const ManageProducts: React.FC = () => {
  const [searchTerm] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingProductId, setRejectingProductId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'vendor'>('all');
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state: RootState) => state.auth);
  
  // Debug user role
  useEffect(() => {
    console.log('Current user:', {
      id: user?.id,
      email: user?.email,
      user_type: user?.user_type,
      is_admin: user?.is_admin,
      permissions: user?.permissions
    });
  }, [user]);

  // Fetch all vendors to get their details
  const { data: vendorsData } = useQuery({
    queryKey: ['all-vendors'],
    queryFn: async () => {
      try {
        const response = await adminAPI.getVendors({ status: 'all' });
        return response?.data?.results || [];
      } catch (error) {
        console.error('Error fetching vendors:', error);
        return [];
      }
    },
  });

  // Create a map of vendor IDs to vendor details
  const vendorsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (vendorsData) {
      const vendors = Array.isArray(vendorsData) ? vendorsData : vendorsData.results || [];
      vendors.forEach((vendor: any) => {
        if (vendor?.id) {
          map.set(String(vendor.id), vendor);
        }
      });
    }
    return map;
  }, [vendorsData]);

  // Function to get vendor details by ID
  const getVendorById = (id: string | number) => {
    return vendorsMap.get(String(id));
  };

  // Fetch products with vendor information
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['adminProducts', searchTerm, activeTab, userTypeFilter],
    queryFn: async () => {
      try {
        const params = {
          expand: 'vendor,category,images',
          search: searchTerm || undefined,
          approval_status: activeTab === 'pending' ? 'pending' : undefined,
          is_active: true
        };
        
        const response = await adminAPI.getProducts(params);
        
        if (!response?.data) {
          console.error('Invalid response format:', response);
          return [];
        }
        
        // Transform the response data to ensure consistent structure
        return response.data.map((product: any) => {
          // Process image URL
          const getImageUrl = (imgPath: string | undefined) => {
            if (!imgPath) return null;
            return resolveMediaUrl(imgPath);
          };

          const primaryFromArray = Array.isArray(product.images)
            ? (product.images.find((im: any) => im?.is_primary)?.image || product.images[0]?.image)
            : undefined;

          const imageUrl = getImageUrl(primaryFromArray || product.image) 
            || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop';
          
          // Vendor display name is now handled by the vendor details lookup
          
          // Get vendor details - first try to get from the vendors map
          const vendorDetails = typeof product.vendor === 'object' && product.vendor !== null
            ? product.vendor
            : getVendorById(product.vendor);
          
          // Get display values
          const displayVendor = vendorDetails?.full_name || product.vendor_name || `Vendor #${product.vendor}`;
          const displayCategory = (product.category?.name || product.category_name || 'Uncategorized').trim();

          // Create normalized product object
          return {
            ...product,
            // Ensure we have a vendor object with display name
            vendor: {
              ...(vendorDetails || {}),
              id: vendorDetails?.id || product.vendor,
              display_name: displayVendor,
              email: vendorDetails?.email || product.vendor_email || '',
              full_name: vendorDetails?.full_name || product.vendor_name || '',
              username: vendorDetails?.username || ''
            },
            // Ensure we have a category object with name
            category: {
              ...(product.category || {}),
              id: product.category?.id || product.category_id,
              name: displayCategory,
              slug: product.category?.slug || product.category_slug || 'uncategorized',
              is_active: product.category?.is_active ?? true
            },
            // Add display fields
            display_price: `$${Number(product.price || 0).toFixed(2)}`,
            display_category: displayCategory,
            display_vendor: displayVendor,
            // Handle image
            image: imageUrl,
            // Ensure required fields
            approval_status: product.approval_status || 'pending',
            created_at: product.created_at || new Date().toISOString(),
            updated_at: product.updated_at || new Date().toISOString()
          };
        });
      } catch (error) {
        console.error('Error fetching products:', error);
        toast({
          title: 'Error loading products',
          description: error instanceof Error ? error.message : 'Failed to fetch products',
          variant: 'destructive',
        });
        return [];
      }
    },
  });

  // Handle product approval
  const handleApproveReject = async (productId: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await adminAPI.approveProduct(productId);
        toast({
          title: 'Success',
          description: 'Product approved successfully',
          variant: 'default',
        });
        // Close any open modal
        setRejectingProductId(null);
        
        // Refresh the products list
        queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
      } else {
        // For reject, we show the modal instead of immediately rejecting
        setRejectingProductId(productId);
      }
    } catch (error: any) {
      console.error(`Error ${action}ing product:`, error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'An unknown error occurred';
      
      toast({
        title: `Failed to ${action} product`,
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // Group products by vendor
  const productsByVendor = products.reduce((acc: ProductsByVendor, product: ProductWithVendor) => {
    const vendor = product.vendor;
    const vendorId = vendor?.id || 'unknown';
    
    if (!acc[vendorId]) {
      // Create a properly typed vendor object
      const fallbackVendor: UserType = {
        id: vendorId,
        email: (vendor as UserType)?.email || product.vendor_email || 'unknown@example.com',
        username: (vendor as UserType)?.username || 'unknown',
        first_name: (vendor as UserType)?.first_name || 'Unknown',
        last_name: (vendor as UserType)?.last_name || 'Vendor',
        user_type: 'vendor',
        is_verified: (vendor as UserType)?.is_verified || false,
        is_active: (vendor as UserType)?.is_active || false,
        created_at: (vendor as UserType)?.created_at || new Date().toISOString(),
        updated_at: (vendor as UserType)?.updated_at || new Date().toISOString(),
        full_name: (vendor as UserType)?.full_name || product.vendor_name || 'Unknown Vendor'
      };
      
      acc[vendorId] = {
        vendor: vendor || fallbackVendor,
        products: []
      };
    }
    
    // Only add the product if it's not already in the array
    if (!acc[vendorId].products.some(p => p.id === product.id)) {
      acc[vendorId].products.push(product);
    }
    return acc;
  }, {} as ProductsByVendor);

  // Calculate pending products count
  const pendingProductsCount = products.filter((p: ProductWithVendor) => p.approval_status === 'pending').length;

  const approveProductMutation = useMutation({
    mutationFn: (productId: string) => adminAPI.approveProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
      toast({ title: 'Product approved', variant: 'success' });
    },
    onError: (error: any) => {
      console.error('Error approving product:', error);
      toast({ 
        title: 'Error approving product', 
        description: error.message || 'Please try again',
        variant: 'destructive' 
      });
    },
  });

  const rejectProductMutation = useMutation({
    mutationFn: ({ productId, reason }: { productId: string; reason: string }) => 
      adminAPI.rejectProduct(productId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
      setRejectingProductId(null);
      setRejectReason('');
      toast({ title: 'Product rejected', variant: 'success' });
    },
    onError: (error: any) => {
      console.error('Error rejecting product:', error);
      toast({ 
        title: 'Error rejecting product', 
        description: error.message || 'Please try again',
        variant: 'destructive' 
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      // Check if user is authenticated and is admin
      if (!user) {
        throw new Error('You must be logged in to delete products');
      }
      
      if (user.user_type !== 'administrator') {
        throw new Error('Only administrators can delete products');
      }
      
      try {
        const response = await adminAPI.deleteProduct(productId);
        return response;
      } catch (error: any) {
        console.error('API Error in deleteProduct:', {
          error,
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
        });
        
        let errorMessage = 'Failed to delete product';
        if (error.response?.status === 403) {
          errorMessage = 'You do not have permission to delete this product';
        } else if (error.response?.data?.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response?.data) {
          errorMessage = JSON.stringify(error.response.data);
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
      toast({ 
        title: 'Success', 
        description: 'Product deleted successfully',
        variant: 'success' 
      });
    },
    onError: (error: any) => {
      console.error('Error in deleteProductMutation:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to delete product',
        variant: 'destructive' 
      });
    },
  });

  const handleApproveProduct = (productId: string) => {
    approveProductMutation.mutate(productId);
  };

  const openRejectModal = (productId: string) => {
    setRejectingProductId(productId);
  };

  const handleRejectProduct = () => {
    if (rejectReason.trim() && rejectingProductId) {
      rejectProductMutation.mutate({
        productId: rejectingProductId,
        reason: rejectReason,
      });
    }
  };

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      deleteProductMutation.mutate(productId);
    }
  };

  // Debug: Log product statuses
  // Filter products based on search term, tab, and approval status
  const filteredProducts = useMemo(() => 
    products.filter((product: ProductWithVendor) => {
      // First filter by active tab
      const status = product.approval_status?.toLowerCase() || '';
      
      if (activeTab === 'pending' && status !== 'pending') {
        return false;
      } else if (activeTab === 'approved' && status !== 'approved') {
        return false;
      } else if (activeTab === 'rejected' && status !== 'rejected') {
        return false;
      }

      // Then filter by search term
      const matchesSearch = !searchTerm || 
        (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filter by user type
      const matchesType = userTypeFilter === 'all' || 
        (userTypeFilter === 'vendor' && product.vendor_id);
      
      return matchesSearch && matchesType;
    }),
    [products, activeTab, searchTerm, userTypeFilter]
  );

  // Debug: Log product statuses and filtering
  useEffect(() => {
    if (products && products.length > 0) {
      console.log('=== PRODUCTS DEBUG INFO ===');
      console.log('Active Tab:', activeTab);
      console.log('Total products:', products.length);
      
      // Log detailed info for each product
      products.forEach((p: ProductWithVendor, index: number) => {
        const status = p.approval_status?.toLowerCase() || '';
        console.log(`\nProduct #${index + 1}:`);
        console.log('ID:', p.id);
        console.log('Name:', p.name);
        console.log('Approval Status:', status);
        console.log('Is Pending:', status === 'pending');
        console.log('Is Approved:', status === 'approved');
        console.log('Is Rejected:', status === 'rejected');
      });

      // Log filtered products
      console.log('\n=== FILTERED PRODUCTS ===');
      console.log('Count:', filteredProducts.length);
      filteredProducts.forEach((p: ProductWithVendor, index: number) => {
        console.log(`\nFiltered Product #${index + 1}:`);
        console.log('ID:', p.id);
        console.log('Name:', p.name);
        console.log('Status:', p.approval_status);
      });
    }
  }, [products, activeTab, filteredProducts]);
  
  return (
    <div className="flex-1 space-y-4 relative min-h-screen bg-gradient-to-br from-[#0B0F14] via-[#0D1219] to-[#0F141B] text-[#E6EDF3] pt-1 sm:pt-4 pb-16 sm:pb-20">
      {/* Subtle animated background elements */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-16 right-10 w-[520px] h-[520px] bg-[rgba(60,179,113,0.16)] rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-16 left-12 w-[520px] h-[520px] bg-[rgba(255,215,0,0.10)] rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 px-4 md:px-8 w-full max-w-full pb-16 sm:pb-20">
        <motion.div 
          className="space-y-6 pb-16 sm:pb-20"
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
                Product Management
              </h1>
              <p className="text-xl text-gray-300 mt-2 font-medium leading-relaxed">Review, approve and manage products from vendors across the platform</p>
            </div>

            {/* Stats Cards */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-wrap gap-3"
            >
              <div 
                className="relative overflow-hidden rounded-2xl border border-gray-700/50 bg-gradient-to-br from-emerald-600/95 to-emerald-700/95 shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 cursor-pointer transform hover:scale-105"
                onClick={() => setActiveTab('all')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 to-green-400/10 rounded-2xl"></div>
                <div className="relative z-10 flex items-center space-x-3 px-4 py-3">
                  <Package className="h-5 w-5 text-emerald-200" />
                  <div>
                    <div className="text-xs text-emerald-100 font-medium">Total Products</div>
                    <div className="font-bold text-lg text-white">{products.length}</div>
                  </div>
                </div>
              </div>
              <div 
                className="relative overflow-hidden rounded-2xl border border-gray-700/50 bg-gradient-to-br from-orange-600/95 to-red-600/95 shadow-lg hover:shadow-orange-500/25 transition-all duration-300 cursor-pointer transform hover:scale-105"
                onClick={() => setActiveTab('pending')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 to-red-400/10 rounded-2xl"></div>
                <div className="relative z-10 flex items-center space-x-3 px-4 py-3">
                  <AlertTriangle className="h-5 w-5 text-orange-200" />
                  <div>
                    <div className="text-xs text-orange-100 font-medium">Pending Review</div>
                    <div className="font-bold text-lg text-white">{pendingProductsCount}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
          
          {/* Enhanced Tab Navigation */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
          >
            <div className="flex bg-gradient-to-r from-gray-800/50 via-gray-700/50 to-gray-800/50 rounded-2xl shadow-2xl p-2 border-2 border-gray-700/50">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-6 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  activeTab === 'pending' 
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg transform scale-105' 
                    : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Pending</span>
                  {pendingProductsCount > 0 && (
                    <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                      {pendingProductsCount}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-6 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  activeTab === 'all' 
                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg transform scale-105' 
                    : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4" />
                  <span>All Products</span>
                </div>
              </button>
            </div>

            {activeTab === 'all' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex items-center space-x-1 bg-gradient-to-r from-gray-800/50 via-gray-700/50 to-gray-800/50 rounded-xl shadow-xl p-1 border-2 border-gray-700/50"
              >
                <button
                  onClick={() => setUserTypeFilter('all')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    userTypeFilter === 'all' 
                      ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-white shadow-lg' 
                      : 'text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setUserTypeFilter('vendor')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    userTypeFilter === 'vendor' 
                      ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-white shadow-lg' 
                      : 'text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Vendors
                </button>
              </motion.div>
            )}
          </motion.div>

        {activeTab === 'pending' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 rounded-2xl shadow-xl border border-gray-700/50 p-8 pb-16 mb-16"
          >
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-gradient-to-br from-orange-600 to-red-600 p-3 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-orange-200" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-100 to-gray-200 bg-clip-text text-transparent">
                    Pending Product Approvals
                  </h2>
                  {pendingProductsCount > 0 && (
                    <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-gradient-to-r from-orange-600/90 to-red-600/90 text-orange-100 rounded-full border border-orange-500/50">
                      {pendingProductsCount} awaiting review
                    </span>
                  )}
                </div>
              </div>
              <p className="text-gray-300 text-lg">
                {pendingProductsCount === 0 
                  ? '🎉 All products have been reviewed! Great job keeping up with approvals.'
                  : 'Review and approve or reject products submitted by vendors'}
              </p>
            </div>
            
            {filteredProducts.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center py-16 bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-2xl border-2 border-dashed border-gray-600/50"
              >
                <div className="bg-gradient-to-r from-emerald-600 to-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-emerald-200" />
                </div>
                <h3 className="text-xl font-bold text-gray-100 mb-2">All Caught Up!</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  No pending product approvals at the moment. All products have been reviewed and processed.
                </p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 pb-8 justify-items-center">
                {filteredProducts.map((product: ProductWithVendor) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full max-w-[300px] group bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 border border-gray-700/50 hover:border-emerald-500/50 rounded-xl shadow-lg hover:shadow-2xl hover:shadow-emerald-500/25 p-3 flex flex-col h-full transition-all duration-500 hover:scale-[1.01] hover:-translate-y-1"
                  >
                    <div className="flex-grow">
                      <div className="mb-3 h-40 overflow-hidden rounded-lg bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 shadow-md border border-gray-600/50 group-hover:shadow-2xl transition-all duration-300">
                        {product.image ? (
                          <img
                            src={resolveMediaUrl(product.image) || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop'}
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              const el = e.target as HTMLImageElement;
                              const fallback = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop';
                              if (el.src !== fallback) el.src = fallback;
                            }}
                          />
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <div className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 p-3 rounded-xl shadow-lg">
                              <Package className="h-10 w-10 text-emerald-200" />
                            </div>
                          </div>
                        )}
                      </div>
                      <h4 className="font-bold text-sm sm:text-base bg-gradient-to-r from-gray-100 via-emerald-200 to-green-200 bg-clip-text text-transparent mb-2 leading-tight">
                        {product.name}
                      </h4>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 bg-gradient-to-r from-gray-700/80 via-gray-600/80 to-gray-700/80 text-gray-200 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl shadow-lg border border-gray-600/50">
                          <div className="w-3 h-3 bg-emerald-500/20 rounded-full flex items-center justify-center">
                            <User className="h-2 w-2 text-emerald-400" />
                          </div>
                          <span className="text-[11px] sm:text-xs font-semibold truncate">
                            {product.vendor ? (
                              product.vendor.full_name || product.vendor_name || product.vendor_email || `Vendor #${product.vendor.id || ''}`
                            ) : product.vendor_id ? (
                              `Vendor ID: ${product.vendor_id}`
                            ) : (
                              "No vendor assigned"
                            )}
                          </span>
                        </div>
                        <div className="bg-gradient-to-r from-emerald-700/90 via-green-700/90 to-teal-700/90 text-emerald-100 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl shadow-lg border border-emerald-600/50">
                          <span className="text-[11px] sm:text-xs font-semibold">
                            📦 {product.category_name || "Uncategorized"}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-gray-700/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="bg-gradient-to-r from-yellow-600/90 via-orange-600/90 to-red-600/90 text-yellow-100 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-lg border border-yellow-500/50">
                          <span className="text-xs font-bold">
                            ${Number(product.price || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-lg text-xs font-bold ${
                          product.status === 'approved' 
                            ? 'bg-gradient-to-r from-emerald-600/90 to-green-600/90 text-emerald-100 border border-emerald-500/50'
                            : product.status === 'rejected'
                            ? 'bg-gradient-to-r from-red-600/90 to-pink-600/90 text-red-100 border border-red-500/50'
                            : 'bg-gradient-to-r from-orange-600/90 to-yellow-600/90 text-orange-100 border border-orange-500/50'
                        }`}>
                          {product.status === 'approved' ? '✅ Approved' : product.status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => window.open(`/products/${product.id}`, '_blank')}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          View
                        </motion.button>
                        {product.status === 'pending' && (
                          <>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleApproveProduct(product.id)}
                              className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                            >
                              Approve
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setRejectingProductId(product.id);
                                setRejectReason('');
                              }}
                              className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                            >
                              Reject
                            </motion.button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'all' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 rounded-2xl shadow-xl border border-gray-700/50 p-2 sm:p-8"
          >
            <div className="mb-4 sm:mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-gradient-to-br from-emerald-600 to-green-700 p-3 rounded-xl">
                  <Package className="h-6 w-6 text-emerald-200" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-100 to-gray-200 bg-clip-text text-transparent">
                    All Products
                  </h2>
                  <p className="text-gray-300 text-sm sm:text-base">Browse all products organized by vendor</p>
                </div>
              </div>
            </div>
            
            {Object.keys(productsByVendor).length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center py-10 sm:py-16 bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-2xl border-2 border-dashed border-gray-600/50"
              >
                <div className="bg-gradient-to-r from-gray-600 to-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-100 mb-2">No Products Found</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  {searchTerm ? 'Try adjusting your search criteria or filters' : 'No products have been added to the system yet'}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-6 sm:space-y-8">
                {(Object.entries(productsByVendor) as [string, VendorProducts][]).map(([vendorId, { vendor, products }]) => (
                  <div key={vendorId} className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center">
                        <User className="h-5 w-5 text-emerald-200" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-100">
                          {vendor.full_name || vendor.email || `Vendor #${vendor.id}`}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {products.length} product{products.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 justify-items-center">
                      {products.map((product) => (
                        <motion.div 
                          key={product.id} 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="w-full max-w-[300px] group bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 border border-gray-700/50 hover:border-emerald-500/50 rounded-xl shadow-lg hover:shadow-2xl hover:shadow-emerald-500/25 p-3 flex flex-col h-full transition-all duration-500 hover:scale-[1.01] hover:-translate-y-1"
                        >
                          <div className="flex-grow">
                            <div className="mb-3 h-40 overflow-hidden rounded-lg bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 shadow-md border border-gray-600/50 group-hover:shadow-2xl transition-all duration-300">
                              {product.image ? (
                                <img
                                  src={resolveMediaUrl(product.image) || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop'}
                                  alt={product.name}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  onError={(e) => {
                                    const el = e.target as HTMLImageElement;
                                    const fallback = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop';
                                    if (el.src !== fallback) el.src = fallback;
                                  }}
                                />
                              ) : (
                                <div className="h-full flex items-center justify-center">
                                  <div className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 p-3 rounded-xl shadow-lg">
                                    <Package className="h-10 w-10 text-emerald-200" />
                                  </div>
                                </div>
                              )}
                            </div>
                            <h4 className="font-bold text-sm sm:text-base bg-gradient-to-r from-gray-100 via-emerald-200 to-green-200 bg-clip-text text-transparent mb-2 leading-tight">
                              {product.name}
                            </h4>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 bg-gradient-to-r from-gray-700/80 via-gray-600/80 to-gray-700/80 text-gray-200 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl shadow-lg border border-gray-600/50">
                                <div className="w-3 h-3 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                  <User className="h-2 w-2 text-emerald-400" />
                                </div>
                                <span className="text-[11px] sm:text-xs font-semibold truncate">
                                  {product.vendor ? (
                                    product.vendor.full_name || product.vendor_name || product.vendor_email || `Vendor #${product.vendor.id || ''}`
                                  ) : product.vendor_id ? (
                                    `Vendor ID: ${product.vendor_id}`
                                  ) : (
                                    "No vendor assigned"
                                  )}
                                </span>
                              </div>
                              <div className="bg-gradient-to-r from-emerald-700/90 via-green-700/90 to-teal-700/90 text-emerald-100 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl shadow-lg border border-emerald-600/50">
                                <span className="text-[11px] sm:text-xs font-semibold">
                                  📦 {product.category_name || "Uncategorized"}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-2 pt-2 border-t border-gradient-to-r from-blue-200/50 to-purple-200/50">
                            <div className="flex items-center justify-between mb-3">
                              <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-lg">
                                <span className="font-bold text-xs sm:text-sm">${Number(product.price || 0).toFixed(2)}</span>
                              </div>
                              <span className={`text-[10px] px-2.5 py-1 rounded-xl font-semibold shadow-lg ${
                                product.approval_status === 'approved'
                                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white'
                                : product.approval_status === 'pending'
                                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                                : 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
                            }`}>
                              {product.approval_status === 'approved' ? '✅ Approved' : 
                               product.approval_status === 'pending' ? '⏳ Pending' : 
                               '❌ Rejected'}
                            </span>
                            </div>
                            {product.approval_status === 'pending' && (
                              <div className="flex space-x-2">
                                <motion.button
                                  whileHover={{ scale: 1.02, y: -1 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleApproveReject(product.id, 'approve')}
                                  className="flex-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 text-white px-3 py-2 rounded-xl text-sm font-semibold shadow-2xl hover:shadow-green-500/30 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                                  title="Approve"
                                  disabled={isLoadingProducts}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Approve
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.02, y: -1 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleApproveReject(product.id, 'reject')}
                                  className="flex-1 bg-gradient-to-r from-red-500 via-rose-500 to-pink-600 text-white px-3 py-2 rounded-xl text-sm font-semibold shadow-2xl hover:shadow-red-500/30 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                                  title="Reject"
                                  disabled={isLoadingProducts}
                                >
                                  <XCircle className="w-4 h-4" />
                                  Reject
                                </motion.button>
                              </div>
                            )}
                            {product.approval_status !== 'pending' && (
                              <motion.button
                                whileHover={{ scale: 1.02, y: -1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleDeleteProduct(product.id)}
                                className="w-full bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 text-white px-3 py-2 rounded-xl text-sm font-semibold shadow-2xl hover:shadow-gray-500/30 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                                title="Delete"
                                disabled={isLoadingProducts}
                              >
                                <XCircle className="w-4 h-4" />
                                🗑️ Delete
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
        </motion.div>
      </div>
    </div>
  );
};

export default ManageProducts;