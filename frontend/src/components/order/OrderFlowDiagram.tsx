import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, 
  CreditCard, 
  CheckCircle, 
  Package, 
  Truck, 
  Star,
  Clock,
  AlertCircle,
  XCircle
} from 'lucide-react';

interface OrderFlowDiagramProps {
  currentStatus: string;
  orderType: 'buyer' | 'vendor' | 'admin';
}

const OrderFlowDiagram: React.FC<OrderFlowDiagramProps> = ({ currentStatus, orderType }) => {
  const steps = [
    {
      id: 'cart',
      title: 'Cart',
      description: 'Items added to cart',
      icon: ShoppingCart,
      statuses: ['cart'],
      color: 'blue'
    },
    {
      id: 'checkout',
      title: 'Checkout',
      description: 'Payment processing',
      icon: CreditCard,
      statuses: ['pending', 'payment_confirmed'],
      color: 'yellow'
    },
    {
      id: 'approved',
      title: 'Approved',
      description: 'Order approved by admin',
      icon: CheckCircle,
      statuses: ['awaiting_approval', 'approved'],
      color: 'green'
    },
    {
      id: 'processing',
      title: 'Processing',
      description: 'Vendor preparing order',
      icon: Package,
      statuses: ['processing'],
      color: 'purple'
    },
    {
      id: 'shipped',
      title: 'Shipped',
      description: 'Order on the way',
      icon: Truck,
      statuses: ['shipped'],
      color: 'indigo'
    },
    {
      id: 'delivered',
      title: 'Delivered',
      description: 'Order completed',
      icon: Star,
      statuses: ['delivered'],
      color: 'emerald'
    }
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.statuses.includes(currentStatus));
  };

  const currentStepIndex = getCurrentStepIndex();

  const getStepStatus = (stepIndex: number) => {
    if (currentStatus === 'cancelled' || currentStatus === 'refunded') {
      return 'cancelled';
    }
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'pending';
  };

  const getStepColor = (step: any, status: string) => {
    if (status === 'cancelled') return 'red';
    if (status === 'completed') return 'green';
    if (status === 'current') return step.color;
    return 'gray';
  };

  const getStepIcon = (status: string) => {
    if (status === 'cancelled') return XCircle;
    if (status === 'current') return Clock;
    if (status === 'completed') return CheckCircle;
    return AlertCircle;
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Order Progress
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Track your order from cart to delivery
        </p>
      </div>

      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-8 left-8 right-8 h-0.5 bg-gray-200">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ 
              width: currentStatus === 'cancelled' || currentStatus === 'refunded' 
                ? '0%' 
                : `${(currentStepIndex / (steps.length - 1)) * 100}%` 
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const color = getStepColor(step, status);
            const IconComponent = status === 'current' ? step.icon : getStepIcon(status);

            return (
              <motion.div
                key={step.id}
                className="flex flex-col items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Step Circle */}
                <motion.div
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center border-4 transition-all duration-300
                    ${status === 'completed' ? `bg-${color}-500 border-${color}-500` : ''}
                    ${status === 'current' ? `bg-${color}-100 border-${color}-500` : ''}
                    ${status === 'pending' ? 'bg-gray-100 border-gray-300' : ''}
                    ${status === 'cancelled' ? 'bg-red-100 border-red-500' : ''}
                  `}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <IconComponent 
                    className={`
                      h-6 w-6 transition-colors duration-300
                      ${status === 'completed' ? 'text-white' : ''}
                      ${status === 'current' ? `text-${color}-600` : ''}
                      ${status === 'pending' ? 'text-gray-400' : ''}
                      ${status === 'cancelled' ? 'text-red-600' : ''}
                    `}
                  />
                </motion.div>

                {/* Step Info */}
                <div className="mt-3 text-center max-w-24">
                  <p className={`
                    text-sm font-medium transition-colors duration-300
                    ${status === 'completed' ? `text-${color}-600` : ''}
                    ${status === 'current' ? `text-${color}-600` : ''}
                    ${status === 'pending' ? 'text-gray-400' : ''}
                    ${status === 'cancelled' ? 'text-red-600' : ''}
                  `}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-tight">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Status Message */}
      <motion.div
        className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {currentStatus === 'cancelled' || currentStatus === 'refunded' ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Clock className="h-5 w-5 text-blue-500" />
            )}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">
              {getStatusMessage(currentStatus, orderType)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {getStatusDescription(currentStatus, orderType)}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const getStatusMessage = (status: string, orderType: 'buyer' | 'vendor' | 'admin') => {
  const messages = {
    buyer: {
      pending: 'Payment Processing',
      payment_confirmed: 'Payment Confirmed',
      awaiting_approval: 'Awaiting Admin Approval',
      approved: 'Order Approved',
      processing: 'Being Prepared',
      shipped: 'On the Way',
      delivered: 'Delivered',
      cancelled: 'Order Cancelled',
      refunded: 'Order Refunded'
    },
    vendor: {
      pending: 'Customer Payment Processing',
      payment_confirmed: 'Payment Received',
      awaiting_approval: 'Pending Admin Approval',
      approved: 'Ready to Process',
      processing: 'Processing Order',
      shipped: 'Order Shipped',
      delivered: 'Order Delivered',
      cancelled: 'Order Cancelled',
      refunded: 'Order Refunded'
    },
    admin: {
      pending: 'Payment Processing',
      payment_confirmed: 'Payment Confirmed - Needs Approval',
      awaiting_approval: 'Pending Your Approval',
      approved: 'Approved - Vendor Processing',
      processing: 'Vendor Processing',
      shipped: 'Order Shipped',
      delivered: 'Order Completed',
      cancelled: 'Order Cancelled',
      refunded: 'Order Refunded'
    }
  };

  return messages[orderType][status as keyof typeof messages.buyer] || 'Unknown Status';
};

const getStatusDescription = (status: string, orderType: 'buyer' | 'vendor' | 'admin') => {
  const descriptions = {
    buyer: {
      pending: 'We are processing your payment',
      payment_confirmed: 'Your payment has been confirmed',
      awaiting_approval: 'Your order is being reviewed by our team',
      approved: 'Your order has been approved and sent to the vendor',
      processing: 'The vendor is preparing your order',
      shipped: 'Your order is on its way to you',
      delivered: 'Your order has been successfully delivered',
      cancelled: 'This order has been cancelled',
      refunded: 'This order has been refunded'
    },
    vendor: {
      pending: 'Customer is completing payment',
      payment_confirmed: 'Payment received, awaiting admin approval',
      awaiting_approval: 'Admin is reviewing this order',
      approved: 'You can now start processing this order',
      processing: 'Order is being prepared for shipment',
      shipped: 'Order has been shipped to customer',
      delivered: 'Customer has received the order',
      cancelled: 'This order has been cancelled',
      refunded: 'This order has been refunded'
    },
    admin: {
      pending: 'Customer payment is being completed',
      payment_confirmed: 'Payment confirmed, please review and approve',
      awaiting_approval: 'This order requires your approval',
      approved: 'Order approved, vendor can now process',
      processing: 'Vendor is processing the order',
      shipped: 'Order has been shipped by vendor',
      delivered: 'Order successfully completed',
      cancelled: 'This order has been cancelled',
      refunded: 'This order has been refunded'
    }
  };

  return descriptions[orderType][status as keyof typeof descriptions.buyer] || 'Status update';
};

export default OrderFlowDiagram;
