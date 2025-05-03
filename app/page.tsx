'use client';

import { useState, useEffect } from 'react';
import SidebarTree from '@/components/SidebarTree';
import ChatWindow from '@/components/ChatWindow';
import ThreadSummary from '@/components/ThreadSummary';
import NewChatModal from '@/components/NewChatModal';
import { initSocket } from '@/lib/socket';

export default function Home() {
  const [modal, setModal] = useState({
    isOpen: false,
    mode: 'new' as 'new' | 'branch' | 'fork',
    messageId: undefined as string | undefined,
  });

  // Initialize socket connection when the component mounts
  useEffect(() => {
    initSocket();
  }, []);

  const openModal = (mode: 'new' | 'branch' | 'fork', messageId?: string) => {
    setModal({
      isOpen: true,
      mode,
      messageId,
    });
  };

  const closeModal = () => {
    setModal({
      ...modal,
      isOpen: false,
    });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <SidebarTree />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatWindow />
        <ThreadSummary />
      </div>
      
      <NewChatModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        mode={modal.mode}
        messageId={modal.messageId}
      />
    </div>
  );
}
