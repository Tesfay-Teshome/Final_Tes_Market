import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { socket, connectSocket, disconnectSocket } from '@/services/socket';
import { RootState } from '@/store';
import { addNotification } from '@/store/slices/notificationSlice';

export const useSocket = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      connectSocket();

      // Set up event listeners based on user type
      if (user?.user_type === 'administrator') {
        socket.on('user_registered', (data) => {
          dispatch(addNotification({
            type: 'info',
            message: `New user registered: ${data.username}`,
          }));
        });

        socket.on('vendor_approval_request', (data) => {
          dispatch(addNotification({
            type: 'warning',
            message: `New vendor approval request from ${data.username}`,
          }));
        });

        socket.on('product_approval_request', (data) => {
          dispatch(addNotification({
            type: 'warning',
            message: `New product approval request: ${data.name}`,
          }));
        });
      }

      if (user?.user_type === 'vendor') {
        socket.on('product_approved', (data) => {
          dispatch(addNotification({
            type: 'success',
            message: `Your product "${data.name}" has been approved`,
          }));
        });

        socket.on('product_rejected', (data) => {
          dispatch(addNotification({
            type: 'error',
            message: `Your product "${data.name}" was rejected: ${data.reason}`,
          }));
        });

        socket.on('new_order', (data) => {
          dispatch(addNotification({
            type: 'success',
            message: `New order received for ${data.product_name}`,
          }));
        });
      }
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user, dispatch]);
};