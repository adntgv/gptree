import { io, Socket } from 'socket.io-client';
import { Message, Thread } from './types';
import { useChatStore } from './store';

let socket: Socket | null = null;
let socketInitPromise: Promise<Socket> | null = null;

export const initSocket = () => {
  // If socket is already initialized and connected, return it
  if (socket?.connected) {
    console.log('Socket already connected:', socket.id);
    return socket;
  }
  
  // If we're already in the process of initializing, return the promise
  if (socketInitPromise) {
    console.log('Socket initialization already in progress, waiting...');
    return socketInitPromise;
  }
  
  console.log('Initializing socket connection...');
  
  // Create a promise to initialize the socket
  socketInitPromise = new Promise<Socket>((resolve, reject) => {
    try {
      // Close any existing socket
      if (socket) {
        console.log('Closing existing socket before reconnection');
        socket.close();
        socket = null;
      }
      
      // Create new socket
      socket = io({
        path: '/api/socketio',
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
        transports: ['polling', 'websocket']
      });
      
      // Connection events
      socket.on('connect', () => {
        console.log('Socket connected with ID:', socket?.id);
        resolve(socket as Socket);
        socketInitPromise = null;
      });
      
      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        if (!socket?.connected) {
          reject(err);
          socketInitPromise = null;
        }
      });
      
      // Set a timeout for connection
      setTimeout(() => {
        if (!socket?.connected) {
          console.error('Socket connection timeout');
          reject(new Error('Socket connection timeout'));
          socketInitPromise = null;
        }
      }, 10000);
      
      // Rest of socket event listeners
      setupSocketListeners();
      
    } catch (error) {
      console.error('Error initializing socket:', error);
      reject(error);
      socketInitPromise = null;
    }
  });
  
  return socketInitPromise;
};

