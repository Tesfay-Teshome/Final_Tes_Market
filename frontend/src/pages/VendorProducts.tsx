import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Search, ShoppingCart, Heart, Star, Store, Package, ArrowLeft } from 'lucide-react';
import { productsAPI, cartAPI, resolveMediaUrl } from '@/services/api';
import type { Product, CartItem } from '@/types';
import { useDispatch, useSelector } from 'react-redux';
import { addItem } from '@/store/slices/cartSlice';
import { useToast } from '@/components/ui/use-toast';
import { RootState } from '@/store';
import api from '@/lib/axios';
import { motion } from 'framer-motion';
const VendorProducts = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('');
  // Add to cart mutation (same as ProductDetails)
  const addToCartMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartAPI.addItem(productId, quantity),
    onSuccess: (response) => {
      // Server returns the full cart; keep Redux in sync with backend response
      if (response?.data) {
        // Lazily import to avoid circular deps during SSR
        import('@/store/slices/cartSlice').then(({ setCart }) => {
          dispatch(setCart(response.data));
        });
      }
      toast({
        title: 'Added to cart',
        description: 'Product has been added to your cart',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to add to cart.',
        variant: 'destructive',
      });
    },
  });
  // Fetch vendor details
  const { data: vendorData } = useQuery({
    queryKey: ['vendor', vendorId],
    queryFn: async () => {
      const response = await api.get(`/users/${vendorId}/`);
      return response.data;
    },
    enabled: !!vendorId,
  });
  // Fetch vendor's products
  const { data: productsData, isLoading } = useQuery<Product[]>({
    queryKey: ['vendor-products', vendorId, searchTerm, sortBy],
    queryFn: async () => {
      const params: Record<string, any> = { vendor: vendorId };
      if (searchTerm) params.search = searchTerm;
      if (sortBy) params.ordering = sortBy;
      const response = await productsAPI.getAll(params);
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!vendorId,
  });
  const handleAddToCart = (product: Product) => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication required',
        description: 'Please login to add items to your cart.',
        variant: 'destructive',
      });
      return;
    }
    if (user?.user_type !== 'buyer') {
      toast({
        title: 'Access Denied',
        description: 'Only buyers can add items to cart.',
        variant: 'destructive',
      });
      return;
    }
    addToCartMutation.mutate({ productId: product.id, quantity: 1 });
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading vendor products...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50">
      {/* Vendor Header */}
      <section className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 text-white">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center mb-6">
            <Link
              to="/vendors"
              className="flex items-center text-emerald-200 hover:text-white transition-colors mr-6"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Vendors
            </Link>
          </div>
          <div className="flex items-center">
            {resolveMediaUrl(vendorData?.profile_image) ? (
              <img
                src={resolveMediaUrl(vendorData?.profile_image)!}
                alt={vendorData?.store_name || vendorData?.username}
                className="h-24 w-24 rounded-full object-cover border-4 border-white/30 mr-6"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/30 mr-6">
                <Store className="h-12 w-12 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-3xl md:text-5xl font-bold mb-2">
                {vendorData?.store_name || vendorData?.username || 'Vendor Store'}
              </h1>
              <p className="text-xl text-emerald-100 mb-4">
                {vendorData?.store_description || 'Quality products from a trusted vendor'}
              </p>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-1 text-yellow-300 fill-current" />
                  <span>4.9 (1,234 reviews)</span>
                </div>
                <div className="flex items-center">
                  <Package className="h-4 w-4 mr-1" />
                  <span>{productsData?.length || 0} Products</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Search and Filter */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Sort by</option>
                <option value="name">Name A-Z</option>
                <option value="-name">Name Z-A</option>
                <option value="price">Price Low-High</option>
                <option value="-price">Price High-Low</option>
                <option value="-created_at">Newest First</option>
              </select>
            </div>
          </div>
        </div>
      </section>
      {/* Products Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {productsData && productsData.length > 0 ? (
            <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, staggerChildren: 0.1 }}>
              {productsData.map((product: Product, index: number) => {
                const productImage = resolveMediaUrl(product.image);
                return (
                  <motion.div key={product.id}
                    className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden border border-gray-100"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                    whileHover={{ scale: 1.02 }}>
                  <div className="relative overflow-hidden">
                    <img
                      src={productImage || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&h=300&q=80'}
                      alt={product.name}
                      className="w-full h-48 object-contain bg-white p-2 transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-sm rounded-full p-2">
                      <Heart className="h-5 w-5 text-white hover:text-red-400 cursor-pointer transition-colors" />
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold text-emerald-600">${product.price}</span>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="ml-1 text-sm text-gray-600">4.8</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Link
                        to={`/products/${product.slug}`}
                        className="block w-full text-center bg-gradient-to-r from-emerald-600 to-green-600 text-white py-2 rounded-lg hover:from-emerald-700 hover:to-green-700 transition-all duration-300 font-semibold"
                      >
                        View Details
                      </Link>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="w-full bg-emerald-100 text-emerald-700 py-2 rounded-lg hover:bg-emerald-200 transition-colors duration-200 flex items-center justify-center"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
              })}
            </motion.div>
          ) : (
            <div className="text-center py-16">
              <Package className="h-24 w-24 text-gray-300 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No Products Found</h3>
              <p className="text-gray-600 mb-8">
                This vendor hasn't added any products yet or no products match your search.
              </p>
              <Link
                to="/vendors"
                className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors inline-flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Browse Other Vendors
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
export default VendorProducts;