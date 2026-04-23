import axios, { AxiosInstance } from 'axios';
import { store } from '@/store';
import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';

// Function to get CSRF token from cookies
const getCsrfToken = () => {
  const tokenRow = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
  if (tokenRow) {
    return tokenRow.split('=')[1];
  }
  return '';
};

// AI Proxy API (Gemini via backend)
export const aiAPI = {
  generate: (task: 'store_description' | 'palette' | 'template' | 'layout', inputs: any) =>
    api.post('/api/ai/generate/', { task, inputs }),
};

// Storefront API (public + vendor)
export const storefrontAPI = {
  // Public
  getPublicStore: (slug: string) => api.get(`/api/public/stores/${slug}/`),
  getPublicStorePreview: (slug: string) => api.get(`/api/public/stores/${slug}/preview/`),
  getPublicProducts: (slug: string, params?: { search?: string; sort?: string; page?: number; page_size?: number; }) =>
    api.get(`/api/public/stores/${slug}/products/`, { params }),
  getPublicStoreByVendor: (vendorId: number) => api.get(`/api/public/stores/by-vendor/${vendorId}/`),

  // Vendor-auth
  getVendorStore: () => api.get('/api/vendor/store/'),
  updateVendorStore: (data: any) => api.patch('/api/vendor/store/', data),
  deleteStore: () => api.delete('/api/vendor/store/'),
  uploadMedia: (file: File, type: 'logo' | 'banner') => {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    return api.post('/api/media/upload/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
};

const sanitizeUrl = (value?: string) => value?.trim().replace(/\/$/, '') ?? '';
const LOCALHOST_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

const rawApiEnv = sanitizeUrl(import.meta.env.VITE_API_URL);
const useSameOriginApi = !rawApiEnv || LOCALHOST_REGEX.test(rawApiEnv);
const API_BASE_URL = useSameOriginApi ? '' : rawApiEnv;

const rawWsEnv = sanitizeUrl(import.meta.env.VITE_WS_URL)?.replace(/^http/i, 'ws');
const useSameOriginWs = !rawWsEnv || /^wss?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(rawWsEnv);
const WS_BASE_URL = useSameOriginWs ? '' : rawWsEnv;

const getWindow = () => (typeof window !== 'undefined' ? window : undefined);

const resolveAbsoluteApiBase = () => {
  if (API_BASE_URL) {
    return API_BASE_URL;
  }
  const win = getWindow();
  return win ? win.location.origin : '';
};

const resolveAbsoluteWsBase = () => {
  if (WS_BASE_URL) {
    return WS_BASE_URL;
  }
  const win = getWindow();
  if (!win) return '';
  return win.location.origin.replace(/^http/i, 'ws');
};

export const buildApiUrl = (path = '') => {
  const base = resolveAbsoluteApiBase();
  if (!path) return base;
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};

export const buildWsUrl = (path = '') => {
  const base = resolveAbsoluteWsBase();
  if (!path) return base;
  if (/^wss?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};

const MEDIA_PATH_REGEX = /^\/(media|static|uploads|files|images)\//i;

export const resolveMediaUrl = (value?: string | null) => {
  // Resolve media URLs in a way that works on mobile devices connected via LAN.
  // - Accepts absolute URLs or relative paths ("/media/..." or "uploads/..." etc.)
  // - Rewrites localhost hosts to the current hostname when needed
  // - Ensures relative paths are prefixed with "/media" if backend serves under /media/

  if (!value) return undefined;

  const win = typeof window !== 'undefined' ? window : undefined;
  const inferBackendBase = () => {
    if (!win) return '';
    const { protocol, hostname, port } = win.location;
    if (port === '3000') {
      return `${protocol}//${hostname}:8000`;
    }
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
  };

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('data:')) return trimmed;

  // Absolute URL: rewrite localhost to LAN IP if necessary and fix dev port
  if (/^(https?:)?\/\//i.test(trimmed)) {
    let out = trimmed;
    if (win && win.location.hostname !== 'localhost' && win.location.hostname !== '127.0.0.1') {
      if (out.includes('localhost') || out.includes('127.0.0.1')) {
        out = out.replace(/(localhost|127\.0\.0\.1)/i, win.location.hostname);
      }
    }
    // If absolute URL uses current hostname but port 3000, rewrite to 8000 for media
    try {
      const u = new URL(out, win?.location?.origin);
      if (win && u.hostname === win.location.hostname) {
        if ((u.port || '') === '3000') {
          u.port = '8000';
          out = u.toString();
        }
        // If we're on dev port 3000 and the absolute URL points to a media/static path,
        // return a same-origin relative path so Vite proxy handles it via :3000
        if (win.location.port === '3000' && MEDIA_PATH_REGEX.test(u.pathname)) {
          return u.pathname;
        }
      }
    } catch { }
    return out;
  }

  // Relative path: normalize and ensure /media prefix when missing
  let normalizedPath = trimmed.replace(/^\.\//, '');
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = `/${normalizedPath}`;
  }
  if (!MEDIA_PATH_REGEX.test(normalizedPath)) {
    normalizedPath = normalizedPath.startsWith('/media/')
      ? normalizedPath
      : `/media${normalizedPath}`;
  }

  // In development, prefer same-origin relative paths so Vite proxy (/media, /static) forwards to :8000
  if (win && win.location.port === '3000') {
    return normalizedPath;
  }

  // Otherwise, build an absolute URL against the backend base
  const backendBase = inferBackendBase() || resolveAbsoluteApiBase();
  let fullUrl = `${backendBase}${normalizedPath}`;

  if (win && win.location.hostname !== 'localhost' && win.location.hostname !== '127.0.0.1') {
    if (fullUrl.includes('localhost') || fullUrl.includes('127.0.0.1')) {
      fullUrl = fullUrl.replace(/(localhost|127\.0\.0\.1)/i, win.location.hostname);
    }
  }
  return fullUrl;
};

const API_URL = buildApiUrl();
console.log('🔗 API base URL configured:', API_URL || '(same-origin via proxy)');

// Extend AxiosInstance to include custom methods
interface CustomAxiosInstance extends AxiosInstance {
  createCategory: (data: FormData) => Promise<any>;
  getCategories: () => Promise<any>;
  // Add other custom methods if needed
}

// Create the axios instance using unified configuration
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send cookies automatically
  xsrfCookieName: 'csrftoken', // Django's default CSRF cookie name
  xsrfHeaderName: 'X-CSRFToken', // Django's default CSRF header name
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 second timeout
}) as CustomAxiosInstance;

