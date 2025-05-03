'use client';

import { useState } from 'react';
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
  
  const hasChildren = thread.children && thread.children.length > 0;
  
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };
  
  const handleSelectThread = () => {
    selectThread(thread.id);
  };
  
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
          <div className="font-medium truncate">{thread.title || 'Untitled'}</div>
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
              isActive={useChatStore(state => state.currentThreadId === child.id)}
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
  
  const rootThreads = threads.filter(thread => thread.parentId === null);
  
  const handleNewChat = () => {
    newRoot('New Chat');
  };
  
  return (
    <div className="w-64 h-screen flex flex-col border-r bg-white shadow-sm">
      <div className="p-4 border-b">
        <button 
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors flex items-center justify-center font-medium"
          onClick={handleNewChat}
        >
          <span className="mr-1">+</span> New Chat
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
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