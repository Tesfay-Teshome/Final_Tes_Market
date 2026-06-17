import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, MessageCircle, Package, ShoppingCart, User, X } from 'lucide-react';
import { notificationsAPI, messagingAPI } from '@/services/api';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: 'order' | 'product' | 'system' | 'promotion' | 'account' | 'message';
  is_read: boolean;
  related_id?: string;
  created_at: string;
}

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const queryClient = useQueryClient();

  // Fetch notifications — refetch immediately when dropdown opens
  const { data: notifications = [], refetch } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await notificationsAPI.getAll();
      return response.data || [];
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
    staleTime: 0,        // always treat cached data as stale
    refetchOnWindowFocus: true,
  });

  // Fetch unread message count
  const { data: unreadMessageCount = 0 } = useQuery<number>({
    queryKey: ['unread-messages-count'],
    queryFn: async () => {
      const response = await messagingAPI.getUnreadCount();
      return response.data?.count || 0;
    },
    enabled: isAuthenticated,
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const totalUnreadCount = unreadNotifications.length + unreadMessageCount;

  // Always show unread first, then newest-first within each group
  const sortedNotifications = [...notifications].sort((a, b) => {
    if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'order':
        return <ShoppingCart className="h-4 w-4 text-green-500" />;
      case 'product':
        return <Package className="h-4 w-4 text-purple-500" />;
      case 'account':
        return <User className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationLink = (notification: Notification) => {
    switch (notification.notification_type) {
      case 'message':
        return '/messages';
      case 'order':
        return notification.related_id ? `/orders/${notification.related_id}` : '/orders';
      case 'product':
        return notification.related_id ? `/products/${notification.related_id}` : '/products';
      default:
        return '#';
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await notificationsAPI.markAsRead(notification.id);
        // Immediately refresh so count badge and sort order update
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['sidebar-unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['vendor-notifications-popup'] });
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
    setIsOpen(false);
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      // Immediately refresh bell + sidebar badge
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-unread-count'] });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) refetch(); // always load fresh data when opening
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full transition-colors"
      >
        <Bell className="h-6 w-6" />
        {totalUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full min-w-[20px] h-5">
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                <div className="flex items-center space-x-2">
                  {unreadNotifications.length > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {/* Unread Messages Section */}
              {unreadMessageCount > 0 && (
                <Link
                  to="/messages"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 hover:bg-blue-50 border-b border-gray-100 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <MessageCircle className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        New Messages
                      </p>
                      <p className="text-sm text-gray-600">
                        You have {unreadMessageCount} unread message{unreadMessageCount !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-blue-600 font-medium mt-1">
                        Click to view messages
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {unreadMessageCount}
                      </span>
                    </div>
                  </div>
                </Link>
              )}

              {/* Notifications — unread first, then newest first */}
              {sortedNotifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                sortedNotifications.map((notification) => (
                  <Link
                    key={notification.id}
                    to={getNotificationLink(notification)}
                    onClick={() => handleNotificationClick(notification)}
                    className={`block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <Link
                  to="/notifications"
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View all notifications
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
