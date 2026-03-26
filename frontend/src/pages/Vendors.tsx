import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Store, Star, Package, ShoppingBag, Check, MapPin, Clock, Award, Verified, Users, TrendingUp, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/axios';
import { resolveMediaUrl, storefrontAPI } from '@/services/api';
import { User } from '@/types';
import bannerImage from './images/banner.jpeg';

const Vendors = () => {
  const [storeSlugByVendor, setStoreSlugByVendor] = useState<Record<number, string>>({});

  const { data: vendorsData, error: vendorsError, isLoading } = useQuery<User[]>({
    queryKey: ['public-vendors'],
    queryFn: async () => {
      try {
        // Fetch vendors from the correct endpoint
        const response = await api.get('/api/users/', {
          params: {
            user_type: 'vendor',
            is_active: true,
          },
        });

        // Extract vendors array from response
        const vendors = Array.isArray(response.data)
          ? response.data
          : (response.data?.results || response.data?.data || []);

        return vendors;
        
      } catch (error: any) {
        console.error('❌ VENDORS FETCH ERROR:', error);
        console.error('📛 Error Status:', error.response?.status);
        console.error('📛 Error Message:', error.response?.statusText);
        console.error('📛 Error Data:', error.response?.data);
        console.error('📛 Full Error:', error);
        return [];
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  if (vendorsError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <div className="text-lg text-gray-600">An error occurred while fetching vendors.</div>
        </div>
      </div>
    );
  }

  // Helper to fetch store slug for a vendor (lazy, only when Visit Store is clicked)
  const getStoreSlug = async (vendorId: number) => {
    if (storeSlugByVendor[vendorId]) return storeSlugByVendor[vendorId];
    try {
      const res = await storefrontAPI.getPublicStoreByVendor(vendorId);
      const slug = res.data.slug;
      setStoreSlugByVendor(prev => ({ ...prev, [vendorId]: slug }));
      return slug;
    } catch {
      return null;
    }
  };

  const handleVisitStore = async (e: React.MouseEvent, vendorId: number) => {
    e.preventDefault();
    const slug = await getStoreSlug(vendorId);
    if (slug) {
      window.location.href = `/store/${slug}`;
    } else {
      // Fallback: no published storefront
      window.location.href = `/vendor/${vendorId}/products`;
    }
  };

  const vendors = vendorsData;

  if (!vendors) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading our amazing vendors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50">
      {/* Banner Section */}
      <section className="bg-gradient-to-br from-emerald-50 via-green-100 to-emerald-100 relative min-h-[400px] flex items-center justify-center overflow-hidden">
        {/* Enhanced Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-green-600/15 to-emerald-600/10"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-emerald-400/5 via-transparent to-green-400/5"></div>
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-80 h-80 bg-gradient-to-r from-emerald-400/20 to-green-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-emerald-400/15 to-green-400/15 rounded-full blur-2xl"></div>
        </div>
        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-1/4 w-4 h-4 bg-emerald-400/30 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
          <div className="absolute bottom-32 left-1/4 w-3 h-3 bg-green-400/30 rounded-full animate-bounce" style={{animationDelay: '1.5s'}}></div>
          <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-emerald-400/30 rounded-full animate-bounce" style={{animationDelay: '2s'}}></div>
        </div>
        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
          <motion.h1 
            className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-900 via-emerald-700 to-green-600 bg-clip-text text-transparent mb-6 leading-normal pb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Meet Our Trusted Vendors
          </motion.h1>
          <motion.p 
            className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Discover amazing products from verified sellers who are passionate about quality and service
          </motion.p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-br from-white via-gray-50 to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, staggerChildren: 0.2 }}
            viewport={{ once: true }}
          >
            <motion.div 
              className="text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
              whileHover={{ scale: 1.05 }}
            >
              <motion.div 
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full mb-6 shadow-lg"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <Users className="h-10 w-10 text-white" />
              </motion.div>
              <h3 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-3">{vendors.length}+</h3>
              <p className="text-gray-600 text-lg font-medium">Verified Vendors</p>
            </motion.div>
            <motion.div 
              className="text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
              whileHover={{ scale: 1.05 }}
            >
              <motion.div 
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-6 shadow-lg"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <Package className="h-10 w-10 text-white" />
              </motion.div>
              <h3 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3">50K+</h3>
              <p className="text-gray-600 text-lg font-medium">Quality Products</p>
            </motion.div>
            <motion.div 
              className="text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
              whileHover={{ scale: 1.05 }}
            >
              <motion.div 
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full mb-6 shadow-lg"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <TrendingUp className="h-10 w-10 text-white" />
              </motion.div>
              <h3 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">99.8%</h3>
              <p className="text-gray-600 text-lg font-medium">Satisfaction Rate</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Vendors Grid */}
      <section className="py-8 bg-gradient-to-br from-gray-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 bg-clip-text text-transparent mb-2 leading-normal pb-1">
              Our Vendors
            </h2>
            <p className="text-base text-gray-600 max-w-2xl mx-auto">
              Sorted by product count (most products first), then by highest ratings
            </p>
          </motion.div>
          
          {vendors && vendors.length > 0 ? (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, staggerChildren: 0.1 }}
            viewport={{ once: true }}
          >
            {vendors.map((vendor: any, index: number) => (
              <motion.div 
                key={vendor.id} 
                className="group bg-white rounded-xl shadow hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-gray-100 hover:border-emerald-200"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ scale: 1.01 }}
                viewport={{ once: true }}
              >
                {/* Vendor Header */}
                <div className="relative bg-gradient-to-br from-emerald-600 via-green-600 to-emerald-700 p-4 text-white">
                  <motion.div 
                    className="absolute top-3 right-3"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-[9px] font-bold shadow-md">
                      <Verified className="h-3 w-3 mr-1.5 text-green-300" />
                      Verified
                    </div>
                  </motion.div>
                  
                  <div className="flex items-center">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.3 }}
                    >
                      {resolveMediaUrl(vendor.profile_image) ? (
                        <img
                          src={resolveMediaUrl(vendor.profile_image)!}
                          alt={vendor.full_name || vendor.username}
                          className="h-12 w-12 rounded-full object-cover border-2 border-white/40 shadow"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/40 shadow">
                          <Store className="h-6 w-6 text-white" />
                        </div>
                      )}
                    </motion.div>
                    <div className="ml-4">
                      <h3 className="text-lg font-bold text-white mb-1">
                        {vendor.full_name || 
                         (vendor.first_name && vendor.last_name ? `${vendor.first_name} ${vendor.last_name}` : null) || 
                         vendor.username}
                      </h3>
                      {vendor.store_name && (
                        <p className="text-white/80 text-[11px] font-medium flex items-center gap-1">
                          <Store className="h-3 w-3" />
                          {vendor.store_name}
                        </p>
                      )}
                      <div className="flex items-center">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => {
                            const rating = vendor.rating || vendor.average_rating || 5.0;
                            return (
                              <Star 
                                key={i}
                                className={`h-3 w-3 ${i < Math.floor(rating) ? 'text-yellow-300 fill-current' : 'text-gray-300'}`} 
                              />
                            );
                          })}
                        </div>
                        <span className="ml-2 text-white/90 text-xs font-semibold">
                          ({(vendor.rating || vendor.average_rating || 5.0).toFixed(1)})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vendor Info */}
                <div className="p-4">
                  <p className="text-gray-600 mb-3 line-clamp-3 text-xs leading-relaxed">
                    {vendor.store_description || 'Premium quality products with exceptional customer service. Trusted by thousands of satisfied customers worldwide.'}
                  </p>

                  {/* Vendor Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <motion.div 
                      className="text-center p-2 bg-gradient-to-br from-emerald-50 to-green-50 rounded-md border border-emerald-100"
                      whileHover={{ scale: 1.05 }}
                    >
                      <Package className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-gray-900">{vendor.product_count || 0}</div>
                      <div className="text-[11px] text-gray-600 font-medium">Products</div>
                    </motion.div>
                    <motion.div 
                      className="text-center p-2 bg-gradient-to-br from-green-50 to-emerald-50 rounded-md border border-green-100"
                      whileHover={{ scale: 1.05 }}
                    >
                      <Star className="h-4 w-4 text-yellow-500 mx-auto mb-1" />
                      <div className="text-lg font-bold text-gray-900">{(vendor.rating || vendor.average_rating || 5.0).toFixed(1)}</div>
                      <div className="text-[11px] text-gray-600 font-medium">Rating</div>
                    </motion.div>
                  </div>

                  {/* Vendor Features */}
                  <div className="space-y-2 mb-4">
                    <motion.div 
                      className="flex items-center text-xs text-gray-700 bg-green-50 p-2 rounded-md"
                      whileHover={{ x: 5 }}
                    >
                      <Check className="h-3 w-3 mr-2 text-green-600" />
                      <span className="font-medium">Fast & Reliable Shipping</span>
                    </motion.div>
                    <motion.div 
                      className="flex items-center text-xs text-gray-700 bg-green-50 p-2 rounded-md"
                      whileHover={{ x: 5 }}
                    >
                      <Check className="h-3 w-3 mr-2 text-green-600" />
                      <span className="font-medium">Quality Guarantee</span>
                    </motion.div>
                    <motion.div 
                      className="flex items-center text-xs text-gray-700 bg-green-50 p-2 rounded-md"
                      whileHover={{ x: 5 }}
                    >
                      <Check className="h-3 w-3 mr-2 text-green-600" />
                      <span className="font-medium">24/7 Customer Support</span>
                    </motion.div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Link
                        to={`/vendor/${vendor.id}/products`}
                        className="block w-full text-center bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 text-white py-2 rounded-md hover:from-emerald-700 hover:via-green-700 hover:to-emerald-800 transition-all duration-300 font-bold shadow text-sm"
                      >
                        <ShoppingBag className="inline mr-2 h-4 w-4" />
                        View Products
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                      <a
                        href="#"
                        onClick={(e) => handleVisitStore(e, vendor.id)}
                        className="block w-full text-center border border-emerald-300 text-emerald-700 py-2 rounded-md hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-300 font-semibold text-xs"
                      >
                        <ExternalLink className="inline mr-2 h-3 w-3" />
                        Visit Store
                      </a>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
          ) : (
            <motion.div
              className="text-center py-20"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-white rounded-3xl shadow-xl p-12 max-w-2xl mx-auto">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Store className="h-12 w-12 text-emerald-600" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">No Vendors With Products Yet</h3>
                <p className="text-xl text-gray-600 mb-8">
                  We're currently onboarding vendors with products. Check back soon to discover amazing sellers!
                </p>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-green-700 transition-all duration-300 shadow-lg"
                >
                  <Store className="h-5 w-5" />
                  Become Our First Vendor
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 via-green-600 to-emerald-700 text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 right-10 w-32 h-32 bg-white/5 rounded-full animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/10 rounded-full animate-bounce"></div>
          <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-white/5 rounded-full animate-ping"></div>
        </div>
        
        <motion.div 
          className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <motion.h2 
            className="text-4xl md:text-6xl font-bold mb-8 bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent"
            initial={{ scale: 0.8 }}
            whileInView={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            viewport={{ once: true }}
          >
            Want to Join Our Vendor Community?
          </motion.h2>
          <motion.p 
            className="text-xl md:text-2xl mb-12 text-emerald-100 max-w-3xl mx-auto font-light"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            viewport={{ once: true }}
          >
            Start selling your products to thousands of customers worldwide and grow your business with us
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            viewport={{ once: true }}
          >
            <Link
              to="/register"
              className="bg-gradient-to-r from-white to-gray-100 text-emerald-700 px-12 py-6 rounded-full font-bold hover:from-gray-100 hover:to-white transition-all duration-300 shadow-2xl inline-flex items-center text-xl"
            >
              <Store className="mr-3 h-6 w-6" />
              Become a Vendor Today
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
};

export default Vendors;