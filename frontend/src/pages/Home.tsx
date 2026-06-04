import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  ShoppingBag, 
  Star, 
  ArrowRight, 
  Shield, 
  Truck, 
  Award,
  Sparkles,
  Gift,
  Zap,
  Heart,
  Package,
  Store,
  BarChart3,
  Settings,
  MessageSquare,
  Bell,
  DollarSign,
  Eye,
  Users,
  TrendingUp,
  Verified,
  Check,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { RootState } from '@/store';
import { loginSuccess } from '@/store/slices/authSlice';
import { authAPI, productsAPI, categoriesAPI, testimonialsAPI, resolveMediaUrl } from '@/services/api';
import bannerImage from './images/banner.jpeg';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  image: string;
  content: string;
  rating: number;
  is_active: boolean;
  created_at: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  image: string;
  category: number;
  vendor: number;
  is_featured: boolean;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  description: string;
  image: string;
  is_active: boolean;
  created_at: string;
}

const Home = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [loginEmail, setLoginEmail] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [loginError, setLoginError] = React.useState('');
  
  // Only redirect on initial login, not when user explicitly navigates to home
  // Remove automatic redirect - let users access homepage if they want

  // Fetch latest products instead of featured
  const { data: products, isLoading: productsLoading, error: productsError } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await productsAPI.getAll();
      return Array.isArray(response.data) ? response.data : [];
    },
    retry: false,
  });

  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await categoriesAPI.getAll();
      return Array.isArray(response.data) ? response.data : [];
    },
    retry: false,
  });

  const { data: testimonials, isLoading: testimonialsLoading, error: testimonialsError } = useQuery<Testimonial[]>({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const response = await testimonialsAPI.getAll();
      return Array.isArray(response.data) ? response.data : [];
    },
    retry: false,
  });

  // Compute category item counts from the loaded products (client-side fallback)
  const categoryCounts = React.useMemo<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    (products || []).forEach((p: any) => {
      const cid = p.category_id ?? p.category;
      if (cid !== undefined && cid !== null) {
        map[cid] = (map[cid] || 0) + 1;
      }
    });
    return map;
  }, [products]);

  // Default testimonials if API fails
  const defaultTestimonials = [
    {
      id: '1',
      name: 'Meskerem Dejene',
      role: 'Regular Customer',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      content: 'Amazing products and fast delivery! I\'ve been shopping here for months and never been disappointed.',
      rating: 5,
      is_active: true,
      created_at: '2024-01-01'
    },
    {
      id: '2',
      name: 'Makda Yosief',
      role: 'Business Owner',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      content: 'Great platform for finding quality suppliers. The vendor verification process gives me confidence.',
      rating: 5,
      is_active: true,
      created_at: '2024-01-02'
    },
    {
      id: '3',
      name: 'Samrawit Birhane',
      role: 'Vendor',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      content: 'As a vendor, this platform has helped me reach more customers and grow my business significantly.',
      rating: 5,
      is_active: true,
      created_at: '2024-01-03'
    }
  ];

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerChildren = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (productsError || categoriesError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-emerald-50">
        <motion.div 
          className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md mx-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-6">We're having trouble loading the page. Please try again later.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-green-700 transition-all duration-300"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  const displayTestimonials = testimonials && testimonials.length > 0 ? testimonials : defaultTestimonials;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner Section - Clean Modern Style */}
      <section className="relative overflow-hidden min-h-[640px] lg:min-h-[720px] py-24 sm:py-28">
        {/* Background Image with Strong Dark Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${bannerImage})`,
          }}
        >
          {/* Strong dark overlay for maximum text visibility */}
          <div className="absolute inset-0 bg-black/70"></div>
        </div>
        
        {/* Hero Content - Better Visibility */}
        <motion.div
          className="relative flex items-start z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_380px] xl:grid-cols-[minmax(0,1.5fr)_420px] gap-8 lg:gap-12 xl:gap-16 items-start">
              <div className="lg:pr-10 xl:pr-16">
                {/* Main Headline - BRIGHT WHITE TEXT */}
                <motion.h1 
                  className="text-4xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-bold mb-4 sm:mb-6 text-white leading-snug sm:leading-tight max-w-xl lg:max-w-3xl xl:max-w-4xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  Discover Premium Products
                  <br />
                  <span className="text-green-400">from Verified Vendors</span>
                </motion.h1>
                
                <motion.p 
                  className="text-sm sm:text-lg md:text-xl lg:text-2xl mb-5 sm:mb-10 text-white leading-relaxed max-w-lg lg:max-w-2xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  Shop with confidence from <span className="font-bold text-green-400">500+ trusted vendors</span> worldwide.
                  <br className="hidden sm:block" />
                  Secure payments • Fast shipping • Quality guaranteed
                </motion.p>
                
                {/* CTA Buttons */}
                <motion.div 
                  className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 mb-6 sm:mb-10 max-w-lg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  <Link to="/products" className="w-full sm:w-auto">
                    <motion.button 
                      className="w-full sm:w-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-4 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base lg:text-lg flex items-center justify-center bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Shop Now
                      <ArrowRight className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    </motion.button>
                  </Link>
                  <Link to="/register" className="w-full sm:w-auto">
                    <motion.button 
                      className="w-full sm:w-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-4 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base lg:text-lg bg-white/10 backdrop-blur-md border-2 border-white/30 text-white hover:bg-white/20"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Become a Vendor
                    </motion.button>
                  </Link>
                </motion.div>
              
                {/* Trust Badges */}
                <motion.div 
                  className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4 max-w-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                >
                  {[
                    { icon: Shield, text: 'Secure Payments' },
                    { icon: Verified, text: 'Verified Vendors' },
                    { icon: Truck, text: 'Fast Delivery' }
                  ].map((badge, index) => (
                    <div key={index} className="flex items-center gap-1.5 bg-white/95 px-3 py-1.5 rounded-full shadow-md">
                      <badge.icon className="h-4 w-4 text-green-600" />
                      <span className="text-xs sm:text-sm text-gray-900 font-semibold">{badge.text}</span>
                    </div>
                  ))}
                </motion.div>
              </div>
            
            {/* Quick Login Form - Only show if not authenticated */}
            {!isAuthenticated && (
              <motion.div
                className="hidden lg:block self-start"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <div className="bg-white/10 backdrop-blur-md border-2 border-emerald-500/50 rounded-2xl p-8 shadow-2xl">
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-white mb-2">Quick Login</h3>
                    <p className="text-white/80 text-sm">Access your account instantly</p>
                  </div>
                  
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setIsLoggingIn(true);
                    setLoginError('');
                    try {
                      const response = await authAPI.login({ email: loginEmail, password: loginPassword });
                      const data = response.data;

                      if (!data?.access_token || !data?.user) {
                        setLoginError('Invalid login response from server');
                        return;
                      }

                      localStorage.setItem('access_token', data.access_token);
                      localStorage.setItem('refresh_token', data.refresh_token);

                      try {
                        const profileResponse = await authAPI.getCurrentUser();
                        dispatch(loginSuccess({
                          user: profileResponse.data,
                          accessToken: data.access_token,
                          refreshToken: data.refresh_token,
                        }));
                      } catch (profileError) {
                        console.error('Failed to fetch user profile:', profileError);
                        dispatch(loginSuccess({
                          user: data.user,
                          accessToken: data.access_token,
                          refreshToken: data.refresh_token,
                        }));
                      }

                      if (data.user.user_type === 'administrator') {
                        navigate('/administrator');
                      } else if (data.user.user_type === 'vendor') {
                        navigate('/vendor');
                      } else if (data.user.user_type === 'buyer') {
                        navigate('/buyer/dashboard');
                      } else {
                        navigate('/');
                      }
                    } catch (error: any) {
                      console.error('Login failed:', error);
                      const raw = (error?.response?.data?.detail || error?.response?.data?.message || error?.message || '').toString().toLowerCase();
                      if (raw.includes('no active account') || (raw.includes('email') && raw.includes('not found'))) {
                        setLoginError('The email is incorrect, please try again');
                      } else if (raw.includes('invalid password') || raw.includes('incorrect password')) {
                        setLoginError('Password is incorrect, please try again');
                      } else if (raw.includes('network error')) {
                        setLoginError('Network error. Please check your connection and try again.');
                      } else {
                        setLoginError('Email or password is incorrect, please try again');
                      }
                    } finally {
                      setIsLoggingIn(false);
                    }
                  }} className="space-y-4">
                    {loginError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-500/20 border border-red-500 text-white px-4 py-3 rounded-lg text-sm"
                      >
                        {loginError}
                      </motion.div>
                    )}
                    
                    <div>
                      <label className="block text-white font-semibold mb-2 text-sm">Email</label>
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                        className="w-full px-4 py-3 text-sm rounded-lg bg-white/20 backdrop-blur-sm border-2 border-emerald-500/30 text-white placeholder-white/60 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white font-semibold mb-2 text-sm">Password</label>
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        className="w-full px-4 py-3 text-sm rounded-lg bg-white/20 backdrop-blur-sm border-2 border-emerald-500/30 text-white placeholder-white/60 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    
                    <motion.button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full py-3 text-base rounded-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isLoggingIn ? 'Signing In...' : 'Sign In'}
                    </motion.button>
                    
                    <div className="text-center pt-2">
                      <Link to="/register" className="text-white/90 text-sm hover:text-green-400 transition-colors">
                        Don't have an account? <span className="font-bold">Register</span>
                      </Link>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Why Choose Us - Modern Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Why Choose TesMarket?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the future of e-commerce with premium features
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={staggerChildren}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                icon: Shield,
                title: "100% Secure Payments",
                description: "Bank-level 256-bit SSL encryption protects every transaction",
                color: '#3CB371',
                gradient: 'linear-gradient(135deg, rgba(60,179,113,0.15), rgba(60,179,113,0.05))'
              },
              {
                icon: Verified,
                title: "Verified Vendors",
                description: "All sellers are thoroughly vetted for quality and reliability",
                color: '#6A5ACD',
                gradient: 'linear-gradient(135deg, rgba(106,90,205,0.15), rgba(106,90,205,0.05))'
              },
              {
                icon: Truck,
                title: "Fast Worldwide Shipping",
                description: "Get your orders delivered quickly with our reliable partners",
                color: '#3CB371',
                gradient: 'linear-gradient(135deg, rgba(60,179,113,0.15), rgba(60,179,113,0.05))'
              },
              {
                icon: Award,
                title: "Quality Guaranteed",
                description: "30-day money-back guarantee on all purchases",
                color: '#6A5ACD',
                gradient: 'linear-gradient(135deg, rgba(106,90,205,0.15), rgba(106,90,205,0.05))'
              },
              {
                icon: Users,
                title: "24/7 Support",
                description: "Our dedicated team is always here to help you",
                color: '#3CB371',
                gradient: 'linear-gradient(135deg, rgba(60,179,113,0.15), rgba(60,179,113,0.05))'
              },
              {
                icon: Package,
                title: "Premium Selection",
                description: "Curated products from trusted vendors worldwide",
                color: '#6A5ACD',
                gradient: 'linear-gradient(135deg, rgba(106,90,205,0.15), rgba(106,90,205,0.05))'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="bg-gray-50 rounded-2xl p-8 hover:shadow-xl transition-all duration-300"
                variants={fadeInUp}
                whileHover={{ y: -5 }}
              >
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Trending Now - Premium Banner */}
      <section className="relative overflow-hidden h-[600px]">
        {/* Background Image with Strong Dark Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=900&fit=crop)'
          }}
        >
          {/* Strong dark overlay for maximum text visibility */}
          <div className="absolute inset-0 bg-black/70"></div>
        </div>
        
        <div className="relative h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 text-white leading-tight">
                Trending Now
                <br />
                <span className="text-green-400">Hot Deals This Week</span>
              </h2>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white mb-6 sm:mb-10 max-w-2xl leading-relaxed">
                Don't miss out on the hottest products of the season.
                <br className="hidden sm:block" />
                <span className="font-semibold text-green-400">Limited stock • Special prices</span>
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {/* Trending Card 1 */}
              <motion.div
                className="relative h-48 sm:h-56 md:h-64 rounded-xl overflow-hidden shadow-xl group cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                whileHover={{ y: -5 }}
              >
                <img
                  src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=600&fit=crop"
                  alt="Latest Electronics"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors flex flex-col justify-end p-4 sm:p-6">
                  <span className="inline-block px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full mb-2 sm:mb-3 w-fit">HOT DEAL</span>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-2 line-clamp-1">Premium Electronics</h3>
                  <p className="text-white text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-1">Save up to 60% off</p>
                  <Link to="/products" className="text-green-400 font-semibold flex items-center gap-1 hover:gap-2 transition-all text-sm">
                    Shop Now <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
              
              {/* Trending Card 2 */}
              <motion.div
                className="relative h-48 sm:h-56 md:h-64 rounded-xl overflow-hidden shadow-xl group cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                whileHover={{ y: -5 }}
              >
                <img
                  src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=600&fit=crop"
                  alt="Fashion Collection"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors flex flex-col justify-end p-4 sm:p-6">
                  <span className="inline-block px-3 py-1 bg-purple-500 text-white text-xs font-bold rounded-full mb-2 sm:mb-3 w-fit">NEW ARRIVAL</span>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-2 line-clamp-1">Fashion Collection</h3>
                  <p className="text-white text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-1">New season arrivals</p>
                  <Link to="/products" className="text-green-400 font-semibold flex items-center gap-1 hover:gap-2 transition-all text-sm">
                    Explore <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <motion.h2 
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900"
              initial={{ opacity: 0, y: -30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Featured Products
            </motion.h2>
            <motion.p 
              className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-4"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Discover our handpicked collection from verified vendors
            </motion.p>
          </motion.div>

          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <motion.div
                  key={index}
                  className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse"
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="h-56 bg-gray-200"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-3"></div>
                    <div className="h-3 bg-gray-200 rounded mb-4 w-2/3"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
              variants={staggerChildren}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {products?.slice(0, 8).map((product, index) => (
                <motion.div
                  key={product.id}
                  className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
                  variants={fadeInUp}
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                >
                  {/* Image Section */}
                  <div className="relative overflow-hidden h-48 sm:h-56">
                    <Link to={`/products/${(product as any).slug || product.id}`}>
                      <img
                        src={resolveMediaUrl((product as any).image) || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop'}
                        alt={product.name}
                        className="w-full h-full object-contain bg-white p-2 transition-transform duration-500 group-hover:scale-105"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          const fallback = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop';
                          if (el.src !== fallback) el.src = fallback;
                        }}
                      />
                    </Link>
                    
                    {/* Quick View Button */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Link
                        to={`/products/${(product as any).slug || product.id}`}
                        className="bg-white px-6 py-2 rounded-lg font-semibold text-gray-900 flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform"
                      >
                        <Eye className="h-4 w-4" />
                        Quick View
                      </Link>
                    </div>
                    
                    {/* Wishlist Heart */}
                    <button className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-md hover:bg-red-50 transition-colors">
                      <Heart className="h-5 w-5 text-gray-600 hover:text-red-500 transition-colors" />
                    </button>
                  </div>
                  
                  {/* Content Section */}
                  <div className="p-2 sm:p-4">
                    <h3 className="text-sm sm:text-base font-semibold mb-1 text-gray-900 line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mb-1 sm:mb-2 line-clamp-1">
                      {(product as any).category_name || 'Uncategorized'}
                    </p>
                    
                    {/* Price */}
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <span className="text-base sm:text-lg font-bold text-gray-900">
                        ${product.price}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-600 font-medium whitespace-nowrap">
                        In Stock
                      </span>
                    </div>
                    
                    {/* View Button */}
                    <Link
                      to={`/products/${(product as any).slug || product.id}`}
                      className="w-full py-1.5 sm:py-2.5 px-2 sm:px-4 rounded-lg text-center text-xs sm:text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-1"
                    >
                      View Details
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          <div className="text-center mt-12">
            <Link to="/products" className="inline-flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors">
              View All Products
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Flash Deals & Special Offers */}
      <section className="relative overflow-hidden py-20">
        {/* Background Image with Dark Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1555421689-d68471e189f2?w=1600&h=900&fit=crop)'
          }}
        >
          {/* Dark overlay for text visibility */}
          <div className="absolute inset-0 bg-black/70"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
          >
            <motion.h2 
              className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 bg-clip-text text-transparent"
              initial={{ opacity: 0, rotateX: -20 }}
              whileInView={{ opacity: 1, rotateX: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              Flash Deals & Special Offers
            </motion.h2>
            <motion.p 
              className="text-xl text-emerald-100 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Limited time offers - Grab them before they're gone!
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Deal Card 1 */}
            <motion.div
              className="bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all group"
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop"
                  alt="Deal"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  50% OFF
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-emerald-400 mb-2">Premium Headphones</h3>
                <p className="text-gray-400 text-sm mb-3">Limited Stock Available</p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-emerald-400">$149</span>
                    <span className="text-gray-500 line-through ml-2">$299</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Deal Card 2 */}
            <motion.div
              className="bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop"
                  alt="Deal"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  30% OFF
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-emerald-400 mb-2">Smart Watch Pro</h3>
                <p className="text-gray-400 text-sm mb-3">Ends in 24 hours</p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-emerald-400">$199</span>
                    <span className="text-gray-500 line-through ml-2">$285</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Deal Card 3 */}
            <motion.div
              className="bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -5 }}
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop"
                  alt="Deal"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  40% OFF
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-emerald-400 mb-2">Designer Sneakers</h3>
                <p className="text-gray-400 text-sm mb-3">Flash Sale</p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-emerald-400">$89</span>
                    <span className="text-gray-500 line-through ml-2">$149</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Deal Card 4 */}
            <motion.div
              className="bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ y: -5 }}
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=300&fit=crop"
                  alt="Deal"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  25% OFF
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-emerald-400 mb-2">Luxury Handbag</h3>
                <p className="text-gray-400 text-sm mb-3">Today Only</p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-emerald-400">$179</span>
                    <span className="text-gray-500 line-through ml-2">$239</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Meet Our Team Section */}
      <motion.section 
        className="py-20 bg-gray-50"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 bg-clip-text text-transparent mb-4 leading-normal pb-2">
              Meet Our Team
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The passionate people behind TesMarket's success
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Tesfay Teshome',
                role: 'Founder & CEO',
                image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&h=256&q=80',
                description: 'Visionary leader with 10+ years in e-commerce and marketplace development.'
              },
              {
                name: 'Selam Tesfay',
                role: 'Head of Operations',
                image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&h=256&q=80',
                description: 'Operations expert ensuring smooth platform performance and vendor relations.'
              },
              {
                name: 'Mattiyas Tesfay',
                role: 'Chief Technology Officer',
                image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&h=256&q=80',
                description: 'Tech innovator building scalable solutions for the future of e-commerce.'
              }
            ].map((member, index) => (
              <motion.div 
                key={index} 
                className="bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-2xl transition-all duration-300"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                whileHover={{ y: -10, scale: 1.05 }}
              >
                <motion.img
                  src={member.image}
                  alt={member.name}
                  className="w-32 h-32 rounded-full object-cover mx-auto mb-6 border-4 border-emerald-100"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.3 }}
                />
                <motion.h3 
                  className="text-2xl font-bold text-gray-900 mb-2"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  {member.name}
                </motion.h3>
                <motion.p 
                  className="text-emerald-600 font-bold text-lg mb-4"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  {member.role}
                </motion.p>
                <motion.p 
                  className="text-gray-600 leading-relaxed"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  {member.description}
                </motion.p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Featured Brands - Trusted Partners */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Trusted by Top Brands
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join thousands of verified vendors selling premium products
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center">
            {/* Brand logos would go here - using placeholders */}
            {[1, 2, 3, 4, 5, 6].map((item, index) => (
              <motion.div
                key={item}
                className="flex items-center justify-center p-6 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="w-24 h-12 flex items-center justify-center">
                  <Store className="h-8 w-8 text-gray-600" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Shop by Category Section */}
      <section className="py-20 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <motion.div 
              className="inline-block px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full mb-4"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <span className="text-emerald-700 font-bold text-sm flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                BROWSE CATEGORIES
              </span>
            </motion.div>
            <motion.h2 
              className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent leading-normal pb-2"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Shop by Category
            </motion.h2>
            <motion.p 
              className="text-xl max-w-2xl mx-auto text-gray-700"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Explore our curated collection across diverse categories
            </motion.p>
          </motion.div>

          {categoriesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <motion.div
                  key={index}
                  className="bg-gray-100 rounded-xl overflow-hidden animate-pulse"
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="h-40 bg-gray-200"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
              variants={staggerChildren}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {categories?.slice(0, 8).map((category, index) => (
                <motion.div
                  key={category.id}
                  className="h-full"
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link to={`/products?category=${(category as any).slug || category.id}`} className="block h-full">
                    <motion.div 
                      className="rounded-2xl overflow-hidden bg-white border border-emerald-200 shadow-md hover:shadow-xl hover:border-emerald-400 h-full flex flex-col transition-all group"
                      initial={{ opacity: 0, y: 50, scale: 0.9 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ 
                        scale: 1.04,
                        y: -6,
                        rotateY: 2
                      }}
                    >
                      {/* Image Section with Overlay */}
                      <div className="relative overflow-hidden h-52">
                        {category.image ? (
                          <>
                            <img
                              src={category.image}
                              alt={category.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center relative" style={{ background: 'linear-gradient(135deg, rgba(106,90,205,0.2), rgba(60,179,113,0.2))' }}>
                            <motion.div 
                              className="rounded-2xl p-6"
                              style={{ 
                                background: 'rgba(255,255,255,0.1)',
                                boxShadow: '0 0 30px rgba(106, 90, 205, 0.3)'
                              }}
                              whileHover={{ scale: 1.1, rotate: 5 }}
                            >
                              <ShoppingBag className="h-12 w-12" style={{ color: '#6A5ACD' }} />
                            </motion.div>
                          </div>
                        )}
                        
                        {/* Floating Item Count Badge */}
                        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-emerald-500 shadow-lg">
                          <span className="text-xs font-bold text-white">
                            {(categoryCounts as any)[(category as any).id] 
                              ?? (category as any).products_count 
                              ?? (category as any).product_count 
                              ?? (category as any).items_count 
                              ?? (category as any).total_products 
                              ?? ((category as any).products?.length) 
                              ?? 0} items
                          </span>
                        </div>
                      </div>
                      
                      {/* Content Section */}
                      <div className="p-5 flex-1 flex flex-col">
                        <h3 className="text-lg font-bold mb-2 bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                          {category.name}
                        </h3>
                        <p className="text-sm mb-4 line-clamp-2 text-gray-600 flex-1">
                          {category.description || 'Explore our premium selection'}
                        </p>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-sm font-bold text-emerald-600">
                            Browse Collection
                          </span>
                          <ArrowRight className="h-4 w-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="relative overflow-hidden h-[500px]">
        {/* Background Image with Strong Dark Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1556740758-90de374c12ad?w=1600&h=900&fit=crop)'
          }}
        >
          {/* Strong dark overlay for maximum text visibility */}
          <div className="absolute inset-0 bg-black/70"></div>
        </div>
        
        <div className="relative h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
              variants={staggerChildren}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {[
                { icon: Users, number: "10K+", label: "Happy Customers" },
                { icon: Package, number: "50K+", label: "Products Sold" },
                { icon: Store, number: "500+", label: "Trusted Vendors" },
                { icon: Award, number: "99%", label: "Satisfaction Rate" }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  className="text-center"
                  variants={fadeInUp}
                >
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <stat.icon className="h-8 w-8 text-green-400" />
                  </div>
                  <h3 className="text-4xl md:text-6xl font-bold mb-2 text-white">
                    {stat.number}
                  </h3>
                  <p className="text-base md:text-lg font-medium text-white">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              What Our Customers Say
            </h2>
            <p className="text-xl max-w-2xl mx-auto text-gray-600">
              Join <span className="text-green-600 font-semibold">10,000+ satisfied customers</span> worldwide
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            variants={staggerChildren}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {displayTestimonials.slice(0, 3).map((testimonial, index) => (
              <motion.div
                key={testimonial.id}
                className="bg-gray-50 rounded-2xl p-8 shadow-md hover:shadow-xl transition-all"
                variants={fadeInUp}
                whileHover={{ y: -5 }}
              >
                <div className="flex items-center mb-6">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-14 h-14 rounded-full object-cover mr-4 border-2 border-green-500"
                    crossOrigin="anonymous"
                  />
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-current text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed">
                  "{testimonial.content}"
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Special Offers & Benefits Section */}
      <section className="relative overflow-hidden py-20">
        {/* Background Image with Dark Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=900&fit=crop)'
          }}
        >
          {/* Dark overlay for text visibility */}
          <div className="absolute inset-0 bg-black/70"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-block px-4 py-2 bg-white/10 backdrop-blur-sm border border-green-500/50 rounded-full mb-4">
              <span className="text-white font-bold text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                EXCLUSIVE BENEFITS
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Why Shop With TesMarket?
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Experience premium shopping with unbeatable benefits
            </p>
          </motion.div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Benefit 1 */}
            <motion.div
              className="bg-white/10 backdrop-blur-md border-2 border-green-500/30 rounded-2xl p-8 hover:border-green-500 transition-all group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Gift className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent mb-3">Free Shipping</h3>
              <p className="text-white/90 leading-relaxed mb-4 text-base">
                Get free delivery on all orders over $50. Fast, reliable, and tracked shipping to your doorstep.
              </p>
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Check className="h-5 w-5" />
                <span>Orders over $50</span>
              </div>
            </motion.div>

            {/* Benefit 2 */}
            <motion.div
              className="bg-white/10 backdrop-blur-md border-2 border-green-500/30 rounded-2xl p-8 hover:border-green-500 transition-all group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent mb-3">Buyer Protection</h3>
              <p className="text-white/90 leading-relaxed mb-4 text-base">
                Shop with confidence! Every purchase is protected with our 30-day money-back guarantee.
              </p>
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Check className="h-5 w-5" />
                <span>30-day guarantee</span>
              </div>
            </motion.div>

            {/* Benefit 3 */}
            <motion.div
              className="bg-white/10 backdrop-blur-md border-2 border-green-500/30 rounded-2xl p-8 hover:border-green-500 transition-all group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Verified className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent mb-3">Verified Vendors</h3>
              <p className="text-white/90 leading-relaxed mb-4 text-base">
                All sellers are thoroughly vetted and verified for quality, reliability, and authenticity.
              </p>
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Check className="h-5 w-5" />
                <span>500+ trusted sellers</span>
              </div>
            </motion.div>

            {/* Benefit 4 */}
            <motion.div
              className="bg-white/10 backdrop-blur-md border-2 border-green-500/30 rounded-2xl p-8 hover:border-green-500 transition-all group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent mb-3">24/7 Support</h3>
              <p className="text-white/90 leading-relaxed mb-4 text-base">
                Our dedicated customer service team is always here to help with any questions or concerns.
              </p>
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Check className="h-5 w-5" />
                <span>Instant response</span>
              </div>
            </motion.div>

            {/* Benefit 5 */}
            <motion.div
              className="bg-white/10 backdrop-blur-md border-2 border-green-500/30 rounded-2xl p-8 hover:border-green-500 transition-all group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent mb-3">Best Prices</h3>
              <p className="text-white/90 leading-relaxed mb-4 text-base">
                Compare prices from multiple vendors and get the best deals on premium products.
              </p>
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Check className="h-5 w-5" />
                <span>Price match guarantee</span>
              </div>
            </motion.div>

            {/* Benefit 6 */}
            <motion.div
              className="bg-white/10 backdrop-blur-md border-2 border-green-500/30 rounded-2xl p-8 hover:border-green-500 transition-all group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent mb-3">Quality Products</h3>
              <p className="text-white/90 leading-relaxed mb-4 text-base">
                Every product is carefully curated and quality-checked before listing on our marketplace.
              </p>
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Check className="h-5 w-5" />
                <span>Premium selection</span>
              </div>
            </motion.div>
          </div>

          <div className="text-center mt-12">
            <Link to="/register" className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl transition-all transform hover:scale-105">
              <Sparkles className="h-5 w-5" />
              Start Shopping Today
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Premium Guarantee */}
      <section className="py-24 bg-gray-50">
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Our Premium Guarantee
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Shop with complete confidence and peace of mind
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Guarantee 1 */}
            <motion.div
              className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              whileHover={{ y: -5 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">100% Secure Payments</h3>
              <p className="text-gray-600 leading-relaxed">
                Your transactions are protected with industry-leading encryption and security measures.
              </p>
            </motion.div>
            
            {/* Guarantee 2 */}
            <motion.div
              className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mb-6">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Fast & Free Shipping</h3>
              <p className="text-gray-600 leading-relaxed">
                Enjoy free worldwide shipping on all orders with tracking and delivery guarantee.
              </p>
            </motion.div>
            
            {/* Guarantee 3 */}
            <motion.div
              className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -5 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mb-6">
                <Award className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">30-Day Returns</h3>
              <p className="text-gray-600 leading-relaxed">
                Not satisfied? Return any item within 30 days for a full refund, no questions asked.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Newsletter & CTA Section */}
      <section className="relative overflow-hidden h-[550px]">
        {/* Background Image with Strong Dark Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=900&fit=crop)'
          }}
        >
          {/* Strong dark overlay for maximum text visibility */}
          <div className="absolute inset-0 bg-black/70"></div>
        </div>
        
        <div className="relative h-full flex items-center">
          <div className="max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8 w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              
              <h2 className="text-5xl md:text-7xl font-bold mb-6 text-white">
                Ready to Start Shopping?
              </h2>
              <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto text-white">
                Join <span className="font-semibold text-green-400">10,000+ satisfied customers</span> and discover premium products from verified vendors worldwide.
                <br className="hidden sm:block" />
                <span className="text-green-400">Secure payments • Fast shipping • Quality guaranteed</span>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {!isAuthenticated ? (
                <>
                    <Link to="/register">
                      <motion.button
                        className="px-8 py-4 rounded-lg font-bold text-lg bg-white text-gray-900 flex items-center gap-2 hover:bg-gray-100 transition-colors shadow-xl"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Get Started Free
                        <ArrowRight className="h-5 w-5" />
                      </motion.button>
                    </Link>
                    <Link to="/login">
                      <motion.button
                        className="px-8 py-4 rounded-lg font-bold text-lg bg-transparent border-2 border-white text-white hover:bg-white hover:text-gray-900 transition-all"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Sign In
                      </motion.button>
                    </Link>
                </>
              ) : (
                  <Link to="/products">
                    <motion.button
                      className="px-8 py-4 rounded-lg font-bold text-lg bg-white text-gray-900 flex items-center gap-2 hover:bg-gray-100 transition-colors shadow-xl"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ShoppingBag className="h-5 w-5" />
                      Start Shopping Now
                      <ArrowRight className="h-5 w-5" />
                    </motion.button>
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;