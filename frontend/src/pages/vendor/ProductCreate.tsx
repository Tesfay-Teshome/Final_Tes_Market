import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { vendorAPI } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, X, Image as ImageIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';

interface Category {
  id: string | number;
  name: string;
  description?: string;
}

interface ProductFormData {
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  image: FileList;
}

const ProductCreate = () => {
  const navigate = useNavigate();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch categories with proper filtering
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ['vendor-categories'],
    queryFn: async () => {
      try {
        console.log('Fetching vendor categories...');
        const response = await vendorAPI.getCategories();
        console.log('Raw API response:', response);

        // Get the categories array from the response
        const categoriesData = Array.isArray(response?.data) ? response.data : [];
        console.log('Raw categories data:', categoriesData);

        // Filter out any unexpected categories and map to expected format
        const validCategories = categoriesData
          .filter((cat: any) => {
            // Only include categories that have both id and name
            const isValid = cat &&
              cat.id !== undefined &&
              cat.id !== null &&
              cat.name &&
              typeof cat.name === 'string';

            if (!isValid) {
              console.warn('Skipping invalid category:', cat);
            }

            return isValid;
          })
          .map((cat: any) => ({
            id: cat.id.toString(),
            name: cat.name.trim(),
            description: cat.description || ''
          }));

        console.log('completed valid categories:', validCategories);
        return validCategories;
      } catch (error) {
        console.error('Error loading categories:', error);
        toast({
          title: 'Error',
          description: 'Failed to load categories',
          variant: 'destructive',
        });
        return [];
      }
    },
    staleTime: 0,
    ...({ gcTime: 0 } as any)
  });

  // Log the categories for debugging
  useEffect(() => {
    console.log('Current categories:', categories);
  }, [categories]);


  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<ProductFormData>();
  const selectedImage = watch('image');

  // Handle image preview
  useEffect(() => {
    if (selectedImage && selectedImage.length > 0) {
      const file = selectedImage[0];
      if (file) {
        // Revoke the previous object URL to avoid memory leaks
        if (imagePreview) {
          URL.revokeObjectURL(imagePreview);
        }

        const objectUrl = URL.createObjectURL(file);
        setImagePreview(objectUrl);

        // Cleanup function to revoke the object URL when component unmounts or when image changes
        return () => {
          URL.revokeObjectURL(objectUrl);
        };
      }
    } else {
      setImagePreview(null);
    }
  }, [selectedImage]);

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const removeImage = () => {
    setValue('image', undefined as any, { shouldValidate: true });
    setImagePreview(null);
  };

  const queryClient = useQueryClient();
  const { mutate: createProduct, isPending: isCreating } = useMutation({
    mutationFn: async (formData: FormData) => {
      return await vendorAPI.createProduct(formData);
    },
    onSuccess: () => {
      // Invalidate and refetch the products query
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      toast({
        title: 'Success',
        description: 'Product created successfully',
        variant: 'default',
      });
      navigate('/vendor/products');
    },
    onError: (error: any) => {
      console.error('Error creating product:', error);
      console.error('Full error response:', error.response?.data);
      const errorMessage = error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to create product';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: ProductFormData) => {
    try {
      const formData = new FormData();
      formData.append('name', data.name.trim());

      // Validate and append category
      if (!data.category) {
        throw new Error('Please select a category');
      }
      const categoryId = parseInt(data.category, 10);
      if (isNaN(categoryId)) {
        throw new Error('Invalid category selected');
      }
      formData.append('category', categoryId.toString());

      // Validate and append price
      const price = parseFloat(data.price.toString());
      if (isNaN(price) || price <= 0) {
        throw new Error('Price must be greater than 0');
      }
      formData.append('price', price.toString());

      // Validate and append stock
      const stock = parseInt(data.stock.toString(), 10);
      if (isNaN(stock) || stock < 0) {
        throw new Error('Stock cannot be negative');
      }
      formData.append('stock', stock.toString());

      // Validate and append description
      const description = data.description.trim();
      if (!description || description.length < 10) {
        throw new Error('Description must be at least 10 characters long');
      }
      formData.append('description', description);

      // Validate and append image
      if (!data.image || !data.image[0]) {
        throw new Error('Product image is required');
      }
      formData.append('image', data.image[0]);

      // Log the form data being sent
      console.log('Submitting form data:', {
        name: data.name.trim(),
        category: categoryId,
        price: price,
        stock: stock,
        description: description,
        hasImage: true
      });

      createProduct(formData);
    } catch (error) {
      toast({
        title: 'Validation Error',
        description: error instanceof Error ? error.message : 'An error occurred while processing the form',
        variant: 'destructive',
      });
    }
  };

  if (isLoadingCategories) {
    return (
      <div className="min-h-screen bg-[#070B0F] flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-[60px] rounded-full animate-pulse" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="relative h-16 w-16 rounded-2xl border-2 border-t-[#3CFF9E] border-r-transparent border-b-emerald-900 border-l-transparent"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative min-h-screen text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 pb-12 bg-[#070B0F]">
      {/* Premium Background Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
          style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[20%] -right-[5%] w-[35%] h-[35%] bg-violet-500/5 rounded-full blur-[100px]" />
      </div>
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent leading-relaxed py-2">Create New Product</h1>
          <p className="text-gray-400 mt-1 font-medium flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Fill in the details below to add a new product to your store
          </p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0F1720] shadow-lg p-6 sm:p-8">

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-2">Product Name *</label>
              <input
                id="name"
                type="text"
                {...register('name', { required: 'Product name is required' })}
                className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm font-bold text-white placeholder-[#586069] focus:outline-none focus:border-[#00FF9D]/50 transition-all"
                placeholder="Enter product name"
              />
              {errors.name && <p className="mt-1 text-[10px] text-rose-400">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="category" className="block text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-2">Category *</label>
              <select
                id="category"
                {...register('category', { required: 'Category is required' })}
                className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-[#00FF9D]/50 transition-all appearance-none"
              >
                <option value="" className="bg-[#0D1117]">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id} className="bg-[#0D1117]">
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-[10px] text-rose-400">{errors.category.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label htmlFor="price" className="block text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-2">Price ($) *</label>
                <input
                  id="price" type="number" step="0.01" min="0"
                  {...register('price', { required: 'Price is required', min: { value: 0.01, message: 'Price must be greater than 0' } })}
                  className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm font-bold text-white placeholder-[#586069] focus:outline-none focus:border-[#00FF9D]/50 transition-all"
                  placeholder="0.00"
                />
                {errors.price && <p className="mt-1 text-[10px] text-rose-400">{errors.price.message}</p>}
              </div>
              <div>
                <label htmlFor="stock" className="block text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-2">Stock Quantity *</label>
                <input
                  id="stock" type="number" min="0"
                  {...register('stock', { required: 'Stock quantity is required', min: { value: 0, message: 'Stock cannot be negative' } })}
                  className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm font-bold text-white placeholder-[#586069] focus:outline-none focus:border-[#00FF9D]/50 transition-all"
                  placeholder="0"
                />
                {errors.stock && <p className="mt-1 text-[10px] text-rose-400">{errors.stock.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-2">Description *</label>
              <textarea
                id="description" rows={4}
                {...register('description', { required: 'Description is required', minLength: { value: 10, message: 'Description must be at least 10 characters' } })}
                className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm font-bold text-white placeholder-[#586069] focus:outline-none focus:border-[#00FF9D]/50 transition-all resize-none"
                placeholder="Describe your product in detail..."
              />
              {errors.description && <p className="mt-1 text-[10px] text-rose-400">{errors.description.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-2">Product Image *</label>
              <div className="mt-2 flex flex-col sm:flex-row items-start gap-4">
                <div className={`relative flex items-center justify-center w-32 h-32 rounded-xl border-2 border-dashed ${errors.image ? 'border-rose-500/50 bg-rose-500/5' : 'border-[#00FF9D]/30 bg-white/[0.02]'} overflow-hidden group hover:border-[#00FF9D]/60 transition-all duration-300`}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Product preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-[#586069] group-hover:text-[#00FF9D] transition-colors duration-300">
                      <ImageIcon className="h-8 w-8 mb-1" />
                      <span className="text-xs font-bold uppercase tracking-wider">Upload</span>
                    </div>
                  )}
                  <input
                    id="image-upload" type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept="image/*"
                    {...register('image', {
                      required: 'Product image is required',
                      validate: (value) => {
                        if (value && value[0]) {
                          const file = value[0];
                          if (file.size > 2 * 1024 * 1024) return 'Image size must be less than 2MB';
                          return true;
                        }
                        return 'Please select an image';
                      },
                    })}
                  />
                </div>
                <div className="flex-1">
                  {imagePreview && (
                    <button type="button" onClick={() => { setValue('image', undefined as any); setImagePreview(null); }}
                      className="mb-3 flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all hover:bg-rose-500/20"
                    >
                      <X className="h-3.5 w-3.5" /> Remove Image
                    </button>
                  )}
                  <p className="text-[10px] text-[#586069] font-bold uppercase tracking-wider leading-relaxed">
                    Recommended: 800×800px<br />
                    Max size: 2MB<br />
                    Formats: JPG, PNG, WebP
                  </p>
                  {errors.image && <p className="mt-2 text-[10px] text-rose-400">{errors.image.message}</p>}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/vendor/products')}
                disabled={isCreating}
                className="flex-1 sm:flex-none px-6 h-11 bg-white/[0.03] border border-white/5 text-white text-xs font-bold rounded-xl transition-all hover:bg-white/[0.08] disabled:opacity-50"
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02, translateY: -2 }}
                whileTap={{ scale: 0.98 }}
                disabled={isCreating}
                className="flex-1 flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-xl shadow-emerald-900/40 border border-emerald-400/20 disabled:opacity-50"
              >
                {isCreating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Creating...</>
                ) : (
                  <><Plus className="h-4 w-4" />Create Product</>
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductCreate;
