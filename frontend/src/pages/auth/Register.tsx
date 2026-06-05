import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, User, Mail, Lock, Store, ArrowRight, Sparkles, Shield, CheckCircle, Phone, MapPin, FileText, Camera, X, TrendingUp, Award, Zap, Globe, Heart, Star, Gift, Crown, Rocket, Target, Users, DollarSign, Package, Truck, Headphones } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { authAPI } from '@/services/api';
import bannerImage from '../images/banner.jpeg';
import FadeIn from '@/components/animations/FadeIn';

const registerSchema = z.object({
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

type RegisterFormData = z.infer<typeof registerSchema>;

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userType, setUserType] = useState<'buyer' | 'vendor'>('buyer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      user_type: 'buyer',
    },
  });

  // Ensure user_type is always synced with userType state
  useEffect(() => {
    setValue('user_type', userType);
  }, [userType, setValue]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Profile image must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image file',
          variant: 'destructive',
        });
        return;
      }
      
      setProfileImage(file);
      
      // Create preview
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

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsSubmitting(true);
      
      // Create FormData to handle file upload
      const formData = new FormData();
      formData.append('email', data.email);
      formData.append('username', data.username);
      formData.append('password', data.password);
      formData.append('confirm_password', data.confirm_password);
      formData.append('first_name', data.first_name);
      formData.append('last_name', data.last_name);
      formData.append('full_name', `${data.first_name} ${data.last_name}`);
      formData.append('user_type', data.user_type);
      
      if (data.store_name) formData.append('store_name', data.store_name);
      if (data.store_description) formData.append('store_description', data.store_description);
      if (data.phone) formData.append('phone', data.phone);
      if (data.address) formData.append('address', data.address);
      if (profileImage) formData.append('profile_image', profileImage);
      
      await authAPI.register(formData);

      toast({
        title: 'Registration successful',
        description: userType === 'vendor' 
          ? 'Your vendor account is pending approval. We will notify you once approved.'
          : 'Please login with your credentials.',
      });

      navigate('/login');
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.response?.data) {
        const backendErrors = error.response.data;
        if (typeof backendErrors === 'object') {
          const errorMessages = Object.entries(backendErrors)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('\n');
          toast({
            title: 'Registration failed',
            description: errorMessages,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Registration failed',
            description: error.response.data.detail || 'An error occurred during registration.',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Registration failed',
          description: 'An unexpected error occurred. Please try again later.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
      {/* Left Side - Brand Section */}
      <motion.div
        className="hidden lg:flex relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(18, 49, 117, 0.7), rgba(67, 20, 95, 0.7), rgba(30, 27, 75, 0.7)), url(${bannerImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-16 right-24 w-36 h-36 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-32 left-28 w-20 h-20 bg-yellow-300/20 rounded-full blur-lg animate-bounce"></div>
          <div className="absolute bottom-28 right-20 w-44 h-44 bg-pink-300/15 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-16 left-24 w-32 h-32 bg-cyan-300/20 rounded-full blur-xl animate-bounce"></div>
          
          {/* Geometric shapes */}
          <div className="absolute top-1/3 right-1/3 w-14 h-14 border-2 border-white/20 rotate-45 animate-spin-slow"></div>
          <div className="absolute bottom-1/4 left-1/4 w-10 h-10 border-2 border-purple-300/30 rounded-full animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 w-6 h-6 bg-white/20 rotate-45 animate-ping"></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-center min-h-screen p-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Link to="/" className="flex items-center mb-8">
              <ShoppingBag className="h-10 w-10 mr-3" />
              <span className="text-2xl font-bold">TesMarket</span>
            </Link>
            
            <h1 className="text-4xl font-bold mb-3 leading-tight">
              Join the Future of
              <span className="block bg-gradient-to-r from-emerald-300 via-green-300 to-teal-300 bg-clip-text text-transparent">
                Digital Commerce
              </span>
            </h1>
            
            <p className="text-xl text-emerald-100 mb-4 leading-relaxed">
              Connect with thousands of customers and vendors to grow your business with our innovative platform.
            </p>
            
            <div className="space-y-4">
              {/* Top Advertisement Section */}
              <motion.div 
                className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600/80 via-green-600/70 via-teal-600/75 to-teal-800/85 border-2 border-emerald-400/60 shadow-2xl shadow-emerald-500/30 backdrop-blur-sm"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-gradient-to-br from-emerald-400 to-green-500 rounded-full p-2 shadow-lg">
                    <Crown className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-bold text-emerald-200 bg-emerald-500/30 px-2 py-1 rounded-full">PREMIUM</span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">🚀 Launch Your Business Today!</h4>
                <p className="text-xs text-emerald-100 leading-relaxed">Join 50,000+ successful vendors earning $2M+ monthly. Start selling in 24 hours!</p>
                <div className="flex items-center mt-2 space-x-2">
                  <div className="flex -space-x-1">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border border-white/20"></div>
                    ))}
                  </div>
                  <span className="text-xs text-emerald-200">+50K vendors</span>
                </div>
              </motion.div>

              {/* Feature Cards */}
              <motion.div 
                className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-emerald-700/80 via-green-700/75 via-teal-700/70 to-emerald-800/85 border-2 border-emerald-400/60 shadow-2xl shadow-emerald-500/30 backdrop-blur-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.02, x: 5 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
              >
                <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-full p-3 shadow-lg">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Bank-Level Security</h4>
                  <p className="text-xs text-emerald-100">256-bit SSL encryption & fraud protection</p>
              </div>
              </motion.div>
              
              <motion.div 
                className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-emerald-700/80 via-green-700/75 via-teal-700/70 to-emerald-800/85 border-2 border-emerald-400/60 shadow-2xl shadow-emerald-500/30 backdrop-blur-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.02, x: 5 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
              >
                <div className="bg-gradient-to-br from-emerald-400 to-green-500 rounded-full p-3 shadow-lg">
                  <Rocket className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Lightning Fast Setup</h4>
                  <p className="text-xs text-emerald-100">Get your store live in under 5 minutes</p>
                </div>
              </motion.div>
              
              <motion.div 
                className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-emerald-700/80 via-green-700/75 via-teal-700/70 to-emerald-800/85 border-2 border-emerald-400/60 shadow-2xl shadow-emerald-500/30 backdrop-blur-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.02, x: 5 }}
                transition={{ delay: 0.6, type: "spring", stiffness: 300 }}
              >
                <div className="bg-gradient-to-br from-emerald-400 to-green-500 rounded-full p-3 shadow-lg">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Global Marketplace</h4>
                  <p className="text-xs text-emerald-100">Reach customers in 150+ countries</p>
                </div>
              </motion.div>

              {/* Middle Advertisement */}
              <motion.div 
                className="p-4 rounded-2xl bg-gradient-to-br from-emerald-700/85 via-green-700/80 via-teal-700/75 to-emerald-900/90 border-2 border-emerald-400/60 shadow-2xl shadow-emerald-500/30 backdrop-blur-sm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02, rotateY: 2 }}
                transition={{ delay: 0.7, type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-gradient-to-br from-emerald-400 to-green-500 rounded-full p-2 shadow-lg">
                    <Gift className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-bold text-emerald-200 bg-emerald-500/30 px-2 py-1 rounded-full">LIMITED OFFER</span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">🎁 First Month FREE!</h4>
                <p className="text-xs text-emerald-100 leading-relaxed">No setup fees, no hidden costs. Start earning from day one with our premium tools.</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-emerald-200">Expires in 7 days</span>
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span className="text-xs text-emerald-200">4.9/5 rating</span>
                  </div>
                </div>
              </motion.div>
              
              {/* Success metrics */}
              <motion.div 
                className="p-4 rounded-2xl bg-gradient-to-br from-slate-700/80 via-gray-700/75 via-zinc-700/70 to-zinc-900/85 border-2 border-gray-500/60 shadow-2xl shadow-gray-500/30 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <h4 className="text-base font-bold text-white mb-4 text-center flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Join Our Success Story
                </h4>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-emerald-300 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 mr-1" />
                      $2M+
                    </div>
                    <div className="text-xs text-emerald-200">Monthly Sales</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-yellow-300 flex items-center justify-center">
                      <Users className="h-5 w-5 mr-1" />
                      50K+
                    </div>
                    <div className="text-xs text-emerald-200">Active Vendors</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-emerald-200 flex items-center justify-center">
                      <Package className="h-5 w-5 mr-1" />
                      1M+
                    </div>
                    <div className="text-xs text-emerald-200">Products Sold</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-emerald-200 flex items-center justify-center">
                      <Award className="h-5 w-5 mr-1" />
                      99.8%
                    </div>
                    <div className="text-xs text-emerald-200">Satisfaction</div>
                  </div>
                </div>
              </motion.div>

              {/* Bottom Advertisement */}
              <motion.div 
                className="p-4 rounded-2xl bg-gradient-to-br from-emerald-700/85 via-green-700/80 via-teal-700/75 to-emerald-900/90 border-2 border-emerald-400/60 shadow-2xl shadow-emerald-500/30 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ delay: 0.9, type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-gradient-to-br from-emerald-400 to-green-500 rounded-full p-2 shadow-lg">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-bold text-emerald-200 bg-emerald-500/30 px-2 py-1 rounded-full">TRENDING</span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">⚡ AI-Powered Analytics</h4>
                <p className="text-xs text-emerald-100 leading-relaxed">Boost sales by 300% with smart insights, automated pricing, and trend predictions.</p>
                <div className="flex items-center mt-2 space-x-3">
                  <div className="flex items-center space-x-1">
                    <Truck className="h-3 w-3 text-emerald-300" />
                    <span className="text-xs text-emerald-200">Free Shipping</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Headphones className="h-3 w-3 text-emerald-300" />
                    <span className="text-xs text-emerald-200">24/7 Support</span>
                  </div>
                </div>
              </motion.div>

              {/* Testimonial */}
              <motion.div 
                className="p-4 rounded-2xl bg-gradient-to-br from-emerald-700/85 via-green-700/80 via-teal-700/75 to-emerald-900/90 border-2 border-emerald-400/60 shadow-2xl shadow-emerald-500/30 backdrop-blur-sm"
                initial={{ opacity: 0, rotateX: -10 }}
                animate={{ opacity: 1, rotateX: 0 }}
                whileHover={{ scale: 1.02, rotateX: 2 }}
                transition={{ delay: 1.0, type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mr-3">
                    <span className="text-xs font-bold text-white">JD</span>
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white">John Doe</h5>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 text-yellow-400 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-emerald-100 italic leading-relaxed">
                  "TesMarket transformed my small business into a $100K/month empire. The tools are incredible!"
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-emerald-200">Verified Vendor</span>
                  <div className="flex items-center space-x-1">
                    <Heart className="h-3 w-3 text-red-400 fill-current" />
                    <span className="text-xs text-emerald-200">2.5K likes</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
      
      {/* Right Side - Form Section */}
      <motion.div
        className="w-full bg-white p-3 sm:p-6 md:p-8 lg:p-12 flex items-start justify-center relative min-h-screen pt-12"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Decorative emerald/green background elements */}
        <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-emerald-50/50 via-white to-green-50/50">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-emerald-200/40 to-green-200/40 rounded-full opacity-40 blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 -left-20 w-80 h-80 bg-gradient-to-tr from-teal-200/40 to-emerald-200/40 rounded-full opacity-40 blur-3xl animate-pulse delay-700"></div>
          <div className="absolute -bottom-20 -right-10 w-80 h-80 bg-gradient-to-br from-green-200/40 to-emerald-200/40 rounded-full opacity-40 blur-3xl animate-pulse delay-1000"></div>
        </div>

        <motion.div
          className="w-full max-w-4xl relative z-10"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border border-gray-100 max-w-4xl w-full relative z-10">
            <div className="lg:hidden mb-4">
              <Link to="/" className="flex items-center justify-center text-blue-600">
                <ShoppingBag className="h-8 w-8 mr-2" />
                <span className="text-lg font-bold text-gray-900">TesMarket</span>
              </Link>
            </div>
            
            <div className="relative mb-6">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 rounded-lg blur opacity-25"></div>
              <div className="relative bg-white rounded-lg p-6 shadow-xl">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 bg-clip-text text-transparent mb-3">
                  Create Your Account
                </h2>
                <p className="text-lg text-gray-600 font-medium">Join thousands of users and start your journey today</p>
              </div>
            </div>

            <motion.form 
            onSubmit={handleSubmit(onSubmit)} 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                type="button"
                onClick={() => setUserType('buyer')}
                className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                  userType === 'buyer'
                    ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-gray-300 hover:border-emerald-400 hover:shadow-md bg-white'
                }`}
                whileHover={{ scale: 1.03, y: -3 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <motion.div
                  animate={{ rotate: userType === 'buyer' ? [0, 10, -10, 0] : 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <User className={`h-6 w-6 mx-auto mb-2 ${
                    userType === 'buyer' ? 'text-emerald-600' : 'text-gray-400'
                  }`} />
                </motion.div>
                <p className={`text-sm font-bold ${
                  userType === 'buyer' ? 'text-emerald-600' : 'text-gray-600'
                }`}>
                  Buyer Account
                </p>
                <p className={`text-xs mt-1 font-medium ${
                  userType === 'buyer' ? 'text-emerald-500' : 'text-gray-500'
                }`}>
                  Shop & Discover
                </p>
              </motion.button>

              <motion.button
                type="button"
                onClick={() => setUserType('vendor')}
                className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                  userType === 'vendor'
                    ? 'border-green-600 bg-gradient-to-br from-green-50 to-green-100 shadow-md ring-2 ring-green-600/20'
                    : 'border-gray-300 hover:border-green-500 hover:shadow-md bg-white'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <motion.div
                  animate={{ rotate: userType === 'vendor' ? [0, 10, -10, 0] : 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Store className={`h-6 w-6 mx-auto mb-2 ${
                    userType === 'vendor' ? 'text-emerald-600' : 'text-gray-400'
                  }`} />
                </motion.div>
                <p className={`text-sm font-bold ${
                  userType === 'vendor' ? 'text-emerald-600' : 'text-gray-600'
                }`}>
                  Vendor Account
                </p>
                <p className={`text-xs mt-1 font-medium ${
                  userType === 'vendor' ? 'text-emerald-500' : 'text-gray-500'
                }`}>
                  Sell & Grow
                </p>
              </motion.button>
            </div>

            {/* Profile Image Upload */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <label className="block text-sm font-bold text-gray-800 mb-2">
                Profile Image <span className="text-gray-500 font-medium">(Optional)</span>
              </label>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  {profileImagePreview ? (
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-emerald-100 shadow-lg">
                      <img
                        src={profileImagePreview}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeProfileImage}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-4 border-gray-200 flex items-center justify-center">
                      <User className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center px-4 py-2 border-2 border-dashed border-emerald-300 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200 text-sm font-medium text-emerald-600"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {profileImage ? 'Change Image' : 'Upload Image'}
                  </button>
                  <p className="text-xs text-gray-500 mt-1">Max size: 5MB. JPG, PNG, GIF</p>
                </div>
              </div>
            </motion.div>


            {/* First Name and Last Name Row */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.65 }}
              >
                <label className="block text-sm font-bold bg-gradient-to-r from-gray-800 to-gray-700 bg-clip-text text-transparent mb-3">
                  First Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-emerald-500/20 rounded-2xl blur-sm opacity-0 group-focus-within:opacity-100 transition-all duration-300"></div>
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-emerald-600 transition-all duration-300 z-10" />
                  <input
                    {...register('first_name')}
                    placeholder="Enter your first name"
                    className="relative z-10 pl-12 pr-4 w-full py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 bg-white hover:border-gray-300 hover:shadow-lg text-base placeholder-gray-500 shadow-sm font-medium backdrop-blur-sm"
                  />
                </div>
                {errors.first_name && (
                  <motion.p 
                    className="mt-1 text-xs text-red-600 flex items-center"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                    {errors.first_name.message}
                  </motion.p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                <label className="block text-sm font-bold bg-gradient-to-r from-gray-800 to-gray-700 bg-clip-text text-transparent mb-3">
                  Last Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-emerald-500/20 rounded-2xl blur-sm opacity-0 group-focus-within:opacity-100 transition-all duration-300"></div>
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-emerald-600 transition-all duration-300 z-10" />
                  <input
                    {...register('last_name')}
                    placeholder="Enter your last name"
                    className="relative z-10 pl-12 pr-4 w-full py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 bg-white hover:border-gray-300 hover:shadow-lg text-base placeholder-gray-500 shadow-sm font-medium backdrop-blur-sm"
                  />
                </div>
                {errors.last_name && (
                  <motion.p 
                    className="mt-1 text-xs text-red-600 flex items-center"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                    {errors.last_name.message}
                  </motion.p>
                )}
              </motion.div>
            </div>

            {/* Email and Password Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                <label className="block text-sm font-bold bg-gradient-to-r from-gray-800 to-gray-700 bg-clip-text text-transparent mb-3">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-emerald-500/20 rounded-2xl blur-sm opacity-0 group-focus-within:opacity-100 transition-all duration-300"></div>
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-emerald-600 transition-all duration-300 z-10" />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="Enter your email address"
                    className="relative z-10 pl-12 pr-4 w-full py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 bg-white hover:border-gray-300 hover:shadow-lg text-base placeholder-gray-500 shadow-sm font-medium backdrop-blur-sm"
                  />
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
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <label className="block text-sm font-bold bg-gradient-to-r from-gray-800 to-gray-700 bg-clip-text text-transparent mb-3">
                  Username
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-teal-500/20 rounded-2xl blur-sm opacity-0 group-focus-within:opacity-100 transition-all duration-300"></div>
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-emerald-600 transition-all duration-300 z-10" />
                  <input
                    {...register('username')}
                    placeholder="Choose a unique username"
                    className="relative z-10 pl-12 pr-4 w-full py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 bg-white hover:border-gray-300 hover:shadow-lg text-base placeholder-gray-500 shadow-sm font-medium backdrop-blur-sm"
                  />
                </div>
                {errors.username && (
                  <motion.p 
                    className="mt-1 text-xs text-red-600 flex items-center"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                    {errors.username.message}
                  </motion.p>
                )}
              </motion.div>
            </div>

            {/* Password and Confirm Password Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <label className="block text-sm font-bold bg-gradient-to-r from-gray-800 to-gray-700 bg-clip-text text-transparent mb-3">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-emerald-500/20 rounded-2xl blur-sm opacity-0 group-focus-within:opacity-100 transition-all duration-300"></div>
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-emerald-600 transition-all duration-300 z-10" />
                  <input
                    {...register('password')}
                    type="password"
                    placeholder="Create a secure password"
                    className="relative z-10 pl-12 pr-4 w-full py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 bg-white hover:border-gray-300 hover:shadow-lg text-base placeholder-gray-500 shadow-sm font-medium backdrop-blur-sm"
                  />
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

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
              >
                <label className="block text-sm font-bold bg-gradient-to-r from-gray-800 to-gray-700 bg-clip-text text-transparent mb-3">
                  Confirm Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-emerald-500/20 rounded-2xl blur-sm opacity-0 group-focus-within:opacity-100 transition-all duration-300"></div>
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-emerald-600 transition-all duration-300 z-10" />
                  <input
                    {...register('confirm_password')}
                    type="password"
                    placeholder="Confirm your password"
                    className="relative z-10 pl-12 pr-4 w-full py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 bg-white hover:border-gray-300 hover:shadow-lg text-base placeholder-gray-500 shadow-sm font-medium backdrop-blur-sm"
                  />
                </div>
                {errors.confirm_password && (
                  <motion.p 
                    className="mt-1 text-xs text-red-600 flex items-center"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                    {errors.confirm_password.message}
                  </motion.p>
                )}
              </motion.div>
            </div>

            {/* Phone and Address Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 1.0 }}
              >
                <label className="block text-sm font-bold bg-gradient-to-r from-gray-800 to-gray-700 bg-clip-text text-transparent mb-3">
                  Phone Number <span className="text-gray-500 font-medium">(Optional)</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-emerald-500/20 rounded-2xl blur-sm opacity-0 group-focus-within:opacity-100 transition-all duration-300"></div>
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-emerald-600 transition-all duration-300 z-10" />
                  <input
                    {...register('phone')}
                    placeholder="Enter your phone number"
                    className="relative z-10 pl-12 pr-4 w-full py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 bg-white hover:border-gray-300 hover:shadow-lg text-base placeholder-gray-500 shadow-sm font-medium backdrop-blur-sm"
                  />
                </div>
                {errors.phone && (
                  <motion.p 
                    className="mt-1 text-xs text-red-600 flex items-center"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                    {errors.phone.message}
                  </motion.p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 1.1 }}
              >
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Address <span className="text-gray-500 font-medium">(Optional)</span>
                </label>
                <div className="relative group">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-emerald-600 transition-colors" />
                  <textarea
                    {...register('address')}
                    placeholder="Enter your address"
                    rows={3}
                    className="pl-10 pr-4 w-full py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all duration-200 bg-white hover:border-emerald-400 text-sm placeholder-gray-400 resize-none"
                  />
                </div>
                {errors.address && (
                  <motion.p 
                    className="mt-1 text-xs text-red-600 flex items-center"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                    {errors.address.message}
                  </motion.p>
                )}
              </motion.div>
            </div>

            {/* Vendor-specific fields */}
            {userType === 'vendor' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                >
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    Store Name
                  </label>
                  <div className="relative group">
                    <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-emerald-600 transition-colors" />
                    <input
                      {...register('store_name')}
                      placeholder="Enter your store name"
                      className="pl-10 pr-4 w-full py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all duration-200 bg-white hover:border-emerald-400 text-sm placeholder-gray-400"
                    />
                  </div>
                  {errors.store_name && (
                    <motion.p 
                      className="mt-1 text-xs text-red-600 flex items-center"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                      {errors.store_name.message}
                    </motion.p>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 1.3 }}
                >
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    Store Description
                  </label>
                  <div className="relative group">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-emerald-600 transition-colors" />
                    <textarea
                      {...register('store_description')}
                      placeholder="Describe your store and what you sell"
                      rows={3}
                      className="pl-10 pr-4 w-full py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all duration-200 bg-white hover:border-emerald-400 text-sm placeholder-gray-400 resize-none"
                    />
                  </div>
                  {errors.store_description && (
                    <motion.p 
                      className="mt-1 text-xs text-red-600 flex items-center"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                      {errors.store_description.message}
                    </motion.p>
                  )}
                </motion.div>
              </div>
            )}

            <input
              type="hidden"
              {...register('user_type')}
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.4 }}
            >
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex justify-center py-5 px-6 border-2 border-transparent rounded-2xl shadow-2xl text-base font-bold text-white bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-700 hover:via-green-700 hover:to-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] hover:shadow-3xl hover:shadow-emerald-500/25"
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
                    <span className="text-base font-bold">Creating Account...</span>
                  </div>
                ) : (
                  <>
                    <span className="text-base font-bold">Create Account</span>
                    <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </>
                )}
              </button>
            </motion.div>

            <motion.div 
              className="text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.4 }}
            >
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-500 transition-colors">
                  Sign in
                </Link>
              </p>
            </motion.div>
          </motion.form>

          <motion.div 
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.5 }}
          >
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gradient-to-r from-gray-50 to-white text-gray-500 font-medium">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <motion.button 
                className="w-full inline-flex justify-center py-3 px-4 border border-gray-200 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                <img
                  className="h-5 w-5"
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  alt="Google"
                />
              </motion.button>
              <motion.button 
                className="w-full inline-flex justify-center py-3 px-4 border border-gray-200 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                <img
                  className="h-5 w-5"
                  src="https://www.svgrepo.com/show/475647/facebook-color.svg"
                  alt="Facebook"
                />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </motion.div>
      </motion.div>
    </div>
  );
};

export default Register;