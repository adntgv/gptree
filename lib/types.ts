import { NextApiResponse } from 'next/types';
import { Server as SocketIOServer } from 'socket.io';

export type Message = {
  id: string;
  author: 'user' | 'gpt' | 'system';
  text: string;
  timestamp: number;
};

export type Thread = {
  id: string;
  parentId: string | null;     // null for root chats
  forkedFromMsgId: string | null;
  title: string;
  messages: Message[];
  children: Thread[];
  summary?: string;            // auto-generated branch recap
};

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: {
      io: SocketIOServer;
    };
  };
}; 