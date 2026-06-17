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
  Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { RootState } from '@/store';
import { loginSuccess } from '@/store/slices/authSlice';
import {
  authAPI,
  productsAPI,
  categoriesAPI,
  testimonialsAPI,
  resolveMediaUrl,
} from '@/services/api';
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

/**
 * Luxury palette tokens (kept inline so no global CSS changes are required).
 * Deep emerald + champagne gold accents = premium, editorial feel.
 */
const LUX = {
  ink: '#04130E',        // near-black emerald (page background sections)
  emeraldDeep: '#022C22',
  emerald: '#064E3B',    // brand primary
  emeraldSoft: '#065F46',
  gold: '#C9A24B',       // champagne gold accent
  goldSoft: '#E6CE91',
  cream: '#F7F3EC',      // luxury off-white
  paper: '#FBF9F4',
};

const Home = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [loginEmail, setLoginEmail] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [loginError, setLoginError] = React.useState('');

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
  const defaultTestimonials: Testimonial[] = [
    {
      id: '1',
      name: 'Meskerem Dejene',
      role: 'Regular Customer',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      content: "Amazing products and fast delivery! I've been shopping here for months and never been disappointed.",
      rating: 5,
      is_active: true,
      created_at: '2024-01-01',
    },
    {
      id: '2',
      name: 'Makda Yosief',
      role: 'Business Owner',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      content: 'Great platform for finding quality suppliers. The vendor verification process gives me confidence.',
      rating: 5,
      is_active: true,
      created_at: '2024-01-02',
    },
    {
      id: '3',
      name: 'Samrawit Birhane',
      role: 'Vendor',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      content: 'As a vendor, this platform has helped me reach more customers and grow my business significantly.',
      rating: 5,
      is_active: true,
      created_at: '2024-01-03',
    },
  ];

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  };

  const staggerChildren = {
    animate: { transition: { staggerChildren: 0.1 } },
  };

  if (productsError || categoriesError) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${LUX.cream}, #ffffff 50%, #ecf6f1)` }}
      >
        <motion.div
          className="text-center p-10 bg-white rounded-3xl shadow-2xl max-w-md mx-4 border border-emerald-900/10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(220,38,38,0.08)' }}
          >
            <Package className="w-8 h-8 text-red-700" />
          </div>
          <h2 className="text-2xl font-serif font-bold mb-2" style={{ color: LUX.emeraldDeep }}>
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-6">We're having trouble loading the page. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-7 py-3 rounded-xl font-semibold text-white tracking-wide shadow-lg hover:shadow-xl transition-all"
            style={{ background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})` }}
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  const displayTestimonials =
    testimonials && testimonials.length > 0 ? testimonials : defaultTestimonials;

  /* ============================================================
     Reusable section header (luxurious eyebrow + serif heading)
     ============================================================ */
  const SectionHeader = ({
    eyebrow,
    title,
    subtitle,
    light = false,
  }: {
    eyebrow?: string;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    light?: boolean;
  }) => (
    <motion.div
      className="text-center mb-14"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      {eyebrow && (
        <div className="inline-flex items-center gap-3 mb-5">
          <span className="h-px w-10" style={{ background: LUX.gold }} />
          <span
            className="text-[11px] font-semibold tracking-[0.32em] uppercase"
            style={{ color: light ? LUX.goldSoft : LUX.gold }}
          >
            {eyebrow}
          </span>
          <span className="h-px w-10" style={{ background: LUX.gold }} />
        </div>
      )}
      <h2
        className="font-serif text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1]"
        style={{ color: light ? '#fff' : LUX.emeraldDeep }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className="mt-5 text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
          style={{ color: light ? 'rgba(255,255,255,0.78)' : '#4b5563' }}
        >
          {subtitle}
        </p>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen" style={{ background: LUX.paper }}>
      {/* ==========================================================
          HERO — Compact, luxurious, quick login above the fold
          (Desktop: total hero height = 100vh so login is visible
           without scrolling on standard laptop screens.)
         ========================================================== */}
      <section
        className="relative overflow-hidden flex items-center lg:h-screen lg:max-h-[860px] lg:min-h-[640px] py-14 lg:py-0"
      >
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bannerImage})` }}
        />
        {/* Luxury gradient overlay — deep emerald to ink, with vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(115deg, ${LUX.ink} 0%, rgba(2,44,34,0.92) 45%, rgba(2,44,34,0.65) 75%, rgba(4,19,14,0.85) 100%)`,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(120% 80% at 80% 20%, rgba(201,162,75,0.18), transparent 55%)',
          }}
        />
        {/* Subtle gold hairline at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)` }}
        />

        <div className="relative z-10 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_400px] xl:grid-cols-[1.4fr_420px] gap-10 lg:gap-14 items-center">
              {/* LEFT — Copy */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.15 }}
              >
                {/* Eyebrow */}
                <div className="inline-flex items-center gap-3 mb-5">
                  <span className="h-px w-8" style={{ background: LUX.gold }} />
                  <span
                    className="text-[11px] font-semibold tracking-[0.32em] uppercase"
                    style={{ color: LUX.goldSoft }}
                  >
                    The TesMarket Collection
                  </span>
                </div>

                <h1
                  className="font-serif font-semibold text-white leading-[1.05] tracking-tight text-[2.2rem] sm:text-5xl lg:text-[3.6rem] xl:text-[4.1rem] mb-5"
                >
                  Discover Premium Products
                  <br />
                  <span
                    className="italic font-light"
                    style={{
                      backgroundImage: `linear-gradient(90deg, ${LUX.goldSoft}, ${LUX.gold})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    from Verified Vendors
                  </span>
                </h1>

                <p className="text-sm sm:text-base lg:text-lg text-white/85 leading-relaxed max-w-xl mb-7">
                  Shop with confidence from{' '}
                  <span className="font-semibold" style={{ color: LUX.goldSoft }}>
                    500+ trusted vendors
                  </span>{' '}
                  worldwide. Secure payments, fast shipping, quality guaranteed.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-7 max-w-lg">
                  <Link to="/products" className="w-full sm:w-auto">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-sm tracking-wide flex items-center justify-center text-white shadow-[0_10px_30px_-10px_rgba(6,78,59,0.7)]"
                      style={{
                        background: `linear-gradient(135deg, ${LUX.emeraldSoft}, ${LUX.emeraldDeep})`,
                        border: `1px solid ${LUX.gold}55`,
                      }}
                    >
                      Shop the Collection
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </motion.button>
                  </Link>
                  <Link to="/register" className="w-full sm:w-auto">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-sm tracking-wide text-white/95 backdrop-blur-md bg-white/5 border hover:bg-white/10 transition-colors"
                      style={{ borderColor: `${LUX.gold}66` }}
                    >
                      Become a Vendor
                    </motion.button>
                  </Link>
                </div>

                {/* Trust badges — slim luxury chips */}
                <div className="flex flex-wrap gap-2.5 max-w-xl">
                  {[
                    { icon: Shield, text: 'Secure Payments' },
                    { icon: Verified, text: 'Verified Vendors' },
                    { icon: Truck, text: 'Fast Delivery' },
                  ].map((b, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-md bg-white/5 border"
                      style={{ borderColor: `${LUX.gold}40` }}
                    >
                      <b.icon className="h-3.5 w-3.5" style={{ color: LUX.goldSoft }} />
                      <span className="text-[11px] font-medium tracking-wide text-white/90">
                        {b.text}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* RIGHT — Quick Login (compact so it fits in viewport) */}
              {!isAuthenticated && (
                <motion.div
                  className="hidden lg:block"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.35 }}
                >
                  <div
                    className="relative rounded-2xl p-6 xl:p-7 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)]"
                    style={{
                      background:
                        'linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
                      border: `1px solid ${LUX.gold}55`,
                    }}
                  >
                    {/* Gold corner accent */}
                    <div
                      className="absolute -top-px left-6 right-6 h-px"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)`,
                      }}
                    />
                    <div className="mb-5">
                      <span
                        className="text-[10px] font-semibold tracking-[0.32em] uppercase"
                        style={{ color: LUX.goldSoft }}
                      >
                        Members
                      </span>
                      <h3 className="text-2xl font-serif font-semibold text-white mt-1.5">
                        Quick Sign In
                      </h3>
                      <p className="text-white/65 text-xs mt-1">
                        Access your account instantly
                      </p>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setIsLoggingIn(true);
                        setLoginError('');
                        try {
                          const response = await authAPI.login({
                            email: loginEmail,
                            password: loginPassword,
                          });
                          const data = response.data;

                          if (!data?.access_token || !data?.user) {
                            setLoginError('Invalid login response from server');
                            return;
                          }

                          localStorage.setItem('access_token', data.access_token);
                          localStorage.setItem('refresh_token', data.refresh_token);

                          try {
                            const profileResponse = await authAPI.getCurrentUser();
                            dispatch(
                              loginSuccess({
                                user: profileResponse.data,
                                accessToken: data.access_token,
                                refreshToken: data.refresh_token,
                              })
                            );
                          } catch (profileError) {
                            console.error('Failed to fetch user profile:', profileError);
                            dispatch(
                              loginSuccess({
                                user: data.user,
                                accessToken: data.access_token,
                                refreshToken: data.refresh_token,
                              })
                            );
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
                          const raw = (
                            error?.response?.data?.detail ||
                            error?.response?.data?.message ||
                            error?.message ||
                            ''
                          )
                            .toString()
                            .toLowerCase();
                          if (
                            raw.includes('no active account') ||
                            (raw.includes('email') && raw.includes('not found'))
                          ) {
                            setLoginError('The email is incorrect, please try again');
                          } else if (
                            raw.includes('invalid password') ||
                            raw.includes('incorrect password')
                          ) {
                            setLoginError('Password is incorrect, please try again');
                          } else if (raw.includes('network error')) {
                            setLoginError(
                              'Network error. Please check your connection and try again.'
                            );
                          } else {
                            setLoginError('Email or password is incorrect, please try again');
                          }
                        } finally {
                          setIsLoggingIn(false);
                        }
                      }}
                      className="space-y-3.5"
                    >
                      {loginError && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-white px-3.5 py-2.5 rounded-lg text-xs border"
                          style={{
                            background: 'rgba(220,38,38,0.18)',
                            borderColor: 'rgba(248,113,113,0.5)',
                          }}
                        >
                          {loginError}
                        </motion.div>
                      )}

                      <div>
                        <label className="block text-white/85 text-[11px] font-semibold tracking-[0.18em] uppercase mb-1.5">
                          Email
                        </label>
                        <input
                          type="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                          className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-white/10 text-white placeholder-white/40 focus:outline-none transition-colors border"
                          style={{ borderColor: `${LUX.gold}33` }}
                        />
                      </div>

                      <div>
                        <label className="block text-white/85 text-[11px] font-semibold tracking-[0.18em] uppercase mb-1.5">
                          Password
                        </label>
                        <input
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-white/10 text-white placeholder-white/40 focus:outline-none transition-colors border"
                          style={{ borderColor: `${LUX.gold}33` }}
                        />
                      </div>

                      <motion.button
                        type="submit"
                        disabled={isLoggingIn}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 mt-1 text-sm rounded-lg font-semibold tracking-wide text-white shadow-lg disabled:opacity-60 transition-all"
                        style={{
                          background: `linear-gradient(135deg, ${LUX.gold}, #B8902F)`,
                          color: LUX.emeraldDeep,
                        }}
                      >
                        {isLoggingIn ? 'Signing In…' : 'Sign In'}
                      </motion.button>

                      <div className="text-center pt-1">
                        <Link
                          to="/register"
                          className="text-white/70 text-xs hover:text-white transition-colors"
                        >
                          Don't have an account?{' '}
                          <span className="font-semibold" style={{ color: LUX.goldSoft }}>
                            Register
                          </span>
                        </Link>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
          WHY CHOOSE US — refined feature cards
         ========================================================== */}
      <section className="py-24" style={{ background: LUX.paper }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="The TesMarket Difference"
            title={<>Why Choose <em className="italic font-light" style={{ color: LUX.emerald }}>TesMarket</em></>}
            subtitle="Experience the future of e-commerce with premium features curated for discerning customers."
          />

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7"
            variants={staggerChildren}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              { icon: Shield, title: '100% Secure Payments', description: 'Bank-level 256-bit SSL encryption protects every transaction.' },
              { icon: Verified, title: 'Verified Vendors', description: 'All sellers are thoroughly vetted for quality and reliability.' },
              { icon: Truck, title: 'Fast Worldwide Shipping', description: 'Get your orders delivered quickly with our reliable partners.' },
              { icon: Award, title: 'Quality Guaranteed', description: '30-day money-back guarantee on all purchases.' },
              { icon: Users, title: '24/7 Concierge Support', description: 'Our dedicated team is always here to help you.' },
              { icon: Package, title: 'Premium Selection', description: 'Curated products from trusted vendors worldwide.' },
            ].map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -6 }}
                className="group relative rounded-2xl p-8 bg-white border transition-all duration-300"
                style={{
                  borderColor: 'rgba(6,78,59,0.10)',
                  boxShadow: '0 1px 0 rgba(6,78,59,0.04), 0 20px 40px -28px rgba(6,78,59,0.25)',
                }}
              >
                {/* Top gold hairline appears on hover */}
                <span
                  className="absolute top-0 left-8 right-8 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)`,
                  }}
                />
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`,
                    boxShadow: `0 8px 24px -10px ${LUX.emerald}`,
                  }}
                >
                  <feature.icon className="h-6 w-6" style={{ color: LUX.goldSoft }} />
                </div>
                <h3 className="text-lg font-serif font-semibold mb-2" style={{ color: LUX.emeraldDeep }}>
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==========================================================
          TRENDING NOW — editorial banner
         ========================================================== */}
      <section className="relative overflow-hidden py-24">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=900&fit=crop)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(120deg, ${LUX.ink} 0%, rgba(2,44,34,0.92) 60%, rgba(4,19,14,0.85) 100%)`,
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-10"
          >
            <div className="inline-flex items-center gap-3 mb-4">
              <span className="h-px w-10" style={{ background: LUX.gold }} />
              <span className="text-[11px] font-semibold tracking-[0.32em] uppercase" style={{ color: LUX.goldSoft }}>
                This Week
              </span>
            </div>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold mb-4 text-white leading-tight">
              Trending Now
              <br />
              <span
                className="italic font-light"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${LUX.goldSoft}, ${LUX.gold})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Curated Selections
              </span>
            </h2>
            <p className="text-base md:text-lg text-white/75 max-w-2xl leading-relaxed">
              Don't miss out on this season's most coveted pieces.{' '}
              <span className="font-semibold" style={{ color: LUX.goldSoft }}>
                Limited stock · Exclusive prices
              </span>
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                tag: 'EDITOR’S PICK',
                title: 'Premium Electronics',
                sub: 'Save up to 60% off',
                img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=600&fit=crop',
                cta: 'Shop Now',
              },
              {
                tag: 'NEW ARRIVAL',
                title: 'Fashion Collection',
                sub: 'New season arrivals',
                img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=600&fit=crop',
                cta: 'Explore',
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                className="relative h-64 rounded-2xl overflow-hidden group cursor-pointer border"
                style={{ borderColor: `${LUX.gold}33` }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                whileHover={{ y: -6 }}
              >
                <img
                  src={card.img}
                  alt={card.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  crossOrigin="anonymous"
                />
                <div
                  className="absolute inset-0 flex flex-col justify-end p-6"
                  style={{
                    background:
                      'linear-gradient(to top, rgba(4,19,14,0.92) 0%, rgba(4,19,14,0.4) 55%, transparent 100%)',
                  }}
                />
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold tracking-[0.22em] uppercase mb-3 w-fit border"
                    style={{
                      color: LUX.emeraldDeep,
                      background: LUX.goldSoft,
                      borderColor: LUX.gold,
                    }}
                  >
                    {card.tag}
                  </span>
                  <h3 className="font-serif text-2xl font-semibold text-white mb-1">{card.title}</h3>
                  <p className="text-white/75 text-sm mb-3">{card.sub}</p>
                  <Link
                    to="/products"
                    className="font-semibold flex items-center gap-1 hover:gap-2 transition-all text-sm"
                    style={{ color: LUX.goldSoft }}
                  >
                    {card.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================================
          FEATURED PRODUCTS
         ========================================================== */}
      <section className="py-24" style={{ background: LUX.cream }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Hand Selected"
            title="Featured Products"
            subtitle="Discover our handpicked collection from verified vendors."
          />

          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <motion.div
                  key={index}
                  className="bg-white rounded-2xl overflow-hidden animate-pulse border border-emerald-900/5"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                >
                  <div className="h-56 bg-gray-100" />
                  <div className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-3" />
                    <div className="h-3 bg-gray-200 rounded mb-4 w-2/3" />
                    <div className="h-6 bg-gray-200 rounded w-1/3" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6"
              variants={staggerChildren}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {products?.slice(0, 8).map((product, index) => (
                <motion.div
                  key={product.id}
                  className="group bg-white rounded-2xl overflow-hidden border transition-all duration-300"
                  style={{
                    borderColor: 'rgba(6,78,59,0.10)',
                    boxShadow: '0 1px 0 rgba(6,78,59,0.04), 0 18px 40px -28px rgba(6,78,59,0.20)',
                  }}
                  variants={fadeInUp}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  whileHover={{ y: -6 }}
                >
                  <div className="relative overflow-hidden h-56 bg-white">
                    <Link to={`/products/${(product as any).slug || product.id}`}>
                      <img
                        src={
                          resolveMediaUrl((product as any).image) ||
                          'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop'
                        }
                        alt={product.name}
                        className="w-full h-full object-contain bg-white p-3 transition-transform duration-700 group-hover:scale-105"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          const fallback =
                            'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop';
                          if (el.src !== fallback) el.src = fallback;
                        }}
                      />
                    </Link>

                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                      style={{ background: 'rgba(4,19,14,0.55)' }}
                    >
                      <Link
                        to={`/products/${(product as any).slug || product.id}`}
                        className="px-5 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform"
                        style={{ background: LUX.goldSoft, color: LUX.emeraldDeep }}
                      >
                        <Eye className="h-4 w-4" />
                        Quick View
                      </Link>
                    </div>

                    <button
                      className="absolute top-3 right-3 rounded-full p-2 shadow-md transition-colors bg-white hover:bg-rose-50"
                      aria-label="Add to wishlist"
                    >
                      <Heart className="h-4.5 w-4.5 text-gray-500 hover:text-rose-500 transition-colors" />
                    </button>
                  </div>

                  <div className="p-4">
                    <h3 className="text-sm font-serif font-semibold mb-0.5 line-clamp-1" style={{ color: LUX.emeraldDeep }}>
                      {product.name}
                    </h3>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 mb-3 line-clamp-1">
                      {(product as any).category_name || 'Uncategorized'}
                    </p>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold" style={{ color: LUX.emeraldDeep }}>
                        ${product.price}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wider uppercase"
                        style={{ color: LUX.emerald, background: 'rgba(6,95,70,0.10)' }}
                      >
                        In Stock
                      </span>
                    </div>

                    <Link
                      to={`/products/${(product as any).slug || product.id}`}
                      className="w-full py-2.5 px-3 rounded-lg text-center text-xs font-semibold tracking-wide text-white transition-all flex items-center justify-center gap-1.5"
                      style={{
                        background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`,
                      }}
                    >
                      View Details
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          <div className="text-center mt-14">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-9 py-3.5 rounded-xl font-semibold tracking-wide text-white transition-all hover:opacity-95"
              style={{
                background: `linear-gradient(135deg, ${LUX.emeraldDeep}, ${LUX.ink})`,
                border: `1px solid ${LUX.gold}55`,
              }}
            >
              View All Products
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ==========================================================
          FLASH DEALS — premium dark section
         ========================================================== */}
      <section className="relative overflow-hidden py-24">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1555421689-d68471e189f2?w=1600&h=900&fit=crop)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(120deg, ${LUX.ink} 0%, rgba(2,44,34,0.92) 60%, rgba(4,19,14,0.92) 100%)`,
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Limited Time"
            title="Flash Deals & Special Offers"
            subtitle="Limited time offers — grab them before they're gone."
            light
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { tag: '50% OFF', title: 'Premium Headphones', sub: 'Limited Stock Available', price: 149, old: 299, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop' },
              { tag: '30% OFF', title: 'Smart Watch Pro', sub: 'Ends in 24 hours', price: 199, old: 285, img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop' },
              { tag: '40% OFF', title: 'Designer Sneakers', sub: 'Flash Sale', price: 89, old: 149, img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop' },
              { tag: '25% OFF', title: 'Luxury Handbag', sub: 'Today Only', price: 179, old: 239, img: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=300&fit=crop' },
            ].map((d, i) => (
              <motion.div
                key={i}
                className="rounded-2xl overflow-hidden group backdrop-blur-md border transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderColor: `${LUX.gold}33`,
                }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
                whileHover={{ y: -8 }}
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={d.img}
                    alt={d.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div
                    className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-semibold tracking-[0.22em] uppercase"
                    style={{ background: LUX.goldSoft, color: LUX.emeraldDeep }}
                  >
                    {d.tag}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-base font-serif font-semibold text-white mb-1">{d.title}</h3>
                  <p className="text-white/55 text-xs mb-4">{d.sub}</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-bold" style={{ color: LUX.goldSoft }}>
                      ${d.price}
                    </span>
                    <span className="text-white/40 line-through text-sm">${d.old}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================================
          MEET OUR TEAM
         ========================================================== */}
      <motion.section
        className="py-24"
        style={{ background: LUX.paper }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Our People"
            title="Meet Our Team"
            subtitle="The passionate people behind TesMarket's success."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Tesfay Teshome',
                role: 'Founder & CEO',
                image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&h=256&q=80',
                description: 'Visionary leader with 10+ years in e-commerce and marketplace development.',
              },
              {
                name: 'Selam Tesfay',
                role: 'Head of Operations',
                image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&h=256&q=80',
                description: 'Operations expert ensuring smooth platform performance and vendor relations.',
              },
              {
                name: 'Mattiyas Tesfay',
                role: 'Chief Technology Officer',
                image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&h=256&q=80',
                description: 'Tech innovator building scalable solutions for the future of e-commerce.',
              },
            ].map((member, index) => (
              <motion.div
                key={index}
                className="bg-white rounded-3xl p-10 text-center border transition-all duration-300"
                style={{
                  borderColor: 'rgba(6,78,59,0.10)',
                  boxShadow: '0 1px 0 rgba(6,78,59,0.04), 0 24px 50px -28px rgba(6,78,59,0.25)',
                }}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                whileHover={{ y: -8 }}
              >
                <div className="relative w-32 h-32 mx-auto mb-6">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(${LUX.gold}, ${LUX.emerald}, ${LUX.gold})`,
                      padding: 3,
                    }}
                  >
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full rounded-full object-cover border-4 border-white"
                    />
                  </div>
                </div>
                <h3 className="text-xl font-serif font-semibold mb-1" style={{ color: LUX.emeraldDeep }}>
                  {member.name}
                </h3>
                <p
                  className="text-[11px] font-semibold tracking-[0.28em] uppercase mb-4"
                  style={{ color: LUX.gold }}
                >
                  {member.role}
                </p>
                <p className="text-gray-600 leading-relaxed text-sm">{member.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ==========================================================
          TRUSTED BRANDS
         ========================================================== */}
      <section className="py-20" style={{ background: LUX.cream }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="In Good Company"
            title="Trusted by Top Brands"
            subtitle="Join thousands of verified vendors selling premium products."
          />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 items-center">
            {[1, 2, 3, 4, 5, 6].map((item, index) => (
              <motion.div
                key={item}
                className="flex items-center justify-center p-6 bg-white rounded-xl border transition-colors hover:border-emerald-900/20"
                style={{ borderColor: 'rgba(6,78,59,0.08)' }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                whileHover={{ scale: 1.04 }}
              >
                <Store className="h-8 w-8" style={{ color: LUX.emerald }} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================================
          SHOP BY CATEGORY
         ========================================================== */}
      <section className="py-24" style={{ background: LUX.paper }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Browse Categories"
            title="Shop by Category"
            subtitle="Explore our curated collection across diverse categories."
          />

          {categoriesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <motion.div
                  key={index}
                  className="bg-white rounded-2xl overflow-hidden animate-pulse border border-emerald-900/5"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                >
                  <div className="h-40 bg-gray-100" />
                  <div className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
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
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                >
                  <Link
                    to={`/products?category=${(category as any).slug || category.id}`}
                    className="block h-full"
                  >
                    <motion.div
                      whileHover={{ y: -6 }}
                      className="rounded-2xl overflow-hidden bg-white border h-full flex flex-col transition-all group"
                      style={{
                        borderColor: 'rgba(6,78,59,0.10)',
                        boxShadow:
                          '0 1px 0 rgba(6,78,59,0.04), 0 18px 40px -28px rgba(6,78,59,0.22)',
                      }}
                    >
                      <div className="relative overflow-hidden h-52">
                        {category.image ? (
                          <>
                            <img
                              src={category.image}
                              alt={category.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                            <div
                              className="absolute inset-0"
                              style={{
                                background:
                                  'linear-gradient(to top, rgba(4,19,14,0.85) 0%, rgba(4,19,14,0.2) 55%, transparent 100%)',
                              }}
                            />
                          </>
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{
                              background: `linear-gradient(135deg, ${LUX.emeraldDeep}, ${LUX.emerald})`,
                            }}
                          >
                            <ShoppingBag className="h-12 w-12" style={{ color: LUX.goldSoft }} />
                          </div>
                        )}

                        <div
                          className="absolute top-3 right-3 px-3 py-1.5 rounded-full"
                          style={{ background: LUX.goldSoft, color: LUX.emeraldDeep }}
                        >
                          <span className="text-[10px] font-semibold tracking-wider uppercase">
                            {(categoryCounts as any)[(category as any).id] ??
                              (category as any).products_count ??
                              (category as any).product_count ??
                              (category as any).items_count ??
                              (category as any).total_products ??
                              (category as any).products?.length ??
                              0}{' '}
                            items
                          </span>
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col">
                        <h3
                          className="text-lg font-serif font-semibold mb-2"
                          style={{ color: LUX.emeraldDeep }}
                        >
                          {category.name}
                        </h3>
                        <p className="text-sm mb-4 line-clamp-2 text-gray-600 flex-1">
                          {category.description || 'Explore our premium selection'}
                        </p>
                        <div className="flex items-center justify-between mt-auto">
                          <span
                            className="text-[11px] font-semibold tracking-[0.22em] uppercase"
                            style={{ color: LUX.gold }}
                          >
                            Browse Collection
                          </span>
                          <ArrowRight
                            className="h-4 w-4 group-hover:translate-x-1 transition-transform"
                            style={{ color: LUX.emerald }}
                          />
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

      {/* ==========================================================
          STATS COUNTER
         ========================================================== */}
      <section className="relative overflow-hidden py-24">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1556740758-90de374c12ad?w=1600&h=900&fit=crop)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(120deg, ${LUX.ink} 0%, rgba(2,44,34,0.95) 100%)`,
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            variants={staggerChildren}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              { icon: Users, number: '10K+', label: 'Happy Customers' },
              { icon: Package, number: '50K+', label: 'Products Sold' },
              { icon: Store, number: '500+', label: 'Trusted Vendors' },
              { icon: Award, number: '99%', label: 'Satisfaction Rate' },
            ].map((stat, index) => (
              <motion.div key={index} className="text-center" variants={fadeInUp}>
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 mx-auto border"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderColor: `${LUX.gold}55`,
                  }}
                >
                  <stat.icon className="h-6 w-6" style={{ color: LUX.goldSoft }} />
                </div>
                <h3 className="font-serif text-4xl md:text-6xl font-semibold mb-2 text-white">
                  {stat.number}
                </h3>
                <p
                  className="text-[11px] font-semibold tracking-[0.28em] uppercase"
                  style={{ color: LUX.goldSoft }}
                >
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==========================================================
          TESTIMONIALS
         ========================================================== */}
      <section className="py-24" style={{ background: LUX.paper }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Testimonials"
            title="What Our Customers Say"
            subtitle={
              <>
                Join{' '}
                <span style={{ color: LUX.emerald }} className="font-semibold">
                  10,000+ satisfied customers
                </span>{' '}
                worldwide.
              </>
            }
          />

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-7"
            variants={staggerChildren}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {displayTestimonials.slice(0, 3).map((testimonial) => (
              <motion.div
                key={testimonial.id}
                className="relative rounded-2xl p-9 bg-white border transition-all"
                style={{
                  borderColor: 'rgba(6,78,59,0.10)',
                  boxShadow:
                    '0 1px 0 rgba(6,78,59,0.04), 0 18px 40px -28px rgba(6,78,59,0.22)',
                }}
                variants={fadeInUp}
                whileHover={{ y: -6 }}
              >
                <div
                  className="absolute -top-px left-9 right-9 h-px"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)`,
                  }}
                />
                <div
                  className="font-serif text-5xl leading-none mb-4 select-none"
                  style={{ color: LUX.goldSoft }}
                >
                  “
                </div>
                <p className="text-gray-700 leading-relaxed mb-7 italic">
                  {testimonial.content}
                </p>
                <div className="flex items-center">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover mr-4 border-2"
                    style={{ borderColor: LUX.gold }}
                    crossOrigin="anonymous"
                  />
                  <div className="flex-1">
                    <h4
                      className="text-sm font-serif font-semibold"
                      style={{ color: LUX.emeraldDeep }}
                    >
                      {testimonial.name}
                    </h4>
                    <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-gray-500">
                      {testimonial.role}
                    </p>
                  </div>
                  <div className="flex">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5 fill-current"
                        style={{ color: LUX.gold }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==========================================================
          BENEFITS — dark, glass cards with gold trims
         ========================================================== */}
      <section className="relative overflow-hidden py-24">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=900&fit=crop)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(120deg, ${LUX.ink} 0%, rgba(2,44,34,0.94) 100%)`,
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Exclusive Benefits"
            title="Why Shop With TesMarket?"
            subtitle="Experience premium shopping with unbeatable benefits."
            light
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Gift, title: 'Free Shipping', desc: 'Get free delivery on all orders over $50. Fast, reliable, and tracked shipping to your doorstep.', tag: 'Orders over $50' },
              { icon: Shield, title: 'Buyer Protection', desc: 'Shop with confidence! Every purchase is protected with our 30-day money-back guarantee.', tag: '30-day guarantee' },
              { icon: Verified, title: 'Verified Vendors', desc: 'All sellers are thoroughly vetted and verified for quality, reliability, and authenticity.', tag: '500+ trusted sellers' },
              { icon: Zap, title: '24/7 Support', desc: 'Our dedicated customer service team is always here to help with any questions or concerns.', tag: 'Instant response' },
              { icon: DollarSign, title: 'Best Prices', desc: 'Compare prices from multiple vendors and get the best deals on premium products.', tag: 'Price match guarantee' },
              { icon: TrendingUp, title: 'Quality Products', desc: 'Every product is carefully curated and quality-checked before listing on our marketplace.', tag: 'Premium selection' },
            ].map((b, i) => (
              <motion.div
                key={i}
                className="rounded-2xl p-8 backdrop-blur-md border transition-all group"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderColor: `${LUX.gold}40`,
                }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -8 }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`,
                    boxShadow: `0 8px 24px -10px ${LUX.emerald}`,
                  }}
                >
                  <b.icon className="h-6 w-6" style={{ color: LUX.goldSoft }} />
                </div>
                <h3 className="text-xl font-serif font-semibold mb-3 text-white">{b.title}</h3>
                <p className="text-white/75 leading-relaxed mb-5 text-sm">{b.desc}</p>
                <div className="flex items-center gap-2" style={{ color: LUX.goldSoft }}>
                  <Check className="h-4 w-4" />
                  <span className="text-[11px] font-semibold tracking-[0.22em] uppercase">
                    {b.tag}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-14">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-9 py-3.5 rounded-xl font-semibold tracking-wide transition-all"
              style={{ background: LUX.goldSoft, color: LUX.emeraldDeep }}
            >
              <Sparkles className="h-5 w-5" />
              Start Shopping Today
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ==========================================================
          PREMIUM GUARANTEE
         ========================================================== */}
      <section className="py-24" style={{ background: LUX.cream }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Our Promise"
            title="The Premium Guarantee"
            subtitle="Shop with complete confidence and peace of mind."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {[
              { icon: Shield, title: '100% Secure Payments', desc: 'Your transactions are protected with industry-leading encryption and security measures.' },
              { icon: Truck, title: 'Fast & Free Shipping', desc: 'Enjoy free worldwide shipping on all orders with tracking and delivery guarantee.' },
              { icon: Award, title: '30-Day Returns', desc: 'Not satisfied? Return any item within 30 days for a full refund, no questions asked.' },
            ].map((g, i) => (
              <motion.div
                key={i}
                className="bg-white rounded-2xl p-9 border transition-all"
                style={{
                  borderColor: 'rgba(6,78,59,0.10)',
                  boxShadow:
                    '0 1px 0 rgba(6,78,59,0.04), 0 18px 40px -28px rgba(6,78,59,0.22)',
                }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -6 }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                  style={{
                    background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`,
                  }}
                >
                  <g.icon className="h-6 w-6" style={{ color: LUX.goldSoft }} />
                </div>
                <h3 className="text-lg font-serif font-semibold mb-3" style={{ color: LUX.emeraldDeep }}>
                  {g.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">{g.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================================
          CTA — newsletter / final
         ========================================================== */}
      <section className="relative overflow-hidden py-28">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=900&fit=crop)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(120deg, ${LUX.ink} 0%, rgba(2,44,34,0.94) 100%)`,
          }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)`,
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)`,
          }}
        />

        <div className="relative max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-3 mb-6">
              <span className="h-px w-10" style={{ background: LUX.gold }} />
              <span className="text-[11px] font-semibold tracking-[0.32em] uppercase" style={{ color: LUX.goldSoft }}>
                Join the Collection
              </span>
              <span className="h-px w-10" style={{ background: LUX.gold }} />
            </div>

            <h2 className="font-serif text-4xl md:text-6xl font-semibold mb-6 text-white leading-[1.05]">
              Ready to Start{' '}
              <span
                className="italic font-light"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${LUX.goldSoft}, ${LUX.gold})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Shopping?
              </span>
            </h2>
            <p className="text-base md:text-lg mb-10 max-w-2xl mx-auto text-white/80 leading-relaxed">
              Join{' '}
              <span className="font-semibold" style={{ color: LUX.goldSoft }}>
                10,000+ satisfied customers
              </span>{' '}
              and discover premium products from verified vendors worldwide.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {!isAuthenticated ? (
                <>
                  <Link to="/register">
                    <motion.button
                      className="px-9 py-3.5 rounded-xl font-semibold tracking-wide flex items-center gap-2 shadow-xl"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.98 }}
                      style={{ background: LUX.goldSoft, color: LUX.emeraldDeep }}
                    >
                      Get Started Free
                      <ArrowRight className="h-5 w-5" />
                    </motion.button>
                  </Link>
                  <Link to="/login">
                    <motion.button
                      className="px-9 py-3.5 rounded-xl font-semibold tracking-wide text-white border hover:bg-white/5 transition-colors"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.98 }}
                      style={{ borderColor: `${LUX.gold}88` }}
                    >
                      Sign In
                    </motion.button>
                  </Link>
                </>
              ) : (
                <Link to="/products">
                  <motion.button
                    className="px-9 py-3.5 rounded-xl font-semibold tracking-wide flex items-center gap-2 shadow-xl"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ background: LUX.goldSoft, color: LUX.emeraldDeep }}
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
      </section>
    </div>
  );
};

export default Home;