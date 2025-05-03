'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/lib/store';
import { Message } from '@/lib/types';

const MessageItem = ({ message }: { message: Message }) => {
  const isUser = message.author === 'user';
  
  return (
    <div className={`p-4 ${isUser ? 'bg-white' : 'bg-gray-50'} border-b`}>
      <div className="max-w-3xl mx-auto">
        <div className={`font-medium mb-1 ${isUser ? 'text-blue-600' : 'text-indigo-600'}`}>
          {isUser ? 'You' : 'GPT'}
        </div>
        <div className="whitespace-pre-wrap text-gray-800 leading-relaxed"> 
          {message.text}
        </div>
      </div>
    </div>
  );
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
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputText.trim() || !currentThreadId) return;
    
    await sendMessage(inputText);
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
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">No chat selected</h2>
          <p className="text-gray-600">Select a chat from the sidebar or create a new one</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col h-screen bg-white">
      <div className="border-b p-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">{currentThread.title}</h1>
        <button
          className="px-3 py-1 border rounded-md bg-white hover:bg-gray-50 text-gray-700 transition-colors shadow-sm"
          onClick={handleBranch}
        >
          Branch
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
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
      
      <div className="border-t p-4 bg-white shadow-md">
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
          <div className="flex">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors"
              disabled={!inputText.trim()}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
