import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
// Using native input and textarea elements directly
import { Loader2, Save, X, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

// Import the APIs with proper typing
import { vendorAPI, resolveMediaUrl } from '@/services/api';

// Type definitions for the product data
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image?: string;
  category?: {
    id: string | number;
    name: string;
  };
}

// Extend the ProductFormData interface to match form fields
interface ProductFormData {
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  image?: FileList;
}

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface ProductFormData {
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  image?: FileList;
}

const ProductEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch categories with proper filtering
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        console.log('Fetching categories...');
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


  // Fetch product data
  const { data: product, isLoading: isLoadingProduct } = useQuery<Product | null>({
    queryKey: ['product', id],
    queryFn: async () => {
      try {
        const response = await vendorAPI.getProduct(id!);
        return response.data as Product;
      } catch (error) {
        console.error('Error loading product:', error);
        toast({
          title: 'Error',
          description: 'Failed to load product data',
          variant: 'destructive',
        });
        navigate('/vendor/products');
        return null;
      }
    },
    enabled: !!id,
  });

  // Initialize form with proper type
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<ProductFormData>({
    defaultValues: {
      name: '',
      category: '',
      price: 0,
      stock: 0,
      description: ''
    }
  });

  const selectedImage = watch('image');

  // Set form values when product data is loaded
  useEffect(() => {
    if (product) {
      // Ensure category ID is a string for the form
      const categoryId = product.category?.id ? String(product.category.id) : '';

      reset({
        name: product.name,
        category: categoryId,
        price: product.price,
        stock: product.stock,
        description: product.description,
      });

      // Set image preview if exists
      if (product.image) {
        setImagePreview(resolveMediaUrl(product.image) || null);
      }
    }
  }, [product, reset]);

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Image size must be less than 2MB',
          variant: 'destructive',
        });
        return;
      }

      // Update form value for the image
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const fileList = dataTransfer.files;
      setValue('image', fileList as unknown as FileList, { shouldValidate: true });
    }
  };

  // Handle image preview
  useEffect(() => {
    if (selectedImage && selectedImage.length > 0) {
      const file = selectedImage[0];
      setImagePreview(URL.createObjectURL(file));
    } else if (product?.image) {
      setImagePreview(resolveMediaUrl(product.image) || null);
    } else {
      setImagePreview(null);
    }
  }, [selectedImage, product]);

  const removeImage = () => {
    setValue('image', undefined as any);
    setImagePreview(null);
  };

  // Update product mutation
  const { mutate: updateProduct, isPending: isUpdating } = useMutation({
    mutationFn: async (data: FormData) => {
      return await vendorAPI.updateProduct(id!, data);
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });

      toast({
        title: 'Success',
        description: 'Product updated successfully',
        variant: 'default',
      });

      navigate('/vendor/products');
    },
    onError: (error: any) => {
      console.error('Error updating product:', error);

      if (error.response?.data) {
        const { data } = error.response;

        // Handle field-specific errors
        if (data.detail) {
          toast({
            title: 'Error',
            description: data.detail,
            variant: 'destructive',
          });
          return;
        }

        // Handle field validation errors
        const fieldErrors: string[] = [];
        Object.entries(data).forEach(([field, messages]) => {
          const message = Array.isArray(messages) ? messages[0] : String(messages);
          fieldErrors.push(`${field}: ${message}`);
        });

        toast({
          title: 'Validation Error',
          description: fieldErrors.join('\n'),
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update product. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });

  const onSubmit = async (formData: ProductFormData) => {
    const data = new FormData();
    data.append('name', formData.name.trim());
    data.append('category', formData.category);
    data.append('price', formData.price.toString());
    data.append('stock', formData.stock.toString());
    data.append('description', formData.description.trim());

    if (formData.image && formData.image[0]) {
      data.append('image', formData.image[0]);
    }

    updateProduct(data);
  };

  if (isLoadingProduct || isLoadingCategories) {
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

  if (!product) {
    return (
      <div className="min-h-screen bg-[#070B0F] flex items-center justify-center text-white p-6">
        <div className="max-w-md mx-auto bg-[#0F1720] rounded-2xl shadow-lg border border-white/10 p-8 text-center">
          <p className="text-lg font-bold text-[#8B949E]">Product not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative min-h-screen text-[#E6E8EA] font-sans selection:bg-[#00FF9D]/30 pb-12 bg-[#070B0F]">
      {/* Subtle animated background elements */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
          style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[20%] -right-[5%] w-[35%] h-[35%] bg-violet-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent leading-relaxed py-2">Edit Product</h1>
          <p className="text-gray-400 mt-1 font-medium flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Update your product details and configuration
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0F1720] shadow-lg p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-2">Product Name *</label>
              <input
                id="name"
                type="text"
                placeholder="Enter product name"
                className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm font-bold text-white placeholder-[#586069] focus:outline-none focus:border-[#00FF9D]/50 transition-all"
                {...register('name', {
                  required: 'Product name is required',
                  minLength: { value: 3, message: 'Name must be at least 3 characters' },
                  maxLength: { value: 100, message: 'Name must not exceed 100 characters' },
                })}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="category" className="block text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-2">Category *</label>
              <select
                id="category"
                className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-[#00FF9D]/50 transition-all appearance-none"
                {...register('category', { required: 'Please select a category' })}
              >
                <option value="" className="bg-[#0D1117]">Select a category</option>
                {categories && categories.length > 0 ? (
                  categories.map((category: Category) => (
                    <option key={category.id} value={category.id} className="bg-[#0D1117]">
                      {category.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No categories available</option>
                )}
              </select>
              {errors.category && (
                <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label htmlFor="price" className="block text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-2">Price ($) *</label>
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm font-bold text-white placeholder-[#586069] focus:outline-none focus:border-[#00FF9D]/50 transition-all"
                  {...register('price', {
                    required: 'Price is required',
                    min: { value: 0.01, message: 'Price must be greater than 0' },
                  })}
                />
                {errors.price && (
                  <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="stock" className="block text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-2">Stock Quantity *</label>
                <input
                  id="stock"
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm font-bold text-white placeholder-[#586069] focus:outline-none focus:border-[#00FF9D]/50 transition-all"
                  {...register('stock', {
                    required: 'Stock is required',
                    min: { value: 0, message: 'Stock cannot be negative' },
                    valueAsNumber: true,
                  })}
                />
                {errors.stock && (
                  <p className="mt-1 text-xs text-red-600">{errors.stock.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-2">Description *</label>
              <textarea
                id="description"
                rows={4}
                placeholder="Describe your product in detail..."
                className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm font-bold text-white placeholder-[#586069] focus:outline-none focus:border-[#00FF9D]/50 transition-all resize-none"
                {...register('description', {
                  required: 'Description is required',
                  minLength: { value: 10, message: 'Description must be at least 10 characters' },
                  maxLength: { value: 1000, message: 'Description must not exceed 1000 characters' },
                })}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#8B949E] uppercase tracking-wider mb-2">Product Image</label>
              <div className="mt-2 flex flex-col sm:flex-row items-start gap-4">
                <div className={`relative flex items-center justify-center w-32 h-32 rounded-xl border-2 border-dashed ${errors.image ? 'border-rose-500/50 bg-rose-500/5' : 'border-[#00FF9D]/30 bg-white/[0.02]'} overflow-hidden group hover:border-[#00FF9D]/60 transition-all duration-300 shadow-inner`}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Product preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-[#586069] group-hover:text-[#00FF9D] transition-colors duration-300">
                      <ImageIcon className="h-8 w-8 mb-1" />
                      <span className="text-xs font-bold uppercase tracking-wider">Upload</span>
                    </div>
                  )}
                  <input
                    id="image-upload"
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </div>
                <div className="flex-1">
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="mb-3 flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all hover:bg-rose-500/20 shadow-sm"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Remove Image
                    </button>
                  )}
                  <p className="text-[10px] text-[#586069] font-bold uppercase tracking-wider leading-relaxed">
                    Recommended size: 800x800px<br />
                    Max file size: 2MB<br />
                    Formats: JPG, PNG, WebP
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                type="button"
                onClick={() => navigate('/vendor/products')}
                disabled={isUpdating}
                className="flex-1 sm:flex-none px-6 h-11 bg-white/[0.03] border border-white/5 text-white text-xs font-bold rounded-xl transition-all hover:bg-white/[0.08] disabled:opacity-50"
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02, translateY: -2 }}
                whileTap={{ scale: 0.98 }}
                disabled={isUpdating}
                className="flex-1 flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-xl shadow-emerald-900/40 border border-emerald-400/20 disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Product
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

export default ProductEdit;
