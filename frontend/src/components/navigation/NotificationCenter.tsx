import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, AlertCircle, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import { format } from 'date-fns';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  related_id?: string;
  created_at: string;
  time_ago: string;
  requires_confirmation: boolean;
  confirmed_by_vendor: boolean;
}

const NotificationCenter = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Get authentication state
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  // Fetch notifications from API - only when authenticated
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['vendor-notifications-bell'],
    queryFn: async () => {
      const response = await api.get('/api/notifications/');
      return response.data;
    },
    enabled: isAuthenticated && !!user, // Only fetch when user is authenticated
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: false, // Don't retry on 401 errors
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const pendingConfirmations = notifications.filter(
    (n) => n.requires_confirmation && !n.confirmed_by_vendor
  ).length;

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/notifications/mark_all_as_read/');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-notifications-bell'] });
    },
  });

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Notifications</h3>
              <div className="flex space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={markAllAsReadMutation.isPending}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                    title="Mark all as read"
                  >
                    Mark all read
                  </button>
                )}
                {pendingConfirmations > 0 && (
                  <Link
                    to="/vendor/notifications"
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    {pendingConfirmations} need action
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b hover:bg-gray-50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  } ${
                    notification.requires_confirmation && !notification.confirmed_by_vendor
                      ? 'border-l-4 border-l-amber-500'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {notification.requires_confirmation ? (
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                      ) : notification.notification_type === 'order' ? (
                        <Package className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Bell className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold text-gray-900 mb-1`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-xs text-gray-500">
                          {notification.time_ago}
                        </p>
                        {notification.requires_confirmation && !notification.confirmed_by_vendor && (
                          <span className="text-xs font-semibold text-amber-600">
                            • Action Required
                          </span>
                        )}
                      </div>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">No notifications</p>
              </div>
            )}
            {notifications.length > 5 && (
              <Link
                to="/vendor/notifications"
                className="block p-3 text-center text-sm text-blue-600 hover:bg-blue-50 font-medium"
                onClick={() => setIsOpen(false)}
              >
                View All Notifications ({notifications.length})
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter