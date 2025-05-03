import { io, Socket } from 'socket.io-client';
import { Message, Thread } from './types';
import { useChatStore } from './store';

let socket: Socket | null = null;

export const initSocket = () => {
  if (socket) return socket;

  socket = io({
    path: '/api/socketio',
  });

  // Listen for user message confirmations
  socket.on('user_message_saved', (data: { threadId: string; message: Message }) => {
    // Replace the temporary client message with the server-saved message
    const { threads } = useChatStore.getState();
    const thread = threads.find(t => t.id === data.threadId);
    
    if (thread) {
      // Find the most recent user message in the thread
      const lastUserMessageIndex = thread.messages.findIndex(
        msg => msg.author === 'user' && msg.text === data.message.text
      );
      
      if (lastUserMessageIndex !== -1) {
        // Replace temporary message with the server version (which has the ID from the DB)
        const updatedMessages = [...thread.messages];
        updatedMessages[lastUserMessageIndex] = data.message;
        
        const updatedThread = { ...thread, messages: updatedMessages };
        useChatStore.getState().updateThread(updatedThread);
      }
    }
  });

  // Listen for GPT responses
  socket.on('gpt_response', (data: { threadId: string; message: Message }) => {
    useChatStore.getState().appendMessage(data.threadId, data.message);
  });

  // Listen for message status updates
  socket.on('message_status', (data: { threadId: string; messageId: string; status: 'pending' | 'generating' | 'completed' | 'error' }) => {
    useChatStore.getState().updateMessageStatus(data.threadId, data.messageId, data.status);
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