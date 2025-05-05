'use client';

import { useState, useEffect } from 'react';
import { Thread } from '@/lib/types';
import { useChatStore } from '@/lib/store';

type ThreadItemProps = {
  thread: Thread;
  level: number;
  isActive: boolean;
};

const ThreadItem = ({ thread, level, isActive }: ThreadItemProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const selectThread = useChatStore(state => state.selectThread);
  const currentThreadId = useChatStore(state => state.currentThreadId);
  
  const hasChildren = thread.children && thread.children.length > 0;
  
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };
  
  const handleSelectThread = () => {
    selectThread(thread.id);
  };
  
  // Check if there are any pending messages in this thread
  const hasPendingMessages = thread.hasPending !== undefined 
    ? thread.hasPending 
    : thread.messages.some(msg => 
        msg.status === 'pending' || msg.status === 'generating'
      );
  
  // Check if there are any error messages in this thread
  const hasErrorMessages = thread.hasError !== undefined
    ? thread.hasError
    : thread.messages.some(msg => msg.status === 'error');
  
  return (
    <div className="mb-1">
      <div 
        className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${
          isActive ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100 text-gray-800'
        }`}
        style={{ paddingLeft: `${(level * 8) + 8}px` }}
        onClick={handleSelectThread}
      >
        {hasChildren && (
          <button 
            className="mr-1 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700"
            onClick={handleToggleExpand}
          >
            {isExpanded ? '▼' : '►'}
          </button>
        )}
        <div className="flex-1 overflow-hidden">
          <div className="font-medium truncate flex items-center">
            <span className="text-gray-800">{thread.title || 'Untitled'}</span>
            
            {/* Status indicators */}
            {thread.hasUnread && (
              <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full" title="Unread messages"></span>
            )}
            {hasPendingMessages && (
              <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
                Processing...
              </span>
            )}
            {hasErrorMessages && (
              <span className="ml-2 text-xs bg-red-100 text-red-800 px-1 rounded">
                Error
              </span>
            )}
          </div>
          {thread.summary && (
            <div className="text-xs text-gray-600 truncate">{thread.summary}</div>
          )}
        </div>
      </div>
      
      {isExpanded && hasChildren && (
        <div className="ml-2">
          {thread.children.map(child => (
            <ThreadItem 
              key={child.id}
              thread={child}
              level={level + 1}
              isActive={currentThreadId === child.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SidebarTree = () => {
  const threads = useChatStore(state => state.threads);
  const currentThreadId = useChatStore(state => state.currentThreadId);
  const newRoot = useChatStore(state => state.newRoot);
  const fetchThreads = useChatStore(state => state.fetchThreads);
  
  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);
  
  const rootThreads = threads.filter(thread => thread.parentId === null);
  
  const handleNewChat = () => {
    newRoot('New Chat');
  };
  
  // Count total pending messages across all threads
  const pendingMessagesCount = threads.reduce((count, thread) => {
    const threadPendingCount = thread.messages.filter(
      m => m.status === 'pending' || m.status === 'generating'
    ).length;
    return count + threadPendingCount;
  }, 0);
  
  // Count total threads with unread messages
  const unreadThreadsCount = threads.filter(t => t.hasUnread).length;
  
  return (
    <div className="w-64 h-screen flex flex-col border-r bg-white shadow-sm">
      <div className="p-4 border-b bg-gray-50">
        <button 
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors flex items-center justify-center font-medium"
          onClick={handleNewChat}
        >
          <span className="mr-1">+</span> New Chat
        </button>
        
        {/* Global status indicators */}
        {(pendingMessagesCount > 0 || unreadThreadsCount > 0) && (
          <div className="mt-3 flex items-center text-xs">
            {pendingMessagesCount > 0 && (
              <div className="flex items-center mr-3">
                <span className="w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>
                <span className="text-gray-700">{pendingMessagesCount} processing</span>
              </div>
            )}
            {unreadThreadsCount > 0 && (
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                <span className="text-gray-700">{unreadThreadsCount} unread</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 bg-white">
        {rootThreads.length > 0 ? (
          rootThreads.map(thread => (
            <ThreadItem 
              key={thread.id}
              thread={thread}
              level={0}
              isActive={currentThreadId === thread.id}
            />
          ))
        ) : (
          <div className="text-center p-4 text-gray-500">
            No chats yet. Click "New Chat" to get started.
          </div>
        )}
      </div>
    </div>
  );
};

export default SidebarTree; 