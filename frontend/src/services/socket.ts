import { io } from 'socket.io-client';
import { buildWsUrl } from '@/services/api';

const SOCKET_URL = buildWsUrl('/ws');

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
});

export const connectSocket = () => {
  const token = localStorage.getItem('access_token');
  if (token) {
    socket.auth = { token };
    socket.connect();
  }
};

export const disconnectSocket = () => {
  socket.disconnect();
};

// Listen for real-time updates
socket.on('user_registered', (data) => {
  console.log('New user registered:', data);
  // You can dispatch an action here to update the Redux store
});

socket.on('product_created', (data) => {
  console.log('New product created:', data);
});

socket.on('category_created', (data) => {
  console.log('New category created:', data);
});

socket.on('vendor_approval_request', (data) => {
  console.log('New vendor approval request:', data);
});

socket.on('product_approval_request', (data) => {
  console.log('New product approval request:', data);
});

socket.on('transaction_created', (data) => {
  console.log('New transaction:', data);
});