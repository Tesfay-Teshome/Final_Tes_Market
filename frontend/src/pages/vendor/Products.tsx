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
    <div className="flex-1 relative min-h-screen text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 pb-12 bg-[#070B0F]">
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
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
              <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-white mb-2">Error Loading Products</h3>
              <p className="text-[#8B949E] text-sm font-medium mb-8 italic">We encountered an error while fetching your product list.</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-8 py-3.5 bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-emerald-400 transition-colors"
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
              <div className="w-20 h-20 bg-emerald-500/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/10">
                <Package className="h-10 w-10 text-[#586069]" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-[0.2em] text-white mb-2">Warehouse Empty</h3>
              <p className="text-[#8B949E] text-sm font-medium italic mb-8">
                {searchTerm ? `Protocol returned zero results for "${searchTerm}"` : 'No assets identified in your storage protocols.'}
              </p>
              <motion.button
                whileHover={{ scale: 1.05, translateY: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/vendor/products/new')}
                className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-emerald-900/40 border border-emerald-400/20 transition-all"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Initial Asset
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {products.map((product: Product, idx: number) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0F1720] transition-all duration-300 shadow-lg hover:border-[#00FF9D]/40 hover:-translate-y-1"
                >
                  <div className="relative pt-[80%] overflow-hidden bg-white/[0.02]">
                    <img
                      src={resolveMediaUrl(product.image) || fallbackImage}
                      alt={product.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F1720] via-transparent to-transparent opacity-60" />

                    {/* Status Badge */}
                    <div className="absolute top-4 right-4 z-10">
                      <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border backdrop-blur-md shadow-lg transition-all duration-300 ${product.approval_status === 'approved'
                        ? 'bg-emerald-500/20 text-[#3CFF9E] border-emerald-500/30'
                        : product.approval_status === 'rejected'
                          ? 'bg-red-500/20 text-red-500 border-red-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                        }`}>
                        {product.approval_status === 'approved' ? 'Active' :
                          product.approval_status === 'rejected' ? 'Declined' : 'Pending'}
                      </span>
                    </div>

                    <div className="absolute bottom-4 left-4 z-10">
                      <div className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
                        <p className="text-[14px] font-bold text-white">${(Number(product.price) || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="min-h-[60px]">
                      <h3 className="text-lg font-bold text-white group-hover:text-[#00FF9D] transition-colors line-clamp-2 leading-tight">
                        {product.name}
                      </h3>
                    </div>

                    <p className="text-[#8B949E] text-xs font-medium line-clamp-3 leading-relaxed min-h-[48px]">
                      {product.description || 'No descriptive technical specifications provided for this asset.'}
                    </p>

                    {product.approval_status === 'rejected' && product.approval_note && (
                      <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                        <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Feedback Report</p>
                        <p className="text-[11px] font-medium text-red-200 line-clamp-2 italic">"{product.approval_note}"</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleEdit(product.id.toString())}
                        className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] text-white text-xs font-bold transition-all"
                      >
                        <Pencil className="h-3 w-3 text-[#8B949E]" />
                        Configure
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(product.id.toString())}
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
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