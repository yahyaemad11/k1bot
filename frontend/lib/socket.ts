import { io, Socket } from 'socket.io-client';
import { API_URL, getToken } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(API_URL, {
    auth: { token: getToken() },
    transports: ['websocket'],
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
