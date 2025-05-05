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
  sendMessage: (text: string) => Promise<boolean>;
  updateThread: (thread: Thread) => void;
  appendMessage: (threadId: string, message: Message) => void;
  updateMessageStatus: (threadId: string, messageId: string, status: 'pending' | 'generating' | 'completed' | 'error', text?: string, error?: string) => void;
  markThreadRead: (threadId: string) => void;
  markThreadUnread: (threadId: string) => void;
  fetchThreads: () => Promise<void>;
  retryMessage: (threadId: string, messageId: string) => Promise<void>;
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
    if (!currentThreadId) return false;
    
    // Ensure socket is initialized
    try {
      const { getSocket } = await import('./socket');
      await getSocket();
    } catch (error) {
      console.error('Failed to initialize socket before sending message:', error);
      // Continue anyway, as the API call doesn't require socket to be connected
    }
    
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
      // Create a temporary pending message to show in the UI immediately
      const tempPendingId = nanoid();
      const pendingMessage: Message = {
        id: tempPendingId,
        author: 'gpt',
        text: '',
        timestamp: Date.now(),
        status: 'pending'
      };
      
      // Add the temporary pending message
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
          pendingMessageId: tempPendingId // Send the temporary ID - this can help with syncing
        }),
      });
      
      if (!response.ok) {
        // Mark temporary message as error if request fails
        get().updateMessageStatus(currentThreadId, tempPendingId, 'error', '', 'Failed to send message to API');
        throw new Error('Failed to send message to API');
      }
      
      const data = await response.json();
      console.log('Message sent successfully:', data);
      
      // If the server sends back a different pendingMessageId, we need to update our UI
      if (data.pendingMessageId && data.pendingMessageId !== tempPendingId) {
        console.log(`Server using different message ID: ${data.pendingMessageId} vs our ${tempPendingId}`);
        
        // Update our temporary message ID to match the server's ID to ensure updates work
        set(state => ({
          threads: state.threads.map(thread => {
            if (thread.id === currentThreadId) {
              return {
                ...thread,
                messages: thread.messages.map(msg => 
                  msg.id === tempPendingId
                    ? { ...msg, id: data.pendingMessageId }
                    : msg
                )
              };
            }
            return thread;
          })
        }));
      }
      
      // API will handle updating the GPT message through a websocket
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
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
      
      // Only mark thread as having unread messages if:
      // 1. It's not the current thread
      // 2. The message is from GPT (not user messages)
      // 3. The message is completed (to avoid marking as unread for pending/error states)
      const shouldMarkUnread = !isCurrentThread && 
                               message.author === 'gpt' && 
                               message.status === 'completed' &&
                               message.text.trim() !== '';
      
      return {
        threads: state.threads.map(thread => {
          if (thread.id === threadId) {
            return {
              ...thread,
              messages: [...thread.messages, message],
              // Mark thread as having unread messages if specified by conditions
              hasUnread: shouldMarkUnread ? true : (isCurrentThread ? false : thread.hasUnread)
            };
          }
          return thread;
        })
      };
    });
  },
  
  updateMessageStatus: (threadId, messageId, status, text, error) => {
    set(state => {
      // Create a new threads array with the updated message status
      const updatedThreads = state.threads.map(thread => {
        if (thread.id === threadId) {
          // Update the message in this thread
          const updatedMessages = thread.messages.map(message => 
            message.id === messageId 
              ? { ...message, status, ...(text ? { text } : {}), ...(error ? { error } : {}) } 
              : message
          );
          
          // Check if thread has pending or error messages
          const hasError = updatedMessages.some(msg => msg.status === 'error');
          const hasPending = updatedMessages.some(msg => 
            msg.status === 'pending' || msg.status === 'generating'
          );
          
          // Return updated thread
          return {
            ...thread,
            messages: updatedMessages,
            // Maintain hasUnread if not the current thread
            hasUnread: thread.id === state.currentThreadId ? false : thread.hasUnread
          };
        }
        return thread;
      });
      
      return { threads: updatedThreads };
    });
  },
  
  markThreadRead: (threadId) => {
    set(state => ({
      threads: state.threads.map(thread => 
        thread.id === threadId 
          ? { ...thread, hasUnread: false } 
          : thread
      )
    }));
  },
  
  markThreadUnread: (threadId) => {
    set(state => ({
      threads: state.threads.map(thread => 
        thread.id === threadId 
          ? { ...thread, hasUnread: true } 
          : thread
      )
    }));
  },
  
  retryMessage: async (threadId, messageId) => {
    const { threads } = get();
    const thread = threads.find(t => t.id === threadId);
    
    if (!thread) return;
    
    // Find the failing message and the last user message
    const failingMessage = thread.messages.find(m => m.id === messageId);
    
    if (!failingMessage || failingMessage.author !== 'gpt' || failingMessage.status !== 'error') {
      console.error('Cannot retry: message not found or not an error message');
      return;
    }
    
    // Update status to pending
    get().updateMessageStatus(threadId, messageId, 'pending');
    
    try {
      // Call the API to retry generating the message
      const response = await fetch('/api/messages/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId,
          messageId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        get().updateMessageStatus(threadId, messageId, 'error', undefined, errorData.error || 'Failed to retry message');
        throw new Error('Failed to retry message generation');
      }
      
      // API will handle updating the message through the socket
    } catch (error) {
      console.error('Error retrying message:', error);
      get().updateMessageStatus(threadId, messageId, 'error', undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }
})); 