import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { vendorAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, ArrowLeft, Save, Loader2, AlertCircle, Globe, User, Tag } from 'lucide-react';

const VendorCategoryCreate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent: '',
    image: null as File | null
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [adminCategories, setAdminCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Fetch all categories from the global endpoint
        const response = await api.get('/api/categories/');
        console.log('Fetched categories:', response.data);

        const allCategories = Array.isArray(response.data) ? response.data : [];

        // Separate global/admin categories and vendor categories
        const globalCategories = allCategories.filter((cat: any) => !cat.vendor || cat.is_global);
        const vendorCategories = allCategories.filter((cat: any) => cat.vendor && !cat.is_global);

        setAdminCategories(globalCategories);
        setCategories(vendorCategories);

        console.log('Global categories:', globalCategories.length);
        console.log('Vendor categories:', vendorCategories.length);
      } catch (error) {
        setError('Failed to load categories');
        console.error('Error loading categories:', error);
        toast({
          title: 'Error',
          description: 'Failed to load categories. Please try again.',
          variant: 'destructive'
        });
      }
    };

    fetchCategories();
  }, [toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: null }));
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      // Prepare the data to send
      const categoryFormData = new FormData();
      categoryFormData.append('name', formData.name);
      categoryFormData.append('description', formData.description);
      if (formData.parent) {
        categoryFormData.append('parent', formData.parent);
      }
      if (formData.image) {
        categoryFormData.append('image', formData.image);
      }

      await vendorAPI.createCategory(categoryFormData);

      toast({
        title: 'Success',
        description: 'Category created successfully',
        variant: 'default'
      });

      // Redirect back to categories list
      navigate('/vendor/categories');

    } catch (error) {
      setError('Failed to create category. Please try again.');
      console.error('Error creating category:', error);

      toast({
        title: 'Error',
        description: 'Failed to create category',
        variant: 'destructive'
      });

    } finally {
      setLoading(false);
    }
  };

  // Combine all categories for parent selection
  const allCategories = [...adminCategories, ...categories];

  // Style tokens from Administrator Dashboard
  const emeraldCardBase = "relative overflow-hidden rounded-2xl border border-white/10 bg-[#0F1720] shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300";
  const emeraldLabel = "text-white/60 text-[10px] font-bold uppercase tracking-[0.05em]";
  const emeraldMeta = "text-[#6A827B]";
  const emeraldKpi = "text-white font-black tracking-tight drop-shadow-sm";
  const emeraldIconWrap = "bg-gradient-to-br from-[#122A20] to-[#0A140F] border border-[#3CFF9E]/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]";
  const emeraldIcon = "text-[#3CFF9E] drop-shadow-[0_0_8px_rgba(60,255,158,0.5)] transition-colors";

  return (
    <div className="flex-1 relative min-h-screen text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 pb-12 bg-[#070B0F]">
      {/* Premium Background Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Subtle grid and noise texture overlay for high-end feel */}
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
          style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl ${emeraldIconWrap} flex items-center justify-center shadow-[0_0_20px_rgba(60,255,158,0.15)]`}>
                <Tag className={`h-6 w-6 ${emeraldIcon}`} />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent leading-relaxed py-2">
                  Create Category
                </h1>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-400 mt-1">New classification for your products</p>
              </div>
            </div>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/vendor/categories')}
            className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 text-[11px] font-bold uppercase tracking-widest transition-all duration-300 backdrop-blur-xl flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Categories
          </motion.button>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 mb-8 shadow-xl backdrop-blur-md"
          >
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-rose-400 mr-3" />
              <p className="text-rose-200 font-bold text-[11px] tracking-widest uppercase">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Form Container */}
        <div className={`${emeraldCardBase} p-6 sm:p-10 before:from-[#3CFF9E]/05`}>
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Category Name */}
            <div className="group">
              <label htmlFor="name" className={emeraldLabel + " mb-3 block group-focus-within:text-[#3CFF9E] transition-colors"}>
                Category Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-5 py-4 bg-white/[0.02] border border-white/10 rounded-2xl text-sm font-bold text-white placeholder-[#586069] focus:outline-none focus:border-[#3CFF9E]/50 focus:bg-white/[0.04] transition-all"
                placeholder="Enter unique category name..."
                required
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div className="group">
              <label htmlFor="description" className={emeraldLabel + " mb-3 block group-focus-within:text-[#3CFF9E] transition-colors"}>
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-5 py-4 bg-white/[0.02] border border-white/10 rounded-2xl text-sm font-bold text-white placeholder-[#586069] focus:outline-none focus:border-[#3CFF9E]/50 focus:bg-white/[0.04] transition-all resize-none"
                rows={4}
                placeholder="Enter category description..."
                disabled={loading}
              />
            </div>

            {/* Category Image Upload */}
            <div>
              <label className={emeraldLabel + " mb-3 block"}>
                Category Image (Optional)
              </label>
              <div className="relative border-2 border-dashed border-[#3CFF9E]/20 rounded-2xl p-10 text-center hover:border-[#3CFF9E]/50 hover:bg-[#3CFF9E]/05 transition-all duration-500 cursor-pointer group/upload">
                {imagePreview ? (
                  <div className="relative inline-block group">
                    <img
                      src={imagePreview}
                      alt="Category preview"
                      className="w-56 h-56 object-cover rounded-2xl mx-auto shadow-2xl border border-white/10"
                    />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-4 -right-4 bg-rose-500 text-white rounded-full p-3 hover:bg-rose-600 transition-all duration-300 shadow-2xl z-20"
                    >
                      <X className="h-5 w-5" />
                    </motion.button>
                  </div>
                ) : (
                  <div className="py-10">
                    <div className={`w-20 h-20 rounded-2xl ${emeraldIconWrap} mx-auto mb-6 flex items-center justify-center shadow-2xl group-hover/upload:border-[#3CFF9E]/40 transition-all`}>
                      <Upload className={`h-8 w-8 ${emeraldIcon}`} />
                    </div>
                    <p className="text-[11px] font-bold text-white uppercase tracking-[0.2em] mb-3">
                      Drop files to upload or Browse
                    </p>
                    <p className="text-[9px] text-[#6A827B] font-bold tracking-[0.2em] uppercase">PNG, WebP up to 5MB</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Parent Category Selection */}
            <div className="group">
              <label htmlFor="parent" className={emeraldLabel + " mb-3 block group-focus-within:text-[#3CFF9E] transition-colors"}>
                Parent Category (Optional)
              </label>
              <div className="relative">
                <select
                  id="parent"
                  name="parent"
                  value={formData.parent}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-white/[0.02] border border-white/10 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-[#3CFF9E]/50 focus:bg-white/[0.04] transition-all appearance-none cursor-pointer"
                  disabled={loading}
                >
                  <option value="" className="bg-[#0F1720]">None (Main Category)</option>

                  {/* Admin/Global Categories */}
                  {adminCategories.length > 0 && (
                    <optgroup label="🌍 Global Categories" className="bg-[#0F1720] text-[#3CFF9E]">
                      {adminCategories.map((category: any) => (
                        <option key={`admin-${category.id}`} value={category.id} className="text-white bg-[#0F1720]">
                          🌍 {category.name}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* Vendor Categories */}
                  {categories.length > 0 && (
                    <optgroup label="👤 My Categories" className="bg-[#0F1720] text-[#3CFF9E]">
                      {categories.map((category: any) => (
                        <option key={`vendor-${category.id}`} value={category.id} className="text-white bg-[#0F1720]">
                          👤 {category.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <div className="absolute right-5 top-1/2 transform -translate-y-1/2 pointer-events-none text-[#586069] group-hover:text-[#3CFF9E] transition-colors">
                  <Tag className="h-5 w-5" />
                </div>
              </div>

              {/* Advanced Tip */}
              <div className="mt-5 p-5 bg-[#3CFF9E]/05 border border-[#3CFF9E]/20 rounded-2xl border-l-[4px] border-l-[#3CFF9E]">
                <p className="text-[10px] text-[#3CFF9E] font-bold tracking-widest uppercase leading-relaxed opacity-90">
                  <span className="font-bold underline mr-2">PRO TIP:</span>
                  Using a global category as a parent helps customers find your products more easily.
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-5 pt-10 border-t border-white/5">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => navigate('/vendor/categories')}
                disabled={loading}
                className="flex-1 h-14 px-8 bg-white/5 border border-white/10 text-white/70 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
              >
                Cancel
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, translateY: -2 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={loading}
                className="flex-[2] h-14 flex items-center justify-center gap-4 px-10 rounded-xl bg-gradient-to-r from-[#00FF9D] to-[#3CFF9E] text-black text-[12px] font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_30px_rgba(60,255,158,0.2)] hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Save Category
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VendorCategoryCreate;
