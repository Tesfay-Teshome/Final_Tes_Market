import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import { RootState } from '@/store';
import { removeItem, updateQuantity, clearCart, setCart } from '@/store/slices/cartSlice';
import { useToast } from '@/components/ui/use-toast';
import { cartAPI, adminAPI, resolveMediaUrl } from '@/services/api';
import { useQuery } from '@tanstack/react-query';

// Safely format money values coming from backend (which may be strings from Decimal fields)
const toMoney = (value: unknown) => {
  const num = typeof value === 'number' ? value : Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  return safe.toFixed(2);
};

const Cart = () => {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const navigate = useNavigate();
  const items = useSelector((state: RootState) => state.cart?.items ?? []);
  const total = useSelector((state: RootState) => state.cart?.total ?? 0);
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [orderedProductIds, setOrderedProductIds] = useState<string[]>([]);

  // Check authentication before any cart operation
  const requireAuth = () => {
    if (!isAuthenticated || !user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to manage your cart',
        variant: 'destructive',
      });
      navigate('/login');
      return false;
    }
    return true;
  };

  // Fetch cart data
  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartAPI.get(),
    enabled: isAuthenticated,
  });

  // Fetch user orders to identify ordered products
  const { data: ordersData } = useQuery({
    queryKey: ['buyer-orders'],
    queryFn: () => adminAPI.getBuyerOrders(),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (cartData?.data) {
      console.log('🛒 Cart Data from Backend:', cartData.data);
      dispatch(setCart(cartData.data));
    }
  }, [cartData, dispatch]);

  // Simplified: Don't separate cart items - let users checkout normally
  // Only show info message if there are pending orders, but don't block checkout
  useEffect(() => {
    if (ordersData?.data) {
      const orderedIds: string[] = [];

      ordersData.data.forEach((order: any) => {
        order.items?.forEach((item: any) => {
          // Only track truly pending orders for info purposes
          if (order.status === 'pending' || order.status === 'awaiting_approval') {
            orderedIds.push(item.product.id);
          }
        });
      });

      setOrderedProductIds(orderedIds);
    }
  }, [ordersData, dispatch]);

  // Treat all cart items as available for checkout
  const availableItems = items; // All items are available
  const orderedItems: any[] = []; // Don't separate items

  // Calculate total properly from all cart items
  const availableTotal = items.reduce((sum, item) => {
    const itemPrice = Number(item.product?.price) || 0;
    const itemQuantity = Number(item.quantity) || 0;
    const itemSubtotal = itemPrice * itemQuantity;
    console.log(`💰 Item ${item.product?.name}: $${itemPrice} × ${itemQuantity} = $${itemSubtotal}`);
    return sum + itemSubtotal;
  }, 0);

  console.log(`🛒 Cart Total: $${availableTotal.toFixed(2)} from ${items.length} items`);

  const handleUpdateQuantity = async (id: string, quantity: number) => {
    if (quantity < 1) return;

    if (!requireAuth()) return;

    try {
      console.log(`🔄 Updating cart item ${id} to quantity ${quantity}`);

      // Update backend first
      const response = await cartAPI.updateItem(id, { quantity });
      console.log('✅ Update successful:', response.data);

      // Update Redux store with fresh cart data
      dispatch(setCart(response.data));

      toast({
        title: 'Updated',
        description: 'Quantity updated successfully.',
      });
    } catch (error: any) {
      console.error('❌ Failed to update quantity:', error);
      if (error?.response?.status === 401) {
        toast({
          title: 'Session Expired',
          description: 'Please log in again',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method
      });

      toast({
        title: 'Error',
        description: `Failed to update quantity: ${error.response?.data?.error || error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveItem = async (id: string) => {
    if (!requireAuth()) return;

    try {
      console.log(`🗑️ Removing cart item ${id}`);

      // Remove from backend first
      const response = await cartAPI.removeItem(id);
      console.log('✅ Remove successful:', response.data);

      // Update Redux store with fresh cart data
      dispatch(setCart(response.data));

      toast({
        title: 'Item removed',
        description: 'The item has been removed from your cart.',
      });
    } catch (error: any) {
      console.error('❌ Failed to remove item:', error);

      if (error?.response?.status === 401) {
        toast({
          title: 'Session Expired',
          description: 'Please log in again to continue',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }

      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method
      });

      toast({
        title: 'Error',
        description: `Failed to remove item: ${error.response?.data?.error || error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleClearCart = async () => {
    if (availableItems.length === 0) return;

    if (!requireAuth()) return;

    if (!window.confirm('Are you sure you want to clear your entire cart? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('🧹 Clearing entire cart');

      // Clear cart from backend first
      const response = await cartAPI.clear();
      console.log('✅ Clear successful:', response.data);

      // Update Redux store with fresh cart data
      dispatch(setCart(response.data));

      toast({
        title: 'Cart cleared',
        description: 'All items have been removed from your cart.',
      });
    } catch (error: any) {
      console.error('❌ Failed to clear cart:', error);

      if (error?.response?.status === 401) {
        toast({
          title: 'Session Expired',
          description: 'Please log in again to continue',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }

      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method
      });

      toast({
        title: 'Error',
        description: `Failed to clear cart: ${error.response?.data?.error || error.message}`,
        variant: 'destructive',
      });
    }
  };

  const getOrderStatus = (productId: string) => {
    if (!ordersData?.data) return null;

    for (const order of ordersData.data) {
      const orderItem = order.items?.find((item: any) => item.product.id === productId);
      if (orderItem && order.status !== 'cancelled' && order.status !== 'completed') {
        return {
          status: order.status,
          orderId: order.id,
          adminApproved: order.admin_approved
        };
      }
    }
    return null;
  };

  const getStatusIcon = (status: string, adminApproved: boolean) => {
    if (status === 'pending' || status === 'awaiting_approval') {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
    if (status === 'approved' && adminApproved) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (status === 'processing') {
      return <Package className="h-4 w-4 text-emerald-500" />;
    }
    if (status === 'cancelled') {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    return <Clock className="h-4 w-4 text-gray-500" />;
  };

  const getStatusText = (status: string, adminApproved: boolean) => {
    if (status === 'pending' || status === 'awaiting_approval') {
      return 'Awaiting Admin Approval';
    }
    // Since we only show pending orders in cart, this shouldn't be reached
    return 'Awaiting Admin Approval';
  };

  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="h-24 w-24 text-gray-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Add some products to get started!</p>
          <Link
            to="/products"
            className="inline-block bg-gradient-to-r from-emerald-600 to-emerald-800 text-white px-8 py-3 rounded-xl hover:from-emerald-500 hover:to-emerald-700 transition-all duration-300 shadow-lg shadow-emerald-900/20 border border-emerald-400/20 text-xs font-black uppercase tracking-widest"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">

            {/* Available Items for Checkout */}
            {availableItems.length > 0 && (
              <div className="bg-white rounded-lg shadow-md">
                <div className="p-4 border-b bg-green-50">
                  <h2 className="text-lg font-semibold text-green-800 flex items-center">
                    <ShoppingBag className="h-5 w-5 mr-2" />
                    Available for Checkout ({availableItems.length} items)
                  </h2>
                </div>
                {availableItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 sm:gap-6 p-3 sm:p-6 border-b last:border-b-0"
                  >
                    <img
                      src={resolveMediaUrl(item.product.image) || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=128&h=128&fit=crop'}
                      alt={item.product.name}
                      className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-lg"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        const fallback = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=128&h=128&fit=crop';
                        if (el.src !== fallback) el.src = fallback;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <Link to={`/products/${item.product.slug}`} className="hover:text-emerald-600">
                        <h3 className="text-sm sm:text-lg font-semibold mb-2 truncate">
                          {item.product.name}
                        </h3>
                      </Link>
                      <p className="text-xs sm:text-base text-gray-600 mb-2 sm:mb-4">
                        ${toMoney(item.product.price)}
                      </p>
                      <div className="flex items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <button
                            onClick={() =>
                              handleUpdateQuantity(item.id, item.quantity - 1)
                            }
                            className="p-1 rounded-md hover:bg-gray-100"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                          </button>
                          <span className="w-6 sm:w-8 text-center text-sm sm:text-base">{item.quantity}</span>
                          <button
                            onClick={() =>
                              handleUpdateQuantity(item.id, item.quantity + 1)
                            }
                            className="p-1 rounded-md hover:bg-gray-100"
                            disabled={item.quantity >= item.product.stock}
                          >
                            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm sm:text-lg font-semibold">
                        ${toMoney((Number(item.product.price) || 0) * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Already Ordered Items */}
            {orderedItems.length > 0 && (
              <div className="bg-white rounded-lg shadow-md">
                <div className="p-4 border-b bg-emerald-50">
                  <h2 className="text-lg font-semibold text-emerald-800 flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Pending Orders ({orderedItems.length} items)
                  </h2>
                  <p className="text-sm text-emerald-600 mt-1">These items are awaiting admin approval and cannot be ordered again until completed</p>
                </div>
                {orderedItems.map((item) => {
                  const orderStatus = getOrderStatus(item.product.id);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 sm:gap-6 p-3 sm:p-6 border-b last:border-b-0 bg-gray-50"
                    >
                      <img
                        src={resolveMediaUrl(item.product.image) || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=128&h=128&fit=crop'}
                        alt={item.product.name}
                        className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-lg opacity-75"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          const fallback = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=128&h=128&fit=crop';
                          if (el.src !== fallback) el.src = fallback;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <Link to={`/products/${item.product.slug}`} className="hover:text-emerald-600">
                          <h3 className="text-sm sm:text-lg font-semibold mb-2 truncate">
                            {item.product.name}
                          </h3>
                        </Link>
                        <p className="text-xs sm:text-base text-gray-600 mb-2">
                          ${toMoney(item.product.price)}
                        </p>
                        {orderStatus && (
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(orderStatus.status, orderStatus.adminApproved)}
                            <span className="text-xs sm:text-sm font-medium">
                              {getStatusText(orderStatus.status, orderStatus.adminApproved)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 sm:gap-4">
                          <span className="text-xs sm:text-sm text-gray-500">Quantity: {item.quantity}</span>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-500 hover:text-red-600 text-xs sm:text-sm"
                          >
                            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm sm:text-lg font-semibold text-gray-500">
                          ${toMoney((Number(item.product.price) || 0) * item.quantity)}
                        </p>
                        {orderStatus && (
                          <Link
                            to={`/orders/${orderStatus.orderId}`}
                            className="text-xs sm:text-sm text-emerald-600 hover:text-emerald-800"
                          >
                            View Order
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Order Summary</h2>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between text-sm sm:text-base">
                  <span>Available Items Subtotal</span>
                  <span>${toMoney(availableTotal)}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="border-t pt-3 sm:pt-4">
                  <div className="flex justify-between font-semibold text-sm sm:text-base">
                    <span>Total</span>
                    <span>${toMoney(availableTotal)}</span>
                  </div>
                </div>
              </div>

              {availableItems.length > 0 ? (
                <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                  <Link
                    to={isAuthenticated ? "/checkout" : "/login?redirect=checkout"}
                    className="block w-full bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-center px-4 py-3 rounded-xl hover:from-emerald-500 hover:to-emerald-700 transition-all duration-300 text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20 border border-emerald-400/20"
                  >
                    {isAuthenticated ? "Proceed to Checkout" : "Login to Checkout"}
                  </Link>
                  <button
                    onClick={handleClearCart}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white text-center px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 flex items-center justify-center text-sm sm:text-base"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Clear Cart
                  </button>
                </div>
              ) : (
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-100 rounded-lg text-center">
                  <p className="text-xs sm:text-sm text-gray-600">No items available for checkout</p>
                  <Link
                    to="/products"
                    className="mt-2 inline-block text-emerald-600 hover:text-emerald-800 text-xs sm:text-sm"
                  >
                    Browse Products
                  </Link>
                </div>
              )}

              {orderedItems.length > 0 && (
                <Link
                  to="/buyer/dashboard"
                  className="mt-3 sm:mt-4 block w-full bg-gradient-to-r from-emerald-600 to-emerald-800 text-white text-center px-4 py-3 rounded-xl hover:from-emerald-500 hover:to-emerald-700 transition-all duration-300 text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20 border border-emerald-400/20"
                >
                  View My Orders
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;