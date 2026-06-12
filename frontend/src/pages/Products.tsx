import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

import { useQuery } from '@tanstack/react-query';

import { Link, useLocation, useNavigate } from 'react-router-dom';

import { motion, AnimatePresence } from 'framer-motion';

import { Search, Filter, ShoppingCart, Heart, Star, Grid, List, SlidersHorizontal, Sparkles } from 'lucide-react';

import { productsAPI, categoriesAPI, resolveMediaUrl } from '@/services/api';

import { Product, Category } from '@/types';

import { useDispatch, useSelector } from 'react-redux';

import { addItem } from '@/store/slices/cartSlice';

import { useToast } from '@/components/ui/use-toast';

import FadeIn from '@/components/animations/FadeIn';

import { RootState } from '@/store';



const Products = () => {

  const location = useLocation();

  const navigate = useNavigate();

  const dispatch = useDispatch();

  const { toast } = useToast();

  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  

  // Prevent any browser navigation during filter interactions

  const preventNavigation = useCallback((e: Event) => {

    e.preventDefault();

    e.stopPropagation();

    e.stopImmediatePropagation();

    return false;

  }, []);

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



  // Parse query parameters

  useEffect(() => {

    const params = new URLSearchParams(location.search);

    const category = params.get('category');

    const vendor = params.get('vendor');

    if (category) {

      setSelectedCategory(category);

    }

    if (vendor) {

      setVendorFilter(vendor);

    }

  }, [location.search]);



  // Debounce search term

  useEffect(() => {

    const timer = setTimeout(() => {

      setDebouncedSearchTerm(searchTerm);

    }, 300);



    return () => clearTimeout(timer);

  }, [searchTerm]);



  // Debounce vendor filter

  useEffect(() => {

    const timer = setTimeout(() => {

      setDebouncedVendorFilter(vendorFilter);

    }, 300);



    return () => clearTimeout(timer);

  }, [vendorFilter]);



  // Fetch categories

  const { data: categoriesData } = useQuery<Category[]>({

    queryKey: ['categories'],

    queryFn: async () => {

      const response = await categoriesAPI.getAll();

      return Array.isArray(response.data) ? response.data : []; // Ensure this returns an array

    },

    refetchOnWindowFocus: false,

    refetchOnMount: false,

    refetchOnReconnect: false,

  });



  // Manual products state management

  const [productsData, setProductsData] = useState<Product[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const fetchingRef = useRef(false);

  const lastFetchParamsRef = useRef<string>('');



  // Manual fetch function

  const fetchProducts = useCallback(async () => {

    const params: Record<string, any> = {};

    

    if (debouncedSearchTerm) params.search = debouncedSearchTerm;

    if (selectedCategory) params.category = selectedCategory;

    // Note: Vendor filtering is now done client-side to support name-based filtering

    if (sortBy) params.ordering = sortBy;

    

    params.min_price = priceRange[0];

    params.max_price = priceRange[1];

    

    const paramsString = JSON.stringify(params);

    

    // Prevent duplicate requests

    if (fetchingRef.current || lastFetchParamsRef.current === paramsString) {

      return;

    }

    

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



  // Trigger fetch when dependencies change

  useEffect(() => {

    fetchProducts();

  }, [fetchProducts]);



  // Prevent any form submissions or navigation globally

  useEffect(() => {

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {

      // Only prevent if we're in the middle of filtering

      if (fetchingRef.current) {

        e.preventDefault();

        e.returnValue = '';

      }

    };



    const handleSubmit = (e: Event) => {

      if (e.target instanceof HTMLFormElement) {

        e.preventDefault();

        e.stopPropagation();

        return false;

      }

    };



    window.addEventListener('beforeunload', handleBeforeUnload);

    document.addEventListener('submit', handleSubmit, true);



    return () => {

      window.removeEventListener('beforeunload', handleBeforeUnload);

      document.removeEventListener('submit', handleSubmit, true);

    };

  }, []);



  const visibleProducts = useMemo(() => {

    const list = Array.isArray(productsData) ? productsData : [];

    return list.filter((p) => {

      // Filter by stock availability

      if (inStockOnly && p.stock <= 0) return false;

      

      // Filter by featured status

      if (featuredOnly && !p.featured) return false;

      

      // Strong vendor name filtering - progressive letter-by-letter matching

      if (debouncedVendorFilter && p.vendor) {

        const filterTerm = debouncedVendorFilter.toLowerCase().trim();

        

        // Get all possible vendor name sources

        const p_any = p as any;

        let vendorName = '';

        

        // Use vendor_name from backend first (this is the full calculated name)

        if (p_any.vendor_name) {

          vendorName = p_any.vendor_name.toLowerCase();

        }

        // Fallback to vendor object fields

        else if (typeof p.vendor === 'object') {

          const firstName = (p.vendor.first_name || '').toLowerCase();

          const lastName = (p.vendor.last_name || '').toLowerCase();

          const fullName = `${firstName} ${lastName}`.trim();

          

          if (fullName) {

            vendorName = fullName;

          } else if (firstName) {

            vendorName = firstName;

          } else if (lastName) {

            vendorName = lastName;

          }

        }

        

        // Strong progressive filtering: vendor name must START WITH the filter term

        // This ensures "m" shows both "meski" and "meriam", but "mes" only shows "meski"

        if (vendorName && !vendorName.startsWith(filterTerm)) {

          return false;

        }

        

        // If we have a filter but no vendor name, exclude the product

        if (!vendorName) {

          return false;

        }

      }

      

      return true;

    });

  }, [productsData, inStockOnly, featuredOnly, debouncedVendorFilter]);



  const handleAddToCart = (product: Product) => {

    if (!isAuthenticated) {

      toast({

        title: 'Authentication Required',

        description: 'Please login to add items to your cart.',

        variant: 'destructive',

      });

      navigate('/login');

      return;

    }



    if (user?.user_type !== 'buyer') {

      toast({

        title: 'Access Denied',

        description: 'Only buyers can add items to cart.',

        variant: 'destructive',

      });

      return;

    }



    dispatch(

      addItem({

        id: crypto.randomUUID(),

        product,

        quantity: 1,

        subtotal: product.price,

      })

    );

    toast({

      title: 'Added to cart',

      description: `${product.name} has been added to your cart.`,

    });

  };



  const handleAddToWishlist = (productId: string) => {

    if (!isAuthenticated) {

      toast({

        title: 'Authentication Required',

        description: 'Please login to add items to your wishlist.',

        variant: 'destructive',

      });

      navigate('/login');

      return;

    }



    if (user?.user_type !== 'buyer') {

      toast({

        title: 'Access Denied',

        description: 'Only buyers can add items to wishlist.',

        variant: 'destructive',

      });

      return;

    }



    // This would typically call the wishlist API

    toast({

      title: 'Added to wishlist',

      description: 'Product has been added to your wishlist successfully.',

    });

  };



  const toggleFilter = () => {

    setIsFilterOpen(!isFilterOpen);

  };



  if (isLoading && !productsData) {

    return (

      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">

        <motion.div

          animate={{ rotate: 360 }}

          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}

          className="relative"

        >

          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full"></div>

          <div className="absolute top-2 left-2 w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>

        </motion.div>

      </div>

    );

  }



  return (

    <div 

      key="products-page-stable"

      className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50"

      onSubmit={(e) => {

        e.preventDefault();

        e.stopPropagation();

        return false;

      }}

      onClick={(e) => {

        // Prevent any potential navigation clicks

        if (e.target instanceof HTMLAnchorElement && e.target.href === window.location.href) {

          e.preventDefault();

        }

      }}

    >

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Banner Section */}

        <section className="bg-gradient-to-br from-emerald-50 via-green-100 to-emerald-100 relative min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[180px] flex items-center justify-center overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 mb-4 sm:mb-6">

          {/* Enhanced Background Pattern */}

          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-green-600/15 to-emerald-600/10"></div>

          <div className="absolute inset-0 bg-gradient-to-tl from-emerald-400/5 via-transparent to-green-400/5"></div>

          <div className="absolute inset-0">

            <div className="absolute top-5 sm:top-10 left-5 sm:left-10 w-40 sm:w-60 md:w-80 h-40 sm:h-60 md:h-80 bg-gradient-to-r from-emerald-400/20 to-green-400/20 rounded-full blur-3xl animate-pulse"></div>

            <div className="absolute bottom-5 sm:bottom-10 right-5 sm:right-10 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>

            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 sm:w-48 md:w-64 h-32 sm:h-48 md:h-64 bg-gradient-to-r from-emerald-400/15 to-green-400/15 rounded-full blur-2xl"></div>

          </div>

          {/* Floating Elements */}

          <div className="absolute inset-0 overflow-hidden hidden sm:block">

            <div className="absolute top-20 right-1/4 w-4 h-4 bg-emerald-400/30 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>

            <div className="absolute bottom-32 left-1/4 w-3 h-3 bg-green-400/30 rounded-full animate-bounce" style={{animationDelay: '1.5s'}}></div>

            <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-emerald-400/30 rounded-full animate-bounce" style={{animationDelay: '2s'}}></div>

          </div>

          <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6">

            <motion.h1 

              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-emerald-900 via-emerald-700 to-green-600 bg-clip-text text-transparent mb-3 sm:mb-4 md:mb-6 leading-normal pb-2"

              initial={{ opacity: 0, y: 20 }}

              animate={{ opacity: 1, y: 0 }}

              transition={{ duration: 0.6, delay: 0.2 }}

            >

              Discover Products

            </motion.h1>

            <motion.p 

              className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-gray-600 mb-4 sm:mb-6 md:mb-8 leading-relaxed max-w-2xl mx-auto"

              initial={{ opacity: 0, y: 20 }}

              animate={{ opacity: 1, y: 0 }}

              transition={{ duration: 0.6, delay: 0.4 }}

            >

              Find amazing products from trusted vendors

            </motion.p>

          </div>

        </section>



        {/* Search and Filter Section */}

        <motion.div 

          className="mb-8"

          initial={{ opacity: 0, y: 30 }}

          animate={{ opacity: 1, y: 0 }}

          transition={{ duration: 0.6, delay: 0.6 }}

        >

          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">

            <form onSubmit={(e) => e.preventDefault()}>

            <div className="flex flex-col gap-3 sm:gap-4">

              <div className="flex-1">

                <motion.div 

                  className="relative"

                  whileFocus={{ scale: 1.02 }}

                >

                  <input

                    type="text"

                    placeholder="Search products..."

                    value={searchTerm}

                    onChange={(e) => setSearchTerm(e.target.value)}

                    onKeyDown={(e) => {

                      if (e.key === 'Enter') {

                        e.preventDefault();

                      }

                    }}

                    className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-sm sm:text-base md:text-lg"

                  />

                  <Search className="absolute left-3 sm:left-4 top-2.5 sm:top-3.5 h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />

                </motion.div>

              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">

                <motion.select

                  value={selectedCategory}

                  onChange={(e) => setSelectedCategory(e.target.value)}

                  className="px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm sm:text-base flex-1 sm:flex-initial sm:min-w-[150px]"

                  whileFocus={{ scale: 1.02 }}

                >

                  <option value="">All Categories</option>

                  {Array.isArray(categoriesData) ? categoriesData.map((category) => (

                    <option key={category.id} value={category.slug}>

                      {category.name}

                    </option>

                  )) : null}

                </motion.select>

                

                <div className="flex items-center gap-2 sm:gap-3">

                  {/* View Mode Toggle */}

                  <div className="flex bg-gray-100 rounded-xl p-1 flex-1 sm:flex-initial">

                    <motion.button

                      type="button"

                      onClick={(e) => {

                        e.preventDefault();

                        setViewMode('grid');

                      }}

                      className={`p-2 rounded-lg transition-all duration-200 flex-1 sm:flex-initial ${

                        viewMode === 'grid' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'

                      }`}

                      whileHover={{ scale: 1.05 }}

                      whileTap={{ scale: 0.95 }}

                    >

                      <Grid className="h-4 w-4 sm:h-5 sm:w-5 mx-auto" />

                    </motion.button>

                    <motion.button

                      type="button"

                      onClick={(e) => {

                        e.preventDefault();

                        setViewMode('list');

                      }}

                      className={`p-2 rounded-lg transition-all duration-200 flex-1 sm:flex-initial ${

                        viewMode === 'list' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'

                      }`}

                      whileHover={{ scale: 1.05 }}

                      whileTap={{ scale: 0.95 }}

                    >

                      <List className="h-4 w-4 sm:h-5 sm:w-5 mx-auto" />

                    </motion.button>

                  </div>

                  

                  <motion.button 

                    type="button"

                    onClick={(e) => {

                      e.preventDefault();

                      toggleFilter();

                    }}

                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-300 shadow-lg flex-1 sm:flex-initial text-sm sm:text-base"

                    whileHover={{ scale: 1.05, y: -2 }}

                    whileTap={{ scale: 0.95 }}

                  >

                    <SlidersHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />

                    <span className="hidden sm:inline">Filters</span>

                    <span className="sm:hidden">Filter</span>

                  </motion.button>

                </div>

              </div>

            </div>

            </form>

          </div>



          {/* Advanced Filters */}

          <AnimatePresence>

            {isFilterOpen && (

              <motion.div 

                className="mt-6 p-6 bg-white rounded-2xl shadow-lg border border-gray-100"

                initial={{ opacity: 0, height: 0, y: -20 }}

                animate={{ opacity: 1, height: 'auto', y: 0 }}

                exit={{ opacity: 0, height: 0, y: -20 }}

                transition={{ duration: 0.3 }}

              >

                <form onSubmit={(e) => e.preventDefault()}>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  <motion.div

                    initial={{ opacity: 0, x: -20 }}

                    animate={{ opacity: 1, x: 0 }}

                    transition={{ delay: 0.1 }}

                  >

                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Price Range</h3>

                    <div className="flex items-center gap-3">

                      <input

                        type="number"

                        min="0"

                        value={priceRange[0]}

                        onChange={(e) => {

                          const value = e.target.value === '' ? 0 : parseInt(e.target.value);

                          setPriceRange([isNaN(value) ? 0 : value, priceRange[1]]);

                        }}

                        onKeyDown={(e) => {

                          if (e.key === 'Enter') {

                            e.preventDefault();

                          }

                        }}

                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"

                        placeholder="Min"

                      />

                      <span className="text-gray-500 font-medium">to</span>

                      <input

                        type="number"

                        min="0"

                        value={priceRange[1]}

                        onChange={(e) => {

                          const value = e.target.value === '' ? 1000 : parseInt(e.target.value);

                          setPriceRange([priceRange[0], isNaN(value) ? 1000 : value]);

                        }}

                        onKeyDown={(e) => {

                          if (e.key === 'Enter') {

                            e.preventDefault();

                          }

                        }}

                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"

                        placeholder="Max"

                      />

                    </div>

                  </motion.div>

                  <motion.div

                    initial={{ opacity: 0, x: -20 }}

                    animate={{ opacity: 1, x: 0 }}

                    transition={{ delay: 0.2 }}

                  >

                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Sort By</h3>

                    <select

                      value={sortBy}

                      onChange={(e) => setSortBy(e.target.value)}

                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"

                    >

                      <option value="">Default</option>

                      <option value="price">Price: Low to High</option>

                      <option value="-price">Price: High to Low</option>

                      <option value="-created_at">Newest First</option>

                    </select>

                  </motion.div>

                  <motion.div 

                    className="flex items-end"

                    initial={{ opacity: 0, x: -20 }}

                    animate={{ opacity: 1, x: 0 }}

                    transition={{ delay: 0.3 }}

                  >

                    <motion.button

                      type="button"

                      onClick={(e) => {

                        e.preventDefault();

                        setSearchTerm('');

                        setSelectedCategory('');

                        setPriceRange([0, 1000]);

                        setSortBy('');

                        setVendorFilter('');

                        setInStockOnly(false);

                        setFeaturedOnly(false);

                      }}

                      className="w-full px-6 py-3 text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-300 font-medium"

                      whileHover={{ scale: 1.02, y: -2 }}

                      whileTap={{ scale: 0.98 }}

                    >

                      Reset Filters

                    </motion.button>

                  </motion.div>

                </div>

                </form>

              </motion.div>

            )}

          </AnimatePresence>

        </motion.div>



        {/* Products Grid */}

        <motion.div 

          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"

          initial={{ opacity: 0 }}

          animate={{ opacity: 1 }}

          transition={{ duration: 0.6, delay: 0.8 }}

        >

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            <div className="lg:col-span-3">

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 lg:sticky lg:top-24 space-y-6">

                <div className="">

                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">

                    <button

                      type="button"

                      onClick={(e) => {

                        e.preventDefault();

                        setSelectedCategory('');

                      }}

                      className={`w-full text-left px-4 py-2 rounded-xl border ${selectedCategory === '' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}

                    >

                      All Categories

                    </button>

                    {Array.isArray(categoriesData) ? categoriesData.map((category) => (

                      <button

                        key={category.id}

                        type="button"

                        onClick={(e) => {

                          e.preventDefault();

                          setSelectedCategory(category.slug);

                        }}

                        className={`w-full text-left px-4 py-2 rounded-xl border ${selectedCategory === category.slug ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}

                      >

                        {category.name}

                      </button>

                    )) : null}

                  </div>

                </div>

                <div className="">

                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Vendor</h3>

                  <div className="flex items-center gap-2">

                    <input

                      type="text"

                      value={vendorFilter}

                      onChange={(e) => setVendorFilter(e.target.value)}

                      onKeyDown={(e) => {

                        if (e.key === 'Enter') {

                          e.preventDefault();

                        }

                      }}

                      placeholder="Vendor name"

                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"

                    />

                    {vendorFilter && (

                      <button

                        type="button"

                        onClick={(e) => {

                          e.preventDefault();

                          setVendorFilter('');

                        }}

                        className="px-3 py-2 text-sm rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"

                      >

                        Clear

                      </button>

                    )}

                  </div>

                </div>

                <div className="">

                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Price</h3>

                  <div className="flex items-center gap-3">

                    <input

                      type="number"

                      min="0"

                      value={priceRange[0]}

                      onChange={(e) => {

                        const value = e.target.value === '' ? 0 : parseInt(e.target.value);

                        setPriceRange([isNaN(value) ? 0 : value, priceRange[1]]);

                      }}

                      onKeyDown={(e) => {

                        if (e.key === 'Enter') {

                          e.preventDefault();

                        }

                      }}

                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"

                      placeholder="Min"

                    />

                    <span className="text-gray-500 font-medium">to</span>

                    <input

                      type="number"

                      min="0"

                      value={priceRange[1]}

                      onChange={(e) => {

                        const value = e.target.value === '' ? 1000 : parseInt(e.target.value);

                        setPriceRange([priceRange[0], isNaN(value) ? 1000 : value]);

                      }}

                      onKeyDown={(e) => {

                        if (e.key === 'Enter') {

                          e.preventDefault();

                        }

                      }}

                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"

                      placeholder="Max"

                    />

                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3">

                    <button

                      type="button"

                      onClick={(e) => {

                        e.preventDefault();

                        setPriceRange([0, 50]);

                      }}

                      className={`px-3 py-2 rounded-xl text-sm border ${priceRange[0] === 0 && priceRange[1] === 50 ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}

                    >

                      Under $50

                    </button>

                    <button

                      type="button"

                      onClick={(e) => {

                        e.preventDefault();

                        setPriceRange([0, 100]);

                      }}

                      className={`px-3 py-2 rounded-xl text-sm border ${priceRange[0] === 0 && priceRange[1] === 100 ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}

                    >

                      Under $100

                    </button>

                    <button

                      type="button"

                      onClick={(e) => {

                        e.preventDefault();

                        setPriceRange([100, 500]);

                      }}

                      className={`px-3 py-2 rounded-xl text-sm border ${priceRange[0] === 100 && priceRange[1] === 500 ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}

                    >

                      $100–$500

                    </button>

                    <button

                      type="button"

                      onClick={(e) => {

                        e.preventDefault();

                        setPriceRange([500, 100000]);

                      }}

                      className={`px-3 py-2 rounded-xl text-sm border ${priceRange[0] === 500 && priceRange[1] === 100000 ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}

                    >

                      Above $500

                    </button>

                  </div>

                </div>

                <div className="">

                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Availability</h3>

                  <div className="space-y-2">

                    <label className="flex items-center gap-3 text-gray-800">

                      <input

                        type="checkbox"

                        checked={inStockOnly}

                        onChange={(e) => setInStockOnly(e.target.checked)}

                        className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"

                      />

                      In Stock only

                    </label>

                    <label className="flex items-center gap-3 text-gray-800">

                      <input

                        type="checkbox"

                        checked={featuredOnly}

                        onChange={(e) => setFeaturedOnly(e.target.checked)}

                        className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"

                      />

                      Featured products

                    </label>

                  </div>

                </div>

                <div className="">

                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Sort By</h3>

                  <select

                    value={sortBy}

                    onChange={(e) => setSortBy(e.target.value)}

                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"

                  >

                    <option value="">Default</option>

                    <option value="price">Price: Low to High</option>

                    <option value="-price">Price: High to Low</option>

                    <option value="-created_at">Newest First</option>

                  </select>

                </div>

                <div className="">

                  <button

                    type="button"

                    onClick={(e) => {

                      e.preventDefault();

                      setSearchTerm('');

                      setSelectedCategory('');

                      setPriceRange([0, 1000]);

                      setSortBy('');

                      setVendorFilter('');

                      setInStockOnly(false);

                      setFeaturedOnly(false);

                    }}

                    className="w-full px-4 py-3 text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-300 font-medium"

                  >

                    Reset Filters

                  </button>

                </div>

              </div>

            </div>

            <div className="lg:col-span-9">

              {Array.isArray(visibleProducts) && visibleProducts.length > 0 ? (

                <div className={`grid gap-6 ${

                  viewMode === 'grid' 

                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3' 

                    : 'grid-cols-1 max-w-4xl mx-auto'

                }`}>

                  {visibleProducts.map((product, index) => (

                    <motion.div

                      key={product.id}

                      className={`group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-500 border border-gray-100 ${

                        viewMode === 'list' ? 'flex flex-row' : 'flex flex-col'

                      }`}

                      initial={{ opacity: 0, y: 20 }}

                      whileInView={{ opacity: 1, y: 0 }}

                      viewport={{ once: true }}

                      transition={{ duration: 0.5, delay: index * 0.1 }}

                      whileHover={{ y: -8 }}

                    >

                      <div className={`relative overflow-hidden group ${

                        viewMode === 'list' ? 'w-40 h-32 flex-shrink-0' : 'w-full'

                      }`}>

                        <img

                          src={(() => {

                            const pAny = product as any;

                            const primary = Array.isArray(pAny.images)

                              ? (pAny.images.find((im: any) => im?.is_primary)?.image || pAny.images[0]?.image)

                              : undefined;

                            return (

                              resolveMediaUrl(primary || pAny.image) ||

                              'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop'

                            );

                          })()}

                          alt={product.name}

                          className={`object-contain bg-white p-2 transition-transform duration-700 group-hover:scale-105 ${

                            viewMode === 'list' ? 'w-full h-full rounded-l-2xl' : 'w-full h-56'

                          }`}

                          onClick={(e) => {

                            e.preventDefault();

                            e.stopPropagation();

                            const pAny = product as any;

                            const primary = Array.isArray(pAny.images)

                              ? (pAny.images.find((im: any) => im?.is_primary)?.image || pAny.images[0]?.image)

                              : undefined;

                            const url = resolveMediaUrl(primary || pAny.image);

                            alert(`Image URL: ${url || '(none)'}\nProduct: ${product.name}`);

                          }}

                          onTouchStart={(e) => {

                            e.preventDefault();

                            e.stopPropagation();

                          }}

                          onError={(e) => {

                            const el = e.target as HTMLImageElement;

                            const fallback = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop';

                            if (el.src !== fallback) el.src = fallback;

                          }}

                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">

                          <Heart className="h-5 w-5 text-red-500" />

                        </div>

                      </div>

                      

                      <div className={`p-3 sm:p-6 flex-1 ${viewMode === 'list' ? 'flex flex-col justify-between' : ''}`}>

                        <div>

                          <h3 className="text-base sm:text-xl font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors duration-300 line-clamp-1">

                            {product.name}

                          </h3>

                          <p className="text-xs sm:text-sm text-gray-600 mb-2">

                            Vendor: <span className="text-emerald-600 font-medium">

                              {(() => {

                                const p = product as any;

                                

                                // Use vendor_name from backend (first_name + last_name or just first_name)

                                if (p.vendor_name) {

                                  return p.vendor_name;

                                }

                                

                                // If backend returns null/empty vendor_name, try vendor object directly

                                if (p.vendor && typeof p.vendor === 'object') {

                                  const firstName = p.vendor.first_name || '';

                                  const lastName = p.vendor.last_name || '';

                                  

                                  if (firstName && lastName) {

                                    return `${firstName} ${lastName}`;

                                  } else if (firstName) {

                                    return firstName;

                                  } else if (lastName) {

                                    return lastName;

                                  }

                                }

                                

                                // If no real name is available, show this message

                                return 'Name Not Set';

                              })()}

                            </span>

                          </p>

                          <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-4">

                            Category: <span className="text-green-600 font-medium">

                              {(() => {

                                const p = product as any;

                                

                                // Try all possible category patterns

                                if (p.category && typeof p.category === 'object' && p.category.name) {

                                  return p.category.name;

                                }

                                if (p.category_name) return p.category_name;

                                if (typeof p.category === 'string') return p.category;

                                

                                return 'Uncategorized';

                              })()}

                            </span>

                          </p>

                        </div>

                        <div>

                          <div className="flex items-center justify-between mb-2 sm:mb-4">

                            <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">

                              ${product.price}

                            </span>

                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">

                              In Stock

                            </span>

                          </div>

                          <Link

                            to={`/products/${product.slug}`}

                            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-2 px-3 sm:py-3 sm:px-4 rounded-xl text-center text-sm sm:text-base font-semibold hover:from-emerald-700 hover:to-green-700 transition-all duration-300 transform hover:scale-105 block"

                          >

                            View Details

                          </Link>

                        </div>

                      </div>

                    </motion.div>

                  ))}

                </div>

              ) : (

                <motion.div 

                  className="text-center py-16"

                  initial={{ opacity: 0, y: 30 }}

                  animate={{ opacity: 1, y: 0 }}

                  transition={{ duration: 0.6 }}

                >

                  <div className="text-gray-400 mb-4">

                    <Search className="h-16 w-16 mx-auto" />

                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-2">No products found</h3>

                  <p className="text-gray-600 mb-6">Try adjusting your search or filter criteria</p>

                  <motion.button

                    type="button"

                    onClick={(e) => {

                      e.preventDefault();

                      setSearchTerm('');

                      setSelectedCategory('');

                      setPriceRange([0, 1000]);

                      setSortBy('');

                      setVendorFilter('');

                      setInStockOnly(false);

                      setFeaturedOnly(false);

                    }}

                    className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"

                    whileHover={{ scale: 1.05 }}

                    whileTap={{ scale: 0.95 }}

                  >

                    Clear All Filters

                  </motion.button>

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