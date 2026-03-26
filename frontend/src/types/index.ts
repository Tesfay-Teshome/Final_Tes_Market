import { ReactNode } from 'react';

export interface User {
  first_name: string;
  last_name?: string;
  id: string;
  email: string;
  username: string;
  user_type: 'vendor' | 'buyer' | 'administrator';
  phone?: string;
  phone_number?: string;
  address?: string;
  profile_image?: string;
  // Optional fields used by messaging and other UIs
  avatar?: string | null | undefined;
  image?: string | null | undefined;
  display_name?: string;
  is_online?: boolean;
  last_seen?: string;
  store_name?: string;
  store_description?: string;
  business_name?: string;
  business_description?: string;
  business_address?: string;
  business_hours?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  date_joined?: string;
  full_name?: string;
  gender?: 'male' | 'female' | 'other';
  date_of_birth?: string;
  permissions?: string[] | Record<string, boolean>;
  is_admin?: boolean;
}

export interface Product {
  id: string;
  vendor: User;
  category: Category;
  name: string;
  image: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  is_active: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  approval_note?: string;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent?: Category;
  description?: string;
  image?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  variant?: ProductVariant;
  subtotal: number;
}

export interface Cart {
  id: string;
  user: User;
  items: CartItem[];
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  value: string;
  price_adjustment: number;
  stock: number;
}

export interface Order {
  id: string;
  user: User;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  shipping_address: string;
  tracking_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  amount?: number; // For vendor dashboard compatibility
}

export interface OrderItem {
  id: string;
  order: Order;
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  price: number;
  vendor_earning: number;
  platform_fee: number;
}

export interface Transaction {
  id: string;
  order: Order;
  transaction_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  payment_method: 'stripe' | 'paypal' | 'bank_transfer';
  payment_details: Record<string, any>;
  admin_approved: boolean;
  admin_note?: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  user: User;
  product: Product;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface Wishlist {
  id: string;
  user: User;
  items: WishlistItem[];
  created_at: string;
}

export interface WishlistItem {
  id: string;
  wishlist: Wishlist;
  product: Product;
  created_at: string;
}

export interface VendorAnalytics {
  id: string;
  vendor: User;
  date: string;
  total_sales: number;
  total_orders: number;
  total_products_sold: number;
  total_earnings: number;
  platform_fees: number;
  net_earnings: number;
  daily_revenue?: number;
  monthly_growth?: number;
  recent_orders?: Order[];
  top_products: Array<{
    id: string;
    name: string;
    image: string | null;
    total_sales: number;
    revenue: string;
  }>;
  sales_over_time?: Array<{
    date: string;
    value: number;
  }>;
  next_payout_date?: string;
  pending_orders?: number;
  pending_approvals?: number;
  commission_rate?: number;
}

export interface AdminDashboardMetrics {
  total_sales: number;
  total_orders: number;
  total_users: number;
  total_vendors: number;
  total_products: number;
  pending_vendor_approvals: number;
  pending_product_approvals: number;
  pending_transactions: number;
  reported_issues: number;
  daily_revenue: number;
  monthly_growth: number;
  refund_requests: number;
}

export interface Testimonial {
  id: string;
  user?: User;
  name: string;
  role: string;
  image?: string;
  content: string;
  rating: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender: User;
  receiver: User;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user: User;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  order_updates: boolean;
  product_updates: boolean;
  marketing_emails: boolean;
}

export interface SystemSettings {
  site_name: string;
  site_description: string;
  maintenance_mode: boolean;
  platform_fee_percentage: number;
  minimum_payout_amount: number;
  auto_approve_products: boolean;
  auto_approve_vendors: boolean;
}

export interface AuditLog {
  id: string;
  user: User;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: Record<string, any>;
  ip_address: string;
  created_at: string;
}