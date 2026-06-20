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
  Lock as LockIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import bannerImage from '../images/banner.jpeg';
import { authAPI } from '@/services/api';
import { setUser } from '@/store/slices/authSlice';
import { useToast } from '@/components/ui/use-toast';
import { RootState } from '@/store';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─── Luxury palette ────────────────────────────────────────────────────────────
const LUX = {
  ink: '#04130E',
  emeraldDeep: '#022C22',
  emerald: '#064E3B',
  emeraldSoft: '#065F46',
  gold: '#C9A24B',
  goldSoft: '#E6CE91',
  cream: '#F7F3EC',
  paper: '#FBF9F4',
};

// ─── Animation variants ────────────────────────────────────────────────────────
const sidebarVariants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: 'easeOut' } },
};

const formVariants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: 'easeOut' } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' },
  }),
};

const floatAnimation = {
  y: [0, -10, 0],
  transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
};

const shimmerAnimation = {
  x: [-200, 300],
  transition: { duration: 3, repeat: Infinity, ease: 'linear' },
};

const pulseGlow = {
  boxShadow: [
    '0 0 20px rgba(201,162,75,0.1)',
    '0 0 40px rgba(201,162,75,0.25)',
    '0 0 20px rgba(201,162,75,0.1)',
  ],
  transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
};

