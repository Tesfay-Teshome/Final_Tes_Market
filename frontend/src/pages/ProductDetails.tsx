import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { Heart, ShoppingCart, Store, Star, Share2, Truck, Shield, ArrowLeft, Check, MessageCircle } from 'lucide-react';
import { productsAPI, reviewsAPI, wishlistAPI, cartAPI } from '@/services/api';
import { Product, Review } from '@/types';
import { addItem } from '@/store/slices/cartSlice';
import { useToast } from '@/components/ui/use-toast';
import FadeIn from '@/components/animations/FadeIn';
import { RootState } from '@/store';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(5, 'Review comment must be at least 5 characters'),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

const ProductDetails = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 5,
    },
  });

  // Fetch product details
  const { data: productData, error: productError } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await productsAPI.getAll();
      return Array.isArray(response.data) ? response.data : []; // Ensure this returns an array
    },
  });

  const product = productData?.find((product) => product.slug === slug);

  // Fetch product reviews
  const { data: reviews, isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ['reviews', slug],
    queryFn: async () => {
      const response = await reviewsAPI.getAll({ product: slug });
      return response.data;
    },
    enabled: !!slug,
  });

  // Add to wishlist mutation
  const addToWishlistMutation = useMutation({
    mutationFn: (productId: string) => wishlistAPI.addItem(productId),
    onSuccess: () => {
      toast({
        title: 'Added to wishlist',
        description: `${product?.name} has been added to your wishlist.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to add to wishlist.',
        variant: 'destructive',
      });
    },
  });

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: (data: ReviewFormData) => 
      reviewsAPI.create({
        product: product?.id,
        rating: data.rating,
        comment: data.comment,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', slug] });
      toast({
        title: 'Review submitted',
        description: 'Thank you for your review!',
      });
      setIsReviewModalOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to submit review.',
        variant: 'destructive',
      });
    },
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartAPI.addItem(productId, quantity),
    onSuccess: (response) => {
      // Server returns the full cart; keep Redux in sync with backend response
      if (response?.data) {
        // Lazily import to avoid circular deps during SSR
        import('@/store/slices/cartSlice').then(({ setCart }) => {
          dispatch(setCart(response.data));
        });
      }
      toast({
        title: 'Added to cart',
        description: `${product?.name} has been added to your cart.`,
      });
      // Optionally refresh cart query cache
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to add to cart.',
        variant: 'destructive',
      });
    },
  });

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication required',
        description: 'Please login to add items to your cart.',
      });
      navigate('/login', { state: { from: `/products/${slug}` } });
      return;
    }

    if (product) {
      addToCartMutation.mutate({ productId: product.id, quantity });
    }
  };

  const handleAddToWishlist = () => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication required',
        description: 'Please login to add items to your wishlist.',
      });
      navigate('/login', { state: { from: `/products/${slug}` } });
      return;
    }

    if (product) {
      addToWishlistMutation.mutate(product.id);
    }
  };

  const handleShareProduct = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name,
        text: product?.description,
        url: window.location.href,
      }).catch((error) => {
        console.error('Error sharing:', error);
      });
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link copied',
        description: 'Product link copied to clipboard.',
      });
    }
  };

  const openReviewModal = () => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication required',
        description: 'Please login to write a review.',
      });
      navigate('/login', { state: { from: `/products/${slug}` } });
      return;
    }
    setIsReviewModalOpen(true);
  };

  const onSubmitReview = (data: ReviewFormData) => {
    submitReviewMutation.mutate(data);
  };

  // Calculate average rating
  const averageRating = reviews?.length 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  if (productError || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Product not found</h2>
          <p className="text-gray-600 mb-8">
            The product you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          to="/products"
          className="inline-flex items-center text-gray-600 hover:text-emerald-600"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Product Image */}
        <FadeIn direction="left">
          <div className="bg-white rounded-lg overflow-hidden shadow-md">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        </FadeIn>

        {/* Product Info */}
        <FadeIn direction="right">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {product.name}
            </h1>
            
            <div className="flex items-center mb-4">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-5 w-5 ${i < Math.round(averageRating) ? 'fill-current' : ''}`} 
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500 ml-2">
                ({averageRating.toFixed(1)}) • {reviews?.length || 0} reviews
              </span>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <span className="text-3xl font-bold text-emerald-600">
                ${product.price}
              </span>
              <span className="text-gray-500">
                {product.stock > 0 ? (
                  <span className="inline-flex items-center text-green-600">
                    <Check className="h-4 w-4 mr-1" />
                    In Stock ({product.stock})
                  </span>
                ) : (
                  <span className="text-red-600">Out of Stock</span>
                )}
              </span>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <div className="flex items-center">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-1 border border-gray-300 rounded-l-md bg-gray-50 hover:bg-gray-100"
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-16 text-center border-t border-b border-gray-300 py-1"
                />
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="px-3 py-1 border border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100"
                  disabled={quantity >= product.stock}
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white ${
                  product.stock > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-gray-400 cursor-not-allowed'
                } transition-colors`}
              >
                <ShoppingCart className="h-5 w-5" />
                Add to Cart
              </button>
              <button
                onClick={handleAddToWishlist}
                className="flex items-center justify-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Heart className="h-5 w-5" />
              </button>
              <button 
                onClick={handleShareProduct}
                className="flex items-center justify-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>

            <div className="prose max-w-none">
              <h2 className="text-xl font-semibold mb-2">Description</h2>
              <p className="text-gray-600 mb-6">{product.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <Truck className="h-5 w-5 text-emerald-600 mr-2" />
                <span className="text-sm">Free Shipping</span>
              </div>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <Shield className="h-5 w-5 text-emerald-600 mr-2" />
                <span className="text-sm">Secure Payment</span>
              </div>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <Check className="h-5 w-5 text-emerald-600 mr-2" />
                <span className="text-sm">Quality Guarantee</span>
              </div>
            </div>

            {/* Vendor Info */}
            <div className="border-t pt-6 mt-6">
              <div className="flex items-center gap-4">
                <Store className="h-6 w-6 text-gray-400" />
                <div>
                  <h3 className="font-semibold">{product.vendor.store_name || product.vendor.username}</h3>
                  <p className="text-sm text-gray-500">
                    {product.vendor.store_description || 'Verified Vendor'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Reviews Section */}
      <div className="mt-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Customer Reviews</h2>
          <button 
            onClick={openReviewModal}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Write a Review
          </button>
        </div>
        
        {reviewsLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : reviews && reviews.length > 0 ? (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-4 w-4 ${i < review.rating ? 'fill-current' : ''}`} 
                      />
                    ))}
                  </div>
                 <div className="ml-2 text-sm font-medium">{review.user.username}</div>
                </div>
                <p className="text-gray-700">{review.comment}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <p className="text-gray-600 mb-4">No reviews yet. Be the first to review this product!</p>
            <button 
              onClick={openReviewModal}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Write a Review
            </button>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Write a Review</h2>
            <form onSubmit={handleSubmit(onSubmitReview)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rating
                </label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <label key={star} className="cursor-pointer">
                      <input
                        type="radio"
                        value={star}
                        {...register('rating', { valueAsNumber: true })}
                        className="sr-only"
                      />
                      <Star 
                        className={`h-8 w-8 ${
                          star <= Number(watch('rating') || 0) 
                            ? 'text-yellow-400 fill-current' 
                            : 'text-gray-300'
                        }`} 
                      />
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Review
                </label>
                <textarea
                  {...register('comment')}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Share your experience with this product..."
                ></textarea>
                {errors.comment && (
                  <p className="mt-1 text-sm text-red-600">{errors.comment.message}</p>
                )}
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;