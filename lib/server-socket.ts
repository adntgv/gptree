import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export const initSocketServer = (server: HTTPServer) => {
  if (io) return io;

  io = new SocketIOServer(server, {
    path: '/api/socketio',
  });

  // Attach io to global object
  (global as any).io = io;

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io server not initialized');
  }
  return io;
}; 