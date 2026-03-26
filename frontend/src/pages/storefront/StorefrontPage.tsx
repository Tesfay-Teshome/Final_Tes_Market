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
  Twitter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { useMutation } from '@tanstack/react-query';

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
  socials?: Record<string, string>;
  homepage_layout?: Array<{
    id: string;
    type: 'hero' | 'product_grid' | 'image_text' | 'featured_collection';
    settings: any;
  }>;
  navigation?: Array<{
    id: string;
    label: string;
    type: 'collection' | 'page' | 'link';
    href?: string;
  }>;
};

const StorefrontPage: React.FC = () => {
  const { slug } = useParams();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [vendorOwnsStore, setVendorOwnsStore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { toast } = useToast();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const productsSectionRef = useRef<HTMLDivElement>(null);

  const resolveProductImage = (p: any): string | null => {
    const candidate =
      p?.images?.[0]?.image_url ||
      p?.images?.[0]?.image ||
      p?.image_url ||
      p?.thumbnail ||
      p?.image ||
      null;
    if (!candidate) return null;
    const url = String(candidate);
    if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
    // Handle relative URLs from backend like /media/... or media/...
    if (url.startsWith('/')) return url;
    return `/${url}`;
  };

  const emeraldCardBase = "bg-[#0A1016]/80 backdrop-blur-3xl border border-white/10 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.05] before:to-transparent before:pointer-events-none";
  const emeraldIconWrap = "bg-white/[0.03] border border-white/10 shadow-[inner_0_0_20px_rgba(0,0,0,0.5)]";
  const emeraldIcon = "text-[#3CFF9E] drop-shadow-[0_0_8px_rgba(60,255,158,0.5)]";
  const emeraldLabel = "text-[10px] font-bold uppercase tracking-widest text-[#3CFF9E] mb-4 block";

  const themeVars = useMemo(() => ({
    ['--store-primary' as any]: store?.primary_color || '#10B981',
    ['--store-accent' as any]: store?.accent_color || '#111827',
  }), [store]);

  const locationText = useMemo(() => {
    const s: any = store as any;
    const u: any = user as any;
    return (
      s?.location ||
      [s?.city, s?.country].filter(Boolean).join(', ') ||
      [u?.city, u?.country].filter(Boolean).join(', ') ||
      null
    );
  }, [store, user]);

  const sinceText = useMemo(() => {
    const s: any = store as any;
    const u: any = user as any;
    const iso = s?.created_at || u?.date_joined || null;
    if (!iso) return null;
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
    } catch {
      return null;
    }
  }, [store, user]);

  // Derived collections from currently loaded products
  const collections = useMemo(() => {
    const map = new Map<string, number>();
    (products || []).forEach((p: any) => {
      const cat = p?.category?.name || p?.category || 'Uncategorized';
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    const arr = Array.from(map.entries()).map(([name, count]) => ({ name, count }));
    arr.sort((a, b) => a.name.localeCompare(b.name));
    return [{ name: 'All', count: products.length }, ...arr.filter(c => c.name !== 'All')];
  }, [products]);

  // Vendor list derived from products
  const vendors = useMemo(() => {
    const set = new Set<string>();
    (products || []).forEach((p: any) => {
      const vendorName = p?.vendor?.store_name || p?.vendor?.username || p?.vendor_name || p?.vendor || null;
      if (vendorName) set.add(String(vendorName));
    });
    const list = Array.from(set).sort((a, b) => a.localeCompare(b));
    return ['All', ...list];
  }, [products]);

  // Extra sidebar filters state
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [ratingMin, setRatingMin] = useState<number>(0);
  const [vendorSelected, setVendorSelected] = useState<string>('All');

  // Visible products after client-side filters
  const visibleProducts = useMemo(() => {
    const selCat = String(selectedCategory ?? 'All').toLowerCase();
    const selVendor = String(vendorSelected ?? 'All').toLowerCase();
    const min = priceMin ? parseFloat(priceMin) : null;
    const max = priceMax ? parseFloat(priceMax) : null;

    return (products || []).filter((p: any) => {
      // Category filter
      if (selCat !== 'all') {
        const cat = p?.category?.name || p?.category;
        if (String(cat || '').toLowerCase() !== selCat) return false;
      }
      // Vendor filter
      if (selVendor !== 'all') {
        const vName = p?.vendor?.store_name || p?.vendor?.username || p?.vendor_name || p?.vendor;
        if (String(vName || '').toLowerCase() !== selVendor) return false;
      }
      // Price filter
      const priceVal = parseFloat(String(p?.price || p?.price_value || 0));
      if (min !== null && !Number.isNaN(min) && priceVal < min) return false;
      if (max !== null && !Number.isNaN(max) && priceVal > max) return false;
      // Rating filter
      const ratingVal = Number(p?.rating ?? 0);
      if (ratingVal < ratingMin) return false;
      return true;
    });
  }, [products, selectedCategory, vendorSelected, priceMin, priceMax, ratingMin]);

  useEffect(() => {
    let mounted = true;
    if (!slug) return;
    setLoading(true);
    setError(null);
    Promise.all([
      storefrontAPI.getPublicStore(slug),
      storefrontAPI.getPublicProducts(slug, { page: 1, page_size: pageSize, sort }),
    ])
      .then(async ([storeRes, productsRes]) => {
        if (!mounted) return;
        setStore(storeRes.data?.store);
        const data = productsRes.data || {};
        const items = data.results || data || [];
        setProducts(items);
        setHasMore(!!data.next);
        // detect vendor ownership silently (ignore auth errors)
        try {
          const me = await storefrontAPI.getVendorStore();
          if (me?.data?.slug && me.data.slug === slug) setVendorOwnsStore(true);
        } catch { }
      })
      .catch((e) => {
        console.error('Failed to load storefront:', e);
        setError(e?.response?.data?.detail || 'Failed to load store');
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [slug, pageSize, sort]);

  const fetchMore = async () => {
    if (!slug || loading) return;
    try {
      const nextPage = page + 1;
      const res = await storefrontAPI.getPublicProducts(slug, { page: nextPage, page_size: pageSize, sort, search });
      const data = res.data || {};
      const items = data.results || [];
      setProducts(prev => [...prev, ...items]);
      setPage(nextPage);
      setHasMore(!!data.next);
    } catch (e) {
      console.error('Load more failed', e);
    }
  };

  const runSearch = async (q: string) => {
    if (!slug) return;
    setSearch(q);
    setPage(1);
    try {
      const res = await storefrontAPI.getPublicProducts(slug, { page: 1, page_size: pageSize, sort, search: q });
      const data = res.data || {};
      const items = data.results || data || [];
      setProducts(items);
      setHasMore(!!data.next);
    } catch (e) {
      console.error('Search failed', e);
    }
  };

  const addToCartMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartAPI.addItem(productId, quantity),
    onSuccess: (response, variables) => {
      if (response?.data) {
        import('@/store/slices/cartSlice').then(({ setCart }) => {
          dispatch(setCart(response.data));
        });
      }
      toast({
        title: 'Added to cart',
        description: 'Item has been added to your cart.',
      });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.detail || 'Failed to add item to cart';
      toast({ title: 'Add to cart failed', description: msg, variant: 'destructive' });
    },
  });

  const handleAddToCart = (product: any) => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication required',
        description: 'Please login to add items to cart.',
        variant: 'destructive',
      });
      return;
    }
    if (user?.user_type && user.user_type !== 'buyer') {
      toast({
        title: 'Action not allowed',
        description: 'Only buyers can add items to the cart.',
        variant: 'destructive',
      });
      return;
    }
    const pid = String(product?.id || product?.slug);
    if (!pid) {
      toast({ title: 'Missing product', description: 'Product ID not found.', variant: 'destructive' });
      return;
    }
    addToCartMutation.mutate({ productId: pid, quantity: 1 });
  };

  const handleFollowStore = () => {
    setIsFollowing(!isFollowing);
    toast({
      title: isFollowing ? 'Unfollowed store' : 'Following store',
      description: isFollowing
        ? `You are no longer following ${store?.display_name || slug}`
        : `You are now following ${store?.display_name || slug}`,
    });
  };

  const handleContactSeller = () => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication required',
        description: 'Please login to contact the seller.',
        variant: 'destructive',
      });
      return;
    }
    setShowContactModal(true);
  };


  const renderSection = (section: any, index: number) => {
    const { type, settings } = section;

    switch (type) {
      case 'hero':
        return (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="relative w-full h-[500px] md:h-[700px] overflow-hidden rounded-[2.5rem] mb-12 group"
          >
            <div className="absolute inset-0">
              {store?.banner_url ? (
                <img
                  src={store.banner_url}
                  alt="Hero banner"
                  className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-1000"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-900/40 to-[#070B0F]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-[#070B0F]" />
            </div>

            <div className="relative h-full flex items-center justify-center text-center text-white px-6">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="max-w-4xl mx-auto"
              >
                <span className={emeraldLabel}>Featured Collection</span>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 leading-[0.9] tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
                  {settings.headline || `Welcome to ${store?.display_name || 'Our Store'}`}
                </h1>
                <p className="text-lg md:text-xl mb-10 text-emerald-100/60 max-w-2xl mx-auto font-medium uppercase tracking-widest text-[12px]">
                  Architecting premium commerce experiences.
                </p>
                {settings.cta && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => window.location.href = settings.cta}
                    className="inline-flex items-center gap-3 bg-[#3CFF9E] text-black px-10 py-5 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] hover:bg-[#2ae88e] transition-all shadow-[0_0_30px_rgba(60,255,158,0.3)]"
                  >
                    {settings.cta_label || 'Initiate Catalog'}
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                )}
              </motion.div>
            </div>
          </motion.div>
        );

      case 'product_grid':
        return (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="mb-20"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <span className={emeraldLabel}>Curated Selection</span>
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                  {settings.title || 'Manifest Items'}
                </h2>
              </div>
              <div className="h-[1px] flex-1 bg-white/5 mx-8 hidden md:block" />
              <button className="text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-white transition-all flex items-center gap-2">
                Full Registry <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {products.slice(0, 8).map((product, idx) => (
                <motion.div
                  key={product.id || product.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className={`${emeraldCardBase} rounded-[2rem] overflow-hidden group hover:-translate-y-2 transition-all duration-500`}
                >
                  <div className="aspect-[4/5] overflow-hidden bg-white/5 relative">
                    {resolveProductImage(product) ? (
                      <img
                        src={resolveProductImage(product) as string}
                        alt={product.name}
                        className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700 group-hover:opacity-100"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/10" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070B0F]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <button className="absolute top-6 right-6 p-3 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                      <Heart className="w-5 h-5 text-white/70 hover:text-rose-500 transition-colors" />
                    </button>
                  </div>
                  <div className="p-8">
                    <Link to={`/products/${product.slug || product.id}`}>
                      <h3 className="font-black text-lg mb-3 line-clamp-2 text-white/90 hover:text-[#3CFF9E] transition-colors uppercase tracking-tight">
                        {product.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 mb-6">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-3 h-3 ${i <= 4 ? 'text-[#3CFF9E] fill-[#3CFF9E]' : 'text-white/20'}`} />)}
                      </div>
                      <span className="text-[10px] font-black text-white/40 tracking-widest">STABLE_V4.8</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-white">
                        {product.price_formatted || `$${product.price}`}
                      </span>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${emeraldIconWrap} hover:scale-110 active:scale-95`}
                      >
                        <ShoppingCart className={`w-5 h-5 ${emeraldIcon}`} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        );

      case 'image_text':
        return (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="mb-20"
          >
            <div className={`${emeraldCardBase} rounded-[3rem] overflow-hidden border-white/10`}>
              <div className="grid md:grid-cols-2 gap-0">
                <div className="p-16 flex flex-col justify-center">
                  <span className={emeraldLabel}>Provenance</span>
                  <h2 className="text-4xl md:text-5xl font-black text-white mb-8 tracking-tighter leading-none">
                    {settings.title || 'Brand philosophy'}
                  </h2>
                  <p className="text-emerald-100/60 text-lg leading-relaxed mb-10 font-medium">
                    {store?.about || 'We are passionate about creating exceptional products that enhance your lifestyle. Our commitment to quality and innovation drives everything we do.'}
                  </p>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <div className={`w-10 h-10 rounded-xl ${emeraldIconWrap} flex items-center justify-center p-2`}>
                        <Award className={`w-6 h-6 ${emeraldIcon}`} />
                      </div>
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Validation</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className={`w-10 h-10 rounded-xl ${emeraldIconWrap} flex items-center justify-center p-2`}>
                        <Package className={`w-6 h-6 ${emeraldIcon}`} />
                      </div>
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Logistics</span>
                    </div>
                  </div>
                </div>
                <div className="relative h-96 md:h-auto overflow-hidden">
                  {store?.banner_url ? (
                    <img
                      src={store.banner_url}
                      alt="About us"
                      className="w-full h-full object-cover grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-1000"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-900/40 to-[#070B0F]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 'featured_collection':
        return (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="mb-20"
          >
            <div className="rounded-[3rem] p-20 text-center relative overflow-hidden" style={{
              background: `linear-gradient(135deg, ${store?.primary_color || '#10B981'}22 0%, #070B0F 100%)`,
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] bg-[#3CFF9E]/5 rounded-full blur-[100px]" />

              <span className={emeraldLabel}>Featured Selection</span>
              <h2 className="text-5xl md:text-7xl font-bold mb-8 text-white tracking-tighter">
                {settings.title || 'Featured Collection'}
              </h2>
              <p className="text-emerald-100/60 text-xl mb-12 max-w-2xl mx-auto font-medium">
                Discover our handpicked selection of premium products curated for quality.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => productsSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-xl text-white px-10 py-5 rounded-2xl font-bold text-[12px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all shadow-2xl"
              >
                View Collection
                <ArrowRight className="w-5 h-5 text-[#3CFF9E]" />
              </motion.button>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#070B0F] text-white relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-fixed" style={themeVars as React.CSSProperties}>
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#3CFF9E]/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Header Section with Banner - Only show if no custom layout */}
        {!store?.homepage_layout && (
          <div className="relative w-full h-[600px] md:h-[700px] overflow-hidden">
            {/* Banner Image */}
            <div className="absolute inset-0">
              {store?.banner_url ? (
                <img
                  src={store.banner_url}
                  alt={`${store?.display_name || slug} banner`}
                  className="w-full h-full object-cover opacity-30 shadow-inner"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-900 to-[#070B0F]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-[#070B0F]"></div>
            </div>

            {/* Floating info card at bottom center */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl z-10"
            >
              <div className={`${emeraldCardBase} rounded-[3rem] p-10 md:p-12 border-white/10 backdrop-blur-3xl`}>
                <div className="flex flex-col md:flex-row items-center md:items-end gap-8 md:gap-12 text-center md:text-left">
                  {/* Avatar */}
                  <div className="-mt-24 md:-mt-24">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] ring-8 ring-[#070B0F] shadow-2xl overflow-hidden bg-[#0A1016] border border-white/10">
                      {store?.logo_url ? (
                        <img src={store.logo_url} alt={store?.display_name || slug} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center">
                          <span className="text-white text-5xl font-bold">{(store?.display_name || slug)?.charAt(0)?.toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Name + meta + description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start">
                        <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tighter leading-none">{store?.display_name || slug}</h1>
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#3CFF9E]/10 border border-[#3CFF9E]/20 text-[#3CFF9E] text-[10px] font-bold uppercase tracking-widest">
                          <Check className="w-3 h-3" /> Verified Merchant
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-[11px] text-white/50 font-black uppercase tracking-[0.2em]">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-[#3CFF9E] fill-[#3CFF9E]" /> 4.8 <span className="text-white/20">(1.2k Reviews)</span>
                        </div>
                        {locationText && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#3CFF9E]" /> {locationText}
                          </div>
                        )}
                        {sinceText && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#3CFF9E]" /> Est. {sinceText}
                          </div>
                        )}
                      </div>

                      {store?.about && (
                        <p className="text-emerald-100/60 font-medium line-clamp-2 max-w-3xl leading-relaxed">
                          {store.about}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <button
                      onClick={handleContactSeller}
                      className="flex-1 md:flex-none bg-white/5 border border-white/10 text-white px-8 py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest hover:bg-white/10 transition-all backdrop-blur-xl"
                    >
                      Negotiate
                    </button>
                    <button
                      onClick={handleFollowStore}
                      className={`flex-1 md:flex-none px-8 py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all shadow-lg ${isFollowing ? 'bg-white/10 text-white/50 border border-white/5' : 'bg-[#3CFF9E] text-black hover:bg-[#2ae88e]'}`}
                    >
                      {isFollowing ? 'Subscribed' : 'Subscribe'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Custom Layout Sections */}
        {store?.homepage_layout && (
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
            {store.homepage_layout.map((sec, idx) => renderSection(sec, idx))}
          </div>
        )}

        {/* Catalog Section */}
        <div ref={productsSectionRef} className="max-w-7xl mx-auto px-6 lg:px-12 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            {/* Advanced Filters Sidebar */}
            <aside className="lg:col-span-1 space-y-10">
              <section>
                <span className={emeraldLabel}>Neural Search</span>
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-[#3CFF9E] transition-colors w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Pattern match..."
                    value={search}
                    onChange={(e) => runSearch(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white/[0.02] border border-white/10 text-white focus:border-[#3CFF9E]/50 focus:bg-white/[0.04] transition-all outline-none font-black text-[12px] uppercase tracking-widest"
                  />
                </div>
              </section>

              <section>
                <span className={emeraldLabel}>Category Registry</span>
                <div className="space-y-3">
                  {collections.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedCategory(c.name)}
                      className={`w-full group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${selectedCategory === c.name
                        ? 'bg-[#3CFF9E]/10 border-[#3CFF9E]/30 text-[#3CFF9E] shadow-[0_0_20px_rgba(60,255,158,0.1)]'
                        : 'bg-white/[0.02] border-white/5 text-white/40 hover:border-white/20 hover:text-white'
                        }`}
                    >
                      <span className="text-[11px] font-black uppercase tracking-[0.15em]">{c.name}</span>
                      <span className={`text-[10px] font-mono leading-none ${selectedCategory === c.name ? 'text-[#3CFF9E]' : 'text-white/10'
                        }`}>[{c.count.toString().padStart(2, '0')}]</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <span className={emeraldLabel}>Price Index</span>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    min={0}
                    placeholder="MIN"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/10 text-white focus:border-[#3CFF9E]/50 outline-none text-[12px] font-black"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="MAX"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/10 text-white focus:border-[#3CFF9E]/50 outline-none text-[12px] font-black"
                  />
                </div>
              </section>

              <section>
                <span className={emeraldLabel}>Rating Filter</span>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => setRatingMin(rating)}
                      className={`h-12 rounded-xl flex items-center justify-center border transition-all ${ratingMin === rating ? 'bg-[#3CFF9E]/20 border-[#3CFF9E]/50 text-[#3CFF9E]' : 'bg-white/[0.02] border-white/10 text-white/40 hover:border-white/20'}`}
                    >
                      <Star className={`w-4 h-4 ${ratingMin >= rating ? 'fill-current' : ''}`} />
                    </button>
                  ))}
                </div>
              </section>

              <div className="rounded-[2.5rem] p-8 border border-[#3CFF9E]/20 bg-gradient-to-br from-emerald-900/40 to-black/40 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                  <Globe className="w-20 h-20 text-[#3CFF9E]" />
                </div>
                <div className="text-[10px] font-black text-[#3CFF9E] uppercase tracking-widest mb-4">Prime Protocol</div>
                <div className="text-white font-black text-xl tracking-tighter mb-4 leading-none">FREE GLOBAL TRANSMISSION</div>
                <p className="text-emerald-100/40 text-[11px] leading-relaxed mb-6">On all manifests exceeding $500. Secure neural verification included.</p>
                <button className="w-full py-3 bg-[#3CFF9E] text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Details</button>
              </div>
            </aside>

            {/* Main column */}
            <div className="lg:col-span-3 space-y-12">
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-white/5">
                <div>
                  <span className={emeraldLabel}>Found Objects</span>
                  <h2 className="text-5xl font-black text-white tracking-tighter leading-none">Catalog Dispatch</h2>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Sort Protocol</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="bg-transparent text-white font-black text-[12px] uppercase tracking-widest outline-none cursor-pointer border-b border-[#3CFF9E]/30 pb-1"
                  >
                    <option value="newest" className="bg-[#0A1016]">Latest Drops</option>
                    <option value="price_low" className="bg-[#0A1016]">Value Asc</option>
                    <option value="price_high" className="bg-[#0A1016]">Value Desc</option>
                    <option value="popular" className="bg-[#0A1016]">High Resonance</option>
                    <option value="rating" className="bg-[#0A1016]">Validated Best</option>
                  </select>
                </div>
              </header>

              {visibleProducts.length === 0 ? (
                <div className={`${emeraldCardBase} rounded-[3rem] p-24 text-center border-white/5`}>
                  <div className={`w-20 h-20 rounded-full ${emeraldIconWrap} flex items-center justify-center mx-auto mb-8 opacity-20`}>
                    <Package className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-white/50 tracking-tighter uppercase mb-2">Registry Empty</h3>
                  <p className="text-white/20 font-mono text-xs">NO_OBJECTS_FOUND_IN_SECTOR</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {visibleProducts.map((product, index) => (
                    <motion.div
                      key={product.id || product.slug}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className={`${emeraldCardBase} rounded-[2.5rem] overflow-hidden group hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500`}
                    >
                      <div className="aspect-[4/5] overflow-hidden bg-white/5 relative">
                        {resolveProductImage(product) ? (
                          <img
                            src={resolveProductImage(product) as string}
                            alt={product.name}
                            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-1000 group-hover:opacity-100"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/10" />
                        )}

                        {product?.is_new && (
                          <span className="absolute left-6 top-6 text-[9px] font-black px-4 py-1.5 rounded-full bg-emerald-500 text-black shadow-2xl tracking-[0.2em] uppercase">Phase: New</span>
                        )}

                        {(product?.compare_at_price || product?.discount_price || product?.original_price) && (
                          <span className="absolute left-6 top-6 text-[9px] font-black px-4 py-1.5 rounded-full bg-rose-500 text-white shadow-2xl tracking-[0.2em] uppercase">Sale Active</span>
                        )}

                        <button className="absolute top-6 right-6 p-4 bg-white/5 backdrop-blur-3xl rounded-2xl border border-white/10 shadow-2xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                          <Heart className="w-5 h-5 text-white/60 hover:text-rose-500 transition-colors" />
                        </button>
                      </div>
                      <div className="p-8">
                        {product?.category && (
                          <div className="text-[10px] font-black text-[#3CFF9E] uppercase tracking-[0.2em] mb-3 opacity-60">{(product?.category?.name || product?.category)}</div>
                        )}
                        <Link to={`/products/${product.slug || product.id}`}>
                          <h3 className="font-black text-xl mb-4 line-clamp-2 text-white/90 hover:text-[#3CFF9E] transition-colors leading-tight uppercase tracking-tighter">
                            {product.name}
                          </h3>
                        </Link>

                        <div className="flex items-center gap-2 mb-8 bg-white/[0.03] w-fit px-3 py-1.5 rounded-full border border-white/5">
                          <Star className="w-3.5 h-3.5 text-[#3CFF9E] fill-[#3CFF9E]" />
                          <span className="text-[10px] font-black text-white/60 tracking-widest">{product?.rating ?? '4.8'}</span>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div className="flex flex-col">
                            <span className="text-3xl font-black text-white leading-none">
                              {product.price_formatted || `$${product.price}`}
                            </span>
                            {(product?.original_price || product?.compare_at_price) && (
                              <span className="text-[10px] text-white/20 line-through mt-1 font-black">{product?.original_price || product?.compare_at_price}</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleAddToCart(product)}
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${emeraldIconWrap} hover:scale-105 active:scale-95 shadow-lg`}
                          >
                            <ShoppingCart className="w-6 h-6" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {hasMore && (
                <div className="flex justify-center pt-20">
                  <button
                    onClick={fetchMore}
                    disabled={loading}
                    className="px-12 py-5 rounded-2xl font-black text-[12px] uppercase tracking-[0.3em] bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-20 transition-all backdrop-blur-xl shadow-2xl"
                  >
                    {loading ? 'Transmitting...' : 'Load Archives'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Footer */}
      <footer className="relative z-10 py-20 px-6 border-t border-white/5 bg-black/40 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div>
            <h4 className="text-2xl font-black tracking-tighter text-white mb-2 uppercase">{store?.display_name || slug} <span className="text-[#3CFF9E]">.</span></h4>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Premium merchant architecture</p>
          </div>
          <div className="flex gap-8">
            <Twitter className="w-5 h-5 text-white/20 hover:text-white transition-colors cursor-pointer" />
            <Instagram className="w-5 h-5 text-white/20 hover:text-white transition-colors cursor-pointer" />
            <Facebook className="w-5 h-5 text-white/20 hover:text-white transition-colors cursor-pointer" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/10">&copy; 2026 ARCHITECT PROTOCOL. ALL RIGHTS RESERVED.</p>
        </div>
      </footer>

      {/* Contact Seller Modal - REDESIGNED */}
      <AnimatePresence>
        {showContactModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setShowContactModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className={`${emeraldCardBase} rounded-[3rem] max-w-lg w-full p-10 relative overflow-hidden`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <MessageCircle className="w-32 h-32" />
              </div>

              <div className="flex items-center justify-between mb-10 relative z-10">
                <div>
                  <span className={emeraldLabel}>Secure Link</span>
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Negotiate</h3>
                </div>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 relative z-10">
                <Link
                  to="/messages"
                  onClick={() => setShowContactModal(false)}
                  className="flex items-center gap-6 p-6 bg-white/[0.03] border border-white/5 rounded-[2rem] hover:border-[#3CFF9E]/30 transition-all group"
                >
                  <div className={`w-14 h-14 rounded-2xl ${emeraldIconWrap} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-black text-white uppercase text-[12px] tracking-widest mb-1">Encrypted Chat</div>
                    <div className="text-[10px] text-white/40 font-mono uppercase">Direct peer-to-peer relay</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-[#3CFF9E] ml-auto transition-colors" />
                </Link>

                <a
                  href={`mailto:${store?.socials?.email || 'support@example.com'}`}
                  className="flex items-center gap-6 p-6 bg-white/[0.03] border border-white/5 rounded-[2rem] hover:border-[#3CFF9E]/30 transition-all group"
                >
                  <div className={`w-14 h-14 rounded-2xl ${emeraldIconWrap} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-black text-white uppercase text-[12px] tracking-widest mb-1">Transmit Message</div>
                    <div className="text-[10px] text-white/40 font-mono uppercase">{store?.socials?.email || 'support@example.com'}</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-[#3CFF9E] ml-auto transition-colors" />
                </a
                >
                <a
                  href={`tel:${store?.socials?.phone || '+15551234567'}`}
                  className="flex items-center gap-6 p-6 bg-white/[0.03] border border-white/5 rounded-[2rem] hover:border-[#3CFF9E]/30 transition-all group"
                >
                  <div className={`w-14 h-14 rounded-2xl ${emeraldIconWrap} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-black text-white uppercase text-[12px] tracking-widest mb-1">Voice Protocol</div>
                    <div className="text-[10px] text-white/40 font-mono uppercase">{store?.socials?.phone || '+1 (555) 123-4567'}</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-[#3CFF9E] ml-auto transition-colors" />
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StorefrontPage;