// Store Review API
export const storeReviewAPI = {
  getReviews: (slug: string, params?: { page?: number; page_size?: number }) =>
    api.get(`/api/public/stores/${slug}/reviews/`, { params }),
  submitReview: (slug: string, data: { rating: number; comment: string }) =>
    api.post(`/api/public/stores/${slug}/reviews/`, data),
  approveReview: (reviewId: string | number) =>
    api.post(`/api/vendor/store-reviews/${reviewId}/approve/`),
  rejectReview: (reviewId: string | number) =>
    api.post(`/api/vendor/store-reviews/${reviewId}/reject/`),
};

// Cart API
export const cartAPI = {
  get: () => api.get('/api/cart/'),
  addItem: (product_id: string | number, quantity: number = 1) =>
    api.post('/api/cart-items/', { product_id, quantity }),
  updateItem: (id: string | number, data: { quantity: number; selected_variant?: string }) =>
    api.patch(`/api/cart-items/${id}/`, data),
  removeItem: (id: string | number) =>
    api.delete(`/api/cart-items/${id}/`),
  clear: () => api.delete('/api/cart/clear/'),
};

// Admin/Universal API
export const adminAPI = {
  // User management
  getUsers: (params?: any) => api.get('/api/users/', { params }),
  updateUser: (id: string | number, data: any) => api.patch(`/api/users/${id}/`, data),
  updateUserStatus: (id: string | number, is_active: boolean) =>
    api.patch(`/api/users/${id}/update_status/`, { is_active }),
  createUser: (data: FormData | any) => api.post('/api/users/', data),
  deleteUser: (id: string | number) => api.delete(`/api/users/${id}/`),

  // Orders
  getOrders: (params?: any) => api.get('/api/orders/', { params }),
  getBuyerOrders: () => api.get('/api/orders/buyer/'),
  getRecentOrders: (params?: any) => api.get('/api/orders/', { params: { ...params, limit: 5 } }),
  updateOrderStatus: (id: string | number, status: string, notes?: string) =>
    api.patch(`/api/orders/${id}/`, { status, notes }),
  approveOrder: (id: string | number, notes?: string) =>
    api.patch(`/api/orders/${id}/`, { status: 'approved', notes }),
  rejectOrder: (id: string | number, notes?: string) =>
    api.patch(`/api/orders/${id}/`, { status: 'rejected', notes }),

  // Dashboard & Metrics
  getDashboard: () => api.get('/api/administrator/dashboard/'),
  getMetrics: (params?: any) => api.get('/api/administrator/dashboard/metrics/', { params }),
  getHealth: () => api.get('/api/administrator/dashboard/health/'),

  // Testimonials
  getTestimonials: (params?: any) => api.get('/api/testimonials/', { params }),
  approveTestimonial: (id: string | number) => api.post(`/api/testimonials/${id}/approve/`),
  rejectTestimonial: (id: string | number) => api.post(`/api/testimonials/${id}/reject/`),

  // Vendors
  getVendors: (params?: any) => api.get('/api/administrator/vendors/', { params }),
  approveVendor: (id: string | number) => api.post(`/api/administrator/vendors/${id}/approve/`),
  rejectVendor: (id: string | number, reason?: string) => api.post(`/api/administrator/vendors/${id}/reject/`, { reason }),

  // Product lifecycle
  getProducts: (params?: any) => api.get('/api/products/', { params }),
  approveProduct: (id: string | number) => api.patch(`/api/products/${id}/`, { status: 'approved' }),
  rejectProduct: (id: string | number, reason?: string) => api.patch(`/api/products/${id}/`, { status: 'rejected', notes: reason }),
  deleteProduct: (id: string | number) => api.delete(`/api/products/${id}/`),

  // Categories
  getCategories: () => api.get('/api/categories/'),

  // Payouts
  getPayouts: (params?: any) => api.get('/api/admin/payouts/', { params }),
  getPayoutRequests: (statusFilter?: string) => api.get('/api/admin/payouts/', { params: { status: statusFilter } }),
  approvePayout: (id: string | number, data?: any) => api.post(`/api/admin/payouts/${id}/approve-or-reject/`, { ...data, action: 'approve' }),
  rejectPayout: (id: string | number, data?: any) => api.post(`/api/admin/payouts/${id}/approve-or-reject/`, { ...data, action: 'reject' }),
  processPayout: (id: string | number, data?: any) => api.post(`/api/admin/payouts/${id}/process/`, data),

  // Vendor Specific (Admin view)
  getVendorEarnings: (params?: any) => api.get('/api/vendor/earnings/', { params }),
  processVendorPayouts: (earningIds: (string | number)[], action: string) => api.post('/api/vendor/payouts/process/', { earning_ids: earningIds, action }),

  // Transactions
  getTransactions: (params?: any) => api.get('/api/transactions/', { params }),
  approvePayment: (id: string | number) => api.post(`/api/transactions/${id}/approve_payment/`),
  rejectPayment: (id: string | number, reason: string) => api.post(`/api/transactions/${id}/reject_payment/`, { reason }),
};

export const httpClient = api;

// Add request interceptor for CSRF and auth tokens
api.interceptors.request.use(
  (config) => {
    const csrfToken = getCsrfToken();
    if (csrfToken && !config.headers['X-CSRFToken']) {
      config.headers['X-CSRFToken'] = csrfToken;
    }

    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Log only important requests for debugging
    if (config.url?.includes('login') || config.url?.includes('register') || config.url?.includes('cart')) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }

    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Prevent infinite refresh attempts with a global flag
let isRefreshing = false;

// Add response interceptor for token refresh
api.interceptors.response.use(
  (response) => {
    // Only log important responses
    if (response.config.url?.includes('login') || response.config.url?.includes('register')) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
    }
    return response;
  },
  async (error) => {
    // List of endpoints that can fail silently when unauthenticated
    const silentFailEndpoints = ['/api/notifications/', '/api/messaging/conversations/'];
    const isSilentEndpoint = silentFailEndpoints.some(endpoint => error.config?.url?.includes(endpoint));
    const is401 = error.response?.status === 401;

    // Silently handle 401 errors for non-critical endpoints (user not authenticated is expected)
    if (is401 && isSilentEndpoint) {
      // Don't log these - they're expected when user is not authenticated
      return Promise.reject(error);
    }

    // Log error details for debugging (only for important errors)
    if (error.response) {
      console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        status: error.response.status,
        data: error.response.data,
        baseURL: error.config?.baseURL,
        fullURL: `${error.config?.baseURL}${error.config?.url}`
      });
      console.error('❌ Full Error Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('❌ API Error: No response received', {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        message: error.message
      });
    } else {
      console.error('❌ API Error:', error.message);
    }

    const originalRequest = error.config;

    // Only attempt refresh if not already refreshing
    // If the 401 comes from the login endpoint, do NOT attempt refresh or redirect; just propagate the error
    if (error.response?.status === 401 && originalRequest?.url?.includes('/api/auth/login/')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshing) {
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token available');
        const refreshResponse = await api.post('/api/token/refresh/', { refresh: refreshToken });
        const { access } = refreshResponse.data;
        localStorage.setItem('access_token', access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        isRefreshing = false;
        return api(originalRequest);
      } catch (refreshError) {
        // Cleanup and hard redirect to break any loop
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        store.dispatch(logout());
        isRefreshing = false;
        // Avoid hard redirect if we're already on the login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Implement the createCategory method
api.createCategory = async (data: FormData) => {
  return await api.post('/api/categories/', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }).catch(error => {
    console.error('Error adding category:', error.response ? error.response.data : error.message);
    throw error; // Rethrow the error for further handling
  });
};

api.getCategories = async () => {
  return await api.get('/api/categories/').catch(error => {
    console.error('Error fetching categories:', error.response ? error.response.data : error.message);
    throw error;
  });
};

// Define the AuthResponse type
interface AuthResponse {
  user: any;
  access_token: string;
  refresh_token: string;
}

// Auth API
export type RegisterData = {
  email: string;
  password: string;
  confirm_password: string;
  full_name: string;
  user_type: 'buyer' | 'vendor';
  store_name?: string;
  store_description?: string;
  phone?: string;
  address?: string;
  username?: string;  // Optional since it will be generated from email
};

export const authAPI = {
  register: async (data: RegisterData | FormData) => {
    try {
      // First, ensure we have a CSRF token specifically (mobile friendly)
      await api.get('/api/csrf/', { withCredentials: true, headers: { 'X-Requested-With': 'XMLHttpRequest' } });

      // Check if data is FormData
      const isFormData = data instanceof FormData;

      // Then make the registration request
      return api.post('/api/auth/register/', isFormData ? data : {
        ...data,
        username: data.email,  // Set username to email since backend will generate it
      }, {
        headers: isFormData ? {
          'Content-Type': 'multipart/form-data',
          'X-Requested-With': 'XMLHttpRequest',
        } : {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        withCredentials: true,
      });
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  login: async (data: { email: string; password: string }) => {
    try {
      console.log('🚀 Mobile Login attempt:', data.email, 'to', API_URL);
      // Direct login request (login endpoint is CSRF-exempt server-side)
      const response = await api.post<AuthResponse>('/api/auth/login/', data, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        withCredentials: true,
      });

      console.log('✅ Login successful:', response.status, response.data);

      if (!response.data) {
        throw new Error('No data in login response');
      }

      return response;
    } catch (error: any) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
        config: error.config,
      });
      throw error;
    }
  },
  refreshToken: (refresh?: string) =>
    api.post('/api/token/refresh/', { refresh: refresh || localStorage.getItem('refresh_token') }),
  // validateToken: () => api.get('/api/token/validate/'), // Endpoint doesn't exist in backend
  getCurrentUser: () => api.get('/api/auth/user/'),
  updateProfile: (data: any) => api.patch('/api/auth/user/', data),
  updateProfileImage: (formData: FormData) =>
    api.patch('/api/auth/user/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
    }),
  // updatePassword: (data: { current_password: string; new_password: string }) =>
  //   api.post('/api/auth/user/change_password/', data), // Endpoint doesn't exist in backend
  // updateNotificationSettings: (data: any) => 
  //   api.patch('/api/auth/user/notification_settings/', data), // Endpoint doesn't exist in backend
};

