import { NextRequest, NextResponse } from 'next/server';
import { queue } from '@/lib/queue';
import { generateThreadTitle } from '@/lib/gpt';
import { getThreadById, updateThread } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    const { threadId } = await req.json();

    if (!threadId) {
      return NextResponse.json({ error: 'Missing threadId' }, { status: 400 });
    }

    // Get the thread
    const thread = await getThreadById(threadId);
    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Queue the title generation task
    const taskId = `tag-${threadId}-${nanoid(6)}`;
    
    queue.enqueue(taskId, async () => {
      try {
        // Generate title for this thread
        const title = await generateThreadTitle(thread);
        
        // Update thread title
        const updatedThread = await updateThread({
          ...thread,
          title,
        });
        
        // Emit socket event for real-time updates
        const { io } = global as any;
        if (io) {
          // Emit thread update
          io.emit('thread_update', {
            thread: updatedThread,
          });
        }
      } catch (error) {
        console.error('Error processing title generation task:', error);
      }
    });
    
    return NextResponse.json({ success: true, taskId });
  } catch (error) {
    console.error('Error in tag API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 