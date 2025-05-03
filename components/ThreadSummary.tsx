'use client';

import { useState } from 'react';
import { useChatStore } from '@/lib/store';

const ThreadSummary = () => {
  const [isLoading, setIsLoading] = useState(false);
  const threads = useChatStore(state => state.threads);
  const currentThreadId = useChatStore(state => state.currentThreadId);
  
  const currentThread = threads.find(t => t.id === currentThreadId);
  
  if (!currentThread) {
    return null;
  }
  
  const handleGenerateSummary = async () => {
    setIsLoading(true);
    
    try {
      await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId: currentThreadId,
        }),
      });
      
      // Summary will be updated via socket
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="mt-4 max-w-3xl mx-auto mb-8">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium text-gray-900">Thread Summary</h3>
        <button
          className="px-3 py-1 text-sm border rounded-md hover:bg-gray-100 flex items-center text-gray-700 transition-colors shadow-sm"
          onClick={handleGenerateSummary}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            'Generate Summary'
          )}
        </button>
      </div>
      
      <div className="p-4 bg-white rounded-md border shadow-sm">
        {currentThread.summary ? (
          <div className="whitespace-pre-line text-gray-800 leading-relaxed">{currentThread.summary}</div>
        ) : (
          <div className="text-gray-500 italic">No summary available. Click "Generate Summary" to create one.</div>
        )}
      </div>
    </div>
  );
};

export default ThreadSummary; 