import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Package, CreditCard, Truck, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
// import OrderFlowDiagram from '@/components/order/OrderFlowDiagram';

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId, orderData } = location.state || {};

  // If no order data, redirect to orders page
  React.useEffect(() => {
    if (!orderId) {
      navigate('/orders');
    }
  }, [orderId, navigate]);

  if (!orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Order not found. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Order Placed Successfully!
            </h1>
            <p className="text-gray-600">
              Thank you for your purchase. Your order has been received and is being processed.
            </p>
          </motion.div>

          {/* Order Flow Diagram */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="bg-white rounded-lg shadow-lg p-6 mb-6"
          >
            <h2 className="text-xl font-semibold mb-4 text-center">Order Progress</h2>
            <div className="text-center text-gray-600">
              Your order is awaiting approval
            </div>
          </motion.div>

          {/* Order Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="bg-white rounded-lg shadow-lg p-6 mb-6"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Package className="h-5 w-5 mr-2 text-emerald-600" />
              Order Details
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Number:</span>
                <span className="font-semibold">#{orderId}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Order Date:</span>
                <span className="font-semibold">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
              
              {orderData?.total_amount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-semibold text-green-600">
                    ${Number(orderData.total_amount).toFixed(2)}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Awaiting Admin Approval
                </span>
              </div>
            </div>
          </motion.div>

          {/* What's Next */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="bg-white rounded-lg shadow-lg p-6 mb-6"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Truck className="h-5 w-5 mr-2 text-emerald-600" />
              What's Next?
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-emerald-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-600 font-semibold text-sm">1</span>
                </div>
                <div>
                  <h3 className="font-medium">Admin Review</h3>
                  <p className="text-sm text-gray-600">
                    Our admin team will review and approve your order within 24 hours.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-gray-600 font-semibold text-sm">2</span>
                </div>
                <div>
                  <h3 className="font-medium">Processing</h3>
                  <p className="text-sm text-gray-600">
                    Once approved, the vendor will prepare your items for shipping.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-gray-600 font-semibold text-sm">3</span>
                </div>
                <div>
                  <h3 className="font-medium">Delivery</h3>
                  <p className="text-sm text-gray-600">
                    Your order will be shipped and delivered to your address.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link
              to={`/orders/${orderId}`}
              className="flex-1 bg-emerald-600 text-white text-center px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors duration-300 flex items-center justify-center"
            >
              <Package className="h-4 w-4 mr-2" />
              View Order Details
            </Link>
            
            <Link
              to="/buyer/dashboard"
              className="flex-1 bg-gray-100 text-gray-700 text-center px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors duration-300 flex items-center justify-center"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </motion.div>

          {/* Continue Shopping */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.5 }}
            className="text-center mt-8"
          >
            <Link
              to="/products"
              className="text-emerald-600 hover:text-emerald-800 font-medium"
            >
              Continue Shopping
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
