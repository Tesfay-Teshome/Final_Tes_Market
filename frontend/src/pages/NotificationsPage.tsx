import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Bell, Check, Loader2, Trash2 } from 'lucide-react';
import { RootState } from '@/store';

type Notification = {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.getAll().then(res => res.data),
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: (ids: string[]) => 
      Promise.all(ids.map(id => notificationsAPI.markAsRead(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelected([]);
    },
  });

  // Delete mutation
  const deleteNotifications = useMutation({
    mutationFn: (ids: string[]) => 
      Promise.all(ids.map(id => notificationsAPI.delete(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelected([]);
    },
  });

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    const unreadIds = notifications
      .filter((n: Notification) => !n.is_read)
      .map((n: Notification) => n.id);
    if (unreadIds.length > 0) markAsRead.mutate(unreadIds);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={markAllAsRead}
          disabled={markAsRead.isPending || notifications.every((n: Notification) => n.is_read)}
        >
          {markAsRead.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Mark all as read
        </Button>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium">No notifications</h3>
            <p className="mt-1 text-sm text-gray-500">You don't have any notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selected.length > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-center">
                <span className="text-sm text-blue-700">
                  {selected.length} selected
                </span>
                <div className="space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => markAsRead.mutate(selected)}
                    disabled={markAsRead.isPending}
                  >
                    {markAsRead.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Mark as read
                  </Button>
                  <Button 
                    variant="destructive"
                    size="sm" 
                    onClick={() => deleteNotifications.mutate(selected)}
                    disabled={deleteNotifications.isPending}
                  >
                    {deleteNotifications.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {notifications.map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${
                    notification.is_read 
                      ? 'bg-white' 
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      checked={selected.includes(notification.id)}
                      onChange={() => toggleSelect(notification.id)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between">
                        <h3 className="text-sm font-medium">
                          {notification.title}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {notification.message}
                      </p>
                      {!notification.is_read && (
                        <span className="mt-2 inline-flex items-center text-xs text-blue-700">
                          New
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
