import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Cart, CartItem } from '@/types';

export interface CartState {
  items: CartItem[];
  total: number;
  loading: boolean;
}

const initialState: CartState = {
  items: [],
  total: 0,
  loading: false,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCart: (state, action: PayloadAction<Cart>) => {
      // Normalize numeric fields from backend (Decimal strings -> numbers)
      state.items = (action.payload.items || []).map((it) => ({
        ...it,
        quantity: Number(it.quantity) || 0,
        subtotal: Number((it as any).subtotal) || Number((it.product as any)?.price) * (Number(it.quantity) || 0) || 0,
        product: {
          ...it.product,
          price: Number((it.product as any)?.price) || 0,
          stock: Number((it.product as any)?.stock) || 0,
        } as any,
      }));
      state.total = Number((action.payload as any).total_amount) || state.items.reduce((sum, it) => sum + (Number((it as any).subtotal) || 0), 0);
      state.loading = false;
    },
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existingItem = state.items.find(
        (item) => item.product.id === action.payload.product.id
      );

      if (existingItem) {
        const addQty = Number(action.payload.quantity) || 0;
        existingItem.quantity = (Number(existingItem.quantity) || 0) + addQty;
        const unitPrice = Number((existingItem.product as any).price) || 0;
        existingItem.subtotal = (Number(existingItem.quantity) || 0) * unitPrice;
      } else {
        state.items.push({
          ...action.payload,
          quantity: Number(action.payload.quantity) || 0,
          subtotal: Number((action.payload as any).subtotal) || (Number((action.payload.product as any)?.price) || 0) * (Number(action.payload.quantity) || 0),
          product: {
            ...action.payload.product,
            price: Number((action.payload.product as any)?.price) || 0,
            stock: Number((action.payload.product as any)?.stock) || 0,
          } as any,
        });
      }
      state.total = state.items.reduce((total, item) => total + (Number((item as any).subtotal) || 0), 0);
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      state.total = state.items.reduce((total, item) => total + item.subtotal, 0);
    },
    updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const item = state.items.find((item) => item.id === action.payload.id);
      if (item) {
        item.quantity = Number(action.payload.quantity) || 0;
        const unitPrice = Number((item.product as any).price) || 0;
        item.subtotal = (Number(item.quantity) || 0) * unitPrice;
        state.total = state.items.reduce((total, item) => total + (Number((item as any).subtotal) || 0), 0);
      }
    },
    clearCart: (state) => {
      state.items = [];
      state.total = 0;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const {
  setCart,
  addItem,
  removeItem,
  updateQuantity,
  clearCart,
  setLoading,
} = cartSlice.actions;
export default cartSlice.reducer;