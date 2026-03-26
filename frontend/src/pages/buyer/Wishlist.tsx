import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { wishlistAPI } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { WishlistItem } from '@/types';
import { useDispatch } from 'react-redux';
import { addItem } from '@/store/slices/cartSlice';

const Wishlist = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  const { data: wishlistData, error: wishlistError } = useQuery<WishlistItem[]>({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const response = await wishlistAPI.getAll();
      return Array.isArray(response.data) ? response.data : []; // Ensure this returns an array
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: (itemId: string) => wishlistAPI.removeItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast({
        title: 'Success',
        description: 'Item removed from wishlist.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove item from wishlist.',
        variant: 'destructive',
      });
    },
  });

  const handleRemoveFromWishlist = (itemId: string) => {
    removeFromWishlistMutation.mutate(itemId);
  };

  const handleAddToCart = (item: WishlistItem) => {
    dispatch(
      addItem({
        id: crypto.randomUUID(),
        product: item.product,
        quantity: 1,
        subtotal: item.product.price,
      })
    );
    toast({
      title: 'Added to cart',
      description: `${item.product.name} has been added to your cart.`,
    });
  };

  if (wishlistError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="mt-2 text-lg font-medium text-gray-900">Failed to load wishlist</h2>
          <p className="mt-1 text-sm text-gray-500">Please try again later.</p>
        </div>
      </div>
    );
  }

  if (!wishlistData?.length) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <Heart className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-2 text-lg font-medium text-gray-900">Your wishlist is empty</h2>
          <p className="mt-1 text-sm text-gray-500">Start adding some items to your wishlist!</p>
          <div className="mt-6">
            <Link
              to="/products"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 shadow-lg shadow-emerald-900/20 border border-emerald-400/20"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Wishlist</h1>

      <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
        {wishlistData.map((item) => (
          <div key={item.id} className="group relative">
            <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200">
              <img
                src={item.product.image}
                alt={item.product.name}
                className="h-full w-full object-cover object-center group-hover:opacity-75"
              />
            </div>
            <div className="mt-4 flex justify-between">
              <div>
                <h3 className="text-sm text-gray-700">
                  <Link to={`/products/${item.product.slug}`}>
                    <span aria-hidden="true" className="absolute inset-0" />
                    {item.product.name}
                  </Link>
                </h3>
                <p className="mt-1 text-sm text-gray-500">{item.product.category.name}</p>
              </div>
              <p className="text-sm font-medium text-gray-900">${item.product.price}</p>
            </div>
            <div className="mt-4 flex justify-between space-x-2">
              <button
                onClick={() => handleRemoveFromWishlist(item.id)}
                className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </button>
              <button
                onClick={() => handleAddToCart(item)}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-all duration-300 shadow-sm border border-emerald-400/20"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Wishlist;