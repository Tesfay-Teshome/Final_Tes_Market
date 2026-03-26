import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { cartAPI } from '@/services/api';
import { setCart, setLoading } from '@/store/slices/cartSlice';

export const useCart = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchCart = async () => {
      try {
        dispatch(setLoading(true));
        const response = await cartAPI.get();
        dispatch(setCart(response.data));
      } catch (error) {
        console.error('Failed to fetch cart:', error);
      } finally {
        dispatch(setLoading(false));
      }
    };

    const token = localStorage.getItem('access_token');
    if (token) {
      fetchCart();
    }
  }, [dispatch]);
};