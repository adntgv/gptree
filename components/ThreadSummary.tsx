'use client';

import { useState } from 'react';
import { useChatStore } from '@/lib/store';

const ThreadSummary = () => {
  const [isLoading, setIsLoading] = useState(false);
  const threads = useChatStore(state => state.threads);
  const currentThreadId = useChatStore(state => state.currentThreadId);
  
  const currentThread = threads.find(t => t.id === currentThreadId);
  
  if (!currentThread || !currentThread.summary) {
    return null;
  }
  
  // Format summary text (adds bullet points if not present)
  const formatSummary = (summary: string) => {
    if (!summary.includes('\n')) {
      return summary;
    }
    
    return summary
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.startsWith('-') || line.startsWith('•') ? line : `• ${line}`)
      .join('\n');
  };
  
  const formattedSummary = formatSummary(currentThread.summary);
  
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
    <div className="border-t p-4 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <h3 className="text-lg font-medium mb-2 text-gray-800">Thread Summary</h3>
        <div className="text-gray-700 whitespace-pre-wrap">
          {formattedSummary}
        </div>
      </div>
    </div>
  );
};

export default ThreadSummary; 