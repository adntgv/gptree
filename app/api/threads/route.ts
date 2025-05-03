import { NextRequest, NextResponse } from 'next/server';
import { createThread } from '@/lib/db';
import { Thread } from '@/lib/types';
import { nanoid } from 'nanoid';

// For Next.js to properly register this as an API route
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, parentId = null, forkedFromMsgId = null, messages = [] } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: 'Missing required fields: title' }, { status: 400 });
    }

    // Ensure there's at least one message in the thread
    const initialMessages = messages.length > 0 ? messages : [
      {
        id: nanoid(),
        author: 'system',
        text: 'This conversation has just started.',
        timestamp: Date.now()
      }
    ];

    // Create thread in database
    const thread = await createThread({
      title,
      parentId,
      forkedFromMsgId,
      messages: initialMessages,
      children: [],
    });

    return NextResponse.json({ success: true, thread });
  } catch (error) {
    console.error('Error handling thread creation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 