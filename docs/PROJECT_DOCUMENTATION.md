# GPTree Project Documentation

## Overview

GPTree is a tree-structured chat application built with Next.js that allows users to have branching conversations with OpenAI's GPT. The application enables users to explore multiple conversation paths by branching or forking existing threads, creating a tree-like structure of related conversations.

## Project Architecture

### Tech Stack

- **Framework**: Next.js 15.3 with App Router
- **UI**: React 19 with Tailwind CSS
- **State Management**: Zustand
- **Real-time Communication**: Socket.IO
- **AI Integration**: OpenAI API
- **Data Storage**: LowDB (JSON file database)
- **Development**: TypeScript

### Directory Structure

```
/
├── app/                  # Next.js app directory (App Router)
│   ├── api/              # API routes
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main page component
├── components/           # React components
│   ├── ChatWindow.tsx    # Chat display and input
│   ├── SidebarTree.tsx   # Tree view of chat threads
│   ├── ClientProvider.tsx # Client-side provider
│   ├── ThreadSummary.tsx # Thread summary component
│   └── NewChatModal.tsx  # Modal for creating new chats
├── lib/                  # Utility libraries
│   ├── db.ts             # Database operations (LowDB)
│   ├── socket.ts         # Socket.IO client integration
│   ├── server-socket.ts  # Socket.IO server setup
│   ├── store.ts          # Zustand store for state management
│   ├── gpt.ts            # OpenAI API integration
│   ├── types.ts          # TypeScript type definitions
│   └── queue.ts          # Job queue for async operations
├── public/               # Static assets
├── data/                 # Data storage (contains JSON database)
└── server.js             # Custom Next.js server with Socket.IO
```

## Core Data Model

The application uses two primary data types:

### Message

```typescript
type Message = {
  id: string;
  author: 'user' | 'gpt' | 'system';
  text: string;
  timestamp: number;
  status?: 'pending' | 'generating' | 'completed' | 'error';
  error?: string;
};
```

### Thread

```typescript
type Thread = {
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
```

## Key Components

### ChatWindow

The ChatWindow component displays the current conversation thread and provides an input for sending messages. It supports:
- Displaying user and GPT messages with appropriate styling
- Showing message status (pending, generating, error)
- Input for sending new messages
- Controls for branching and forking conversations

### SidebarTree

This component renders the hierarchical structure of conversation threads, showing:
- Thread titles
- Thread summaries
- Unread message indicators
- Thread status indicators (pending, error)

### Store (Zustand)

The Zustand store manages application state and provides actions for:
- Creating new threads
- Branching existing threads
- Forking from specific messages
- Sending messages
- Updating thread and message status
- Marking threads as read/unread

## Core Functionality

### Thread Management

1. **New Chat**: Creates a root-level thread with no parent
2. **Branch**: Clones an existing thread into a new child thread
3. **Fork**: Creates a new thread from a specific message in an existing thread

### Message Flow

1. User sends a message
2. Message is saved to the database and added to the thread
3. Socket.IO emits the message to the server
4. Server processes the message using OpenAI API
5. GPT response is sent back via Socket.IO
6. UI updates with the response

### Real-time Updates

Socket.IO enables real-time communication between clients and server:
- `user_message_saved`: Confirms message has been saved
- `gpt_response`: Delivers GPT responses
- `message_status`: Updates message status (pending, generating, completed, error)

## Database

The application uses LowDB to store data in a JSON file:
- Location: `/data/gptree-data.json`
- Contains all threads and messages
- Provides basic CRUD operations for threads and messages

## API Routes

The application has several API endpoints:
- `/api/threads`: GET/POST for thread operations
- `/api/chat`: POST for sending messages
- `/api/socketio`: Socket.IO connection endpoint

## Setup and Configuration

### Environment Variables

Required environment variables in `.env.local`:
- `OPENAI_API_KEY`: Your OpenAI API key

### Running the Application

Development:
```bash
npm run dev
```

Production:
```bash
npm run build
npm run start
```

## Extending the Application

### Adding New Features

1. **Summaries Enhancement**: Improve the summary generation with more context
2. **User Authentication**: Add user accounts for personalized experience
3. **Persistent Storage**: Migrate from LowDB to a database like PostgreSQL
4. **Collaboration**: Enable sharing threads with other users

### Architecture Considerations

- The application uses a custom server.js to integrate Socket.IO with Next.js
- Real-time communication is crucial for the app's functionality
- Thread hierarchy is maintained through parent-child relationships

## Troubleshooting

### Common Issues

1. **Socket Connection Failures**: Check browser console for connection errors
   - Solution: Ensure server is running and accessible

2. **Missing GPT Responses**: Check message status in the UI
   - Solution: Verify OpenAI API key and rate limits

3. **Database Issues**: Errors saving or loading threads
   - Solution: Check permissions on the data directory and file

## Development Guidelines

1. Maintain the existing code structure
2. Follow TypeScript typing conventions
3. Use Socket.IO for real-time updates
4. Update thread state through Zustand actions
5. Use the existing Thread and Message types for consistency 