'use client';

import React, { useEffect, useState } from 'react';
import { initSocket } from '@/lib/socket';

const ClientProvider = ({ children }: { children: React.ReactNode }) => {
  const [socketInitialized, setSocketInitialized] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const initializeSocket = async () => {
      try {
        const socket = await initSocket();
        console.log('Socket initialized in ClientProvider:', socket.id);
        setSocketInitialized(true);
        setSocketError(null);
      } catch (error) {
        console.error('Failed to initialize socket in ClientProvider:', error);
        setSocketError(error instanceof Error ? error.message : 'Unknown socket error');
        
        // Try to reconnect after a delay
        setTimeout(() => {
          console.log('Attempting to reconnect socket...');
          initializeSocket();
        }, 5000);
      }
    };
    
    initializeSocket();
    
    // Set up visibility change handler to reconnect when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, checking socket connection');
        initializeSocket();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <>
      {/* You could add a socket status indicator here if needed */}
      {children}
    </>
  );
};

export default ClientProvider; 