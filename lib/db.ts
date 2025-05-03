import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { Thread, Message } from './types';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';

// Define db schema
type Database = {
  threads: Thread[];
  lastUpdated: number;
};

// Create data directory if it doesn't exist
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Setup lowdb
const adapter = new JSONFile<Database>(path.join(DATA_DIR, 'gptree-data.json'));
const defaultData: Database = { threads: [], lastUpdated: Date.now() };
const db = new Low<Database>(adapter, defaultData);

// Initialize db
async function init() {
  await db.read();
  db.data = db.data || defaultData;
  await db.write();
}

// Initialize db on first import
init().catch(console.error);

// Helper functions
export async function getAllThreads(): Promise<Thread[]> {
  await db.read();
  return db.data.threads;
}

export async function getThreadById(id: string): Promise<Thread | undefined> {
  await db.read();
  return db.data.threads.find(thread => thread.id === id);
}

export async function createThread(thread: Omit<Thread, 'id'>): Promise<Thread> {
  await db.read();
  
  const newThread: Thread = {
    ...thread,
    id: nanoid(),
  };
  
  db.data.threads.push(newThread);
  db.data.lastUpdated = Date.now();
  await db.write();
  
  return newThread;
}

export async function updateThread(thread: Thread): Promise<Thread> {
  await db.read();
  
  const index = db.data.threads.findIndex(t => t.id === thread.id);
  
  if (index >= 0) {
    db.data.threads[index] = thread;
    db.data.lastUpdated = Date.now();
    await db.write();
    return thread;
  }
  
  throw new Error(`Thread with id ${thread.id} not found`);
}

export async function addMessageToThread(threadId: string, message: Omit<Message, 'id'>): Promise<Message> {
  await db.read();
  
  const thread = db.data.threads.find(t => t.id === threadId);
  
  if (!thread) {
    throw new Error(`Thread with id ${threadId} not found`);
  }
  
  const newMessage: Message = {
    ...message,
    id: nanoid(),
  };
  
  thread.messages.push(newMessage);
  db.data.lastUpdated = Date.now();
  await db.write();
  
  return newMessage;
}

export async function updateThreadSummary(threadId: string, summary: string): Promise<Thread> {
  await db.read();
  
  const thread = db.data.threads.find(t => t.id === threadId);
  
  if (!thread) {
    throw new Error(`Thread with id ${threadId} not found`);
  }
  
  thread.summary = summary;
  db.data.lastUpdated = Date.now();
  await db.write();
  
  return thread;
} 