import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FolderTree, ShoppingBag, Sparkles, TrendingUp, Star, ArrowRight } from 'lucide-react';
import { categoriesAPI } from '@/services/api';
import { Category } from '@/types';
import { motion } from 'framer-motion';
import FadeIn from '@/components/animations/FadeIn';

const Categories = () => {
  const { data: categoriesData, error: categoriesError, isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await categoriesAPI.getAll();
      return Array.isArray(response.data) ? response.data : []; // Ensure this returns an array
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-600 border-t-transparent absolute top-0 left-0"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-emerald-600 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Ensure categoriesData is always an array
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

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
            Browse Categories
          </motion.h1>
          <motion.p 
            className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Explore our diverse range of product categories
          </motion.p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-white rounded-full blur-lg opacity-20"></div>
                <div className="relative bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-4">
                  <FolderTree className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Categories
            </h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed font-medium">
              Explore our carefully curated collection of product categories, each designed to bring you the best shopping experience
            </p>
            <div className="mt-8 flex justify-center">
              <div className="flex items-center space-x-2 bg-gray-900 rounded-full px-6 py-3">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <span className="text-white font-medium">Premium Quality Products</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {categories.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="bg-white rounded-3xl shadow-xl p-12 max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No Categories Yet</h3>
              <p className="text-gray-600">We're working hard to bring you amazing product categories. Check back soon!</p>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8 }}
                className="group"
              >
                <Link to={`/products?category=${category.slug}`} className="block">
                  <div className="relative bg-white rounded-3xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-500 group-hover:shadow-emerald-500/25">
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-green-500/10 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    {/* Image Section */}
                    <div className="relative overflow-hidden">
                      {category.image ? (
                        <div className="relative">
                          <img
                            src={category.image}
                            alt={category.name}
                            className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        </div>
                      ) : (
                        <div className="w-full h-56 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20"></div>
                          <div className="relative bg-white rounded-full p-6 shadow-lg">
                            <ShoppingBag className="h-12 w-12 text-gray-600" />
                          </div>
                        </div>
                      )}
                      
                      {/* Trending Badge */}
                      <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <TrendingUp className="h-3 w-3" />
                        <span>Popular</span>
                      </div>
                    </div>
                    
                    {/* Content Section */}
                    <div className="p-6 relative">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors duration-300">
                          {category.name}
                        </h3>
                        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                      
                      {category.description && (
                        <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2">
                          {category.description}
                        </p>
                      )}
                      
                      {category.parent && (
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <span className="text-xs text-gray-500 font-medium">
                            Under {category.parent.name}
                          </span>
                        </div>
                      )}
                      
                      {/* Action Button */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <span className="text-sm font-medium text-gray-500">Explore Products</span>
                        <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center group-hover:shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-300">
                          <ArrowRight className="h-4 w-4 text-white group-hover:translate-x-0.5 transition-transform duration-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      
      {/* Bottom CTA Section */}
      <div className="bg-gradient-to-r from-gray-900 via-emerald-900 to-green-900 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Can't find what you're looking for?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Browse all our products or get in touch with our team for personalized recommendations
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/products" 
                className="bg-white text-gray-900 px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition-colors duration-300 flex items-center justify-center space-x-2"
              >
                <ShoppingBag className="h-5 w-5" />
                <span>Browse All Products</span>
              </Link>
              <Link 
                to="/contact" 
                className="border-2 border-white text-white px-8 py-4 rounded-full font-bold hover:bg-white hover:text-gray-900 transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <Sparkles className="h-5 w-5" />
                <span>Get Recommendations</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Categories;

// Add custom CSS for animations
const styles = `
  @keyframes blob {
    0% {
      transform: translate(0px, 0px) scale(1);
    }
    33% {
      transform: translate(30px, -50px) scale(1.1);
    }
    66% {
      transform: translate(-20px, 20px) scale(0.9);
    }
    100% {
      transform: translate(0px, 0px) scale(1);
    }
  }
  .animate-blob {
    animation: blob 7s infinite;
  }
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  .animation-delay-4000 {
    animation-delay: 4s;
  }
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}