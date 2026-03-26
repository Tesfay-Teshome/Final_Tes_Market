import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  AlertCircle,
  Bell,
  Eye,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface VendorNotification {
  id: string;
  type: 'order_approved' | 'order_rejected' | 'order_processing' | 'order_completed' | 'payout_completed';
  title: string;
  message: string;
  order_id?: string;
  amount?: number;
  commission_amount?: number;
  payout_amount?: number;
  admin_notes?: string;
  created_at: string;
  read: boolean;
}

interface VendorNotificationsProps {
  notifications: VendorNotification[];
  onMarkAsRead: (id: string) => void;
  onViewOrder: (orderId: string) => void;
}

const VendorNotifications: React.FC<VendorNotificationsProps> = ({
  notifications,
  onMarkAsRead,
  onViewOrder
}) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'order_rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'order_processing':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'order_completed':
        return <CheckCircle className="h-5 w-5 text-purple-500" />;
      case 'payout_completed':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order_approved':
        return 'from-green-50 to-emerald-50 border-green-200';
      case 'order_rejected':
        return 'from-red-50 to-rose-50 border-red-200';
      case 'order_processing':
        return 'from-blue-50 to-indigo-50 border-blue-200';
      case 'order_completed':
        return 'from-purple-50 to-violet-50 border-purple-200';
      case 'payout_completed':
        return 'from-green-50 to-emerald-50 border-green-200';
      default:
        return 'from-gray-50 to-slate-50 border-gray-200';
    }
  };

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h1 
            className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            Admin Notifications
          </motion.h1>
          <motion.p 
            className="text-gray-600 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Stay updated on order status changes and payouts
          </motion.p>
        </div>
        <motion.div 
          className="flex items-center space-x-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            {notifications.filter(n => !n.read).length} Unread
          </Badge>
        </motion.div>
      </div>

      {/* Notifications List */}
      <motion.div 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {notifications.length === 0 ? (
          <Card className="bg-gradient-to-br from-white to-gray-50 border-gray-200 shadow-lg rounded-xl">
            <CardContent className="p-12 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center space-y-3"
              >
                <Bell className="h-12 w-12 text-gray-400" />
                <p className="text-gray-500 font-medium">No notifications yet</p>
                <p className="text-gray-400 text-sm">
                  You'll receive notifications when admins take actions on your orders
                </p>
              </motion.div>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.01 }}
            >
              <Card className={`bg-gradient-to-br ${getNotificationColor(notification.type)} border shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl ${!notification.read ? 'ring-2 ring-blue-200' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <motion.div 
                        className="flex-shrink-0 rounded-xl p-3 bg-white shadow-md"
                        whileHover={{ rotate: 5, scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {getNotificationIcon(notification.type)}
                      </motion.div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <Badge className="bg-blue-500 text-white text-xs">New</Badge>
                          )}
                        </div>
                        
                        <p className="text-gray-700">{notification.message}</p>
                        
                        {notification.admin_notes && (
                          <div className="bg-white/60 p-3 rounded-lg border border-gray-200">
                            <p className="text-sm font-medium text-gray-800 mb-1">Admin Notes:</p>
                            <p className="text-sm text-gray-700">{notification.admin_notes}</p>
                          </div>
                        )}
                        
                        {/* Financial Information */}
                        {(notification.amount || notification.payout_amount) && (
                          <div className="bg-white/60 p-3 rounded-lg border border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              {notification.amount && (
                                <div>
                                  <span className="font-medium text-gray-600">Order Amount:</span>
                                  <span className="ml-2 font-bold text-gray-900">
                                    ${notification.amount.toFixed(2)}
                                  </span>
                                </div>
                              )}
                              {notification.commission_amount && (
                                <div>
                                  <span className="font-medium text-gray-600">Commission:</span>
                                  <span className="ml-2 font-bold text-red-600">
                                    -${notification.commission_amount.toFixed(2)}
                                  </span>
                                </div>
                              )}
                              {notification.payout_amount && (
                                <div>
                                  <span className="font-medium text-gray-600">Your Payout:</span>
                                  <span className="ml-2 font-bold text-green-600">
                                    ${notification.payout_amount.toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                          {notification.order_id && (
                            <div className="flex items-center space-x-1">
                              <span>Order #{notification.order_id}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      {!notification.read && (
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onMarkAsRead(notification.id)}
                            className="bg-white/80 hover:bg-white border-gray-300"
                          >
                            Mark as Read
                          </Button>
                        </motion.div>
                      )}
                      
                      {notification.order_id && (
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            size="sm"
                            onClick={() => onViewOrder(notification.order_id!)}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Order
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>
    </motion.div>
  );
};

export default VendorNotifications;
