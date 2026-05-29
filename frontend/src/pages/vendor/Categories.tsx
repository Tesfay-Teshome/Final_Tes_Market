import { useState, useEffect } from 'react';
import api, { vendorAPI, resolveMediaUrl } from '@/services/api';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Package, Plus, Trash2, Edit, Search, Filter, Loader2, AlertCircle, Tag, Globe, User } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  parent?: {
    id: string;
    name: string;
  };
  vendor?: string;
  is_global?: boolean;
}

// Style tokens from Administrator Dashboard
const emeraldCardBase = "relative overflow-hidden rounded-2xl border border-white/[0.04] bg-[#0F1720]/80 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.04] before:to-transparent before:pointer-events-none group hover:border-[#3CFF9E]/20 hover:bg-[#0F1720]/90 transition-all duration-500 transform-gpu hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(60,255,158,0.1)]";
const emeraldLabel = "text-[#7A9A90] font-semibold tracking-wider uppercase text-[10px]";
const emeraldMeta = "text-[#6A827B]";
const emeraldKpi = "text-white font-black tracking-tight drop-shadow-sm";
const emeraldIconWrap = "bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]";
const emeraldIcon = "text-[#3CFF9E] drop-shadow-[0_0_8px_rgba(60,255,158,0.5)] transition-colors";

const VendorCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [adminCategories, setAdminCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'vendor', 'admin'
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
    loadAdminCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await vendorAPI.getCategories();
      setCategories(response.data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load vendor categories', variant: 'destructive' });
      console.error('Error loading vendor categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminCategories = async () => {
    try {
      const response = await api.get('/api/categories/');
      // Filter only admin/global categories
      const globalCategories = response.data.filter((cat: Category) => cat.is_global || !cat.vendor);
      setAdminCategories(globalCategories);
    } catch (error) {
      console.error('Error loading admin categories:', error);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await vendorAPI.deleteCategory(id);
      toast({ title: 'Success', description: 'Category deleted successfully' });
      loadCategories();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete category', variant: 'destructive' });
      console.error('Error deleting category:', error);
    }
  };

  const getFilteredCategories = () => {
    if (filterType === 'vendor') {
      let filtered = categories;
      if (searchTerm) {
        filtered = filtered.filter((cat: Category) =>
          cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      return filtered;
    }

    if (filterType === 'admin') {
      let filtered = adminCategories;
      if (searchTerm) {
        filtered = filtered.filter((cat: Category) =>
          cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      return filtered;
    }

    const nameKey = (name?: string) => (name || '').trim().toLowerCase();
    const map = new Map<string, Category>();

    for (const cat of adminCategories) {
      const key = nameKey(cat.name);
      if (!map.has(key)) map.set(key, cat);
    }

    for (const cat of categories) {
      const key = nameKey(cat.name);
      map.set(key, cat);
    }

    let merged: Category[] = Array.from(map.values());

    if (searchTerm) {
      merged = merged.filter((cat: Category) =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return merged;
  };

  const filteredCategories = getFilteredCategories();

  return (
    <div className="flex-1 relative min-h-screen text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 pb-4 sm:pb-6 bg-[#070B0F]">
      {/* Premium Background Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Subtle grid and noise texture overlay for high-end feel */}
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
          style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-[1700px] mx-auto pt-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
            <div className="flex items-center gap-4 mb-1">
              <div className={`h-12 w-12 rounded-2xl ${emeraldIconWrap} flex items-center justify-center shadow-[0_0_20px_rgba(60,255,158,0.15)]`}>
                <Package className={`h-6 w-6 ${emeraldIcon}`} />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent leading-relaxed py-2">Categories</h1>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-400 mt-1">Manage your product classifications</p>
              </div>
            </div>
          </motion.div>

          <Link to="/vendor/categories/new">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[13px] font-bold uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-emerald-500/20 hover:from-emerald-600 hover:to-green-700 flex items-center gap-2.5"
            >
              <Plus className="h-4 w-4" />
              Add Category
            </motion.button>
          </Link>
        </div>

        {/* Filters */}
        <div className={`${emeraldCardBase} p-4 sm:p-6 mb-4 before:from-[#3CFF9E]/05`}>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative group">
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm font-bold text-white placeholder-[#586069] focus:outline-none focus:border-[#3CFF9E]/50 transition-all hover:bg-white/[0.04]"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#586069] group-focus-within:text-[#3CFF9E] transition-colors" />
            </div>
            <div className="relative min-w-[200px] group">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full appearance-none pl-11 pr-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-[#3CFF9E]/50 transition-all cursor-pointer hover:bg-white/[0.04]"
              >
                <option value="all" className="bg-[#0D1117]">All Categories</option>
                <option value="admin" className="bg-[#0D1117]">Global / System</option>
                <option value="vendor" className="bg-[#0D1117]">My Custom Categories</option>
              </select>
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#586069] group-hover:text-[#3CFF9E] transition-colors" />
            </div>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#00FF9D]" />
              <span className="mt-4 text-[10px] font-black uppercase tracking-widest text-[#7A9A90]">Syncing registry...</span>
            </div>
          </div>
        ) : filteredCategories.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${emeraldCardBase} p-12 text-center max-w-2xl mx-auto mt-12 before:from-white/[0.02]`}
          >
            <div className="w-20 h-20 bg-white/[0.02] rounded-full flex items-center justify-center mx-auto mb-6 border border-white/[0.05]">
              <Tag className="h-10 w-10 text-[#586069]" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-[0.2em] text-white mb-2">No Categories Found</h3>
            <p className="text-[#8B949E] text-sm font-medium italic mb-8">
              {searchTerm ? `No categories match "${searchTerm}" in the current scope.` : 'Start formatting your catalog architecture.'}
            </p>
            {filterType !== 'all' && (
              <button
                onClick={() => setFilterType('all')}
                className="px-8 h-11 bg-white/[0.04] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/[0.08] transition-all border border-white/10"
              >
                Clear Filters
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category: Category, idx: number) => (
              <motion.div
                key={`cat-${category.id}-${idx}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`${emeraldCardBase} p-6 group before:from-[#3CFF9E]/05`}
              >
                <div className="relative z-10">
                  {/* Badges */}
                  <div className="flex items-center justify-between mb-6">
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border flex items-center gap-2 ${category.is_global || !category.vendor
                      ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                      : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                      }`}>
                      {category.is_global || !category.vendor ? <Globe className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                      {category.is_global || !category.vendor ? 'Global' : 'My Category'}
                    </span>
                    {category.parent && (
                      <span className="px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider bg-white/[0.03] text-gray-400 border border-white/5">
                        Sub-category
                      </span>
                    )}
                  </div>

                  {/* Image */}
                  {category.image && (
                    <div className="mb-6 h-48 w-full rounded-2xl overflow-hidden border border-white/5 relative group-hover:border-[#3CFF9E]/30 transition-all duration-700 shadow-2xl">
                      <div className="absolute inset-0 bg-gradient-to-t from-[#070B0F] via-transparent to-transparent z-10 opacity-60" />
                      <img
                        src={resolveMediaUrl(category.image)}
                        alt={category.name}
                        className="w-full h-full object-cover transform scale-105 group-hover:scale-110 transition-transform duration-1000 grayscale-[20%] group-hover:grayscale-0"
                      />
                    </div>
                  )}

                  {/* Details */}
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-white tracking-tight mb-2 uppercase leading-snug">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-[12px] text-white/50 font-medium line-clamp-2 leading-relaxed tracking-wide group-hover:text-white/70 transition-colors">
                        {category.description}
                      </p>
                    )}
                    {category.parent && (
                      <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2 group-hover:border-[#3CFF9E]/10 transition-all">
                        <Tag className="h-3.5 w-3.5 text-[#586069]" />
                        <p className="text-[9px] font-bold text-[#6A827B] uppercase tracking-wider">
                          Parent: <span className="text-white ml-1">{category.parent.name || 'Unknown'}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions (Custom only) */}
                  {!category.is_global && category.vendor && (
                    <div className="flex items-center gap-2 mt-auto pt-4 border-t border-white/5 group-hover:border-[#3CFF9E]/10 transition-all">
                      <Link to={`/vendor/categories/${category.id}/edit`} className="flex-1">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-white/[0.04] hover:bg-[#00FF9D]/10 border border-white/10 hover:border-[#00FF9D]/20 text-white hover:text-[#00FF9D] text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </motion.button>
                      </Link>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => deleteCategory(category.id)}
                        className="h-10 w-11 flex items-center justify-center rounded-xl bg-rose-500/05 border border-rose-500/10 text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </motion.button>
                    </div>
                  )}

                  {/* System Msg */}
                  {(category.is_global || !category.vendor) && (
                    <div className="mt-auto pt-4 border-t border-white/5">
                      <p className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest text-center">
                        Standard Category
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div >
  );
};

export default VendorCategories;
