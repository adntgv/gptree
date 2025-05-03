# GPTree

A branchable, tree-structured GPT chat application that lets you have multiple parallel conversations, branch and fork your thinking, and summarize your ideas.

## Setup Instructions

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the root directory with your OpenAI API key:
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features

- Create multiple chat threads with GPT
- Branch any conversation to explore alternative directions
- Fork from any message in a thread to start a new conversation
- Auto-generate summaries of conversations
- Tree view sidebar with thread hierarchy

## description

We're building a branchable, tree-structured GPT chat application—imagine Messenger meets a version control system for your ideas. At its heart, it lets you:

Have Multiple Parallel Conversations

A sidebar renders your chats as an indented tree: parent branches on the left, children nested beneath.

Each node shows a short, auto-generated summary of its own discussion—and even of its entire subtree—so you immediately grasp what’s inside without clicking in.

Asynchronous, Non-Blocking Workflow

Fire off as many prompts as you like: each lives in its own thread, with its own “GPT is typing…” spinner.

You never wait idle—you can jump between topics, enqueue new branches, and come back when each response lands.

Recursive Summaries to Keep Perspective

Every time a thread gets a new GPT reply (or whenever you ask), the app summarizes that thread’s messages into 2–3 bullets.

Then it bubbles that summary up through its ancestors, so each node’s recap always reflects the full subtree beneath it.

MVP-Friendly, File-Backed Persistence

Built as a Next.js App (no deprecated pages) with Tailwind and Zustand for instant local state.

Uses Lowdb to store your entire thread forest as a simple JSON file—no complex database setup.

Optionally swap in Redis/BullMQ and Postgres later, but you get a fully working, offline-capable MVP today.

In practice, you’ll click “+ New Chat,” type your prompt, and see it spawn in the sidebar. Want to explore a different angle? Hit “Branch” (copies everything), tweak your question, and get a separate response. Found a key insight mid-thread? “Fork” right from that message and spin off a dedicated discussion. Throughout, the sidebar keeps you grounded with concise branch summaries—so your big vision never gets lost in the weeds.

## 🛠 1. Tech Stack & Dependencies

* **Framework**: Next.js 13+ (App Router)
* **Styling**: Tailwind CSS
* **State Management**: Zustand (lightweight, in-browser)
* **Realtime Updates**: Socket.io (or Pusher)
* **AI**: OpenAI Node.js SDK
* **Queue**: In-process async handler for MVP (setTimeout) → swap out with Redis + BullMQ if you need persistence
* **Storage**:

  * MVP: in-memory (persist to `localStorage`)
  * Prod: PostgreSQL via Prisma ORM

---

## 🗂 2. Core Data Model

```ts
// /lib/types.ts
export type Message = {
  id: string;
  author: 'user' | 'gpt';
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
```

Threads are nodes in a forest—each can spawn branches or forks.

---

## 🚧 3. App Structure

```
/app
  layout.tsx       ← global providers (Zustand, Socket.io)
/lib
  types.ts
  store.ts         ← Zustand store & actions
  gpt.ts           ← OpenAI calls (chat, tag, summarize)
  queue.ts         ← simple async job runner
/components
  SidebarTree.tsx  ← recursive tree view + summaries
  ChatWindow.tsx   ← messages list + input box
  NewChatModal.tsx ← choose New / Branch / Fork
  ThreadSummary.tsx← “View Branch Summary” button + display
/pages/api       ← only for legacy or redirect; use /app/api instead
/app/api
  chat/route.ts       ← POST: send user message → enqueue GPT job
  summarize/route.ts  ← POST: summarize branch recursively
  tag/route.ts        ← (optional) generate title & tags
```

---

## 🔄 4. High-Level Flow

1. **New Chat**

   * User clicks “+” → chooses

     * **Root** → new thread with empty messages
     * **Branch** → clone current thread’s messages into a new child thread
     * **Fork** → pick a message, slice history up to it, optionally summarize the rest, start new child
2. **Sending a Message**

   * In ChatWindow: `sendMessage(text)` → appends user `Message` → calls `/app/api/chat`
   * **Queue** receives job → calls OpenAI chat completion → on response:

     * Appends GPT `Message` to that thread
     * Triggers **tagging** (generate tags/title)
     * Triggers **leaf summary** of that thread
     * **Recurses up** to update ancestor summaries
   * Frontend receives WebSocket event → updates store → UI re-renders
3. **SidebarTree**

   * Renders threads indent-nested via `children` arrays
   * Under each title shows `thread.summary` (3–4 bullets)
   * Badge indicates Pending / Done
   * Hover preview shows first line or unread count
4. **Branch Summary** (on demand)

   * “📝 Summarize Branch” button → POST `/app/api/summarize` with `threadId`
   * Server loads full subtree → bottom-up GPT calls → stores and returns `summary`
   * UI updates in place

---

## 📂 5. Store Actions (Zustand)

```ts
// /lib/store.ts
import create from 'zustand';
import { Thread, Message } from './types';

interface ChatState {
  threads: Thread[];
  currentThreadId: string | null;
  newRoot: (title: string) => void;
  branchCurrent: () => void;
  forkAt: (msgId: string) => void;
  selectThread: (id: string) => void;
  sendMessage: (text: string) => void;
  updateThread: (thread: Thread) => void; // for incoming GPT msg & summaries
}
export const useChatStore = create<ChatState>((set, get) => ({
  threads: [],
  currentThreadId: null,
  newRoot: title => { /* push new root Thread */ },
  branchCurrent: () => { /* clone messages into new child */ },
  forkAt: msgId => { /* slice & optional summarize */ },
  selectThread: id => set({ currentThreadId: id }),
  sendMessage: text => { /* append user msg + call API */ },
  updateThread: thread => { /* merge in GPT msg or summary */ },
}));
```

---

## 🔌 6. API Routes

### **`/app/api/chat/route.ts`**

* **Input**: `{ threadId, text }`
* **Action**:

  1. Append user msg to DB/store
  2. Queue GPT job: `openai.chat.completions.create(...)`
  3. On completion, append GPT msg, call tagging & summarizer

### **`/app/api/summarize/route.ts`**

* **Input**: `{ threadId }`
* **Action**:

  1. Recursively load thread subtree
  2. Bottom-up summarizer (see pseudo-code above)
  3. Store and return branch summary

---

## 📈 7. Next Steps & Milestones

1. **Project Bootstrap**
   * Install Tailwind, Zustand, Socket.io, OpenAI SDK
2. **Zustand Store**

   * Implement basic `threads`, `selectThread`, `newRoot`, `sendMessage`
3. **UI Skeleton**

   * SidebarTree (no children yet) + ChatWindow (static)
   * NewChatModal with the 3 spawn options
4. **API & Queue**

   * Simple in-process queue: wrap OpenAI call in `setTimeout` for demo
   * Connect `sendMessage` to `/api/chat` → mock GPT response
5. **Branch & Fork Logic**

   * In-store actions to clone or slice history
   * Update UI to render children threads
6. **Summarization**

   * Leaf summarizer → display short recap under each node
   * Manual “Summarize Branch” → wire up `/api/summarize`
7. **Realtime**

   * Add Socket.io to push updates into the store (optional polling fallback)
8. **Persistence**

 lowdb or something local file storage in json format?
9. **Polish & Deploy**

   * Deploy on Vercel

---

This plan should give you a clear roadmap from an empty Next.js app to a fully-branched, tree-structured GPT messenger with recursive branch summaries. Let me know which milestone you’d like to tackle first!
