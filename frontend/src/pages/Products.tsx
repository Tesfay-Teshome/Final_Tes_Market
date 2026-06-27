import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, ShoppingCart, Heart, Star, Grid, List, SlidersHorizontal, Sparkles, ArrowRight, Eye } from 'lucide-react';
import { productsAPI, categoriesAPI, resolveMediaUrl } from '@/services/api';
import { Product, Category } from '@/types';
import { useDispatch, useSelector } from 'react-redux';
import { addItem } from '@/store/slices/cartSlice';
import { useToast } from '@/components/ui/use-toast';
import { RootState } from '@/store';

/**
 * Luxury palette tokens (from Home.tsx)
 * Deep emerald + champagne gold accents = premium, editorial feel.
 */
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

const Products = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [debouncedVendorFilter, setDebouncedVendorFilter] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get('category');
    const vendor = params.get('vendor');
    if (category) setSelectedCategory(category);
    if (vendor) setVendorFilter(vendor);
  }, [location.search]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedVendorFilter(vendorFilter), 300);
    return () => clearTimeout(timer);
  }, [vendorFilter]);

  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await categoriesAPI.getAll();
      return Array.isArray(response.data) ? response.data : [];
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const [productsData, setProductsData] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fetchingRef = useRef(false);
  const lastFetchParamsRef = useRef<string>('');

  const fetchProducts = useCallback(async () => {
    const params: Record<string, any> = {};
    if (debouncedSearchTerm) params.search = debouncedSearchTerm;
    if (selectedCategory) params.category = selectedCategory;
    if (sortBy) params.ordering = sortBy;
    params.min_price = priceRange[0];
    params.max_price = priceRange[1];
    const paramsString = JSON.stringify(params);
    if (fetchingRef.current || lastFetchParamsRef.current === paramsString) return;
    fetchingRef.current = true;
    lastFetchParamsRef.current = paramsString;
    try {
      const response = await productsAPI.getAll(params);
      const newData = Array.isArray(response.data) ? response.data : [];
      setProductsData(newData);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [debouncedSearchTerm, selectedCategory, priceRange, sortBy]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const visibleProducts = useMemo(() => {
    const list = Array.isArray(productsData) ? productsData : [];
    return list.filter((p) => {
      if (inStockOnly && p.stock <= 0) return false;
      if (featuredOnly && !p.featured) return false;
      if (debouncedVendorFilter && p.vendor) {
        const filterTerm = debouncedVendorFilter.toLowerCase().trim();
        const p_any = p as any;
        let vendorName = '';
        if (p_any.vendor_name) vendorName = p_any.vendor_name.toLowerCase();
        else if (typeof p.vendor === 'object') {
          const firstName = (p.vendor.first_name || '').toLowerCase();
          const lastName = (p.vendor.last_name || '').toLowerCase();
          const fullName = `${firstName} ${lastName}`.trim();
          if (fullName) vendorName = fullName;
          else if (firstName) vendorName = firstName;
          else if (lastName) vendorName = lastName;
        }
        if (vendorName && !vendorName.startsWith(filterTerm)) return false;
        if (!vendorName) return false;
      }
      return true;
    });
  }, [productsData, inStockOnly, featuredOnly, debouncedVendorFilter]);

  const handleAddToCart = (product: Product) => {
    if (!isAuthenticated) {
      toast({ title: 'Authentication Required', description: 'Please login to add items to your cart.', variant: 'destructive' });
      navigate('/login');
      return;
    }
    if (user?.user_type !== 'buyer') {
      toast({ title: 'Access Denied', description: 'Only buyers can add items to cart.', variant: 'destructive' });
      return;
    }
    dispatch(addItem({ id: crypto.randomUUID(), product, quantity: 1, subtotal: product.price }));
    toast({ title: 'Added to cart', description: `${product.name} has been added to your cart.` });
  };

  const handleAddToWishlist = (productId: string) => {
    if (!isAuthenticated) {
      toast({ title: 'Authentication Required', description: 'Please login to add items to your wishlist.', variant: 'destructive' });
      navigate('/login');
      return;
    }
    if (user?.user_type !== 'buyer') {
      toast({ title: 'Access Denied', description: 'Only buyers can add items to wishlist.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Added to wishlist', description: 'Product has been added to your wishlist successfully.' });
  };

  if (isLoading && !productsData) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: LUX.paper }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="relative">
          <div className="w-16 h-16 border-4 rounded-full" style={{ borderColor: `${LUX.emerald}22`, borderTopColor: LUX.emerald }} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: LUX.paper }}>
      {/* Banner Section */}
      <section className="relative overflow-hidden flex items-center min-h-[220px] sm:min-h-[260px] md:min-h-[300px]" style={{ background: LUX.ink }}>
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(115deg, ${LUX.ink} 0%, rgba(2,44,34,0.92) 45%, rgba(2,44,34,0.65) 75%, rgba(4,19,14,0.85) 100%)`,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(120% 80% at 80% 20%, rgba(201,162,75,0.18), transparent 55%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)` }}
        />
        <div className="relative z-10 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
            >
              <div className="inline-flex items-center gap-3 mb-5">
                <span className="h-px w-8" style={{ background: LUX.gold }} />
                <span className="text-[11px] font-semibold tracking-[0.32em] uppercase" style={{ color: LUX.goldSoft }}>
                  The Collection
                </span>
              </div>
              <h1 className="font-serif font-semibold text-white leading-[1.05] tracking-tight text-[2.2rem] sm:text-5xl lg:text-[3.6rem] mb-5">
                Discover Products
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-white/85 leading-relaxed max-w-xl">
                Find amazing products from <span className="font-semibold" style={{ color: LUX.goldSoft }}>trusted vendors</span> worldwide.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div className="mb-8" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }}>
          <div className="rounded-2xl shadow-lg p-4 sm:p-6 border" style={{ background: '#fff', borderColor: 'rgba(6,78,59,0.10)', boxShadow: '0 1px 0 rgba(6,78,59,0.04), 0 20px 40px -28px rgba(6,78,59,0.25)' }}>
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border-2 rounded-xl focus:ring-2 transition-all duration-300 text-sm sm:text-base md:text-lg"
                      style={{ borderColor: 'rgba(6,78,59,0.15)', color: LUX.emeraldDeep }}
                    />
                    <Search className="absolute left-3 sm:left-4 top-2.5 sm:top-3.5 h-5 w-5 sm:h-6 sm:w-6" style={{ color: LUX.emerald }} />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 border-2 rounded-xl focus:ring-2 bg-white text-sm sm:text-base flex-1 sm:flex-initial sm:min-w-[150px]"
                    style={{ borderColor: 'rgba(6,78,59,0.15)', color: LUX.emeraldDeep }}
                  >
                    <option value="">All Categories</option>
                    {Array.isArray(categoriesData) ? categoriesData.map((category) => (
                      <option key={category.id} value={category.slug}>{category.name}</option>
                    )) : null}
                  </select>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex rounded-xl p-1 flex-1 sm:flex-initial" style={{ background: LUX.cream }}>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setViewMode('grid'); }}
                        className={`p-2 rounded-lg transition-all duration-200 flex-1 sm:flex-initial ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        style={viewMode === 'grid' ? { color: LUX.emerald } : {}}
                      >
                        <Grid className="h-4 w-4 sm:h-5 sm:w-5 mx-auto" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setViewMode('list'); }}
                        className={`p-2 rounded-lg transition-all duration-200 flex-1 sm:flex-initial ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        style={viewMode === 'list' ? { color: LUX.emerald } : {}}
                      >
                        <List className="h-4 w-4 sm:h-5 sm:w-5 mx-auto" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setIsFilterOpen(!isFilterOpen); }}
                      className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-white rounded-xl transition-all duration-300 shadow-lg flex-1 sm:flex-initial text-sm sm:text-base"
                      style={{ background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})` }}
                    >
                      <SlidersHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="hidden sm:inline">Filters</span>
                      <span className="sm:hidden">Filter</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                className="mt-6 p-6 rounded-2xl shadow-lg border"
                style={{ background: '#fff', borderColor: 'rgba(6,78,59,0.10)', boxShadow: '0 1px 0 rgba(6,78,59,0.04), 0 20px 40px -28px rgba(6,78,59,0.25)' }}
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h3 className="text-lg font-serif font-semibold mb-3" style={{ color: LUX.emeraldDeep }}>Price Range</h3>
                      <div className="flex items-center gap-3">
                        <input
                          type="number" min="0" value={priceRange[0]}
                          onChange={(e) => { const v = e.target.value === '' ? 0 : parseInt(e.target.value); setPriceRange([isNaN(v) ? 0 : v, priceRange[1]]); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                          className="w-full px-4 py-2 border-2 rounded-xl focus:ring-2"
                          style={{ borderColor: 'rgba(6,78,59,0.15)', color: LUX.emeraldDeep }}
                          placeholder="Min"
                        />
                        <span className="text-gray-500 font-medium">to</span>
                        <input
                          type="number" min="0" value={priceRange[1]}
                          onChange={(e) => { const v = e.target.value === '' ? 1000 : parseInt(e.target.value); setPriceRange([priceRange[0], isNaN(v) ? 1000 : v]); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                          className="w-full px-4 py-2 border-2 rounded-xl focus:ring-2"
                          style={{ borderColor: 'rgba(6,78,59,0.15)', color: LUX.emeraldDeep }}
                          placeholder="Max"
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-serif font-semibold mb-3" style={{ color: LUX.emeraldDeep }}>Sort By</h3>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-4 py-2 border-2 rounded-xl focus:ring-2 bg-white"
                        style={{ borderColor: 'rgba(6,78,59,0.15)', color: LUX.emeraldDeep }}
                      >
                        <option value="">Default</option>
                        <option value="price">Price: Low to High</option>
                        <option value="-price">Price: High to Low</option>
                        <option value="-created_at">Newest First</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setSearchTerm(''); setSelectedCategory(''); setPriceRange([0, 1000]); setSortBy(''); setVendorFilter(''); setInStockOnly(false); setFeaturedOnly(false);
                        }}
                        className="w-full px-6 py-3 rounded-xl font-medium transition-all duration-300"
                        style={{ background: LUX.cream, color: LUX.emeraldDeep }}
                      >
                        Reset Filters
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Products Grid */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.8 }}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar Filters */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl shadow-lg border p-5 lg:sticky lg:top-24 space-y-6" style={{ background: '#fff', borderColor: 'rgba(6,78,59,0.10)', boxShadow: '0 1px 0 rgba(6,78,59,0.04), 0 20px 40px -28px rgba(6,78,59,0.25)' }}>
                <div>
                  <h3 className="text-lg font-serif font-semibold mb-4" style={{ color: LUX.emeraldDeep }}>Categories</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setSelectedCategory(''); }}
                      className={`w-full text-left px-4 py-2 rounded-xl border transition-all ${selectedCategory === '' ? 'text-white' : 'hover:border-emerald-900/20 text-gray-700'}`}
                      style={selectedCategory === '' ? { background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`, borderColor: `${LUX.gold}55` } : { borderColor: 'rgba(6,78,59,0.10)' }}
                    >
                      All Categories
                    </button>
                    {Array.isArray(categoriesData) ? categoriesData.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={(e) => { e.preventDefault(); setSelectedCategory(category.slug); }}
                        className={`w-full text-left px-4 py-2 rounded-xl border transition-all ${selectedCategory === category.slug ? 'text-white' : 'hover:border-emerald-900/20 text-gray-700'}`}
                        style={selectedCategory === category.slug ? { background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`, borderColor: `${LUX.gold}55` } : { borderColor: 'rgba(6,78,59,0.10)' }}
                      >
                        {category.name}
                      </button>
                    )) : null}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-serif font-semibold mb-3" style={{ color: LUX.emeraldDeep }}>Vendor</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={vendorFilter}
                      onChange={(e) => setVendorFilter(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      placeholder="Vendor name"
                      className="w-full px-4 py-2 border-2 rounded-xl focus:ring-2"
                      style={{ borderColor: 'rgba(6,78,59,0.15)', color: LUX.emeraldDeep }}
                    />
                    {vendorFilter && (
                      <button type="button" onClick={(e) => { e.preventDefault(); setVendorFilter(''); }} className="px-3 py-2 text-sm rounded-xl text-gray-700" style={{ background: LUX.cream }}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-serif font-semibold mb-3" style={{ color: LUX.emeraldDeep }}>Price</h3>
                  <div className="flex items-center gap-3">
                    <input type="number" min="0" value={priceRange[0]} onChange={(e) => { const v = e.target.value === '' ? 0 : parseInt(e.target.value); setPriceRange([isNaN(v) ? 0 : v, priceRange[1]]); }} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} className="w-full px-4 py-2 border-2 rounded-xl focus:ring-2" style={{ borderColor: 'rgba(6,78,59,0.15)', color: LUX.emeraldDeep }} placeholder="Min" />
                    <span className="text-gray-500 font-medium">to</span>
                    <input type="number" min="0" value={priceRange[1]} onChange={(e) => { const v = e.target.value === '' ? 1000 : parseInt(e.target.value); setPriceRange([priceRange[0], isNaN(v) ? 1000 : v]); }} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} className="w-full px-4 py-2 border-2 rounded-xl focus:ring-2" style={{ borderColor: 'rgba(6,78,59,0.15)', color: LUX.emeraldDeep }} placeholder="Max" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {[
                      { label: 'Under $50', range: [0, 50] },
                      { label: 'Under $100', range: [0, 100] },
                      { label: '$100–$500', range: [100, 500] },
                      { label: 'Above $500', range: [500, 100000] },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={(e) => { e.preventDefault(); setPriceRange(preset.range as [number, number]); }}
                        className={`px-3 py-2 rounded-xl text-sm border transition-all ${priceRange[0] === preset.range[0] && priceRange[1] === preset.range[1] ? 'text-white' : 'hover:border-emerald-900/20 text-gray-700'}`}
                        style={priceRange[0] === preset.range[0] && priceRange[1] === preset.range[1] ? { background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`, borderColor: `${LUX.gold}55` } : { borderColor: 'rgba(6,78,59,0.10)' }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-serif font-semibold mb-3" style={{ color: LUX.emeraldDeep }}>Availability</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3" style={{ color: LUX.emeraldDeep }}>
                      <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="h-5 w-5 rounded" style={{ accentColor: LUX.emerald }} />
                      In Stock only
                    </label>
                    <label className="flex items-center gap-3" style={{ color: LUX.emeraldDeep }}>
                      <input type="checkbox" checked={featuredOnly} onChange={(e) => setFeaturedOnly(e.target.checked)} className="h-5 w-5 rounded" style={{ accentColor: LUX.emerald }} />
                      Featured products
                    </label>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-serif font-semibold mb-3" style={{ color: LUX.emeraldDeep }}>Sort By</h3>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full px-4 py-2 border-2 rounded-xl focus:ring-2 bg-white" style={{ borderColor: 'rgba(6,78,59,0.15)', color: LUX.emeraldDeep }}>
                    <option value="">Default</option>
                    <option value="price">Price: Low to High</option>
                    <option value="-price">Price: High to Low</option>
                    <option value="-created_at">Newest First</option>
                  </select>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setSearchTerm(''); setSelectedCategory(''); setPriceRange([0, 1000]); setSortBy(''); setVendorFilter(''); setInStockOnly(false); setFeaturedOnly(false); }}
                    className="w-full px-4 py-3 rounded-xl font-medium transition-all duration-300"
                    style={{ background: LUX.cream, color: LUX.emeraldDeep }}
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="lg:col-span-9">
              {Array.isArray(visibleProducts) && visibleProducts.length > 0 ? (
                <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 max-w-4xl mx-auto'}`}>
                  {visibleProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      className={`group rounded-2xl overflow-hidden border transition-all duration-500 ${viewMode === 'list' ? 'flex flex-row' : 'flex flex-col'}`}
                      style={{ background: '#fff', borderColor: 'rgba(6,78,59,0.10)', boxShadow: '0 1px 0 rgba(6,78,59,0.04), 0 18px 40px -28px rgba(6,78,59,0.20)' }}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ y: -6 }}
                    >
                      <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-40 h-32 flex-shrink-0' : 'w-full'}`}>
                        <img
                          src={(() => {
                            const pAny = product as any;
                            const primary = Array.isArray(pAny.images) ? (pAny.images.find((im: any) => im?.is_primary)?.image || pAny.images[0]?.image) : undefined;
                            return (resolveMediaUrl(primary || pAny.image) || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop');
                          })()}
                          alt={product.name}
                          className={`object-contain bg-white p-2 transition-transform duration-700 group-hover:scale-105 ${viewMode === 'list' ? 'w-full h-full rounded-l-2xl' : 'w-full h-56'}`}
                          onError={(e) => { const el = e.target as HTMLImageElement; const fallback = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop'; if (el.src !== fallback) el.src = fallback; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        <button
                          onClick={() => handleAddToWishlist(String(product.id))}
                          className="absolute top-3 right-3 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)' }}
                        >
                          <Heart className="h-5 w-5" style={{ color: '#ef4444' }} />
                        </button>
                      </div>
                      <div className={`p-3 sm:p-6 flex-1 ${viewMode === 'list' ? 'flex flex-col justify-between' : ''}`}>
                        <div>
                          <h3 className="text-base sm:text-xl font-serif font-semibold mb-2 line-clamp-1" style={{ color: LUX.emeraldDeep }}>
                            {product.name}
                          </h3>
                          <p className="text-xs sm:text-sm mb-2" style={{ color: '#4b5563' }}>
                            Vendor: <span className="font-medium" style={{ color: LUX.emerald }}>
                              {(() => {
                                const p = product as any;
                                if (p.vendor_name) return p.vendor_name;
                                if (p.vendor && typeof p.vendor === 'object') {
                                  const firstName = p.vendor.first_name || '';
                                  const lastName = p.vendor.last_name || '';
                                  const fullName = `${firstName} ${lastName}`.trim();
                                  if (fullName) return fullName;
                                  else if (firstName) return firstName;
                                  else if (lastName) return lastName;
                                }
                                return 'Name Not Set';
                              })()}
                            </span>
                          </p>
                          <p className="text-xs sm:text-sm mb-2 sm:mb-4" style={{ color: '#4b5563' }}>
                            Category: <span className="font-medium" style={{ color: LUX.emeraldSoft }}>
                              {(() => {
                                const p = product as any;
                                if (p.category && typeof p.category === 'object' && p.category.name) return p.category.name;
                                if (p.category_name) return p.category_name;
                                if (typeof p.category === 'string') return p.category;
                                return 'Uncategorized';
                              })()}
                            </span>
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2 sm:mb-4">
                            <span className="text-lg sm:text-2xl font-bold" style={{ color: LUX.emeraldDeep }}>
                              ${product.price}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wider uppercase" style={{ color: LUX.emerald, background: 'rgba(6,95,70,0.10)' }}>
                              In Stock
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Link
                              to={`/products/${product.slug}`}
                              className="flex-1 py-2 px-3 sm:py-3 sm:px-4 rounded-xl text-center text-sm sm:text-base font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 text-white"
                              style={{ background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})` }}
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </Link>
                            <button
                              onClick={() => handleAddToCart(product)}
                              className="px-3 py-2 sm:px-4 sm:py-3 rounded-xl text-white transition-all duration-300"
                              style={{ background: `linear-gradient(135deg, ${LUX.gold}, #B8902F)`, color: LUX.emeraldDeep }}
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div className="text-center py-16" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                  <div className="mb-4" style={{ color: '#9ca3af' }}>
                    <Search className="h-16 w-16 mx-auto" />
                  </div>
                  <h3 className="text-2xl font-serif font-bold mb-2" style={{ color: LUX.emeraldDeep }}>No products found</h3>
                  <p className="mb-6" style={{ color: '#4b5563' }}>Try adjusting your search or filter criteria</p>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setSearchTerm(''); setSelectedCategory(''); setPriceRange([0, 1000]); setSortBy(''); setVendorFilter(''); setInStockOnly(false); setFeaturedOnly(false); }}
                    className="px-6 py-3 rounded-xl text-white transition-colors"
                    style={{ background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})` }}
                  >
                    Clear All Filters
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Products;
