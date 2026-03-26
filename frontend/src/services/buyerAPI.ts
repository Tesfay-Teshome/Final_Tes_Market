import api from './api';

// Buyer-specific API endpoints
export const buyerAPI = {
  // Orders
  getOrders: (params?: any) => 
    api.get('/api/buyer/orders/', { params }),
  
  getOrder: (id: string) => 
    api.get(`/api/buyer/orders/${id}/`),
  
  cancelOrder: (id: string, reason?: string) => 
    api.post(`/api/buyer/orders/${id}/cancel/`, { reason }),
  
  // Wishlist
  getWishlist: (params?: any) => 
    api.get('/api/buyer/wishlist/', { params }),
  
  addToWishlist: (productId: string) => 
    api.post('/api/buyer/wishlist/add_item/', { product_id: productId }),
  
  removeFromWishlist: (itemId: string) => 
    api.delete(`/api/buyer/wishlist/items/${itemId}/`),
  
  clearWishlist: () => 
    api.delete('/api/buyer/wishlist/clear/'),
  
  // Cart
  getCart: () => 
    api.get('/api/buyer/cart/'),
  
  addToCart: (productId: string, quantity: number = 1, variantId?: string) => 
    api.post('/api/buyer/cart/add_item/', { 
      product_id: productId, 
      quantity,
      variant_id: variantId 
    }),
  
  updateCartItem: (itemId: string, quantity: number) => 
    api.patch(`/api/buyer/cart/items/${itemId}/`, { quantity }),
  
  removeFromCart: (itemId: string) => 
    api.delete(`/api/buyer/cart/items/${itemId}/`),
  
  clearCart: () => 
    api.delete('/api/buyer/cart/clear/'),
  
  // Reviews
  createReview: (data: {
    product: string;
    rating: number;
    comment?: string;
    order?: string;
  }) => api.post('/api/reviews/', data),
  
  updateReview: (id: string, data: {
    rating?: number;
    comment?: string;
  }) => api.patch(`/api/reviews/${id}/`, data),
  
  deleteReview: (id: string) => 
    api.delete(`/api/reviews/${id}/`),
  
  getMyReviews: (params?: any) => 
    api.get('/api/reviews/my_reviews/', { params }),
  
  // Profile & Settings
  getProfile: () => 
    api.get('/api/buyer/profile/'),
  
  updateProfile: (data: any) => 
    api.patch('/api/buyer/profile/', data),
  
  updateAddress: (data: {
    street_address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    is_default?: boolean;
  }) => api.post('/api/buyer/addresses/', data),
  
  getAddresses: () => 
    api.get('/api/buyer/addresses/'),
  
  deleteAddress: (id: string) => 
    api.delete(`/api/buyer/addresses/${id}/`),
  
  // Payment Methods
  getPaymentMethods: () => 
    api.get('/api/buyer/payment-methods/'),
  
  addPaymentMethod: (data: any) => 
    api.post('/api/buyer/payment-methods/', data),
  
  deletePaymentMethod: (id: string) => 
    api.delete(`/api/buyer/payment-methods/${id}/`),
  
  // Notifications
  getNotifications: () => 
    api.get('/api/buyer/notifications/'),
  
  markNotificationAsRead: (id: string) => 
    api.patch(`/api/buyer/notifications/${id}/read/`),
  
  // Search & Browse
  searchProducts: (query: string, filters?: any) => 
    api.get('/api/products/search/', { 
      params: { q: query, ...filters } 
    }),
  
  getRecommendations: () => 
    api.get('/api/buyer/recommendations/'),
  
  getRecentlyViewed: () => 
    api.get('/api/buyer/recently-viewed/'),
  
  addToRecentlyViewed: (productId: string) => 
    api.post('/api/buyer/recently-viewed/', { product_id: productId }),
};

export default buyerAPI;
