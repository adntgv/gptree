# GPTree Developer Guide

This document provides guidance for developers who want to extend and contribute to the GPTree application.

## Development Environment Setup

1. Ensure you have Node.js 18+ and npm installed
2. Clone the repository
3. Install dependencies: `npm install`
4. Create a `.env.local` file with your OpenAI API key
5. Start the development server: `npm run dev`

## Project Structure Overview

The project follows a standard Next.js App Router architecture with some custom additions:

```
/app                  # Next.js App Router
/components           # React components
/lib                  # Utility libraries and core logic
/public               # Static assets
/data                 # Data storage (JSON database)
server.js             # Custom server with Socket.IO
```

## Core Technologies

- **Next.js**: Framework for server-rendered React applications
- **React**: UI library
- **Zustand**: State management
- **Socket.IO**: Real-time communication
- **LowDB**: JSON file-based database
- **OpenAI API**: AI chat integration

## Adding New Features

### Extending the Thread Model

To add new properties to threads or messages:

1. Update the type definitions in `lib/types.ts`
2. Update relevant store actions in `lib/store.ts`
3. Update database operations in `lib/db.ts`
4. Update UI components to use the new properties

Example of adding a "pinned" property to Thread:

```typescript
// In lib/types.ts
export type Thread = {
  // existing properties
  isPinned?: boolean; // New property
};

// In lib/store.ts
const useChatStore = create<ChatState>((set, get) => ({
  // existing actions
  pinThread: (threadId: string) => {
    // Implementation
  },
  unpinThread: (threadId: string) => {
    // Implementation
  },
}));
```

### Adding a New Component

1. Create a new file in the `components` directory
2. Import required libraries and state from Zustand
3. Implement the component
4. Export and use it in your page or other components

Example of a new component:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useChatStore } from '@/lib/store';

export default function ThreadStatistics() {
  const threads = useChatStore(state => state.threads);
  const [stats, setStats] = useState({ threadCount: 0, messageCount: 0 });
  
  useEffect(() => {
    // Calculate statistics
    const threadCount = threads.length;
    const messageCount = threads.reduce(
      (acc, thread) => acc + thread.messages.length, 0
    );
    
    setStats({ threadCount, messageCount });
  }, [threads]);
  
  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-lg font-semibold">Statistics</h2>
      <div className="mt-2">
        <p>Total Threads: {stats.threadCount}</p>
        <p>Total Messages: {stats.messageCount}</p>
      </div>
    </div>
  );
}
```

### Implementing a New API Route

1. Create a new file in the `app/api` directory
2. Implement the route handler
3. Connect it to the database or external services as needed

Example of a new API route:

```typescript
// app/api/statistics/route.ts
import { NextResponse } from 'next/server';
import { getAllThreads } from '@/lib/db';

export async function GET() {
  try {
    const threads = await getAllThreads();
    
    const statistics = {
      threadCount: threads.length,
      messageCount: threads.reduce(
        (acc, thread) => acc + thread.messages.length, 0
      ),
      rootThreads: threads.filter(t => !t.parentId).length,
      branchedThreads: threads.filter(t => t.parentId).length,
    };
    
    return NextResponse.json({ statistics, success: true });
  } catch (error) {
    console.error('Error calculating statistics:', error);
    return NextResponse.json(
      { error: 'Failed to calculate statistics', success: false },
      { status: 500 }
    );
  }
}
```

## Working with State Management

The application uses Zustand for state management. The store is defined in `lib/store.ts`.

### Reading State

```typescript
import { useChatStore } from '@/lib/store';

function MyComponent() {
  // Select specific parts of state to avoid unnecessary re-renders
  const threads = useChatStore(state => state.threads);
  const currentThreadId = useChatStore(state => state.currentThreadId);
  
  // You can derive values from state
  const currentThread = threads.find(t => t.id === currentThreadId);
  
  return (
    // Your component JSX
  );
}
```

### Updating State

```typescript
import { useChatStore } from '@/lib/store';

