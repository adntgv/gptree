import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { Thread, Message } from './types';

interface ChatState {
  threads: Thread[];
  currentThreadId: string | null;
  newRoot: (title: string) => void;
  branchCurrent: () => void;
  forkAt: (msgId: string, title: string) => void;
  selectThread: (id: string) => void;
  sendMessage: (text: string) => Promise<void>;
  updateThread: (thread: Thread) => void;
  appendMessage: (threadId: string, message: Message) => void;
  updateMessageStatus: (threadId: string, messageId: string, status: 'pending' | 'generating' | 'completed' | 'error') => void;
  markThreadRead: (threadId: string) => void;
  fetchThreads: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  threads: [],
  currentThreadId: null,
  
  fetchThreads: async () => {
    try {
      const response = await fetch('/api/threads', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch threads');
      }
      
      const { threads, success } = await response.json();
      
      if (!success) {
        throw new Error('API returned unsuccessful response');
      }
      
      set({ 
        threads,
        currentThreadId: threads.length > 0 ? threads[0].id : null 
      });
    } catch (error) {
      console.error('Error fetching threads:', error);
    }
  },
  
  newRoot: async (title) => {
    try {
      // Call the API to create a new thread
      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create new thread');
      }
      
      const { thread } = await response.json();
      
      set(state => ({
        threads: [...state.threads, thread],
        currentThreadId: thread.id
      }));
      
      return thread.id;
    } catch (error) {
      console.error('Error creating thread:', error);
    }
  },
  
  branchCurrent: async () => {
    const { threads, currentThreadId } = get();
    
    if (!currentThreadId) return;
    
    const currentThread = threads.find(t => t.id === currentThreadId);
    if (!currentThread) return;
    
    try {
      // Call the API to create a new branched thread
      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Branch of ${currentThread.title}`,
          parentId: currentThread.id,
          messages: [...currentThread.messages],
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create branch thread');
      }
      
      const { thread: newThread } = await response.json();
      
      set(state => {
        const updatedThreads = state.threads.map(thread => {
          if (thread.id === currentThreadId) {
            return {
              ...thread,
              children: [...thread.children, newThread]
            };
          }
          return thread;
        });
        
        return {
          threads: [...updatedThreads, newThread],
          currentThreadId: newThread.id
        };
      });
    } catch (error) {
      console.error('Error creating branch thread:', error);
    }
  },
  
  forkAt: async (msgId, title) => {
    const { threads, currentThreadId } = get();
    
    if (!currentThreadId) return;
    
    const currentThread = threads.find(t => t.id === currentThreadId);
    if (!currentThread) return;
    
    const messageIndex = currentThread.messages.findIndex(m => m.id === msgId);
    if (messageIndex === -1) return;
    
    const messagesUpToPoint = currentThread.messages.slice(0, messageIndex + 1);
    
    try {
      // Call the API to create a new forked thread
      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || `Fork from ${currentThread.title}`,
          parentId: currentThread.id,
          forkedFromMsgId: msgId,
          messages: messagesUpToPoint,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create forked thread');
      }
      
      const { thread: newThread } = await response.json();
      
      set(state => {
        const updatedThreads = state.threads.map(thread => {
          if (thread.id === currentThreadId) {
            return {
              ...thread,
              children: [...thread.children, newThread]
            };
          }
          return thread;
        });
        
        return {
          threads: [...updatedThreads, newThread],
          currentThreadId: newThread.id
        };
      });
    } catch (error) {
      console.error('Error creating forked thread:', error);
    }
  },
  
  selectThread: (id) => {
    // Mark as read when selecting
    get().markThreadRead(id);
    set({ currentThreadId: id });
  },
  
  sendMessage: async (text) => {
    const { currentThreadId, threads } = get();
    if (!currentThreadId) return;
    
    const userMessage: Message = {
      id: nanoid(),
      author: 'user',
      text,
      timestamp: Date.now(),
      status: 'completed'
    };
    
    // Append the user message
    get().appendMessage(currentThreadId, userMessage);
    
    try {
      // Create a pending GPT message immediately
      const pendingMessage: Message = {
        id: nanoid(),
        author: 'gpt',
        text: '',
        timestamp: Date.now(),
        status: 'pending'
      };
      
      // Add the pending message
      get().appendMessage(currentThreadId, pendingMessage);
      
      // Call the API to get GPT response
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId: currentThreadId,
          message: text,
          pendingMessageId: pendingMessage.id
        }),
      });
      
      if (!response.ok) {
        // Mark message as error if request fails
        get().updateMessageStatus(currentThreadId, pendingMessage.id, 'error');
        throw new Error('Failed to send message to API');
      }
      
      // API will handle updating the GPT message through a websocket
    } catch (error) {
      console.error('Error sending message:', error);
    }
  },
  
  updateThread: (updatedThread) => {
    set(state => ({
      threads: state.threads.map(thread => 
        thread.id === updatedThread.id ? updatedThread : thread
      )
    }));
  },
  
  appendMessage: (threadId, message) => {
    set(state => {
      // Check if this is not the currently selected thread
      const isCurrentThread = threadId === state.currentThreadId;
      
      return {
        threads: state.threads.map(thread => {
          if (thread.id === threadId) {
            return {
              ...thread,
              messages: [...thread.messages, message],
              // Mark thread as having unread messages if not the current thread
              hasUnread: isCurrentThread ? thread.hasUnread : true
            };
          }
          return thread;
        })
      };
    });
  },
  
  updateMessageStatus: (threadId, messageId, status) => {
    set(state => ({
      threads: state.threads.map(thread => {
        if (thread.id === threadId) {
          return {
            ...thread,
            messages: thread.messages.map(message => 
              message.id === messageId 
                ? { ...message, status } 
                : message
            )
          };
        }
        return thread;
      })
    }));
  },
  
  markThreadRead: (threadId) => {
    set(state => ({
      threads: state.threads.map(thread => 
        thread.id === threadId 
          ? { ...thread, hasUnread: false } 
          : thread
      )
    }));
  }
})); 