// Set up all the event listeners for the socket
const setupSocketListeners = () => {
  if (!socket) return;
  
  // Listen for user message confirmations
  socket.on('user_message_saved', (data: { threadId: string; message: Message }) => {
    console.log(`Received user_message_saved for thread ${data.threadId}`);
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
    console.log(`Received gpt_response: ThreadID=${data.threadId}, MessageID=${data.message.id}, Status=${data.message.status}`);
    
    const { threads, currentThreadId } = useChatStore.getState();
    const thread = threads.find(t => t.id === data.threadId);
    
    if (thread) {
      // Check if this message is for the current thread or a different one
      const isCurrentThread = data.threadId === currentThreadId;
      
      // Check if this message ID already exists in the thread (might be an update to existing message)
      const existingMessageIndex = thread.messages.findIndex(m => m.id === data.message.id);
      
      if (existingMessageIndex !== -1) {
        console.log(`Updating existing message at index ${existingMessageIndex}`);
        // Update existing message - preserving status if one isn't provided
        const currentMessage = thread.messages[existingMessageIndex];
        const updatedMessage = {
          ...data.message,
          // Only override status if it's provided and is not null/undefined
          status: data.message.status || currentMessage.status
        };
        
        const updatedMessages = [...thread.messages];
        updatedMessages[existingMessageIndex] = updatedMessage;
        
        // Only mark as unread if:
        // 1. It's not the current thread
        // 2. The message is completed (to avoid marking as unread for pending/error states)
        // 3. The message is from GPT (not user messages)
        const shouldMarkUnread = !isCurrentThread && 
                                 updatedMessage.status === 'completed' && 
                                 updatedMessage.author === 'gpt' &&
                                 updatedMessage.text.trim() !== '';
        
        const updatedThread = { 
          ...thread, 
          messages: updatedMessages,
          // Check if thread still has pending or error messages after this update
          hasPending: updatedMessages.some(m => m.status === 'pending' || m.status === 'generating'),
          hasError: updatedMessages.some(m => m.status === 'error'),
          // Mark as unread if it's not the current thread and the message is completed
          hasUnread: shouldMarkUnread ? true : thread.hasUnread
        };
        
        useChatStore.getState().updateThread(updatedThread);
        
        if (shouldMarkUnread) {
          playNotificationSound();
        }
      } else {
        console.log(`Adding new message as it doesn't exist yet`);
        // Append new message
        useChatStore.getState().appendMessage(data.threadId, data.message);
        
        // If this is a completed GPT message to a non-current thread, mark it as unread
        if (!isCurrentThread && 
            data.message.status === 'completed' && 
            data.message.author === 'gpt' &&
            data.message.text.trim() !== '') {
          
          // Mark thread as unread
          useChatStore.getState().markThreadUnread(data.threadId);
          
          // Play notification sound for new messages
          playNotificationSound();
        }
        
        // Force a refresh of the thread status in sidebar
        const updatedThreadAfterAppend = threads.find(t => t.id === data.threadId);
        if (updatedThreadAfterAppend) {
          useChatStore.getState().updateThread({...updatedThreadAfterAppend});
        }
      }
    } else {
      console.log(`Thread ${data.threadId} not found in state`);
    }
  });

  // Listen for message status updates
  socket.on('message_status', (data: { threadId: string; messageId: string; status: 'pending' | 'generating' | 'completed' | 'error'; error?: string }) => {
    console.log(`Received message_status: ThreadID=${data.threadId}, MessageID=${data.messageId}, Status=${data.status}`);
    
    const { threads } = useChatStore.getState();
    const thread = threads.find(t => t.id === data.threadId);
    
    if (thread) {
      const msgIndex = thread.messages.findIndex(m => m.id === data.messageId);
      if (msgIndex !== -1) {
        console.log(`Found message at index ${msgIndex}`);
        // Don't update status if message is already completed and new status is error
        // This avoids race conditions where an error comes after a successful completion
        const currentMessage = thread.messages[msgIndex];
        
        if (currentMessage.status === 'completed' && data.status === 'error') {
          console.log('Ignoring error status update for already completed message');
          return;
        }
        
        // Update the message status - ensures sidebar gets updated too
        useChatStore.getState().updateMessageStatus(
          data.threadId, 
          data.messageId, 
          data.status, 
          undefined, 
          data.error
        );
        
        // Force a refresh of the thread status in the sidebar
        const updatedThread = { ...thread };
        useChatStore.getState().updateThread(updatedThread);
      } else {
        console.log(`Message with ID ${data.messageId} not found in thread`);
      }
    } else {
      console.log(`Thread ${data.threadId} not found in state`);
    }
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

  // Add a test message handler
  socket.on('test_message', (data) => {
    console.log('Received test message from server:', data);
  });

  // Echo response handler
  socket.on('echo_response', (data) => {
    console.log('Received echo response:', data);
  });

  // Handle connection errors
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`Socket reconnected after ${attemptNumber} attempts`);
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`Socket reconnection attempt ${attemptNumber}`);
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });
};

export const getSocket = async () => {
  if (!socket || !socket.connected) {
    return initSocket();
  }
  return socket;
};

// Add a test function to diagnose socket connectivity
export const testSocketConnection = async () => {
  try {
    // Ensure socket is initialized and connected
    const currentSocket = await initSocket();
    
    const socketStatus = {
      connected: currentSocket?.connected || false,
      id: currentSocket?.id,
    };
    
    console.log('Socket connection status:', socketStatus);
    
    try {
      // Call the diagnostics API
      const response = await fetch('/api/diagnostics', {
        method: 'POST',
      });
      
      const data = await response.json();
      console.log('Diagnostics test response:', data);
      
      // Test echo message
      if (currentSocket?.connected) {
        currentSocket.emit('echo', { message: 'Test echo from client', timestamp: Date.now() });
      }
      
      return {
        socketStatus,
        serverResponse: data
      };
    } catch (error) {
      console.error('Error testing socket connection:', error);
      return {
        socketStatus,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  } catch (error) {
    console.error('Socket initialization failed:', error);
    return {
      socketStatus: { connected: false, id: null },
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// Function to play notification sound when new messages arrive
const playNotificationSound = () => {
  try {
    // Create audio element
    const audio = new Audio('/notification.mp3');
    audio.volume = 1;
    audio.play().catch(error => {
      // Browser might block autoplay
      console.log('Could not play notification sound:', error);
    });
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}; 