const features = [
  { icon: ShoppingBag, title: 'Shop with Confidence', description: 'Secure payments and buyer protection on all orders.' },
  { icon: Shield, title: 'Secure Platform', description: 'Your data is encrypted and protected at all times.' },
  { icon: Truck, title: 'Fast Delivery', description: 'Quick shipping options to get your orders faster.' },
  { icon: Headphones, title: '24/7 Support', description: 'Our team is always here to help you.' },
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

      const response = await authAPI.login(data);
      console.log('Login response received:', response);

      if (!response.data) {
        throw new Error('No data in login response');
      }

      const { access_token, refresh_token } = response.data;
      localStorage.setItem('access_token', access_token);
      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token);
      } else {
        localStorage.removeItem('refresh_token');
      }

      const profileResponse = await authAPI.getCurrentUser();
      dispatch(setUser(profileResponse.data));

      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });

      console.log('🔄 User login successful:', {
        user_type: profileResponse.data.user_type,
        email: profileResponse.data.email,
        from,
      });

      let redirectPath;
      if (from !== '/' && from !== '/login') {
        if (profileResponse.data.user_type === 'administrator' && from.startsWith('/administrator')) {
          redirectPath = from;
        } else if (profileResponse.data.user_type === 'vendor' && from.startsWith('/vendor')) {
          redirectPath = from;
        } else if (profileResponse.data.user_type === 'buyer' && !from.startsWith('/administrator') && !from.startsWith('/vendor')) {
          redirectPath = from;
        } else {
          redirectPath = profileResponse.data.user_type === 'administrator' ? '/administrator' :
            profileResponse.data.user_type === 'vendor' ? '/vendor' : '/';
        }
      } else {
        redirectPath = profileResponse.data.user_type === 'administrator' ? '/administrator' :
          profileResponse.data.user_type === 'vendor' ? '/vendor' : '/';
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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2" style={{ background: LUX.paper, gridAutoRows: '1fr' }}>

      {/* ═══════════════════════════════════════════════
          LEFT SIDEBAR - Compact Cards
         ═══════════════════════════════════════════════ */}
      <motion.div
        className="hidden lg:flex relative overflow-hidden flex-col"
        style={{
          backgroundImage: `url(${bannerImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        variants={sidebarVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(160deg, ${LUX.ink} 0%, rgba(2,44,34,0.94) 45%, rgba(4,19,14,0.90) 100%)`,
          }}
        />

        {/* Gold hairline at right edge */}
        <div
          className="absolute right-0 top-16 bottom-16 w-px"
          style={{ background: `linear-gradient(180deg, transparent, ${LUX.gold}, transparent)` }}
        />

        {/* Ambient orbs with animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={floatAnimation}
            className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full blur-[120px] opacity-25"
            style={{ background: `radial-gradient(circle, ${LUX.emeraldSoft}, transparent 70%)` }}
          />
          <motion.div
            animate={{ ...floatAnimation, transition: { ...floatAnimation.transition, delay: 1 } }}
            className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full blur-[90px] opacity-20"
            style={{ background: `radial-gradient(circle, ${LUX.gold}, transparent 70%)` }}
          />
        </div>

        {/* Top gold hairline with shimmer */}
        <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
          <div style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)`, height: '100%' }} />
          <motion.div
            className="absolute top-0 left-0 w-20 h-full"
            style={{ background: `linear-gradient(90deg, transparent, ${LUX.goldSoft}, transparent)` }}
            animate={shimmerAnimation}
          />
        </div>

        <div className="relative z-10 flex flex-col h-full p-8 xl:p-10">

          {/* Logo with hover glow */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <Link to="/" className="inline-flex items-center gap-3 group">
              <motion.div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: `linear-gradient(135deg, ${LUX.emeraldSoft}, ${LUX.emeraldDeep})`, border: `1px solid ${LUX.gold}55` }}
                whileHover={pulseGlow}
              >
                <ShoppingBag className="h-5 w-5" style={{ color: LUX.goldSoft }} />
              </motion.div>
              <span className="text-xl font-serif font-semibold text-white tracking-wide">
                TesMarket
              </span>
            </Link>
          </motion.div>

          {/* Headline */}
          <motion.div
            className="mt-8 mb-6"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
          >
            <div className="inline-flex items-center gap-2.5 mb-4">
              <span className="h-px w-6" style={{ background: LUX.gold }} />
              <span className="text-[9px] font-semibold tracking-[0.32em] uppercase" style={{ color: LUX.goldSoft }}>
                Members Area
              </span>
            </div>
            <h1 className="font-serif text-3xl xl:text-4xl font-semibold text-white leading-[1.1] mb-3">
              Welcome Back<br />
              <span
                className="italic font-light"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${LUX.goldSoft}, ${LUX.gold})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                to TesMarket
              </span>
            </h1>
            <p className="text-white/65 leading-relaxed text-sm max-w-xs">
              Sign in to access your account and discover amazing products from trusted vendors.
            </p>
          </motion.div>

          {/* Compact Feature cards */}
          <div className="flex-1 flex flex-col justify-center gap-3">

            {/* Security card - Compact */}
            <motion.div
              custom={0}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ x: 6, scale: 1.01, transition: { duration: 0.2 } }}
              className="flex items-center gap-3 rounded-xl p-3 backdrop-blur-md"
              style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${LUX.gold}25` }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})` }}
              >
                <LockIcon className="h-4 w-4" style={{ color: LUX.goldSoft }} />
              </div>
              <div>
                <h4 className="text-xs font-serif font-semibold text-white">Bank-Level Security</h4>
                <p className="text-[10px] text-white/55 mt-0.5">256-bit encryption</p>
              </div>
            </motion.div>

            {/* Real-time card - Compact */}
            <motion.div
              custom={1}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ x: 6, scale: 1.01, transition: { duration: 0.2 } }}
              className="flex items-center gap-3 rounded-xl p-3 backdrop-blur-md"
              style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${LUX.gold}25` }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})` }}
              >
                <Wifi className="h-4 w-4" style={{ color: LUX.goldSoft }} />
              </div>
              <div>
                <h4 className="text-xs font-serif font-semibold text-white">Real-Time Updates</h4>
                <p className="text-[10px] text-white/55 mt-0.5">Live tracking</p>
              </div>
            </motion.div>

            {/* Premium membership card - Compact */}
            <motion.div
              custom={2}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ x: 6, scale: 1.01, transition: { duration: 0.2 } }}
              className="rounded-xl p-3.5 backdrop-blur-md"
              style={{ background: 'rgba(201,162,75,0.08)', border: `1px solid ${LUX.gold}40` }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${LUX.gold}, #B8902F)` }}
                  >
                    <Crown className="h-3.5 w-3.5" style={{ color: LUX.emeraldDeep }} />
                  </div>
                  <span className="text-xs font-serif font-semibold text-white">Premium Member</span>
                </div>
                <span
                  className="text-[8px] font-semibold tracking-[0.22em] uppercase px-2 py-0.5 rounded-full"
                  style={{ background: `${LUX.gold}22`, color: LUX.goldSoft, border: `1px solid ${LUX.gold}44` }}
                >
                  VIP
                </span>
              </div>
              <p className="text-[10px] text-white/60 leading-relaxed">Unlock exclusive deals & priority support.</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <Truck className="h-2.5 w-2.5" style={{ color: LUX.goldSoft }} />
                  <span className="text-[9px] text-white/65">Free Shipping</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-2.5 w-2.5" style={{ color: LUX.goldSoft }} />
                  <span className="text-[9px] text-white/65">Early Access</span>
                </div>
              </div>
            </motion.div>

            {/* Stats grid - Compact */}
            <motion.div
              custom={3}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="rounded-xl p-3.5 backdrop-blur-md"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LUX.gold}18` }}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <TrendingUp className="h-3 w-3" style={{ color: LUX.gold }} />
                <span className="text-[9px] font-semibold tracking-[0.26em] uppercase" style={{ color: LUX.goldSoft }}>
                  Trusted Worldwide
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: Users, value: '2M+', label: 'Users' },
                  { icon: Package, value: '500K+', label: 'Products' },
                  { icon: Globe, value: '150+', label: 'Countries' },
                  { icon: Award, value: '4.9★', label: 'Rating' },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="rounded-lg p-2 text-center"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <s.icon className="h-3 w-3" style={{ color: LUX.gold }} />
                      <span className="text-xs font-serif font-bold text-white">{s.value}</span>
                    </div>
                    <span className="text-[8px] text-white/50">{s.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Testimonial - Compact */}
            <motion.div
              custom={4}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="rounded-xl p-3 backdrop-blur-md"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LUX.gold}18` }}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className="font-serif text-2xl leading-none select-none shrink-0"
                  style={{ color: LUX.goldSoft }}
                >
                  "
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-white/60 italic leading-relaxed mb-2">
                    Best shopping experience! Fast delivery & unbeatable prices.
                  </p>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{ background: `linear-gradient(135deg, ${LUX.emeraldSoft}, ${LUX.emeraldDeep})`, color: LUX.goldSoft }}
                    >
                      SM
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-white">Sarah Miller</p>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-2 w-2 fill-current" style={{ color: LUX.gold }} />
                        ))}
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <Heart className="h-2.5 w-2.5 fill-current text-rose-400" />
                      <span className="text-[9px] text-white/45">1.2K</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom gold line */}
          <div
            className="mt-6 h-px w-full"
            style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}44, transparent)` }}
          />
          <p className="mt-3 text-[9px] text-white/30 tracking-wider text-center">
            © TesMarket · Premium Marketplace
          </p>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════
          RIGHT — LOGIN FORM (Expanded)
         ═══════════════════════════════════════════════ */}
      <motion.div
        className="flex items-center justify-center px-5 sm:px-8 py-12 relative overflow-hidden"
        style={{ background: LUX.paper, minHeight: '100vh' }}
        variants={formVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Subtle ambient blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={floatAnimation}
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-[100px] opacity-25"
            style={{ background: `radial-gradient(circle, ${LUX.emeraldSoft}55, transparent)` }}
          />
          <motion.div
            animate={{ ...floatAnimation, transition: { ...floatAnimation.transition, delay: 2 } }}
            className="absolute bottom-0 -left-16 w-72 h-72 rounded-full blur-[80px] opacity-20"
            style={{ background: `radial-gradient(circle, ${LUX.gold}33, transparent)` }}
          />
        </div>

        <div className="relative z-10 w-full max-w-lg">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${LUX.emeraldSoft}, ${LUX.emeraldDeep})` }}
              >
                <ShoppingBag className="h-5 w-5" style={{ color: LUX.goldSoft }} />
              </div>
              <span className="text-xl font-serif font-semibold" style={{ color: LUX.emeraldDeep }}>TesMarket</span>
            </Link>
          </div>

          {/* Card - Larger */}
          <motion.div
            className="rounded-3xl p-8 sm:p-10"
            style={{
              background: '#fff',
              border: `1px solid rgba(6,78,59,0.08)`,
              boxShadow: `0 40px 100px -30px rgba(4,19,14,0.20), 0 0 0 1px rgba(201,162,75,0.06)`,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Top gold hairline with shimmer */}
            <div className="absolute top-0 left-16 right-16 h-px overflow-hidden rounded-full">
              <div style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)`, height: '100%' }} />
              <motion.div
                className="absolute top-0 left-0 w-16 h-full"
                style={{ background: `linear-gradient(90deg, transparent, ${LUX.goldSoft}, transparent)` }}
                animate={shimmerAnimation}
              />
            </div>

            {/* Header */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="inline-flex items-center gap-2.5 mb-3">
                <Sparkles className="h-4 w-4" style={{ color: LUX.gold }} />
                <span className="text-[10px] font-semibold tracking-[0.28em] uppercase" style={{ color: LUX.gold }}>
                  Sign In
                </span>
              </div>
              <h2
                className="font-serif text-3xl sm:text-4xl font-semibold leading-tight mb-2"
                style={{ color: LUX.emeraldDeep }}
              >
                Welcome Back
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Sign in to continue your shopping journey
              </p>
            </motion.div>

            {/* Form */}
            <motion.form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
            >
              {/* Error banner */}
              <AnimatePresence>
                {formError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    className="rounded-xl px-4 py-3 text-sm border"
                    style={{ background: 'rgba(220,38,38,0.06)', borderColor: 'rgba(220,38,38,0.25)', color: '#991b1b' }}
                  >
                    {formError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold tracking-[0.16em] uppercase mb-2" style={{ color: LUX.emeraldDeep }}>
                  Email Address
                </label>
                <div className="relative group">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 z-10"
                    style={{ color: '#9ca3af' }}
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="email"
                    placeholder="you@example.com"
                    className="w-full pl-11 pr-4 h-13 rounded-xl text-sm font-medium transition-all duration-200 outline-none"
                    style={{
                      border: `1.5px solid rgba(6,78,59,0.15)`,
                      background: LUX.paper,
                      color: LUX.emeraldDeep,
                      height: '52px',
                    }}
                    {...register('email')}
                    onFocus={e => { e.currentTarget.style.borderColor = LUX.emerald; e.currentTarget.style.boxShadow = `0 0 0 3px ${LUX.emerald}18`; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(6,78,59,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                {errors.email && (
                  <motion.p
                    className="mt-1.5 text-xs flex items-center gap-1.5"
                    style={{ color: '#dc2626' }}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="w-1 h-1 rounded-full bg-red-600 inline-block" />
                    {errors.email.message}
                  </motion.p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold tracking-[0.16em] uppercase mb-2" style={{ color: LUX.emeraldDeep }}>
                  Password
                </label>
                <div className="relative group">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 z-10"
                    style={{ color: '#9ca3af' }}
                  />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 h-13 rounded-xl text-sm font-medium transition-all duration-200 outline-none"
                    style={{
                      border: `1.5px solid rgba(6,78,59,0.15)`,
                      background: LUX.paper,
                      color: LUX.emeraldDeep,
                      height: '52px',
                    }}
                    {...register('password')}
                    onFocus={e => { e.currentTarget.style.borderColor = LUX.emerald; e.currentTarget.style.boxShadow = `0 0 0 3px ${LUX.emerald}18`; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(6,78,59,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-1 rounded-md transition-colors hover:bg-emerald-50"
                  >
                    {showPassword
                      ? <EyeOff className="h-4 w-4 text-gray-400" />
                      : <Eye className="h-4 w-4 text-gray-400" />}
                  </button>
                </div>
                {errors.password && (
                  <motion.p
                    className="mt-1.5 text-xs flex items-center gap-1.5"
                    style={{ color: '#dc2626' }}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="w-1 h-1 rounded-full bg-red-600 inline-block" />
                    {errors.password.message}
                  </motion.p>
                )}
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="w-4 h-4 rounded accent-emerald-700"
                  />
                  <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Remember me</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-semibold transition-colors hover:opacity-80"
                  style={{ color: LUX.emerald }}
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: isSubmitting ? 1 : 1.02, y: isSubmitting ? 0 : -2 }}
                whileTap={{ scale: 0.98 }}
                className="relative w-full h-13 rounded-xl font-semibold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${LUX.emeraldSoft}, ${LUX.emeraldDeep})`,
                  color: '#fff',
                  boxShadow: `0 12px 35px -8px ${LUX.emerald}88`,
                  height: '52px',
                }}
              >
                {/* Gold sheen sweep */}
                <motion.div
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(105deg, transparent 40%, ${LUX.gold}22 50%, transparent 60%)` }}
                  initial={{ x: '-200%' }}
                  whileHover={{ x: '200%' }}
                  transition={{ duration: 0.8 }}
                />
                {isSubmitting ? (
                  <>
                    <motion.svg
                      className="h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </motion.svg>
                    Signing In…
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            </motion.form>

            {/* Divider */}
            <div className="relative my-7">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: 'rgba(6,78,59,0.10)' }} />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 text-xs font-medium text-gray-400 bg-white">Or continue with</span>
              </div>
            </div>

            {/* Social */}
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-semibold transition-all"
                style={{
                  border: `1.5px solid rgba(6,78,59,0.12)`,
                  background: '#fff',
                  color: LUX.emeraldDeep,
                }}
              >
                <svg width="16" height="16" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                </svg>
                Google
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-semibold transition-all"
                style={{
                  border: `1.5px solid rgba(6,78,59,0.12)`,
                  background: '#fff',
                  color: LUX.emeraldDeep,
                }}
              >
                <Facebook className="w-4 h-4 text-blue-600" style={{ flexShrink: 0 }} />
                Facebook
              </motion.button>
            </div>

            {/* Sign up link */}
            <p className="mt-7 text-center text-sm text-gray-500">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold transition-colors hover:opacity-80"
                style={{ color: LUX.emerald }}
              >
                Create one free
              </Link>
            </p>

            {/* Trust badges */}
            <div
              className="mt-7 pt-6 grid grid-cols-3 gap-3"
              style={{ borderTop: `1px solid rgba(6,78,59,0.08)` }}
            >
              {[
                { icon: Shield, label: 'Secure' },
                { icon: CheckCircle, label: 'Verified' },
                { icon: CreditCard, label: 'Easy Pay' },
              ].map((b, i) => (
                <motion.div
                  key={i}
                  className="flex flex-col items-center gap-1.5"
                  whileHover={{ y: -2, scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${LUX.emerald}0f` }}
                  >
                    <b.icon className="h-4.5 w-4.5" style={{ color: LUX.emerald }} />
                  </div>
                  <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-gray-500">{b.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;