import { NextApiResponse } from 'next/types';
import { Server as SocketIOServer } from 'socket.io';

export type Message = {
  id: string;
  author: 'user' | 'gpt' | 'system';
  text: string;
  timestamp: number;
  status?: 'pending' | 'generating' | 'completed' | 'error';
  error?: string;
};

export type Thread = {
  id: string;
  parentId: string | null;     // null for root chats
  forkedFromMsgId: string | null;
  title: string;
  messages: Message[];
  children: Thread[];
  summary?: string;            // auto-generated branch recap
  hasUnread?: boolean;         // indicates new unread messages
  hasPending?: boolean;        // has pending messages
  hasError?: boolean;          // has error messages
};

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: {
      io: SocketIOServer;
    };
  };
}; 