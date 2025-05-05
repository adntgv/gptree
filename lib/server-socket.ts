import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export const initSocketServer = (server: HTTPServer) => {
  if (io) {
    console.log('Socket server already initialized, reusing existing instance');
    return io;
  }

  console.log('Initializing Socket.IO server...');
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
    
    // Add an echo event for testing
    socket.on('echo', (data) => {
      console.log('Received echo event:', data);
      socket.emit('echo_response', { message: 'Server received: ' + data.message, timestamp: Date.now() });
    });
  });

  // Log that server is initialized
  console.log('Socket.IO server initialized successfully');
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io server not initialized');
  }
  return io;
}; 