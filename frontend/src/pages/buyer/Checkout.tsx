import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RootState } from '@/store';
import { cartAPI, ordersAPI, couponsAPI } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { clearCart, setCart } from '@/store/slices/cartSlice';
import { CreditCard, Truck, Check } from 'lucide-react';

const checkoutSchema = z.object({
  fullName: z.string().min(3, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  address: z.string().min(10, 'Please enter a valid address'),
  city: z.string().min(2, 'City is required'),
  country: z.string().min(2, 'Country is required'),
  zipCode: z.string().min(4, 'Valid ZIP code is required'),
  paymentMethod: z.enum(['stripe', 'visa_card', 'paypal', 'bank_transfer']),
  cardNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  cvv: z.string().optional(),
}).refine(
  (data) => {
    if (data.paymentMethod === 'stripe' || data.paymentMethod === 'visa_card') {
      return (
        !!data.cardNumber &&
        data.cardNumber.length >= 16 &&
        !!data.expiryDate &&
        /^\d{2}\/\d{2}$/.test(data.expiryDate) &&
        !!data.cvv &&
        data.cvv.length >= 3
      );
    }
    return true;
  },
  {
    message: "Credit card details are required",
    path: ["cardNumber"],
  }
);

type CheckoutFormData = z.infer<typeof checkoutSchema>;

// Safely format any numeric-like value to 2 decimals
const toMoney = (value: unknown) => {
  const num = typeof value === 'number' ? value : Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  return safe.toFixed(2);
};

const Checkout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const items = useSelector((state: RootState) => state.cart?.items ?? []);
  const total = useSelector((state: RootState) => state.cart?.total ?? 0);
  const { user } = useSelector((state: RootState) => state.auth);
  const [isProcessing, setIsProcessing] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: user?.email || '',
      paymentMethod: 'stripe',
    },
  });

  // Use react-hook-form to track paymentMethod
  const paymentMethod = watch('paymentMethod') || 'stripe';

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsValidatingCoupon(true);
    setCouponError('');

    try {
      const response = await couponsAPI.validate(couponCode, total);
      if (response.data.valid) {
        setAppliedCoupon(response.data.coupon);
        setDiscountAmount(Number(response.data.coupon.calculated_discount));
        toast({
          title: 'Coupon Applied',
          description: `${response.data.coupon.code} applied successfully!`,
        });
      }
    } catch (error: any) {
      console.error('Coupon validation failed:', error);
      setCouponError(error.response?.data?.error || 'Invalid coupon code');
      setAppliedCoupon(null);
      setDiscountAmount(0);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode('');
    setCouponError('');
  };

  const finalTotal = Math.max(0, total - discountAmount);

  const onSubmit = async (data: CheckoutFormData) => {
    if (items.length === 0) {
      toast({
        title: 'Error',
        description: 'Your cart is empty.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const orderData = {
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        shipping_address: `${data.address}, ${data.city}, ${data.country} ${data.zipCode}`,
        payment_method: data.paymentMethod,
        payment_details: {
          card_number: data.cardNumber,
          expiry_date: data.expiryDate,
          cvv: data.cvv,
        },
        coupon_code: appliedCoupon?.code
      };

      console.log('🛒 Creating order with data:', orderData);
      const response = await ordersAPI.create(orderData);
      console.log('✅ Order created successfully:', response.data);

      // Clear the cart from backend first, then Redux
      try {
        console.log('🧹 Clearing cart after successful order...');
        const clearResponse = await cartAPI.clear();
        console.log('✅ Backend cart cleared:', clearResponse.data);

        // Update Redux with the cleared cart data from backend
        dispatch(setCart(clearResponse.data));
        console.log('✅ Redux cart updated with cleared data');

        // Also dispatch clearCart as backup
        dispatch(clearCart());
        console.log('✅ Cart clearing complete');
      } catch (clearError) {
        console.error('❌ Failed to clear cart:', clearError);
        // Force clear Redux even if backend fails
        dispatch(clearCart());
        console.log('⚠️ Forced Redux cart clear due to backend error');
      }

      toast({
        title: 'Order placed successfully!',
        description: `Order #${response.data.id} has been created. Thank you for your purchase!`,
      });

      // Redirect to order confirmation/success page
      navigate('/order-success', {
        state: {
          orderId: response.data.id,
          orderData: response.data
        }
      });
    } catch (error: any) {
      console.error('❌ Order creation failed:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method
      });

      const errorMessage = error.response?.data?.detail ||
        error.response?.data?.error ||
        'Failed to place order. Please try again.';

      toast({
        title: 'Order Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };


  if (!Array.isArray(items) || items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Shipping Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    {...register('fullName')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.fullName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    {...register('address')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.address.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      {...register('city')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    />
                    {errors.city && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.city.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ZIP Code
                    </label>
                    <input
                      {...register('zipCode')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    />
                    {errors.zipCode && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.zipCode.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Country
                  </label>
                  <input
                    {...register('country')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                  {errors.country && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.country.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Payment Method</h2>

              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="stripe"
                      value="stripe"
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                      {...register('paymentMethod')}
                    />
                    <label htmlFor="stripe" className="flex flex-col cursor-pointer">
                      <div className="flex items-center">
                        <CreditCard className="h-5 w-5 text-emerald-600 mr-2" />
                        <span className="font-medium">Card Payment</span>
                      </div>
                      {/* Card Brand Logos */}
                      <div className="flex items-center space-x-2 ml-7 mt-1">
                        <div className="bg-emerald-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">VISA</div>
                        <div className="bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">MC</div>
                        <div className="bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">AMEX</div>
                        <div className="bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">DISC</div>
                      </div>
                    </label>
                  </div>

                  {/* Visa Card Option */}
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="visa_card"
                      value="visa_card"
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                      {...register('paymentMethod')}
                    />
                    <label htmlFor="visa_card" className="flex items-center cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <div className="bg-emerald-600 text-white text-sm font-bold px-3 py-1 rounded">VISA</div>
                        <span className="font-medium">Visa Card</span>
                      </div>
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="paypal"
                      value="paypal"
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                      {...register('paymentMethod')}
                    />
                    <label htmlFor="paypal" className="cursor-pointer">
                      <span className="font-medium">PayPal</span>
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="bank_transfer"
                      value="bank_transfer"
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                      {...register('paymentMethod')}
                    />
                    <label htmlFor="bank_transfer" className="cursor-pointer">
                      <span className="font-medium">Bank Transfer</span>
                    </label>
                  </div>
                </div>

                {(paymentMethod === 'stripe' || paymentMethod === 'visa_card') && (
                  <div className="mt-4 space-y-4">
                    {/* Payment Badge */}
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">Secure Payment</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {paymentMethod === 'visa_card' ? (
                          <>
                            <span className="text-xs text-gray-600">Powered by</span>
                            <div className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded">VISA</div>
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-gray-600">Powered by</span>
                            <span className="text-sm font-bold text-emerald-600">Stripe</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Card Number
                      </label>
                      <input
                        {...register('cardNumber')}
                        placeholder="1234 5678 9012 3456"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                      />
                      {errors.cardNumber && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.cardNumber.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Expiry Date
                        </label>
                        <input
                          {...register('expiryDate')}
                          placeholder="MM/YY"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                        />
                        {errors.expiryDate && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.expiryDate.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          CVV
                        </label >
                        <input
                          {...register('cvv')}
                          type="password"
                          placeholder="123"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                        />
                        {errors.cvv && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.cvv.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Truck className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-medium">Free Shipping</p>
                <p className="text-sm text-gray-500">2-3 business days</p>
              </div>
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02, translateY: -2 }}
              whileTap={{ scale: 0.98 }}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-800 text-white px-6 py-4 rounded-xl hover:from-emerald-500 hover:to-emerald-700 transition-all duration-300 shadow-xl shadow-emerald-900/40 border border-emerald-400/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-black uppercase tracking-widest"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                `Place Order • $${toMoney(finalTotal)}`
              )}
            </motion.button>
          </form>
        </div>

        <div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between border-b pb-4">
                  <div className="flex">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded-md mr-4"
                    />
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <span>${toMoney(item.subtotal)}</span>
                </div>
              ))}

              {/* Coupon Section */}
              <div className="border-t pt-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Coupon Code"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    disabled={!!appliedCoupon}
                  />
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="bg-red-100 text-red-600 px-4 py-2 rounded-md hover:bg-red-200 transition-colors"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={isValidatingCoupon || !couponCode.trim()}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      {isValidatingCoupon ? '...' : 'Apply'}
                    </button>
                  )}
                </div>
                {couponError && (
                  <p className="mt-1 text-sm text-red-600">{couponError}</p>
                )}
                {appliedCoupon && (
                  <div className="mt-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                    Coupon "{appliedCoupon.code}" applied: {appliedCoupon.discount_display}
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-4">
                <span>Subtotal</span>
                <span>${toMoney(total)}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-${toMoney(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="text-green-600">Free</span>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${toMoney(finalTotal)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-2" />
                <p className="text-sm">Your personal data will be used to process your order, support your experience, and for other purposes described in our privacy policy.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;