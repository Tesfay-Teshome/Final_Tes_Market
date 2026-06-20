import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, User, Mail, Lock, Store, ArrowRight, Sparkles, Shield,
  CheckCircle, Phone, MapPin, FileText, Camera, X, TrendingUp, Award,
  Zap, Globe, Heart, Star, Gift, Crown, Rocket, Target, Users, DollarSign,
  Package, Truck, Headphones, Eye, EyeOff,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { authAPI } from '@/services/api';
import bannerImage from '../images/banner.jpeg';
import FadeIn from '@/components/animations/FadeIn';

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
  path: ['confirm_password'],
}).refine(
  (data) => {
    if (data.user_type === 'vendor') {
      return !!data.store_name && !!data.store_description;
    }
    return true;
  },
  {
    message: 'Store information is required for vendors',
    path: ['store_name'],
  }
);

type RegisterFormData = z.infer<typeof registerSchema>;

// ─── Sub-components ────────────────────────────────────────────────────────────
const FieldLabel = ({ children, isVendor = false }: { children: React.ReactNode; isVendor?: boolean }) => (
  <label
    className="block text-xs font-semibold tracking-[0.16em] uppercase mb-2"
    style={{ color: isVendor ? LUX.gold : LUX.emeraldDeep }}
  >
    {children}
  </label>
);

const inputBase = (isVendor = false) => ({
  border: `1.5px solid ${isVendor ? `${LUX.gold}44` : 'rgba(6,78,59,0.15)'}`,
  background: LUX.paper,
  color: LUX.emeraldDeep,
}) as React.CSSProperties;

const focusStyle = (isVendor = false) => ({
  borderColor: isVendor ? LUX.gold : LUX.emerald,
  boxShadow: `0 0 0 3px ${isVendor ? `${LUX.gold}18` : `${LUX.emerald}18`}`,
});

const blurStyle = (isVendor = false) => ({
  borderColor: isVendor ? `${LUX.gold}44` : 'rgba(6,78,59,0.15)',
  boxShadow: 'none',
});

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <motion.p
      className="mt-1.5 text-xs flex items-center gap-1.5"
      style={{ color: '#dc2626' }}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <span className="w-1 h-1 rounded-full bg-red-600 inline-block" />
      {message}
    </motion.p>
  ) : null;

