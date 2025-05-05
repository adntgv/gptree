# GPTree Code Architecture

This document outlines the detailed code architecture and component interactions in the GPTree application.

## Application Flow

### Initialization Flow

```
┌────────────┐      ┌───────────┐      ┌──────────────┐
│ server.js  │──┬──▶│  Next.js  │──┬──▶│ app/page.tsx │
└────────────┘  │   └───────────┘  │   └──────────────┘
                │                  │
                │   ┌────────────┐ │
                └──▶│ Socket.IO  │ │
                    └────────────┘ │
                                   │   ┌──────────────────┐
                                   └──▶│ ClientProvider.tsx │
                                       └──────────────────┘
```

1. `server.js` sets up a custom Next.js server with Socket.IO integration
2. Next.js handles routing and rendering
3. `app/page.tsx` is the main entry point for the UI
4. `ClientProvider.tsx` initializes global providers

### State Management

```
┌─────────────┐     ┌───────────┐     ┌───────────┐
│ Components  │────▶│ lib/store │────▶│  lib/db   │
└─────────────┘     └───────────┘     └───────────┘
       ▲                  ▲                 │
       │                  │                 │
       │                  │                 ▼
       │            ┌─────────────┐   ┌───────────┐
       └────────────│ lib/socket  │◀──│ Socket.IO │
                    └─────────────┘   └───────────┘
```

1. Components interact with the Zustand store using hooks
2. Store actions trigger database operations and socket events
3. Socket.IO handles real-time updates between client and server
4. Database operations are performed through the db.ts module

## Component Hierarchy

```
┌────────────────┐
│   app/page.tsx  │
└────────┬───────┘
         │
         ▼
┌──────────────────────────────────────┐
│                                      │
│  ┌────────────┐  ┌────────────────┐  │
│  │SidebarTree │  │  ChatWindow    │  │
│  └────────────┘  └────────┬───────┘  │
│                           │          │
│  ┌────────────┐           │          │
│  │  NewChat   │◀──────────┘          │
│  │   Modal    │                      │
│  └────────────┘                      │
│                                      │
└──────────────────────────────────────┘
```

## Key Files and Their Responsibilities

### Core Files

| File | Responsibility |
|------|----------------|
| `server.js` | Custom Next.js server with Socket.IO integration |
| `lib/store.ts` | Zustand store for state management |
| `lib/db.ts` | Database operations with LowDB |
| `lib/socket.ts` | Socket.IO client setup and event handling |
| `lib/server-socket.ts` | Socket.IO server setup |
| `lib/gpt.ts` | OpenAI API integration |
| `lib/types.ts` | TypeScript type definitions |

### React Components

| Component | Responsibility |
|-----------|----------------|
| `app/page.tsx` | Main application layout |
| `components/SidebarTree.tsx` | Tree-structured sidebar navigation |
| `components/ChatWindow.tsx` | Chat interface for messages and input |
| `components/NewChatModal.tsx` | Modal for creating new chats |
| `components/ThreadSummary.tsx` | Thread summary display |
| `components/ClientProvider.tsx` | Client-side providers |

## Data Flow

### Sending a Message

```
┌────────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│ ChatWindow │────▶│ lib/store │────▶│ API Route │────▶│  OpenAI   │
└────────────┘     └───────────┘     └───────────┘     └───────────┘
                         │                 │                 │
                         ▼                 │                 │
                    ┌───────────┐          │                 │
                    │  lib/db   │          │                 │
                    └───────────┘          │                 │
                         ▲                 │                 │
                         │                 ▼                 │
┌────────────┐     ┌───────────┐     ┌───────────┐          │
│ Components │◀────│ lib/socket│◀────│ Socket.IO │◀─────────┘
└────────────┘     └───────────┘     └───────────┘
```

1. User enters a message in ChatWindow
2. ChatWindow calls store.sendMessage()
3. Store adds message to state and calls API
4. Server processes the message and sends to OpenAI
5. Response is sent back via Socket.IO
6. Socket client receives the event and updates store
7. Components re-render with the updated state

### Thread Branching

```
┌────────────┐     ┌───────────┐     ┌───────────┐
│ ChatWindow │────▶│ lib/store │────▶│  lib/db   │
└────────────┘     └───────────┘     └───────────┘
                         │                 │
                         ▼                 │
                    ┌───────────┐          │
                    │   Store   │◀─────────┘
                    │  Update   │
                    └───────────┘
                         │
                         ▼
┌────────────┐     ┌───────────┐
│ Components │◀────│ Re-render │
└────────────┘     └───────────┘
```

## Socket Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `connect` | Client → Server | Establish socket connection |
| `user_message_saved` | Server → Client | Confirm message saved |
| `gpt_response` | Server → Client | Deliver GPT response |
| `message_status` | Server → Client | Update message status |
| `error` | Server → Client | Notify of errors |

## Store Actions

| Action | Purpose |
|--------|---------|
| `newRoot(title)` | Create a new root thread |
| `branchCurrent()` | Branch the current thread |
| `forkAt(msgId, title)` | Fork a new thread from a message |
| `sendMessage(text)` | Send a user message |
| `updateThread(thread)` | Update a thread's data |
| `appendMessage(threadId, message)` | Add a message to a thread |
| `markThreadRead(threadId)` | Mark thread as read |
| `markThreadUnread(threadId)` | Mark thread as unread |

## Database Structure

The database is stored in `/data/gptree-data.json` with the following structure:

```json
{
  "threads": [
    {
      "id": "thread1",
      "parentId": null,
      "forkedFromMsgId": null,
      "title": "Root Thread",
      "messages": [
        {
          "id": "msg1",
          "author": "user",
          "text": "Hello",
          "timestamp": 1677721600000
        },
        {
          "id": "msg2",
          "author": "gpt",
          "text": "Hi there!",
          "timestamp": 1677721660000
        }
      ],
      "children": [
        {
          "id": "thread2",
          "parentId": "thread1",
          "forkedFromMsgId": "msg2",
          "title": "Branch from Root",
          "messages": [...],
          "children": []
        }
      ],
      "summary": "Initial greeting conversation"
    }
  ],
  "lastUpdated": 1677721660000
}
```

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/threads` | GET | Get all threads |
| `/api/threads` | POST | Create a new thread |
| `/api/chat` | POST | Send a message to GPT |
| `/api/socketio` | N/A | Socket.IO endpoint |

## Code Dependencies

### Internal Dependencies

```
SidebarTree.tsx → store.ts → db.ts
ChatWindow.tsx → store.ts → socket.ts → server-socket.ts
store.ts → socket.ts
gpt.ts → OpenAI SDK
```

### External Dependencies

- Next.js for framework
- React for UI
- Zustand for state
- Socket.IO for real-time
- LowDB for storage
- OpenAI API for AI responses
- Tailwind for styling 