'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/lib/store';
import { Message } from '@/lib/types';
import { testSocketConnection } from '@/lib/socket';

type MessageItemProps = {
  message: Message;
};

const MessageItem = ({ message }: MessageItemProps) => {
  const isUser = message.author === 'user';
  const { currentThreadId } = useChatStore();
  const retryMessage = useChatStore(state => state.retryMessage);
  
  // Helper to determine message content
  const getMessageContent = () => {
    // For a completed message with content, show the content
    if (message.text && (message.status === 'completed' || !message.status)) {
      return message.text;
    }
    
    // For pending messages, show the loading indicator
    if (message.status === 'pending' || message.status === 'generating') {
      return '...';
    }
    
    // For error messages, show the error or generic error message
    if (message.status === 'error') {
      return message.error || 'Error generating response';
    }
    
    // Fallback
    return message.text || '';
  };
  
  // Status indicators for messages
  const renderStatusIndicator = () => {
    if (!message.status || message.status === 'completed') {
      return null;
    }
    
    if (message.status === 'pending' || message.status === 'generating') {
      return (
        <div className="flex items-center text-xs text-yellow-600 mt-1">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {message.status === 'pending' ? 'Thinking...' : 'Generating response...'}
        </div>
      );
    }
    
    if (message.status === 'error') {
      return (
        <div className="flex items-center mt-1">
          <div className="text-xs text-red-600 flex items-center">
            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Error processing message
          </div>
          {message.author === 'gpt' && currentThreadId && (
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (currentThreadId && message.id) {
                  retryMessage(currentThreadId, message.id);
                }
              }}
              className="ml-3 text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200"
            >
              Retry
            </button>
          )}
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <div className={`p-4 ${isUser ? 'bg-blue-50' : 'bg-gray-50'} border-b border-gray-200`}>
      <div className="max-w-3xl mx-auto">
        <div className={`font-medium text-sm mb-1 ${isUser ? 'text-blue-700' : 'text-gray-700'}`}>
          {isUser ? 'You' : 'GPT'}
        </div>
        
        <div className="whitespace-pre-wrap text-gray-800">
          {getMessageContent()}
        </div>
        
        {renderStatusIndicator()}
        
        <div className="text-xs text-gray-500 mt-2">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

// Add a quick-access function for socket diagnostic tests
const runSocketDiagnostic = async () => {
  console.log('Running socket diagnostic...');
  const result = await testSocketConnection();
  console.log('Socket diagnostic result:', result);
  alert(`Socket connected: ${result.socketStatus.connected}, Socket ID: ${result.socketStatus.id || 'none'}\nMore details in console.`);
};

const ChatWindow = () => {
  const [inputText, setInputText] = useState('');
  const threads = useChatStore(state => state.threads);
  const currentThreadId = useChatStore(state => state.currentThreadId);
  const sendMessage = useChatStore(state => state.sendMessage);
  const branchCurrent = useChatStore(state => state.branchCurrent);
  const forkAt = useChatStore(state => state.forkAt);
  
  const [activeFork, setActiveFork] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const currentThread = threads.find(t => t.id === currentThreadId);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentThread?.messages]);
  
  // Add diagnostic state
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputText.trim() || !currentThreadId) return;
    
    try {
      await sendMessage(inputText);
    } catch (error) {
      console.error('Error sending message:', error);
      // Don't refresh page on error, already handled in the store
    }
    setInputText('');
  };
  
  const handleBranch = () => {
    branchCurrent();
  };
  
  const handleFork = (messageId: string) => {
    if (activeFork === messageId) {
      forkAt(messageId, `Fork from message`);
      setActiveFork(null);
    } else {
      setActiveFork(messageId);
    }
  };
  
  if (!currentThread) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">No chat selected</h2>
          <p className="text-gray-600">Select a chat from the sidebar or create a new one</p>
        </div>
      </div>
    );
  }
  
  // Check if we have any pending messages
  const hasPendingMessages = currentThread.messages.some(msg => msg.status === 'pending');
  
  return (
    <div className="flex-1 flex flex-col h-screen bg-white">
      <div className="border-b p-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">{currentThread.title}</h1>
        <div className="flex items-center">
          {hasPendingMessages && (
            <div className="text-yellow-600 flex items-center mr-3 text-sm">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </div>
          )}
          <button 
            className="px-3 py-1 mr-2 border rounded-md bg-white hover:bg-gray-50 text-gray-700 transition-colors shadow-sm text-sm"
            onClick={() => setShowDiagnostic(!showDiagnostic)}
          >
            {showDiagnostic ? 'Hide Tools' : 'Tools'}
          </button>
          <button
            className="px-3 py-1 border rounded-md bg-white hover:bg-gray-50 text-gray-700 transition-colors shadow-sm"
            onClick={handleBranch}
          >
            Branch
          </button>
        </div>
      </div>
      
      {showDiagnostic && (
        <div className="bg-gray-100 p-2 flex justify-end space-x-2 text-sm">
          <button
            onClick={() => runSocketDiagnostic()}
            className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded border border-blue-300"
          >
            Test Socket
          </button>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto bg-white">
        {currentThread.messages.map((message) => (
          <div key={message.id} className="relative group">
            <MessageItem message={message} />
            <button
              className={`absolute right-4 top-4 opacity-0 group-hover:opacity-100 px-2 py-1 text-xs border rounded-md
                transition-all duration-200
                ${activeFork === message.id ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white hover:bg-gray-50 text-gray-700'}`}
              onClick={() => handleFork(message.id)}
            >
              {activeFork === message.id ? 'Confirm Fork' : 'Fork'}
            </button>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t p-4 bg-white">
        <form onSubmit={handleSendMessage} className="flex space-x-4">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            disabled={hasPendingMessages}
          />
          <button
            type="submit"
            className={`px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition-colors ${
              hasPendingMessages ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={hasPendingMessages}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