// ─── Sidebar item variants ─────────────────────────────────────────────────────
const sideItem = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, delay: 0.3 + i * 0.1, ease: 'easeOut' },
  }),
};

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userType, setUserType] = useState<'buyer' | 'vendor'>('buyer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { user_type: 'buyer' },
  });

  useEffect(() => {
    setValue('user_type', userType);
  }, [userType, setValue]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Profile image must be less than 5MB', variant: 'destructive' });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Invalid file type', description: 'Please upload an image file', variant: 'destructive' });
        return;
      }
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setProfileImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeProfileImage = () => {
    setProfileImage(null);
    setProfileImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsSubmitting(true);
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
          toast({ title: 'Registration failed', description: errorMessages, variant: 'destructive' });
        } else {
          toast({ title: 'Registration failed', description: error.response.data.detail || 'An error occurred during registration.', variant: 'destructive' });
        }
      } else {
        toast({ title: 'Registration failed', description: 'An unexpected error occurred. Please try again later.', variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2" style={{ background: LUX.paper }}>

      {/* ═══════════════════════════════════════════════
          LEFT SIDEBAR
         ═══════════════════════════════════════════════ */}
      <motion.div
        className="hidden lg:flex relative overflow-hidden flex-col"
        style={{
          backgroundImage: `url(${bannerImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {/* Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(160deg, ${LUX.ink} 0%, rgba(2,44,34,0.93) 45%, rgba(4,19,14,0.88) 100%)`,
          }}
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

        {/* Gold hairlines with shimmer */}
        <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
          <div style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)`, height: '100%' }} />
          <motion.div
            className="absolute top-0 left-0 w-20 h-full"
            style={{ background: `linear-gradient(90deg, transparent, ${LUX.goldSoft}, transparent)` }}
            animate={shimmerAnimation}
          />
        </div>
        <div className="absolute right-0 top-16 bottom-16 w-px" style={{ background: `linear-gradient(180deg, transparent, ${LUX.gold}, transparent)` }} />

        <div className="relative z-10 flex flex-col h-full p-8 xl:p-10 overflow-y-auto">

          {/* Logo with hover glow */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}>
            <Link to="/" className="inline-flex items-center gap-3">
              <motion.div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: `linear-gradient(135deg, ${LUX.emeraldSoft}, ${LUX.emeraldDeep})`, border: `1px solid ${LUX.gold}55` }}
                whileHover={pulseGlow}
              >
                <ShoppingBag className="h-5 w-5" style={{ color: LUX.goldSoft }} />
              </motion.div>
              <span className="text-xl font-serif font-semibold text-white tracking-wide">TesMarket</span>
            </Link>
          </motion.div>

          {/* Headline */}
          <motion.div
            className="mt-8 mb-6"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
          >
            <div className="inline-flex items-center gap-2.5 mb-3">
              <Sparkles className="h-3.5 w-3.5" style={{ color: LUX.gold }} />
              <span className="text-[9px] font-semibold tracking-[0.32em] uppercase" style={{ color: LUX.goldSoft }}>
                Join Today
              </span>
            </div>
            <h1 className="font-serif text-3xl xl:text-4xl font-semibold text-white leading-[1.1] mb-3">
              Join the Future<br />
              <span
                className="italic font-light"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${LUX.goldSoft}, ${LUX.gold})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                of Commerce
              </span>
            </h1>
            <p className="text-white/65 leading-relaxed text-sm max-w-xs">
              Connect with thousands of customers and vendors to grow your business.
            </p>
          </motion.div>

          {/* Sidebar cards - Compact */}
          <div className="flex flex-col gap-3 flex-1">

            {/* Launch promo - Compact */}
            <motion.div
              custom={0}
              variants={sideItem}
              initial="hidden"
              animate="visible"
              whileHover={{ x: 6, scale: 1.01, transition: { duration: 0.2 } }}
              className="rounded-xl p-3.5 backdrop-blur-md"
              style={{ background: 'rgba(201,162,75,0.08)', border: `1px solid ${LUX.gold}40` }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${LUX.gold}, #B8902F)` }}>
                    <Crown className="h-3.5 w-3.5" style={{ color: LUX.emeraldDeep }} />
                  </div>
                  <span className="text-xs font-serif font-semibold text-white">Launch Your Store</span>
                </div>
                <span className="text-[8px] font-semibold tracking-[0.22em] uppercase px-2 py-0.5 rounded-full" style={{ background: `${LUX.gold}22`, color: LUX.goldSoft, border: `1px solid ${LUX.gold}44` }}>
                  PREMIUM
                </span>
              </div>
              <p className="text-[10px] text-white/60 leading-relaxed">Join 50,000+ successful vendors. Start selling in 24 hours!</p>
              <div className="flex items-center gap-1 mt-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-4 h-4 rounded-full border border-emerald-900" style={{ background: `linear-gradient(135deg, ${LUX.gold}, ${LUX.emerald})` }} />
                ))}
                <span className="text-[9px] text-white/55 ml-1.5">+50K vendors</span>
              </div>
            </motion.div>

            {/* Feature rows - Compact */}
            {[
              { icon: Shield, title: 'Bank-Level Security', sub: '256-bit SSL encryption' },
              { icon: Rocket, title: 'Lightning Fast Setup', sub: 'Get live in 5 minutes' },
              { icon: Globe, title: 'Global Marketplace', sub: 'Reach 150+ countries' },
            ].map((f, i) => (
              <motion.div
                key={i}
                custom={i + 1}
                variants={sideItem}
                initial="hidden"
                animate="visible"
                whileHover={{ x: 6, scale: 1.01, transition: { duration: 0.2 } }}
                className="flex items-center gap-3 rounded-xl p-3 backdrop-blur-md"
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${LUX.gold}25` }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})` }}>
                  <f.icon className="h-4 w-4" style={{ color: LUX.goldSoft }} />
                </div>
                <div>
                  <h4 className="text-xs font-serif font-semibold text-white">{f.title}</h4>
                  <p className="text-[10px] text-white/55 mt-0.5">{f.sub}</p>
                </div>
              </motion.div>
            ))}

            {/* Free first month - Compact */}
            <motion.div
              custom={4}
              variants={sideItem}
              initial="hidden"
              animate="visible"
              whileHover={{ x: 6, scale: 1.01, transition: { duration: 0.2 } }}
              className="rounded-xl p-3.5 backdrop-blur-md"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LUX.gold}18` }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})` }}>
                  <Gift className="h-3.5 w-3.5" style={{ color: LUX.goldSoft }} />
                </div>
                <span className="text-[8px] font-semibold tracking-[0.22em] uppercase px-2 py-0.5 rounded-full" style={{ background: `${LUX.gold}22`, color: LUX.goldSoft, border: `1px solid ${LUX.gold}44` }}>
                  LIMITED
                </span>
              </div>
              <h4 className="text-xs font-serif font-semibold text-white mb-0.5">First Month FREE!</h4>
              <p className="text-[10px] text-white/60 leading-relaxed">No hidden costs. Start earning from day one.</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[9px] text-white/45">Expires in 7 days</span>
                <div className="flex items-center gap-1">
                  <Star className="h-2.5 w-2.5 fill-current" style={{ color: LUX.gold }} />
                  <span className="text-[9px] text-white/55">4.9/5</span>
                </div>
              </div>
            </motion.div>

            {/* Stats - Compact */}
            <motion.div
              custom={5}
              variants={sideItem}
              initial="hidden"
              animate="visible"
              className="rounded-xl p-3.5 backdrop-blur-md"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LUX.gold}18` }}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <TrendingUp className="h-3 w-3" style={{ color: LUX.gold }} />
                <span className="text-[9px] font-semibold tracking-[0.26em] uppercase" style={{ color: LUX.goldSoft }}>
                  Success Story
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: DollarSign, value: '$2M+', label: 'Sales' },
                  { icon: Users, value: '50K+', label: 'Vendors' },
                  { icon: Package, value: '1M+', label: 'Products' },
                  { icon: Award, value: '99.8%', label: 'Rating' },
                ].map((s, i) => (
                  <div key={i} className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
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
              custom={6}
              variants={sideItem}
              initial="hidden"
              animate="visible"
              className="rounded-xl p-3 backdrop-blur-md"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LUX.gold}18` }}
            >
              <div className="flex items-start gap-2.5">
                <div className="font-serif text-2xl leading-none select-none shrink-0" style={{ color: LUX.goldSoft }}>"</div>
                <div className="flex-1">
                  <p className="text-[10px] text-white/60 italic leading-relaxed mb-2">
                    "TesMarket transformed my business into a $100K/month empire!"
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: `linear-gradient(135deg, ${LUX.emeraldSoft}, ${LUX.emeraldDeep})`, color: LUX.goldSoft }}>
                      JD
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-white">John Doe</p>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-2 w-2 fill-current" style={{ color: LUX.gold }} />
                        ))}
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <Heart className="h-2.5 w-2.5 fill-current text-rose-400" />
                      <span className="text-[9px] text-white/45">2.5K</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="mt-6 h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}44, transparent)` }} />
          <p className="mt-3 text-[9px] text-white/30 tracking-wider text-center">© TesMarket · Premium Marketplace</p>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════
          RIGHT — REGISTER FORM
         ═══════════════════════════════════════════════ */}
      <motion.div
        className="flex items-start justify-center min-h-screen px-4 sm:px-6 lg:px-8 py-10 relative overflow-hidden"
        style={{
          background: userType === 'vendor'
            ? `linear-gradient(135deg, ${LUX.paper}, ${LUX.cream})`
            : LUX.paper,
          transition: 'background 0.5s ease'
        }}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {/* Ambient blobs with animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={floatAnimation}
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-[100px] opacity-25"
            style={{ background: `radial-gradient(circle, ${userType === 'vendor' ? LUX.gold : LUX.emeraldSoft}44, transparent)` }}
          />
          <motion.div
            animate={{ ...floatAnimation, transition: { ...floatAnimation.transition, delay: 2 } }}
            className="absolute bottom-0 -left-16 w-72 h-72 rounded-full blur-[80px] opacity-15"
            style={{ background: `radial-gradient(circle, ${userType === 'vendor' ? `${LUX.gold}55` : LUX.gold}33, transparent)` }}
          />
        </div>

        <div className="relative z-10 w-full max-w-lg">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${LUX.emeraldSoft}, ${LUX.emeraldDeep})` }}>
                <ShoppingBag className="h-5 w-5" style={{ color: LUX.goldSoft }} />
              </div>
              <span className="text-xl font-serif font-semibold" style={{ color: LUX.emeraldDeep }}>TesMarket</span>
            </Link>
          </div>

          {/* Card with color transition */}
          <motion.div
            className="rounded-3xl p-6 sm:p-8 shadow-2xl"
            style={{
              background: '#fff',
              border: `1px solid ${userType === 'vendor' ? `${LUX.gold}20` : 'rgba(6,78,59,0.08)'}`,
              boxShadow: `0 40px 100px -30px rgba(4,19,14,0.18), 0 0 0 1px ${userType === 'vendor' ? `${LUX.gold}10` : 'rgba(201,162,75,0.06)'}`,
              transition: 'all 0.5s ease',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Top gold hairline with shimmer */}
            <div className="absolute top-0 left-12 right-12 h-px overflow-hidden rounded-full">
              <div style={{ background: `linear-gradient(90deg, transparent, ${userType === 'vendor' ? LUX.gold : LUX.gold}, transparent)`, height: '100%' }} />
              <motion.div
                className="absolute top-0 left-0 w-16 h-full"
                style={{ background: `linear-gradient(90deg, transparent, ${LUX.goldSoft}, transparent)` }}
                animate={shimmerAnimation}
              />
            </div>

            {/* Header */}
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="inline-flex items-center gap-2.5 mb-3">
                <Sparkles className="h-4 w-4" style={{ color: userType === 'vendor' ? LUX.gold : LUX.gold }} />
                <span className="text-[10px] font-semibold tracking-[0.28em] uppercase" style={{ color: userType === 'vendor' ? LUX.gold : LUX.gold }}>
                  Create Account
                </span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold leading-tight mb-2" style={{ color: LUX.emeraldDeep }}>
                Start Your Journey
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Join thousands of users and start your journey today
              </p>
            </motion.div>

            <motion.form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
            >

              {/* ── Role selector - Mobile Responsive ─────────────────── */}
              <div>
                <FieldLabel isVendor={userType === 'vendor'}>I want to</FieldLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Shop as Buyer - Full width on mobile */}
                  <motion.button
                    type="button"
                    onClick={() => setUserType('buyer')}
                    whileHover={{ scale: 1.01, y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    className="relative flex flex-col sm:flex-row items-center gap-2 sm:gap-3 p-4 sm:p-5 rounded-2xl transition-all duration-200 overflow-hidden"
                    style={
                      userType === 'buyer'
                        ? {
                            border: `2px solid ${LUX.emerald}`,
                            background: `linear-gradient(135deg, ${LUX.emerald}0c, ${LUX.emeraldDeep}0a)`,
                            boxShadow: `0 0 0 3px ${LUX.emerald}18`,
                          }
                        : {
                            border: `1.5px solid rgba(6,78,59,0.15)`,
                            background: LUX.paper,
                          }
                    }
                  >
                    {userType === 'buyer' && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: LUX.emerald }}>
                        <CheckCircle className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <div
                      className="w-12 h-12 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all shrink-0"
                      style={{ background: userType === 'buyer' ? `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})` : 'rgba(6,78,59,0.08)' }}
                    >
                      <User className="h-5 w-5" style={{ color: userType === 'buyer' ? LUX.goldSoft : '#9ca3af' }} />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-sm font-serif font-semibold" style={{ color: userType === 'buyer' ? LUX.emeraldDeep : '#6b7280' }}>
                        Shop as Buyer
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: userType === 'buyer' ? LUX.emerald : '#9ca3af' }}>
                        Discover & purchase
                      </p>
                    </div>
                  </motion.button>

                  {/* Sell as Vendor - Full width on mobile */}
                  <motion.button
                    type="button"
                    onClick={() => setUserType('vendor')}
                    whileHover={{ scale: 1.01, y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    className="relative flex flex-col sm:flex-row items-center gap-2 sm:gap-3 p-4 sm:p-5 rounded-2xl transition-all duration-200 overflow-hidden"
                    style={
                      userType === 'vendor'
                        ? {
                            border: `2px solid ${LUX.gold}`,
                            background: `linear-gradient(135deg, ${LUX.gold}10, ${LUX.gold}06)`,
                            boxShadow: `0 0 0 3px ${LUX.gold}18`,
                          }
                        : {
                            border: `1.5px solid rgba(6,78,59,0.15)`,
                            background: LUX.paper,
                          }
                    }
                  >
                    {userType === 'vendor' && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: LUX.gold }}>
                        <CheckCircle className="h-3 w-3" style={{ color: LUX.emeraldDeep }} />
                      </div>
                    )}
                    <div
                      className="w-12 h-12 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all shrink-0"
                      style={{ background: userType === 'vendor' ? `linear-gradient(135deg, ${LUX.gold}, #B8902F)` : 'rgba(6,78,59,0.08)' }}
                    >
                      <Store className="h-5 w-5" style={{ color: userType === 'vendor' ? LUX.emeraldDeep : '#9ca3af' }} />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-sm font-serif font-semibold" style={{ color: userType === 'vendor' ? LUX.emeraldDeep : '#6b7280' }}>
                        Sell as Vendor
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: userType === 'vendor' ? '#B8902F' : '#9ca3af' }}>
                        Launch & grow
                      </p>
                    </div>
                  </motion.button>
                </div>
              </div>

              {/* ── Profile image ─────────────────────────────── */}
              <div>
                <FieldLabel isVendor={userType === 'vendor'}>Profile Image <span className="normal-case text-gray-400 font-normal tracking-normal">(Optional)</span></FieldLabel>
                <div className="flex items-center gap-4">
                  <div className="shrink-0">
                    {profileImagePreview ? (
                      <div className="relative w-16 h-16 rounded-2xl overflow-hidden" style={{ border: `2px solid ${userType === 'vendor' ? LUX.gold : LUX.emerald}55` }}>
                        <img src={profileImagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={removeProfileImage}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{ background: 'rgba(6,78,59,0.06)', border: `1.5px dashed ${userType === 'vendor' ? LUX.gold : 'rgba(6,78,59,0.20)'}66` }}
                      >
                        <User className="h-7 w-7" style={{ color: 'rgba(6,78,59,0.30)' }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                      style={{ border: `1.5px dashed ${userType === 'vendor' ? LUX.gold : LUX.emerald}55`, color: userType === 'vendor' ? '#B8902F' : LUX.emerald, background: userType === 'vendor' ? `${LUX.gold}06` : `${LUX.emerald}06` }}
                    >
                      <Camera className="h-4 w-4" />
                      {profileImage ? 'Change Image' : 'Upload Photo'}
                    </button>
                    <p className="text-[10px] text-gray-400 mt-1">Max 5MB · JPG, PNG, GIF</p>
                  </div>
                </div>
              </div>

              {/* ── Name row ──────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel isVendor={userType === 'vendor'}>First Name</FieldLabel>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                    <input
                      {...register('first_name')}
                      placeholder="First name"
                      className="w-full pl-10 pr-3 h-11 rounded-xl text-sm font-medium outline-none transition-all"
                      style={inputBase(userType === 'vendor')}
                      onFocus={e => Object.assign(e.currentTarget.style, focusStyle(userType === 'vendor'))}
                      onBlur={e => Object.assign(e.currentTarget.style, blurStyle(userType === 'vendor'))}
                    />
                  </div>
                  <FieldError message={errors.first_name?.message} />
                </div>
                <div>
                  <FieldLabel isVendor={userType === 'vendor'}>Last Name</FieldLabel>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                    <input
                      {...register('last_name')}
                      placeholder="Last name"
                      className="w-full pl-10 pr-3 h-11 rounded-xl text-sm font-medium outline-none transition-all"
                      style={inputBase(userType === 'vendor')}
                      onFocus={e => Object.assign(e.currentTarget.style, focusStyle(userType === 'vendor'))}
                      onBlur={e => Object.assign(e.currentTarget.style, blurStyle(userType === 'vendor'))}
                    />
                  </div>
                  <FieldError message={errors.last_name?.message} />
                </div>
              </div>

              {/* ── Email + Username row ───────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel isVendor={userType === 'vendor'}>Email Address</FieldLabel>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-3 h-11 rounded-xl text-sm font-medium outline-none transition-all"
                      style={inputBase(userType === 'vendor')}
                      onFocus={e => Object.assign(e.currentTarget.style, focusStyle(userType === 'vendor'))}
                      onBlur={e => Object.assign(e.currentTarget.style, blurStyle(userType === 'vendor'))}
                    />
                  </div>
                  <FieldError message={errors.email?.message} />
                </div>
                <div>
                  <FieldLabel isVendor={userType === 'vendor'}>Username</FieldLabel>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                    <input
                      {...register('username')}
                      placeholder="your_username"
                      className="w-full pl-10 pr-3 h-11 rounded-xl text-sm font-medium outline-none transition-all"
                      style={inputBase(userType === 'vendor')}
                      onFocus={e => Object.assign(e.currentTarget.style, focusStyle(userType === 'vendor'))}
                      onBlur={e => Object.assign(e.currentTarget.style, blurStyle(userType === 'vendor'))}
                    />
                  </div>
                  <FieldError message={errors.username?.message} />
                </div>
              </div>

              {/* ── Password row ───────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel isVendor={userType === 'vendor'}>Password</FieldLabel>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      className="w-full pl-10 pr-10 h-11 rounded-xl text-sm font-medium outline-none transition-all"
                      style={inputBase(userType === 'vendor')}
                      onFocus={e => Object.assign(e.currentTarget.style, focusStyle(userType === 'vendor'))}
                      onBlur={e => Object.assign(e.currentTarget.style, blurStyle(userType === 'vendor'))}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-1">
                      {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </button>
                  </div>
                  <FieldError message={errors.password?.message} />
                </div>
                <div>
                  <FieldLabel isVendor={userType === 'vendor'}>Confirm Password</FieldLabel>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                    <input
                      {...register('confirm_password')}
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repeat password"
                      className="w-full pl-10 pr-10 h-11 rounded-xl text-sm font-medium outline-none transition-all"
                      style={inputBase(userType === 'vendor')}
                      onFocus={e => Object.assign(e.currentTarget.style, focusStyle(userType === 'vendor'))}
                      onBlur={e => Object.assign(e.currentTarget.style, blurStyle(userType === 'vendor'))}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-1">
                      {showConfirm ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </button>
                  </div>
                  <FieldError message={errors.confirm_password?.message} />
                </div>
              </div>

              {/* ── Phone + Address ────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel isVendor={userType === 'vendor'}>Phone <span className="normal-case text-gray-400 font-normal tracking-normal">(Optional)</span></FieldLabel>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                    <input
                      {...register('phone')}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-10 pr-3 h-11 rounded-xl text-sm font-medium outline-none transition-all"
                      style={inputBase(userType === 'vendor')}
                      onFocus={e => Object.assign(e.currentTarget.style, focusStyle(userType === 'vendor'))}
                      onBlur={e => Object.assign(e.currentTarget.style, blurStyle(userType === 'vendor'))}
                    />
                  </div>
                  <FieldError message={errors.phone?.message} />
                </div>
                <div>
                  <FieldLabel isVendor={userType === 'vendor'}>Address <span className="normal-case text-gray-400 font-normal tracking-normal">(Optional)</span></FieldLabel>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-gray-400 z-10" />
                    <textarea
                      {...register('address')}
                      placeholder="Your address"
                      rows={2}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all resize-none"
                      style={inputBase(userType === 'vendor')}
                      onFocus={e => Object.assign(e.currentTarget.style, focusStyle(userType === 'vendor'))}
                      onBlur={e => Object.assign(e.currentTarget.style, blurStyle(userType === 'vendor'))}
                    />
                  </div>
                  <FieldError message={errors.address?.message} />
                </div>
              </div>

              {/* ── Vendor-only fields ────────────────────────── */}
              <AnimatePresence>
                {userType === 'vendor' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="rounded-2xl p-4 space-y-3"
                      style={{ background: `${LUX.gold}06`, border: `1px solid ${LUX.gold}30` }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${LUX.gold}, #B8902F)` }}>
                          <Store className="h-3 w-3" style={{ color: LUX.emeraldDeep }} />
                        </div>
                        <span className="text-xs font-semibold tracking-[0.18em] uppercase" style={{ color: LUX.gold }}>
                          Store Details
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <FieldLabel isVendor={true}>Store Name</FieldLabel>
                          <div className="relative">
                            <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                            <input
                              {...register('store_name')}
                              placeholder="Your store name"
                              className="w-full pl-10 pr-3 h-11 rounded-xl text-sm font-medium outline-none transition-all"
                              style={inputBase(true)}
                              onFocus={e => Object.assign(e.currentTarget.style, focusStyle(true))}
                              onBlur={e => Object.assign(e.currentTarget.style, blurStyle(true))}
                            />
                          </div>
                          <FieldError message={errors.store_name?.message} />
                        </div>
                        <div>
                          <FieldLabel isVendor={true}>Store Description</FieldLabel>
                          <div className="relative">
                            <FileText className="absolute left-3.5 top-3 h-4 w-4 text-gray-400 z-10" />
                            <textarea
                              {...register('store_description')}
                              placeholder="Describe what you sell"
                              rows={2}
                              className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all resize-none"
                              style={inputBase(true)}
                              onFocus={e => Object.assign(e.currentTarget.style, focusStyle(true))}
                              onBlur={e => Object.assign(e.currentTarget.style, blurStyle(true))}
                            />
                          </div>
                          <FieldError message={errors.store_description?.message} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <input type="hidden" {...register('user_type')} />

              {/* ── Submit ────────────────────────────────────── */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: isSubmitting ? 1 : 1.02, y: isSubmitting ? 0 : -2 }}
                whileTap={{ scale: 0.98 }}
                className="relative w-full h-12 rounded-xl font-semibold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
                style={{
                  background: userType === 'vendor'
                    ? `linear-gradient(135deg, ${LUX.gold}, #B8902F)`
                    : `linear-gradient(135deg, ${LUX.emeraldSoft}, ${LUX.emeraldDeep})`,
                  color: userType === 'vendor' ? LUX.emeraldDeep : '#fff',
                  boxShadow: userType === 'vendor'
                    ? `0 12px 35px -8px ${LUX.gold}88`
                    : `0 12px 35px -8px ${LUX.emerald}88`,
                }}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)` }}
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
                    Creating Account…
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>

              {/* Sign in link */}
              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold transition-colors hover:opacity-80" style={{ color: userType === 'vendor' ? '#B8902F' : LUX.emerald }}>
                  Sign in
                </Link>
              </p>
            </motion.form>

            {/* Social login */}
            <div className="mt-6">
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" style={{ borderColor: 'rgba(6,78,59,0.10)' }} />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 text-xs font-medium text-gray-400 bg-white">Or continue with</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold transition-all"
                  style={{ border: `1.5px solid rgba(6,78,59,0.12)`, background: '#fff', color: LUX.emeraldDeep }}
                >
                  <img className="h-4 w-4" src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" />
                  Google
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold transition-all"
                  style={{ border: `1.5px solid rgba(6,78,59,0.12)`, background: '#fff', color: LUX.emeraldDeep }}
                >
                  <img className="h-4 w-4" src="https://www.svgrepo.com/show/475647/facebook-color.svg" alt="Facebook" />
                  Facebook
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;