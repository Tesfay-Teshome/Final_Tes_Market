import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Eye, 
  EyeOff,
  ShoppingBag,
  Shield,
  Truck,
  Headphones,
  CheckCircle,
  CreditCard,
  Star,
  Facebook,
  Sparkles,
  Users,
  Award,
  TrendingUp,
  Zap,
  Globe,
  Heart,
  Gift,
  Crown,
  Rocket,
  Target,
  DollarSign,
  Package,
  Clock,
  Percent,
  Smartphone,
  Wifi,
  Lock as LockIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import bannerImage from '../images/banner.jpeg';
import { authAPI } from '@/services/api';
import { setUser } from '@/store/slices/authSlice';
import { useToast } from '@/components/ui/use-toast';
import { RootState } from '@/store';

// Form validation schema
const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut'
    }
  }
};

// Feature slides for the carousel
const features = [
  {
    icon: <ShoppingBag className="h-8 w-8 text-emerald-500" />,
    title: "Shop with Confidence",
    description: "Secure payments and buyer protection on all orders."
  },
  {
    icon: <Shield className="h-8 w-8 text-green-500" />,
    title: "Secure Platform",
    description: "Your data is encrypted and protected at all times."
  },
  {
    icon: <Truck className="h-8 w-8 text-purple-500" />,
    title: "Fast Delivery",
    description: "Quick shipping options to get your orders faster."
  },
  {
    icon: <Headphones className="h-8 w-8 text-orange-500" />,
    title: "24/7 Support",
    description: "Our team is always here to help you."
  }
];

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [formError, setFormError] = useState('');
  
  const from = location.state?.from?.pathname || '/';
  
  // Auto-rotate features
  useEffect(() => {
    if (isAuthenticated) return;
    
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      console.log('Form submitted with data:', data);
      setIsSubmitting(true);
      setFormError('');
      
      // Login request
      const response = await authAPI.login(data);
      console.log('Login response received:', response);
      
      if (!response.data) {
        throw new Error('No data in login response');
      }
      
      const { access_token, refresh_token } = response.data;
      
      // Store tokens
      localStorage.setItem('access_token', access_token);
      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token);
      } else {
        localStorage.removeItem('refresh_token');
      }
      
      // Fetch user profile
      const profileResponse = await authAPI.getCurrentUser();
      dispatch(setUser(profileResponse.data));
      
      // Show success message
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });

      // Redirect based on user role with explicit role checking
      console.log('🔄 User login successful:', {
        user_type: profileResponse.data.user_type,
        email: profileResponse.data.email,
        from: from
      });
      
      let redirectPath;
      
      // Only use 'from' if it's not the home page and user has appropriate access
      if (from !== '/' && from !== '/login') {
        // Check if the 'from' path matches user role
        if (profileResponse.data.user_type === 'administrator' && from.startsWith('/administrator')) {
          redirectPath = from;
        } else if (profileResponse.data.user_type === 'vendor' && from.startsWith('/vendor')) {
          redirectPath = from;
        } else if (profileResponse.data.user_type === 'buyer' && !from.startsWith('/administrator') && !from.startsWith('/vendor')) {
          redirectPath = from;
        } else {
          // Fallback to role-based default
          redirectPath = profileResponse.data.user_type === 'administrator' ? '/administrator' :
                        profileResponse.data.user_type === 'vendor' ? '/vendor' :
                        '/';
        }
      } else {
        // Default role-based redirect
        redirectPath = profileResponse.data.user_type === 'administrator' ? '/administrator' :
                      profileResponse.data.user_type === 'vendor' ? '/vendor' :
                      '/';
      }
      
      console.log('🎯 Redirecting to:', redirectPath);
      navigate(redirectPath, { replace: true });
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Email or password is incorrect, please try again';
      const raw = (error?.response?.data?.detail || error?.response?.data?.message || error?.message || '').toString().toLowerCase();
      
      if (raw.includes('no active account') || (raw.includes('email') && raw.includes('not found')) || raw.includes('invalid email')) {
        errorMessage = 'The email is incorrect, please try again';
      } else if (raw.includes('invalid password') || raw.includes('incorrect password')) {
        errorMessage = 'Password is incorrect, please try again';
      }
      
      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen bg-gray-50">
      {/* Left side - Brand Section */}
      <div className="hidden lg:flex relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(18, 49, 117, 0.7), rgba(67, 20, 95, 0.7), rgba(30, 27, 75, 0.7)), url(${bannerImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Enhanced animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-emerald-400/30 via-cyan-400/25 to-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-gradient-to-br from-pink-400/30 via-rose-400/25 to-red-500/30 rounded-full blur-3xl animate-bounce"></div>
          <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-br from-yellow-400/25 via-orange-400/20 to-amber-500/25 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-gradient-to-br from-indigo-400/25 via-purple-400/20 to-violet-500/25 rounded-full blur-2xl animate-bounce"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-teal-400/15 via-cyan-400/10 to-blue-500/15 rounded-full blur-3xl animate-pulse"></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Link to="/" className="flex items-center mb-12">
              <motion.div
                className="bg-white/20 backdrop-blur-sm rounded-full p-3 mr-4"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <ShoppingBag className="h-7 w-7 text-white" />
              </motion.div>
              <span className="text-3xl font-bold text-white">
                TesMarket
              </span>
            </Link>
            
            <motion.h1 
              className="text-5xl font-bold mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Welcome Back to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300">
                TesMarket
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-emerald-100 mb-8 max-w-lg leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Sign in to access your account and discover amazing products from trusted vendors worldwide.
            </motion.p>
            
            {/* Enhanced features showcase with modern ads */}
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              {/* Top Flash Sale Advertisement */}
              <motion.div 
                className="hidden p-4 rounded-2xl bg-gradient-to-br from-red-600 via-pink-600 to-rose-700 border-2 border-red-400/50 shadow-2xl shadow-red-500/25"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02, y: -2, shadow: "0 25px 50px -12px rgba(239, 68, 68, 0.4)" }}
                transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-gradient-to-br from-red-400 to-pink-500 rounded-full p-2 shadow-lg">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-bold text-red-200 bg-red-500/30 px-2 py-1 rounded-full animate-pulse">FLASH SALE</span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">⚡ 70% OFF Everything!</h4>
                <p className="text-xs text-red-100 leading-relaxed">Limited time mega sale on all categories. Don't miss out on incredible deals!</p>
                <div className="flex items-center mt-2 space-x-2">
                  <Clock className="h-3 w-3 text-red-300" />
                  <span className="text-xs text-red-200">Ends in 2 hours</span>
                  <div className="flex items-center space-x-1 ml-auto">
                    <Percent className="h-3 w-3 text-yellow-400" />
                    <span className="text-xs text-red-200 font-bold">Save $500+</span>
                  </div>
                </div>
              </motion.div>

              {/* Feature Cards */}
              <motion.div 
                className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 border-2 border-purple-400/50 shadow-2xl shadow-purple-500/25"
                whileHover={{ scale: 1.02, x: 5, shadow: "0 25px 50px -12px rgba(147, 51, 234, 0.4)" }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-full p-3 shadow-lg">
                  <LockIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Bank-Level Security</h3>
                  <p className="text-emerald-100">256-bit encryption & fraud protection</p>
                </div>
              </motion.div>
              
              <motion.div 
                className="hidden flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 border-2 border-orange-400/50 shadow-2xl shadow-orange-500/25"
                whileHover={{ scale: 1.02, x: 5, shadow: "0 25px 50px -12px rgba(251, 146, 60, 0.4)" }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-full p-3 shadow-lg">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Mobile App Available</h3>
                  <p className="text-emerald-100">Shop anywhere, anytime with our app</p>
                </div>
              </motion.div>
              
              <motion.div 
                className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 border-2 border-emerald-400/50 shadow-2xl shadow-emerald-500/25"
                whileHover={{ scale: 1.02, x: 5, shadow: "0 25px 50px -12px rgba(34, 211, 238, 0.4)" }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="bg-gradient-to-br from-emerald-400 to-green-500 rounded-full p-3 shadow-lg">
                  <Wifi className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Real-Time Updates</h3>
                  <p className="text-emerald-100">Live order tracking & notifications</p>
                </div>
              </motion.div>

              {/* Premium Membership Ad */}
              <motion.div 
                className="p-4 rounded-2xl bg-gradient-to-br from-yellow-600 via-orange-600 to-amber-700 border-2 border-yellow-400/50 shadow-2xl shadow-yellow-500/25"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02, rotateY: 2, shadow: "0 25px 50px -12px rgba(245, 158, 11, 0.4)" }}
                transition={{ delay: 0.7, type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full p-2 shadow-lg">
                    <Crown className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-bold text-yellow-200 bg-yellow-500/30 px-2 py-1 rounded-full">VIP ACCESS</span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">👑 Become a Premium Member</h4>
                <p className="text-xs text-yellow-100 leading-relaxed">Unlock exclusive deals, free shipping, and priority support for just $9.99/month.</p>
                <div className="flex items-center mt-2 space-x-3">
                  <div className="flex items-center space-x-1">
                    <Truck className="h-3 w-3 text-yellow-300" />
                    <span className="text-xs text-yellow-200">Free Shipping</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Target className="h-3 w-3 text-yellow-300" />
                    <span className="text-xs text-yellow-200">Early Access</span>
                  </div>
                </div>
              </motion.div>
              
              {/* Stats section */}
              <motion.div 
                className="p-4 rounded-2xl bg-gradient-to-br from-slate-700 via-gray-700 to-zinc-800 border-2 border-gray-500/50 shadow-2xl shadow-gray-500/25"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ shadow: "0 25px 50px -12px rgba(107, 114, 128, 0.4)" }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <h4 className="text-base font-bold text-white mb-4 text-center flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Trusted by Millions
                </h4>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-green-300 flex items-center justify-center">
                      <Users className="h-5 w-5 mr-1" />
                      2M+
                    </div>
                    <div className="text-xs text-emerald-200">Active Users</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-yellow-300 flex items-center justify-center">
                      <Package className="h-5 w-5 mr-1" />
                      500K+
                    </div>
                    <div className="text-xs text-emerald-200">Products</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-purple-300 flex items-center justify-center">
                      <Globe className="h-5 w-5 mr-1" />
                      150+
                    </div>
                    <div className="text-xs text-emerald-200">Countries</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-cyan-300 flex items-center justify-center">
                      <Award className="h-5 w-5 mr-1" />
                      4.9★
                    </div>
                    <div className="text-xs text-emerald-200">Rating</div>
                  </div>
                </div>
              </motion.div>

              {/* App Download Ad */}
              <motion.div 
                className="hidden p-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-blue-500/20 to-cyan-500/20 backdrop-blur-sm border border-indigo-300/30 shadow-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ delay: 0.9, type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-gradient-to-br from-emerald-400 to-green-500 rounded-full p-2 shadow-lg">
                    <Smartphone className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-bold text-indigo-200 bg-indigo-500/30 px-2 py-1 rounded-full">NEW</span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">📱 Download Our Mobile App</h4>
                <p className="text-xs text-indigo-100 leading-relaxed">Get exclusive app-only deals and earn rewards points with every purchase!</p>
                <div className="flex items-center mt-2 space-x-3">
                  <div className="flex items-center space-x-1">
                    <Gift className="h-3 w-3 text-indigo-300" />
                    <span className="text-xs text-indigo-200">$10 Welcome Bonus</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span className="text-xs text-indigo-200">Reward Points</span>
                  </div>
                </div>
              </motion.div>

              {/* Customer Testimonial */}
              <motion.div 
                className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-green-500/20 to-teal-500/20 backdrop-blur-sm border border-emerald-300/30 shadow-2xl"
                initial={{ opacity: 0, rotateX: -10 }}
                animate={{ opacity: 1, rotateX: 0 }}
                whileHover={{ scale: 1.02, rotateX: 2 }}
                transition={{ delay: 1.0, type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mr-3">
                    <span className="text-xs font-bold text-white">SM</span>
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white">Sarah Miller</h5>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 text-yellow-400 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-emerald-100 italic leading-relaxed">
                  "Best shopping experience ever! Fast delivery, amazing customer service, and unbeatable prices. Highly recommended!"
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-emerald-200">Verified Purchase</span>
                  <div className="flex items-center space-x-1">
                    <Heart className="h-3 w-3 text-red-400 fill-current" />
                    <span className="text-xs text-emerald-200">1.2K helpful</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
      
      {/* Right side - Login Form */}
      <div className="w-full bg-white p-3 sm:p-6 md:p-8 lg:p-12 flex items-start justify-center relative min-h-screen pt-12">
        {/* Decorative emerald/green background elements */}
        <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-emerald-50/50 via-white to-green-50/50">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-emerald-200/40 to-green-200/40 rounded-full opacity-40 blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 -left-20 w-80 h-80 bg-gradient-to-tr from-teal-200/40 to-emerald-200/40 rounded-full opacity-40 blur-3xl animate-pulse delay-700"></div>
          <div className="absolute -bottom-20 -right-10 w-80 h-80 bg-gradient-to-br from-green-200/40 to-emerald-200/40 rounded-full opacity-40 blur-3xl animate-pulse delay-1000"></div>
        </div>

        <motion.div
          className="w-full max-w-2xl relative z-10"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border border-gray-100">
          <motion.div 
            className="text-center lg:text-left mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="relative mb-6">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 rounded-lg blur opacity-25"></div>
              <div className="relative bg-white rounded-lg p-3 sm:p-4 md:p-6 shadow-xl">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 bg-clip-text text-transparent mb-3">
                  Welcome Back
                </h2>
                <p className="text-lg text-gray-600 font-medium">Sign in to your account and continue your journey</p>
              </div>
            </div>
          </motion.div>
          
            <motion.form 
              className="space-y-4" 
              onSubmit={handleSubmit(onSubmit)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
            {formError && (
              <div className="bg-red-500/15 border border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm">
                {formError}
              </div>
            )}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <div className="relative group mt-2">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                  className="peer relative z-10 pl-12 pr-4 w-full h-14 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-300 bg-white/70 backdrop-blur-sm hover:border-gray-300 hover:shadow-lg text-base placeholder-transparent shadow-sm font-medium"
                  placeholder="Email Address"
                  {...register('email')}
                />
                <label 
                  htmlFor="email" 
                  className="absolute left-12 top-1/2 -translate-y-1/2 text-gray-500 text-base transition-all duration-300 peer-focus:-top-2 peer-focus:left-4 peer-focus:text-xs peer-focus:text-emerald-600 peer-focus:bg-white peer-focus:px-2 peer-focus:font-bold peer-focus:rounded-md peer-focus:-translate-y-0 peer-valid:-top-2 peer-valid:left-4 peer-valid:text-xs peer-valid:text-emerald-600 peer-valid:bg-white peer-valid:px-2 peer-valid:font-bold peer-valid:rounded-md peer-valid:-translate-y-0 z-20 pointer-events-none"
                >
                  Email Address
                </label>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-emerald-500/10 rounded-2xl blur-sm opacity-0 peer-focus:opacity-100 transition-all duration-300"></div>
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 peer-focus:text-emerald-600 transition-all duration-300 z-30" />
              </div>
              {errors.email && (
                <motion.p 
                  className="mt-1 text-xs text-red-600 flex items-center"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                  {errors.email.message}
                </motion.p>
              )}
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <div className="relative group mt-6">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  className="peer relative z-10 pl-12 pr-12 w-full h-14 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-300 bg-white/70 backdrop-blur-sm hover:border-gray-300 hover:shadow-lg text-base placeholder-transparent shadow-sm font-medium"
                  placeholder="Password"
                  {...register('password')}
                />
                <label 
                  htmlFor="password" 
                  className="absolute left-12 top-1/2 -translate-y-1/2 text-gray-500 text-base transition-all duration-300 peer-focus:-top-2 peer-focus:left-4 peer-focus:text-xs peer-focus:text-emerald-600 peer-focus:bg-white peer-focus:px-2 peer-focus:font-bold peer-focus:rounded-md peer-focus:-translate-y-0 peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:left-4 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-emerald-600 peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-2 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:rounded-md peer-[&:not(:placeholder-shown)]:-translate-y-0 z-20 pointer-events-none"
                >
                  Password
                </label>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-emerald-500/10 rounded-2xl blur-sm opacity-0 peer-focus:opacity-100 transition-all duration-300"></div>
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 peer-focus:text-emerald-600 transition-all duration-300 z-30" />
                
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-30 p-1 rounded-full hover:bg-gray-100"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-emerald-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-emerald-600 transition-colors" />
                  )}
                </motion.button>
              </div>
              {errors.password && (
                <motion.p 
                  className="mt-1 text-xs text-red-600 flex items-center"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                  {errors.password.message}
                </motion.p>
              )}
            </motion.div>
            
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border border-gray-300 rounded transition-colors"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm font-semibold text-gray-800">
                    Remember me
                  </label>
                </div>
                <Link to="/forgot-password" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
                  Forgot Password?
                </Link>
              </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <motion.div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  className="relative w-full flex justify-center py-5 px-6 border-2 border-transparent rounded-2xl shadow-2xl text-base font-bold text-white bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-700 hover:via-green-700 hover:to-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] hover:shadow-3xl hover:shadow-emerald-500/25"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <motion.svg 
                      className="h-4 w-4 text-white mr-2" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </motion.svg>
                    <span className="text-sm">Signing In...</span>
                  </div>
                ) : (
                  <span className="text-sm">Sign In</span>
                )}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
              </motion.button>
              </motion.div>
            </motion.div>
          </motion.form>
          
          <motion.div 
            className="mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-gray-200" />
                </div>
                <div className="relative flex justify-center text-lg">
                  <span className="px-8 bg-white font-bold text-gray-700">✨ Or continue with ✨</span>
                </div>
              </div>
              
              <div className="mt-8 grid grid-cols-2 gap-6">
                <motion.button
                  type="button"
                  className="w-full inline-flex justify-center py-4 px-6 border-2 border-gray-300 rounded-2xl shadow-lg bg-white text-lg font-semibold text-gray-800 hover:bg-gray-50 hover:border-indigo-300 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-300"
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <svg className="w-6 h-6" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                  </svg>
                  <span className="ml-2 text-sm">Google</span>
                </motion.button>
                
                <motion.button
                  type="button"
                  className="w-full inline-flex justify-center py-4 px-6 border-2 border-gray-300 rounded-2xl shadow-lg bg-white text-lg font-semibold text-gray-800 hover:bg-gray-50 hover:border-indigo-300 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-300"
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Facebook className="w-6 h-6 text-blue-600" />
                  <span className="ml-2 text-sm">Facebook</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="mt-10 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.0 }}
          >
            <p className="text-xl text-gray-800 font-medium">
              Don't have an account?{' '}
              <Link 
                to="/register" 
                className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 underline decoration-2 underline-offset-4"
              >
                Sign up for free
              </Link>
            </p>
          </motion.div>
          
          <motion.div 
            className="mt-8 pt-6 border-t border-gray-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.1 }}
          >
            <div className="grid grid-cols-3 gap-4">
              <motion.div 
                className="flex flex-col items-center"
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mb-2 shadow-sm">
                  <Shield className="h-6 w-6" />
                </div>
                <span className="text-xs text-gray-600 text-center font-medium">Secure</span>
              </motion.div>
              <motion.div 
                className="flex flex-col items-center"
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-50 text-green-600 mb-2 shadow-sm">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <span className="text-xs text-gray-600 text-center font-medium">Verified</span>
              </motion.div>
              <motion.div 
                className="flex flex-col items-center"
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-50 text-purple-600 mb-2 shadow-sm">
                  <CreditCard className="h-6 w-6" />
                </div>
                <span className="text-xs text-gray-600 text-center font-medium">Easy Pay</span>
              </motion.div>
            </div>
          </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;