import { io, Socket } from 'socket.io-client';
import { Message, Thread } from './types';
import { useChatStore } from './store';

let socket: Socket | null = null;

export const initSocket = () => {
  if (socket) return socket;

  socket = io({
    path: '/api/socketio',
  });

  // Listen for GPT responses
  socket.on('gpt_response', (data: { threadId: string; message: Message }) => {
    useChatStore.getState().appendMessage(data.threadId, data.message);
  });

  // Listen for summary updates
  socket.on('thread_summary', (data: { threadId: string; summary: string }) => {
    const { threads } = useChatStore.getState();
    
    const thread = threads.find(t => t.id === data.threadId);
    if (thread) {
      const updatedThread = { ...thread, summary: data.summary };
      useChatStore.getState().updateThread(updatedThread);
    }
  });

  // Listen for thread updates (for forking and branching)
  socket.on('thread_update', (data: { thread: Thread }) => {
    useChatStore.getState().updateThread(data.thread);
  });

  // Handle connection errors
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
}; 