// Coupons API
export const couponsAPI = {
  // Validate coupon code
  validate: (code: string, subtotal: number, vendorId?: number) =>
    api.post('/api/coupons/validate/', { code, subtotal, vendor_id: vendorId }),

  // Vendor management
  create: (data: any) => api.post('/api/coupons/', data),
  update: (id: string, data: any) => api.patch(`/api/coupons/${id}/`, data),
  delete: (id: string) => api.delete(`/api/coupons/${id}/`),
  list: (params?: any) => api.get('/api/coupons/', { params }),
  getVendorCoupons: () => api.get('/api/coupons/vendor_coupons/'),
};

// Products API
export const productsAPI = {
  getAll: (params?: any) =>
    api.get('/api/products/', { params }),

  getById: (slug: string) =>
    api.get(`/api/products/${slug}/`),

  getFeatured: () =>
    api.get('/api/products/featured/'),

  create: (data: FormData) =>
    api.post('/api/products/', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  update: (id: string, data: FormData) =>
    api.patch(`/api/products/${id}/`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  delete: (id: string) =>
    api.delete(`/api/products/${id}/`),

  // requestApproval: (id: string) =>
  //   api.post(`/api/products/${id}/request_approval/`), // Endpoint doesn't exist in backend
};

// Categories API
export const categoriesAPI = {
  getAll: () =>
    api.get('/api/categories/'),

  getBySlug: (slug: string) =>
    api.get(`/api/categories/${slug}/`),

  create: (data: FormData) =>
    api.post('/api/categories/', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  update: (id: string, data: FormData) =>
    api.patch(`/api/categories/${id}/`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  delete: (id: string) =>
    api.delete(`/api/categories/${id}/`),
};

// Redundant cartAPI removed

// Orders API
export const ordersAPI = {
  getAll: () =>
    api.get('/api/orders/'),

  getById: (id: string) =>
    api.get(`/api/orders/${id}/`),

  create: (data: any) =>
    api.post('/api/orders/', data),

  // updateStatus: (id: string, status: string) =>
  //   api.patch(`/api/orders/${id}/status/`, { status }), // Endpoint doesn't exist in backend

  delete: (id: string) =>
    api.delete(`/api/orders/${id}/`),
};

// Wishlist API
export const wishlistAPI = {
  getAll: () =>
    api.get('/api/wishlist/'),

  addItem: (productId: string) =>
    api.post('/api/wishlist/', { product_id: productId }),

  removeItem: (id: string) =>
    api.delete(`/api/wishlist/items/${id}/`),
};

// Reviews API
export const reviewsAPI = {
  getAll: (params?: any) =>
    api.get('/api/reviews/', { params }),

  create: (data: any) =>
    api.post('/api/reviews/', data),

  update: (id: string, data: any) =>
    api.patch(`/api/reviews/${id}/`, data),

  delete: (id: string) =>
    api.delete(`/api/reviews/${id}/`),
};

// Vendor API
export const vendorAPI = {
  // Dashboard
  getDashboard: () => api.get('/api/vendor/dashboard/'),

  // Products
  getProducts: (params?: any) =>
    api.get('/api/vendor/products/', { params }),
  getProduct: (id: string) => api.get(`/api/vendor/products/${id}/`),
  createProduct: (data: FormData) =>
    api.post('/api/vendor/products/', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  updateProduct: (id: string, data: FormData) =>
    api.patch(`/api/vendor/products/${id}/`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  deleteProduct: (id: string) => api.delete(`/api/vendor/products/${id}/`),
  // requestProductApproval: (id: string) => 
  //   api.post(`/api/vendor/products/${id}/request-approval/`), // Endpoint doesn't exist in backend

  // Get buyer orders
  getBuyerOrders: () => api.get('/orders/buyer/'),

  // Get order invoice
  getOrderInvoice: (orderId: string) => api.get(`/orders/${orderId}/invoice/`),

  // Categories
  getCategories: () => api.get('/api/categories/'),
  createCategory: (data: any) => api.post('/api/categories/', data),
  deleteCategory: (id: string) => api.delete(`/api/categories/${id}/`),
  updateCategory: (id: string, data: any) =>
    api.patch(`/api/vendor/categories/${id}/`, data),
  getCategory: (id: string) => api.get(`/api/vendor/categories/${id}/`),

  // Orders
  getOrders: (params?: any) => api.get('/api/vendor/orders/', { params }),
  getOrder: (id: string) => api.get(`/api/vendor/orders/${id}/`),
  // updateOrderStatus: (orderId: string, status: string) => 
  //   api.patch(`/api/vendor/orders/${orderId}/status/`, { status }), // Endpoint doesn't exist in backend
  startProcessing: (orderId: string) =>
    api.post(`/api/vendor/orders/${orderId}/start_processing/`),
  markShipped: (orderId: string, trackingNumber: string) =>
    api.post(`/api/vendor/orders/${orderId}/mark_shipped/`, { tracking_number: trackingNumber }),
  markDelivered: (orderId: string) =>
    api.post(`/api/vendor/orders/${orderId}/mark_delivered/`),

  // Analytics & Reports
  getEarnings: () => api.get('/api/vendor/earnings/'),
  getEarningsBreakdown: (timeRange: string) => api.get('/api/vendor/earnings/breakdown/'),
  getAnalytics: () => api.get('/api/vendor/dashboard/analytics/'),
  getEarningsHistory: (params?: any) => api.get('/api/vendor/earnings/', { params }),
  getCommissionStatus: () => api.get('/api/vendor/earnings/commission_status/'),

  // Vendor Payout Management
  getVendorEarnings: () => api.get('/api/vendor/payouts/earnings/'),
  requestPayout: (data: { amount: number; notes?: string; payment_method?: string; payment_details?: any }) => api.post('/api/vendor/payouts/request/', data),
  getPayoutHistory: (params?: any) => api.get('/api/vendor/payouts/history/', { params }),
  getPayoutStatistics: () => api.get('/api/vendor/payouts/statistics/'),
  getPaymentMethod: () => api.get('/api/vendor/payouts/payment-method/'),
  updatePaymentMethod: (data: { payment_method: string; payment_details: any }) =>
    api.post('/api/vendor/payouts/payment-method/', data),
  // Download receipt HTML (authenticated)
  downloadReceipt: (payoutId: string) => api.get(`/api/vendor/payouts/${payoutId}/receipt/`, {
    headers: { 'Accept': 'text/html' }
  }),

  // Notifications & Messages
  getNotifications: () => api.get('/api/notifications/'),
  markNotificationAsRead: (id: string) => api.patch(`/api/notifications/${id}/read/`),
  getMessages: () => api.get('/api/messages/'),
  sendMessage: (data: any) => api.post('/api/messages/', data),

  // Profile & Settings
  getProfile: () => api.get('/api/vendor/profile/'),
  updateProfile: (data: any) => api.patch('/api/vendor/profile/', data),
  updateStoreSettings: (data: any) => api.patch('/api/vendor/store-settings/', data),

  // Dashboard Statistics
  getStats: () => api.get('/api/vendor/stats/'),

  // Vendor-specific notifications from admin actions
  getVendorNotifications: () => api.get('/api/vendor/notifications/'),

  // Payout history
  getPayouts: () => api.get('/api/vendor/payouts/'),

  // Update notification preferences
  updateNotificationPreferences: (preferences: any) =>
    api.patch('/api/vendor/notification-preferences/', preferences)
};



// Messaging API
export const messagingAPI = {
  // Conversations
  getConversations: (params?: { page?: number; page_size?: number }) =>
    api.get('/api/messaging/conversations/', { params }),

  getConversation: (id: string) =>
    api.get(`/api/messaging/conversations/${id}/`),

  getOrCreateConversation: async (participantId: string) => {
    try {
      // First, get all conversations where the current user is a participant
      const response = await api.get('/api/messaging/conversations/');

      // Find existing direct message conversation with the target participant
      const existingConversation = response.data?.find((conv: any) => {
        // Skip group conversations
        if (conv.is_group) return false;

        // Ensure we have exactly 2 participants
        const participants = Array.isArray(conv.participants) ? conv.participants : [];
        if (participants.length !== 2) return false;

        // Check if both current user and target participant are in this conversation
        const currentUserId = store.getState().auth.user?.id;
        const participantIds = participants.map((p: any) =>
          p && typeof p === 'object' ? p.id : p
        );

        return (
          participantIds.includes(participantId) &&
          participantIds.includes(currentUserId)
        );
      });

      // If we found an existing conversation, return it
      if (existingConversation) {
        console.log('Found existing direct message conversation:', existingConversation.id);
        return { data: existingConversation };
      }

      // Otherwise, create a new direct message conversation
      console.log('No existing conversation found, creating new direct message with participant:', participantId);
      const createResponse = await api.post('/api/messaging/conversations/', {
        participants: [participantId],
        is_group: false
      });

      console.log('Created new direct message conversation:', createResponse.data);
      return createResponse;
    } catch (error: any) {
      console.error('Error in getOrCreateConversation:', {
        message: error.message,
        response: error.response?.data || 'No response data',
        status: error.response?.status
      });
      throw error;
    }
  },

  createConversation: async (participantIds: string[]) => {
    try {
      console.log('Creating conversation with participants:', participantIds);

      // Ensure participantIds is an array of strings
      const participantIdsStr = participantIds.map(id => String(id).trim()).filter(id => id);

      if (participantIdsStr.length === 0) {
        throw new Error('No valid participant IDs provided');
      }

      const response = await api.post('/api/messaging/conversations/', {
        participants: participantIdsStr
      });

      console.log('Create conversation response:', {
        status: response.status,
        data: response.data,
        headers: response.headers
      });

      if (!response.data || !response.data.id) {
        console.error('Invalid response from create conversation:', response);
        throw new Error('Failed to create conversation: Invalid response from server');
      }

      return response;
    } catch (error: any) {
      console.error('Error in createConversation:', {
        message: error.message,
        response: error.response?.data || 'No response data',
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
      });
      throw error;
    }
  },

  deleteConversation: (id: string) =>
    api.delete(`/api/messaging/conversations/${id}/`),

  // Messages
  getMessages: (conversationId: string, params: any = {}) =>
    api.get(`/api/messaging/messages/`, {
      params: {
        conversation: conversationId,
        ...params
      }
    }),

  // Update a message (edit)
  updateMessage: (messageId: string, data: { content: string }) =>
    api.patch(`/api/messaging/messages/${messageId}/`, data),

  sendMessage: async (conversationId: string | number, content: string, targetRecipientId: string) => {
    const state = store.getState() as RootState;
    const currentUser = state.auth.user;

    if (!currentUser) {
      throw new Error('User must be logged in to send messages');
    }

    const timestamp = new Date().toISOString();

    // Ensure conversationId is a number if it's a string
    const conversationIdNum = typeof conversationId === 'string'
      ? parseInt(conversationId, 10)
      : conversationId;

    if (isNaN(conversationIdNum)) {
      throw new Error(`Invalid conversation ID: ${conversationId}`);
    }

    // Only send the required fields to the backend
    const payload = {
      conversation: conversationIdNum,
      content: content.trim(),
      // Let the backend set the sender from the authenticated user
    };

    console.log('Sending message with payload:', payload);

    try {
      // Make the API call to the correct endpoint
      const response = await api.post('/api/messaging/messages/', payload);

      // Log the full response for debugging
      console.log('Message API response:', response);

      if (!response.data) {
        throw new Error('No data in response');
      }

      // Format the response to match the expected message format
      const messageData = response.data;
      return {
        data: {
          ...messageData,
          id: messageData.id || `temp-${Date.now()}`,
          // Use actual sender data from backend response
          sender: messageData.sender,
          conversation: messageData.conversation || conversationIdNum,
          created_at: messageData.created_at || timestamp,
          is_read: messageData.is_read || false,
          status: messageData.status || 'sent',
          // Use backend response data directly
          sender_id: messageData.sender_id,
          sender_name: messageData.sender_name,
          sender_avatar: messageData.sender_avatar
        }
      };
    } catch (error: any) {
      // Check for timezone-related errors in the response
      const errorMessage = error.response?.data?.toString().includes('timezo') ||
        error.response?.data?.toString().includes('timezone')
        ? 'There was a server configuration issue. Please try again later or contact support.'
        : error.message || 'Failed to send message. Please try again.';

      console.error('Error in sendMessage API call:', {
        message: errorMessage,
        originalError: error,
        response: error.response?.data || 'No response data',
        status: error.response?.status,
        statusText: error.response?.statusText,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
      });

      // Create a new error with the improved message
      const newError = new Error(errorMessage);
      // @ts-ignore - Attach additional error info
      newError.originalError = error;
      throw newError;
    }
  },

  markMessagesAsRead: async (conversationId: string, messageIds: string[]) => {
    try {
      // Send a single PATCH request to mark all messages as read
      const response = await api.post(
        `/api/messaging/conversations/${conversationId}/mark_messages_read/`,
        { message_ids: messageIds }
      );

      if (response.data && response.data.status === 'success') {
        return response.data;
      }

      throw new Error('Failed to mark messages as read');
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  },

  // Delete a message (flat endpoint)
  // Note: keep conversationId param for backward compatibility; it's unused
  deleteMessage: (_conversationId: string, messageId: string) =>
    api.delete(`/api/messaging/messages/${messageId}/`),

  // Message Settings
  getMessageSettings: () =>
    api.get('/api/messaging/settings/me/'),

  updateMessageSettings: (settings: {
    email_notifications?: boolean;
    desktop_notifications?: boolean;
    allow_messages_from?: 'anyone' | 'followed' | 'nobody';
  }) => api.patch('/api/messaging/settings/me/', settings),

  // Search
  searchUsers: (query: string, exclude_conversation?: string) =>
    api.get('/api/messaging/search_users/', {
      params: { q: query, exclude_conversation }
    }),

  // Typing indicators
  sendTypingIndicator: (conversationId: string) =>
    api.post(`/api/messaging/conversations/${conversationId}/typing/`),

  // Get unread messages count
  getUnreadCount: () =>
    api.get('/api/messaging/messages/unread/count/'),
  // Upload a file to a conversation
  uploadFile: (conversationId: string, formData: FormData) =>
    api.post(`/api/messaging/conversations/${conversationId}/upload/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  // Message Settings
  getSettings: () => api.get('/api/messaging/settings/'),
  createSettings: (data: {
    email_notifications?: boolean;
    push_notifications?: boolean;
    desktop_notifications?: boolean;
    message_preview?: boolean;
    auto_reply_enabled?: boolean;
    auto_reply_message?: string;
    block_unknown_senders?: boolean;
    allow_messages_from?: 'anyone' | 'followed' | 'nobody';
    message_retention_days?: number;
    read_receipts?: boolean;
    typing_indicators?: boolean;
    online_status_visible?: boolean;
    notification_sound?: boolean;
    message_encryption?: boolean;
  }) => api.post('/api/messaging/settings/', data),
  updateSettings: (id: string, data: {
    email_notifications?: boolean;
    push_notifications?: boolean;
    desktop_notifications?: boolean;
    message_preview?: boolean;
    auto_reply_enabled?: boolean;
    auto_reply_message?: string;
    block_unknown_senders?: boolean;
    allow_messages_from?: 'anyone' | 'followed' | 'nobody';
    message_retention_days?: number;
    read_receipts?: boolean;
    typing_indicators?: boolean;
    online_status_visible?: boolean;
    notification_sound?: boolean;
    message_encryption?: boolean;
  }) => api.patch(`/api/messaging/settings/${id}/`, data),
};

// Notifications API
export const notificationsAPI = {
  /**
   * Get all notifications for the current user
   */
  getAll() {
    return api.get('/api/notifications/');
  },

  /**
   * Mark a specific notification as read
   * @param id Notification ID
   */
  markAsRead(id: string) {
    return api.post(`/api/notifications/${id}/mark_as_read/`);
  },

  /**
   * Mark all notifications as read for the current user
   */
  markAllAsRead() {
    return api.post('/api/notifications/mark_all_as_read/');
  },

  /**
   * Delete a specific notification
   * @param id Notification ID
   */
  delete(id: string) {
    return api.delete(`/api/notifications/${id}/`);
  },

  /**
   * Get notification settings for the current user
   */
  getSettings() {
    return api.get('/api/notifications/settings/');
  },

  /**
   * Update notification settings for the current user
   * @param data Notification settings data
   */
  updateSettings(data: any) {
    return api.put('/api/notifications/settings/', data);
  },

  /**
   * Get count of unread notifications
   */
  getUnreadCount() {
    return api.get('/api/notifications/unread_count/');
  },

  /**
   * Create a new notification (admin only)
   * @param data Notification data
   */
  createNotification(data: {
    user_id: string;
    title: string;
    message: string;
    notification_type: string;
    related_id?: string;
  }) {
    return api.post('/api/notifications/', data);
  },
};

// Testimonials API
export const testimonialsAPI = {
  getAll: () => api.get('/api/testimonials/'),

  create: (data: any) => api.post('/api/testimonials/', data),

  update: (id: string, data: any) => api.patch(`/api/testimonials/${id}/`, data),

  delete: (id: string) => api.delete(`/api/testimonials/${id}/`),
};

// Profile API
export const profileAPI = {
  get: () =>
    api.get('/api/profile/'),

  update: (data: any) =>
    api.patch('/api/profile/', data),

  updateImage: (formData: FormData) =>
    api.patch('/api/profile/image/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  updatePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/api/profile/password/change/', data),

  updateNotificationSettings: (data: any) =>
    api.patch('/api/profile/notifications/settings/', data),
};

// About API
export const aboutAPI = {
  getAll: () => api.get('/api/about/'),
  getById: (id: number) => api.get(`/api/about/${id}/`),
  create: (data: any) => api.post('/api/about/', data),
  update: (id: number, data: any) => api.patch(`/api/about/${id}/`, data),
  delete: (id: number) => api.delete(`/api/about/${id}/`),
};

// Export API_URL for components that need direct access
export { API_URL };

export default api;