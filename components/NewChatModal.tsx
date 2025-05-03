'use client';

import { useState } from 'react';
import { useChatStore } from '@/lib/store';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: 'new' | 'branch' | 'fork';
  messageId?: string;
};

const NewChatModal = ({ isOpen, onClose, mode, messageId }: ModalProps) => {
  const [title, setTitle] = useState('');
  const newRoot = useChatStore(state => state.newRoot);
  const branchCurrent = useChatStore(state => state.branchCurrent);
  const forkAt = useChatStore(state => state.forkAt);
  
  if (!isOpen) return null;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const chatTitle = title.trim() || 'New Chat';
    
    switch (mode) {
      case 'new':
        newRoot(chatTitle);
        break;
      case 'branch':
        branchCurrent();
        break;
      case 'fork':
        if (messageId) {
          forkAt(messageId, chatTitle);
        }
        break;
    }
    
    setTitle('');
    onClose();
  };
  
  const getModeTitle = () => {
    switch (mode) {
      case 'new': return 'New Chat';
      case 'branch': return 'Branch Current Thread';
      case 'fork': return 'Fork From Message';
      default: return '';
    }
  };
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">{getModeTitle()}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === 'new' ? 'New Chat' : mode === 'branch' ? 'Branch of Current Chat' : 'Fork from Message'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 transition-colors shadow-sm"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewChatModal; 