function MyComponent() {
  // Get actions from the store
  const sendMessage = useChatStore(state => state.sendMessage);
  const branchCurrent = useChatStore(state => state.branchCurrent);
  
  const handleSendClick = async () => {
    await sendMessage('Hello, GPT!');
  };
  
  const handleBranchClick = () => {
    branchCurrent();
  };
  
  return (
    <div>
      <button onClick={handleSendClick}>Send Message</button>
      <button onClick={handleBranchClick}>Branch Thread</button>
    </div>
  );
}
```

### Adding New Store Actions

To add new functionality to the store:

1. Update the `ChatState` interface with your new action
2. Implement the action in the store

```typescript
interface ChatState {
  // Existing state and actions
  exportThread: (threadId: string) => Promise<string>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Existing state and actions
  
  exportThread: async (threadId) => {
    const { threads } = get();
    const thread = threads.find(t => t.id === threadId);
    
    if (!thread) return '';
    
    // Generate export format
    const exportData = JSON.stringify(thread, null, 2);
    return exportData;
  },
}));
```

## Working with Socket.IO

The application uses Socket.IO for real-time communication between client and server.

### Client-Side Socket Events

In `lib/socket.ts`, you'll find the client-side socket implementation.

To listen for a new event type:

```typescript
// In lib/socket.ts, inside setupSocketListeners function
socket.on('new_event_type', (data) => {
  console.log('Received new event:', data);
  // Update store or take other actions
});
```

### Server-Side Socket Events

In `lib/server-socket.ts`, you'll find the server-side socket implementation.

To emit a new event type:

```typescript
// In your API route or server-side code
import { Server } from 'socket.io';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Process your data
    
    // Get the Socket.IO instance
    const io = res.socket.server.io;
    
    // Emit to all clients
    io.emit('new_event_type', { 
      data: 'Your data here'
    });
    
    return res.status(200).json({ success: true });
  }
}
```

## Database Operations

The application uses LowDB for data storage. The database operations are defined in `lib/db.ts`.

### Adding a New Database Function

```typescript
// In lib/db.ts
export async function searchThreads(searchTerm: string): Promise<Thread[]> {
  await db.read();
  
  const lowerTerm = searchTerm.toLowerCase();
  
  return db.data.threads.filter(thread => 
    thread.title.toLowerCase().includes(lowerTerm) ||
    thread.messages.some(m => 
      m.text.toLowerCase().includes(lowerTerm)
    )
  );
}
```

## Testing and Debugging

### Socket.IO Debugging

The application includes Socket.IO diagnostic tools:

```javascript
// In browser console
// Check socket connection status
await import('./lib/socket').then(m => m.testSocketConnection());
```

### Component Testing

For testing components, you can use React Testing Library:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import YourComponent from '@/components/YourComponent';

describe('YourComponent', () => {
  it('renders correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Your Text')).toBeInTheDocument();
  });
  
  it('handles clicks', () => {
    const mockFn = jest.fn();
    render(<YourComponent onClick={mockFn} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockFn).toHaveBeenCalled();
  });
});
```

## Deployment

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm run start
```

### Environment Variables for Production

Ensure these environment variables are set:

- `OPENAI_API_KEY`: Your OpenAI API key
- `NODE_ENV`: Set to "production"
- `PORT`: Port for the server (default: 3000)

## Best Practices

1. **TypeScript**: Use proper typing for all functions, components, and variables
2. **Component Structure**: Split large components into smaller, focused ones
3. **State Management**: Use selector functions with Zustand to prevent unnecessary re-renders
4. **Socket Events**: Log important socket events for debugging
5. **Error Handling**: Implement proper error handling and user feedback
6. **Code Comments**: Document complex logic and component behavior
7. **Consistent Styling**: Follow the existing Tailwind patterns

## Common Pitfalls

1. **Socket Disconnects**: Socket connections may be lost; implement reconnection logic
2. **State Synchronization**: Ensure state is correctly synchronized with Socket.IO events
3. **OpenAI API Limits**: Handle rate limiting and API quota errors
4. **Data Persistence**: Ensure data is properly saved before page reloads
5. **Next.js Rendering**: Be aware of client vs. server components and hydration issues 