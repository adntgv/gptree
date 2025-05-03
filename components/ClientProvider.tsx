'use client';

import React, { useEffect } from 'react';
import { initSocket } from '@/lib/socket';

const ClientProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // Initialize socket connection
    initSocket();
  }, []);

  return (
    <>
      {children}
    </>
  );
};

export default ClientProvider; 