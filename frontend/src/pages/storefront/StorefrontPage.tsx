import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { storefrontAPI, cartAPI } from '@/services/api';
import {
  Search,
  Star,
  ShoppingCart,
  ShoppingBag,
  Heart,
  MessageCircle,
  Filter,
  ChevronDown,
  Check,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Award,
  TrendingUp,
  Users,
  Package,
  ArrowRight,
  Menu,
  X,
  Globe,
  Instagram,
  Facebook,
  Twitter,
  RefreshCw,
  Eye,
  Store,
  CheckCircle,
  ShieldCheck,
  Clock,
  Truck
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
  const [showContactModal, setShowContactModal] = useState(false);
  const { toast } = useToast();
  const productsSectionRef = useRef<HTMLDivElement>(null);

  const resolveProductImage = (p: any): string | null => {
    const candidate = p?.images?.[0]?.image_url || p?.images?.[0]?.image || p?.image_url || p?.thumbnail || p?.image || null;
    if (!candidate) return null;
    const url = String(candidate);
    if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
    if (url.startsWith('/')) return url;
    return `/${url}`;
  };

  const botanicalSerif = "font-serif tracking-tight text-white";
  const botanicalPill = "px-4 py-1.5 rounded-full bg-white text-[10px] font-black uppercase tracking-widest text-[#1a2b3c] shadow-md border border-white/20";
  const botanicalNav = "bg-[#0b141a] rounded-full border border-white/5 shadow-2xl backdrop-blur-3xl";

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
    ])
      .then(([storeRes, productsRes]) => {
        const s = storeRes.data?.store;
        const p = productsRes.data?.results || productsRes.data || [];
        setStore(s);
        setProducts(p);

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
    <div className="min-h-screen bg-[#070b0f] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#3CFF9E] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div
      className="min-h-screen bg-[#070b0f] selection:bg-[var(--store-accent)]/30 pb-10 overflow-x-hidden relative"
      style={{
        ...themeVars,
        fontFamily: `var(--store-body-font), sans-serif`
      } as React.CSSProperties}
    >
      {/* 0. DYNAMIC STORE BANNER (Global Background) */}
      <div className="absolute top-0 left-0 right-0 z-0 h-[750px] overflow-hidden pointer-events-none">
        {store?.banner_url ? (
          <img src={store.banner_url} className="w-full h-full object-cover opacity-60 grayscale-[10%]" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a2b3c] to-[#070b0f]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#070b0f]/20 via-[#070b0f]/80 to-[#070b0f]"></div>
      </div>

      {/* 1. GLOBAL NAVBAR SPACER (Navbar is 80px tall) */}
      <div className="h-[80px] w-full relative z-10" />

      {/* 2. TOP UTILITY HEADER (Mini Header) - Sticky below Navbar */}
      <div className="w-full bg-[#0b141a]/80 backdrop-blur-md border-b border-white/5 py-2 px-6 sticky top-[80px] z-40 text-white transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-white/40">
            <div className="flex items-center gap-2">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span className="text-white/80">4.9/5 (12,846 Orders)</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-2">
              <Eye className="w-3 h-3" />
              <span>12.3K Views</span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40">
              <Globe className="w-3 h-3" />
              <span>Ships Worldwide</span>
            </div>
            <div className="flex items-center gap-4 border-l border-white/10 pl-6">
              <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full hover:bg-[var(--store-primary)] hover:text-black transition-all border border-white/10 group">
                <Heart className="w-3 h-3 group-hover:fill-current" />
                Favorite Vendor (12.3K)
              </button>
              <div className="flex gap-4">
                <Facebook className="w-4 h-4 opacity-40 hover:opacity-100 cursor-pointer transition-opacity" />
                <Twitter className="w-4 h-4 opacity-40 hover:opacity-100 cursor-pointer transition-opacity" />
                <Instagram className="w-4 h-4 opacity-40 hover:opacity-100 cursor-pointer transition-opacity" />
              </div>
            </div>
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
                <div className="w-44 h-44 rounded-full border-4 border-white/10 p-1.5 bg-[#0b141a]/60 backdrop-blur-2xl shadow-2xl flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-110">
                  {store?.logo_url ? (
                    <img src={store.logo_url} className="w-full h-full object-cover rounded-full" />
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
                className={`${botanicalSerif} ${getHeadingSize('h1')} font-black mb-8 leading-[0.9] tracking-tighter shadow-sm`}
                style={{ fontFamily: `var(--store-heading-font), serif` }}
              >
                {store?.display_name || slug}
              </h1>
              <p className={`${botanicalSerif} text-2xl md:text-3xl italic text-white/60 mb-12`}>
                {store?.socials?.valueProposition || "Handcrafted with love & pure ingredients"}
              </p>

              <div className="flex flex-wrap justify-center gap-4">
                {(store?.socials?.storeTraits || "100% Organic, Cruelty Free, Small Business")
                  .split(',')
                  .map((trait: string) => (
                    <div key={trait} className={botanicalPill}><span>{trait.trim()}</span></div>
                  ))}
              </div>
            </div>

            {/* Stats Bar */}
            <div className="max-w-7xl mx-auto px-6 lg:px-12 mb-16">
              <div className="bg-[#0b141a]/80 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-10 grid grid-cols-2 md:grid-cols-5 gap-10">
                {[
                  { label: 'Orders Completed', value: '12,846', icon: ShoppingBag },
                  { label: 'Average Rating', value: '4.9/5', icon: Star },
                  { label: 'Shipping Time', value: '2-3 Days', icon: Truck },
                  { label: 'Standard Shipping', value: 'FREE', icon: CheckCircle },
                  { label: 'Global Reach', value: '48 Countries', icon: Globe },
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col items-center text-center space-y-3 p-4 rounded-3xl hover:bg-white/[0.02] transition-colors group">
                    <stat.icon className="w-7 h-7 text-[var(--store-accent)] mb-2 group-hover:scale-110 transition-transform" />
                    <div className="text-2xl font-bold text-white tracking-tighter">{stat.value}</div>
                    <div className="text-xs font-semibold text-white/50 uppercase tracking-[0.2em]">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Main Navigation */}
            <div className="max-w-7xl mx-auto px-6 lg:px-12 mb-12">
              <div className={`${botanicalNav} px-10 py-4 flex items-center justify-between gap-12`}>
                <div className="hidden lg:flex items-center gap-12">
                  {['Shop All', 'Soaps & Skincare', 'Candles', 'Bath & Body', 'Home & Living', 'Gift Sets'].map((nav) => (
                    <button key={nav} className="text-sm font-bold text-white/80 hover:text-[var(--store-accent)] uppercase tracking-widest transition-all hover:scale-105 active:scale-95">
                      {nav}
                    </button>
                  ))}
                </div>
                <div className="flex-1 relative max-w-sm ml-auto">
                  <input
                    type="text"
                    placeholder="Search products..."
                    className="w-full bg-white/5 border border-white/10 rounded-full py-3 px-8 text-sm text-white focus:outline-none focus:border-[var(--store-accent)]/50 transition-all font-bold placeholder:text-white/40"
                  />
                  <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                </div>
              </div>
            </div>

            {/* Category Strip */}
            <div className="max-w-7xl mx-auto px-6 lg:px-12 mb-24 overflow-x-auto no-scrollbar">
              <div className="flex gap-12 min-w-max pb-6">
                {[
                  { label: 'Best Sellers', count: '10 Items', img: '1605264964521-357519101b08' },
                  { label: 'Organic Soaps', count: '24 Items', img: '1602928321679-560bb453f190' },
                  { label: 'Soy Candles', count: '18 Items', img: '1591348122449-02525d743a1a' },
                  { label: 'Bath Bombs', count: '13 Items', img: '1596755090749-7d1424b360ae' },
                  { label: 'Face Care', count: '15 Items', img: '1612817288484-6f916006741a' },
                ].map((cat, i) => (
                  <div key={i} className="flex items-center gap-4 bg-white/[0.03] border border-white/5 rounded-full pr-10 py-3 pl-3 hover:bg-white/[0.08] transition-all cursor-pointer group">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 overflow-hidden relative">
                      <img src={`https://images.unsplash.com/photo-${cat.img}?w=200&h=200&q=80`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-black/20" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white uppercase tracking-widest mb-0.5">{cat.label}</div>
                      <div className="text-xs font-medium text-white/40 uppercase tracking-widest">{cat.count}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* CATALOG SECTION */}
        <div ref={productsSectionRef} className="max-w-7xl mx-auto px-6 lg:px-12 pb-32">
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
                className="overflow-hidden group shadow-2xl border border-white/5 flex flex-col h-full hover:shadow-[0_45px_90px_-20px_rgba(0,0,0,0.5)] hover:border-[var(--store-primary)]/30 transition-all duration-700"
                style={{ backgroundColor: 'var(--store-card-bg)', borderRadius: roundingClass === 'rounded-full' ? '2rem' : roundingClass === 'rounded-2xl' ? '1.5rem' : '0' }}
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
                <div className="p-8 flex-1 flex flex-col">
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
            <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-[#0b141a]/40 backdrop-blur-3xl p-16 lg:p-24">
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


          {/* Info Sections: Reviews & About */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-32">
            {/* Reviews */}
            <div>
              <div className="flex items-center justify-between mb-12">
                <h3
                  className={`${botanicalSerif} ${getHeadingSize('h3')} font-medium`}
                  style={{ fontFamily: `var(--store-heading-font), serif` }}
                >
                  What Our Customers Say
                </h3>
                <span className="text-xs font-bold text-white/40 uppercase tracking-widest border-b border-white/10 pb-1 cursor-pointer hover:text-white transition-colors">View All Reviews</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 relative overflow-hidden group hover:border-[var(--store-accent)]/30 transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--store-accent)]/5 blur-3xl rounded-full" />
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[var(--store-accent)]">
                    <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&q=80" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="text-lg font-black text-white">Sarah M. <span className="text-[var(--store-accent)] text-xs ml-2">Verified Buyer</span></div>
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-3 h-3 text-yellow-500 fill-yellow-500" />)}
                    </div>
                  </div>
                </div>
                <p className="text-xl italic text-white/80 leading-relaxed mb-10">
                  "Absolutely amazing! The products smell incredible and my skin has never been softer."
                </p>
                <div className="flex items-center justify-between pt-8 border-t border-white/5 font-black uppercase tracking-widest">
                  <div className="text-[10px] text-white/30">2 Days Ago</div>
                  <div className="px-6 py-2 bg-[var(--store-accent)]/10 border border-[var(--store-accent)]/20 rounded-full text-[9px] text-[var(--store-accent)]">+ Botanical Care</div>
                </div>
              </div>
            </div>

            {/* About Merchant */}
            <div>
              <h3
                className={`${botanicalSerif} ${getHeadingSize('h3')} font-medium mb-12`}
                style={{ fontFamily: `var(--store-heading-font), serif` }}
              >
                About {store?.display_name || slug}
              </h3>
              <div className="flex flex-col md:flex-row gap-10 items-start">
                <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white/5 shrink-0 grayscale hover:grayscale-0 transition-all duration-700">
                  <img src={vendor?.avatar_url || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&q=80"} className="w-full h-full object-cover" />
                </div>
                <div className="space-y-6 flex-1">
                  <div className="flex items-center gap-3 text-sm font-bold text-[var(--store-accent)] uppercase tracking-widest mb-4">
                    <MapPin className="w-4 h-4" /> {store?.socials?.makerIdentity || vendor?.full_name || "Authorized Merchant"}
                  </div>
                  <p className="text-lg text-white/70 leading-relaxed italic border-l-2 border-[var(--store-primary)]/30 pl-8 bg-white/[0.02] py-4 rounded-r-2xl">
                    "{store?.socials?.valueProposition || store?.about || "Experience curated quality and community-driven commerce."}"
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-[var(--store-accent)]/30 transition-colors">
                        <Mail className="w-4 h-4 text-[var(--store-accent)]" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Direct Email</div>
                        <div className="text-sm font-bold text-white/80">{vendor?.email || "No email provided"}</div>
                      </div>
                    </div>
                    {vendor?.phone && (
                      <div className="flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-[var(--store-accent)]/30 transition-colors">
                          <Phone className="w-4 h-4 text-[var(--store-accent)]" />
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Phone Number</div>
                          <div className="text-sm font-bold text-white/80">{vendor?.phone}</div>
                        </div>
                      </div>
                    )}
                    {vendor?.address && (
                      <div className="flex items-center gap-4 group md:col-span-2">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-[var(--store-accent)]/30 transition-colors">
                          <MapPin className="w-4 h-4 text-[var(--store-accent)]" />
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Business Address</div>
                          <div className="text-sm font-bold text-white/80">{vendor?.address}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-8 pt-6 border-t border-white/5 font-black uppercase tracking-widest">
                    <div>
                      <div className="text-3xl text-white">5+</div>
                      <div className="text-sm text-white/40">Years on Market</div>
                    </div>
                    <div>
                      <div className="text-3xl text-white">8,900+</div>
                      <div className="text-sm text-white/40">Happy Customers</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Senior Designer Information & Footer Grid */}
          <div className="mt-24 pt-20 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
            <div className="space-y-8">
              <h4 className="text-xs font-bold text-[var(--store-primary)] uppercase tracking-[0.3em] flex items-center gap-4">
                <span className="w-8 h-px bg-[var(--store-primary)]/40" /> Shop Excellence
              </h4>
              <ul className="space-y-5">
                {['Handmade Quality', 'Sustainable Sourcing', 'Eco-Packaging', 'Fair Trade'].map(p => (
                  <li key={p} className="flex items-center gap-4 text-xs font-bold text-white/40 uppercase tracking-widest hover:text-[var(--store-accent)] transition-colors cursor-pointer group">
                    <Check className="w-4 h-4 text-[var(--store-accent)] group-hover:scale-110 transition-transform" /> {p}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-8">
              <h4 className="text-xs font-bold text-[var(--store-primary)] uppercase tracking-[0.3em] flex items-center gap-4">
                <span className="w-8 h-px bg-[var(--store-primary)]/40" /> Shipping & Delivery
              </h4>
              <div className="space-y-6">
                <div className="flex items-start gap-4 group">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 group-hover:border-[var(--store-accent)]/30 transition-colors">
                    <Clock className="w-4 h-4 text-[var(--store-accent)]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-widest mb-1">Reliable Processing</div>
                    <div className="text-[10px] text-white/30 uppercase font-bold italic">2-4 Business Days</div>
                  </div>
                </div>
                <div className="flex items-start gap-4 group">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 group-hover:border-[var(--store-accent)]/30 transition-colors">
                    <Package className="w-4 h-4 text-[var(--store-accent)]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-widest mb-1">Global Shipping</div>
                    <div className="text-[10px] text-white/30 uppercase font-bold italic">Tracked & Insured</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h4 className="text-xs font-bold text-[var(--store-primary)] uppercase tracking-[0.3em] flex items-center gap-4">
                <span className="w-8 h-px bg-[var(--store-primary)]/40" /> Direct Support
              </h4>
              <div className="space-y-6">
                <button onClick={() => setShowContactModal(true)} className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-left group">
                  <MessageCircle className="w-5 h-5 text-[var(--store-accent)]" />
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-widest">Chat with Us</div>
                    <div className="text-[9px] text-white/30 font-bold uppercase mt-0.5">Instant Response</div>
                  </div>
                </button>
                <a href={`mailto:${store?.socials?.supportEmail || 'hello@store.com'}`} className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group">
                  <Mail className="w-5 h-5 text-[var(--store-accent)]" />
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-widest">Email Support</div>
                    <div className="text-[9px] text-white/30 font-bold uppercase mt-0.5">{store?.socials?.supportEmail || 'support@store.com'}</div>
                  </div>
                </a>
              </div>
            </div>

            <div className="bg-[#0b141a]/80 backdrop-blur-3xl rounded-[2.5rem] p-10 border border-white/10 relative overflow-hidden group">
              <div className="relative z-10">
                <h4
                  className={`${botanicalSerif} text-2xl font-medium text-white mb-2`}
                  style={{ fontFamily: `var(--store-heading-font), serif` }}
                >
                  Join the Inner Circle
                </h4>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-8">Exclusive 15% OFF your first order</p>
                <div className="space-y-4">
                  <input type="text" placeholder="Enter your email" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-xs text-white focus:outline-none focus:border-[var(--store-accent)]/50 transition-all font-bold placeholder:text-white/20" />
                  <button className="w-full bg-[var(--store-primary)] text-black py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white hover:scale-105 transition-all shadow-xl">Subscribe Now</button>
                </div>
              </div>
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
    </div>
  );
};

export default StorefrontPage;