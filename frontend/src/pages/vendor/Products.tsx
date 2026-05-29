import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorAPI, resolveMediaUrl } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Search, Plus, Pencil, Trash2, Loader2, Package, LayoutGrid, AlertCircle, RefreshCw, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Product } from '@/types';

interface ApiResponse<T> {
  data?: T;
  results?: T;
  // Add other possible response properties here if needed
}

const Products = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['vendor-products', searchTerm],
    queryFn: async () => {
      try {
        console.log('Fetching products with search term:', searchTerm);
        const response = await vendorAPI.getProducts({ search: searchTerm });
        console.log('Raw API response:', response);
        return response;
      } catch (error) {
        console.error('Error fetching products:', error);
        toast({
          title: 'Error',
          description: 'Failed to load products',
          variant: 'destructive',
        });
        throw error;
      }
    },
  });

  // Extract products from the response
  const products = useMemo(() => {
    if (!response) return [];

    // Handle different response formats
    const responseData = response.data;

    if (Array.isArray(responseData)) {
      return responseData; // Direct array response
    } else if (responseData?.results && Array.isArray(responseData.results)) {
      return responseData.results; // Paginated response
    } else if (responseData?.data && Array.isArray(responseData.data)) {
      return responseData.data; // Nested data array
    }

    console.warn('Unexpected response format, returning empty array. Response:', response);
    return [];
  }, [response]);

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => vendorAPI.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      toast({
        title: 'Success',
        description: 'Product deleted successfully',
        variant: 'default',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to delete product',
        variant: 'destructive',
      });
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/vendor/products/edit/${id}`);
  };

  // Function to get image URL with debug logging
  const getImageUrl = (imagePath: string | null | undefined) => resolveMediaUrl(imagePath) || null;

  // Local fallback image
  const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMzAwIDIwMCI+PHN0eWxlPnRleHQge2ZvbnQtZmFtaWx5OnNhbnMtc2VyaWY7Zm9udC1zaXplOjI0cHg7ZG9taW5hbnQtYmFzZWxpbmU6bWlkZGxlO3RleHQtYW5jaG9yOm1pZGRsZTtmaWxsOiM5OTk7fTwvc3R5bGU+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNlZWVlZWUiLz48dGV4dCB4PSIxNTAiIHk9IjEwMCI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070B0F] flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-[60px] rounded-full animate-pulse" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="relative h-16 w-16 rounded-2xl border-2 border-t-emerald-500 border-r-transparent border-b-emerald-900 border-l-transparent"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative min-h-screen text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 pb-4 sm:pb-6 bg-[#070B0F]">
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/20 flex items-center justify-center shadow-inner">
                <LayoutGrid className="h-5 w-5 text-[#3CFF9E]" />
              </div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-green-500">
                Products
              </h1>
            </div>
            <p className="text-gray-400 mt-1 font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9D]" />
              You have {products.length} products in your store
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <div className="relative w-full sm:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#586069] group-focus-within:text-emerald-400 transition-colors" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs font-bold text-white placeholder-[#586069] focus:outline-none focus:border-emerald-500/50 transition-all uppercase tracking-widest"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.02, translateY: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/vendor/products/new')}
              className="w-full sm:w-auto flex items-center justify-center px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-[13px] font-black uppercase tracking-widest transition-all duration-300 shadow-xl shadow-emerald-900/40 border border-emerald-400/20 flex items-center gap-2.5"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </motion.button>
          </motion.div>
        </div>

        {/* Product Catalog Grid */}
        <AnimatePresence mode="wait">
          {isError ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-24 text-center glassmorphic-card"
            >
              <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
                <AlertCircle className="h-8 w-8 text-rose-500" />
              </div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-white mb-2">Error Loading Products</h3>
              <p className="text-[#8B949E] text-sm font-medium mb-8 italic">We encountered an error while fetching your product list.</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Retry Connection
              </button>
            </motion.div>
          ) : products.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-24 text-center glassmorphic-card"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/10 flex items-center justify-center mx-auto mb-6 rounded-2xl shadow-inner">
                <Package className="h-10 w-10 text-[#3CFF9E]" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-[0.2em] text-white mb-2">Warehouse Empty</h3>
              <p className="text-[#8B949E] text-sm font-medium italic mb-8">
                {searchTerm ? `Protocol returned zero results for "${searchTerm}"` : 'No assets identified in your storage protocols.'}
              </p>
              <motion.button
                whileHover={{ scale: 1.02, translateY: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/vendor/products/new')}
                className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-emerald-900/40 border border-emerald-400/20 transition-all"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Initial Asset
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 pb-8 justify-items-center"
            >
              {products.map((product: Product, idx: number) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
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
                      <div className="bg-gradient-to-r from-emerald-700/90 via-green-700/90 to-teal-700/90 text-emerald-100 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl shadow-lg border border-emerald-600/50">
                        <span className="text-[11px] sm:text-xs font-semibold">
                          📦 {(product as any).category_name || (product as any).category?.name || "Uncategorized"}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 pt-2 border-t border-gray-700/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="bg-gradient-to-r from-yellow-600/90 via-orange-600/90 to-red-600/90 text-yellow-100 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-lg border border-yellow-500/50">
                        <span className="text-xs font-bold">
                          ${(Number(product.price) || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-lg text-xs font-bold ${
                        product.approval_status === 'approved' 
                          ? 'bg-gradient-to-r from-emerald-600/90 to-green-600/90 text-emerald-100 border border-emerald-500/50'
                          : product.approval_status === 'rejected'
                          ? 'bg-gradient-to-r from-red-600/90 to-pink-600/90 text-red-100 border border-red-500/50'
                          : 'bg-gradient-to-r from-orange-600/90 to-yellow-600/90 text-orange-100 border border-orange-500/50'
                      }`}>
                        {product.approval_status === 'approved' ? '✅ Active' : product.approval_status === 'rejected' ? '❌ Declined' : '⏳ Pending'}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleEdit(product.id.toString())}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        Edit
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(product.id.toString())}
                        className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Products;