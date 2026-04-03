import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { storefrontAPI, cartAPI, resolveMediaUrl, storeReviewAPI } from '@/services/api';
import {
  Search,
  Star,
  ShoppingCart,
  ShoppingBag,
  Heart,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Package,
  ArrowRight,
  X,
  Globe,
  Instagram,
  Facebook,
  Twitter,
  Store,
  CheckCircle,
  Clock,
  Truck,
  Send,
  RefreshCw,
  ShieldCheck,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

type Vendor = {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
};

type Store = {
  id: number;
  slug: string;
  display_name: string;
  logo_url?: string | null;
  banner_url?: string | null;
  theme_preset: string;
  primary_color: string;
  accent_color: string;
  about?: string;
  meta_description?: string;
  socials?: Record<string, any>;
  homepage_layout?: any[];
};

const StorefrontPage: React.FC = () => {
  const { slug } = useParams();
  const [store, setStore] = useState<Store | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeReviews, setStoreReviews] = useState<any[]>([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const { toast } = useToast();
  const productsSectionRef = useRef<HTMLDivElement>(null);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Review form state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const resolveProductImage = (p: any): string | null => {
    const candidate = p?.images?.[0]?.image_url || p?.images?.[0]?.image || p?.image_url || p?.thumbnail || p?.image || null;
    return resolveMediaUrl(candidate) || null;
  };

  const botanicalSerif = "font-serif tracking-tight text-white/95 leading-tight";
  const botanicalPill = "px-5 py-2 rounded-full bg-white/[0.03] backdrop-blur-md text-[10px] font-black uppercase tracking-[0.2em] text-white/60 shadow-lg border border-white/5 hover:border-white/10 transition-all cursor-default";
  const botanicalNav = "bg-white/[0.02] rounded-full border border-white/5 shadow-2xl backdrop-blur-3xl px-12 py-4";

  const themeVars = useMemo(() => {
    const primary = store?.primary_color || '#10B981';
    const accent = store?.accent_color || '#3CFF9E';
    const buttonColor = store?.socials?.buttonColor || primary;
    const cardBgColor = store?.socials?.cardBgColor || '#0b141a';
    const headingFont = store?.socials?.headingFont || 'Inter';
    const bodyFont = store?.socials?.bodyFont || 'Inter';
    const headingFontSize = store?.socials?.headingFontSize || 'medium';
    const buttonRounding = store?.socials?.buttonRounding || 'pill';

    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r || 0}, ${g || 0}, ${b || 0}`;
    };

    const getHeadingSize = (level: 'h1' | 'h2' | 'h3' | 'h4') => {
      const scales = {
        small: { h1: 'text-5xl', h2: 'text-3xl', h3: 'text-xl', h4: 'text-lg' },
        medium: { h1: 'text-7xl', h2: 'text-5xl', h3: 'text-3xl', h4: 'text-xl' },
        large: { h1: 'text-9xl', h2: 'text-7xl', h3: 'text-5xl', h4: 'text-3xl' },
      };
      return scales[headingFontSize as 'small' | 'medium' | 'large']?.[level] || scales.medium[level];
    };

    const roundingClass =
      buttonRounding === 'square' ? 'rounded-none' :
        buttonRounding === 'rounded' ? 'rounded-2xl' : 'rounded-full';

    return {
      ['--store-primary' as any]: primary,
      ['--store-accent' as any]: accent,
      ['--store-btn-bg' as any]: buttonColor,
      ['--store-card-bg' as any]: cardBgColor,
      ['--store-heading-font' as any]: headingFont,
      ['--store-body-font' as any]: bodyFont,
      ['--store-primary-rgb' as any]: hexToRgb(primary),
      ['--store-accent-rgb' as any]: hexToRgb(accent),
      getHeadingSize,
      roundingClass,
      headingFontSize
    };
  }, [store]);

  const { getHeadingSize, roundingClass } = themeVars;

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      storefrontAPI.getPublicStore(slug),
      storefrontAPI.getPublicProducts(slug, { page: 1, page_size: 12 }),
      storeReviewAPI.getReviews(slug).catch(() => ({ data: { results: [] } })),
    ])
      .then(([storeRes, productsRes, reviewsRes]) => {
        const s = storeRes.data?.store;
        const p = productsRes.data?.results || productsRes.data || [];
        setStore(s);
        setProducts(p);
        setStoreReviews(reviewsRes.data?.results || reviewsRes.data || []);

        // Prioritize vendor from store object, fallback to first product's vendor
        const v = storeRes.data?.vendor || s?.vendor || p[0]?.vendor;
        setVendor(v);
      })
      .catch((e) => setError(e?.response?.data?.detail || 'Failed to load store'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleAddToCart = async (product: any) => {
    try {
      await cartAPI.addItem(product.id, 1);
      toast({ title: 'Success', description: 'Item added to cart' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add item' });
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#03060a] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#3CFF9E] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div
      className="min-h-screen bg-[#03060a] selection:bg-[var(--store-accent)]/30 pb-10 overflow-x-hidden relative"
      style={{
        ...themeVars,
        fontFamily: `var(--store-body-font), sans-serif`
      } as React.CSSProperties}
    >
      {/* 0. DYNAMIC STORE BANNER (Global Background) */}
      <div className="absolute inset-0 w-full h-[580px] pointer-events-none">
        <img
          src={resolveMediaUrl(store?.banner_url) || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80"}
          className="w-full h-full object-cover brightness-50"
          alt="Store Banner"
        />
        {/* Full gradient from top-to-bottom — no naked strip */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#03060a]/70 via-[#03060a]/50 to-[#03060a]" />
      </div>

      {/* 1. GLOBAL NAVBAR SPACER (Navbar is 80px tall) */}
      <div className="h-[80px] w-full relative z-10" />

      {/* 2. TOP UTILITY HEADER - Sticky below Navbar */}
      <div className="w-full bg-white/[0.02] backdrop-blur-2xl border-b border-white/5 py-3 px-6 sticky top-[80px] z-40 text-white transition-all duration-500 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5 text-xs font-bold uppercase tracking-widest text-white/40">
            <div className="flex items-center gap-2">
              <Store className="w-3 h-3 text-[var(--store-accent)]" />
              <span className="text-white/60">{store?.display_name || slug}</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-2">
              <Globe className="w-3 h-3" />
              <span>{store?.socials?.shipsTo || 'Ships Worldwide'}</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex gap-4">
              {store?.socials?.facebook && <a href={store.socials.facebook} target="_blank" rel="noreferrer"><Facebook className="w-4 h-4 opacity-40 hover:opacity-100 cursor-pointer transition-opacity" /></a>}
              {store?.socials?.twitter && <a href={store.socials.twitter} target="_blank" rel="noreferrer"><Twitter className="w-4 h-4 opacity-40 hover:opacity-100 cursor-pointer transition-opacity" /></a>}
              {store?.socials?.instagram && <a href={store.socials.instagram} target="_blank" rel="noreferrer"><Instagram className="w-4 h-4 opacity-40 hover:opacity-100 cursor-pointer transition-opacity" /></a>}
              {!store?.socials?.facebook && !store?.socials?.twitter && !store?.socials?.instagram && (
                <>
                  <Facebook className="w-4 h-4 opacity-20 cursor-default" />
                  <Twitter className="w-4 h-4 opacity-20 cursor-default" />
                  <Instagram className="w-4 h-4 opacity-20 cursor-default" />
                </>
              )}
            </div>
            <button
              onClick={() => setShowContactModal(true)}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full hover:bg-[var(--store-primary)] hover:text-black transition-all border border-white/10"
            >
              <MessageCircle className="w-3 h-3" />
              Contact
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 text-white">
        {/* Breadcrumbs */}
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-4 text-xs font-bold uppercase tracking-widest text-white/20">
          <Link to="/" className="hover:text-white transition-colors">Back to Marketplace</Link>
          <span className="mx-3 opacity-20">|</span>
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <span className="mx-2"> &gt; </span>
          <span className="hover:text-white transition-colors">Vendors</span>
          <span className="mx-2"> &gt; </span>
          <span className="text-white/60">{store?.display_name || slug}</span>
        </div>

        {!store?.homepage_layout && (
          <>
            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-10 pb-12 flex flex-col items-center text-center">
              <div className="relative mb-10 group">
                <div className="w-44 h-44 rounded-full border border-white/10 p-2 bg-white/[0.02] backdrop-blur-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] flex items-center justify-center overflow-hidden transition-all duration-700 group-hover:scale-105 group-hover:border-[var(--store-accent)]/30">
                  {store?.logo_url ? (
                    <img src={resolveMediaUrl(store.logo_url)} className="w-full h-full object-cover rounded-full" alt={store.display_name} />
                  ) : (
                    <div className="w-full h-full bg-white/5 rounded-full flex items-center justify-center">
                      <Store className="w-20 h-20 text-white/10" />
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full border border-[var(--store-primary)]/30 animate-pulse opacity-20 pointer-events-none scale-110" />
                <div className="absolute inset-0 rounded-full border border-[var(--store-primary)]/20 animate-ping opacity-10 pointer-events-none" />
              </div>

              <h1
                className={`${getHeadingSize('h1')} font-medium mb-6 leading-none tracking-tight text-white/95 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]`}
                style={{ fontFamily: `var(--store-heading-font), serif` }}
              >
                {store?.display_name || slug}
              </h1>
              <p className="text-xl md:text-3xl font-serif italic text-[var(--store-accent)]/60 mb-12 tracking-wide font-light">
                {store?.socials?.valueProposition || "Experience the art of artisanal excellence"}
              </p>

              <div className="flex flex-wrap justify-center gap-4">
                {(store?.socials?.storeTraits || "100% Organic, Cruelty Free, Small Business")
                  .split(',')
                  .map((trait: string) => (
                    <div key={trait} className={botanicalPill}><span>{trait.trim()}</span></div>
                  ))}
              </div>
            </div>

            {/* Quick Stats (Real Data Only) */}
            <div className="max-w-7xl mx-auto px-6 lg:px-12 mb-16">
              <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-3xl p-6 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-8 shadow-2xl">
                <div className="flex items-center gap-5 p-4 rounded-2xl hover:bg-white/[0.03] transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-5 h-5 text-[var(--store-accent)]" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{products.length > 0 ? `${products.length}+` : '—'}</div>
                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Products Available</div>
                  </div>
                </div>
                <div className="flex items-center gap-5 p-4 rounded-2xl hover:bg-white/[0.03] transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-[var(--store-accent)]" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{store?.socials?.shipsTo || 'Worldwide'}</div>
                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Ships To</div>
                  </div>
                </div>
                <div className="flex items-center gap-5 p-4 rounded-2xl hover:bg-white/[0.03] transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-[var(--store-accent)]" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{store?.socials?.deliveryTime || '2–5 Days'}</div>
                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Delivery Time</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Search Bar */}
            <div className="max-w-7xl mx-auto px-6 lg:px-12 mb-16">
              <div className="relative max-w-2xl mx-auto">
                <input
                  type="text"
                  placeholder="Search products in this store..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-full py-4 px-8 text-sm text-white focus:outline-none focus:border-[var(--store-accent)]/40 transition-all font-medium placeholder:text-white/20 backdrop-blur-xl"
                />
                <Search className="absolute right-7 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              </div>
            </div>
          </>
        )}

        {/* CATALOG SECTION */}
        <div ref={productsSectionRef} className="max-w-7xl mx-auto px-6 lg:px-12 pb-8">
          <div className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-6">
              <div className="w-1.5 h-12 bg-[var(--store-primary)]" />
              <h2
                className={`${botanicalSerif} ${getHeadingSize('h2')} font-medium text-white`}
                style={{ fontFamily: `var(--store-heading-font), serif` }}
              >
                Featured Products
              </h2>
            </div>
            <div className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-all text-white/80 hover:text-white">
              View All Products
              <ArrowRight className="w-4 h-4 text-[var(--store-accent)]" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {products.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="overflow-hidden group shadow-2xl border border-white/5 flex flex-col h-full hover:shadow-[0_45px_90px_-20px_rgba(0,0,0,0.6)] hover:border-[var(--store-primary)]/30 transition-all duration-700 relative"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.01)',
                  borderRadius: roundingClass === 'rounded-full' ? '2.5rem' : roundingClass === 'rounded-2xl' ? '1.5rem' : '0',
                  boxShadow: 'inset 0 1px 1px 0 rgba(255,255,255,0.05)'
                }}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-white/[0.02]">
                  <img
                    src={resolveProductImage(product) || 'https://images.unsplash.com/photo-1591348122449-02525d743a1a?w=600&h=800&q=80'}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  {i % 4 === 0 && <span className="absolute top-6 left-6 bg-rose-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">Sale</span>}
                  {i % 4 === 3 && <span className="absolute top-6 left-6 bg-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">Hot</span>}
                  <button className="absolute top-6 right-6 p-4 bg-white/90 backdrop-blur-md rounded-2xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-xl hover:scale-110 active:scale-95">
                    <Heart className="w-5 h-5 text-gray-400 hover:text-rose-500 transition-colors" />
                  </button>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-5 md:p-8 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs font-black text-[var(--store-primary)] uppercase tracking-[0.25em] opacity-100">Handmade Quality</div>
                    <div className="flex items-center gap-2 opacity-30 group-hover:opacity-100 transition-all duration-500">
                      <CheckCircle className="w-4 h-4 text-[var(--store-primary)]" />
                      <span className="text-xs font-black uppercase text-white tracking-widest">Verified</span>
                    </div>
                  </div>

                  <h3 className={`${botanicalSerif} text-white/95 text-2xl font-black mb-4 line-clamp-2 leading-[1.15] group-hover:text-[var(--store-primary)] transition-colors duration-500`}>
                    {product.name}
                  </h3>

                  <div className="flex items-center gap-2 mb-6">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-3 h-3 text-yellow-500 fill-yellow-500 shadow-sm" />)}
                    </div>
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em] ml-2">(124 Ratings)</span>
                  </div>

                  <div className="mt-auto pt-6 border-t border-white/5 space-y-5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-black text-white/20 uppercase tracking-widest">Price</span>
                      <div className="text-2xl font-black tracking-tight text-white drop-shadow-sm">{product.price_formatted || `$${product.price}`}</div>
                    </div>

                    <button
                      onClick={() => handleAddToCart(product)}
                      className={`w-full flex items-center justify-center gap-3 py-3.5 text-black ${roundingClass} text-xs font-black uppercase tracking-[0.15em] hover:bg-white hover:scale-[1.02] active:scale-95 transition-all duration-500 shadow-xl`}
                      style={{ backgroundColor: 'var(--store-btn-bg)' }}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Trust Badges Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 py-12 border-y border-white/5">
            {[
              { title: 'Free Shipping', sub: 'On orders over $75', icon: Truck },
              { title: '30-Day Returns', sub: 'Easy returns guarantee', icon: RefreshCw },
              { title: 'Secure Payment', sub: '100% Secure Checkout', icon: ShieldCheck },
              { title: '24/7 Support', sub: 'Dedicated help line', icon: MessageCircle },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0 group hover:border-[var(--store-accent)]/50 transition-colors">
                  <item.icon className="w-6 h-6 text-[var(--store-accent)]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white uppercase tracking-widest mb-1">{item.title}</div>
                  <div className="text-xs text-white/40 uppercase font-bold">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 6. ENRICHED CONTENT SECTIONS */}
          <div className="mt-32 space-y-32">
            {/* Values & Philosophy */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                {
                  title: 'Pure Craftsmanship',
                  desc: 'Every item is meticulously handcrafted in small batches to preserve the integrity of our botanical ingredients.',
                  icon: Award,
                  color: 'text-amber-400'
                },
                {
                  title: 'Eco-Conscious',
                  desc: 'We prioritize sustainability from seed to shelf, using 100% plastic-free packaging and ethically sourced materials.',
                  icon: Globe,
                  color: 'text-emerald-400'
                },
                {
                  title: 'Direct Support',
                  desc: 'Your purchase directly empowers independent makers and supports traditional artisanal communities.',
                  icon: Heart,
                  color: 'text-rose-400'
                }
              ].map((v, i) => (
                <div key={i} className="group p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all duration-500">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <v.icon className={`w-6 h-6 ${v.color}`} />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-4 uppercase tracking-tight">{v.title}</h4>
                  <p className="text-sm text-white/40 leading-relaxed font-medium">{v.desc}</p>
                </div>
              ))}
            </div>

            {/* Our Story / AI Description Section */}
            <div className="relative overflow-hidden rounded-[4rem] border border-white/5 bg-white/[0.01] backdrop-blur-3xl p-8 md:p-16 lg:p-24 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
              <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[var(--store-primary)]/5 to-transparent pointer-events-none" />
              <div className="max-w-3xl relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-px bg-[var(--store-primary)]" />
                  <span className="text-xs font-black uppercase tracking-[0.3em] text-[var(--store-primary)]">The Artisan's Journey</span>
                </div>
                <h3
                  className={`${botanicalSerif} ${getHeadingSize('h2')} font-medium text-white mb-10 leading-tight`}
                  style={{ fontFamily: `var(--store-heading-font), serif` }}
                >
                  Crafting a legacy of <span className="italic text-[var(--store-accent)]">Natural Excellence</span>
                </h3>
                <div className="space-y-8">
                  <p className="text-xl text-white/90 leading-relaxed italic font-serif">
                    {store?.socials?.description || store?.about || "Our journey began with a simple belief: that nature holds the ultimate secrets to health and beauty. We have spent years perfecting our traditional recipes to bring you products that are as effective as they are pure."}
                  </p>
                  <p className="text-lg text-white/40 leading-relaxed">
                    {store?.socials?.metaTitle ? `At ${store.display_name}, we are dedicated to ${store.socials.metaTitle.toLowerCase()}.` : ""} Founded on the principles of transparency and purity, {store?.display_name || slug} is more than just a brand. It is a dedication to the art of slows living and the beauty of handcrafted goods. Every choice we make, from our organic ingredients to our eco-friendly packaging, is a step towards a more beautiful and sustainable future.
                  </p>
                </div>
              </div>
            </div>
          </div>


          {/* Review & About Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-32">

            {/* Write a Review */}
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-1 h-8 bg-[var(--store-primary)] rounded-full" />
                <h3
                  className={`${botanicalSerif} ${getHeadingSize('h3')} font-medium`}
                  style={{ fontFamily: `var(--store-heading-font), serif` }}
                >
                  Leave a Review
                </h3>
              </div>

              {currentUser ? (
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 shadow-xl flex-1">
                  {/* Reviewer identity */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full overflow-hidden border border-white/10 shrink-0 bg-white/5 flex items-center justify-center">
                      {(currentUser as any).avatar_url ? (
                        <img src={resolveMediaUrl((currentUser as any).avatar_url)} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white/60 text-lg font-bold">
                          {((currentUser as any).first_name || (currentUser as any).full_name || (currentUser as any).email || 'U')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{(currentUser as any).full_name || (currentUser as any).first_name || (currentUser as any).email}</div>
                      <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">Reviewing as yourself</div>
                    </div>
                  </div>

                  {/* Star rating picker */}
                  <div className="mb-5">
                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Your Rating</div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setReviewHover(star)}
                          onMouseLeave={() => setReviewHover(0)}
                          onClick={() => setReviewRating(star)}
                          className="transition-transform hover:scale-125"
                        >
                          <Star
                            className={`w-7 h-7 transition-colors ${star <= (reviewHover || reviewRating)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-white/20'
                              }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Review text */}
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share your experience with this store..."
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-[var(--store-accent)]/40 transition-all mb-5"
                  />

                  <button
                    onClick={async () => {
                      if (!reviewRating) {
                        toast({ variant: 'destructive', title: 'Please select a rating' });
                        return;
                      }
                      if (!reviewText.trim()) {
                        toast({ variant: 'destructive', title: 'Please write a review' });
                        return;
                      }
                      try {
                        await storeReviewAPI.submitReview(slug!, { rating: reviewRating, comment: reviewText });
                        toast({ title: 'Review Submitted', description: 'Your review is now pending vendor approval.' });
                        setReviewSubmitted(true);
                        setReviewText('');
                        setReviewRating(0);
                      } catch (err: any) {
                        toast({ variant: 'destructive', title: 'Error', description: err.response?.data?.detail || 'Failed to submit review' });
                      }
                    }}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-[var(--store-primary)] text-black rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                  >
                    <Send className="w-4 h-4" />
                    Submit Review
                  </button>
                </div>
              ) : (
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-10 text-center flex-1 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-5 border border-white/10">
                    <Star className="w-7 h-7 text-white/20" />
                  </div>
                  <p className="text-white/40 text-sm font-medium mb-5">Sign in to leave a review for this store</p>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--store-primary)] text-black rounded-full text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
                  >
                    Sign In to Review
                  </Link>
                </div>
              )}
            </div>

            {/* About Merchant */}
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-1 h-8 bg-[var(--store-primary)] rounded-full" />
                <h3
                  className={`${botanicalSerif} ${getHeadingSize('h3')} font-medium`}
                  style={{ fontFamily: `var(--store-heading-font), serif` }}
                >
                  About {store?.display_name || slug}
                </h3>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 shadow-xl flex-1">
                {/* Vendor avatar */}
                <div className="flex items-center gap-5 mb-7">
                  <div className="w-16 h-16 rounded-full overflow-hidden border border-white/10 shrink-0 bg-white/5">
                    {vendor?.avatar_url ? (
                      <img src={resolveMediaUrl(vendor.avatar_url)} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-white/40 text-xl font-bold">
                          {(vendor?.full_name || 'V')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-base font-bold text-white">{vendor?.full_name || 'Store Owner'}</div>
                    <div className="text-[10px] font-bold text-[var(--store-accent)] uppercase tracking-widest mt-1">Verified Merchant</div>
                  </div>
                </div>

                {/* Store description */}
                {(store?.about || store?.socials?.valueProposition) && (
                  <p className="text-sm text-white/60 leading-relaxed mb-7 border-l-2 border-[var(--store-primary)]/30 pl-5">
                    {store.socials?.valueProposition || store.about}
                  </p>
                )}

                {/* Contact info */}
                <div className="space-y-4">
                  {vendor?.email && (
                    <a href={`mailto:${vendor.email}`} className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[var(--store-accent)]/30 transition-colors shrink-0">
                        <Mail className="w-4 h-4 text-[var(--store-accent)]" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Email</div>
                        <div className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">{vendor.email}</div>
                      </div>
                    </a>
                  )}
                  {vendor?.phone && (
                    <a href={`tel:${vendor.phone}`} className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[var(--store-accent)]/30 transition-colors shrink-0">
                        <Phone className="w-4 h-4 text-[var(--store-accent)]" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Phone</div>
                        <div className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">{vendor.phone}</div>
                      </div>
                    </a>
                  )}
                  {vendor?.address && (
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-[var(--store-accent)]" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Address</div>
                        <div className="text-sm font-medium text-white/70">{vendor.address}</div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setShowContactModal(true)}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-3 border border-white/10 rounded-xl text-xs font-bold text-white/60 uppercase tracking-widest hover:bg-white/[0.03] hover:text-white transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Contact This Vendor
                  </button>
                  <Store className="w-10 h-10 text-white/20" />
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight text-center md:text-left drop-shadow-sm" style={{ fontFamily: `var(--store-heading-font), serif` }}>
                  {store?.display_name || slug}
                </h2>
                <p className="text-sm text-white/50 max-w-sm text-center md:text-left leading-relaxed mt-2 font-medium">
                  {store?.socials?.valueProposition || store?.about || "Experience the art of artisanal excellence"}
                </p>

                <div className="flex items-center gap-5 mt-6">
                  {store?.socials?.instagram && <a href={store.socials.instagram} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5 hover:bg-white/10 hover:border-[var(--store-accent)]/30 text-white/50 hover:text-white transition-all"><Instagram className="w-4 h-4" /></a>}
                  {store?.socials?.facebook && <a href={store.socials.facebook} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5 hover:bg-white/10 hover:border-[var(--store-accent)]/30 text-white/50 hover:text-white transition-all"><Facebook className="w-4 h-4" /></a>}
                  {store?.socials?.twitter && <a href={store.socials.twitter} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5 hover:bg-white/10 hover:border-[var(--store-accent)]/30 text-white/50 hover:text-white transition-all"><Twitter className="w-4 h-4" /></a>}
                </div>
              </div>

            </div>
          </div>

          {/* Approved Reviews Section */}
          {storeReviews && storeReviews.length > 0 && (
            <div className="mt-20">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-1 h-8 bg-[var(--store-primary)] rounded-full" />
                <h3
                  className={`${botanicalSerif} ${getHeadingSize('h3')} font-medium`}
                  style={{ fontFamily: `var(--store-heading-font), serif` }}
                >
                  what our client says about us
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {storeReviews.map((review) => (
                  <div key={review.id} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl flex flex-col">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 shrink-0 bg-white/5 flex items-center justify-center">
                        {review.buyer_image ? (
                          <img src={review.buyer_image} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white/60 text-lg font-bold">
                            {((review.buyer_full_name || review.buyer_name || 'U')[0]).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{review.buyer_full_name || review.buyer_name}</div>
                        <div className="text-[10px] font-bold text-[var(--store-accent)] uppercase tracking-widest mt-1">Verified Buyer</div>
                      </div>
                    </div>
                    <div className="flex gap-1 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed italic border-l-2 border-[var(--store-primary)]/30 pl-4">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider & Copyright */}
          <div className="relative z-10 mt-12 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-center gap-6">
            <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
              © {new Date().getFullYear()} {store?.display_name || slug}. All Rights Reserved.
            </div>
            <Link to="/" className="inline-flex items-center gap-3 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] hover:text-[var(--store-accent)] transition-colors">
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              Back to Marketplace
            </Link>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showContactModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-[#0b141a] rounded-[3rem] p-12 border border-white/10 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-3xl font-black text-white uppercase tracking-tight">Contact Vendor</h3>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="p-4 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
              <div className="grid gap-6">
                {/* Digital Channels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-black uppercase tracking-widest text-[11px]">
                  <button className="flex items-center gap-6 p-6 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-white group border border-white/5 hover:border-[var(--store-accent)]/30">
                    <MessageCircle className="w-6 h-6 text-[var(--store-accent)] group-hover:scale-110 transition-transform" />
                    Chat Now
                  </button>
                  <a
                    href={`mailto:${vendor?.email || 'support@example.com'}`}
                    className="flex items-center gap-6 p-6 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-white group border border-white/5 hover:border-[var(--store-accent)]/30"
                  >
                    <Mail className="w-6 h-6 text-[var(--store-accent)] group-hover:scale-110 transition-transform" />
                    Send Email
                  </a>
                  {vendor?.phone && (
                    <a
                      href={`tel:${vendor.phone}`}
                      className="flex items-center gap-6 p-6 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-white group border border-white/5 hover:border-[var(--store-accent)]/30 md:col-span-2"
                    >
                      <Phone className="w-6 h-6 text-[var(--store-accent)] group-hover:scale-110 transition-transform" />
                      Call {vendor.phone}
                    </a>
                  )}
                </div>

                {/* Physical Location */}
                {vendor?.address && (
                  <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-3">Our Location</div>
                    <div className="flex items-start gap-4 text-white/80">
                      <MapPin className="w-5 h-5 text-[var(--store-accent)] shrink-0" />
                      <span className="text-sm font-bold">{vendor.address}</span>
                    </div>
                  </div>
                )}

                {/* Social Media Connect */}
                <div className="pt-4 border-t border-white/5">
                  <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4 text-center">Connect with us</div>
                  <div className="flex justify-center gap-8">
                    <Instagram className="w-6 h-6 opacity-40 hover:opacity-100 hover:text-[var(--store-accent)] transition-all cursor-pointer" />
                    <Facebook className="w-6 h-6 opacity-40 hover:opacity-100 hover:text-[var(--store-accent)] transition-all cursor-pointer" />
                    <Twitter className="w-6 h-6 opacity-40 hover:opacity-100 hover:text-[var(--store-accent)] transition-all cursor-pointer" />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StorefrontPage;